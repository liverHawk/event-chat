export const BASE_CSS = `:root { --surface: #f8f9ff; --surface-container-lowest: #ffffff; --surface-container-low: #eff4ff; --surface-container: #e5eeff; --surface-container-high: #dce9ff; --surface-container-highest: #d3e4fe; --primary: #3525cd; --primary-container: #4f46e5; --on-primary: #ffffff; --primary-fixed: #e2dfff; --on-primary-fixed: #0f0069; --on-primary-fixed-variant: #3323cc; --on-primary-container: #dad7ff; --secondary: #0058be; --secondary-container: #2170e4; --on-secondary: #ffffff; --secondary-fixed: #d8e2ff; --on-secondary-fixed: #001a42; --tertiary: #005338; --tertiary-container: #006e4c; --on-tertiary: #ffffff; --tertiary-fixed: #85f8c4; --tertiary-fixed-dim: #68dba9; --on-tertiary-fixed: #002114; --error: #ba1a1a; --error-container: #ffdad6; --on-error-container: #93000a; --on-surface: #0b1c30; --on-surface-variant: #464555; --outline: #777587; --outline-variant: #c7c4d8; --discord: #5865f2; --discord-hover: #4752c4; --radius-sm: 0.375rem; --radius-md: 0.5rem; --radius-lg: 0.75rem; --radius-xl: 1rem; --radius-full: 9999px; --shadow-xs: 0 1px 2px rgba(11, 28, 48, 0.05); --shadow-sm: 0 1px 4px rgba(11, 28, 48, 0.06), 0 1px 2px rgba(11, 28, 48, 0.04); --shadow-md: 0 4px 14px rgba(53, 37, 205, 0.1), 0 2px 6px rgba(11, 28, 48, 0.05); --shadow-xl: 0 16px 40px rgba(11, 28, 48, 0.1), 0 4px 12px rgba(53, 37, 205, 0.06); --font-sans: 'Noto Sans', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; --font-display: 'Inter', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif; --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: var(--font-sans); font-size: 14px; line-height: 1.5; color: var(--on-surface); background: var(--surface); -webkit-font-smoothing: antialiased; }
html.lock-scroll, html.lock-scroll body { height: 100%; overflow: hidden; overscroll-behavior: none; }
a { color: var(--secondary); text-decoration: none; }
a:hover { text-decoration: underline; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
code { font-family: var(--font-mono); font-size: 0.85em; background: var(--surface-container); padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
.icon { width: 1.15em; height: 1.15em; display: inline-block; vertical-align: -0.18em; flex-shrink: 0; }
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}
.pulse-dot { width: 0.5rem; height: 0.5rem; border-radius: var(--radius-full); display: inline-block; flex-shrink: 0; animation: pulse-dot 1.8s ease-in-out infinite; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; padding: 0.55rem 1rem; border-radius: var(--radius-md); border: none; font-family: var(--font-display); font-weight: 600; font-size: 0.875rem; line-height: 1.25; text-decoration: none; transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease; white-space: nowrap; }
.btn:hover { text-decoration: none; }
.btn:active { transform: scale(0.985); }
.btn-primary { background: var(--primary-container); color: var(--on-primary); box-shadow: var(--shadow-sm); }
.btn-primary:hover { background: var(--primary); box-shadow: var(--shadow-md); }
.btn-discord { background: var(--discord); color: #ffffff; box-shadow: var(--shadow-md); }
.btn-discord:hover { background: var(--discord-hover); }
.btn-tonal { background: var(--surface-container); color: var(--primary); }
.btn-tonal:hover { background: var(--surface-container-high); }
.btn-secondary { background: var(--surface-container); color: var(--on-surface); }
.btn-secondary:hover { background: var(--surface-container-highest); }
.btn-ghost { background: transparent; color: var(--on-surface-variant); }
.btn-ghost:hover { background: var(--surface-container-high); color: var(--on-surface); }
.btn-danger-ghost { background: transparent; color: var(--on-surface-variant); }
.btn-danger-ghost:hover { background: var(--error-container); color: var(--on-error-container); }
.btn-sm { padding: 0.35rem 0.7rem; font-size: 0.8rem; border-radius: var(--radius-sm); }
.btn-xs { padding: 0.22rem 0.55rem; font-size: 0.75rem; border-radius: var(--radius-sm); }
.btn-lg { padding: 0.8rem 1.25rem; font-size: 0.95rem; border-radius: var(--radius-lg); }
.btn-block { width: 100%; }
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field-label { font-family: var(--font-display); font-size: 0.75rem; font-weight: 600; color: var(--on-surface-variant); letter-spacing: 0.02em; }
.input, .select, .textarea { width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-md); border: 1px solid rgba(199, 196, 216, 0.55); background: var(--surface-container-lowest); color: var(--on-surface); font-size: 0.875rem; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease; }
.input:focus, .select:focus, .textarea:focus { border-color: var(--primary-container); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.16); }
.input:disabled, .select:disabled { background: var(--surface-container); color: var(--on-surface-variant); cursor: not-allowed; opacity: 0.82; }
.textarea { resize: vertical; font-family: var(--font-mono); font-size: 0.8125rem; }
.group-badge { display: inline-flex; align-items: center; padding: 0.12rem 0.55rem; border-radius: var(--radius-full); font-family: var(--font-display); font-size: 0.72rem; font-weight: 700; line-height: 1.3; letter-spacing: 0.01em; color: #ffffff; vertical-align: middle; white-space: nowrap; }
.auth-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; background: var(--surface); }
.auth-header { padding: 1.5rem 1rem 0.5rem; display: flex; justify-content: center; align-items: center; }
.brand-lockup { display: inline-flex; align-items: center; gap: 0.5rem; }
.brand-mark { width: 2rem; height: 2rem; border-radius: var(--radius-md); background: var(--primary-container); color: var(--on-primary); display: inline-flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); }
.brand-name { font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; letter-spacing: -0.01em; color: var(--on-surface); }
.brand-pill { padding: 0.15rem 0.5rem; border-radius: var(--radius-full); background: var(--surface-container-high); color: var(--primary); font-family: var(--font-display); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
.auth-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 1.5rem 1rem; }
.auth-card-wrap { position: relative; width: 100%; max-width: 480px; }
.auth-card-wrap--wide { max-width: 520px; }
.auth-glow-a, .auth-glow-b { position: absolute; border-radius: var(--radius-full); filter: blur(48px); pointer-events: none; z-index: 0; }
.auth-glow-a { width: 11rem; height: 11rem; top: -2.2rem; left: -2rem; background: rgba(79, 70, 229, 0.18); }
.auth-glow-b { width: 11rem; height: 11rem; bottom: -2rem; right: -2rem; background: rgba(33, 112, 228, 0.15); }
.auth-card { position: relative; z-index: 1; background: var(--surface-container-lowest); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); padding: 2rem; overflow: hidden; }
.auth-accent-bar { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--primary), var(--primary-container), var(--secondary-container)); }
.auth-icon-circle { width: 4rem; height: 4rem; border-radius: var(--radius-lg); background: var(--primary-fixed); color: var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; box-shadow: var(--shadow-sm); }
.auth-title { margin: 0 0 0.5rem; font-family: var(--font-display); font-size: 1.375rem; font-weight: 700; letter-spacing: -0.015em; text-align: center; color: var(--on-surface); }
.auth-desc { margin: 0 0 1.5rem; font-size: 0.875rem; color: var(--on-surface-variant); text-align: center; line-height: 1.6; }
.feature-list { background: var(--surface-container-low); border-radius: var(--radius-lg); padding: 1rem; display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1.5rem; }
.feature-item { display: flex; align-items: flex-start; gap: 0.7rem; }
.feature-check { width: 1.4rem; height: 1.4rem; border-radius: var(--radius-full); background: var(--primary-fixed); color: var(--on-primary-fixed); display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; margin-top: 0.1rem; }
.feature-title { font-weight: 600; font-size: 0.875rem; color: var(--on-surface); }
.feature-sub { font-size: 0.8rem; color: var(--on-surface-variant); }
.step-list { display: flex; flex-direction: column; gap: 0.75rem; margin: 0 0 1.5rem; padding: 0; list-style: none; }
.step-card { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.9rem 1rem; border-radius: var(--radius-lg); background: var(--surface-container-low); }
.step-num { width: 1.85rem; height: 1.85rem; border-radius: var(--radius-md); background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-num--soft { background: var(--surface-container-highest); color: var(--primary); }
.auth-actions { display: flex; flex-direction: column; gap: 0.65rem; }
.auth-back-link { display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; width: 100%; padding: 0.5rem; margin-top: 0.5rem; font-size: 0.84rem; font-weight: 600; color: var(--on-surface-variant); }
.auth-back-link:hover { color: var(--on-surface); text-decoration: none; }
.join-room-banner { background: var(--surface-container-low); border-radius: var(--radius-lg); padding: 1rem; text-align: center; margin-bottom: 1.25rem; font-size: 0.95rem; }
.join-room-banner strong { color: var(--primary); font-size: 1.05rem; }
.auth-note { margin-top: 1.25rem; padding: 0.75rem 0.9rem; border-radius: var(--radius-md); background: var(--surface-container-low); font-size: 0.8rem; color: var(--on-surface-variant); text-align: center; }
.auth-footer { padding: 1rem; text-align: center; font-size: 0.78rem; color: var(--outline); }`
