import { resolveLiveSecret, seedLocalBenchUsers, signLiveCookie } from '../bench/live-auth.ts'
import { benchAsync, printBenchResults } from '../bench/runner.ts'

const getArg = (k: string, def: string) =>
  process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? def

const baseUrl = getArg('--url', 'http://localhost:8787').replace(/\/$/, '')
const clientCount = Math.max(1, Number(getArg('--clients', '20')))
const msgCount = Math.max(1, Number(getArg('--messages', '20')))

type WsWithHeaders = new (url: string, opts: { headers: Record<string, string> }) => WebSocket
const CustomWebSocket = WebSocket as unknown as WsWithHeaders

try {
  await fetch(baseUrl)
} catch {
  console.error(
    `❌ ${baseUrl} に接続できません。先に別ターミナルで \`pnpm dev\` を起動してください。`,
  )
  process.exit(1)
}

const secret = resolveLiveSecret(getArg('--secret', process.env.SESSION_SECRET ?? ''))
const userIds = Array.from({ length: clientCount }, (_, i) => `live-bench-${i}`)
if (!process.argv.includes('--no-seed')) seedLocalBenchUsers(userIds)

const cookies = await Promise.all(userIds.map((id) => signLiveCookie(id, secret)))
const wsUrl = `${baseUrl.replace(/^http/, 'ws')}/rooms/global/ws`
let onReceive = () => {}

const sockets = await Promise.all(
  cookies.map(
    (Cookie) =>
      new Promise<WebSocket>((resolve, reject) => {
        const ws = new CustomWebSocket(wsUrl, { headers: { Cookie, Origin: baseUrl } })
        ws.addEventListener('open', () => resolve(ws))
        ws.addEventListener('error', () => reject(new Error('WebSocket 接続失敗')))
        ws.addEventListener('message', () => onReceive())
      }),
  ),
)

const lastSent = new Map<number, number>()
const ssrResult = await benchAsync(
  'Live HTTP GET /rooms/global SSR',
  Math.min(50, msgCount * 2),
  async (i) => {
    const res = await fetch(`${baseUrl}/rooms/global`, {
      headers: { Cookie: cookies[i % cookies.length] },
    })
    await res.text()
  },
)

const WS_RECEIVE_TIMEOUT_MS = 10_000

const wsResult = await benchAsync(
  `Live WS 配信 (${clientCount}接続同時受信)`,
  msgCount,
  async (i) => {
    const idx = i % sockets.length
    await new Promise<void>((resolve, reject) => {
      let left = sockets.length
      const timer = setTimeout(() => {
        onReceive = () => {}
        reject(new Error(`WS 配信タイムアウト (残り ${left}/${sockets.length} 件未受信)`))
      }, WS_RECEIVE_TIMEOUT_MS)
      onReceive = () => {
        if (--left === 0) {
          clearTimeout(timer)
          onReceive = () => {}
          resolve()
        }
      }
      lastSent.set(idx, Date.now())
      sockets[idx].send(JSON.stringify({ body: `Live benchmark #${i}` }))
    })
  },
  {
    beforeEach: async (i) => {
      const idx = i % sockets.length
      const waitMs = 1050 - (Date.now() - (lastSent.get(idx) ?? 0))
      if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs))
    },
  },
)

for (const ws of sockets) ws.close()
printBenchResults(`ローカルサーバー負荷テスト (${baseUrl})`, [ssrResult, wsResult])
