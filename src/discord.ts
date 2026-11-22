import type { Bindings } from './types'

export type DiscordUser = {
  id: string
  name: string
  avatarUrl: string | null
}

export const exchangeDiscordCode = async (
  env: Bindings,
  code: string,
): Promise<string | null> => {
  const res = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.DISCORD_REDIRECT_URL,
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { access_token?: string }
  return data.access_token ?? null
}

export const fetchDiscordUser = async (accessToken: string): Promise<DiscordUser | null> => {
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const u = (await res.json()) as {
    id: string
    username: string
    global_name: string | null
    avatar: string | null
  }
  return {
    id: u.id,
    name: u.global_name || u.username,
    avatarUrl: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null,
  }
}

export const syncDiscordGuildRoles = async (
  db: D1Database,
  userId: string,
  guildId: string,
  accessToken: string,
): Promise<void> => {
  const res = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return
  const member = (await res.json()) as { roles?: string[] }
  if (!member.roles?.length) return
  const { results } = await db
    .prepare('SELECT id, discord_role_id FROM rooms WHERE discord_role_id IS NOT NULL')
    .all<{ id: string; discord_role_id: string }>()
  const roleSet = new Set(member.roles)
  for (const room of results) {
    if (roleSet.has(room.discord_role_id)) {
      await db
        .prepare('INSERT OR IGNORE INTO room_memberships (user_id, room_id) VALUES (?, ?)')
        .bind(userId, room.id)
        .run()
    }
  }
}
