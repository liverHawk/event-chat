import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { decryptPresenterRecords } from '../lib/crypto'
import { findSessionUser, isAdminUser, requireAuth, requireRoomMember } from '../middleware'
import type {
  AppEnv,
  ChatMessage,
  GroupRecord,
  PresenterRecord,
  RoomRecord,
  ScheduleItemRecord,
} from '../types'
import { ChatRoomView } from '../views/chat'
import { JoinConfirmView } from '../views/layout'
import { REDIRECT_AFTER_LOGIN_COOKIE } from './auth'

const setOptionalHeader = (headers: Headers, key: string, value?: string | null) => {
  if (value) headers.set(key, encodeURIComponent(value))
  else headers.delete(key)
}

export const roomRoutes = new Hono<AppEnv>()

roomRoutes.get('/join/:invite_code', async (c) => {
  const inviteCode = c.req.param('invite_code')
  const user = await findSessionUser(c)
  if (!user) {
    setCookie(c, REDIRECT_AFTER_LOGIN_COOKIE, `/join/${encodeURIComponent(inviteCode)}`, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 600,
      secure: new URL(c.req.url).protocol === 'https:',
    })
    return c.redirect('/auth/discord')
  }

  const room = await c.env.DB.prepare(
    'SELECT id, name, is_global, invite_code, discord_role_id, group_id FROM rooms WHERE invite_code = ?',
  )
    .bind(inviteCode)
    .first<RoomRecord>()
  if (!room) return c.text('Invalid invite code', 404)

  const existing = await c.env.DB.prepare(
    'SELECT 1 AS ok FROM room_memberships WHERE user_id = ? AND room_id = ?',
  )
    .bind(user.id, room.id)
    .first<{ ok: number }>()
  if (room.is_global === 1 || existing || (room.group_id && user.group_id === room.group_id)) {
    return c.redirect(`/rooms/${room.id}`)
  }

  return c.html(<JoinConfirmView roomName={room.name} inviteCode={inviteCode} />)
})

roomRoutes.post('/join/:invite_code', requireAuth, async (c) => {
  const inviteCode = c.req.param('invite_code')
  const user = c.get('user')
  const room = await c.env.DB.prepare(
    'SELECT id, name, is_global, invite_code, discord_role_id FROM rooms WHERE invite_code = ?',
  )
    .bind(inviteCode)
    .first<RoomRecord>()
  if (!room) return c.text('Invalid invite code', 404)

  await c.env.DB.prepare('INSERT OR IGNORE INTO room_memberships (user_id, room_id) VALUES (?, ?)')
    .bind(user.id, room.id)
    .run()
  return c.redirect(`/rooms/${room.id}`)
})

roomRoutes.get('/rooms/:id', requireRoomMember, async (c) => {
  const user = c.get('user')
  const room = c.get('room')

  const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(room.id))
  const [[roomsRes, groupsRes, presentersRes, scheduleRes], historyRes] = await Promise.all([
    c.env.DB.batch([
      c.env.DB.prepare(
        `SELECT r.id, r.name, r.is_global, r.invite_code, r.discord_role_id, r.group_id
         FROM rooms r
         LEFT JOIN room_memberships rm ON r.id = rm.room_id AND rm.user_id = ?
         WHERE r.is_global = 1 OR rm.user_id IS NOT NULL OR (r.group_id IS NOT NULL AND r.group_id = ?)
         ORDER BY r.is_global DESC, r.id ASC`,
      ).bind(user.id, user.group_id ?? ''),
      c.env.DB.prepare('SELECT id, name, color FROM groups ORDER BY id ASC'),
      c.env.DB.prepare(
        `SELECT p.id, p.group_name, g.color AS group_color, p.name, p.slide_url, p.is_active
         FROM presenters p
         LEFT JOIN groups g ON p.group_name = g.name
         ORDER BY p.id ASC`,
      ),
      c.env.DB.prepare(
        'SELECT id, start_time, end_time, title, description, sort_order FROM schedule_items ORDER BY sort_order ASC, id ASC',
      ),
    ]),
    stub.fetch(`http://do/messages?user_id=${encodeURIComponent(user.id)}`),
  ])
  const rooms = (roomsRes.results ?? []) as RoomRecord[]
  const groups = (groupsRes.results ?? []) as GroupRecord[]
  const rawPresenters = (presentersRes.results ?? []) as PresenterRecord[]
  const schedule = (scheduleRes.results ?? []) as ScheduleItemRecord[]
  const [presenters, messages] = await Promise.all([
    decryptPresenterRecords(c.env, rawPresenters),
    historyRes.ok ? (historyRes.json() as Promise<ChatMessage[]>) : Promise.resolve([]),
  ])

  return c.html(
    <ChatRoomView
      user={user}
      room={room}
      rooms={rooms}
      messages={messages}
      presenters={presenters}
      groups={groups}
      schedule={schedule}
      isAdmin={isAdminUser(c.env, user.id)}
      cspNonce={c.get('cspNonce')}
    />,
  )
})

const WS_FORWARD_HEADERS = [
  'upgrade',
  'connection',
  'sec-websocket-key',
  'sec-websocket-version',
  'sec-websocket-protocol',
  'sec-websocket-extensions',
] as const

roomRoutes.get('/rooms/:id/ws', requireRoomMember, async (c) => {
  if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426)
  }
  const origin = c.req.header('Origin')
  if (!origin || origin !== new URL(c.req.url).origin) {
    return c.text('Forbidden', 403)
  }
  const user = c.get('user')
  const room = c.get('room')
  const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(room.id))
  const headers = new Headers()
  for (const key of WS_FORWARD_HEADERS) {
    const val = c.req.header(key)
    if (val) headers.set(key, val)
  }
  headers.set('X-User-Id', encodeURIComponent(user.id))
  headers.set('X-User-Name', encodeURIComponent(user.name))
  setOptionalHeader(headers, 'X-User-Avatar', user.avatar_url)
  setOptionalHeader(headers, 'X-User-Group-Name', user.group_name)
  setOptionalHeader(headers, 'X-User-Group-Color', user.group_color)
  return stub.fetch(new Request('http://do/ws', { headers }))
})
