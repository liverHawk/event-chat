import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import type { AppEnv, Bindings, RoomRecord, UserRecord } from './types'

const SESSION_COOKIE = 'session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

const isSecureRequest = (c: Context<AppEnv>): boolean => new URL(c.req.url).protocol === 'https:'

export const setSessionCookie = async (c: Context<AppEnv>, userId: string): Promise<void> => {
  const expiresAt = Date.now() + SESSION_TTL_MS
  await setSignedCookie(c, SESSION_COOKIE, `${userId}.${expiresAt}`, c.env.SESSION_SECRET, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
    secure: isSecureRequest(c),
  })
}

export const clearSessionCookie = (c: Context<AppEnv>): void => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

export const getSessionUserId = async (c: Context<AppEnv>): Promise<string | null> => {
  const raw = await getSignedCookie(c, c.env.SESSION_SECRET, SESSION_COOKIE)
  if (!raw) return null
  const sep = raw.lastIndexOf('.')
  if (sep <= 0) return null
  const userId = raw.slice(0, sep)
  const expiresAt = Number(raw.slice(sep + 1))
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null
  return userId
}

export const findSessionUser = async (c: Context<AppEnv>): Promise<UserRecord | null> => {
  const userId = await getSessionUserId(c)
  if (!userId) return null
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.avatar_url, u.group_id, g.name AS group_name, g.color AS group_color
     FROM users u
     LEFT JOIN groups g ON u.group_id = g.id
     WHERE u.id = ?`,
  )
    .bind(userId)
    .first<UserRecord>()
  return user ?? null
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
  if (!raw) return true
  return raw
    .split(',')
    .map((s) => s.trim())
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
    'SELECT id, name, is_global, invite_code, discord_role_id FROM rooms WHERE id = ?',
  )
    .bind(roomId)
    .first<RoomRecord>()
  if (!room) return c.text('Room not found', 404)
  if (room.is_global !== 1) {
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
