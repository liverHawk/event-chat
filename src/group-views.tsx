import type { GroupRecord } from './types'

export const GROUP_COLORS = [
  { hex: '#2563eb', label: 'ブルー' },
  { hex: '#059669', label: 'エメラルド' },
  { hex: '#d97706', label: 'オレンジ' },
  { hex: '#e11d48', label: 'ローズ' },
  { hex: '#7c3aed', label: 'パープル' },
  { hex: '#0891b2', label: 'シアン' },
  { hex: '#db2777', label: 'ピンク' },
  { hex: '#4f46e5', label: 'インディゴ' },
]

export const GroupBadge = ({ name, color }: { name?: string | null; color?: string | null }) =>
  name ? (
    <span
      class="group-badge"
      style={`background:${color || '#475569'};color:#fff;padding:0.1rem 0.5rem;border-radius:999px;font-size:0.75rem;font-weight:600;margin:0 0.35rem;vertical-align:middle;display:inline-block`}
    >
      {name}
    </span>
  ) : null

export const AdminGroupSection = ({ groups }: { groups: GroupRecord[] }) => {
  const defaultColor = GROUP_COLORS[groups.length % GROUP_COLORS.length].hex
  return (
    <article>
      <header>
        <strong>グループの登録・一覧（色分け設定）</strong>
      </header>
      <form method="post" action="/admin/groups">
        <div class="grid">
          <label>
            グループ名
            <input type="text" name="name" placeholder="例: 1班 / グループA" required />
          </label>
          <label>
            バッジの色
            <select name="color">
              {GROUP_COLORS.map((c) => (
                <option key={c.hex} value={c.hex} selected={c.hex === defaultColor}>
                  {c.label} ({c.hex})
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit">グループを追加</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>表示プレビュー</th>
            <th>カラーコード</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id}>
              <td>
                <GroupBadge name={g.name} color={g.color} />
              </td>
              <td>
                <code>{g.color}</code>
              </td>
              <td>
                <form method="post" action={`/admin/groups/${g.id}/delete`} style="margin:0">
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
}
