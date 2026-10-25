-- Profile: artist vision, values and preferred scene for the app background.
ALTER TABLE profile ADD COLUMN vision TEXT NOT NULL DEFAULT '';
ALTER TABLE profile ADD COLUMN "values" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE profile ADD COLUMN scene TEXT NOT NULL DEFAULT 'auto';
