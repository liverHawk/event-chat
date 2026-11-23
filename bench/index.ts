import { runDoSsrBenchmarks } from './do-ssr-bench.ts'
import type { BenchResult } from './runner.ts'
import { runUnitBenchmarks } from './unit-bench.ts'

const args = new Set(process.argv.slice(2))
const runAll = !args.has('--unit') && !args.has('--do')
const isJson = args.has('--json')
const isCheck = args.has('--check')

const MAX_AVG_MS_THRESHOLDS: Record<string, number> = {
  'WS メッセージ保存+配信 (500人同時接続)': 1.5,
  'WS リアクション更新+配信 (500人同時接続)': 1.5,
  'GET /rooms/global SSR (履歴100件+スケジュール描画)': 8.0,
}

if (!isJson) {
  console.log('🚀 event-chat インプロセス・ベンチマークを開始します...')
}

const allResults: BenchResult[] = []
if (runAll || args.has('--unit')) allResults.push(...runUnitBenchmarks())
if (runAll || args.has('--do')) allResults.push(...(await runDoSsrBenchmarks()))

if (isJson) {
  console.log(JSON.stringify(allResults, null, 2))
}

if (isCheck) {
  const failures = allResults.filter((r) => {
    const limit = MAX_AVG_MS_THRESHOLDS[r.name]
    return limit !== undefined && r.avgMs > limit
  })
  if (failures.length > 0) {
    for (const f of failures) {
      console.error(
        `❌ 閾値超過: ${f.name} (平均 ${f.avgMs.toFixed(3)} ms > 上限 ${MAX_AVG_MS_THRESHOLDS[f.name]} ms)`,
      )
    }
    process.exit(1)
  }
  const log = isJson ? console.error : console.log
  log('✅ すべてのベンチマーク項目がパフォーマンス閾値をクリアしました')
}
