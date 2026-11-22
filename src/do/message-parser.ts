export const MAX_BODY_LENGTH = 500
export const MAX_RAW_PAYLOAD_BYTES = 4096
export const RATE_LIMIT_MS = 1000
export const REACTION_RATE_LIMIT_MS = 150
export const MAX_EMOJI_CODE_UNITS = 32

export const ALLOWED_REACTION_EMOJIS = ['👍', '👏', '🔥', '💡', '❤️', '👀'] as const

const graphemeSegmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' })
const EMOJI_CHAR_RE = /\p{Extended_Pictographic}/u
const REGIONAL_FLAG_RE = /^\p{Regional_Indicator}{2}$/u
const KEYCAP_EMOJI_RE = /^[#*0-9]\uFE0F?\u20E3$/u

export const isSingleEmoji = (raw: string): boolean => {
  if (!raw || raw.length > MAX_EMOJI_CODE_UNITS) return false
  const segments = Array.from(graphemeSegmenter.segment(raw))
  if (segments.length !== 1) return false
  const seg = segments[0].segment
  return EMOJI_CHAR_RE.test(seg) || REGIONAL_FLAG_RE.test(seg) || KEYCAP_EMOJI_RE.test(seg)
}

export type ParsedWsPayload =
  | {
      type: 'message'
      body: string
      replyToId: number | null
    }
  | {
      type: 'react'
      messageId: number
      emoji: string
    }

export const decodeWsMessage = (raw: string | ArrayBuffer): string =>
  typeof raw === 'string' ? raw : new TextDecoder().decode(raw)

export const parseWsPayload = (raw: string | ArrayBuffer): ParsedWsPayload | null => {
  const rawSize = typeof raw === 'string' ? raw.length : raw.byteLength
  if (rawSize === 0 || rawSize > MAX_RAW_PAYLOAD_BYTES) return null
  const text = decodeWsMessage(raw)
  let body: string
  let replyToId: number | null = null
  try {
    const parsed = JSON.parse(text) as unknown
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as {
        action?: unknown
        message_id?: unknown
        emoji?: unknown
        body?: unknown
        reply_to_id?: unknown
      }
      if (obj.action === 'react') {
        const messageId =
          typeof obj.message_id === 'number' ? obj.message_id : Number(obj.message_id)
        const emoji = typeof obj.emoji === 'string' ? obj.emoji.trim() : ''
        if (!Number.isInteger(messageId) || messageId <= 0 || !isSingleEmoji(emoji)) {
          return null
        }
        return { type: 'react', messageId, emoji }
      }
      if ('body' in obj) {
        body = typeof obj.body === 'string' ? obj.body.trim() : ''
        const rawReply = obj.reply_to_id
        const num = typeof rawReply === 'number' ? rawReply : Number(rawReply)
        if (Number.isInteger(num) && num > 0) replyToId = num
      } else {
        return null
      }
    } else {
      return null
    }
  } catch {
    body = text.trim()
  }
  if (!body || Array.from(body).length > MAX_BODY_LENGTH) return null
  return { type: 'message', body, replyToId }
}

export const parseMessageBody = (raw: string | ArrayBuffer): string | null => {
  const parsed = parseWsPayload(raw)
  return parsed?.type === 'message' ? parsed.body : null
}
