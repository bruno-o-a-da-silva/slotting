-- One row per order line picked. A line is one trip to one slot.
CREATE TABLE lines (
    day      VARCHAR NOT NULL,
    order_id VARCHAR NOT NULL,
    sku      VARCHAR NOT NULL,
    qty      INTEGER NOT NULL CHECK (qty > 0)
);
