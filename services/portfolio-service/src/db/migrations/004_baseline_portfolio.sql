-- Baseline portfolio: follows every nightly call by buying or selling a fixed number of shares, so the change in
-- each position over time shows exactly what the advice did.
ALTER TABLE portfolios DROP CONSTRAINT IF EXISTS portfolios_kind_check;
ALTER TABLE portfolios ADD CONSTRAINT portfolios_kind_check CHECK (kind IN ('owner', 'shadow', 'baseline'));

-- The owner's test portfolio becomes the baseline (its test trades are kept). No-op where it does not exist.
UPDATE portfolios
SET name = 'Baseline Owner',
    kind = 'baseline',
    rules = rules || '{"follow_shares": 1, "max_position_pct": 100, "max_sector_pct": 100, "max_open_positions": 500}'::jsonb
WHERE name = 'Test Owner' AND kind = 'owner';
