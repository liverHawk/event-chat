import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser, type WsTestResponse } from './env-helper.ts'

describe('グループ登録・1択セレクト・投稿者の色付きグループバッジ', () => {
  it('管理画面でグループ登録後、一般ユーザーがselectで所属を選択すると投稿に色付きバッジが付く', async () => {
    const { env, db, getRoomInstance } = createTestEnv({ ADMIN_USER_IDS: 'g-user-1' })
    const cookie = await loginAsDiscordUser(env, {
      id: 'g-user-1',
      username: 'taro',
      global_name: '太郎',
      avatar: null,
    })

    const createGrp = await app.fetch(
      new Request('http://localhost/admin/groups', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'http://localhost',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ name: 'A班', color: '#059669' }),
      }),
      env,
    )
    assert.equal(createGrp.status, 302)

    const wsBefore = (await app.fetch(
      new Request('http://localhost/rooms/global/ws', {
        headers: { Cookie: cookie, Upgrade: 'websocket', Origin: 'http://localhost' },
      }),
      env,
    )) as WsTestResponse
    const room = getRoomInstance('global')
    await room.webSocketMessage(
      wsBefore.webSocket!.peer!,
      JSON.stringify({ body: 'グループ選択前の過去投稿' }),
    )

    const grp = await db
      .prepare('SELECT id, name, color FROM groups WHERE name = ?')
      .bind('A班')
      .first<{ id: string; name: string; color: string }>()
    assert.ok(grp)
    assert.equal(grp.color, '#059669')

    const selectRes = await app.fetch(
      new Request('http://localhost/profile', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'http://localhost',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          name: '新・太郎',
          group_id: grp.id,
          slide_url: 'https://example.com/taro-slide',
          return_to: '/rooms/global',
        }),
      }),
      env,
    )
    assert.equal(selectRes.status, 302)
    assert.equal(selectRes.headers.get('location'), '/rooms/global')

    const att = wsBefore.webSocket!.peer!.deserializeAttachment() as { lastSentAt: number }
    wsBefore.webSocket!.peer!.serializeAttachment({ ...att, lastSentAt: Date.now() - 2000 })
    await room.webSocketMessage(
      wsBefore.webSocket!.peer!,
      JSON.stringify({ body: 'グループ付き投稿です' }),
    )
    const client = wsBefore.webSocket!
    assert.equal(client.receivedMessages.length, 2)
    const fragment = client.receivedMessages[1]
    assert.match(fragment, /<strong>新・太郎<\/strong>/)
    assert.match(fragment, /class="group-badge"/)
    assert.match(fragment, /background:#059669/)
    assert.match(fragment, />A班<\/span>/)

    const pageHtml = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.match(pageHtml, /aria-label="自分の名前"/)
    assert.match(pageHtml, /aria-label="所属グループ"/)
    assert.match(pageHtml, /aria-label="発表資料URL"/)
    assert.match(pageHtml, /href="https:\/\/example\.com\/taro-slide"/)
    const badgeMatches = pageHtml.match(/>A班<\/span>/g) ?? []
    assert.ok(badgeMatches.length >= 3)
  })
})
