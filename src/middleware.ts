import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { decryptUserRecord } from './lib/crypto'
import type { AppEnv, Bindings, RoomRecord, UserRecord } from './types'

const SESSION_COOKIE = 'session'
const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const MIN_SESSION_SECRET_LENGTH = 32

const isSecureRequest = (c: Context<AppEnv>): boolean => new URL(c.req.url).protocol === 'https:'

const requireSessionSecret = (env: Bindings): string => {
  const secret = env.SESSION_SECRET ?? ''
  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error('SESSION_SECRET must be at least 32 characters')
  }
  return secret
}

export const setSessionCookie = async (
  c: Context<AppEnv>,
  userId: string,
  sessionVersion = 1,
): Promise<void> => {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const secret = requireSessionSecret(c.env)
  await setSignedCookie(c, SESSION_COOKIE, `${userId}.${sessionVersion}.${expiresAt}`, secret, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
    secure: isSecureRequest(c),
  })
}

export const clearSessionCookie = (c: Context<AppEnv>): void => {
  deleteCookie(c, SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure: isSecureRequest(c),
  })
}

export const revokeUserSessions = async (db: D1Database, userId: string): Promise<void> => {
  await db
    .prepare('UPDATE users SET session_version = session_version + 1 WHERE id = ?')
    .bind(userId)
    .run()
}

type SessionPayload = {
  userId: string
  sessionVersion: number
}

const getSessionPayload = async (c: Context<AppEnv>): Promise<SessionPayload | null> => {
  const secret = requireSessionSecret(c.env)
  const raw = await getSignedCookie(c, secret, SESSION_COOKIE)
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length !== 3) return null
  const [userId, verStr, expStr] = parts
  const sessionVersion = Number(verStr)
  const expiresAt = Number(expStr)
  if (
    !userId ||
    !Number.isInteger(sessionVersion) ||
    sessionVersion < 1 ||
    !Number.isFinite(expiresAt) ||
    expiresAt < Date.now()
  ) {
    return null
  }
  return { userId, sessionVersion }
}

export const getSessionUserId = async (c: Context<AppEnv>): Promise<string | null> =>
  (await getSessionPayload(c))?.userId ?? null

export const findSessionUser = async (c: Context<AppEnv>): Promise<UserRecord | null> => {
  const session = await getSessionPayload(c)
  if (!session) return null
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.avatar_url, u.group_id, u.slide_url, u.session_version,
            g.name AS group_name, g.color AS group_color
     FROM users u
     LEFT JOIN groups g ON u.group_id = g.id
     WHERE u.id = ?`,
  )
    .bind(session.userId)
    .first<UserRecord>()
  if (!user || (user.session_version ?? 1) !== session.sessionVersion) return null
  return decryptUserRecord(c.env, user)
}

const unauthenticatedResponse = (c: Context<AppEnv>): Response => {
  if (c.req.header('Upgrade')?.toLowerCase() === 'websocket') {
    return c.text('Unauthorized', 401)
  }
  return c.redirect('/')
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await findSessionUser(c)
  if (!user) return unauthenticatedResponse(c)
  c.set('user', user)
  await next()
}

export const isAdminUser = (env: Bindings, userId: string): boolean => {
  const raw = env.ADMIN_USER_IDS?.trim()
  if (!raw) return false
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId)
}

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await findSessionUser(c)
  if (!user) return unauthenticatedResponse(c)
  if (!isAdminUser(c.env, user.id)) return c.text('Forbidden', 403)
  c.set('user', user)
  await next()
}

export const requireRoomMember: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await findSessionUser(c)
  if (!user) return unauthenticatedResponse(c)
  const roomId = c.req.param('id')
  const room = await c.env.DB.prepare(
    'SELECT id, name, is_global, invite_code, discord_role_id, group_id FROM rooms WHERE id = ?',
  )
    .bind(roomId)
    .first<RoomRecord>()
  if (!room) return c.text('Room not found', 404)
  const inMatchedGroup = Boolean(room.group_id && user.group_id === room.group_id)
  if (room.is_global !== 1 && !inMatchedGroup) {
    const member = await c.env.DB.prepare(
      'SELECT 1 AS ok FROM room_memberships WHERE user_id = ? AND room_id = ?',
    )
      .bind(user.id, room.id)
      .first<{ ok: number }>()
    if (!member) return c.text('Forbidden', 403)
  }
  c.set('user', user)
  c.set('room', room)
  await next()
}
