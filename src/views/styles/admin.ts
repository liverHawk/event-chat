export const ADMIN_CSS = `.admin-shell { min-height: 100vh; background: var(--surface); }
.admin-topbar { position: sticky; top: 0; z-index: 40; height: 3.75rem; padding: 0 1.25rem; background: rgba(248, 249, 255, 0.92); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(199, 196, 216, 0.35); display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.admin-topbar-left { display: flex; align-items: center; gap: 0.85rem; }
.admin-user-pill { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.3rem 0.75rem; border-radius: var(--radius-full); background: var(--surface-container-low); font-size: 0.78rem; color: var(--on-surface-variant); }
.admin-container { max-width: 1120px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; display: flex; flex-direction: column; gap: 1.5rem; }
.admin-hero { background: var(--surface-container-lowest); border-radius: var(--radius-xl); padding: 1.5rem 1.75rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 1rem; }
.admin-hero-title { margin: 0.25rem 0 0.2rem; font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
.admin-hero-sub { margin: 0; color: var(--on-surface-variant); font-size: 0.875rem; }
.admin-anchors { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.anchor-pill { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.8rem; border-radius: var(--radius-md); background: var(--surface-container-low); color: var(--on-surface); font-size: 0.82rem; font-weight: 600; }
.anchor-pill:hover { background: var(--primary-fixed); color: var(--on-primary-fixed); text-decoration: none; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; }
.stat-card { background: var(--surface-container-lowest); border-radius: var(--radius-lg); padding: 1rem 1.15rem; box-shadow: var(--shadow-xs); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.stat-label { font-family: var(--font-display); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em; color: var(--on-surface-variant); text-transform: uppercase; }
.stat-value { font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; color: var(--on-surface); margin-top: 0.15rem; }
.stat-icon { width: 2.4rem; height: 2.4rem; border-radius: var(--radius-md); background: var(--surface-container); color: var(--primary); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.admin-section { background: var(--surface-container-lowest); border-radius: var(--radius-xl); padding: 1.5rem 1.75rem; box-shadow: var(--shadow-sm); scroll-margin-top: 4.5rem; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.15rem; }
.section-title { margin: 0; font-family: var(--font-display); font-size: 1.125rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
.section-desc { margin: 0.25rem 0 0; font-size: 0.84rem; color: var(--on-surface-variant); }
.count-pill { padding: 0.22rem 0.65rem; border-radius: var(--radius-sm); background: var(--surface-container); color: var(--on-surface-variant); font-family: var(--font-display); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
.form-panel { background: rgba(239, 244, 255, 0.72); border-radius: var(--radius-lg); padding: 1.1rem 1.2rem; margin-bottom: 1.25rem; }
.form-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem; }
.form-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; }
.form-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; }
.form-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.9rem; }
.swatch-row { display: flex; flex-wrap: wrap; gap: 0.55rem; align-items: center; padding-top: 0.25rem; }
.swatch-label { position: relative; cursor: pointer; display: inline-flex; }
.swatch-label input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.swatch-dot { width: 1.85rem; height: 1.85rem; border-radius: var(--radius-full); display: block; box-shadow: var(--shadow-xs); border: 2px solid transparent; transition: transform 0.12s ease, box-shadow 0.12s ease; }
.swatch-label input:checked + .swatch-dot { transform: scale(1.12); box-shadow: 0 0 0 3px var(--surface-container-lowest), 0 0 0 5px var(--primary-container); }
.table-wrap { overflow-x: auto; border-radius: var(--radius-lg); }
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.86rem; }
.data-table thead tr { background: var(--surface-container); }
.data-table th { padding: 0.65rem 0.85rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; color: var(--on-surface); white-space: nowrap; }
.data-table th:first-child { border-radius: var(--radius-md) 0 0 var(--radius-md); }
.data-table th:last-child { border-radius: 0 var(--radius-md) var(--radius-md) 0; }
.data-table td { padding: 0.7rem 0.85rem; border-bottom: 1px solid rgba(199, 196, 216, 0.25); vertical-align: middle; }
.data-table tbody tr:hover { background: var(--surface-container-low); }
.data-table tbody tr.row-active { background: rgba(226, 223, 255, 0.45); }
.table-actions { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.group-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }
.group-card { background: var(--surface-container-low); border-radius: var(--radius-lg); padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
.group-card-meta { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
.shift-panel { background: var(--surface-container); border-radius: var(--radius-lg); padding: 0.9rem 1.1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
.shift-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; }
.shift-bar-label { font-size: 0.8rem; font-weight: 600; color: var(--on-surface); margin-right: 0.25rem; }
.shift-input { width: 4.75rem; padding: 0.28rem 0.45rem; text-align: center; }
.status-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); font-family: var(--font-display); font-size: 0.74rem; font-weight: 700; background: var(--surface-container); color: var(--on-surface-variant); }
.status-badge--live { background: var(--primary-container); color: var(--on-primary); }
.danger-zone { margin-top: 1rem; padding-top: 0.9rem; border-top: 1px solid rgba(199, 196, 216, 0.3); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }`
