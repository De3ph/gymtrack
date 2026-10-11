-- Rollback the squashed baseline migration.
-- Destroys all data in the public schema.
-- Only use in a throwaway environment.

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;