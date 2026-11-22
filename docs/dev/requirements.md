# イベント用雑談チャットシステム 設計書（Cloudflare Workers + Hono 版）

## 1. システム概要・アーキテクチャ

イベント参加者向けのリアルタイム雑談チャットWebアプリケーション。
**全体チャット（1）＋各団体限定チャット（N）の「1+N」構成**を提供し、Discordアカウントによるログインおよび表示名の自動同期を行う。

フロントエンドのビルド環境（Vite / React 等）を排除し、**Cloudflare Workers 上の Hono 1本（SSR + HTMX）** で完結させる。状態管理とデータ永続化は **Cloudflare D1**（ユーザー・ルーム・権限）と **Durable Objects（SQLite-backed）**（部屋ごとのWebSocket配信・メッセージ履歴）に分離し、無料枠でのサーバーレス運用を実現する。

```text
[ブラウザ (HTMX + WebSocket)]
        │ HTTPS / WSS (HTTP/2+)
        ▼
[Cloudflare Workers (Hono / hono/jsx)]
   ├── 認証・認可・ルーム一覧 ──▶ [Cloudflare D1 (SQLite)]
   └── チャット接続 (/rooms/:id/ws)
            │ room_id ごとに1インスタンスへルーティング
            ▼
       [Durable Object: ChatRoom]
          ├── WebSocket Hibernation API (接続管理・ブロードキャスト)
          └── 内蔵 SQLite (該当ルームのメッセージ履歴)

```

---

## 2. 技術スタック

| レイヤー | 採用技術 | 役割・選定理由 |
| --- | --- | --- |
| **実行基盤** | Cloudflare Workers (`cloudflare-workers` テンプレート) | エッジ実行・自動HTTPS・サーバー管理ゼロ |
| **Webフレームワーク** | Hono (`hono`) | ルーティング、ミドルウェア、Cookie管理 |
| **HTMLテンプレート** | `hono/jsx`（SSR） | Reactランタイム不要。自動XSSエスケープ付きで型安全にHTML生成 |
| **フロントエンド制御** | HTMX（`ws` 拡張）または 素の `WebSocket` | CDN読み込みのみ。ビルドツール不要 |
| **スタイリング** | Pico CSS（CDN） | クラス記述を最小限に抑えてUIを整える |
| **リアルタイム配信** | Durable Objects + WebSocket Hibernation API | 部屋ごとのPub/Sub。待機中のCPU・メモリ消費を抑制 |
| **DB（ユーザー・権限）** | Cloudflare D1 | `users`, `rooms`, `room_memberships` の管理 |
| **DB（メッセージ履歴）** | Durable Objects 内蔵 SQLite | 部屋単位で履歴を局所化し、D1への書き込み負荷を分散 |
| **認証・セッション** | Discord OAuth2 + `hono/cookie`（署名付きCookie） | 外部セッションストア不要のステートレス認証 |
| **パッケージ管理** | `pnpm`（または `bun`）+ `wrangler` | ローカルエミュレート（`wrangler dev`）およびデプロイ |

---

## 3. 機能要件

### 3.1 認証・ユーザー同期機能

* **Discord OAuth2 ログイン**
* スコープは `identify` を基本とする（ロール連動を使う場合は `guilds.members.read` を追加）。
* 認可開始時にランダムな `state` を生成し、一時的な `HttpOnly` Cookie に保存してコールバック時に検証する（CSRF対策）。


* **プロフィール同期**
* コールバック時に Discord API (`GET /users/@me`) から `id`, `global_name`（未設定時は `username`）, `avatar` を取得し、D1 の `users` テーブルへ `UPSERT` する。
* 署名付き `HttpOnly` Cookie に `user_id`（および有効期限）を保存してセッションを確立する。


* **ログアウト**
* セッションCookieを削除し、`/` へリダイレクトする。



### 3.2 ルーム管理・アクセス制御（1+N構成）

* **全体チャット（1）**
* `rooms.is_global = 1` の固定レコード（例：`id = 'global'`）。ログイン済み全ユーザーがアクセス可能。


* **団体限定チャット（N）**
* `rooms.is_global = 0`。D1 の `room_memberships` に `(user_id, room_id)` が存在するメンバーのみアクセス可能。


* **参加フロー（招待コード方式）**
* 各団体に一意の `invite_code` を発行し、招待URL（`/join/:invite_code`）を配布する。
* ログイン済みでアクセスすると `room_memberships` に登録し、対象ルームへリダイレクトする。
* 未ログインの場合は遷移先URLをCookieに保存してDiscordログインへ誘導し、認証完了後に自動参加・遷移させる。
* *拡張オプション（Discordロール連動）*: `rooms.discord_role_id` を設定し、ログイン時にイベント用サーバーの所属ロールを取得して `room_memberships` を一括同期する。



### 3.3 リアルタイムチャット機能

* **初期表示（過去ログ）**
* `GET /rooms/:id` のレンダリング時、Workers から該当ルームの Durable Object へ内部リクエストを送り、直近のメッセージ（例：最新50〜100件）を取得してSSRで描画する。


* **リアルタイム送受信（WebSocket）**
* クライアントは `GET /rooms/:id/ws` へ WebSocket 接続する。
* Workers 側で認証・ルーム権限を検証した上で、認証済みユーザー情報（`user_id`, `name`, `avatar_url`）をヘッダー等に付与して該当の Durable Object へリクエストを転送（Upgrade）する。
* Durable Object は `state.acceptWebSocket(ws)` で接続を受理し、`ws.serializeAttachment({ userId, name, avatarUrl })` にユーザー情報を紐づける（Hibernation復帰後も保持される）。
* メッセージ受信時（`webSocketMessage`）：
1. 本文のバリデーション（空文字チェック、最大500文字制限）。
2. Durable Object 内蔵 SQLite へ保存。
3. `hono/jsx`（またはエスケープ済みHTML生成関数）でメッセージの `<li>` 断片を生成。
4. `state.getWebSockets()` で取得した同ルーム内の全接続へブロードキャスト送信。





---

## 4. データ設計

### 4.1 Cloudflare D1（認証・ルーム・権限）

`migrations/0001_init.sql` として管理し、`wrangler d1 migrations apply` で適用する。

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                          -- Discord User ID
    name TEXT NOT NULL,                           -- global_name or username
    avatar_url TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,                          -- 例: 'global', 'team-a'
    name TEXT NOT NULL,                           -- 表示名
    is_global INTEGER NOT NULL DEFAULT 0,         -- 1: 全体, 0: 団体限定
    invite_code TEXT UNIQUE,                      -- 招待コード
    discord_role_id TEXT UNIQUE                   -- ロール連動用（任意）
);

CREATE TABLE IF NOT EXISTS room_memberships (
    user_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    PRIMARY KEY (user_id, room_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- 全体チャットの初期レコード
INSERT OR IGNORE INTO rooms (id, name, is_global) VALUES ('global', '全体チャット', 1);

```

### 4.2 Durable Object 内蔵 SQLite（部屋ごとのメッセージ履歴）

各 `ChatRoom` インスタンスのコンストラクタ内（`ctx.storage.sql.exec`）で初回起動時に自動作成する。

```sql
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    avatar_url TEXT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

```

※ 部屋ごとにインスタンスが独立しているため、`room_id` カラムは不要。

---

## 5. エンドポイント仕様

認可は Hono ミドルウェア（`requireAuth`, `requireRoomMember`）で強制する。

| Method | Path | ミドルウェア | 処理概要 |
| --- | --- | --- | --- |
| `GET` | `/` | なし | ログイン済みなら `/rooms/global` へリダイレクト。未ログインならログイン画面を表示 |
| `GET` | `/auth/discord` | なし | `state` Cookie を発行し、Discord OAuth2 認可URLへリダイレクト |
| `GET` | `/auth/callback` | なし | `state` 検証 → トークン交換 → D1 `users` へ UPSERT → 署名付きセッションCookie発行 |
| `POST` | `/auth/logout` | `requireAuth` | セッションCookie削除 → `/` へリダイレクト |
| `GET` | `/join/:invite_code` | なし（内部判定） | 未ログインなら遷移先を保存してログインへ。ログイン済みなら `room_memberships` 登録後に該当ルームへ遷移 |
| `GET` | `/rooms/:id` | `requireRoomMember` | D1から所属ルーム一覧、DOから過去ログを取得し、チャット画面をSSRで返却 |
| `GET` | `/rooms/:id/ws` | `requireRoomMember` | WebSocket Upgrade リクエストを検証し、対象 `room_id` の Durable Object へ転送 |

---

## 6. UI・フロントエンド連携仕様（HTMX `ws` 拡張）

JavaScriptのビルドは行わず、`<head>` で HTMX と `ws` 拡張、Pico CSS を読み込む。

* **受信**: コンテナに `hx-ext="ws" ws-connect="/rooms/{id}/ws"` を付与。Durable Object から `hx-swap-oob="beforeend:#messages"` 付きの `<li>` 断片を返すことで、チャット欄末尾へ自動追記する。
* **送信**: フォームに `ws-send` 属性を付与し、`hx-on::ws-after-send="this.reset()"` で送信後に入力欄をクリアする。
* **再接続**: HTMX の `ws` 拡張が切断時の自動再接続（指数バックオフ）を処理する。

---

## 7. セキュリティ・非機能要件

* **XSS対策**: ユーザー入力（表示名・メッセージ本文）は必ず `hono/jsx` のエスケープを通してHTML断片化する。
* **認可漏れ防止**: `GET /rooms/:id` および `GET /rooms/:id/ws` の両方で `requireRoomMember` ミドルウェアを通し、未認可ユーザーによる WebSocket Upgrade を入口で `403 Forbidden` として遮断する。
* **Cookie保護**: セッションCookieには `hono/cookie` の `setSignedCookie` を使用し、`httpOnly: true`, `sameSite: 'Lax'`, 本番環境では `secure: true` を設定する。
* **レートリミット**: Durable Object 内の `webSocketMessage` で、接続（ユーザー）ごとの最終投稿時刻をメモリ／アタッチメントに保持し、短時間の連投（例：1秒以内の連続送信）を弾く。
* **運用管理**: 団体ルームの追加や招待コードの発行は `wrangler d1 execute --remote --command "..."` または管理用SQLスクリプトから実行する。

---

## 8. プロジェクト構成・設定ファイル

### 8.1 ディレクトリ構成

```text
event-chat/
├── package.json            # 依存: hono, wrangler, @cloudflare/workers-types
├── tsconfig.json
├── wrangler.jsonc          # D1・Durable Objects のバインディング定義
├── migrations/
│   └── 0001_init.sql       # D1用スキーマ
└── src/
    ├── index.tsx           # Honoアプリ本体・ルーティング・Discord OAuth2
    ├── middleware.ts       # requireAuth / requireRoomMember
    ├── room.ts             # Durable Object (ChatRoom) クラス
    └── views.tsx           # hono/jsx レイアウト・チャット画面・メッセージ断片

```

### 8.2 `wrangler.jsonc` 設定イメージ

```jsonc
{
  "name": "event-chat",
  "main": "src/index.tsx",
  "compatibility_date": "2026-11-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "event-chat-db",
      "database_id": "<wrangler d1 create で発行されたID>"
    }
  ],
  "durable_objects": {
    "bindings": [
      {
        "name": "CHAT_ROOM",
        "class_name": "ChatRoom"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["ChatRoom"]
    }
  ]
}

```

### 8.3 環境変数・シークレット（`wrangler secret put` / `.dev.vars`）

| 変数名 | 用途 |
| --- | --- |
| `DISCORD_CLIENT_ID` | Discord Developer Portal の Client ID |
| `DISCORD_CLIENT_SECRET` | Discord Developer Portal の Client Secret |
| `DISCORD_REDIRECT_URL` | コールバックURL（例：`https://<your-worker>.workers.dev/auth/callback`） |
| `SESSION_SECRET` | 署名付きCookie用のランダムな秘密鍵（32バイト以上） |