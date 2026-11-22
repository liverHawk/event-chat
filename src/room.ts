import { MessageItem } from './views'
import { parseWsPayload, RATE_LIMIT_MS } from './room-utils'
import type { Bindings, ChatMessage, WsAttachment } from './types'

const MESSAGE_SELECT = `
  SELECT m.id, m.user_id, m.user_name, m.avatar_url, m.body, m.created_at,
         r.id AS reply_to_id, r.user_name AS reply_to_user_name, r.body AS reply_to_body
  FROM messages m
  LEFT JOIN messages r ON m.reply_to_id = r.id`

export class ChatRoom {
  private ctx: DurableObjectState
  private env: Bindings

  constructor(ctx: DurableObjectState, env: Bindings) {
    this.ctx = ctx
    this.env = env
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        avatar_url TEXT,
        body TEXT NOT NULL,
        reply_to_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
      )`)
    try {
      this.ctx.storage.sql.exec('ALTER TABLE messages ADD COLUMN reply_to_id INTEGER')
    } catch {
      // Column already exists
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/messages') {
      const rows = this.ctx.storage.sql
        .exec<ChatMessage>(`${MESSAGE_SELECT} ORDER BY m.id DESC LIMIT 100`)
        .toArray()
        .reverse()
      return Response.json(rows)
    }
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const userId = decodeURIComponent(request.headers.get('X-User-Id') ?? '')
      const name = decodeURIComponent(request.headers.get('X-User-Name') ?? '')
      const rawAvatar = request.headers.get('X-User-Avatar')
      const avatarUrl = rawAvatar ? decodeURIComponent(rawAvatar) : null
      if (!userId || !name) return new Response('Missing user headers', { status: 400 })
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      this.ctx.acceptWebSocket(server)
      server.serializeAttachment({ userId, name, avatarUrl, lastSentAt: 0 } satisfies WsAttachment)
      return new Response(null, { status: 101, webSocket: client })
    }
    return new Response('Not found', { status: 404 })
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    const payload = parseWsPayload(rawMessage)
    if (!payload) return
    const attachment = ws.deserializeAttachment() as WsAttachment | null
    if (!attachment) return
    const now = Date.now()
    if (attachment.lastSentAt > 0 && now - attachment.lastSentAt < RATE_LIMIT_MS) return
    ws.serializeAttachment({ ...attachment, lastSentAt: now } satisfies WsAttachment)

    this.ctx.storage.sql.exec(
      "INSERT INTO messages (user_id, user_name, avatar_url, body, reply_to_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', '+9 hours'))",
      attachment.userId,
      attachment.name,
      attachment.avatarUrl,
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
