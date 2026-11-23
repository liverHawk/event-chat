import { raw } from 'hono/html'
import type { Child } from 'hono/jsx'
import { isValidHttpUrl } from '../lib/validators'

const DiscordLogo = () => (
  <svg aria-hidden="true" class="icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

const ChatIcon = () => (
  <svg
    aria-hidden="true"
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
    />
  </svg>
)

export const Layout = ({
  title,
  scrollable,
  children,
}: {
  title: string
  scrollable?: boolean
  children: Child
}) => (
  <html lang="ja" class={scrollable ? undefined : 'lock-scroll'}>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <meta
        name="htmx-config"
        content='{"selfRequestsOnly":true,"allowScriptTags":false,"allowEval":false}'
      />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700&family=Noto+Sans+JP:wght@400;600;700&display=swap"
      />
      <link rel="stylesheet" href="/styles.css" />
      <script
        src="https://unpkg.com/htmx.org@1.9.12/dist/htmx.min.js"
        integrity="sha384-ujb1lZYygJmzgSwoxRggbCHcjc0rB2XoQrxeTUQyRjrOnlCoYta87iKBWq3EsdM2"
        crossorigin="anonymous"
      ></script>
      <script
        src="https://unpkg.com/htmx.org@1.9.12/dist/ext/ws.js"
        integrity="sha384-QILjBFil9/FrWrP1Y9Qh3vBfd7kiQE8h1BX9auwiVgsFlGwe4tEl7Y966BG178W6"
        crossorigin="anonymous"
      ></script>
    </head>
    <body>{children}</body>
  </html>
)

const AuthShell = ({
  title,
  wide,
  children,
}: {
  title: string
  wide?: boolean
  children: Child
}) => (
  <Layout title={title} scrollable>
    <div class="auth-page">
      <header class="auth-header">
        <div class="brand-lockup">
          <span class="brand-mark">
            <ChatIcon />
          </span>
          <span class="brand-name">イベント雑談チャット</span>
          <span class="brand-pill">Live</span>
        </div>
      </header>
      <main class="auth-main">
        <div class={`auth-card-wrap${wide ? ' auth-card-wrap--wide' : ''}`}>
          <div class="auth-glow-a" aria-hidden="true" />
          <div class="auth-glow-b" aria-hidden="true" />
          <article class="auth-card">
            <div class="auth-accent-bar" aria-hidden="true" />
            {children}
          </article>
        </div>
      </main>
      <footer class="auth-footer">イベント雑談チャット • Discord OAuth 2.0 連携</footer>
    </div>
  </Layout>
)

const renderLoginView = () => (
  <AuthShell title="ログイン - イベント雑談チャット">
    <div class="auth-icon-circle">
      <ChatIcon />
    </div>
    <h1 class="auth-title">イベント雑談チャット</h1>
    <p class="auth-desc">
      Discordアカウントでログインして、全体チャットやチーム専用ルームに参加してください。
    </p>
    <div class="feature-list">
      <div class="feature-item">
        <span class="feature-check">✓</span>
        <div>
          <div class="feature-title">Discordロールと自動同期</div>
          <div class="feature-sub">イベントサーバーの所属ロールやグループ権限を自動で反映</div>
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-check">✓</span>
        <div>
          <div class="feature-title">発表者・タイムスケジュール連動</div>
          <div class="feature-sub">現在発表中のチームや資料リンク、進行予定をリアルタイム表示</div>
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-check">✓</span>
        <div>
          <div class="feature-title">高レスポンスなリアルタイムチャット</div>
          <div class="feature-sub">全体チャットと団体限定ルームをスムーズに行き来できます</div>
        </div>
      </div>
    </div>
    <div class="auth-actions">
      <a href="/auth/discord" role="button" class="btn btn-discord btn-lg btn-block">
        <DiscordLogo />
        <span>Discordでログイン</span>
      </a>
    </div>
  </AuthShell>
)

const STATIC_LOGIN_VIEW_HTML = raw(renderLoginView().toString())

export const LoginView = () => STATIC_LOGIN_VIEW_HTML

export const JoinConfirmView = ({
  roomName,
  inviteCode,
}: {
  roomName: string
  inviteCode: string
}) => (
  <AuthShell title="ルーム参加確認 - イベント雑談チャット">
    <div class="auth-icon-circle">
      <ChatIcon />
    </div>
    <h1 class="auth-title">ルームへの参加確認</h1>
    <p class="auth-desc">招待リンクから団体限定チャットルームへの参加がリクエストされました。</p>
    <div class="join-room-banner">
      <strong>{roomName}</strong> に参加しますか？
    </div>
    <div class="auth-actions">
      <form method="post" action={`/join/${encodeURIComponent(inviteCode)}`}>
        <button type="submit" class="btn btn-primary btn-lg btn-block">
          参加する
        </button>
      </form>
      <a href="/rooms/global" class="auth-back-link">
        ← 全体チャットへ戻る
      </a>
    </div>
  </AuthShell>
)

export const GuildOnboardingView = ({ inviteUrl }: { inviteUrl?: string | null }) => {
  const safeInviteUrl = inviteUrl && isValidHttpUrl(inviteUrl.trim()) ? inviteUrl.trim() : null
  return (
    <AuthShell title="サーバー参加のご案内 - イベント雑談チャット" wide>
      <div class="auth-icon-circle">
        <DiscordLogo />
      </div>
      <h1 class="auth-title">Discord サーバーへの参加が必要です</h1>
      <p class="auth-desc">
        このチャットを利用するには、対象イベントの Discord サーバーに参加している必要があります。
      </p>
      <ol class="step-list">
        <li class="step-card">
          <span class="step-num">1</span>
          <div>
            <div class="feature-title">イベントの Discord サーバーに参加</div>
            <div class="feature-sub">
              {safeInviteUrl
                ? '下のボタンからイベントの Discord サーバーに参加してください。'
                : '運営から案内されている招待リンクより、イベントの Discord サーバーに参加してください。'}
            </div>
          </div>
        </li>
        <li class="step-card">
          <span class="step-num step-num--soft">2</span>
          <div>
            <div class="feature-title">参加後に再ログイン</div>
            <div class="feature-sub">参加が完了したら、下のボタンから再ログインしてください。</div>
          </div>
        </li>
      </ol>
      <div class="auth-actions">
        {safeInviteUrl && (
          <a
            href={safeInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            role="button"
            class="btn btn-discord btn-lg btn-block"
          >
            <DiscordLogo />
            <span>Discord サーバーに参加する</span>
          </a>
        )}
        <a
          href="/auth/discord"
          role="button"
          class={`btn btn-lg btn-block ${safeInviteUrl ? 'btn-tonal' : 'btn-primary'}`}
        >
          参加したので再ログインする
        </a>
        <a href="/" class="auth-back-link">
          ← ログイン画面へ戻る
        </a>
      </div>
      <div class="auth-note">
        サーバーに参加できない場合は、会場受付または運営スタッフまでお声がけください。
      </div>
    </AuthShell>
  )
}
