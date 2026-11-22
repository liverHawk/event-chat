export type Bindings = {
  DB: D1Database
  CHAT_ROOM: DurableObjectNamespace
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
  DISCORD_REDIRECT_URL: string
  SESSION_SECRET: string
  DISCORD_GUILD_ID?: string
  ADMIN_USER_IDS?: string
}

export type UserRecord = {
  id: string
  name: string
  avatar_url: string | null
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
  group_name: string
  name: string
  slide_url: string | null
  is_active: number
}

export type ChatMessage = {
  id: number
  user_id: string
  user_name: string
  avatar_url: string | null
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
  lastSentAt: number
}

export type Variables = {
  user: UserRecord
  room: RoomRecord
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
