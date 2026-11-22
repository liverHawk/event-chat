export type Bindings = {
  DB: D1Database
  CHAT_ROOM: DurableObjectNamespace
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
  DISCORD_REDIRECT_URL: string
  SESSION_SECRET: string
  DISCORD_GUILD_ID?: string
  DISCORD_INVITE_CODE?: string
  DISCORD_INVITE_URL?: string
  ADMIN_USER_IDS?: string
}

export type GroupRecord = {
  id: string
  name: string
  color: string
}

export type UserRecord = {
  id: string
  name: string
  avatar_url: string | null
  group_id?: string | null
  group_name?: string | null
  group_color?: string | null
  slide_url?: string | null
  session_version?: number
  updated_at?: string
}

export type RoomRecord = {
  id: string
  name: string
  is_global: number
  invite_code: string | null
  discord_role_id: string | null
}

export type PresenterRecord = {
  id: number
  user_id?: string | null
  group_name: string
  group_color?: string | null
  name: string
  slide_url: string | null
  is_active: number
}

export type ChatMessage = {
  id: number
  user_id: string
  user_name: string
  avatar_url: string | null
  group_name?: string | null
  group_color?: string | null
  body: string
  created_at: string
  reply_to_id?: number | null
  reply_to_user_name?: string | null
  reply_to_body?: string | null
}

export type WsAttachment = {
  userId: string
  name: string
  avatarUrl: string | null
  groupName?: string | null
  groupColor?: string | null
  lastSentAt: number
}

export type Variables = {
  user: UserRecord
  room: RoomRecord
  cspNonce: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
