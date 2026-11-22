import type {
  GroupRecord,
  PresenterRecord,
  RoomRecord,
  ScheduleItemRecord,
  UserRecord,
} from '../types'
import { AdminGroupSection } from './group'
import { Layout } from './layout'
import { AdminPresenterSection } from './presenter'
import { AdminScheduleSection } from './schedule'

type AdminViewProps = {
  user: UserRecord
  rooms: RoomRecord[]
  presenters?: PresenterRecord[]
  groups?: GroupRecord[]
  schedule?: ScheduleItemRecord[]
}

export const AdminView = ({
  user,
  rooms,
  presenters = [],
  groups = [],
  schedule = [],
}: AdminViewProps) => {
  const activePresenter = presenters.find((p) => p.is_active === 1)
  return (
    <Layout title="ルーム管理 - イベント雑談チャット" scrollable>
      <div class="admin-shell">
        <header class="admin-topbar">
          <div class="admin-topbar-left">
            <a href="/rooms/global" class="btn btn-tonal btn-sm">
              ← チャットへ戻る
            </a>
            <div class="brand-lockup">
              <span class="brand-name">イベント雑談チャット</span>
              <span class="brand-pill">管理者</span>
            </div>
          </div>
          <div class="admin-user-pill">
            <span class="pulse-dot" style="background:var(--tertiary-fixed-dim)" />
            <span>Discord ID: {user.id}</span>
          </div>
        </header>

        <main class="admin-container">
          <section class="admin-hero">
            <div>
              <span class="brand-pill">Live Management Hub</span>
              <h1 class="admin-hero-title">ルーム管理ダッシュボード</h1>
              <p class="admin-hero-sub">
                団体ルームの作成、グループ色分け、発表者の切替、タイムスケジュールを一元管理します。
              </p>
            </div>
            <div class="admin-anchors">
              <a href="#section-rooms" class="anchor-pill">
                1. 団体ルーム管理
              </a>
              <a href="#section-groups" class="anchor-pill">
                2. グループ設定
              </a>
              <a href="#section-presenters" class="anchor-pill">
                3. 発表者切替
              </a>
              <a href="#section-schedule" class="anchor-pill">
                4. タイムスケジュール
              </a>
            </div>
          </section>

          <div class="stats-grid">
            <div class="stat-card">
              <div>
                <div class="stat-label">登録ルーム</div>
                <div class="stat-value">{rooms.length}</div>
              </div>
              <div class="stat-icon">💬</div>
            </div>
            <div class="stat-card">
              <div>
                <div class="stat-label">登録グループ</div>
                <div class="stat-value">{groups.length}</div>
              </div>
              <div class="stat-icon">🎨</div>
            </div>
            <div class="stat-card">
              <div>
                <div class="stat-label">現在発表中</div>
                <div class="stat-value" style="font-size:1rem">
                  {activePresenter ? activePresenter.name : '未設定'}
                </div>
              </div>
              <div class="stat-icon">🎤</div>
            </div>
            <div class="stat-card">
              <div>
                <div class="stat-label">スケジュール</div>
                <div class="stat-value">{schedule.length}件</div>
              </div>
              <div class="stat-icon">📅</div>
            </div>
          </div>

          <section class="admin-section" id="section-rooms">
            <div class="section-head">
              <div>
                <h2 class="section-title">1. 団体ルームの追加・更新</h2>
                <p class="section-desc">
                  団体限定チャットルームの作成・更新、DiscordロールID連動、招待URLの発行を行います。
                </p>
              </div>
              <span class="count-pill">登録数: {rooms.length}</span>
            </div>
            <div class="form-panel">
              <form method="post" action="/admin/rooms">
                <div class="form-grid-4">
                  <div class="field">
                    <label class="field-label" for="room-id">
                      ルームID（英数字・ハイフン）
                    </label>
                    <input
                      id="room-id"
                      class="input"
                      type="text"
                      name="id"
                      placeholder="team-a"
                      pattern="[a-zA-Z0-9_-]+"
                      required
                    />
                  </div>
                  <div class="field">
                    <label class="field-label" for="room-name">
                      部屋名
                    </label>
                    <input
                      id="room-name"
                      class="input"
                      type="text"
                      name="name"
                      placeholder="サークルA"
                      required
                    />
                  </div>
                </div>
        <div class="grid">
          <label>
            Discord ロールID（任意）
            <input type="text" name="discord_role_id" placeholder="123456789012345678" />
          </label>
          <label>
            招待コード（空欄で自動発行）
            <input type="text" name="invite_code" placeholder="空欄なら自動生成" />
          </label>
        </div>
        <button type="submit">ルームを保存</button>
      </form>
            </div>
          </section>
    <article>
      <header>
        <strong>登録済みルーム一覧</strong>
      </header>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>部屋名</th>
            <th>招待URL</th>
            <th>DiscordロールID</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>
                <a href={`/rooms/${r.id}`}>{r.name}</a>
              </td>
              <td>
                {r.invite_code ? (
                  <a href={`/join/${r.invite_code}`}>{`/join/${r.invite_code}`}</a>
                ) : (
                  '-'
                )}
              </td>
              <td>{r.discord_role_id ?? '-'}</td>
              <td>
                {r.is_global === 0 && (
                  <form method="post" action={`/admin/rooms/${r.id}/delete`} style="margin:0">
                    <button
                      type="submit"
                      class="outline secondary"
                      style="padding:0.2rem 0.5rem;width:auto"
                    >
                      削除
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
    <AdminGroupSection groups={groups} />
    <AdminPresenterSection presenters={presenters} groups={groups} />
    <AdminScheduleSection items={schedule} />
        </main>
      </div>
    </Layout>
)
