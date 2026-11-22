import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { findSessionUser } from './middleware'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { profileRoutes } from './routes/profile'
import { roomRoutes } from './routes/rooms'
import type { AppEnv } from './types'
import { LoginView } from './views/layout'

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com 'unsafe-inline'",
  "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
  "img-src 'self' https://cdn.discordapp.com data:",
  "connect-src 'self' ws: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const app = new Hono<AppEnv>()

app.use('*', async (c, next) => {
  await next()
  if (c.res.status === 101) return
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('Referrer-Policy', 'no-referrer')
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.res.headers.set('Content-Security-Policy', CSP)
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

app.get('/', async (c) => {
  const user = await findSessionUser(c)
  if (user) return c.redirect('/rooms/global')
  return c.html(<LoginView />)
})

export { ChatRoom } from './do/chat-room'
export default app
