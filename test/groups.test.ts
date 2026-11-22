import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser, type WsTestResponse } from './env-helper.ts'

describe('グループ登録・1択セレクト・投稿者の色付きグループバッジ', () => {
  it('管理画面でグループ登録後、一般ユーザーがselectで所属を選択すると投稿に色付きバッジが付く', async () => {
    const { env, db, getRoomInstance } = createTestEnv()
    const cookie = await loginAsDiscordUser(env, {
      id: 'g-user-1',
      username: 'taro',
      global_name: '太郎',
      avatar: null,
    })

    const createGrp = await app.fetch(
      new Request('http://localhost/admin/groups', {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ name: 'A班', color: '#059669' }),
      }),
      env,
    )
    assert.equal(createGrp.status, 302)

    const grp = await db
      .prepare('SELECT id, name, color FROM groups WHERE name = ?')
      .bind('A班')
      .first<{ id: string; name: string; color: string }>()
    assert.ok(grp)
    assert.equal(grp.color, '#059669')

    const selectRes = await app.fetch(
      new Request('http://localhost/profile/group', {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ group_id: grp.id, return_to: '/rooms/global' }),
      }),
      env,
    )
    assert.equal(selectRes.status, 302)
    assert.equal(selectRes.headers.get('location'), '/rooms/global')

    const wsRes = (await app.fetch(
      new Request('http://localhost/rooms/global/ws', {
        headers: { Cookie: cookie, Upgrade: 'websocket' },
      }),
      env,
    )) as WsTestResponse
    assert.equal(wsRes.status, 101)
    const client = wsRes.webSocket!
    const room = getRoomInstance('global')

    await room.webSocketMessage(client.peer!, JSON.stringify({ body: 'グループ付き投稿です' }))
    assert.equal(client.receivedMessages.length, 1)
    const fragment = client.receivedMessages[0]
    assert.match(fragment, /class="group-badge"/)
    assert.match(fragment, /background:#059669/)
    assert.match(fragment, />A班<\/span>/)

    const pageHtml = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.match(pageHtml, /aria-label="所属グループ"/)
    assert.match(pageHtml, /background:#059669/)
    assert.match(pageHtml, />A班<\/span>/)
  })
})
