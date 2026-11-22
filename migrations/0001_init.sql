CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_global INTEGER NOT NULL DEFAULT 0,
    invite_code TEXT UNIQUE,
    discord_role_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS room_memberships (
    user_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    PRIMARY KEY (user_id, room_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO rooms (id, name, is_global) VALUES ('global', '全体チャット', 1);
