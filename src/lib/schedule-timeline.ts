import type { ChatMessage, ScheduleItemRecord } from '../types'

export type ScheduleBoundaryKind = 'start' | 'end'

export type ScheduleBoundary = {
  key: string
  scheduleId: number
  kind: ScheduleBoundaryKind
  time: string
  seconds: number
  title: string
  sortOrder: number
}

export type ChatTimelineEntry =
  | { type: 'message'; message: ChatMessage }
  | { type: 'boundary'; boundary: ScheduleBoundary }

const HHMM_RE = /^(\d{1,2}):(\d{2})$/
const CREATED_AT_RE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/

export const parseHHMMToSeconds = (hhmm: string): number | null => {
  const m = HHMM_RE.exec(hhmm.trim())
  if (!m) return null
  const [h, min] = [Number(m[1]), Number(m[2])]
  return h <= 23 && min <= 59 ? h * 3600 + min * 60 : null
}

export const parseCreatedAt = (createdAt: string): { date: string; seconds: number } | null => {
  const m = CREATED_AT_RE.exec(createdAt.trim())
  if (!m) return null
  const [h, min, sec] = [Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : 0]
  if (h > 23 || min > 59 || sec > 59) return null
  return { date: m[1], seconds: h * 3600 + min * 60 + sec }
}

export const getCurrentJstClock = (now = new Date()): { date: string; seconds: number } => {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return {
    date: jst.toISOString().slice(0, 10),
    seconds: jst.getUTCHours() * 3600 + jst.getUTCMinutes() * 60 + jst.getUTCSeconds(),
  }
}

export const buildScheduleBoundaries = (items: ScheduleItemRecord[]): ScheduleBoundary[] => {
  const list: ScheduleBoundary[] = []
  for (const item of items) {
    for (const [kind, time] of [
      ['start', item.start_time],
      ['end', item.end_time],
    ] as const) {
      const seconds = time ? parseHHMMToSeconds(time) : null
      if (seconds !== null && time) {
        list.push({
          key: `schedule-${item.id}-${kind}`,
          scheduleId: item.id,
          kind,
          time,
          seconds,
          title: item.title,
          sortOrder: item.sort_order,
        })
      }
    }
  }
  return list.sort((a, b) => {
    if (a.seconds !== b.seconds) return a.seconds - b.seconds
    if (a.scheduleId === b.scheduleId && a.kind !== b.kind) return a.kind === 'start' ? -1 : 1
    if (a.kind !== b.kind) return a.kind === 'end' ? -1 : 1
    return a.sortOrder - b.sortOrder || a.scheduleId - b.scheduleId
  })
}

export const buildChatTimeline = (
  messages: ChatMessage[],
  schedule: ScheduleItemRecord[],
  now = new Date(),
): ChatTimelineEntry[] => {
  const boundaries = buildScheduleBoundaries(schedule)
  if (boundaries.length === 0) return messages.map((message) => ({ type: 'message', message }))

  const nowJst = getCurrentJstClock(now)
  const parsed = messages.map((message) => ({ message, ts: parseCreatedAt(message.created_at) }))
  const dated = parsed.filter((e) => e.ts !== null)
  const targetDate = dated.some((e) => e.ts!.date === nowJst.date)
    ? nowJst.date
    : (dated[dated.length - 1]?.ts?.date ?? nowJst.date)
  const maxSec = dated.reduce(
    (max, e) => (e.ts!.date === targetDate && e.ts!.seconds > max ? e.ts!.seconds : max),
    -1,
  )
  const cutoff = targetDate === nowJst.date ? Math.max(nowJst.seconds, maxSec) : maxSec
  const visible = boundaries.filter((b) => b.seconds <= cutoff)

  const result: ChatTimelineEntry[] = []
  let bIdx = 0
  let flushPending = messages.length === 0
  const emitUntil = (limit: number) => {
    while (bIdx < visible.length && visible[bIdx].seconds <= limit) {
      result.push({ type: 'boundary', boundary: visible[bIdx++] })
    }
  }
  for (const { message, ts } of parsed) {
    if (ts && ts.date < targetDate) {
      result.push({ type: 'message', message })
      continue
    }
    flushPending = true
    if (ts) emitUntil(ts.date > targetDate ? Infinity : ts.seconds)
    result.push({ type: 'message', message })
  }
  if (flushPending) emitUntil(Infinity)
  return result
}
