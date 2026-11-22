ALTER TABLE rooms ADD COLUMN group_id TEXT REFERENCES groups(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_group_id ON rooms(group_id) WHERE group_id IS NOT NULL;
