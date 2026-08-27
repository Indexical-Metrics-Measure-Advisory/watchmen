-- Deterministic fact table for the metric value-computation suite.
-- Expected aggregates: total=825.00, east=600.00, west=225.00, count=6
CREATE TABLE orders (
	order_id   VARCHAR(50)    NOT NULL,
	amount     DECIMAL(12, 2) NOT NULL,
	region     VARCHAR(20)    NOT NULL,
	ordered_at DATETIME       NOT NULL,
	PRIMARY KEY (order_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO orders (order_id, amount, region, ordered_at)
VALUES ('o1', 100.00, 'east', '2026-08-01 10:00:00'),
       ('o2', 200.00, 'east', '2026-08-02 10:00:00'),
       ('o3', 300.00, 'east', '2026-08-03 10:00:00'),
       ('o4', 50.00, 'west', '2026-08-04 10:00:00'),
       ('o5', 150.00, 'west', '2026-08-05 10:00:00'),
       ('o6', 25.00, 'west', '2026-08-06 10:00:00');
