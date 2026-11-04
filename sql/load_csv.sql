-- Order lines from a CSV with header day,order,sku,qty.
INSERT INTO lines
SELECT day, "order", sku, qty
FROM read_csv($path, header = true, columns = {
    'day': 'VARCHAR', 'order': 'VARCHAR', 'sku': 'VARCHAR', 'qty': 'INTEGER'
});
