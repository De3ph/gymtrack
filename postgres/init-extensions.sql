-- Enable PostgreSQL extensions in the application database.
--
-- The shared libraries must be preloaded via shared_preload_libraries in
-- docker-compose.yml BEFORE these statements can succeed (pgaudit and
-- pg_stat_statements both require preloading).
--
-- IMPORTANT: scripts in /docker-entrypoint-initdb.d/ only run on FIRST
-- database initialisation (i.e. when the pgdata volume is empty). If the
-- volume already exists, the server will skip this file. In that case run
-- it manually, e.g.:
--   docker exec -i gymtrack-postgres psql -U postgres -d gymtrack \
--     < postgres/init-extensions.sql

-- pg_stat_statements: per-query execution statistics for performance
-- monitoring (scraped by Prometheus / viewed in Grafana).
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- pgaudit: audit logging of DDL, writes and other database activity.
CREATE EXTENSION IF NOT EXISTS pgaudit;


