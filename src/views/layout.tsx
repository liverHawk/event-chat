import type { Child } from 'hono/jsx'

export const Layout = ({
  title,
  scrollable,
  children,
}: {
  title: string
  scrollable?: boolean
  children: Child
}) => (
  <html lang="ja" style="height:100%;overflow:hidden">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <meta
        name="htmx-config"
        content='{"selfRequestsOnly":true,"allowScriptTags":false,"allowEval":false}'
      />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css"
        integrity="sha384-L1dWfspMTHU/ApYnFiMz2QID/PlP1xCW9visvBdbEkOLkSSWsP6ZJWhPw6apiXxU"
        crossorigin="anonymous"
      />
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
    <body style="height:100%;margin:0;overflow:hidden">
      <main
        class="container"
        style={`height:100%;display:flex;flex-direction:column;overflow-x:hidden;overflow-y:${scrollable ? 'auto' : 'hidden'};padding-top:0.5rem;padding-bottom:0.75rem;box-sizing:border-box`}
      >
        {children}
      </main>
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

export const JoinConfirmView = ({
  roomName,
  inviteCode,
}: {
  roomName: string
  inviteCode: string
}) => (
  <Layout title="ルーム参加確認 - イベント雑談チャット">
    <article style="max-width:480px;margin:4rem auto;text-align:center">
      <h1>ルームへの参加確認</h1>
      <p>
        <strong>{roomName}</strong> に参加しますか？
      </p>
      <form method="post" action={`/join/${encodeURIComponent(inviteCode)}`}>
        <button type="submit">参加する</button>
      </form>
      <a href="/rooms/global" class="secondary">
        全体チャットへ戻る
      </a>
    </article>
  </Layout>
)
