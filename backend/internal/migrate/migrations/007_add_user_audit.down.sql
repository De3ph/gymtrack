DROP TRIGGER IF EXISTS trg_users_audit ON users;
DROP FUNCTION IF EXISTS log_users_audit();
DROP TABLE IF EXISTS user_audit_logs;
