export const CHAT_CSS = `.chat-shell { display: flex; height: 100vh; height: 100dvh; width: 100vw; overflow: hidden; background: var(--surface); }
.chat-sidebar { width: 280px; flex-shrink: 0; height: 100%; display: flex; flex-direction: column; background: var(--surface-container-low); border-right: 1px solid rgba(199, 196, 216, 0.35); z-index: 30; }
.sidebar-header { height: 3.75rem; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; background: var(--surface-container-lowest); border-bottom: 1px solid rgba(199, 196, 216, 0.28); flex-shrink: 0; }
.live-pill { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.18rem 0.55rem; border-radius: var(--radius-full); background: var(--error-container); color: var(--error); font-family: var(--font-display); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.03em; }
.live-pill .pulse-dot { background: var(--error); }
.sidebar-scroll { flex: 1; overflow-y: auto; padding: 0.9rem 0.75rem; display: flex; flex-direction: column; gap: 1rem; }
.sidebar-section-title { padding: 0 0.5rem; margin-bottom: 0.35rem; font-family: var(--font-display); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--on-surface-variant); display: flex; align-items: center; justify-content: space-between; }
.room-nav { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.room-link { display: flex; align-items: center; gap: 0.55rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); color: var(--on-surface-variant); font-size: 0.875rem; font-weight: 500; transition: background-color 0.15s ease, color 0.15s ease; }
.room-link:hover { background: var(--surface-container-high); color: var(--on-surface); text-decoration: none; }
.room-link[aria-current="page"] { background: var(--primary-container); color: var(--on-primary); font-weight: 600; box-shadow: var(--shadow-xs); }
.room-hash { font-family: var(--font-display); font-weight: 700; opacity: 0.75; }
.sidebar-footer { padding: 0.85rem; background: var(--surface-container-lowest); border-top: 1px solid rgba(199, 196, 216, 0.28); display: flex; flex-direction: column; gap: 0.65rem; flex-shrink: 0; }
.user-card { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
.user-avatar { width: 2.2rem; height: 2.2rem; border-radius: var(--radius-full); background: var(--primary-container); color: var(--on-primary); display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 700; font-size: 0.875rem; flex-shrink: 0; overflow: hidden; }
.user-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.user-meta { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
.user-meta strong { font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar-actions { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(199, 196, 216, 0.22); }
.sidebar-action-link { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; font-weight: 600; color: var(--on-surface-variant); }
.sidebar-action-link:hover { color: var(--primary); text-decoration: none; }
.sidebar-logout-btn { background: none; border: none; padding: 0.2rem 0.45rem; border-radius: var(--radius-sm); font-size: 0.78rem; font-weight: 600; color: var(--error); display: inline-flex; align-items: center; gap: 0.25rem; }
.sidebar-logout-btn:hover { background: var(--error-container); }
.profile-details { background: var(--surface-container-low); border-radius: var(--radius-md); padding: 0.5rem 0.65rem; font-size: 0.82rem; }
.profile-details summary { cursor: pointer; font-weight: 600; color: var(--on-surface); list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; }
.profile-details summary::-webkit-details-marker { display: none; }
.profile-form { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.65rem; }
.profile-form .input, .profile-form .select { padding: 0.42rem 0.6rem; font-size: 0.8rem; }
.chat-main { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: var(--surface); }
.chat-topbar { height: 3.75rem; padding: 0 1.25rem; background: var(--surface-container-lowest); border-bottom: 1px solid rgba(199, 196, 216, 0.28); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-shrink: 0; }
.chat-topbar-left { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }
.mobile-menu-btn { display: none; width: 2.2rem; height: 2.2rem; border-radius: var(--radius-md); border: none; background: var(--surface-container-low); color: var(--on-surface); align-items: center; justify-content: center; }
.chat-room-title { margin: 0; font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-room-sub { font-size: 0.78rem; color: var(--on-surface-variant); white-space: nowrap; }
.stage-bars { flex-shrink: 0; background: rgba(239, 244, 255, 0.9); border-bottom: 1px solid rgba(199, 196, 216, 0.3); padding: 0.55rem 1rem; display: flex; flex-direction: column; gap: 0.45rem; }
.stage-card { background: var(--surface-container-lowest); border-radius: var(--radius-md); padding: 0.55rem 0.8rem; box-shadow: var(--shadow-xs); font-size: 0.85rem; }
.stage-card--schedule { background: rgba(220, 233, 255, 0.6); box-shadow: none; }
.stage-row { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; flex-wrap: wrap; }
.stage-lead { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; min-width: 0; }
.stage-details { margin-top: 0.35rem; }
.stage-details summary { cursor: pointer; font-size: 0.78rem; font-weight: 600; color: var(--on-surface-variant); }
.stage-details-list { margin: 0.45rem 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.3rem; max-height: 11rem; overflow-y: auto; }
.stage-details-item { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); background: var(--surface-container-low); font-size: 0.8rem; }
.stage-details-item--active { background: var(--primary-fixed); color: var(--on-primary-fixed); font-weight: 600; }
.slide-pill { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-sm); background: var(--primary-container); color: var(--on-primary); font-size: 0.75rem; font-weight: 600; }
.slide-pill:hover { background: var(--primary); text-decoration: none; color: var(--on-primary); }
.chat-ws-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.messages-list { flex: 1; min-height: 0; overflow-y: auto; list-style: none; margin: 0; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.65rem; }
.msg-item { list-style: none; background: var(--surface-container-lowest); border-radius: var(--radius-lg); padding: 0.75rem 0.95rem; box-shadow: var(--shadow-xs); display: flex; gap: 0.75rem; align-items: flex-start; transition: box-shadow 0.15s ease; }
.msg-item:hover { box-shadow: var(--shadow-sm); }
.msg-avatar { width: 2.25rem; height: 2.25rem; border-radius: var(--radius-md); background: var(--surface-container-high); color: var(--primary); font-family: var(--font-display); font-weight: 700; font-size: 0.875rem; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.msg-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.msg-content { flex: 1; min-width: 0; }
.msg-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; }
.msg-author-row { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; min-width: 0; }
.msg-author-row strong { font-size: 0.875rem; color: var(--on-surface); }
.msg-time { font-family: var(--font-display); font-size: 0.72rem; color: var(--outline); }
.msg-reply-btn { padding: 0.15rem 0.5rem; border-radius: var(--radius-sm); border: none; background: transparent; color: var(--on-surface-variant); font-size: 0.75rem; font-weight: 600; opacity: 0.7; transition: background-color 0.15s ease, opacity 0.15s ease; }
.msg-item:hover .msg-reply-btn, .msg-reply-btn:focus { opacity: 1; background: var(--surface-container-low); }
.msg-reply-btn:hover { background: var(--surface-container-high); color: var(--primary); }
.msg-quote { display: block; margin-bottom: 0.4rem; padding: 0.35rem 0.6rem; border-left: 3px solid var(--primary-container); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; background: var(--surface-container-low); font-size: 0.78rem; color: var(--on-surface-variant); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg-quote:hover { text-decoration: none; background: var(--surface-container); }
.msg-body { font-size: 0.9rem; line-height: 1.55; color: var(--on-surface); white-space: pre-wrap; word-break: break-word; }
.msg-reactions { display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.45rem; }
.reaction-pill { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.14rem 0.52rem; border-radius: var(--radius-full); border: 1px solid transparent; background: var(--surface-container-high); color: var(--on-surface-variant); font-family: var(--font-display); font-size: 0.74rem; font-weight: 700; transition: background-color 0.12s ease, border-color 0.12s ease, transform 0.1s ease; }
.reaction-pill:hover { background: var(--primary-fixed); color: var(--primary); }
.reaction-pill:active { transform: scale(0.95); }
.reaction-pill--active { background: var(--primary-fixed); color: var(--primary); border-color: rgba(79, 70, 229, 0.35); }
.reaction-add-btn { border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0.14rem 0.5rem; border-radius: var(--radius-full); background: transparent; color: var(--outline); font-size: 0.75rem; font-weight: 600; user-select: none; }
.reaction-add-btn:hover { background: var(--surface-container); color: var(--on-surface); }
.schedule-boundary { list-style: none; display: flex; align-items: center; gap: 0.7rem; margin: 0.2rem 0; font-size: 0.78rem; color: var(--on-surface-variant); }
.schedule-boundary::before, .schedule-boundary::after { content: ''; flex: 1; height: 1px; background: rgba(199, 196, 216, 0.7); }
.schedule-boundary-pill { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.22rem 0.75rem; border-radius: var(--radius-full); font-weight: 600; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.schedule-boundary-pill > [aria-hidden="true"] { flex-shrink: 0; }
.schedule-boundary--start .schedule-boundary-pill { background: var(--primary-fixed); color: var(--on-primary-fixed); }
.schedule-boundary--end .schedule-boundary-pill { background: var(--surface-container-high); color: var(--on-surface-variant); }
.schedule-boundary-time { font-family: var(--font-mono); font-size: 0.74rem; opacity: 0.85; flex-shrink: 0; }
.schedule-boundary-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.schedule-boundary-label { font-size: 0.7rem; padding: 0.05rem 0.4rem; border-radius: var(--radius-full); background: rgba(255, 255, 255, 0.65); flex-shrink: 0; }`
