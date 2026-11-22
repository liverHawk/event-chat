import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser, type WsTestResponse } from './env-helper.ts'

describe('アプリ・DO強化回帰テスト（Nonce CSP・履歴消去・WS遮断・招待検証）', () => {
  it('CSP nonce・SlideLink防御・ルーム削除時履歴消去・削除ユーザーWS遮断・招待コード検証が機能する', async () => {
    const { env, db, getRoomInstance } = createTestEnv({ ADMIN_USER_IDS: 'u-hard' })
    const cookie = await loginAsDiscordUser(env, {
      id: 'u-hard',
      username: 'hard',
      global_name: 'Hard',
      avatar: null,
    })
    await db
      .prepare(
        "INSERT INTO presenters (group_name, name, slide_url, is_active) VALUES ('G', 'X', 'javascript:alert(1)', 1)",
      )
      .run()
    const pageRes = await app.fetch(
      new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
      env,
    )
    const csp = pageRes.headers.get('content-security-policy') ?? ''
    const nonce = csp.match(/script-src[^;]*'nonce-([^']+)'/)?.[1]
    assert.ok(nonce)
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/)
    const html = await pageRes.text()
    assert.match(html, new RegExp(`<script nonce="${nonce.replace(/[+]/g, '\\+')}"`))
    assert.doesNotMatch(html, /onclick=/)
    assert.doesNotMatch(html, /javascript:alert/)

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
    const rShort = await post(
      '/admin/rooms',
      new URLSearchParams({ id: 'r1', name: 'R1', invite_code: 'short' }),
    )
    assert.equal(rShort.status, 400)
    const rOk = await post(
      '/admin/rooms',
      new URLSearchParams({ id: 'r1', name: 'R1', invite_code: 'INV-123456' }),
    )
    assert.equal(rOk.status, 302)
    const rDup = await post(
      '/admin/rooms',
      new URLSearchParams({ id: 'r2', name: 'R2', invite_code: 'INV-123456' }),
    )
    assert.equal(rDup.status, 409)

    const wsHeaders = { Cookie: cookie, Upgrade: 'websocket', Origin: 'http://localhost' }
    const ws = (await app.fetch(
      new Request('http://localhost/rooms/r1/ws', { headers: wsHeaders }),
      env,
    )) as WsTestResponse
    const room = getRoomInstance('r1')
    await room.webSocketMessage(ws.webSocket!.peer!, JSON.stringify({ body: '秘密メッセージ' }))
    await post('/admin/rooms/r1/delete')
    const afterDel = (await (
      await room.fetch(new Request('http://do/messages'))
    ).json()) as unknown[]
    assert.equal(afterDel.length, 0)

    const gws = (await app.fetch(
      new Request('http://localhost/rooms/global/ws', { headers: wsHeaders }),
      env,
    )) as WsTestResponse
    await db.prepare("DELETE FROM users WHERE id = 'u-hard'").run()
    await getRoomInstance('global').webSocketMessage(
      gws.webSocket!.peer!,
      JSON.stringify({ body: '削除後' }),
    )
    assert.equal(gws.webSocket!.peer!.readyState, 3)
  })
})
