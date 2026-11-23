import { raw } from 'hono/html'
import { EMOJI_CATEGORIES } from './emoji-data'

const renderEmojiPickerModal = () => (
  <div
    id="emoji-picker-modal"
    class="emoji-modal"
    role="dialog"
    aria-modal="true"
    aria-label="絵文字リアクションを選択"
    hidden
  >
    <div class="emoji-modal-backdrop" data-action="close-emoji-picker" />
    <div class="emoji-modal-sheet">
      <div class="emoji-modal-header">
        <strong>リアクションを選択</strong>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          data-action="close-emoji-picker"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
      <div class="emoji-search-row">
        <input
          type="text"
          id="emoji-search-input"
          class="input emoji-search-input"
          placeholder="検索（例: 拍手・草・AI）または任意の絵文字を入力"
          autocomplete="off"
        />
        <button
          type="button"
          id="emoji-custom-send"
          class="btn btn-primary btn-sm"
          data-action="submit-custom-emoji"
        >
          送信
        </button>
      </div>
      <div class="emoji-tabs" role="tablist">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            class={`emoji-tab${idx === 0 ? ' is-active' : ''}`}
            data-action="emoji-tab"
            data-cat={cat.id}
            aria-selected={idx === 0 ? 'true' : 'false'}
          >
            <span>{cat.icon}</span>
            <span class="emoji-tab-label">{cat.label}</span>
          </button>
        ))}
      </div>
      <div class="emoji-panels" id="emoji-panels">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <div
            key={cat.id}
            class={`emoji-grid${idx === 0 ? ' is-active' : ''}`}
            data-emoji-cat={cat.id}
          >
            {cat.items.map(([emoji, keywords]) => (
              <button
                key={emoji}
                type="button"
                class="emoji-cell"
                data-action="pick-emoji"
                data-emoji={emoji}
                data-keywords={`${emoji} ${keywords} ${cat.label}`}
                title={keywords.split(' ')[0]}
              >
                {emoji}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
)

const STATIC_EMOJI_PICKER_HTML = raw(renderEmojiPickerModal().toString())

export const EmojiPickerModal = () => STATIC_EMOJI_PICKER_HTML
