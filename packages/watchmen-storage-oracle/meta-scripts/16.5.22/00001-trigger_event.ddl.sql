ALTER TABLE trigger_event ADD status NUMBER(1);
ALTER TABLE trigger_event ADD type NUMBER(1);
ALTER TABLE trigger_event ADD table_name VARCHAR2(50);
ALTER TABLE trigger_event ADD records CLOB;
ALTER TABLE trigger_event MODIFY (start_time NULL);
ALTER TABLE trigger_event MODIFY (end_time NULL);
