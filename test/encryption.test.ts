import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser, type WsTestResponse } from './env-helper.ts'

describe('DB・Durable Object 保存データの AES-256-GCM 暗号化', () => {
  it('D1 (users/presenters) と DO SQLite (messages) の機密カラムは暗号文で保存され、画面では復号される', async () => {
    const { env, db, getRoomInstance, getRoomRawDb } = createTestEnv({ ADMIN_USER_IDS: 'u-enc-1' })
    const cookie = await loginAsDiscordUser(env, {
      id: 'u-enc-1',
      username: 'secretuser',
      global_name: '秘密の山田',
      avatar: 'av-hash-123',
    })

    const rawUser = await db
      .prepare('SELECT name, avatar_url FROM users WHERE id = ?')
      .bind('u-enc-1')
      .first<{ name: string; avatar_url: string | null }>()
    assert.match(rawUser?.name ?? '', /^enc:v1:/)
    assert.doesNotMatch(rawUser?.name ?? '', /秘密の山田|secretuser/)
    assert.match(rawUser?.avatar_url ?? '', /^enc:v1:/)
    assert.doesNotMatch(rawUser?.avatar_url ?? '', /discordapp|av-hash-123/)

    const profileRes = await app.fetch(
      new Request('http://localhost/profile', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'http://localhost',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          name: '極秘発表者・山田',
          slide_url: 'https://secret.example.com/confidential-slide',
          return_to: '/rooms/global',
        }),
      }),
      env,
    )
    assert.equal(profileRes.status, 302)

    for (const table of ['users', 'presenters'] as const) {
      const col = table === 'users' ? 'id' : 'user_id'
      const row = await db
        .prepare(`SELECT name, slide_url FROM ${table} WHERE ${col} = ?`)
        .bind('u-enc-1')
        .first<{ name: string; slide_url: string | null }>()
      assert.match(row?.name ?? '', /^enc:v1:/)
      assert.doesNotMatch(row?.name ?? '', /極秘発表者/)
      assert.match(row?.slide_url ?? '', /^enc:v1:/)
      assert.doesNotMatch(row?.slide_url ?? '', /secret\.example\.com/)
    }

    const wsRes = (await app.fetch(
      new Request('http://localhost/rooms/global/ws', {
        headers: { Cookie: cookie, Upgrade: 'websocket', Origin: 'http://localhost' },
      }),
      env,
    )) as WsTestResponse
    await getRoomInstance('global').webSocketMessage(
      wsRes.webSocket!.peer!,
      JSON.stringify({ body: '外に漏れてはいけない機密チャット本文です' }),
    )

    const rawMsg = getRoomRawDb('global')!
      .prepare('SELECT user_name, avatar_url, body FROM messages LIMIT 1')
      .get() as { user_name: string; avatar_url: string | null; body: string }
    assert.match(rawMsg.user_name, /^enc:v1:/)
    assert.doesNotMatch(rawMsg.user_name, /極秘発表者|山田/)
    assert.match(rawMsg.avatar_url ?? '', /^enc:v1:/)
    assert.match(rawMsg.body, /^enc:v1:/)
    assert.doesNotMatch(rawMsg.body, /機密チャット本文/)

    const chatHtml = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.match(chatHtml, /極秘発表者・山田/)
    assert.match(chatHtml, /https:\/\/secret\.example\.com\/confidential-slide/)
    assert.match(chatHtml, /外に漏れてはいけない機密チャット本文です/)
    assert.doesNotMatch(chatHtml, /enc:v1:/)
  })
})
