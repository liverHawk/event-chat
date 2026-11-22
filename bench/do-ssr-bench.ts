import { app, createTestEnv, loginAsDiscordUser, type WsTestResponse } from '../test/env-helper.ts'
import type { MockWebSocket } from '../test/ws-mock.ts'
import { benchAsync, printBenchResults, type BenchResult } from './runner.ts'

const setupRoomWithClients = async (clientCount: number) => {
  const { env, db, getRoomInstance } = createTestEnv()
  await db.prepare("INSERT INTO groups (id, name, color) VALUES ('g1', 'Alpha', '#3b82f6')").run()
  const room = getRoomInstance('global')
  const servers: MockWebSocket[] = []
  const clients: MockWebSocket[] = []

  for (let i = 0; i < clientCount; i++) {
    const uid = `bench-u-${i}`
    await db
      .prepare("INSERT INTO users (id, name, group_id) VALUES (?, ?, 'g1')")
      .bind(uid, `User${i}`)
      .run()
    const res = (await room.fetch(
      new Request('http://do/ws', {
        headers: { Upgrade: 'websocket', 'X-User-Id': uid, 'X-User-Name': `User${i}` },
      }),
    )) as WsTestResponse
    if (res.webSocket?.peer) {
      clients.push(res.webSocket)
      servers.push(res.webSocket.peer)
    }
  }
  return { env, db, room, clients, servers }
}

const resetRateLimit = (serverSock: MockWebSocket) => {
  const sock = serverSock as unknown as {
    deserializeAttachment: () => Record<string, unknown>
    serializeAttachment: (v: unknown) => void
  }
  sock.serializeAttachment({ ...sock.deserializeAttachment(), lastSentAt: 0, lastReactedAt: 0 })
}

export const runDoSsrBenchmarks = async (): Promise<BenchResult[]> => {
  const results: BenchResult[] = []

  for (const count of [10, 100, 500]) {
    const { room, clients, servers } = await setupRoomWithClients(count)
    const iterations = count >= 500 ? 50 : 100
    results.push(
      await benchAsync(`WS メッセージ保存+配信 (${count}人同時接続)`, iterations, async (i) => {
        const sender = servers[i % servers.length]
        resetRateLimit(sender)
        await room.webSocketMessage(sender, JSON.stringify({ body: `ベンチマーク投稿 #${i}` }))
        for (const c of clients) c.receivedMessages.length = 0
      }),
    )
    const historyRes = await room.fetch(new Request('http://do/messages'))
    const history = (await historyRes.json()) as { id: number }[]
    const targetMessageId = history.at(-1)?.id ?? 1
    results.push(
      await benchAsync(`WS リアクション更新+配信 (${count}人同時接続)`, iterations, async (i) => {
        const sender = servers[i % servers.length]
        resetRateLimit(sender)
        await room.webSocketMessage(
          sender,
          JSON.stringify({ action: 'react', message_id: targetMessageId, emoji: '👍' }),
        )
        for (const c of clients) c.receivedMessages.length = 0
      }),
    )
  }

  const { env, db, room, servers } = await setupRoomWithClients(20)
  for (let i = 1; i <= 10; i++) {
    await db
      .prepare(
        'INSERT INTO schedule_items (start_time, end_time, title, sort_order) VALUES (?, ?, ?, ?)',
      )
      .bind('10:00', '10:30', `Session ${i}`, i)
      .run()
  }
  for (let i = 0; i < 100; i++) {
    const sender = servers[i % servers.length]
    resetRateLimit(sender)
    await room.webSocketMessage(sender, JSON.stringify({ body: `履歴メッセージ #${i}` }))
  }
  const cookie = await loginAsDiscordUser(env, {
    id: 'ssr-viewer',
    username: 'Viewer',
    global_name: 'Viewer',
    avatar: null,
  })
  results.push(
    await benchAsync('GET /rooms/global SSR (履歴100件+スケジュール描画)', 100, async () => {
      const res = await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
      await res.text()
    }),
  )

  printBenchResults('WebSocket ブロードキャスト & SSR レンダリング', results)
  return results
}
