import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser, type WsTestResponse } from './env-helper.ts'

describe('セキュリティ回帰テスト（Redirect・ヘッダー・DoS・入力検証）', () => {
  it('Open Redirect 無害化・セキュリティヘッダー・不正 presenter ID 検証が機能する', async () => {
    const { env } = createTestEnv({ ADMIN_USER_IDS: 'u-sec' })
    const cookie = await loginAsDiscordUser(env, {
      id: 'u-sec',
      username: 'sec',
      global_name: 'Sec',
      avatar: null,
    })
    const post = (path: string, body?: URLSearchParams) =>
      app.fetch(
        new Request(`http://localhost${path}`, {
          method: 'POST',
          headers: {
            Cookie: cookie,
            Origin: 'http://localhost',
            ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          },
          body,
        }),
        env,
      )

    const redirectRes = await post(
      '/profile',
      new URLSearchParams({ name: 'Sec', return_to: '/\\evil.com' }),
    )
    assert.equal(redirectRes.status, 302)
    assert.equal(redirectRes.headers.get('location'), '/rooms/global')
    const pageRes = await app.fetch(
      new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(pageRes.headers.get('x-frame-options'), 'DENY')
    assert.equal(pageRes.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(pageRes.headers.get('referrer-policy'), 'no-referrer')
    assert.equal(pageRes.headers.get('cache-control'), 'no-store')
    assert.match(pageRes.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/)
    assert.equal((await post('/admin/presenters/abc/activate')).status, 400)
    assert.equal((await post('/admin/presenters/9999/activate')).status, 404)
  })

  it('複数 WS 接続連投・同時接続上限・巨大ペイロード・ルーム削除時切断が機能する', async () => {
    const { env, db, getRoomInstance } = createTestEnv({ ADMIN_USER_IDS: 'u-dos' })
    const cookie = await loginAsDiscordUser(env, {
      id: 'u-dos',
      username: 'dos',
      global_name: 'Dos',
      avatar: null,
    })
    const wsHeaders = { Cookie: cookie, Upgrade: 'websocket', Origin: 'http://localhost' }
    const sockets: WsTestResponse[] = []
    for (let i = 0; i < 5; i++) {
      const res = (await app.fetch(
        new Request('http://localhost/rooms/global/ws', { headers: wsHeaders }),
        env,
      )) as WsTestResponse
      assert.equal(res.status, 101)
      sockets.push(res)
    }
    assert.equal(
      (
        await app.fetch(
          new Request('http://localhost/rooms/global/ws', { headers: wsHeaders }),
          env,
        )
      ).status,
      429,
    )

    const room = getRoomInstance('global')
    await room.webSocketMessage(sockets[0].webSocket!.peer!, JSON.stringify({ body: '1通目' }))
    await room.webSocketMessage(sockets[1].webSocket!.peer!, JSON.stringify({ body: '連投' }))
    await room.webSocketMessage(sockets[0].webSocket!.peer!, 'x'.repeat(5000))
    assert.equal(sockets[0].webSocket!.receivedMessages.length, 1)

    await db.prepare("INSERT INTO rooms (id, name, is_global) VALUES ('temp', '一時', 0)").run()
    await db
      .prepare("INSERT INTO room_memberships (user_id, room_id) VALUES ('u-dos', 'temp')")
      .run()
    const tempWs = (await app.fetch(
      new Request('http://localhost/rooms/temp/ws', { headers: wsHeaders }),
      env,
    )) as WsTestResponse
    const delRes = await app.fetch(
      new Request('http://localhost/admin/rooms/temp/delete', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
      }),
      env,
    )
    assert.equal(delRes.status, 302)
    assert.equal(tempWs.webSocket!.peer!.readyState, 3)
  })
})
