import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { findSessionUser } from './middleware'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { profileRoutes } from './routes/profile'
import { roomRoutes } from './routes/rooms'
import type { AppEnv } from './types'
import { LoginView } from './views/layout'
import { APP_CSS } from './views/styles'

const buildCsp = (nonce: string) =>
  [
    "default-src 'self'",
    `script-src 'self' https://unpkg.com 'nonce-${nonce}'`,
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https://cdn.discordapp.com data:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

const createNonce = (): string => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

const app = new Hono<AppEnv>()

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error(err)
  return c.text('Internal Server Error', 500)
})

app.use('*', async (c, next) => {
  const isWsUpgrade = c.req.header('Upgrade')?.toLowerCase() === 'websocket'
  const nonce = isWsUpgrade ? '' : createNonce()
  if (nonce) c.set('cspNonce', nonce)
  await next()
  if (c.res.status === 101) return
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('Referrer-Policy', 'no-referrer')
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.res.headers.set('Content-Security-Policy', buildCsp(nonce))
  if (new URL(c.req.url).protocol === 'https:') {
    c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  const path = c.req.path
  if (path.startsWith('/rooms/') || path.startsWith('/admin') || path.startsWith('/join/')) {
    c.res.headers.set('Cache-Control', 'no-store')
  }
})
app.use('*', csrf())

app.route('/', authRoutes)
app.route('/', adminRoutes)
app.route('/', profileRoutes)
app.route('/', roomRoutes)

app.get('/styles.css', (c) =>
  c.text(APP_CSS, 200, {
    'Content-Type': 'text/css; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  }),
)

app.get('/', async (c) => {
  const user = await findSessionUser(c)
  if (user) return c.redirect('/rooms/global')
  return c.html(<LoginView />)
})

export { ChatRoom } from './do/chat-room'
export default app
