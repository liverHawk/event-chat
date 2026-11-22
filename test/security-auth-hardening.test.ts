import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, getSetCookies, toCookieHeader } from './env-helper.ts'

describe('認証強化回帰テスト（Guild必須・PKCE・セッション失効）', () => {
  it('DISCORD_GUILD_ID 未設定時は 500、PKCE 送信とログアウト後セッション失効が機能する', async () => {
    const { env: noGuild } = createTestEnv({ DISCORD_GUILD_ID: undefined })
    assert.equal(
      (await app.fetch(new Request('http://localhost/auth/discord'), noGuild)).status,
      500,
    )

    const { env } = createTestEnv()
    const startRes = await app.fetch(new Request('http://localhost/auth/discord'), env)
    const loc = new URL(startRes.headers.get('location')!)
    assert.equal(loc.searchParams.get('code_challenge_method'), 'S256')
    assert.ok(loc.searchParams.get('code_challenge'))
    const cookies = toCookieHeader(getSetCookies(startRes))
    assert.match(cookies, /oauth_verifier=/)

    let sentVerifier = ''
    const origFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/oauth2/token')) {
        sentVerifier = new URLSearchParams(String(init?.body ?? '')).get('code_verifier') ?? ''
        return Response.json({ access_token: 'tok' })
      }
      if (url.includes('/users/@me/guilds/')) return Response.json({ roles: [] })
      return Response.json({ id: 'u-pkce', username: 'pkce', global_name: 'PKCE', avatar: null })
    }) as typeof fetch
    try {
      const cbRes = await app.fetch(
        new Request(
          `http://localhost/auth/callback?code=c&state=${loc.searchParams.get('state')}`,
          {
            headers: { Cookie: cookies },
          },
        ),
        env,
      )
      assert.equal(cbRes.status, 302)
      assert.ok(sentVerifier.length >= 40)

      const sessionCookie = toCookieHeader(getSetCookies(cbRes))
      const logoutRes = await app.fetch(
        new Request('http://localhost/auth/logout', {
          method: 'POST',
          headers: { Cookie: sessionCookie, Origin: 'http://localhost' },
        }),
        env,
      )
      assert.equal(logoutRes.status, 302)
      const reused = await app.fetch(
        new Request('http://localhost/rooms/global', { headers: { Cookie: sessionCookie } }),
        env,
      )
      assert.equal(reused.status, 302)
      assert.equal(reused.headers.get('location'), '/')
    } finally {
      globalThis.fetch = origFetch
    }
  })
})
