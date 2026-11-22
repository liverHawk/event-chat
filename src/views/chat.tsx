import type { ChatMessage, GroupRecord, PresenterRecord, RoomRecord, UserRecord } from '../types'
import { GroupBadge } from './group'
import { Layout } from './layout'
import { ChatPresenterBar } from './presenter'

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
      <strong>{message.user_name}</strong>
      <GroupBadge name={message.group_name} color={message.group_color} />{' '}
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
  groups?: GroupRecord[]
  isAdmin?: boolean
}

export const ChatRoomView = ({
  user,
  room,
  rooms,
  messages,
  presenters = [],
  groups = [],
  isAdmin = false,
}: ChatRoomProps) => (
  <Layout title={`${room.name} - イベント雑談チャット`}>
    <nav style="flex-shrink:0">
      <ul>
        <li>
          <strong>{user.name}</strong>
          <GroupBadge name={user.group_name} color={user.group_color} />
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
        {isAdmin && (
          <li>
            <a href="/admin">ルーム管理</a>
          </li>
        )}
        <li>
          <form method="post" action="/auth/logout" style="margin:0">
            <button type="submit" class="outline secondary">
              ログアウト
            </button>
          </form>
        </li>
      </ul>
    </nav>
    <details style="flex-shrink:0;margin-bottom:0.4rem;font-size:0.85rem">
      <summary style="cursor:pointer">⚙️ 自分の設定（名前・所属グループ・発表資料URL）</summary>
      <form
        method="post"
        action="/profile"
        style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:0.5rem;align-items:center;margin:0.4rem 0 0"
      >
        <input type="hidden" name="return_to" value={`/rooms/${room.id}`} />
        <input
          type="text"
          name="name"
          value={user.name}
          aria-label="自分の名前"
          placeholder="自分の名前"
          maxlength={50}
          required
          style="margin:0;height:2.25rem;padding:0 0.6rem;font-size:0.85rem;width:100%;box-sizing:border-box"
        />
        <select
          name="group_id"
          aria-label="所属グループ"
          style="margin:0;height:2.25rem;padding:0 1.8rem 0 0.6rem;font-size:0.85rem;width:100%;box-sizing:border-box"
        >
          <option value="">グループ未選択</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id} selected={user.group_id === g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          type="url"
          name="slide_url"
          value={user.slide_url ?? ''}
          aria-label="発表資料URL"
          placeholder="発表資料URL (https://...)"
          style="margin:0;height:2.25rem;padding:0 0.6rem;font-size:0.85rem;width:100%;box-sizing:border-box"
        />
        <button
          type="submit"
          style="margin:0;height:2.25rem;padding:0 1rem;font-size:0.85rem;width:auto;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box"
        >
          保存
        </button>
      </form>
    </details>
    <article style="flex:1;min-height:0;display:flex;flex-direction:column;margin:0;overflow:hidden">
      <header style="flex-shrink:0">
        <strong>{room.name}</strong>
      </header>
      <ChatPresenterBar presenters={presenters} />
      <div
        hx-ext="ws"
        ws-connect={`/rooms/${room.id}/ws`}
        style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden"
      >
        <ul
          id="messages"
          style="flex:1;min-height:0;list-style:none;padding:0;margin:0;overflow-y:auto"
        >
          {messages.map((m) => (
            <MessageItem key={m.id} message={m} />
          ))}
        </ul>
        <div
          id="reply-banner"
          style="display:none;align-items:center;justify-content:space-between;gap:0.5rem;padding:0.3rem 0.6rem;margin-top:0.5rem;background:var(--pico-card-sectioning-background-color);border-radius:4px;font-size:0.85rem;flex-shrink:0"
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
          id="chat-form"
          ws-send=""
          style="display:flex;gap:0.5rem;margin:0.5rem 0 0;flex-shrink:0"
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
            __html: `window.setReply=function(b){document.getElementById('reply-to-id').value=b.dataset.replyId;document.getElementById('reply-target-name').textContent=b.dataset.replyUser;document.getElementById('reply-target-body').textContent=b.dataset.replyBody;document.getElementById('reply-banner').style.display='flex';document.getElementById('message-input').focus();};window.clearReply=function(){document.getElementById('reply-to-id').value='';document.getElementById('reply-target-body').textContent='';document.getElementById('reply-banner').style.display='none';};(function(){var f=document.getElementById('chat-form');if(f){f.addEventListener('htmx:wsAfterSend',function(){f.reset();window.clearReply();});}var m=document.getElementById('messages');if(m){m.scrollTop=m.scrollHeight;new MutationObserver(function(){m.scrollTop=m.scrollHeight;}).observe(m,{childList:true});}})();`,
          }}
        />
      </div>
    </article>
  </Layout>
)
