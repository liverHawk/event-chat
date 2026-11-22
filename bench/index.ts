import { runDoSsrBenchmarks } from './do-ssr-bench.ts'
import { runUnitBenchmarks } from './unit-bench.ts'

const args = new Set(process.argv.slice(2))
const runAll = args.size === 0 || (!args.has('--unit') && !args.has('--do'))

console.log('🚀 event-chat インプロセス・ベンチマークを開始します...')

if (runAll || args.has('--unit')) {
  runUnitBenchmarks()
}

if (runAll || args.has('--do')) {
  await runDoSsrBenchmarks()
}
