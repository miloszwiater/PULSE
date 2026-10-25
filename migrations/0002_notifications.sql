-- Sent reminders; the primary key makes each reminder idempotent per user.
CREATE TABLE notification_log (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, key)
);
