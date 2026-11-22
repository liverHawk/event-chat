import type { PresenterRecord } from './types'

const SlideLink = ({ url, label }: { url: string | null; label: string }) =>
  url ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  ) : null

export const ChatPresenterBar = ({ presenters }: { presenters: PresenterRecord[] }) => {
  if (presenters.length === 0) return null
  const active = presenters.find((p) => p.is_active === 1)
  return (
    <div style="margin-bottom:0.75rem;padding:0.5rem 0.75rem;background:var(--pico-card-sectioning-background-color);border-radius:6px;font-size:0.9rem">
      {active && (
        <div style="margin-bottom:0.4rem">
          🎤 <strong>現在発表中:</strong> [{active.group_name}] <strong>{active.name}</strong>{' '}
          <SlideLink url={active.slide_url} label="📄 資料を開く" />
        </div>
      )}
      <details>
        <summary style="cursor:pointer;font-size:0.85rem;color:var(--pico-muted-color)">
          発表者一覧（{presenters.length}名）
        </summary>
        <ul style="margin:0.4rem 0 0;padding-left:1.2rem">
          {presenters.map((p) => (
            <li key={p.id} style="margin-bottom:0.2rem">
              {p.is_active === 1 && <strong>🎤 [発表中] </strong>}
              <span>[{p.group_name}]</span> <strong>{p.name}</strong>{' '}
              <SlideLink url={p.slide_url} label="[資料URL]" />
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

export const AdminPresenterSection = ({ presenters }: { presenters: PresenterRecord[] }) => (
  <article>
    <header>
      <strong>発表者の登録・切替（グループ・名前・資料URL）</strong>
    </header>
    <form method="post" action="/admin/presenters">
      <div class="grid">
        <label>
          グループ名
          <input type="text" name="group_name" placeholder="例: グループA" required />
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
            <td>{p.group_name}</td>
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
