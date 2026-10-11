-- Migration 006: Password reset tokens
-- Stores only the SHA-256 hash of single-use, expiring reset tokens.
-- The raw token exists solely in the emailed reset link.

CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- token_hash is already indexed by the UNIQUE constraint above.
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
