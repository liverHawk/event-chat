import {
  decryptField,
  decryptNullableField,
  encryptField,
  encryptNullableField,
} from '../lib/crypto'
import type { Bindings, ChatMessage, MessageReaction, WsAttachment } from '../types'
import { MessageItem, ReactionBar } from '../views/chat'
import { parseWsPayload, RATE_LIMIT_MS, REACTION_RATE_LIMIT_MS } from './message-parser'

const MAX_CONNECTIONS_PER_USER = 5
const MAX_STORED_MESSAGES = 1000
const MAX_REACTIONS_PER_MESSAGE = 20

const safeDecode = (raw: string | null): string | null => {
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

const MESSAGE_SELECT = `
  SELECT m.id, m.user_id, m.user_name, m.avatar_url, m.group_name, m.group_color, m.body, m.created_at,
         r.id AS reply_to_id, r.user_name AS reply_to_user_name, r.body AS reply_to_body
  FROM messages m
  LEFT JOIN messages r ON m.reply_to_id = r.id`

type UserProfileRow = {
  id: string
  name: string
  group_name: string | null
  group_color: string | null
}

type MessageRow = Omit<ChatMessage, 'reactions'>

type ReactionRow = {
  message_id: number
  user_id: string
  emoji: string
}

const buildReactionsForUser = (
  rows: ReactionRow[],
  viewerUserId?: string | null,
): MessageReaction[] => {
  const counts = new Map<string, number>()
  const mine = new Set<string>()
  for (const row of rows) {
    counts.set(row.emoji, (counts.get(row.emoji) ?? 0) + 1)
    if (viewerUserId && row.user_id === viewerUserId) mine.add(row.emoji)
  }
  const result: MessageReaction[] = []
  for (const [emoji, count] of counts) {
    if (count > 0) result.push({ emoji, count, reacted: mine.has(emoji) })
  }
  return result
}

export class ChatRoom {
  private ctx: DurableObjectState
  private env: Bindings
  private schemaReady = false

  constructor(ctx: DurableObjectState, env: Bindings) {
    this.ctx = ctx
    this.env = env
    this.ensureSchema()
  }

  private ensureSchema(): void {
    if (this.schemaReady) return
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        avatar_url TEXT,
        group_name TEXT,
        group_color TEXT,
        body TEXT NOT NULL,
        reply_to_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
      )`)
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        message_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        emoji TEXT NOT NULL,
        PRIMARY KEY (message_id, user_id, emoji)
      )`)
    for (const col of ['reply_to_id INTEGER', 'group_name TEXT', 'group_color TEXT']) {
      try {
        this.ctx.storage.sql.exec(`ALTER TABLE messages ADD COLUMN ${col}`)
      } catch {
        // Column already exists
      }
    }
    this.schemaReady = true
  }

  private loadReactionsByMessageIds(messageIds: number[]): Map<number, ReactionRow[]> {
    const map = new Map<number, ReactionRow[]>()
    if (messageIds.length === 0) return map
    const placeholders = messageIds.map(() => '?').join(', ')
    const rows = this.ctx.storage.sql
      .exec<ReactionRow>(
        `SELECT message_id, user_id, emoji FROM message_reactions WHERE message_id IN (${placeholders})`,
        ...messageIds,
      )
      .toArray()
    for (const row of rows) {
      const list = map.get(row.message_id)
      if (list) list.push(row)
      else map.set(row.message_id, [row])
    }
    return map
  }

  private async loadUserProfile(
    userId: string,
  ): Promise<{ userName: string; groupName: string | null; groupColor: string | null } | null> {
    try {
      const row = await this.env.DB.prepare(
        `SELECT u.id, u.name, g.name AS group_name, g.color AS group_color
         FROM users u
         LEFT JOIN groups g ON u.group_id = g.id
         WHERE u.id = ?`,
      )
        .bind(userId)
        .first<UserProfileRow>()
      if (!row) return null
      return {
        userName: await decryptField(this.env, row.name),
        groupName: row.group_name,
        groupColor: row.group_color,
      }
    } catch {
      return null
    }
  }

  private async loadUserProfileMap(
    userIds: string[],
  ): Promise<
    Map<string, { userName: string; groupName: string | null; groupColor: string | null }>
  > {
    const map = new Map<
      string,
      { userName: string; groupName: string | null; groupColor: string | null }
    >()
    const unique = Array.from(new Set(userIds)).slice(0, 100)
    if (unique.length === 0) return map
    try {
      const placeholders = unique.map(() => '?').join(', ')
      const { results } = await this.env.DB.prepare(
        `SELECT u.id, u.name, g.name AS group_name, g.color AS group_color
         FROM users u
         LEFT JOIN groups g ON u.group_id = g.id
         WHERE u.id IN (${placeholders})`,
      )
        .bind(...unique)
        .all<UserProfileRow>()
      for (const row of results) {
        map.set(row.id, {
          userName: await decryptField(this.env, row.name),
          groupName: row.group_name,
          groupColor: row.group_color,
        })
      }
    } catch {
      // Fallback if DB is unavailable
    }
    return map
  }

  private async decryptMessageRow(row: MessageRow): Promise<MessageRow> {
    const [userName, avatarUrl, body, replyToUserName, replyToBody] = await Promise.all([
      decryptField(this.env, row.user_name),
      decryptNullableField(this.env, row.avatar_url),
      decryptField(this.env, row.body),
      decryptNullableField(this.env, row.reply_to_user_name),
      decryptNullableField(this.env, row.reply_to_body),
    ])
    return {
      ...row,
      user_name: userName,
      avatar_url: avatarUrl,
      body,
      reply_to_user_name: replyToUserName,
      reply_to_body: replyToBody,
    }
  }

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema()
    const url = new URL(request.url)
    if (url.pathname === '/messages') {
      const viewerUserId = url.searchParams.get('user_id')
      const rawRows = this.ctx.storage.sql
        .exec<MessageRow>(`${MESSAGE_SELECT} ORDER BY m.id DESC LIMIT 100`)
        .toArray()
        .reverse()
      const rows = await Promise.all(rawRows.map((m) => this.decryptMessageRow(m)))
      const profileMap = await this.loadUserProfileMap(rows.map((m) => m.user_id))
      const reactionMap = this.loadReactionsByMessageIds(rows.map((m) => m.id))
      const enriched = rows.map((m) => {
        const p = profileMap.get(m.user_id)
        const replyUser =
          m.reply_to_id != null
            ? (rows.find((r) => r.id === m.reply_to_id)?.user_name ?? m.reply_to_user_name)
            : m.reply_to_user_name
        const reactions = buildReactionsForUser(reactionMap.get(m.id) ?? [], viewerUserId)
        return p
          ? {
              ...m,
              user_name: p.userName,
              group_name: p.groupName ?? m.group_name,
              group_color: p.groupColor ?? m.group_color,
              reply_to_user_name: replyUser,
              reactions,
            }
          : { ...m, reply_to_user_name: replyUser, reactions }
      })
      return Response.json(enriched)
    }
    if (url.pathname === '/close' && request.method === 'POST') {
      for (const client of this.ctx.getWebSockets()) {
        try {
          client.close(1008, 'Room deleted')
        } catch {
          // Ignore already closed sockets
        }
      }
      this.ctx.storage.sql.exec('DELETE FROM message_reactions')
      this.ctx.storage.sql.exec('DELETE FROM messages')
      return new Response('ok')
    }
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const userId = safeDecode(request.headers.get('X-User-Id'))
      const name = safeDecode(request.headers.get('X-User-Name'))
      const avatarUrl = safeDecode(request.headers.get('X-User-Avatar'))
      const groupName = safeDecode(request.headers.get('X-User-Group-Name'))
      const groupColor = safeDecode(request.headers.get('X-User-Group-Color'))
      if (!userId || !name) return new Response('Missing user headers', { status: 400 })
      const activeForUser = this.ctx.getWebSockets().filter((s) => {
        const a = s.deserializeAttachment() as WsAttachment | null
        return a?.userId === userId
      }).length
      if (activeForUser >= MAX_CONNECTIONS_PER_USER) {
        return new Response('Too many connections', { status: 429 })
      }
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      this.ctx.acceptWebSocket(server)
      server.serializeAttachment({
        userId,
        name,
        avatarUrl,
        groupName,
        groupColor,
        lastSentAt: 0,
        lastReactedAt: 0,
      } satisfies WsAttachment)
      return new Response(null, { status: 101, webSocket: client })
    }
    return new Response('Not found', { status: 404 })
  }

  private async handleReaction(
    ws: WebSocket,
    attachment: WsAttachment,
    messageId: number,
    emoji: string,
  ): Promise<void> {
    const now = Date.now()
    const lastReactedAt = attachment.lastReactedAt ?? 0
    if (lastReactedAt > 0 && now - lastReactedAt < REACTION_RATE_LIMIT_MS) return
    ws.serializeAttachment({ ...attachment, lastReactedAt: now } satisfies WsAttachment)

    const exists = this.ctx.storage.sql
      .exec<{ id: number }>('SELECT id FROM messages WHERE id = ?', messageId)
      .toArray()
    if (exists.length === 0) return

    const existing = this.ctx.storage.sql
      .exec<{ ok: number }>(
        'SELECT 1 AS ok FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
        messageId,
        attachment.userId,
        emoji,
      )
      .toArray()
    if (existing.length > 0) {
      this.ctx.storage.sql.exec(
        'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
        messageId,
        attachment.userId,
        emoji,
      )
    } else {
      const distinctEmojis = this.ctx.storage.sql
        .exec<{ emoji: string }>(
          'SELECT DISTINCT emoji FROM message_reactions WHERE message_id = ?',
          messageId,
        )
        .toArray()
      const alreadyExists = distinctEmojis.some((r) => r.emoji === emoji)
      if (!alreadyExists && distinctEmojis.length >= MAX_REACTIONS_PER_MESSAGE) return
      this.ctx.storage.sql.exec(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
        messageId,
        attachment.userId,
        emoji,
      )
    }

    const rows = this.ctx.storage.sql
      .exec<ReactionRow>(
        'SELECT message_id, user_id, emoji FROM message_reactions WHERE message_id = ?',
        messageId,
      )
      .toArray()

    for (const client of this.ctx.getWebSockets()) {
      const clientAtt = client.deserializeAttachment() as WsAttachment | null
      const reactions = buildReactionsForUser(rows, clientAtt?.userId)
      const html = ReactionBar({ messageId, reactions, oob: true }).toString()
      try {
        client.send(html)
      } catch {
        // Ignore closed sockets
      }
    }
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    this.ensureSchema()
    const payload = parseWsPayload(rawMessage)
    if (!payload) return
    const attachment = ws.deserializeAttachment() as WsAttachment | null
    if (!attachment) return

    if (payload.type === 'react') {
      await this.handleReaction(ws, attachment, payload.messageId, payload.emoji)
      return
    }

    const now = Date.now()
    const latestUserSentAt = this.ctx.getWebSockets().reduce((max, sock) => {
      const a = sock.deserializeAttachment() as WsAttachment | null
      return a && a.userId === attachment.userId && a.lastSentAt > max ? a.lastSentAt : max
    }, attachment.lastSentAt)
    if (latestUserSentAt > 0 && now - latestUserSentAt < RATE_LIMIT_MS) return
    ws.serializeAttachment({ ...attachment, lastSentAt: now } satisfies WsAttachment)

    const latest = await this.loadUserProfile(attachment.userId)
    if (!latest) {
      try {
        ws.close(1008, 'User not found')
      } catch {
        // Ignore already closed sockets
      }
      return
    }
    const userName = latest.userName
    const groupName = latest.groupName ?? null
    const groupColor = latest.groupColor ?? null

    const [encUserName, encAvatarUrl, encBody] = await Promise.all([
      encryptField(this.env, userName),
      encryptNullableField(this.env, attachment.avatarUrl),
      encryptField(this.env, payload.body),
    ])

    this.ctx.storage.sql.exec(
      "INSERT INTO messages (user_id, user_name, avatar_url, group_name, group_color, body, reply_to_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'))",
      attachment.userId,
      encUserName,
      encAvatarUrl,
      groupName,
      groupColor,
      encBody,
      payload.replyToId,
    )
    const rawSaved = this.ctx.storage.sql
      .exec<MessageRow>(`${MESSAGE_SELECT} WHERE m.id = last_insert_rowid()`)
      .one()
    const saved = await this.decryptMessageRow(rawSaved)
    this.ctx.storage.sql.exec(
      'DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT ?)',
      MAX_STORED_MESSAGES,
    )
    this.ctx.storage.sql.exec(
      'DELETE FROM message_reactions WHERE message_id NOT IN (SELECT id FROM messages)',
    )

    const html = MessageItem({ message: { ...saved, reactions: [] }, oob: true }).toString()
    for (const client of this.ctx.getWebSockets()) {
      try {
        client.send(html)
      } catch {
        // Ignore closed sockets
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason)
    } catch {
      /* ignore */
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close(1011, 'WebSocket error')
    } catch {
      /* ignore */
    }
  }
}
