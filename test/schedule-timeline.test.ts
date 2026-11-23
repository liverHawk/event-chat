import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildChatTimeline,
  buildChatTimelineWithMeta,
  buildScheduleBoundaries,
} from '../src/lib/schedule-timeline.ts'
import type { ChatMessage, ScheduleItemRecord } from '../src/types.ts'
import { SCHEDULE_BOUNDARY_CLIENT_SCRIPT } from '../src/views/schedule-boundary-script.ts'

const msg = (id: number, body: string, created_at: string): ChatMessage => ({
  id,
  user_id: 'u1',
  user_name: 'Alice',
  avatar_url: null,
  body,
  created_at,
})

const item = (
  id: number,
  start_time: string,
  end_time: string | null,
  title: string,
  sort_order: number,
): ScheduleItemRecord => ({ id, start_time, end_time, title, description: null, sort_order })

const schedule = [
  item(1, '13:00', '13:15', '開会式', 0),
  item(2, '13:15', '14:00', '発表', 1),
  item(3, '14:00', null, '閉会', 2),
]

const labelOf = (e: ReturnType<typeof buildChatTimeline>[number]) =>
  e.type === 'message'
    ? `msg:${e.message.body}`
    : `${e.boundary.kind}:${e.boundary.time}:${e.boundary.title}`

describe('スケジュール開始・終了のタイムライン境界ロジック', () => {
  it('終了前のメッセージは終了の前、終了時刻以降・終了後のメッセージは終了の後に入る', () => {
    const messages = [
      msg(1, '開始前', '2026-11-23 12:59:59'),
      msg(2, '開会中', '2026-11-23 13:05:00'),
      msg(3, '終了直前', '2026-11-23 13:14:59'),
      msg(4, '終了ちょうど', '2026-11-23 13:15:00'),
      msg(5, '発表中', '2026-11-23 13:30:00'),
    ]
    const labels = buildChatTimeline(messages, schedule, new Date('2026-11-23T13:40:00+09:00')).map(
      labelOf,
    )
    assert.deepEqual(labels, [
      'msg:開始前',
      'start:13:00:開会式',
      'msg:開会中',
      'msg:終了直前',
      'end:13:15:開会式',
      'start:13:15:発表',
      'msg:終了ちょうど',
      'msg:発表中',
    ])
  })

  it('現在時刻より未来の境界は表示せず、到来済み境界はメッセージ0件でも表示する', () => {
    const labels = buildChatTimeline([], schedule, new Date('2026-11-23T13:10:00+09:00')).map(
      labelOf,
    )
    assert.deepEqual(labels, ['start:13:00:開会式'])
  })

  it('end_time が null の予定は開始境界のみ生成し、同時刻の終了→開始を正しい順に並べる', () => {
    const list = buildScheduleBoundaries(schedule).map((b) => `${b.kind}:${b.time}:${b.title}`)
    assert.deepEqual(list, [
      'start:13:00:開会式',
      'end:13:15:開会式',
      'start:13:15:発表',
      'end:14:00:発表',
      'start:14:00:閉会',
    ])
  })

  it('前日のメッセージには当日スケジュール境界を差し込まない', () => {
    const messages = [
      msg(1, '前日ログ', '2026-11-22 13:10:00'),
      msg(2, '当日ログ', '2026-11-23 13:20:00'),
    ]
    const labels = buildChatTimeline(messages, schedule, new Date('2026-11-23T13:25:00+09:00')).map(
      labelOf,
    )
    assert.deepEqual(labels, [
      'msg:前日ログ',
      'start:13:00:開会式',
      'end:13:15:開会式',
      'start:13:15:発表',
      'msg:当日ログ',
    ])
  })

  it('0分枠と別枠の同時刻終了が混在しても一貫した順序で並ぶ', () => {
    const mixed = [item(1, '13:15', '13:15', '合図', 0), item(2, '13:00', '13:15', '開会式', 1)]
    const list = buildScheduleBoundaries(mixed).map((b) => `${b.kind}:${b.time}:${b.title}`)
    assert.deepEqual(list, [
      'start:13:00:開会式',
      'end:13:15:開会式',
      'start:13:15:合図',
      'end:13:15:合図',
    ])
  })

  it('前日ログのみの場合は前日を対象日とし、不正な created_at でも落ちない', () => {
    const messages = [msg(1, '前日投稿', '2026-11-22 13:10:00'), msg(2, '不正日時', 'invalid')]
    const meta = buildChatTimelineWithMeta(
      messages,
      schedule,
      new Date('2026-11-23T15:00:00+09:00'),
    )
    assert.equal(meta.targetDate, '2026-11-22')
    assert.deepEqual(meta.entries.map(labelOf), [
      'start:13:00:開会式',
      'msg:前日投稿',
      'msg:不正日時',
    ])
  })

  it('クライアント同期スクリプトは構文エラーを含まない', () => {
    assert.doesNotThrow(() => new Function(SCHEDULE_BOUNDARY_CLIENT_SCRIPT))
  })
})
