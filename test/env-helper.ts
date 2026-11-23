import { createTestD1 } from './d1-mock.ts'
import { createTestChatRoomNamespace, type ChatRoomClassType } from './do-mock.ts'
import { setupWorkersTestGlobals, type MockWebSocket } from './ws-mock.ts'

setupWorkersTestGlobals()

const bundleUrl = new URL('../.wrangler/test-build/index.js', import.meta.url).href
const built = (await import(bundleUrl)) as {
  default: { fetch: (req: Request, env: unknown) => Promise<Response> }
  ChatRoom: ChatRoomClassType
}

export const app = built.default
export const ChatRoom = built.ChatRoom

export const createTestEnv = (overrides: Record<string, string | undefined> = {}) => {
  const DB = createTestD1()
  let envObj: Record<string, unknown>
  const {
    namespace: CHAT_ROOM,
    getInstance,
    getRawDb,
  } = createTestChatRoomNamespace(ChatRoom, () => envObj)
  envObj = {
    DB,
    CHAT_ROOM,
    DISCORD_CLIENT_ID: 'test-client-id',
    DISCORD_CLIENT_SECRET: 'test-client-secret',
    DISCORD_REDIRECT_URL: 'http://localhost:8787/auth/callback',
    DISCORD_GUILD_ID: 'test-guild-id',
    SESSION_SECRET: 'test-session-secret-must-be-at-least-32-bytes-long',
    ...overrides,
  }
  return { env: envObj, db: DB, getRoomInstance: getInstance, getRoomRawDb: getRawDb }
}

export const getSetCookies = (res: Response): string[] => {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const single = res.headers.get('set-cookie')
  return single ? [single] : []
}

export const toCookieHeader = (setCookies: string[]): string =>
  setCookies.map((c) => c.split(';')[0]).join('; ')

export const loginAsDiscordUser = async (
  env: Record<string, unknown>,
  user: {
    id: string
    username: string
    global_name: string | null
    avatar: string | null
    roles?: string[]
  },
): Promise<string> => {
  const startRes = await app.fetch(new Request('http://localhost/auth/discord'), env)
  const stateCookie = toCookieHeader(getSetCookies(startRes))
  const location = new URL(startRes.headers.get('location')!)
  const state = location.searchParams.get('state')!

  const origFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/oauth2/token')) return Response.json({ access_token: 'mock-token' })
    if (url.includes('/users/@me/guilds/')) return Response.json({ roles: user.roles ?? [] })
    if (url.includes('/users/@me')) return Response.json(user)
    return new Response('Not Found', { status: 404 })
  }) as typeof fetch

  try {
    const cbRes = await app.fetch(
      new Request(`http://localhost/auth/callback?code=auth-code&state=${state}`, {
        headers: { Cookie: stateCookie },
      }),
      env,
    )
    return toCookieHeader(getSetCookies(cbRes))
  } finally {
    globalThis.fetch = origFetch
  }
}

export type WsTestResponse = Response & { webSocket?: MockWebSocket }
