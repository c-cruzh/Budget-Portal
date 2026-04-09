#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Ensure session table exists (connect-pg-simple can't create it in bundled production builds)
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS \"session\" (
  \"sid\" varchar NOT NULL COLLATE \"default\",
  \"sess\" json NOT NULL,
  \"expire\" timestamp(6) NOT NULL,
  CONSTRAINT \"session_pkey\" PRIMARY KEY (\"sid\")
);
CREATE INDEX IF NOT EXISTS \"IDX_session_expire\" ON \"session\" (\"expire\");
"
