import { Hono } from 'hono'
import { AdminView } from './admin-views'
import { requireAdmin } from './middleware'
import type { AppEnv, RoomRecord } from './types'

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.get('/admin', requireAdmin, async (c) => {
  const user = c.get('user')
  const { results: rooms } = await c.env.DB.prepare(
    'SELECT id, name, is_global, invite_code, discord_role_id FROM rooms ORDER BY is_global DESC, id ASC',
  ).all<RoomRecord>()
  return c.html(<AdminView user={user} rooms={rooms} />)
})

adminRoutes.post('/admin/rooms', requireAdmin, async (c) => {
  const user = c.get('user')
  const body = await c.req.parseBody()
  const id = String(body.id ?? '').trim()
  const name = String(body.name ?? '').trim()
  const rawRole = String(body.discord_role_id ?? '').trim()
  const rawInvite = String(body.invite_code ?? '').trim()

  if (!id || id === 'global' || !ROOM_ID_PATTERN.test(id) || !name) {
    return c.text('Invalid room id or name', 400)
  }

  const inviteCode = rawInvite || `inv-${crypto.randomUUID().slice(0, 8)}`
  const discordRoleId = rawRole || null

  await c.env.DB.prepare(
    `INSERT INTO rooms (id, name, is_global, invite_code, discord_role_id)
     VALUES (?, ?, 0, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       invite_code = excluded.invite_code,
       discord_role_id = excluded.discord_role_id`,
  )
    .bind(id, name, inviteCode, discordRoleId)
    .run()

  await c.env.DB.prepare('INSERT OR IGNORE INTO room_memberships (user_id, room_id) VALUES (?, ?)')
    .bind(user.id, id)
    .run()

  return c.redirect('/admin')
})

adminRoutes.post('/admin/rooms/:id/delete', requireAdmin, async (c) => {
  const roomId = c.req.param('id')
  if (roomId === 'global') return c.text('Cannot delete global room', 400)
  await c.env.DB.prepare('DELETE FROM rooms WHERE id = ? AND is_global = 0').bind(roomId).run()
  return c.redirect('/admin')
})
