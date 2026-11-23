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
        headers: { Cookie: cookie, Upgrade: 'websocket', Origin: 'http://localhost' },
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

  it('投稿への絵文字リアクションをトグル・リアルタイム同期・SSR復元できる', async () => {
    const { env, getRoomInstance } = createTestEnv()
    const u1 = await connectUser(env, { id: 'u10', name: 'Alice' })
    const u2 = await connectUser(env, { id: 'u11', name: 'Bob' })
    const room = getRoomInstance('global')

    await room.webSocketMessage(u1.server, JSON.stringify({ body: '発表がんばってください！' }))
    const histRes = await room.fetch(new Request('http://do/messages'))
    const [{ id: msgId }] = (await histRes.json()) as [{ id: number }]

    // 1人目が 👍 を押す
    await room.webSocketMessage(
      u1.server,
      JSON.stringify({ action: 'react', message_id: msgId, emoji: '👍' }),
    )
    const u1ReactHtml = u1.client.receivedMessages[1]
    const u2ReactHtml = u2.client.receivedMessages[1]
    assert.match(u1ReactHtml, new RegExp(`hx-swap-oob="outerHTML:#reactions-${msgId}"`))
    assert.match(u1ReactHtml, /reaction-pill--active/)
    assert.match(u1ReactHtml, /<span>👍<\/span><span class="reaction-count">1<\/span>/)
    assert.doesNotMatch(u2ReactHtml, /reaction-pill--active/)
    assert.match(u2ReactHtml, /<span>👍<\/span><span class="reaction-count">1<\/span>/)

    // 2人目も同じ 👍 を押すとカウントが2になる
    await room.webSocketMessage(
      u2.server,
      JSON.stringify({ action: 'react', message_id: msgId, emoji: '👍' }),
    )
    assert.match(
      u2.client.receivedMessages[2],
      /<span>👍<\/span><span class="reaction-count">2<\/span>/,
    )

    // 1人目がもう一度押すと解除されカウントが1になる（レートリミット経過を模擬）
    const att1 = u1.server.deserializeAttachment() as { lastReactedAt?: number }
    u1.server.serializeAttachment({ ...att1, lastReactedAt: Date.now() - 500 })
    await room.webSocketMessage(
      u1.server,
      JSON.stringify({ action: 'react', message_id: msgId, emoji: '👍' }),
    )
    assert.doesNotMatch(u1.client.receivedMessages[3], /reaction-pill--active/)
    assert.match(
      u1.client.receivedMessages[3],
      /<span>👍<\/span><span class="reaction-count">1<\/span>/,
    )

    // 任意の絵文字（ZWJ結合絵文字・国旗など）も受け付ける
    u1.server.serializeAttachment({ ...att1, lastReactedAt: Date.now() - 500 })
    await room.webSocketMessage(
      u1.server,
      JSON.stringify({ action: 'react', message_id: msgId, emoji: '👨‍💻' }),
    )
    assert.match(
      u1.client.receivedMessages[4],
      /<span>👨‍💻<\/span><span class="reaction-count">1<\/span>/,
    )

    // 非絵文字・複数文字・存在しないメッセージIDは無視される
    const prevLen = u1.client.receivedMessages.length
    u1.server.serializeAttachment({ ...att1, lastReactedAt: Date.now() - 500 })
    await room.webSocketMessage(
      u1.server,
      JSON.stringify({ action: 'react', message_id: msgId, emoji: 'abc' }),
    )
    await room.webSocketMessage(
      u1.server,
      JSON.stringify({ action: 'react', message_id: msgId, emoji: '👍🔥' }),
    )
    await room.webSocketMessage(
      u1.server,
      JSON.stringify({ action: 'react', message_id: msgId, emoji: '<script>' }),
    )
    await room.webSocketMessage(
      u1.server,
      JSON.stringify({ action: 'react', message_id: 99999, emoji: '🔥' }),
    )
    assert.equal(u1.client.receivedMessages.length, prevLen)

    // SSR リロード時に u2 視点で 👍 がアクティブ状態で復元され、共有ピッカーも描画される
    const pageRes = await app.fetch(
      new Request('http://localhost/rooms/global', { headers: { Cookie: u2.cookie } }),
      env,
    )
    const pageHtml = await pageRes.text()
    assert.match(pageHtml, /reaction-pill--active/)
    assert.match(pageHtml, /<span>👍<\/span><span class="reaction-count">1<\/span>/)
    assert.match(pageHtml, /<span>👨‍💻<\/span><span class="reaction-count">1<\/span>/)
    assert.match(pageHtml, /id="emoji-picker-modal"/)
  })
})
