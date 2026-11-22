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

    const shiftPost = (minutes: string, mode = 'all') =>
      app.fetch(
        new Request('http://localhost/admin/schedule/shift', {
          method: 'POST',
          headers: {
            Cookie: cookie,
            Origin: 'http://localhost',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ minutes, mode }),
        }),
        env,
      )
    assert.equal((await shiftPost('999')).status, 400)
    assert.equal((await shiftPost('15')).status, 302)
    const afterDelay = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.match(afterDelay, /10:15–11:15/)
    assert.equal((await shiftPost('-5')).status, 302)
    const afterEarlier = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.match(afterEarlier, /10:10–11:10/)

    const curForm = new FormData()
    curForm.set('csv', '00:00,00:01,終了済み\n00:01,23:50,進行中発表\n23:50,23:55,後続閉会')
    await app.fetch(
      new Request('http://localhost/admin/schedule', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: 'http://localhost' },
        body: curForm,
      }),
      env,
    )
    assert.equal((await shiftPost('5', 'current')).status, 302)
    const afterCurrent = await (
      await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
        env,
      )
    ).text()
    assert.match(afterCurrent, /00:00–00:01/)
    assert.match(afterCurrent, /00:01–23:55/)
    assert.match(afterCurrent, /23:55–23:59/)

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
