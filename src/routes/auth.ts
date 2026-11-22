import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import {
  exchangeDiscordCode,
  fetchDiscordGuildMember,
  fetchDiscordUser,
  syncDiscordGuildRoles,
} from '../lib/discord'
import { sanitizeRedirectPath, timingSafeEqualStr } from '../lib/validators'
import { clearSessionCookie, requireAuth, setSessionCookie } from '../middleware'
import type { AppEnv } from '../types'

const OAUTH_STATE_COOKIE = 'oauth_state'
export const REDIRECT_AFTER_LOGIN_COOKIE = 'redirect_after_login'

const isSecure = (url: string): boolean => new URL(url).protocol === 'https:'

export const authRoutes = new Hono<AppEnv>()

authRoutes.get('/auth/discord', (c) => {
  const state = crypto.randomUUID()
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
    secure: isSecure(c.req.url),
  })
  const scope = c.env.DISCORD_GUILD_ID ? 'identify guilds.members.read' : 'identify'
  const params = new URLSearchParams({
    client_id: c.env.DISCORD_CLIENT_ID,
    redirect_uri: c.env.DISCORD_REDIRECT_URL,
    response_type: 'code',
    scope,
    state,
  })
  return c.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`)
})

authRoutes.get('/auth/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = getCookie(c, OAUTH_STATE_COOKIE)
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/' })
  if (!code || !state || !savedState || !timingSafeEqualStr(state, savedState)) {
    return c.text('Invalid OAuth state', 400)
  }

  const accessToken = await exchangeDiscordCode(c.env, code)
  if (!accessToken) return c.text('Failed to exchange token', 502)

  const guildMember = c.env.DISCORD_GUILD_ID
    ? await fetchDiscordGuildMember(c.env.DISCORD_GUILD_ID, accessToken)
    : null
  if (c.env.DISCORD_GUILD_ID && !guildMember) {
    return c.text('Forbidden: Not a member of the required Discord server', 403)
  }

  const discordUser = await fetchDiscordUser(accessToken)
  if (!discordUser) return c.text('Failed to fetch Discord user', 502)

  await c.env.DB.prepare(
    `INSERT INTO users (id, name, avatar_url, updated_at) VALUES (?, ?, ?, datetime('now', '+9 hours'))
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar_url = excluded.avatar_url, updated_at = datetime('now', '+9 hours')`,
  )
    .bind(discordUser.id, discordUser.name, discordUser.avatarUrl)
    .run()

  if (guildMember) {
    await syncDiscordGuildRoles(c.env.DB, discordUser.id, guildMember.roles)
  }

  await setSessionCookie(c, discordUser.id)
  const redirectTarget = getCookie(c, REDIRECT_AFTER_LOGIN_COOKIE)
  deleteCookie(c, REDIRECT_AFTER_LOGIN_COOKIE, { path: '/' })
  return c.redirect(sanitizeRedirectPath(redirectTarget))
})

authRoutes.post('/auth/logout', requireAuth, (c) => {
  clearSessionCookie(c)
  return c.redirect('/')
})
