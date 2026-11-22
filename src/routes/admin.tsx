import { Hono } from 'hono'
import { parseScheduleCsv, shiftScheduleItems } from '../lib/schedule-csv'
import {
  DISCORD_SNOWFLAKE_PATTERN,
  generateInviteCode,
  HEX_COLOR_PATTERN,
  INVITE_CODE_PATTERN,
  isValidHttpUrl,
  ROOM_ID_PATTERN,
} from '../lib/validators'
import { requireAdmin } from '../middleware'
import type { AppEnv, GroupRecord, PresenterRecord, RoomRecord, ScheduleItemRecord } from '../types'
import { AdminView } from '../views/admin'
import { GROUP_COLORS } from '../views/group'

const MAX_LABEL_LENGTH = 50
const parsePositiveInt = (raw: string): number | null => {
  if (!/^\d+$/.test(raw)) return null
  const num = Number(raw)
  return Number.isSafeInteger(num) && num > 0 ? num : null
}

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.get('/admin', requireAdmin, async (c) => {
  const user = c.get('user')
  const { results: rooms } = await c.env.DB.prepare(
    'SELECT id, name, is_global, invite_code, discord_role_id FROM rooms ORDER BY is_global DESC, id ASC',
  ).all<RoomRecord>()
  const { results: groups } = await c.env.DB.prepare(
    'SELECT id, name, color FROM groups ORDER BY id ASC',
  ).all<GroupRecord>()
  const { results: presenters } = await c.env.DB.prepare(
    `SELECT p.id, p.group_name, g.color AS group_color, p.name, p.slide_url, p.is_active
     FROM presenters p
     LEFT JOIN groups g ON p.group_name = g.name
     ORDER BY p.id ASC`,
  ).all<PresenterRecord>()
  const { results: schedule } = await c.env.DB.prepare(
    'SELECT id, start_time, end_time, title, description, sort_order FROM schedule_items ORDER BY sort_order ASC, id ASC',
  ).all<ScheduleItemRecord>()
  return c.html(
    <AdminView
      user={user}
      rooms={rooms}
      presenters={presenters}
      groups={groups}
      schedule={schedule}
    />,
  )
})

adminRoutes.post('/admin/groups', requireAdmin, async (c) => {
  const body = await c.req.parseBody()
  const name = String(body.name ?? '').trim()
  const rawColor = String(body.color ?? '').trim()
  if (!name || Array.from(name).length > MAX_LABEL_LENGTH) {
    return c.text('Invalid group name', 400)
  }
  const color = HEX_COLOR_PATTERN.test(rawColor) ? rawColor : GROUP_COLORS[0].hex
  const id = `grp-${crypto.randomUUID().slice(0, 8)}`
  await c.env.DB.prepare(
    'INSERT INTO groups (id, name, color) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET color = excluded.color',
  )
    .bind(id, name, color)
    .run()
  const saved = await c.env.DB.prepare('SELECT id FROM groups WHERE name = ?')
    .bind(name)
    .first<{ id: string }>()
  if (saved) {
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO rooms (id, name, is_global, invite_code, group_id) VALUES (?, ?, 0, ?, ?)',
    )
      .bind(saved.id, name, generateInviteCode(), saved.id)
      .run()
  }
  return c.redirect('/admin')
})

adminRoutes.post('/admin/groups/:id/delete', requireAdmin, async (c) => {
  const id = c.req.param('id')
  if (!ROOM_ID_PATTERN.test(id)) return c.text('Invalid group id', 400)
  const linkedRoom = await c.env.DB.prepare('SELECT id FROM rooms WHERE group_id = ?')
    .bind(id)
    .first<{ id: string }>()
  await c.env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(id).run()
  if (linkedRoom) {
    const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(linkedRoom.id))
    await stub.fetch('http://do/close', { method: 'POST' })
  }
  return c.redirect('/admin')
})

adminRoutes.post('/admin/rooms', requireAdmin, async (c) => {
  const user = c.get('user')
  const body = await c.req.parseBody()
  const id = String(body.id ?? '').trim()
  const name = String(body.name ?? '').trim()
  const rawRole = String(body.discord_role_id ?? '').trim()
  const rawInvite = String(body.invite_code ?? '').trim()

  if (
    !id ||
    id === 'global' ||
    !ROOM_ID_PATTERN.test(id) ||
    !name ||
    Array.from(name).length > MAX_LABEL_LENGTH
  ) {
    return c.text('Invalid room id or name', 400)
  }
  if (rawRole && !DISCORD_SNOWFLAKE_PATTERN.test(rawRole)) {
    return c.text('Invalid discord_role_id', 400)
  }
  if (rawInvite && !INVITE_CODE_PATTERN.test(rawInvite)) {
    return c.text('Invalid invite_code', 400)
  }

  const inviteCode = rawInvite || generateInviteCode()
  const discordRoleId = rawRole || null

  try {
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
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return c.text('Duplicate invite_code or discord_role_id', 409)
    }
    throw err
  }

  await c.env.DB.prepare('INSERT OR IGNORE INTO room_memberships (user_id, room_id) VALUES (?, ?)')
    .bind(user.id, id)
    .run()

  return c.redirect('/admin')
})

adminRoutes.post('/admin/rooms/:id/delete', requireAdmin, async (c) => {
  const roomId = c.req.param('id')
  if (roomId === 'global' || !ROOM_ID_PATTERN.test(roomId)) {
    return c.text('Cannot delete room', 400)
  }
  await c.env.DB.prepare('DELETE FROM rooms WHERE id = ? AND is_global = 0').bind(roomId).run()
  const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName(roomId))
  await stub.fetch('http://do/close', { method: 'POST' })
  return c.redirect('/admin')
})

adminRoutes.post('/admin/presenters', requireAdmin, async (c) => {
  const body = await c.req.parseBody()
  const groupName = String(body.group_name ?? '').trim()
  const name = String(body.name ?? '').trim()
  const rawUrl = String(body.slide_url ?? '').trim()
  if (
    !groupName ||
    !name ||
    Array.from(groupName).length > MAX_LABEL_LENGTH ||
    Array.from(name).length > MAX_LABEL_LENGTH
  ) {
    return c.text('Invalid group_name or name', 400)
  }
  if (rawUrl && !isValidHttpUrl(rawUrl)) return c.text('Invalid slide_url', 400)

  await c.env.DB.prepare(
    'INSERT INTO presenters (group_name, name, slide_url, is_active) VALUES (?, ?, ?, 0)',
  )
    .bind(groupName, name, rawUrl || null)
    .run()
  return c.redirect('/admin')
})

adminRoutes.post('/admin/presenters/:id/activate', requireAdmin, async (c) => {
  const id = parsePositiveInt(c.req.param('id'))
  if (!id) return c.text('Invalid presenter id', 400)
  const current = await c.env.DB.prepare('SELECT is_active FROM presenters WHERE id = ?')
    .bind(id)
    .first<{ is_active: number }>()
  if (!current) return c.text('Presenter not found', 404)
  await c.env.DB.prepare('UPDATE presenters SET is_active = 0').run()
  if (current.is_active === 0) {
    await c.env.DB.prepare('UPDATE presenters SET is_active = 1 WHERE id = ?').bind(id).run()
  }
  return c.redirect('/admin')
})

adminRoutes.post('/admin/presenters/:id/delete', requireAdmin, async (c) => {
  const id = parsePositiveInt(c.req.param('id'))
  if (!id) return c.text('Invalid presenter id', 400)
  await c.env.DB.prepare('DELETE FROM presenters WHERE id = ?').bind(id).run()
  return c.redirect('/admin')
})

adminRoutes.post('/admin/schedule', requireAdmin, async (c) => {
  const body = await c.req.parseBody()
  let csvText = ''
  const file = body.csv_file
  if (file instanceof File && file.size > 0) {
    if (file.size > 16_384) return c.text('CSV file too large', 400)
    csvText = await file.text()
  } else {
    csvText = String(body.csv ?? '')
  }
  const parsed = parseScheduleCsv(csvText)
  if (!parsed.ok) return c.text(parsed.error, 400)

  const stmts = [
    c.env.DB.prepare('DELETE FROM schedule_items'),
    ...parsed.items.map((item, idx) =>
      c.env.DB.prepare(
        'INSERT INTO schedule_items (start_time, end_time, title, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      ).bind(item.start_time, item.end_time, item.title, item.description, idx),
    ),
  ]
  await c.env.DB.batch(stmts)
  return c.redirect('/admin')
})

adminRoutes.post('/admin/schedule/shift', requireAdmin, async (c) => {
  const body = await c.req.parseBody()
  const raw = String(body.minutes ?? '').trim()
  const mode = String(body.mode ?? 'all') === 'current' ? 'current' : 'all'
  if (!/^-?\d+$/.test(raw)) return c.text('Invalid minutes', 400)
  const minutes = Number(raw)
  if (!Number.isSafeInteger(minutes) || minutes === 0 || minutes < -180 || minutes > 180) {
    return c.text('Minutes must be between -180 and 180', 400)
  }
  const { results } = await c.env.DB.prepare(
    'SELECT id, start_time, end_time, title, description, sort_order FROM schedule_items ORDER BY sort_order ASC, id ASC',
  ).all<ScheduleItemRecord>()
  const updates = shiftScheduleItems(results, minutes, mode)
  if (!updates) return c.text('No active schedule item to shift', 400)
  if (updates.length > 0) {
    await c.env.DB.batch(
      updates.map((row) =>
        c.env.DB.prepare(
          'UPDATE schedule_items SET start_time = ?, end_time = ? WHERE id = ?',
        ).bind(row.start_time, row.end_time, row.id),
      ),
    )
  }
  return c.redirect('/admin')
})

adminRoutes.post('/admin/schedule/clear', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM schedule_items').run()
  return c.redirect('/admin')
})
