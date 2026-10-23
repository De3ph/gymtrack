DROP INDEX IF EXISTS idx_relationships_open_pair;

-- Restoring the old pair-wide constraint requires collapsing the history this
-- migration began to keep. Keep the newest row per pair so the constraint can
-- be re-added on a database that has reconnected at least once.
DELETE FROM public.relationships AS older
    USING public.relationships AS newer
    WHERE older.trainer_id = newer.trainer_id
      AND older.athlete_id = newer.athlete_id
      AND older.id < newer.id;

ALTER TABLE public.relationships
    ADD CONSTRAINT relationships_trainer_id_athlete_id_key UNIQUE (trainer_id, athlete_id);
