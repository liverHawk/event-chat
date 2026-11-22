import { HEX_COLOR_PATTERN } from '../lib/validators'
import type { GroupRecord } from '../types'

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

export const GroupBadge = ({ name, color }: { name?: string | null; color?: string | null }) => {
  if (!name) return null
  const safeColor = color && HEX_COLOR_PATTERN.test(color) ? color : '#475569'
  return (
    <span class="group-badge" style={`background:${safeColor}`}>
      {name}
    </span>
  )
}

export const AdminGroupSection = ({ groups }: { groups: GroupRecord[] }) => {
  const defaultColor = GROUP_COLORS[groups.length % GROUP_COLORS.length].hex
  return (
    <section class="admin-section" id="section-groups">
      <div class="section-head">
        <div>
          <h2 class="section-title">2. グループの登録・一覧（色分け設定）</h2>
          <p class="section-desc">
            チャットのメッセージバッジや登壇バーに反映されるグループとカラーを管理します。
          </p>
        </div>
        <span class="count-pill">登録数: {groups.length}</span>
      </div>
      <div class="form-panel">
        <form method="post" action="/admin/groups">
          <div class="form-grid-2">
            <div class="field">
              <label class="field-label" for="group-name">
                グループ名
              </label>
              <input
                id="group-name"
                class="input"
                type="text"
                name="name"
                placeholder="例: 1班 / グループA"
                required
              />
            </div>
            <div class="field">
              <span class="field-label">バッジの色（8色パレット）</span>
              <div class="swatch-row">
                {GROUP_COLORS.map((c) => (
                  <label key={c.hex} class="swatch-label" title={`${c.label} (${c.hex})`}>
                    <input
                      type="radio"
                      name="color"
                      value={c.hex}
                      checked={c.hex === defaultColor}
                    />
                    <span class="swatch-dot" style={`background:${c.hex}`} />
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary">
              ＋ グループを追加
            </button>
          </div>
        </form>
      </div>
      {groups.length > 0 && (
        <div class="group-grid">
          {groups.map((g) => (
            <div key={g.id} class="group-card">
              <div class="group-card-meta">
                <div>
                  <GroupBadge name={g.name} color={g.color} />
                </div>
                <code>{g.color}</code>
              </div>
              <form method="post" action={`/admin/groups/${g.id}/delete`} style="margin:0">
                <button type="submit" class="btn btn-danger-ghost btn-xs">
                  削除
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
