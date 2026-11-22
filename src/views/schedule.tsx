import { findActiveSchedule } from '../lib/schedule-csv'
import type { ScheduleItemRecord } from '../types'

const formatTimeRange = (item: ScheduleItemRecord) =>
  item.end_time ? `${item.start_time}–${item.end_time}` : item.start_time

export const ChatScheduleBar = ({ items }: { items: ScheduleItemRecord[] }) => {
  if (items.length === 0) return null
  const { current, next } = findActiveSchedule(items)
  return (
    <div style="margin-bottom:0.5rem;padding:0.45rem 0.75rem;background:var(--pico-card-sectioning-background-color);border-radius:6px;font-size:0.85rem;flex-shrink:0">
      {current ? (
        <div style="margin-bottom:0.25rem">
          🕒 <strong>現在進行中:</strong> <code>{formatTimeRange(current)}</code>{' '}
          <strong>{current.title}</strong>
          {current.description && <small> — {current.description}</small>}
        </div>
      ) : next ? (
        <div style="margin-bottom:0.25rem">
          🕒 <strong>次の予定:</strong> <code>{formatTimeRange(next)}</code>{' '}
          <strong>{next.title}</strong>
        </div>
      ) : null}
      <details style="margin:0">
        <summary style="cursor:pointer;font-size:0.82rem;color:var(--pico-muted-color)">
          📅 タイムスケジュール（{items.length}件）
        </summary>
        <ul style="margin:0.35rem 0 0;padding-left:1.2rem;max-height:11rem;overflow-y:auto">
          {items.map((item) => (
            <li
              key={item.id}
              style={`margin-bottom:0.2rem${current?.id === item.id ? ';font-weight:700;color:var(--pico-primary)' : ''}`}
            >
              {current?.id === item.id && '▶ '}
              <code>{formatTimeRange(item)}</code> {item.title}
              {item.description && <small> — {item.description}</small>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

export const AdminScheduleSection = ({ items }: { items: ScheduleItemRecord[] }) => (
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
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;margin:0.75rem 0">
          <small>全体をずらす:</small>
          {[-10, -5, 5, 10].map((min) => (
            <form key={min} method="post" action="/admin/schedule/shift" style="margin:0">
              <input type="hidden" name="minutes" value={String(min)} />
              <button
                type="submit"
                class="outline"
                style="padding:0.2rem 0.55rem;font-size:0.8rem;width:auto;margin:0"
              >
                {min > 0 ? `+${min}分（遅らせる）` : `${min}分（早める）`}
              </button>
            </form>
          ))}
          <form
            method="post"
            action="/admin/schedule/shift"
            style="display:flex;gap:0.3rem;align-items:center;margin:0"
          >
            <input
              type="number"
              name="minutes"
              min={-180}
              max={180}
              placeholder="分"
              required
              style="width:5rem;height:2rem;padding:0 0.4rem;margin:0;font-size:0.8rem"
            />
            <button
              type="submit"
              class="outline secondary"
              style="padding:0.2rem 0.55rem;font-size:0.8rem;width:auto;margin:0"
            >
              適用
            </button>
          </form>
        </div>
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
