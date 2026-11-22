import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser } from './env-helper.ts'

describe('タイムスケジュール CSV 一括登録・チャット表示', () => {
  it('管理画面から CSV テキスト・CSV ファイルで登録し、チャット画面に表示・全削除できる', async () => {
    const { env } = createTestEnv({ ADMIN_USER_IDS: 'sch-admin' })
    const cookie = await loginAsDiscordUser(env, {
      id: 'sch-admin',
      username: 'admin',
      global_name: '管理者',
      avatar: null,
    })

    const csv = [
      '開始時刻,終了時刻,タイトル,メモ',
      '00:00,23:59,終日セッション,"全体,説明"',
      '23:59,閉会式',
    ].join('\n')

    const form = new FormData()
    form.set('csv', csv)
    const uploadRes = await app.fetch(
      new Request('http://localhost/admin/schedule', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
        body: form,
      }),
      env,
    )
    assert.equal(uploadRes.status, 302)
    assert.equal(uploadRes.headers.get('location'), '/admin')

    const roomHtml = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.match(roomHtml, /タイムスケジュール（2件）/)
    assert.match(roomHtml, /現在進行中:/)
    assert.match(roomHtml, /終日セッション/)
    assert.match(roomHtml, /全体,説明/)
    assert.match(roomHtml, /閉会式/)

    const badForm = new FormData()
    badForm.set('csv', '99:99,不正時刻')
    const badRes = await app.fetch(
      new Request('http://localhost/admin/schedule', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
        body: badForm,
      }),
      env,
    )
    assert.equal(badRes.status, 400)

    const fileForm = new FormData()
    fileForm.set(
      'csv_file',
      new File(['10:00,11:00,ファイル登録テスト,備考\n'], 'schedule.csv', { type: 'text/csv' }),
    )
    const fileRes = await app.fetch(
      new Request('http://localhost/admin/schedule', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
        body: fileForm,
      }),
      env,
    )
    assert.equal(fileRes.status, 302)
    const afterFile = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.match(afterFile, /ファイル登録テスト/)
    assert.doesNotMatch(afterFile, /終日セッション/)

    const clearRes = await app.fetch(
      new Request('http://localhost/admin/schedule/clear', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
      }),
      env,
    )
    assert.equal(clearRes.status, 302)
    const afterClear = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.doesNotMatch(afterClear, /タイムスケジュール（/)
  })
})
