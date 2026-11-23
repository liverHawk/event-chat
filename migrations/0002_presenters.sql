CREATE TABLE IF NOT EXISTS presenters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    name TEXT NOT NULL,
    slide_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
);
