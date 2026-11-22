export const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
export const INVITE_CODE_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/
export const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/
const MAX_URL_LENGTH = 2048
const CONTROL_CHAR_PATTERN = /[\x00-\x1f\x7f]/

export const isValidHttpUrl = (raw: string): boolean => {
  if (raw.length > MAX_URL_LENGTH || CONTROL_CHAR_PATTERN.test(raw)) return false
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export const generateInviteCode = (): string => `inv-${crypto.randomUUID().replaceAll('-', '')}`

export const sanitizeRedirectPath = (
  raw: string | undefined | null,
  fallback = '/rooms/global',
): string => {
  const value = (raw ?? '').trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  if (CONTROL_CHAR_PATTERN.test(value)) return fallback
  try {
    const parsed = new URL(value, 'https://app.invalid')
    if (parsed.origin !== 'https://app.invalid' || !parsed.pathname.startsWith('/')) return fallback
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return fallback
  }
}

export const timingSafeEqualStr = (a: string, b: string): boolean => {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i]
  }
  return diff === 0
}
