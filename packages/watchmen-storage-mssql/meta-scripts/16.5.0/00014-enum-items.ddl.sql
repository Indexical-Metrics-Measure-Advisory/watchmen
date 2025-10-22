DROP INDEX i_enum_items_1 ON enum_items;
ALTER TABLE enum_items
ALTER COLUMN code VARCHAR(200);
ALTER TABLE enum_items
ALTER COLUMN label VARCHAR(1000);
CREATE INDEX i_enum_items_1 ON enum_items (code);