import type { ChatMessage, ScheduleItemRecord } from '../types'

export type ScheduleBoundaryKind = 'start' | 'end' | 'transition'

export type ScheduleBoundary = {
  key: string
  scheduleId: number
  kind: ScheduleBoundaryKind
  time: string
  seconds: number
  title: string
  fromTitle?: string
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
  const list: (ScheduleBoundary & { rank: number })[] = []
  for (const item of items) {
    const startSec = parseHHMMToSeconds(item.start_time)
    const endSec = item.end_time ? parseHHMMToSeconds(item.end_time) : null
    const isZeroDuration = startSec !== null && endSec !== null && startSec === endSec
    if (startSec !== null) {
      list.push({
        key: `schedule-${item.id}-start`,
        scheduleId: item.id,
        kind: 'start',
        time: item.start_time,
        seconds: startSec,
        title: item.title,
        sortOrder: item.sort_order,
        rank: 1,
      })
    }
    if (endSec !== null && item.end_time) {
      list.push({
        key: `schedule-${item.id}-end`,
        scheduleId: item.id,
        kind: 'end',
        time: item.end_time,
        seconds: endSec,
        title: item.title,
        sortOrder: item.sort_order,
        rank: isZeroDuration ? 1 : 0,
      })
    }
  }
  const sorted = list
    .sort(
      (a, b) =>
        a.seconds - b.seconds ||
        a.rank - b.rank ||
        a.sortOrder - b.sortOrder ||
        a.scheduleId - b.scheduleId ||
        (a.kind === 'start' ? -1 : 1),
    )
    .map(({ rank: _rank, ...boundary }) => boundary)

  const merged: ScheduleBoundary[] = []
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]
    const next = sorted[i + 1]
    if (
      cur.kind === 'end' &&
      next?.kind === 'start' &&
      cur.seconds === next.seconds &&
      cur.scheduleId !== next.scheduleId
    ) {
      merged.push({
        key: `schedule-${cur.scheduleId}-to-${next.scheduleId}`,
        scheduleId: next.scheduleId,
        kind: 'transition',
        time: next.time,
        seconds: next.seconds,
        title: next.title,
        fromTitle: cur.title,
        sortOrder: next.sortOrder,
      })
      i++
    } else {
      merged.push(cur)
    }
  }
  return merged
}

export const buildChatTimelineWithMeta = (
  messages: ChatMessage[],
  schedule: ScheduleItemRecord[],
  now = new Date(),
): {
  entries: ChatTimelineEntry[]
  boundaries: ScheduleBoundary[]
  targetDate: string
} => {
  const nowJst = getCurrentJstClock(now)
  const boundaries = buildScheduleBoundaries(schedule)
  if (boundaries.length === 0) {
    return {
      entries: messages.map((message) => ({ type: 'message', message })),
      boundaries,
      targetDate: nowJst.date,
    }
  }

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

  const entries: ChatTimelineEntry[] = []
  let bIdx = 0
  let flushPending = messages.length === 0
  const emitUntil = (limit: number) => {
    while (bIdx < visible.length && visible[bIdx].seconds <= limit) {
      entries.push({ type: 'boundary', boundary: visible[bIdx++] })
    }
  }
  for (const { message, ts } of parsed) {
    if (ts && ts.date < targetDate) {
      entries.push({ type: 'message', message })
      continue
    }
    flushPending = true
    if (ts) emitUntil(ts.date > targetDate ? Infinity : ts.seconds)
    entries.push({ type: 'message', message })
  }
  if (flushPending) emitUntil(Infinity)
  return { entries, boundaries, targetDate }
}

export const buildChatTimeline = (
  messages: ChatMessage[],
  schedule: ScheduleItemRecord[],
  now = new Date(),
): ChatTimelineEntry[] => buildChatTimelineWithMeta(messages, schedule, now).entries
