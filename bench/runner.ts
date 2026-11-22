import { performance } from 'node:perf_hooks'

export type BenchResult = {
  name: string
  iterations: number
  totalMs: number
  opsPerSec: number
  avgMs: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
}

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return sorted[idx]
}

const summarize = (name: string, samples: number[], totalMs: number): BenchResult => {
  const sorted = [...samples].sort((a, b) => a - b)
  const iterations = samples.length
  return {
    name,
    iterations,
    totalMs,
    opsPerSec: (iterations / totalMs) * 1000,
    avgMs: totalMs / iterations,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
  }
}

export const benchSync = (
  name: string,
  iterations: number,
  fn: (i: number) => void,
): BenchResult => {
  const warmup = Math.min(100, Math.max(10, Math.floor(iterations * 0.1)))
  for (let i = 0; i < warmup; i++) fn(i)
  const samples: number[] = []
  const startTotal = performance.now()
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now()
    fn(i)
    samples.push(performance.now() - t0)
  }
  return summarize(name, samples, performance.now() - startTotal)
}

export const benchAsync = async (
  name: string,
  iterations: number,
  fn: (i: number) => Promise<void>,
): Promise<BenchResult> => {
  const warmup = Math.min(20, Math.max(3, Math.floor(iterations * 0.1)))
  for (let i = 0; i < warmup; i++) await fn(i)
  const samples: number[] = []
  const startTotal = performance.now()
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now()
    await fn(i)
    samples.push(performance.now() - t0)
  }
  return summarize(name, samples, performance.now() - startTotal)
}

const fmtMs = (ms: number): string =>
  ms < 0.01 ? `${(ms * 1000).toFixed(2)} µs` : `${ms.toFixed(3)} ms`

export const printBenchResults = (title: string, results: BenchResult[]): void => {
  console.log(`\n=== ${title} ===`)
  console.table(
    results.map((r) => ({
      ベンチマーク項目: r.name,
      試行回数: r.iterations,
      'ops/sec': Math.round(r.opsPerSec).toLocaleString(),
      平均: fmtMs(r.avgMs),
      p50: fmtMs(r.p50Ms),
      p95: fmtMs(r.p95Ms),
      p99: fmtMs(r.p99Ms),
    })),
  )
}
