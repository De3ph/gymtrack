-- Backfill setType on every set stored in JSONB.
--
-- Set types are a new field: rows written before it existed have no "setType"
-- key at all. The API no longer defaults on read, so existing workouts and
-- workout plans are normalised here to "working" — the type a set had before
-- the field was introduced.
--
-- Both columns hold an array of exercises, each with an array of sets. The
-- nested aggregates rebuild those arrays in their original order and leave
-- every other key untouched.

UPDATE workouts
SET exercises = (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_set(
                ex.value,
                '{sets}',
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            s.value || '{"setType":"working"}'::jsonb
                            ORDER BY s.ordinality
                        )
                        FROM jsonb_array_elements(
                            COALESCE(ex.value -> 'sets', '[]'::jsonb)
                        ) WITH ORDINALITY AS s(value, ordinality)
                    ),
                    '[]'::jsonb
                )
            )
            ORDER BY ex.ordinality
        ),
        '[]'::jsonb
    )
    FROM jsonb_array_elements(exercises) WITH ORDINALITY AS ex(value, ordinality)
)
WHERE jsonb_typeof(exercises) = 'array';

UPDATE workout_plans
SET exercises = (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_set(
                ex.value,
                '{sets}',
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            s.value || '{"setType":"working"}'::jsonb
                            ORDER BY s.ordinality
                        )
                        FROM jsonb_array_elements(
                            COALESCE(ex.value -> 'sets', '[]'::jsonb)
                        ) WITH ORDINALITY AS s(value, ordinality)
                    ),
                    '[]'::jsonb
                )
            )
            ORDER BY ex.ordinality
        ),
        '[]'::jsonb
    )
    FROM jsonb_array_elements(exercises) WITH ORDINALITY AS ex(value, ordinality)
)
WHERE jsonb_typeof(exercises) = 'array';
