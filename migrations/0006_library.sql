-- Library of artistic development: reading timeline and the optional feedback asked after finishing a book.
-- Additive only. `books.status` is free text, so the new "suggested" status needs no change here.

ALTER TABLE books ADD COLUMN started_at INTEGER;
ALTER TABLE books ADD COLUMN finished_at INTEGER;
ALTER TABLE books ADD COLUMN rating INTEGER;
ALTER TABLE books ADD COLUMN clarity TEXT;
ALTER TABLE books ADD COLUMN direction TEXT;
