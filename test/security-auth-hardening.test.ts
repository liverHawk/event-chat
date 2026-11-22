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

  it('サーバー未所属時はオンボーディング画面(403)を表示し、招待コード/URLを安全に描画する', async () => {
    const run = async (overrides: Record<string, string | undefined>) => {
      const { env } = createTestEnv(overrides)
      const startRes = await app.fetch(new Request('http://localhost/auth/discord'), env)
      const state = new URL(startRes.headers.get('location')!).searchParams.get('state')!
      const cookies = toCookieHeader(getSetCookies(startRes))
      const origFetch = globalThis.fetch
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/oauth2/token')) return Response.json({ access_token: 'tok' })
        if (url.includes('/users/@me/guilds/')) return new Response('Not Found', { status: 404 })
        return Response.json({ id: 'out', username: 'out', global_name: '部外者', avatar: null })
      }) as typeof fetch
      try {
        return await app.fetch(
          new Request(`http://localhost/auth/callback?code=c&state=${state}`, {
            headers: { Cookie: cookies },
          }),
          env,
        )
      } finally {
        globalThis.fetch = origFetch
      }
    }

    const codeRes = await run({ DISCORD_INVITE_CODE: 'abc1234' })
    assert.equal(codeRes.status, 403)
    const codeHtml = await codeRes.text()
    assert.match(codeHtml, /Discord サーバーへの参加が必要です/)
    assert.match(codeHtml, /href="https:\/\/discord\.gg\/abc1234"/)
    assert.match(codeHtml, /rel="noopener noreferrer"/)
    assert.match(codeHtml, /href="\/auth\/discord"/)

    const urlRes = await run({ DISCORD_INVITE_URL: 'https://discord.gg/event-invite' })
    assert.match(await urlRes.text(), /href="https:\/\/discord\.gg\/event-invite"/)

    const badRes = await run({
      DISCORD_INVITE_CODE: 'bad/path',
      DISCORD_INVITE_URL: 'javascript:alert(1)',
    })
    assert.equal(badRes.status, 403)
    assert.doesNotMatch(await badRes.text(), /javascript:alert|discord\.gg/)
  })
})
