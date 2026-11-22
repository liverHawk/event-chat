export const MAX_BODY_LENGTH = 500
export const RATE_LIMIT_MS = 1000

export type ParsedWsMessage = {
  body: string
  replyToId: number | null
}

export const decodeWsMessage = (raw: string | ArrayBuffer): string =>
  typeof raw === 'string' ? raw : new TextDecoder().decode(raw)

export const parseWsPayload = (raw: string | ArrayBuffer): ParsedWsMessage | null => {
  const text = decodeWsMessage(raw)
  let body: string
  let replyToId: number | null = null
  try {
    const parsed = JSON.parse(text) as unknown
    if (parsed && typeof parsed === 'object' && 'body' in parsed) {
      const obj = parsed as { body?: unknown; reply_to_id?: unknown }
      body = typeof obj.body === 'string' ? obj.body.trim() : ''
      const rawReply = obj.reply_to_id
      const num = typeof rawReply === 'number' ? rawReply : Number(rawReply)
      if (Number.isInteger(num) && num > 0) replyToId = num
    } else {
      return null
    }
  } catch {
    body = text.trim()
  }
  if (!body || Array.from(body).length > MAX_BODY_LENGTH) return null
  return { body, replyToId }
}

export const parseMessageBody = (raw: string | ArrayBuffer): string | null =>
  parseWsPayload(raw)?.body ?? null
