import { readdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const normalizeParams = (params: unknown[]) =>
  params.map((v) => (v === undefined ? null : (v as string | number | Uint8Array | null)))

export const createTestD1 = (migrationsDir = 'migrations'): D1Database => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON;')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of files) {
    db.exec(readFileSync(`${migrationsDir}/${file}`, 'utf8'))
  }

  const makeStatement = (sql: string, bound: unknown[] = []): D1PreparedStatement => ({
    bind(...values: unknown[]) {
      return makeStatement(sql, values)
    },
    async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
      const row = db.prepare(sql).get(...normalizeParams(bound)) as
        | Record<string, unknown>
        | undefined
      if (!row) return null
      if (colName) return (row[colName] ?? null) as T | null
      return row as T
    },
    async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
      const info = db.prepare(sql).run(...normalizeParams(bound))
      return {
        success: true,
        results: [] as T[],
        meta: {
          duration: 0,
          changes: Number(info.changes),
          last_row_id: Number(info.lastInsertRowid),
        } as D1Result<T>['meta'],
      }
    },
    async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
      const results = db.prepare(sql).all(...normalizeParams(bound)) as T[]
      return { success: true, results, meta: { duration: 0 } as D1Result<T>['meta'] }
    },
    async raw<T = unknown[]>(): Promise<T[]> {
      const rows = db.prepare(sql).all(...normalizeParams(bound)) as Record<string, unknown>[]
      return rows.map((r) => Object.values(r)) as T[]
    },
  })

  return {
    prepare: (query: string) => makeStatement(query),
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const out: D1Result<T>[] = []
      for (const s of statements) out.push(await s.all<T>())
      return out
    },
    async exec(query: string): Promise<D1ExecResult> {
      db.exec(query)
      return { count: 1, duration: 0 }
    },
    withSession() {
      return this as unknown as D1DatabaseSession
    },
    async dump(): Promise<ArrayBuffer> {
      return new ArrayBuffer(0)
    },
  } as unknown as D1Database
}
