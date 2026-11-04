-- Days of picking in the data, to turn totals into a daily figure.
SELECT CAST(COUNT(DISTINCT day) AS INTEGER) AS days FROM lines;
