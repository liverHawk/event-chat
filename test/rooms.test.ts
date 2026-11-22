import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  app,
  createTestEnv,
  getSetCookies,
  loginAsDiscordUser,
  toCookieHeader,
} from './env-helper.ts'

describe('ルーム管理・招待参加・アクセス制御', () => {
  it('未認証の /rooms/global はリダイレクト、WebSocket Upgrade は 401 を返す', async () => {
    const { env } = createTestEnv()
    const pageRes = await app.fetch(new Request('http://localhost/rooms/global'), env)
    assert.equal(pageRes.status, 302)
    assert.equal(pageRes.headers.get('location'), '/')

    const wsRes = await app.fetch(
      new Request('http://localhost/rooms/global/ws', { headers: { Upgrade: 'websocket' } }),
      env,
    )
    assert.equal(wsRes.status, 401)
  })

  it('団体チャットは非メンバーを HTTP・WS ともに 403 で遮断する', async () => {
    const { env, db } = createTestEnv()
    await db
      .prepare(
        "INSERT INTO rooms (id, name, is_global, invite_code) VALUES ('team-a', 'チームA', 0, 'INV-A')",
      )
      .run()
    const cookie = await loginAsDiscordUser(env, {
      id: 'u10',
      username: 'member1',
      global_name: '一般参加者',
      avatar: null,
    })

    const globalRes = await app.fetch(
      new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(globalRes.status, 200)

    const forbiddenHttp = await app.fetch(
      new Request('http://localhost/rooms/team-a', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(forbiddenHttp.status, 403)

    const forbiddenWs = await app.fetch(
      new Request('http://localhost/rooms/team-a/ws', {
        headers: { Cookie: cookie, Upgrade: 'websocket' },
      }),
      env,
    )
    assert.equal(forbiddenWs.status, 403)
  })

  it('招待URL /join/:invite_code で参加後に団体チャットへアクセスできる', async () => {
    const { env, db } = createTestEnv()
    await db
      .prepare(
        "INSERT INTO rooms (id, name, is_global, invite_code) VALUES ('team-b', 'チームB', 0, 'INV-B')",
      )
      .run()

    const unauthJoin = await app.fetch(new Request('http://localhost/join/INV-B'), env)
    assert.equal(unauthJoin.status, 302)
    assert.equal(unauthJoin.headers.get('location'), '/auth/discord')
    assert.match(toCookieHeader(getSetCookies(unauthJoin)), /redirect_after_login=%2Fjoin%2FINV-B/)

    const cookie = await loginAsDiscordUser(env, {
      id: 'u11',
      username: 'invitee',
      global_name: '招待太郎',
      avatar: null,
    })
    const invalidJoin = await app.fetch(
      new Request('http://localhost/join/UNKNOWN', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(invalidJoin.status, 404)

    const joinRes = await app.fetch(
      new Request('http://localhost/join/INV-B', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(joinRes.status, 302)
    assert.equal(joinRes.headers.get('location'), '/rooms/team-b')

    const roomRes = await app.fetch(
      new Request('http://localhost/rooms/team-b', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(roomRes.status, 200)
    const html = await roomRes.text()
    assert.match(html, /チームB/)
    assert.match(html, /全体チャット/)
  })
})
