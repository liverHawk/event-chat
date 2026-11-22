import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, getSetCookies, loginAsDiscordUser, toCookieHeader } from './env-helper.ts'

describe('認証・Discord OAuth2', () => {
  it('未ログイン時はログイン画面を表示し、ログイン後は /rooms/global へリダイレクトする', async () => {
    const { env } = createTestEnv()
    const res = await app.fetch(new Request('http://localhost/'), env)
    assert.equal(res.status, 200)
    const html = await res.text()
    assert.match(html, /href="\/auth\/discord"/)

    const cookie = await loginAsDiscordUser(env, {
      id: 'u1',
      username: 'taro',
      global_name: '太郎',
      avatar: 'abc',
    })
    const authedRes = await app.fetch(
      new Request('http://localhost/', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(authedRes.status, 302)
    assert.equal(authedRes.headers.get('location'), '/rooms/global')
  })

  it('OAuth state 不一致時は 400 を返し、正常コールバックで users を UPSERT する', async () => {
    const { env, db } = createTestEnv()
    const startRes = await app.fetch(new Request('http://localhost/auth/discord'), env)
    assert.equal(startRes.status, 302)
    const stateCookie = toCookieHeader(getSetCookies(startRes))
    assert.match(stateCookie, /oauth_state=/)

    const badRes = await app.fetch(
      new Request('http://localhost/auth/callback?code=c&state=wrong', {
        headers: { Cookie: stateCookie },
      }),
      env,
    )
    assert.equal(badRes.status, 400)

    await loginAsDiscordUser(env, { id: 'u2', username: 'hanako', global_name: null, avatar: null })
    await loginAsDiscordUser(env, { id: 'u2', username: 'hanako', global_name: '花子', avatar: 'av2' })
    const row = await db.prepare('SELECT id, name, avatar_url FROM users WHERE id = ?').bind('u2').first<{
      id: string
      name: string
      avatar_url: string | null
    }>()
    assert.equal(row?.name, '花子')
    assert.equal(row?.avatar_url, 'https://cdn.discordapp.com/avatars/u2/av2.png')
  })

  it('POST /auth/logout でセッションを破棄し / へリダイレクトする', async () => {
    const { env } = createTestEnv()
    const cookie = await loginAsDiscordUser(env, {
      id: 'u3',
      username: 'jiro',
      global_name: '次郎',
      avatar: null,
    })
    const logoutRes = await app.fetch(
      new Request('http://localhost/auth/logout', { method: 'POST', headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(logoutRes.status, 302)
    assert.equal(logoutRes.headers.get('location'), '/')
    const setCookies = getSetCookies(logoutRes).join(';')
    assert.match(setCookies, /session=;/)
  })

  it('DISCORD_GUILD_ID 設定時は一致ロールの団体ルームへ自動参加する', async () => {
    const { env, db } = createTestEnv({ DISCORD_GUILD_ID: 'guild-1' })
    await db
      .prepare("INSERT INTO rooms (id, name, is_global, discord_role_id) VALUES ('staff', '運営部屋', 0, 'role-staff')")
      .run()
    const cookie = await loginAsDiscordUser(env, {
      id: 'u4',
      username: 'staff1',
      global_name: '運営太郎',
      avatar: null,
      roles: ['role-staff'],
    })
    const roomRes = await app.fetch(
      new Request('http://localhost/rooms/staff', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(roomRes.status, 200)
    assert.match(await roomRes.text(), /運営部屋/)
  })
})
