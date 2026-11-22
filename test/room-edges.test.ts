import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, getSetCookies, loginAsDiscordUser, toCookieHeader, type WsTestResponse } from './env-helper.ts'

describe('エッジケース・境界値・異常系', () => {
  it('存在しないルームは 404、Upgrade なしの /ws は 426 を返す', async () => {
    const { env } = createTestEnv()
    const cookie = await loginAsDiscordUser(env, { id: 'e1', username: 'edge', global_name: 'Edge', avatar: null })

    const notFound = await app.fetch(new Request('http://localhost/rooms/non-existent', { headers: { Cookie: cookie } }), env)
    assert.equal(notFound.status, 404)

    const noUpgrade = await app.fetch(new Request('http://localhost/rooms/global/ws', { headers: { Cookie: cookie } }), env)
    assert.equal(noUpgrade.status, 426)
  })

  it('500文字（サロゲートペア含む）は受理され、105件送信時は最新100件を昇順で返す', async () => {
    const { env, getRoomInstance } = createTestEnv()
    const cookie = await loginAsDiscordUser(env, { id: 'e2', username: 'bulk', global_name: 'Bulk', avatar: null })
    const wsRes = (await app.fetch(
      new Request('http://localhost/rooms/global/ws', { headers: { Cookie: cookie, Upgrade: 'websocket' } }),
      env,
    )) as WsTestResponse
    const client = wsRes.webSocket!
    const server = client.peer!
    const room = getRoomInstance('global')

    const exact500 = '😀'.repeat(500)
    await room.webSocketMessage(server, JSON.stringify({ body: exact500 }))
    assert.equal(client.receivedMessages.length, 1)

    for (let i = 1; i <= 105; i++) {
      const att = server.deserializeAttachment() as { lastSentAt: number }
      server.serializeAttachment({ ...att, lastSentAt: Date.now() - 2000 })
      await room.webSocketMessage(server, JSON.stringify({ body: `msg-${i}` }))
    }

    const histRes = await room.fetch(new Request('http://do/messages'))
    const history = (await histRes.json()) as { body: string }[]
    assert.equal(history.length, 100)
    assert.equal(history[0].body, 'msg-6')
    assert.equal(history[99].body, 'msg-105')

    await room.webSocketClose(server, 1000, 'bye')
    assert.equal(server.readyState, 3)
  })

  it('未ログインで /join/:code 経由ログイン後に /join/:code へ戻る', async () => {
    const { env, db } = createTestEnv()
    await db.prepare("INSERT INTO rooms (id, name, is_global, invite_code) VALUES ('vip', 'VIP', 0, 'VIP1')").run()
    const joinRes = await app.fetch(new Request('http://localhost/join/VIP1'), env)
    const redirectCookie = toCookieHeader(getSetCookies(joinRes))

    const startRes = await app.fetch(new Request('http://localhost/auth/discord', { headers: { Cookie: redirectCookie } }), env)
    const stateCookie = toCookieHeader(getSetCookies(startRes))
    const state = new URL(startRes.headers.get('location')!).searchParams.get('state')!

    const origFetch = globalThis.fetch
    globalThis.fetch = (async (u: RequestInfo | URL) => {
      if (String(u).includes('/oauth2/token')) return Response.json({ access_token: 'tok' })
      return Response.json({ id: 'e3', username: 'vipuser', global_name: 'VIP太郎', avatar: null })
    }) as typeof fetch
    try {
      const cbRes = await app.fetch(
        new Request(`http://localhost/auth/callback?code=ok&state=${state}`, {
          headers: { Cookie: `${redirectCookie}; ${stateCookie}` },
        }),
        env,
      )
      assert.equal(cbRes.status, 302)
      assert.equal(cbRes.headers.get('location'), '/join/VIP1')
    } finally {
      globalThis.fetch = origFetch
    }
  })
})
