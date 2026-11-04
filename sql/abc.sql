-- Pareto of demand: lines per SKU, running share, and the ABC class.
-- A SKU is A while the share of picks before it is under $a, B while under $b, else C.
WITH v AS (
    SELECT sku, COUNT(*) AS picks, SUM(qty) AS units
    FROM lines
    GROUP BY sku
),
c AS (
    SELECT sku, picks, units,
           SUM(picks) OVER (ORDER BY picks DESC, sku ROWS UNBOUNDED PRECEDING) AS cum,
           SUM(picks) OVER () AS total
    FROM v
)
SELECT sku,
       CAST(picks AS INTEGER) AS picks,
       CAST(units AS INTEGER) AS units,
       CAST(cum AS DOUBLE) / total AS share,
       CASE
           WHEN cum - picks < $a * total THEN 'A'
           WHEN cum - picks < $b * total THEN 'B'
           ELSE 'C'
       END AS class
FROM c
ORDER BY picks DESC, sku;
