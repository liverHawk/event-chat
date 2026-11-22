import { findActiveSchedule } from '../lib/schedule-csv'
import type { ScheduleItemRecord } from '../types'

const formatTimeRange = (item: ScheduleItemRecord) =>
  item.end_time ? `${item.start_time}–${item.end_time}` : item.start_time

export const ChatScheduleBar = ({ items }: { items: ScheduleItemRecord[] }) => {
  if (items.length === 0) return null
  const { current, next } = findActiveSchedule(items)
  return (
    <div class="stage-card stage-card--schedule">
      {current ? (
        <div class="stage-lead">
          <span>🕒</span>
          <strong>現在進行中:</strong>
          <code>{formatTimeRange(current)}</code>
          <strong>{current.title}</strong>
          {current.description && <small> — {current.description}</small>}
        </div>
      ) : next ? (
        <div class="stage-lead">
          <span>🕒</span>
          <strong>次の予定:</strong>
          <code>{formatTimeRange(next)}</code>
          <strong>{next.title}</strong>
        </div>
      ) : null}
      <details class="stage-details">
        <summary>📅 タイムスケジュール（{items.length}件）</summary>
        <ul class="stage-details-list">
          {items.map((item) => (
            <li
              key={item.id}
              class={`stage-details-item${current?.id === item.id ? ' stage-details-item--active' : ''}`}
            >
              {current?.id === item.id && <span>▶</span>}
              <code>{formatTimeRange(item)}</code>
              <span>{item.title}</span>
              {item.description && <small> — {item.description}</small>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

const ShiftBar = ({ label, mode }: { label: string; mode: 'all' | 'current' }) => (
  <div class="shift-bar">
    <span class="shift-bar-label">{label}:</span>
    {[-10, -5, 5, 10].map((min) => (
      <form key={min} method="post" action="/admin/schedule/shift" style="margin:0">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="minutes" value={String(min)} />
        <button type="submit" class="btn btn-secondary btn-xs">
          {min > 0 ? `+${min}分` : `${min}分`}
        </button>
      </form>
    ))}
    <form
      method="post"
      action="/admin/schedule/shift"
      style="display:inline-flex;gap:0.35rem;align-items:center;margin:0"
    >
      <input type="hidden" name="mode" value={mode} />
      <input
        class="input shift-input"
        type="number"
        name="minutes"
        min={-180}
        max={180}
        placeholder="分"
        required
      />
      <button type="submit" class="btn btn-primary btn-xs">
        適用
      </button>
    </form>
  </div>
)

export const AdminScheduleSection = ({
  items,
  current = findActiveSchedule(items).current,
}: {
  items: ScheduleItemRecord[]
  current?: ScheduleItemRecord | null
}) => (
  <article>
    <header>
      <strong>タイムスケジュール（CSV一括登録）</strong>
    </header>
    <form method="post" action="/admin/schedule" enctype="multipart/form-data">
      <label>
        CSVファイル（任意・選択時はファイル優先）
        <input type="file" name="csv_file" accept=".csv,text/csv" />
      </label>
      <label>
        CSVテキスト（<code>開始時刻,終了時刻,タイトル,メモ</code> または{' '}
        <code>開始時刻,タイトル</code>）
        <textarea
          name="csv"
          rows={5}
          placeholder={
            '13:00,13:15,開会式,全体説明\n13:15,14:00,発表タイム,各チーム発表\n14:00,閉会'
          }
        />
      </label>
      <button type="submit">CSVでタイムスケジュールを更新</button>
    </form>
    {items.length > 0 && (
      <>
        {current && (
          <ShiftBar label={`進行中「${current.title}」の終了をずらす（後続連動）`} mode="current" />
        )}
        <ShiftBar label="全体をずらす" mode="all" />
        <table>
          <thead>
            <tr>
              <th>時刻</th>
              <th>タイトル</th>
              <th>メモ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {current?.id === item.id && '▶ '}
                  <code>{formatTimeRange(item)}</code>
                </td>
                <td>{item.title}</td>
                <td>{item.description ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form method="post" action="/admin/schedule/clear" style="margin:0">
          <button type="submit" class="outline secondary" style="width:auto">
            タイムスケジュールをすべて削除
          </button>
        </form>
      </>
    )}
  </article>
)
