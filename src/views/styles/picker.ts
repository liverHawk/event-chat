export const PICKER_AND_RESPONSIVE_CSS = `.emoji-modal[hidden] { display: none; }
.emoji-modal { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.emoji-modal-backdrop { position: absolute; inset: 0; background: rgba(11, 28, 48, 0.42); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); cursor: pointer; }
.emoji-modal-sheet { position: relative; z-index: 1; width: 100%; max-width: 380px; max-height: min(460px, 80vh); background: var(--surface-container-lowest); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); display: flex; flex-direction: column; overflow: hidden; }
.emoji-modal-header { padding: 0.75rem 1rem; background: var(--surface-container-low); display: flex; align-items: center; justify-content: space-between; font-family: var(--font-display); font-size: 0.9rem; }
.emoji-search-row { padding: 0.65rem 0.85rem 0.5rem; display: flex; gap: 0.45rem; align-items: center; }
.emoji-search-input { padding: 0.45rem 0.65rem; font-size: 0.82rem; }
.emoji-tabs { display: flex; gap: 0.25rem; padding: 0 0.75rem 0.5rem; border-bottom: 1px solid rgba(199, 196, 216, 0.3); overflow-x: auto; scrollbar-width: none; }
.emoji-tabs::-webkit-scrollbar { display: none; }
.emoji-tab { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.3rem 0.55rem; border-radius: var(--radius-md); border: none; background: transparent; color: var(--on-surface-variant); font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
.emoji-tab:hover { background: var(--surface-container-low); color: var(--on-surface); }
.emoji-tab.is-active { background: var(--primary-fixed); color: var(--primary); }
.emoji-panels { flex: 1; overflow-y: auto; padding: 0.65rem 0.75rem 0.85rem; }
.emoji-grid { display: none; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 0.25rem; }
.emoji-grid.is-active { display: grid; }
.emoji-panels.is-searching .emoji-grid { display: grid; margin-bottom: 0.35rem; }
.emoji-cell { border: none; background: transparent; border-radius: var(--radius-md); padding: 0.35rem 0; font-size: 1.35rem; line-height: 1.1; display: inline-flex; align-items: center; justify-content: center; transition: background-color 0.1s ease, transform 0.1s ease; }
.emoji-cell:hover { background: var(--surface-container); transform: scale(1.15); }
.emoji-cell:active { transform: scale(0.95); }
.emoji-cell[hidden] { display: none; }
.composer-deck { flex-shrink: 0; background: var(--surface-container-lowest); border-top: 1px solid rgba(199, 196, 216, 0.35); padding: 0.65rem 1.25rem 0.85rem; box-shadow: 0 -2px 12px rgba(11, 28, 48, 0.04); }
.reply-banner { display: none; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.4rem 0.75rem; margin-bottom: 0.5rem; border-radius: var(--radius-md); background: var(--surface-container-low); border-left: 3px solid var(--secondary); font-size: 0.8rem; }
.reply-banner-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--on-surface); }
.reply-banner-body { color: var(--on-surface-variant); }
.quick-chips { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem; overflow-x: auto; scrollbar-width: none; }
.quick-chips::-webkit-scrollbar { display: none; }
.quick-chips-label { font-family: var(--font-display); font-size: 0.7rem; font-weight: 700; color: var(--outline); white-space: nowrap; }
.quick-chip { padding: 0.2rem 0.6rem; border-radius: var(--radius-full); border: none; background: var(--surface-container); color: var(--on-surface-variant); font-size: 0.75rem; font-weight: 600; white-space: nowrap; transition: background-color 0.15s ease, color 0.15s ease; }
.quick-chip:hover { background: var(--primary-fixed); color: var(--primary); }
.chat-form { display: flex; align-items: center; gap: 0.6rem; }
.chat-input { flex: 1; padding: 0.65rem 0.9rem; border-radius: var(--radius-lg); border: 1px solid rgba(199, 196, 216, 0.55); background: var(--surface-container-low); font-size: 0.9rem; outline: none; transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; }
.chat-input:focus { background: var(--surface-container-lowest); border-color: var(--primary-container); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.16); }
.char-counter { font-family: var(--font-display); font-size: 0.72rem; color: var(--outline); white-space: nowrap; }
.sidebar-backdrop { display: none; position: fixed; inset: 0; background: rgba(11, 28, 48, 0.4); z-index: 25; cursor: pointer; }
@media (max-width: 820px) {
  .chat-sidebar { position: fixed; top: 0; left: 0; bottom: 0; height: auto; height: 100dvh; max-width: 85vw; transform: translateX(-100%); transition: transform 0.2s ease; box-shadow: var(--shadow-xl); }
  .chat-sidebar.is-open { transform: translateX(0); }
  .sidebar-backdrop.is-open { display: block; }
  .mobile-menu-btn { display: inline-flex; }
  .sidebar-close-btn { display: inline-flex; }
  .chat-topbar { padding: 0 0.85rem; }
  .chat-room-sub { display: none; }
  .messages-list { padding: 0.75rem; }
  .composer-deck { padding: 0.55rem 0.75rem 0.7rem; }
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .form-grid-2, .form-grid-3, .form-grid-4 { grid-template-columns: 1fr; }
  .admin-container { padding: 1rem 0.85rem 2.5rem; }
  .admin-section, .admin-hero { padding: 1.15rem; }
  .admin-user-pill { display: none; }
  .auth-card { padding: 1.5rem 1.25rem; }
  .emoji-modal { align-items: flex-end; padding: 0; }
  .emoji-modal-sheet { max-width: 100%; max-height: 70vh; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
  .emoji-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .emoji-cell { padding: 0.45rem 0; font-size: 1.5rem; }
  .emoji-tab-label { display: none; }
}`
