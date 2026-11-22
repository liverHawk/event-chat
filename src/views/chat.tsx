import type {
  ChatMessage,
  GroupRecord,
  MessageReaction,
  PresenterRecord,
  RoomRecord,
  ScheduleItemRecord,
  UserRecord,
} from '../types'
import { EmojiPickerModal } from './emoji-picker'
import { GroupBadge } from './group'
import { Layout } from './layout'
import { ChatPresenterBar } from './presenter'
import { ChatScheduleBar } from './schedule'

const initialChar = (name: string): string => Array.from(name.trim())[0] ?? '?'

export const ReactionBar = ({
  messageId,
  reactions = [],
  oob,
}: {
  messageId: number
  reactions?: MessageReaction[]
  oob?: boolean
}) => (
  <div
    id={`reactions-${messageId}`}
    class="msg-reactions"
    hx-swap-oob={oob ? `outerHTML:#reactions-${messageId}` : undefined}
  >
    {reactions.map((r) => (
      <button
        key={r.emoji}
        type="button"
        class={`reaction-pill${r.reacted ? ' reaction-pill--active' : ''}`}
        data-action="react"
        data-message-id={String(messageId)}
        data-emoji={r.emoji}
        aria-pressed={r.reacted ? 'true' : 'false'}
      >
        <span>{r.emoji}</span>
        <span class="reaction-count">{r.count}</span>
      </button>
    ))}
    <button
      type="button"
      class="reaction-add-btn"
      data-action="open-emoji-picker"
      data-message-id={String(messageId)}
      title="リアクションを追加"
      aria-label="リアクションを追加"
    >
      ＋☺
    </button>
  </div>
)

export const MessageItem = ({ message, oob }: { message: ChatMessage; oob?: boolean }) => {
  const item = (
    <li id={`msg-${message.id}`} class="msg-item">
      <div class="msg-avatar" aria-hidden="true">
        {message.avatar_url ? (
          <img src={message.avatar_url} alt="" width={36} height={36} />
        ) : (
          <span>{initialChar(message.user_name)}</span>
        )}
      </div>
      <div class="msg-content">
        <div class="msg-header">
          <div class="msg-author-row">
            <strong>{message.user_name}</strong>
            <GroupBadge name={message.group_name} color={message.group_color} />
            <small class="msg-time">{message.created_at}</small>
          </div>
          <button
            type="button"
            class="msg-reply-btn"
            data-action="reply"
            data-reply-id={String(message.id)}
            data-reply-user={message.user_name}
            data-reply-body={message.body}
          >
            ↩ 返信
          </button>
        </div>
        {message.reply_to_id && (
          <a href={`#msg-${message.reply_to_id}`} class="msg-quote">
            ↩ <strong>{message.reply_to_user_name}</strong>: {message.reply_to_body}
          </a>
        )}
        <div class="msg-body">{message.body}</div>
        <ReactionBar messageId={message.id} reactions={message.reactions} />
      </div>
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
  schedule?: ScheduleItemRecord[]
  isAdmin?: boolean
  cspNonce?: string
}

const QUICK_CHIPS = [
  { label: '👏 8888', text: '👏 88888888!' },
  { label: '🔥 すごい！', text: '🔥 すごい！' },
  { label: '💡 なるほど', text: '💡 なるほど！' },
  { label: '🚀 応援してます', text: '🚀 応援してます！' },
]

export const ChatRoomView = ({
  user,
  room,
  rooms,
  messages,
  presenters = [],
  groups = [],
  schedule = [],
  isAdmin = false,
  cspNonce,
}: ChatRoomProps) => {
  const globalRooms = rooms.filter((r) => r.is_global === 1)
  const privateRooms = rooms.filter((r) => r.is_global !== 1)
  const hasStageBars = presenters.length > 0 || schedule.length > 0

  return (
    <Layout title={`${room.name} - イベント雑談チャット`}>
      <div class="chat-shell">
        <div id="sidebar-backdrop" class="sidebar-backdrop" data-action="close-sidebar" />
        <aside id="chat-sidebar" class="chat-sidebar">
          <div class="sidebar-header">
            <div class="brand-lockup">
              <span class="brand-mark" aria-hidden="true">
                💬
              </span>
              <span class="brand-name">イベント雑談チャット</span>
            </div>
            <span class="live-pill">
              <span class="pulse-dot" />
              LIVE
            </span>
          </div>

          <div class="sidebar-scroll">
            <div>
              <div class="sidebar-section-title">
                <span>全体チャンネル</span>
              </div>
              <ul class="room-nav">
                {globalRooms.map((r) => (
                  <li key={r.id}>
                    <a
                      href={`/rooms/${r.id}`}
                      class="room-link"
                      aria-current={r.id === room.id ? 'page' : undefined}
                    >
                      <span class="room-hash">#</span>
                      <span>{r.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {privateRooms.length > 0 && (
              <div>
                <div class="sidebar-section-title">
                  <span>団体・グループルーム</span>
                  <span>{privateRooms.length}</span>
                </div>
                <ul class="room-nav">
                  {privateRooms.map((r) => (
                    <li key={r.id}>
                      <a
                        href={`/rooms/${r.id}`}
                        class="room-link"
                        aria-current={r.id === room.id ? 'page' : undefined}
                      >
                        <span class="room-hash">#</span>
                        <span>{r.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details class="profile-details">
              <summary>
                <span>⚙️ 自分の設定</span>
                <span>▾</span>
              </summary>
              <form method="post" action="/profile" class="profile-form">
                <input type="hidden" name="return_to" value={`/rooms/${room.id}`} />
                <div class="field">
                  <label class="field-label" for="profile-name">
                    表示名
                  </label>
                  <input
                    id="profile-name"
                    class="input"
                    type="text"
                    name="name"
                    value={user.name}
                    aria-label="自分の名前"
                    placeholder="自分の名前"
                    maxlength={50}
                    required
                  />
                </div>
                <div class="field">
                  <label class="field-label" for="profile-group">
                    所属グループ
                  </label>
                  <select
                    id="profile-group"
                    class="select"
                    name={user.group_id ? undefined : 'group_id'}
                    aria-label="所属グループ"
                    disabled={Boolean(user.group_id)}
                    title={user.group_id ? '所属グループは1回のみ設定できます' : undefined}
                  >
                    <option value="">
                      {user.group_id ? '設定済み（変更不可）' : 'グループ未選択（1回のみ設定可）'}
                    </option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id} selected={user.group_id === g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div class="field">
                  <label class="field-label" for="profile-slide">
                    発表資料URL
                  </label>
                  <input
                    id="profile-slide"
                    class="input"
                    type="url"
                    name="slide_url"
                    value={user.slide_url ?? ''}
                    aria-label="発表資料URL"
                    placeholder="発表資料URL (https://...)"
                  />
                </div>
                <button type="submit" class="btn btn-primary btn-sm btn-block">
                  設定を保存
                </button>
              </form>
            </details>
          </div>

        </aside>
        <div class="chat-main">
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
          name={user.group_id ? undefined : 'group_id'}
          aria-label="所属グループ"
          disabled={Boolean(user.group_id)}
          title={user.group_id ? '所属グループは1回のみ設定できます' : undefined}
          style="margin:0;height:2.25rem;padding:0 1.8rem 0 0.6rem;font-size:0.85rem;width:100%;box-sizing:border-box"
        >
          <option value="">
            {user.group_id ? '設定済み（変更不可）' : 'グループ未選択（1回のみ設定可）'}
          </option>
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
      <ChatScheduleBar items={schedule} />
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
            data-action="clear-reply"
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
          nonce={cspNonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){var setReply=function(b){document.getElementById('reply-to-id').value=b.dataset.replyId;document.getElementById('reply-target-name').textContent=b.dataset.replyUser;document.getElementById('reply-target-body').textContent=b.dataset.replyBody;document.getElementById('reply-banner').style.display='flex';document.getElementById('message-input').focus();};var clearReply=function(){document.getElementById('reply-to-id').value='';document.getElementById('reply-target-body').textContent='';document.getElementById('reply-banner').style.display='none';};document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-action]'):null;if(!t)return;if(t.dataset.action==='reply')setReply(t);else if(t.dataset.action==='clear-reply')clearReply();});var f=document.getElementById('chat-form');if(f){f.addEventListener('htmx:wsAfterSend',function(){f.reset();clearReply();});}var m=document.getElementById('messages');if(m){m.scrollTop=m.scrollHeight;new MutationObserver(function(){m.scrollTop=m.scrollHeight;}).observe(m,{childList:true});}})();`,
          }}
        />
      </div>
    </article>
        </div>
      </div>
    </Layout>
)
