import type { Child } from 'hono/jsx'
import type { ChatMessage, RoomRecord, UserRecord } from './types'

export const Layout = ({ title, children }: { title: string; children: Child }) => (
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
      <script src="https://unpkg.com/htmx.org@1.9.12"></script>
      <script src="https://unpkg.com/htmx.org@1.9.12/dist/ext/ws.js"></script>
    </head>
    <body>
      <main class="container">{children}</main>
    </body>
  </html>
)

export const LoginView = () => (
  <Layout title="ログイン - イベント雑談チャット">
    <article style="max-width:480px;margin:4rem auto;text-align:center">
      <h1>イベント雑談チャット</h1>
      <p>Discordアカウントでログインして参加してください。</p>
      <a href="/auth/discord" role="button">
        Discordでログイン
      </a>
    </article>
  </Layout>
)

export const MessageItem = ({ message, oob }: { message: ChatMessage; oob?: boolean }) => {
  const item = (
    <li
      id={`msg-${message.id}`}
      style="list-style:none;margin:0;padding:0.4rem 0;border-bottom:1px solid var(--pico-muted-border-color)"
    >
      {message.avatar_url && (
        <img
          src={message.avatar_url}
          alt=""
          width={24}
          height={24}
          style="border-radius:50%;vertical-align:middle;margin-right:0.4rem"
        />
      )}
      <strong>{message.user_name}</strong>{' '}
      <small style="color:var(--pico-muted-color)">{message.created_at}</small>
      <div>{message.body}</div>
    </li>
  )
  return oob ? <ul hx-swap-oob="beforeend:#messages">{item}</ul> : item
}

type ChatRoomProps = {
  user: UserRecord
  room: RoomRecord
  rooms: RoomRecord[]
  messages: ChatMessage[]
}

export const ChatRoomView = ({ user, room, rooms, messages }: ChatRoomProps) => (
  <Layout title={`${room.name} - イベント雑談チャット`}>
    <nav>
      <ul>
        <li>
          <strong>{user.name}</strong>
        </li>
        {rooms.map((r) => (
          <li key={r.id}>
            <a href={`/rooms/${r.id}`} aria-current={r.id === room.id ? 'page' : undefined}>
              {r.name}
            </a>
          </li>
        ))}
      </ul>
      <ul>
        <li>
          <form method="post" action="/auth/logout" style="margin:0">
            <button type="submit" class="outline secondary">
              ログアウト
            </button>
          </form>
        </li>
      </ul>
    </nav>
    <article>
      <header>
        <strong>{room.name}</strong>
      </header>
      <div hx-ext="ws" ws-connect={`/rooms/${room.id}/ws`}>
        <ul id="messages" style="list-style:none;padding:0;max-height:60vh;overflow-y:auto">
          {messages.map((m) => (
            <MessageItem key={m.id} message={m} />
          ))}
        </ul>
        <form
          ws-send=""
          {...{ 'hx-on::ws-after-send': 'this.reset()' }}
          style="display:flex;gap:0.5rem;margin-top:1rem"
        >
          <input
            type="text"
            name="body"
            placeholder="メッセージを入力（最大500文字）"
            maxlength={500}
            required
            style="margin:0"
          />
          <button type="submit" style="width:auto;margin:0">
            送信
          </button>
        </form>
      </div>
    </article>
  </Layout>
)
