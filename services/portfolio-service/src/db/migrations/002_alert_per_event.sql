-- One alert per event, not per ticker and day: two orders in the same ticker that fill on the same day each get
-- their own "order filled" alert. Alerts about the portfolio as a whole (no order, no position) still dedupe by
-- ticker, kind and date.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid = 'alerts'::regclass AND contype = 'u';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE alerts DROP CONSTRAINT %I', c); END IF;
END $$;

CREATE UNIQUE INDEX alerts_one_per_event
  ON alerts (portfolio_id, ticker, kind, run_date, (COALESCE(order_id, 0)), (COALESCE(position_id, 0)));
