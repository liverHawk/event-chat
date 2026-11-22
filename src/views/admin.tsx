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
}: AdminViewProps) => (
  <Layout title="ルーム管理 - イベント雑談チャット" scrollable>
    <nav>
      <ul>
        <li>
          <strong>ルーム管理</strong> (<small>Discord ID: {user.id}</small>)
        </li>
      </ul>
      <ul>
        <li>
          <a href="/rooms/global">チャットへ戻る</a>
        </li>
      </ul>
    </nav>
    <article>
      <header>
        <strong>団体ルームの追加・更新</strong>
      </header>
      <form method="post" action="/admin/rooms">
        <div class="grid">
          <label>
            ルームID（英数字・ハイフン）
            <input type="text" name="id" placeholder="team-a" pattern="[a-zA-Z0-9_-]+" required />
          </label>
          <label>
            部屋名
            <input type="text" name="name" placeholder="サークルA" required />
          </label>
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
    </article>
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
  </Layout>
)
