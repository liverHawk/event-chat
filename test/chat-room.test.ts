import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser, type WsTestResponse } from './env-helper.ts'

describe('ChatRoom Durable Object とリアルタイム配信', () => {
  const connectUser = async (
    env: Record<string, unknown>,
    user: { id: string; name: string },
    roomId = 'global',
  ) => {
    const cookie = await loginAsDiscordUser(env, {
      id: user.id,
      username: user.name,
      global_name: user.name,
      avatar: null,
    })
    const res = (await app.fetch(
      new Request(`http://localhost/rooms/${roomId}/ws`, {
        headers: { Cookie: cookie, Upgrade: 'websocket' },
      }),
      env,
    )) as WsTestResponse
    assert.equal(res.status, 101)
    assert.ok(res.webSocket)
    return { cookie, client: res.webSocket, server: res.webSocket.peer! }
  }

  it('メッセージ送信で SQLite 保存・OOB HTML ブロードキャスト・SSR 過去ログ描画ができる', async () => {
    const { env, getRoomInstance } = createTestEnv()
    const u1 = await connectUser(env, { id: 'u1', name: 'Alice' })
    const u2 = await connectUser(env, { id: 'u2', name: 'Bob' })
    const room = getRoomInstance('global')

    await room.webSocketMessage(u1.server, JSON.stringify({ body: 'こんにちは！' }))

    assert.equal(u1.client.receivedMessages.length, 1)
    assert.equal(u2.client.receivedMessages.length, 1)
    const fragment = u2.client.receivedMessages[0]
    assert.match(fragment, /<ul hx-swap-oob="beforeend:#messages"><li id="msg-/)
    assert.match(fragment, /<strong>Alice<\/strong>/)
    assert.match(fragment, /data-reply-body="こんにちは！"/)
    assert.match(fragment, /こんにちは！/)

    const pageRes = await app.fetch(
      new Request('http://localhost/rooms/global', { headers: { Cookie: u2.cookie } }),
      env,
    )
    assert.equal(pageRes.status, 200)
    const html = await pageRes.text()
    assert.match(html, /こんにちは！/)
    assert.match(html, /ws-connect="\/rooms\/global\/ws"/)

    const histRes = await room.fetch(new Request('http://do/messages'))
    const [{ id: firstId, created_at }] = (await histRes.json()) as [
      { id: number; created_at: string },
    ]
    const jstMs = Date.parse(`${created_at.replace(' ', 'T')}+09:00`)
    assert.ok(Math.abs(Date.now() - jstMs) < 10_000)

    await room.webSocketMessage(
      u2.server,
      JSON.stringify({ body: 'よろしく！', reply_to_id: String(firstId) }),
    )
    const replyFragment = u1.client.receivedMessages[1]
    assert.match(replyFragment, new RegExp(`href="#msg-${firstId}"`))
    assert.match(replyFragment, /↩ <strong>Alice<\/strong>: こんにちは！/)
    assert.match(replyFragment, /よろしく！/)
  })

  it('XSS ペイロードはエスケープされ、空文字および 500 文字超は拒否される', async () => {
    const { env, getRoomInstance } = createTestEnv()
    const u1 = await connectUser(env, { id: 'u3', name: '<Eve>' })
    const room = getRoomInstance('global')

    await room.webSocketMessage(u1.server, JSON.stringify({ body: '   ' }))
    await room.webSocketMessage(u1.server, JSON.stringify({ body: 'あ'.repeat(501) }))
    assert.equal(u1.client.receivedMessages.length, 0)

    await room.webSocketMessage(u1.server, JSON.stringify({ body: '<script>alert(1)</script>' }))
    assert.equal(u1.client.receivedMessages.length, 1)
    const html = u1.client.receivedMessages[0]
    assert.doesNotMatch(html, /<script>/)
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
    assert.match(html, /&lt;Eve&gt;/)
  })

  it('1秒以内の連続送信はレートリミットにより弾かれる', async () => {
    const { env, getRoomInstance } = createTestEnv()
    const u1 = await connectUser(env, { id: 'u4', name: 'Spammer' })
    const room = getRoomInstance('global')

    await room.webSocketMessage(u1.server, JSON.stringify({ body: '1通目' }))
    await room.webSocketMessage(u1.server, JSON.stringify({ body: '2通目(連投)' }))
    assert.equal(u1.client.receivedMessages.length, 1)

    const att = u1.server.deserializeAttachment() as { lastSentAt: number }
    u1.server.serializeAttachment({ ...att, lastSentAt: Date.now() - 1100 })
    await room.webSocketMessage(u1.server, JSON.stringify({ body: '3通目(許可)' }))
    assert.equal(u1.client.receivedMessages.length, 2)
    assert.match(u1.client.receivedMessages[1], /3通目\(許可\)/)
  })
})
