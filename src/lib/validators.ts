export const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export const isValidHttpUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
