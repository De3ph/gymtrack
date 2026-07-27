# Custom PostgreSQL 16 image bundling extra extensions.
#
# The base image is Debian-based so we can install community extensions via
# apt from the PostgreSQL APT repository (already configured in the official
# postgres image). The Alpine variant does not ship these packages.
#
# Extensions added here:
#   - pgaudit     : session/object audit logging (requires shared_preload_libraries)
#   - pg_partman  : native partition management (bgw requires shared_preload_libraries)
#
# pg_stat_statements ships with postgresql-contrib and is already present in
# the base image; it only needs to be preloaded and `CREATE EXTENSION`'d at
# runtime (see postgres/init-extensions.sql).
FROM postgres:16

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-16-pgaudit \
        postgresql-16-partman \
    && rm -rf /var/lib/apt/lists/*
