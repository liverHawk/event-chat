import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { findSessionUser } from './middleware'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { profileRoutes } from './routes/profile'
import { roomRoutes } from './routes/rooms'
import type { AppEnv } from './types'
import { LoginView } from './views/layout'

const app = new Hono<AppEnv>()

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
