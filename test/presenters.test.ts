import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser } from './env-helper.ts'

describe('発表者（グループ・名前・資料URL）の登録と現在発表中の切り替え', () => {
  it('管理画面から発表者を追加・発表中に切替・チャット画面に表示・削除できる', async () => {
    const { env } = createTestEnv({ ADMIN_USER_IDS: 'p-admin' })
    const cookie = await loginAsDiscordUser(env, {
      id: 'p-admin',
      username: 'admin',
      global_name: '管理者',
      avatar: null,
    })

    const add1 = await app.fetch(
      new Request('http://localhost/admin/presenters', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'http://localhost',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          group_name: '1班',
          name: '佐藤',
          slide_url: 'https://example.com/slide-1',
        }),
      }),
      env,
    )
    assert.equal(add1.status, 302)

    const badUrl = await app.fetch(
      new Request('http://localhost/admin/presenters', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'http://localhost',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          group_name: '2班',
          name: '鈴木',
          slide_url: 'javascript:alert(1)',
        }),
      }),
      env,
    )
    assert.equal(badUrl.status, 400)

    await app.fetch(
      new Request('http://localhost/admin/presenters/1/activate', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
      }),
      env,
    )

    const chatHtml = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.match(chatHtml, /現在発表中:/)
    assert.match(chatHtml, />1班<\/span>/)
    assert.match(chatHtml, /佐藤/)
    assert.match(chatHtml, /href="https:\/\/example\.com\/slide-1"/)

    await app.fetch(
      new Request('http://localhost/admin/presenters/1/activate', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
      }),
      env,
    )
    const afterDeactivate = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.doesNotMatch(afterDeactivate, /現在発表中:/)

    await app.fetch(
      new Request('http://localhost/admin/presenters/1/delete', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
      }),
      env,
    )
    const afterDelete = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.doesNotMatch(afterDelete, /発表者一覧/)
  })
})
