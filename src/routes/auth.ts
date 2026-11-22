import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import {
  exchangeDiscordCode,
  fetchDiscordGuildMember,
  fetchDiscordUser,
  syncDiscordGuildRoles,
} from '../lib/discord'
import { sanitizeRedirectPath, timingSafeEqualStr } from '../lib/validators'
import {
  clearSessionCookie,
  requireAuth,
  revokeUserSessions,
  setSessionCookie,
} from '../middleware'
import type { AppEnv } from '../types'
import { GuildOnboardingView } from '../views/layout'

const OAUTH_STATE_COOKIE = 'oauth_state'
const OAUTH_VERIFIER_COOKIE = 'oauth_verifier'
export const REDIRECT_AFTER_LOGIN_COOKIE = 'redirect_after_login'

const cookieOpts = (url: string, maxAge?: number) => ({
  httpOnly: true,
  sameSite: 'Lax' as const,
  path: '/',
  ...(maxAge !== undefined ? { maxAge } : {}),
  secure: new URL(url).protocol === 'https:',
})

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')

const createPkcePair = async () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const verifier = toBase64Url(bytes)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, challenge: toBase64Url(new Uint8Array(digest)) }
}

export const authRoutes = new Hono<AppEnv>()

authRoutes.get('/auth/discord', async (c) => {
  const guildId = c.env.DISCORD_GUILD_ID?.trim()
  if (!guildId) return c.text('Server misconfigured: DISCORD_GUILD_ID is required', 500)

  const state = crypto.randomUUID()
  const { verifier, challenge } = await createPkcePair()
  const opts = cookieOpts(c.req.url, 600)
  setCookie(c, OAUTH_STATE_COOKIE, state, opts)
  setCookie(c, OAUTH_VERIFIER_COOKIE, verifier, opts)

  const params = new URLSearchParams({
    client_id: c.env.DISCORD_CLIENT_ID,
    redirect_uri: c.env.DISCORD_REDIRECT_URL,
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  return c.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`)
})

authRoutes.get('/auth/callback', async (c) => {
  const guildId = c.env.DISCORD_GUILD_ID?.trim()
  if (!guildId) return c.text('Server misconfigured: DISCORD_GUILD_ID is required', 500)

  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = getCookie(c, OAUTH_STATE_COOKIE)
  const codeVerifier = getCookie(c, OAUTH_VERIFIER_COOKIE)
  const delOpts = cookieOpts(c.req.url)
  deleteCookie(c, OAUTH_STATE_COOKIE, delOpts)
  deleteCookie(c, OAUTH_VERIFIER_COOKIE, delOpts)
  if (!code || !state || !savedState || !codeVerifier || !timingSafeEqualStr(state, savedState)) {
    return c.text('Invalid OAuth state', 400)
  }

  const accessToken = await exchangeDiscordCode(c.env, code, codeVerifier)
  if (!accessToken) return c.text('Failed to exchange token', 502)

  const guildMember = await fetchDiscordGuildMember(guildId, accessToken)
  if (!guildMember) {
    return c.html(GuildOnboardingView({ inviteUrl: c.env.DISCORD_INVITE_URL }), 403)
  }

  const discordUser = await fetchDiscordUser(accessToken)
  if (!discordUser) return c.text('Failed to fetch Discord user', 502)

  await c.env.DB.prepare(
    `INSERT INTO users (id, name, avatar_url, updated_at) VALUES (?, ?, ?, datetime('now', '+9 hours'))
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar_url = excluded.avatar_url, updated_at = datetime('now', '+9 hours')`,
  )
    .bind(discordUser.id, discordUser.name, discordUser.avatarUrl)
    .run()

  await syncDiscordGuildRoles(c.env.DB, discordUser.id, guildMember.roles)

  const row = await c.env.DB.prepare('SELECT session_version FROM users WHERE id = ?')
    .bind(discordUser.id)
    .first<{ session_version: number }>()
  await setSessionCookie(c, discordUser.id, row?.session_version ?? 1)
  const redirectTarget = getCookie(c, REDIRECT_AFTER_LOGIN_COOKIE)
  deleteCookie(c, REDIRECT_AFTER_LOGIN_COOKIE, delOpts)
  return c.redirect(sanitizeRedirectPath(redirectTarget))
})

authRoutes.post('/auth/logout', requireAuth, async (c) => {
  await revokeUserSessions(c.env.DB, c.get('user').id)
  clearSessionCookie(c)
  return c.redirect('/')
})
