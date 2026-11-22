import type { Context } from 'hono'
import { Hono } from 'hono'
import { isValidHttpUrl } from '../lib/validators'
import { requireAuth } from '../middleware'
import type { AppEnv } from '../types'

const handleProfileUpdate = async (c: Context<AppEnv>) => {
  const user = c.get('user')
  const body = await c.req.parseBody()
  const returnTo = String(body.return_to ?? '/rooms/global').trim()

  const finalName = 'name' in body ? String(body.name ?? '').trim() : user.name
  if (!finalName || Array.from(finalName).length > 50) {
    return c.text('Invalid user name', 400)
  }

  let finalGroupId = user.group_id ?? null
  let finalGroupName = user.group_name ?? '-'
  if ('group_id' in body) {
    const rawGroupId = String(body.group_id ?? '').trim()
    if (!rawGroupId) {
      finalGroupId = null
      finalGroupName = '-'
    } else {
      const grp = await c.env.DB.prepare('SELECT id, name FROM groups WHERE id = ?')
        .bind(rawGroupId)
        .first<{ id: string; name: string }>()
      if (!grp) return c.text('Invalid group', 400)
      finalGroupId = grp.id
      finalGroupName = grp.name
    }
  }

  let finalSlideUrl = user.slide_url ?? null
  if ('slide_url' in body) {
    const rawSlide = String(body.slide_url ?? '').trim()
    if (!rawSlide) {
      finalSlideUrl = null
    } else {
      if (!isValidHttpUrl(rawSlide)) return c.text('Invalid slide_url', 400)
      finalSlideUrl = rawSlide
    }
  }

  await c.env.DB.prepare(
    "UPDATE users SET name = ?, group_id = ?, slide_url = ?, updated_at = datetime('now', '+9 hours') WHERE id = ?",
  )
    .bind(finalName, finalGroupId, finalSlideUrl, user.id)
    .run()

  const existingPresenter = await c.env.DB.prepare('SELECT id FROM presenters WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: number }>()

  if (finalSlideUrl) {
    if (existingPresenter) {
      await c.env.DB.prepare(
        'UPDATE presenters SET group_name = ?, name = ?, slide_url = ? WHERE id = ?',
      )
        .bind(finalGroupName, finalName, finalSlideUrl, existingPresenter.id)
        .run()
    } else {
      await c.env.DB.prepare(
        'INSERT INTO presenters (user_id, group_name, name, slide_url, is_active) VALUES (?, ?, ?, ?, 0)',
      )
        .bind(user.id, finalGroupName, finalName, finalSlideUrl)
        .run()
    }
  } else if (existingPresenter) {
    if ('slide_url' in body) {
      await c.env.DB.prepare('DELETE FROM presenters WHERE id = ?').bind(existingPresenter.id).run()
    } else {
      await c.env.DB.prepare('UPDATE presenters SET group_name = ?, name = ? WHERE id = ?')
        .bind(finalGroupName, finalName, existingPresenter.id)
        .run()
    }
  }

  const target = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/rooms/global'
  return c.redirect(target)
}

export const profileRoutes = new Hono<AppEnv>()
profileRoutes.post('/profile', requireAuth, handleProfileUpdate)
profileRoutes.post('/profile/group', requireAuth, handleProfileUpdate)
