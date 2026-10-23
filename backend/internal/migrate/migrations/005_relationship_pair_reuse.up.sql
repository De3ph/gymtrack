-- Reconnecting a terminated trainer-athlete pair was impossible: termination
-- is a status change, but the old pair-wide UNIQUE kept every earlier row and
-- a reconnect had to reuse it. Keeping one row per pair also erased the
-- relationship history.
--
-- Only *open* relationships (pending or active) must be unique per pair, so a
-- terminated row no longer reserves the pair. One active relationship per
-- athlete is already enforced by idx_relationships_one_active_per_athlete
-- (004).
ALTER TABLE public.relationships
    DROP CONSTRAINT IF EXISTS relationships_trainer_id_athlete_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_relationships_open_pair
    ON public.relationships (trainer_id, athlete_id)
    WHERE status IN ('pending', 'active');
