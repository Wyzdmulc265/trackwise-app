-- Verify TrackWise schema is installed
-- Usage:
--   psql -U trackwise_admin -h localhost -d trackwise -f database/verify_setup.sql

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    RAISE EXCEPTION 'Missing extension uuid-ossp';
  END IF;
END$$;

\echo 'Expected tables:'
\dt public.*

\echo 'Checking required tables...'

DO $$
DECLARE
  required text[] := ARRAY[
    'businesses',
    'users',
    'categories',
    'inventory_items',
    'transactions',
    'pending_approvals',
    'history',
    'reports'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY required LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE EXCEPTION 'Missing table: %', t;
    END IF;
  END LOOP;
END$$;

\echo 'Checking updated_at columns...'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='businesses' AND column_name='updated_at'
  ) THEN
    RAISE EXCEPTION 'Missing updated_at on businesses';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='updated_at'
  ) THEN
    RAISE EXCEPTION 'Missing updated_at on users';
  END IF;
END$$;

\echo '✅ Postgres setup verification passed.'

