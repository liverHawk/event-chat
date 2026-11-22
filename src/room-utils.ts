export const MAX_BODY_LENGTH = 500
export const RATE_LIMIT_MS = 1000

export const decodeWsMessage = (raw: string | ArrayBuffer): string =>
  typeof raw === 'string' ? raw : new TextDecoder().decode(raw)

export const parseMessageBody = (raw: string | ArrayBuffer): string | null => {
  const text = decodeWsMessage(raw)
  let body: string
  try {
    const parsed = JSON.parse(text) as unknown
    if (parsed && typeof parsed === 'object' && 'body' in parsed) {
      const value = (parsed as { body?: unknown }).body
      body = typeof value === 'string' ? value.trim() : ''
    } else {
      return null
    }
  } catch {
    body = text.trim()
  }
  if (!body || Array.from(body).length > MAX_BODY_LENGTH) return null
  return body
}
