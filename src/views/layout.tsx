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
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
      <script src="https://unpkg.com/htmx.org@1.9.12"></script>
      <script src="https://unpkg.com/htmx.org@1.9.12/dist/ext/ws.js"></script>
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
