-- v3: Creative Workflow presets, Music Academy progress, songs in projects,
-- focus configuration, learning blocks in the plan. Additive only.

CREATE TABLE workflows (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  name TEXT NOT NULL, minutes INTEGER, focus INTEGER NOT NULL DEFAULT 0, tone INTEGER NOT NULL DEFAULT 0,
  intention TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 0, last_used_at INTEGER,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX idx_workflows_sync ON workflows(user_id, srv_ts);

CREATE TABLE learning (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  kind TEXT NOT NULL, path_key TEXT NOT NULL, status TEXT NOT NULL,
  started_at INTEGER, done_at INTEGER, last_opened_at INTEGER,
  revisits INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);
CREATE INDEX idx_learning_sync ON learning(user_id, srv_ts);

CREATE TABLE songs (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  project_id TEXT NOT NULL, title TEXT NOT NULL, lyrics TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0, done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX idx_songs_sync ON songs(user_id, srv_ts);

ALTER TABLE sessions ADD COLUMN workflow_id TEXT;
ALTER TABLE sessions ADD COLUMN target_minutes INTEGER;

ALTER TABLE events ADD COLUMN lesson_key TEXT;

ALTER TABLE projects ADD COLUMN kind TEXT NOT NULL DEFAULT 'single';
ALTER TABLE projects ADD COLUMN cover_data TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN tone INTEGER NOT NULL DEFAULT 0;

ALTER TABLE profile ADD COLUMN focus_apps TEXT NOT NULL DEFAULT '[]';
ALTER TABLE profile ADD COLUMN focus_shortcut TEXT NOT NULL DEFAULT '';
ALTER TABLE profile ADD COLUMN focus_blocks TEXT NOT NULL DEFAULT '[]';
ALTER TABLE profile ADD COLUMN learning_per_week INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profile ADD COLUMN music_style TEXT NOT NULL DEFAULT '';
