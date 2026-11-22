import type { Child } from 'hono/jsx'
import { ChatPresenterBar } from './presenter-views'
import type { ChatMessage, PresenterRecord, RoomRecord, UserRecord } from './types'

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
      {message.reply_to_id && (
        <div style="font-size:0.8rem;color:var(--pico-muted-color);border-left:3px solid var(--pico-primary-border);padding-left:0.5rem;margin-bottom:0.2rem">
          <a href={`#msg-${message.reply_to_id}`} style="text-decoration:none;color:inherit">
            ↩ <strong>{message.reply_to_user_name}</strong>: {message.reply_to_body}
          </a>
        </div>
      )}
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
      <button
        type="button"
        class="outline secondary"
        data-reply-id={String(message.id)}
        data-reply-user={message.user_name}
        data-reply-body={message.body}
        onclick="window.setReply(this)"
        style="padding:0.1rem 0.4rem;font-size:0.75rem;margin-left:0.5rem;width:auto;display:inline-block"
      >
        返信
      </button>
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
  presenters?: PresenterRecord[]
}

export const ChatRoomView = ({ user, room, rooms, messages, presenters = [] }: ChatRoomProps) => (
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
          <a href="/admin">ルーム管理</a>
        </li>
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
      <ChatPresenterBar presenters={presenters} />
      <div hx-ext="ws" ws-connect={`/rooms/${room.id}/ws`}>
        <ul id="messages" style="list-style:none;padding:0;max-height:60vh;overflow-y:auto">
          {messages.map((m) => (
            <MessageItem key={m.id} message={m} />
          ))}
        </ul>
        <div
          id="reply-banner"
          style="display:none;align-items:center;justify-content:space-between;gap:0.5rem;padding:0.3rem 0.6rem;margin-top:0.75rem;background:var(--pico-card-sectioning-background-color);border-radius:4px;font-size:0.85rem"
        >
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ↩ <strong id="reply-target-name"></strong> に返信中:{' '}
            <span id="reply-target-body" style="color:var(--pico-muted-color)"></span>
          </span>
          <button
            type="button"
            class="outline secondary"
            onclick="window.clearReply()"
            style="padding:0.1rem 0.4rem;font-size:0.75rem;margin:0;width:auto;flex-shrink:0"
          >
            取消
          </button>
        </div>
        <form
          ws-send=""
          {...{ 'hx-on::ws-after-send': 'this.reset();window.clearReply()' }}
          style="display:flex;gap:0.5rem;margin-top:0.5rem"
        >
          <input type="hidden" name="reply_to_id" id="reply-to-id" value="" />
          <input
            type="text"
            id="message-input"
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
        <script
          dangerouslySetInnerHTML={{
            __html: `window.setReply=function(b){document.getElementById('reply-to-id').value=b.dataset.replyId;document.getElementById('reply-target-name').textContent=b.dataset.replyUser;document.getElementById('reply-target-body').textContent=b.dataset.replyBody;document.getElementById('reply-banner').style.display='flex';document.getElementById('message-input').focus();};window.clearReply=function(){document.getElementById('reply-to-id').value='';document.getElementById('reply-target-body').textContent='';document.getElementById('reply-banner').style.display='none';};`,
          }}
        />
      </div>
    </article>
  </Layout>
)
