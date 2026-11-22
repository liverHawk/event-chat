import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser } from './env-helper.ts'

describe('Web管理画面 (/admin) によるルーム管理', () => {
  it('管理画面から団体ルームを作成・ロールID設定・招待コード自動発行・削除できる', async () => {
    const { env } = createTestEnv({ ADMIN_USER_IDS: 'admin-1' })
    const cookie = await loginAsDiscordUser(env, {
      id: 'admin-1',
      username: 'admin',
      global_name: '管理者',
      avatar: null,
    })

    const getRes = await app.fetch(
      new Request('http://localhost/admin', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(getRes.status, 200)
    assert.match(await getRes.text(), /団体ルームの追加・更新/)

    const form = new URLSearchParams({
      id: 'circle-x',
      name: 'サークルX',
      discord_role_id: '999888777',
      invite_code: '',
    })
    const createRes = await app.fetch(
      new Request('http://localhost/admin/rooms', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'http://localhost',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      }),
      env,
    )
    assert.equal(createRes.status, 302)
    assert.equal(createRes.headers.get('location'), '/admin')

    const listHtml = await (
      await app.fetch(new Request('http://localhost/admin', { headers: { Cookie: cookie } }), env)
    ).text()
    assert.match(listHtml, /サークルX/)
    assert.match(listHtml, /999888777/)
    assert.match(listHtml, /\/join\/inv-/)

    const roomRes = await app.fetch(
      new Request('http://localhost/rooms/circle-x', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(roomRes.status, 200)

    const delRes = await app.fetch(
      new Request('http://localhost/admin/rooms/circle-x/delete', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
      }),
      env,
    )
    assert.equal(delRes.status, 302)
    const afterDel = await app.fetch(
      new Request('http://localhost/rooms/circle-x', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(afterDel.status, 404)
  })

  it('ADMIN_USER_IDS 設定時は指定ユーザー以外の /admin アクセスを 403 で拒否する', async () => {
    const { env } = createTestEnv({ ADMIN_USER_IDS: 'owner-1, owner-2' })
    const guestCookie = await loginAsDiscordUser(env, {
      id: 'guest-1',
      username: 'guest',
      global_name: '一般',
      avatar: null,
    })
    const guestRes = await app.fetch(
      new Request('http://localhost/admin', { headers: { Cookie: guestCookie } }),
      env,
    )
    assert.equal(guestRes.status, 403)
    const guestRoomHtml = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: guestCookie } }),
        env,
      )
    ).text()
    assert.doesNotMatch(guestRoomHtml, /href="\/admin"/)

    const ownerCookie = await loginAsDiscordUser(env, {
      id: 'owner-1',
      username: 'owner',
      global_name: 'オーナー',
      avatar: null,
    })
    const ownerRes = await app.fetch(
      new Request('http://localhost/admin', { headers: { Cookie: ownerCookie } }),
      env,
    )
    assert.equal(ownerRes.status, 200)
    const ownerRoomHtml = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: ownerCookie } }),
        env,
      )
    ).text()
    assert.match(ownerRoomHtml, /href="\/admin"/)
  })
})
