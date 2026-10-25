-- PULSE initial schema. Every user-owned table is keyed by (user_id, id).
-- srv_ts = server write time, used as the incremental sync cursor.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX idx_rate_limits_key ON rate_limits(key, at);

-- Change log + idempotency ledger: one row per applied client operation.
CREATE TABLE op_log (
  user_id TEXT NOT NULL,
  op_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  client_ts INTEGER NOT NULL,
  applied_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, op_id)
);
CREATE INDEX idx_op_log_entity ON op_log(user_id, entity, entity_id);

CREATE TABLE profile (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  display_name TEXT NOT NULL DEFAULT '', artist_name TEXT NOT NULL DEFAULT '',
  genres TEXT NOT NULL DEFAULT '[]', inspirations TEXT NOT NULL DEFAULT '[]',
  strengths TEXT NOT NULL DEFAULT '[]', weaknesses TEXT NOT NULL DEFAULT '[]',
  goals_text TEXT NOT NULL DEFAULT '', timezone TEXT NOT NULL DEFAULT 'Europe/Warsaw',
  wake_min INTEGER NOT NULL DEFAULT 450, bed_min INTEGER NOT NULL DEFAULT 1410,
  weekly_session_target INTEGER NOT NULL DEFAULT 4, weekly_minutes_target INTEGER NOT NULL DEFAULT 360,
  session_default_min INTEGER NOT NULL DEFAULT 90, focus_categories TEXT NOT NULL DEFAULT '[]',
  start_date TEXT, onboarding_done INTEGER NOT NULL DEFAULT 0, mentor_text_consent INTEGER NOT NULL DEFAULT 0,
  reminders TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE routines (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  kind TEXT NOT NULL, title TEXT NOT NULL, weekdays TEXT NOT NULL DEFAULT '[]',
  start_min INTEGER NOT NULL, end_min INTEGER NOT NULL, valid_from TEXT, valid_to TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE routine_exceptions (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  routine_id TEXT NOT NULL, date TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE day_states (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  date TEXT NOT NULL, status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE events (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  kind TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned', priority INTEGER NOT NULL DEFAULT 2, flexible INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'user', category TEXT, exercise_id TEXT, project_id TEXT, book_id TEXT, goal_id TEXT,
  session_id TEXT, moved_to TEXT, proposal_id TEXT, notes TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);
CREATE INDEX idx_events_date ON events(user_id, date);

CREATE TABLE sessions (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  type TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', status TEXT NOT NULL,
  started_at INTEGER NOT NULL, ended_at INTEGER, pauses TEXT NOT NULL DEFAULT '[]',
  active_seconds INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'timer', category TEXT,
  event_id TEXT, project_id TEXT, exercise_id TEXT, outcome TEXT NOT NULL DEFAULT 'none',
  outcome_note TEXT NOT NULL DEFAULT '', energy_after INTEGER, focus_mode INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX idx_sessions_started ON sessions(user_id, started_at);

CREATE TABLE attempts (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  exercise_id TEXT NOT NULL, category TEXT NOT NULL, level INTEGER NOT NULL, session_id TEXT, date TEXT NOT NULL,
  completed INTEGER NOT NULL, difficulty TEXT NOT NULL, feedback TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE skill_levels (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  category TEXT NOT NULL, level INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE projects (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  title TEXT NOT NULL, working_title TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'idea', notes TEXT NOT NULL DEFAULT '', inspirations TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '', release_date TEXT, last_worked_at INTEGER, archived INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE goals (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  title TEXT NOT NULL, area TEXT NOT NULL, period TEXT NOT NULL DEFAULT 'custom', metric TEXT NOT NULL DEFAULT 'manual',
  target REAL NOT NULL DEFAULT 1, manual_progress REAL NOT NULL DEFAULT 0, start_date TEXT, due_date TEXT,
  status TEXT NOT NULL DEFAULT 'active', milestone_id TEXT, notes TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE milestones (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  phase INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open', "order" INTEGER NOT NULL DEFAULT 0, template_key TEXT, done_at INTEGER,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE books (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  title TEXT NOT NULL, author TEXT NOT NULL DEFAULT '', topic TEXT NOT NULL DEFAULT '', learning_goal TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned', due_date TEXT, progress INTEGER, pages INTEGER, notes TEXT NOT NULL DEFAULT '',
  practice TEXT NOT NULL DEFAULT '', catalog_key TEXT, reason TEXT NOT NULL DEFAULT '', status_changed_at INTEGER,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE promo_tasks (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  lesson_key TEXT, title TEXT NOT NULL, channel TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'todo',
  due_date TEXT, project_id TEXT, notes TEXT NOT NULL DEFAULT '', result TEXT NOT NULL DEFAULT '', done_at INTEGER,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE care (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  at INTEGER NOT NULL, date TEXT NOT NULL, signal TEXT NOT NULL, until TEXT, note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE mentor_messages (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  role TEXT NOT NULL, content TEXT NOT NULL, at INTEGER NOT NULL, proposal_id TEXT, cards TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE proposals (
  user_id TEXT NOT NULL, id TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, srv_ts INTEGER NOT NULL,
  source TEXT NOT NULL, title TEXT NOT NULL, rationale TEXT NOT NULL DEFAULT '', changes TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending', decided_at INTEGER,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE push_subscriptions (
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, endpoint)
);
CREATE INDEX idx_profile_sync ON profile(user_id, srv_ts);
CREATE INDEX idx_routines_sync ON routines(user_id, srv_ts);
CREATE INDEX idx_routine_exceptions_sync ON routine_exceptions(user_id, srv_ts);
CREATE INDEX idx_day_states_sync ON day_states(user_id, srv_ts);
CREATE INDEX idx_events_sync ON events(user_id, srv_ts);
CREATE INDEX idx_sessions_sync ON sessions(user_id, srv_ts);
CREATE INDEX idx_attempts_sync ON attempts(user_id, srv_ts);
CREATE INDEX idx_skill_levels_sync ON skill_levels(user_id, srv_ts);
CREATE INDEX idx_projects_sync ON projects(user_id, srv_ts);
CREATE INDEX idx_goals_sync ON goals(user_id, srv_ts);
CREATE INDEX idx_milestones_sync ON milestones(user_id, srv_ts);
CREATE INDEX idx_books_sync ON books(user_id, srv_ts);
CREATE INDEX idx_promo_tasks_sync ON promo_tasks(user_id, srv_ts);
CREATE INDEX idx_care_sync ON care(user_id, srv_ts);
CREATE INDEX idx_mentor_messages_sync ON mentor_messages(user_id, srv_ts);
CREATE INDEX idx_proposals_sync ON proposals(user_id, srv_ts);
