-- Migration 007: Audit trail for users
-- Trigger-based history. password_hash is never stored in audit snapshots.
-- Optional actor tracking: run `SET LOCAL app.current_user_id = '<id>'`
-- inside the same transaction before mutating users; otherwise changed_by is NULL.

CREATE TABLE user_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX idx_user_audit_logs_changed_at ON user_audit_logs(changed_at DESC);
CREATE INDEX idx_user_audit_logs_user_changed ON user_audit_logs(user_id, changed_at DESC);

CREATE OR REPLACE FUNCTION log_users_audit() RETURNS trigger AS $$
DECLARE
    actor_id INTEGER := NULL;
BEGIN
    BEGIN
        actor_id := NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        actor_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_audit_logs (user_id, action, old_data, new_data, changed_by)
        VALUES (NEW.user_id, 'INSERT', NULL, to_jsonb(NEW) - 'password_hash', actor_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO user_audit_logs (user_id, action, old_data, new_data, changed_by)
        VALUES (NEW.user_id, 'UPDATE', to_jsonb(OLD) - 'password_hash', to_jsonb(NEW) - 'password_hash', actor_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_audit_logs (user_id, action, old_data, new_data, changed_by)
        VALUES (OLD.user_id, 'DELETE', to_jsonb(OLD) - 'password_hash', NULL, actor_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_audit ON users;
CREATE TRIGGER trg_users_audit
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION log_users_audit();
