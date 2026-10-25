-- Artist Development: own style description and techniques the artist wants to extract from references.
ALTER TABLE profile ADD COLUMN style_text TEXT NOT NULL DEFAULT '';
ALTER TABLE profile ADD COLUMN techniques TEXT NOT NULL DEFAULT '[]';
