import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  app,
  createTestEnv,
  getSetCookies,
  loginAsDiscordUser,
  toCookieHeader,
} from './env-helper.ts'

describe('セキュリティ回帰テスト（認証・認可・CSRF・CSWSH）', () => {
  it('ADMIN_USER_IDS 未設定時は全員の /admin アクセスを 403 で拒否する', async () => {
    const { env } = createTestEnv()
    const cookie = await loginAsDiscordUser(env, {
      id: 'u-non-admin',
      username: 'user',
      global_name: '一般',
      avatar: null,
    })
    const getRes = await app.fetch(
      new Request('http://localhost/admin', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(getRes.status, 403)
    const postRes = await app.fetch(
      new Request('http://localhost/admin/groups', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'http://localhost',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ name: '不正班', color: '#2563eb' }),
      }),
      env,
    )
    assert.equal(postRes.status, 403)
  })

  it('DISCORD_GUILD_ID 設定時はサーバー未所属ユーザーのログインを 403 で拒否する', async () => {
    const { env } = createTestEnv({ DISCORD_GUILD_ID: 'guild-required' })
    const startRes = await app.fetch(new Request('http://localhost/auth/discord'), env)
    const stateCookie = toCookieHeader(getSetCookies(startRes))
    const state = new URL(startRes.headers.get('location')!).searchParams.get('state')!

    const origFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/oauth2/token')) return Response.json({ access_token: 'tok' })
      if (url.includes('/users/@me/guilds/')) return new Response('Not Found', { status: 404 })
      return Response.json({ id: 'outsider', username: 'out', global_name: '部外者', avatar: null })
    }) as typeof fetch

    try {
      const cbRes = await app.fetch(
        new Request(`http://localhost/auth/callback?code=c&state=${state}`, {
          headers: { Cookie: stateCookie },
        }),
        env,
      )
      assert.equal(cbRes.status, 403)
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it('クロスオリジン POST（CSRF）およびクロスオリジン WS（CSWSH）を 403 で遮断する', async () => {
    const { env } = createTestEnv({ ADMIN_USER_IDS: 'admin-csrf' })
    const cookie = await loginAsDiscordUser(env, {
      id: 'admin-csrf',
      username: 'admin',
      global_name: '管理者',
      avatar: null,
    })

    const csrfRes = await app.fetch(
      new Request('http://localhost/admin/groups', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'https://evil.workers.dev',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ name: 'CSRF班', color: '#2563eb' }),
      }),
      env,
    )
    assert.equal(csrfRes.status, 403)

    const cswshRes = await app.fetch(
      new Request('http://localhost/rooms/global/ws', {
        headers: { Cookie: cookie, Upgrade: 'websocket', Origin: 'https://evil.workers.dev' },
      }),
      env,
    )
    assert.equal(cswshRes.status, 403)
  })
})
