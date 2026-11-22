import type { ScheduleItemRecord } from '../types'

export type ParsedScheduleItem = {
  start_time: string
  end_time: string | null
  title: string
  description: string | null
}

const MAX_CSV_LENGTH = 16_384
const MAX_ROWS = 100
const TIME_RE = /^(\d{1,2}):(\d{2})$/

const normalizeTime = (raw: string): string | null => {
  const m = TIME_RE.exec(raw.trim())
  if (!m) return null
  const [h, min] = [Number(m[1]), Number(m[2])]
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

const parseCsvLine = (line: string): string[] => {
  const cols: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes && ch === '"' && line[i + 1] === '"') {
      cur += '"'
      i++
    } else if (ch === '"') {
      inQuotes = !inQuotes
    } else if (!inQuotes && ch === ',') {
      cols.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  return [...cols, cur.trim()]
}

export const parseScheduleCsv = (
  raw: string,
): { ok: true; items: ParsedScheduleItem[] } | { ok: false; error: string } => {
  const text = raw.replace(/^\uFEFF/, '').trim()
  if (!text) return { ok: false, error: 'CSV is empty' }
  if (text.length > MAX_CSV_LENGTH) return { ok: false, error: 'CSV is too large' }
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length > MAX_ROWS + 1) return { ok: false, error: 'Too many schedule rows' }

  const items: ParsedScheduleItem[] = []
  for (let i = 0; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const startTime = normalizeTime(cols[0] ?? '')
    if (!startTime) {
      if (i === 0 && !/\d/.test(cols[0] ?? '')) continue
      return { ok: false, error: `Invalid start time at line ${i + 1}` }
    }
    const endTime = cols.length >= 3 ? normalizeTime(cols[1] ?? '') : null
    const title = (endTime ? cols[2] : cols[1])?.trim() ?? ''
    const description = (endTime ? cols[3] : cols[2])?.trim() || null
    if (!title || Array.from(title).length > 100) {
      return { ok: false, error: `Invalid title at line ${i + 1}` }
    }
    if (description && Array.from(description).length > 200) {
      return { ok: false, error: `Description too long at line ${i + 1}` }
    }
    items.push({ start_time: startTime, end_time: endTime, title, description })
  }
  return items.length > 0 ? { ok: true, items } : { ok: false, error: 'No schedule items found' }
}

export const getCurrentJstHHMM = (now = new Date()): string => {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

export const findActiveSchedule = (
  items: ScheduleItemRecord[],
  nowHHMM = getCurrentJstHHMM(),
): { current: ScheduleItemRecord | null; next: ScheduleItemRecord | null } => {
  const current =
    items.find((item, i) => {
      const end = item.end_time ?? items[i + 1]?.start_time ?? '24:00'
      return item.start_time <= nowHHMM && nowHHMM < end
    }) ?? null
  return { current, next: items.find((item) => item.start_time > nowHHMM) ?? null }
}
