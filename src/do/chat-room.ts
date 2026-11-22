import { MessageItem } from '../views/chat'
import { parseWsPayload, RATE_LIMIT_MS } from './message-parser'
import type { Bindings, ChatMessage, WsAttachment } from '../types'

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
    for (const col of ['reply_to_id INTEGER', 'group_name TEXT', 'group_color TEXT']) {
      try {
        this.ctx.storage.sql.exec(`ALTER TABLE messages ADD COLUMN ${col}`)
      } catch {
        // Column already exists
      }
    }
    this.schemaReady = true
  }

  private async loadUserProfileMap(): Promise<
    Map<string, { userName: string; groupName: string | null; groupColor: string | null }>
  > {
    const map = new Map<
      string,
      { userName: string; groupName: string | null; groupColor: string | null }
    >()
    try {
      const { results } = await this.env.DB.prepare(
        `SELECT u.id, u.name, g.name AS group_name, g.color AS group_color
         FROM users u
         LEFT JOIN groups g ON u.group_id = g.id`,
      ).all<UserProfileRow>()
      for (const row of results) {
        map.set(row.id, {
          userName: row.name,
          groupName: row.group_name,
          groupColor: row.group_color,
        })
      }
    } catch {
      // Fallback if DB is unavailable
    }
    return map
  }

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema()
    const url = new URL(request.url)
    if (url.pathname === '/messages') {
      const rows = this.ctx.storage.sql
        .exec<ChatMessage>(`${MESSAGE_SELECT} ORDER BY m.id DESC LIMIT 100`)
        .toArray()
        .reverse()
      const profileMap = await this.loadUserProfileMap()
      const enriched = rows.map((m) => {
        const p = profileMap.get(m.user_id)
        return p
          ? {
              ...m,
              user_name: p.userName,
              group_name: p.groupName ?? m.group_name,
              group_color: p.groupColor ?? m.group_color,
            }
          : m
      })
      return Response.json(enriched)
    }
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const userId = decodeURIComponent(request.headers.get('X-User-Id') ?? '')
      const name = decodeURIComponent(request.headers.get('X-User-Name') ?? '')
      const rawAvatar = request.headers.get('X-User-Avatar')
      const avatarUrl = rawAvatar ? decodeURIComponent(rawAvatar) : null
      const rawGroupName = request.headers.get('X-User-Group-Name')
      const groupName = rawGroupName ? decodeURIComponent(rawGroupName) : null
      const rawGroupColor = request.headers.get('X-User-Group-Color')
      const groupColor = rawGroupColor ? decodeURIComponent(rawGroupColor) : null
      if (!userId || !name) return new Response('Missing user headers', { status: 400 })
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
      } satisfies WsAttachment)
      return new Response(null, { status: 101, webSocket: client })
    }
    return new Response('Not found', { status: 404 })
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    this.ensureSchema()
    const payload = parseWsPayload(rawMessage)
    if (!payload) return
    const attachment = ws.deserializeAttachment() as WsAttachment | null
    if (!attachment) return
    const now = Date.now()
    if (attachment.lastSentAt > 0 && now - attachment.lastSentAt < RATE_LIMIT_MS) return
    ws.serializeAttachment({ ...attachment, lastSentAt: now } satisfies WsAttachment)

    const profileMap = await this.loadUserProfileMap()
    const latest = profileMap.get(attachment.userId)
    const userName = latest?.userName ?? attachment.name
    const groupName = latest?.groupName ?? attachment.groupName ?? null
    const groupColor = latest?.groupColor ?? attachment.groupColor ?? null

    this.ctx.storage.sql.exec(
      "INSERT INTO messages (user_id, user_name, avatar_url, group_name, group_color, body, reply_to_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'))",
      attachment.userId,
      userName,
      attachment.avatarUrl,
      groupName,
      groupColor,
      payload.body,
      payload.replyToId,
    )
    const saved = this.ctx.storage.sql
      .exec<ChatMessage>(`${MESSAGE_SELECT} WHERE m.id = last_insert_rowid()`)
      .one()

    const html = MessageItem({ message: saved, oob: true }).toString()
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
