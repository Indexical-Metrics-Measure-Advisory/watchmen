ALTER TABLE trigger_model
    ADD COLUMN priority DECIMAL(20) NOT NULL;
ALTER TABLE trigger_model
    ADD COLUMN module_trigger_id DECIMAL(20) NOT NULL;