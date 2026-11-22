import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { adminRoutes } from './admin'
import { authRoutes, REDIRECT_AFTER_LOGIN_COOKIE } from './auth'
import { findSessionUser, isAdminUser, requireAuth, requireRoomMember } from './middleware'
import type { AppEnv, ChatMessage, GroupRecord, PresenterRecord, RoomRecord } from './types'
import { ChatRoomView, LoginView } from './views'

const app = new Hono<AppEnv>()

app.route('/', authRoutes)
app.route('/', adminRoutes)

app.post('/profile/group', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.parseBody()
  const rawGroupId = String(body.group_id ?? '').trim()
  const returnTo = String(body.return_to ?? '/rooms/global').trim()

  if (!rawGroupId) {
    await c.env.DB.prepare('UPDATE users SET group_id = NULL WHERE id = ?').bind(user.id).run()
  } else {
    const grp = await c.env.DB.prepare('SELECT id FROM groups WHERE id = ?')
      .bind(rawGroupId)
      .first<{ id: string }>()
    if (!grp) return c.text('Invalid group', 400)
    await c.env.DB.prepare('UPDATE users SET group_id = ? WHERE id = ?').bind(grp.id, user.id).run()
  }
  const target = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/rooms/global'
  return c.redirect(target)
})

app.get('/', async (c) => {
  const user = await findSessionUser(c)
  if (user) return c.redirect('/rooms/global')
  return c.html(<LoginView />)
})

app.get('/join/:invite_code', async (c) => {
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

app.get('/rooms/:id', requireRoomMember, async (c) => {
  const user = c.get('user')
  const room = c.get('room')

  const { results: rooms } = await c.env.DB.prepare(
    `SELECT r.id, r.name, r.is_global, r.invite_code, r.discord_role_id
     FROM rooms r
     LEFT JOIN room_memberships rm ON r.id = rm.room_id AND rm.user_id = ?
     WHERE r.is_global = 1 OR rm.user_id IS NOT NULL
     ORDER BY r.is_global DESC, r.id ASC`,
  )
    .bind(user.id)
    .all<RoomRecord>()

  const { results: groups } = await c.env.DB.prepare(
    'SELECT id, name, color FROM groups ORDER BY id ASC',
  ).all<GroupRecord>()

  const { results: presenters } = await c.env.DB.prepare(
    `SELECT p.id, p.group_name, g.color AS group_color, p.name, p.slide_url, p.is_active
     FROM presenters p
     LEFT JOIN groups g ON p.group_name = g.name
     ORDER BY p.id ASC`,
  ).all<PresenterRecord>()

  const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(room.id))
  const historyRes = await stub.fetch('http://do/messages')
  const messages = historyRes.ok ? ((await historyRes.json()) as ChatMessage[]) : []

  return c.html(
    <ChatRoomView
      user={user}
      room={room}
      rooms={rooms}
      messages={messages}
      presenters={presenters}
      groups={groups}
      isAdmin={isAdminUser(c.env, user.id)}
    />,
  )
})

app.get('/rooms/:id/ws', requireRoomMember, async (c) => {
  if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426)
  }
  const user = c.get('user')
  const room = c.get('room')
  const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(room.id))
  const headers = new Headers(c.req.raw.headers)
  headers.set('X-User-Id', encodeURIComponent(user.id))
  headers.set('X-User-Name', encodeURIComponent(user.name))
  if (user.avatar_url) {
    headers.set('X-User-Avatar', encodeURIComponent(user.avatar_url))
  } else {
    headers.delete('X-User-Avatar')
  }
  if (user.group_name) {
    headers.set('X-User-Group-Name', encodeURIComponent(user.group_name))
  } else {
    headers.delete('X-User-Group-Name')
  }
  if (user.group_color) {
    headers.set('X-User-Group-Color', encodeURIComponent(user.group_color))
  } else {
    headers.delete('X-User-Group-Color')
  }
  return stub.fetch(new Request('http://do/ws', { headers }))
})

export { ChatRoom } from './room'
export default app
