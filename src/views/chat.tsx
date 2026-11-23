import { raw } from 'hono/html'
import { buildChatTimelineWithMeta, type ScheduleBoundary } from '../lib/schedule-timeline'
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
import { SCHEDULE_BOUNDARY_CLIENT_SCRIPT } from './schedule-boundary-script'

const initialChar = (name: string): string => Array.from(name.trim())[0] ?? '?'

export const ReactionBar = ({
  messageId,
  reactions = [],
  oob,
}: {
  messageId: number
  reactions?: MessageReaction[]
  oob?: boolean
}) =>
  reactions.length === 0 && !oob ? (
    raw(
      `<div id="reactions-${messageId}" class="msg-reactions"><button type="button" class="reaction-add-btn" data-action="open-emoji-picker" data-message-id="${messageId}" title="リアクションを追加" aria-label="リアクションを追加">＋☺</button></div>`,
    )
  ) : (
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

export const ScheduleBoundaryItem = ({ boundary }: { boundary: ScheduleBoundary }) => {
  const isStart = boundary.kind === 'start'
  const label = isStart ? '開始' : '終了'
  return (
    <li
      class={`schedule-boundary schedule-boundary--${boundary.kind}`}
      data-boundary-key={boundary.key}
      data-boundary-seconds={String(boundary.seconds)}
      data-boundary-kind={boundary.kind}
      aria-label={`${boundary.time} ${boundary.title} ${label}`}
    >
      <span class="schedule-boundary-pill">
        <span aria-hidden="true">{isStart ? '▶' : '■'}</span>
        <span class="schedule-boundary-time">{boundary.time}</span>
        <span class="schedule-boundary-title">{boundary.title}</span>
        <span class="schedule-boundary-label">{label}</span>
      </span>
    </li>
  )
}

export const MessageItem = ({ message, oob }: { message: ChatMessage; oob?: boolean }) => {
  const item = (
    <li id={`msg-${message.id}`} class="msg-item" data-created-at={message.created_at}>
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
  const {
    entries: timeline,
    boundaries,
    targetDate,
  } = buildChatTimelineWithMeta(messages, schedule)
  const scheduleBoundaries = boundaries.map(({ key, kind, time, seconds, title }) => ({
    key,
    kind,
    time,
    seconds,
    title,
  }))

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

          <div class="sidebar-footer">
            <div class="user-card">
              <div class="user-avatar" aria-hidden="true">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" width={36} height={36} />
                ) : (
                  <span>{initialChar(user.name)}</span>
                )}
              </div>
              <div class="user-meta">
                <strong>{user.name}</strong>
                <div>
                  <GroupBadge name={user.group_name} color={user.group_color} />
                </div>
              </div>
            </div>
            <div class="sidebar-actions">
              {isAdmin ? (
                <a href="/admin" class="sidebar-action-link">
                  🛠️ ルーム管理
                </a>
              ) : (
                <span />
              )}
              <form method="post" action="/auth/logout" style="margin:0">
                <button type="submit" class="sidebar-logout-btn">
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div class="chat-main">
          <header class="chat-topbar">
            <div class="chat-topbar-left">
              <button
                type="button"
                class="mobile-menu-btn"
                aria-label="メニューを開く"
                data-action="open-sidebar"
              >
                ☰
              </button>
              <h1 class="chat-room-title"># {room.name}</h1>
              <span class="chat-room-sub">リアルタイム雑談</span>
            </div>
            <GroupBadge name={user.group_name} color={user.group_color} />
          </header>

          {hasStageBars && (
            <section class="stage-bars">
              <ChatPresenterBar presenters={presenters} />
              <ChatScheduleBar items={schedule} />
            </section>
          )}

          <div hx-ext="ws" ws-connect={`/rooms/${room.id}/ws`} class="chat-ws-wrap">
            <ul
              id="messages"
              class="messages-list"
              data-schedule-date={scheduleBoundaries.length > 0 ? targetDate : undefined}
              data-schedule-boundaries={
                scheduleBoundaries.length > 0 ? JSON.stringify(scheduleBoundaries) : undefined
              }
            >
              {timeline.map((entry) =>
                entry.type === 'boundary' ? (
                  <ScheduleBoundaryItem key={entry.boundary.key} boundary={entry.boundary} />
                ) : (
                  <MessageItem key={entry.message.id} message={entry.message} />
                ),
              )}
            </ul>

            <footer class="composer-deck">
              <div id="reply-banner" class="reply-banner">
                <span class="reply-banner-text">
                  ↩ <strong id="reply-target-name"></strong> に返信中:{' '}
                  <span id="reply-target-body" class="reply-banner-body"></span>
                </span>
                <button type="button" class="btn btn-ghost btn-xs" data-action="clear-reply">
                  取消
                </button>
              </div>
              <div class="quick-chips">
                <span class="quick-chips-label">クイック応援:</span>
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    class="quick-chip"
                    data-action="quick-chip"
                    data-chip-text={chip.text}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <form id="reaction-form" ws-send="" style="display:none">
                <input type="hidden" name="action" value="react" />
                <input type="hidden" name="message_id" id="react-message-id" value="" />
                <input type="hidden" name="emoji" id="react-emoji" value="" />
              </form>
              <form id="chat-form" ws-send="" class="chat-form">
                <input type="hidden" name="reply_to_id" id="reply-to-id" value="" />
                <input
                  type="text"
                  id="message-input"
                  class="chat-input"
                  name="body"
                  placeholder="メッセージを入力（最大500文字）"
                  maxlength={500}
                  required
                />
                <span id="char-count" class="char-counter">
                  0/500
                </span>
                <button type="submit" class="btn btn-primary">
                  送信
                </button>
              </form>
            </footer>
            <EmojiPickerModal />
            <script
              nonce={cspNonce}
              dangerouslySetInnerHTML={{
                __html: `(function(){var inp=document.getElementById('message-input');var cnt=document.getElementById('char-count');var updCnt=function(){if(inp&&cnt)cnt.textContent=Array.from(inp.value).length+'/500';};var setReply=function(b){document.getElementById('reply-to-id').value=b.dataset.replyId;document.getElementById('reply-target-name').textContent=b.dataset.replyUser;document.getElementById('reply-target-body').textContent=b.dataset.replyBody;document.getElementById('reply-banner').style.display='flex';if(inp)inp.focus();};var clearReply=function(){document.getElementById('reply-to-id').value='';document.getElementById('reply-target-body').textContent='';document.getElementById('reply-banner').style.display='none';};var sendReact=function(msgId,emoji){var rf=document.getElementById('reaction-form');if(!rf||!msgId||!emoji)return;document.getElementById('react-message-id').value=msgId;document.getElementById('react-emoji').value=emoji;if(window.htmx)window.htmx.trigger(rf,'submit');else rf.requestSubmit();};var picker=document.getElementById('emoji-picker-modal');var searchInp=document.getElementById('emoji-search-input');var pickerMsgId='';var openPicker=function(msgId){pickerMsgId=msgId||'';if(!picker)return;picker.hidden=false;if(searchInp){searchInp.value='';filterEmojis('');searchInp.focus();}};var closePicker=function(){if(picker)picker.hidden=true;pickerMsgId='';};var selectTab=function(catId){document.querySelectorAll('.emoji-tab').forEach(function(el){var on=el.dataset.cat===catId;el.classList.toggle('is-active',on);el.setAttribute('aria-selected',on?'true':'false');});document.querySelectorAll('.emoji-grid').forEach(function(el){el.classList.toggle('is-active',el.dataset.emojiCat===catId);});};var filterEmojis=function(q){var s=(q||'').trim().toLowerCase();var panels=document.getElementById('emoji-panels');if(!panels)return;panels.classList.toggle('is-searching',Boolean(s));document.querySelectorAll('.emoji-cell').forEach(function(cell){if(!s){cell.hidden=false;return;}var kw=(cell.dataset.keywords||'').toLowerCase();cell.hidden=kw.indexOf(s)===-1;});};var submitCustom=function(){if(!searchInp)return;var val=searchInp.value.trim();if(!val)return;sendReact(pickerMsgId,val);closePicker();};if(searchInp){searchInp.addEventListener('input',function(){filterEmojis(searchInp.value);});searchInp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();submitCustom();}});}document.addEventListener('keydown',function(e){if(e.key==='Escape'&&picker&&!picker.hidden)closePicker();});var sb=document.getElementById('chat-sidebar');var bd=document.getElementById('sidebar-backdrop');var toggleSb=function(open){if(sb)sb.classList.toggle('is-open',open);if(bd)bd.classList.toggle('is-open',open);};document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-action]'):null;if(!t)return;var a=t.dataset.action;if(a==='reply')setReply(t);else if(a==='clear-reply')clearReply();else if(a==='react')sendReact(t.dataset.messageId,t.dataset.emoji);else if(a==='open-emoji-picker')openPicker(t.dataset.messageId);else if(a==='close-emoji-picker')closePicker();else if(a==='emoji-tab')selectTab(t.dataset.cat);else if(a==='pick-emoji'){sendReact(pickerMsgId,t.dataset.emoji);closePicker();}else if(a==='submit-custom-emoji')submitCustom();else if(a==='open-sidebar')toggleSb(true);else if(a==='close-sidebar')toggleSb(false);else if(a==='quick-chip'&&inp){inp.value=inp.value?(inp.value+' '+t.dataset.chipText):t.dataset.chipText;updCnt();inp.focus();}});if(inp)inp.addEventListener('input',updCnt);var f=document.getElementById('chat-form');if(f){f.addEventListener('htmx:wsAfterSend',function(){f.reset();clearReply();updCnt();});}var m=document.getElementById('messages');if(m){m.scrollTop=m.scrollHeight;new MutationObserver(function(){m.scrollTop=m.scrollHeight;}).observe(m,{childList:true});}})();${SCHEDULE_BOUNDARY_CLIENT_SCRIPT}`,
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}
