-- One athlete may have at most one active trainer. Application code checked
-- this before writing; the partial unique index makes the invariant
-- enforceable under concurrent activation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_relationships_one_active_per_athlete
    ON public.relationships (athlete_id)
    WHERE status = 'active';

-- Active lookups order by recency. The partial index covers both the status
-- filter and the sort, unlike idx_relationships_athlete (athlete_id, status).
CREATE INDEX IF NOT EXISTS idx_relationships_athlete_active_recent
    ON public.relationships (athlete_id, created_at DESC)
    WHERE status = 'active';

-- Trainer client lists read only active rows, newest first.
CREATE INDEX IF NOT EXISTS idx_relationships_trainer_active_recent
    ON public.relationships (trainer_id, created_at DESC)
    WHERE status = 'active';
