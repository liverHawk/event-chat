import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { Hono } from 'hono'
import { setSignedCookie } from 'hono/cookie'

export const resolveLiveSecret = (override?: string): string => {
  if (override) return override
  for (const file of ['.dev.vars', '.dev.vars.example']) {
    if (!existsSync(file)) continue
    const m = /^SESSION_SECRET=(.+)$/m.exec(readFileSync(file, 'utf8'))
    if (m?.[1]) return m[1].trim()
  }
  throw new Error('SESSION_SECRET が見つかりません (.dev.vars または --secret=...)')
}

export const signLiveCookie = async (userId: string, secret: string): Promise<string> => {
  const app = new Hono()
  app.get('/', async (c) => {
    await setSignedCookie(c, 'session', `${userId}.1.${Date.now() + 3600_000}`, secret, {
      path: '/',
    })
    return c.text('ok')
  })
  const res = await app.fetch(new Request('http://localhost/'))
  return (res.headers.get('set-cookie') ?? '').split(';')[0]
}

export const seedLocalBenchUsers = (userIds: string[]): void => {
  const rows = userIds.map((id, i) => `('${id}', 'Bench${i}', 1)`).join(', ')
  const sql = `INSERT OR IGNORE INTO rooms (id, name, is_global) VALUES ('global', '全体チャット', 1); INSERT OR REPLACE INTO users (id, name, session_version) VALUES ${rows};`
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', 'event-chat-db', '--local', '--command', sql],
    { stdio: 'ignore' },
  )
}
