import { isSingleEmoji, parseWsPayload } from '../src/do/message-parser.ts'
import {
  findActiveSchedule,
  parseScheduleCsv,
  shiftScheduleItems,
} from '../src/lib/schedule-csv.ts'
import {
  isValidHttpUrl,
  resolveDiscordInviteUrl,
  sanitizeRedirectPath,
  timingSafeEqualStr,
} from '../src/lib/validators.ts'
import type { ScheduleItemRecord } from '../src/types.ts'
import { benchSync, printBenchResults, type BenchResult } from './runner.ts'

const sampleCsv = [
  'start_time,end_time,title,description',
  ...Array.from({ length: 50 }, (_, i) => {
    const startH = String(9 + Math.floor(i / 6)).padStart(2, '0')
    const startM = String((i % 6) * 10).padStart(2, '0')
    const endH = String(9 + Math.floor((i + 1) / 6)).padStart(2, '0')
    const endM = String(((i + 1) % 6) * 10).padStart(2, '0')
    return `${startH}:${startM},${endH}:${endM},"セッション #${i + 1} (発表・質疑)","スピーカー${i + 1}による技術発表とライブQ&A"`
  }),
].join('\n')

const parsedSchedule = parseScheduleCsv(sampleCsv)
const scheduleRecords: ScheduleItemRecord[] = parsedSchedule.ok
  ? parsedSchedule.items.map((item, idx) => ({ id: idx + 1, sort_order: idx, ...item }))
  : []

const chatJson = JSON.stringify({
  body: 'こんにちは！発表とても面白かったです🎉 質問いいですか？',
})
const replyJson = JSON.stringify({
  body: 'スライドの3ページ目の構成について詳しく教えてください！',
  reply_to_id: '42',
})
const reactJson = JSON.stringify({
  action: 'react',
  message_id: 42,
  emoji: '🔥',
})

export const runUnitBenchmarks = (): BenchResult[] => {
  const results: BenchResult[] = [
    benchSync('parseWsPayload (通常メッセージ JSON)', 20_000, () => {
      parseWsPayload(chatJson)
    }),
    benchSync('parseWsPayload (リプライ付き JSON)', 20_000, () => {
      parseWsPayload(replyJson)
    }),
    benchSync('parseWsPayload (リアクション JSON)', 20_000, () => {
      parseWsPayload(reactJson)
    }),
    benchSync('isSingleEmoji (絵文字グラフェム判定)', 20_000, (i) => {
      isSingleEmoji(i % 2 === 0 ? '👨‍👩‍👧‍👦' : '🔥')
    }),
    benchSync('parseScheduleCsv (50件のタイムテーブルCSV)', 2_000, () => {
      parseScheduleCsv(sampleCsv)
    }),
    benchSync('findActiveSchedule + shiftScheduleItems (50件)', 10_000, () => {
      findActiveSchedule(scheduleRecords, '12:25')
      shiftScheduleItems(scheduleRecords, 5, 'current', '12:25')
    }),
    benchSync('validators (URL / Redirect / Invite / TimingSafe)', 20_000, () => {
      isValidHttpUrl('https://docs.google.com/presentation/d/1234567890/edit?usp=sharing')
      sanitizeRedirectPath('/rooms/team-alpha?tab=chat')
      resolveDiscordInviteUrl('event-chat-2026', null)
      timingSafeEqualStr('secret-token-value-1234567890', 'secret-token-value-1234567890')
    }),
  ]
  printBenchResults('単体処理マイクロベンチマーク (Parser / CSV / Validator)', results)
  return results
}
