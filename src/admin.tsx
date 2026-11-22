import { Hono } from 'hono'
import { AdminView } from './admin-views'
import { requireAdmin } from './middleware'
import type { AppEnv, PresenterRecord, RoomRecord } from './types'

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

const isValidHttpUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.get('/admin', requireAdmin, async (c) => {
  const user = c.get('user')
  const { results: rooms } = await c.env.DB.prepare(
    'SELECT id, name, is_global, invite_code, discord_role_id FROM rooms ORDER BY is_global DESC, id ASC',
  ).all<RoomRecord>()
  const { results: presenters } = await c.env.DB.prepare(
    'SELECT id, group_name, name, slide_url, is_active FROM presenters ORDER BY id ASC',
  ).all<PresenterRecord>()
  return c.html(<AdminView user={user} rooms={rooms} presenters={presenters} />)
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

adminRoutes.post('/admin/presenters', requireAdmin, async (c) => {
  const body = await c.req.parseBody()
  const groupName = String(body.group_name ?? '').trim()
  const name = String(body.name ?? '').trim()
  const rawUrl = String(body.slide_url ?? '').trim()
  if (!groupName || !name) return c.text('Missing group_name or name', 400)
  if (rawUrl && !isValidHttpUrl(rawUrl)) return c.text('Invalid slide_url', 400)

  await c.env.DB.prepare(
    'INSERT INTO presenters (group_name, name, slide_url, is_active) VALUES (?, ?, ?, 0)',
  )
    .bind(groupName, name, rawUrl || null)
    .run()
  return c.redirect('/admin')
})

adminRoutes.post('/admin/presenters/:id/activate', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const current = await c.env.DB.prepare('SELECT is_active FROM presenters WHERE id = ?')
    .bind(id)
    .first<{ is_active: number }>()
  await c.env.DB.prepare('UPDATE presenters SET is_active = 0').run()
  if (current && current.is_active === 0) {
    await c.env.DB.prepare('UPDATE presenters SET is_active = 1 WHERE id = ?').bind(id).run()
  }
  return c.redirect('/admin')
})

adminRoutes.post('/admin/presenters/:id/delete', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM presenters WHERE id = ?').bind(id).run()
  return c.redirect('/admin')
})
