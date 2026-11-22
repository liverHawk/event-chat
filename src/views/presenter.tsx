import { isValidHttpUrl } from '../lib/validators'
import type { GroupRecord, PresenterRecord } from '../types'
import { GroupBadge } from './group'

const SlideLink = ({
  url,
  label,
  className,
}: {
  url: string | null
  label: string
  className?: string
}) =>
  url && isValidHttpUrl(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer" class={className}>
      {label}
    </a>
  ) : null

export const ChatPresenterBar = ({ presenters }: { presenters: PresenterRecord[] }) => {
  if (presenters.length === 0) return null
  const active = presenters.find((p) => p.is_active === 1)
  return (
    <div class="stage-card">
      {active && (
        <div class="stage-row">
          <div class="stage-lead">
            <span class="live-pill">
              <span class="pulse-dot" />🎤 現在発表中:
            </span>
            <GroupBadge name={active.group_name} color={active.group_color} />
            <strong>{active.name}</strong>
          </div>
          <SlideLink url={active.slide_url} label="📄 資料を開く ↗" className="slide-pill" />
        </div>
      )}
      <details class="stage-details">
        <summary>発表者一覧（{presenters.length}名）</summary>
        <ul class="stage-details-list">
          {presenters.map((p) => (
            <li
              key={p.id}
              class={`stage-details-item${p.is_active === 1 ? ' stage-details-item--active' : ''}`}
            >
              {p.is_active === 1 && <strong>🎤 [発表中]</strong>}
              <GroupBadge name={p.group_name} color={p.group_color} />
              <strong>{p.name}</strong>
              <SlideLink url={p.slide_url} label="[資料URL]" />
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

export const AdminPresenterSection = ({
  presenters,
  groups = [],
}: {
  presenters: PresenterRecord[]
  groups?: GroupRecord[]
}) => (
  <article>
    <header>
      <strong>発表者の登録・切替（グループ・名前・資料URL）</strong>
    </header>
    <form method="post" action="/admin/presenters">
      <div class="grid">
        <label>
          グループ（1択）
          <select name="group_name" required>
            <option value="">グループを選択...</option>
            {groups.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          発表者名
          <input type="text" name="name" placeholder="例: 山田太郎" required />
        </label>
        <label>
          資料URL（任意）
          <input type="url" name="slide_url" placeholder="https://example.com/slides" />
        </label>
      </div>
      <button type="submit">発表者を追加</button>
    </form>
    <table>
      <thead>
        <tr>
          <th>状態</th>
          <th>グループ</th>
          <th>発表者名</th>
          <th>資料URL</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        {presenters.map((p) => (
          <tr key={p.id}>
            <td>{p.is_active === 1 ? '🎤 発表中' : '-'}</td>
            <td>
              <GroupBadge name={p.group_name} color={p.group_color} />
            </td>
            <td>{p.name}</td>
            <td>{p.slide_url ? <SlideLink url={p.slide_url} label="資料リンク" /> : '-'}</td>
            <td style="display:flex;gap:0.4rem">
              <form method="post" action={`/admin/presenters/${p.id}/activate`} style="margin:0">
                <button type="submit" class="outline" style="padding:0.2rem 0.5rem;width:auto">
                  {p.is_active === 1 ? '解除' : '発表中にする'}
                </button>
              </form>
              <form method="post" action={`/admin/presenters/${p.id}/delete`} style="margin:0">
                <button
                  type="submit"
                  class="outline secondary"
                  style="padding:0.2rem 0.5rem;width:auto"
                >
                  削除
                </button>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </article>
)
