-- Paper portfolio schema. Table names are unqualified: migrate() runs this with search_path set to the
-- target schema (portfolio in production, a throwaway schema in tests).

CREATE TABLE portfolios (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('owner', 'shadow')),
  starting_cash numeric(16, 4) NOT NULL CHECK (starting_cash > 0),
  cash          numeric(16, 4) NOT NULL,
  rules         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_on    date NOT NULL,
  archived      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Decision journal: every analysis result, frozen as it was on the night.
CREATE TABLE candidates (
  id             serial PRIMARY KEY,
  run_date       date NOT NULL,
  ticker         text NOT NULL,
  source         text NOT NULL CHECK (source IN ('watchlist', 'screen', 'news', 'on_demand', 'reanalysis')),
  decision       text NOT NULL,
  confidence     numeric(6, 4),
  action_now     text,
  label          text NOT NULL,
  price          numeric(16, 4),
  trigger_price  numeric(16, 4),
  trigger_type   text,
  walk_away      numeric(16, 4),
  rationale      text,
  key_risks      jsonb NOT NULL DEFAULT '[]'::jsonb,
  pm             jsonb,
  inputs         jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile        text,
  fast_model     text,
  decision_model text,
  llm_seconds    integer,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_date, ticker, source)
);
CREATE INDEX candidates_ticker_date ON candidates (ticker, run_date DESC);

CREATE TABLE positions (
  id            serial PRIMARY KEY,
  portfolio_id  integer NOT NULL REFERENCES portfolios (id),
  ticker        text NOT NULL,
  direction     text NOT NULL CHECK (direction IN ('long', 'short')),
  quantity      numeric(18, 4) NOT NULL CHECK (quantity >= 0),
  avg_cost      numeric(16, 4) NOT NULL,
  opened_on     date NOT NULL,
  closed_on     date,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  source        text,
  candidate_id  integer REFERENCES candidates (id),
  stop_price    numeric(16, 4),
  target_price  numeric(16, 4),
  hold_until    date,
  realized_pnl  numeric(16, 4) NOT NULL DEFAULT 0,
  sector        text
);
-- One open position per ticker and direction in a portfolio; buying more adds to it.
CREATE UNIQUE INDEX positions_one_open ON positions (portfolio_id, ticker, direction) WHERE status = 'open';

CREATE TABLE orders (
  id             serial PRIMARY KEY,
  portfolio_id   integer NOT NULL REFERENCES portfolios (id),
  candidate_id   integer REFERENCES candidates (id),
  position_id    integer REFERENCES positions (id),
  ticker         text NOT NULL,
  direction      text NOT NULL CHECK (direction IN ('long', 'short')),
  intent         text NOT NULL CHECK (intent IN ('open', 'close')),
  kind           text NOT NULL CHECK (kind IN ('market', 'trigger')),
  trigger_price  numeric(16, 4),
  trigger_when   text CHECK (trigger_when IN ('above', 'below')),
  amount         numeric(16, 4),
  quantity       numeric(18, 4),
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'expired')),
  created_on     date NOT NULL,
  expires_on     date,
  filled_on      date,
  fill_price     numeric(16, 4),
  source         text,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_pending ON orders (portfolio_id) WHERE status = 'pending';

CREATE TABLE trades (
  id            serial PRIMARY KEY,
  portfolio_id  integer NOT NULL REFERENCES portfolios (id),
  position_id   integer NOT NULL REFERENCES positions (id),
  order_id      integer REFERENCES orders (id),
  ticker        text NOT NULL,
  direction     text NOT NULL,
  action        text NOT NULL CHECK (action IN ('open', 'add', 'reduce', 'close')),
  quantity      numeric(18, 4) NOT NULL CHECK (quantity > 0),
  price         numeric(16, 4) NOT NULL CHECK (price > 0),
  traded_on     date NOT NULL,
  source        text,
  realized_pnl  numeric(16, 4) NOT NULL DEFAULT 0,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- A pending order fills at most once.
CREATE UNIQUE INDEX trades_one_per_order ON trades (order_id) WHERE order_id IS NOT NULL;

CREATE TABLE alerts (
  id               serial PRIMARY KEY,
  portfolio_id     integer NOT NULL REFERENCES portfolios (id),
  position_id      integer REFERENCES positions (id),
  order_id         integer REFERENCES orders (id),
  ticker           text NOT NULL DEFAULT '',
  kind             text NOT NULL,
  severity         text NOT NULL CHECK (severity IN ('action', 'info')),
  message          text NOT NULL,
  run_date         date NOT NULL,
  data             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  acknowledged_at  timestamptz,
  UNIQUE (portfolio_id, ticker, kind, run_date)
);

CREATE TABLE snapshots (
  portfolio_id  integer NOT NULL REFERENCES portfolios (id),
  date          date NOT NULL,
  cash          numeric(16, 4) NOT NULL,
  long_value    numeric(16, 4) NOT NULL,
  short_value   numeric(16, 4) NOT NULL,
  equity        numeric(16, 4) NOT NULL,
  spy_close     numeric(16, 4),
  PRIMARY KEY (portfolio_id, date)
);

CREATE TABLE bars (
  ticker  text NOT NULL,
  date    date NOT NULL,
  open    numeric(16, 4) NOT NULL,
  high    numeric(16, 4) NOT NULL,
  low     numeric(16, 4) NOT NULL,
  close   numeric(16, 4) NOT NULL,
  PRIMARY KEY (ticker, date)
);

CREATE TABLE tickers (
  ticker      text PRIMARY KEY,
  name        text,
  sector      text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE source_picks (
  run_date  date NOT NULL,
  ticker    text NOT NULL,
  source    text NOT NULL CHECK (source IN ('screen', 'news')),
  score     numeric(12, 4),
  reasons   jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_date, ticker, source)
);

CREATE TABLE analysis_requests (
  id            serial PRIMARY KEY,
  ticker        text NOT NULL,
  reason        text NOT NULL CHECK (reason IN ('on_demand', 'stop_hit', 'target_hit', 'big_move', 'stale')),
  portfolio_id  integer REFERENCES portfolios (id),
  position_id   integer REFERENCES positions (id),
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  requested_at  timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  candidate_id  integer REFERENCES candidates (id),
  error         text
);
-- At most one live request per ticker: asking twice does not queue two runs.
CREATE UNIQUE INDEX analysis_requests_one_live ON analysis_requests (ticker) WHERE status IN ('queued', 'running');

CREATE TABLE runs (
  id           serial PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('nightly', 'weekly_review')),
  run_date     date NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  status       text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed')),
  summary      jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE reviews (
  id           serial PRIMARY KEY,
  week_ending  date NOT NULL UNIQUE,
  model        text,
  body_md      text NOT NULL,
  data         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
