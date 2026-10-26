-- Remove setType from every set stored in JSONB, restoring the pre-migration
-- shape. Only the "setType" key is dropped; all other set data is preserved and
-- the exercise/set order is kept.

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
                            s.value - 'setType'
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
                            s.value - 'setType'
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
