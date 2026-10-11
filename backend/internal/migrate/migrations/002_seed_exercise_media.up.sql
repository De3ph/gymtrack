-- Migration 002: Seed exercise media URLs (idempotent, non-destructive)
--
-- Backfills media_url and media_type for exercises that have NULL media.
-- Uses the free-exercise-db dataset hosted on GitHub's raw CDN.
-- Every statement is guarded by `media_url IS NULL` so re-running never
-- clobbers custom URLs an operator may have added.
--
-- Names are matched exactly against exercises.name with common spelling
-- variants. Missing names simply keep media_url NULL (valid state).
-- media_type is set to 'image' (the dataset ships still illustrations).

-- One base URL for the whole dataset: the folder name under exercises/ is
-- the asset's dataset id, which is why each row below supplies only a path.
UPDATE exercises e
SET media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/' || m.asset_path,
    media_type = 'image'
FROM (VALUES
  -- Chest / pressing
  ('Bench Press',                   'Barbell_Bench_Press_-_Medium_Grip/0.jpg'),
  ('Bench Press (Barbell)',         'Barbell_Bench_Press_-_Medium_Grip/0.jpg'),
  ('Barbell Bench Press',           'Barbell_Bench_Press_-_Medium_Grip/0.jpg'),
  ('Incline Barbell Bench Press',   'Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg'),
  ('Incline Dumbbell Press',        'Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg'),
  ('Decline Bench Press',           'Decline_Barbell_Bench_Press/0.jpg'),
  ('Smith Machine Bench Press',     'Smith_Machine_Bench_Press/0.jpg'),
  ('Close-Grip Bench Press',        'Smith_Machine_Close-Grip_Bench_Press/0.jpg'),
  ('Dumbbell Bench Press',          'Dumbbell_Bench_Press/0.jpg'),
  ('Cable Chest Fly',               'Flat_Bench_Cable_Flyes/0.jpg'),
  ('Chest Fly (Machine)',           'Incline_Cable_Flye/0.jpg'),
  ('Push-Up',                       'Decline_Push-Up/0.jpg'),
  ('Push Up',                       'Decline_Push-Up/0.jpg'),
  ('Pushups',                       'Decline_Push-Up/0.jpg'),
  ('Push-Ups',                      'Decline_Push-Up/0.jpg'),
  ('Pallof Press',                  'Pallof_Press/0.jpg'),

  -- Back / pulling
  ('Deadlift',                      'Barbell_Deadlift/0.jpg'),
  ('Barbell Deadlift',              'Barbell_Deadlift/0.jpg'),
  ('Deadlift (Conventional)',       'Barbell_Deadlift/0.jpg'),
  ('Conventional Deadlift',         'Barbell_Deadlift/0.jpg'),
  ('Sumo Deadlift',                 'Sumo_Deadlift/0.jpg'),
  ('Romanian Deadlift',             'Romanian_Deadlift/0.jpg'),
  ('RDL',                           'Romanian_Deadlift/0.jpg'),
  ('Good Morning',                  'Good_Morning/0.jpg'),
  ('Pull-Up',                       'Pullups/0.jpg'),
  ('Pull Up',                       'Pullups/0.jpg'),
  ('Pullups',                       'Pullups/0.jpg'),
  ('Assisted Pull-Up',              'Band_Assisted_Pull-Up/0.jpg'),
  ('Chin-Up',                       'Chin-Up/0.jpg'),
  ('Lat Pulldown',                  'Wide-Grip_Lat_Pulldown/0.jpg'),
  ('Barbell Row',                   'Bent_Over_Barbell_Row/0.jpg'),
  ('Bent Over Row',                 'Bent_Over_Barbell_Row/0.jpg'),
  ('Bent-Over Barbell Row',         'Bent_Over_Barbell_Row/0.jpg'),
  ('Seated Cable Row',              'Seated_Cable_Rows/0.jpg'),
  ('Dumbbell Row',                  'One-Arm_Dumbbell_Row/0.jpg'),
  ('One-Arm Dumbbell Row',          'One-Arm_Dumbbell_Row/0.jpg'),
  ('Bent Over Dumbbell Row',        'Bent_Over_Two-Dumbbell_Row/0.jpg'),
  ('T-Bar Row',                     'T-Bar_Row_with_Handle/0.jpg'),
  ('Upright Row',                   'Smith_Machine_Upright_Row/0.jpg'),
  ('Face Pull',                     'Smith_Machine_Upright_Row/0.jpg'),
  ('Reverse Fly',                   'Reverse_Flyes/0.jpg'),
  ('Barbell Thruster',              'Kettlebell_Thruster/0.jpg'),

  -- Legs
  ('Squat',                         'Barbell_Full_Squat/0.jpg'),
  ('Back Squat',                    'Barbell_Full_Squat/0.jpg'),
  ('Barbell Squat',                 'Barbell_Full_Squat/0.jpg'),
  ('Barbell Back Squat',            'Barbell_Full_Squat/0.jpg'),
  ('Goblet Squat',                  'Barbell_Full_Squat/0.jpg'),
  ('Front Squat',                   'Front_Squat_Clean_Grip/0.jpg'),
  ('Hack Squat',                    'Barbell_Hack_Squat/0.jpg'),
  ('Leg Press',                     'Leg_Press/0.jpg'),
  ('Leg Extension (Machine)',       'Leg_Extensions/0.jpg'),
  ('Leg Curl (Machine)',            'Lying_Leg_Curls/0.jpg'),
  ('Leg Curl',                      'Lying_Leg_Curls/0.jpg'),
  ('Lying Leg Curl',                'Lying_Leg_Curls/0.jpg'),
  ('Hamstring Curl',                'Lying_Leg_Curls/0.jpg'),
  ('Standing Calf Raise',           'Barbell_Seated_Calf_Raise/0.jpg'),
  ('Calf Raise',                    'Barbell_Seated_Calf_Raise/0.jpg'),
  ('Dumbbell Lunge',                'Barbell_Lunge/0.jpg'),
  ('Leg Raise',                     'Front_Leg_Raises/0.jpg'),
  ('Hanging Leg Raise',             'Hanging_Leg_Raise/0.jpg'),
  ('Barbell Hip Thrust',            'Barbell_Hip_Thrust/0.jpg'),
  ('Hip Thrust',                    'Barbell_Hip_Thrust/0.jpg'),
  ('Glute Bridge',                  'Barbell_Glute_Bridge/0.jpg'),
  ('Hip Bridge',                    'Barbell_Glute_Bridge/0.jpg'),

  -- Shoulders
  ('Shoulder Press',                'Dumbbell_Shoulder_Press/0.jpg'),
  ('Overhead Press',                'Dumbbell_Shoulder_Press/0.jpg'),
  ('Overhead Press (Barbell)',      'Barbell_Shoulder_Press/0.jpg'),
  ('Military Press',                'Dumbbell_Shoulder_Press/0.jpg'),
  ('Dumbbell Shoulder Press',       'Dumbbell_Shoulder_Press/0.jpg'),
  ('Arnold Press',                  'Arnold_Dumbbell_Press/0.jpg'),
  ('Lateral Raise',                 'Cable_Seated_Lateral_Raise/0.jpg'),
  ('Side Lateral Raise',            'Cable_Seated_Lateral_Raise/0.jpg'),
  ('Dumbbell Lateral Raise',        'Cable_Seated_Lateral_Raise/0.jpg'),
  ('Front Raise',                   'Front_Raise_And_Pullover/0.jpg'),
  ('Dumbbell Shrug',                'Barbell_Shrug/0.jpg'),
  ('Barbell Shrug',                 'Barbell_Shrug/0.jpg'),

  -- Arms
  ('Barbell Curl',                  'Barbell_Curl/0.jpg'),
  ('Biceps Curl',                   'EZ-Bar_Curl/0.jpg'),
  ('EZ-Bar Curl',                   'EZ-Bar_Curl/0.jpg'),
  ('EZ Bar Curl',                   'EZ-Bar_Curl/0.jpg'),
  ('Dumbbell Curl',                 'Incline_Dumbbell_Curl/0.jpg'),
  ('Dumbbell Biceps Curl',          'Incline_Dumbbell_Curl/0.jpg'),
  ('Hammer Curl',                   'Hammer_Curls/0.jpg'),
  ('Concentration Curl',            'Concentration_Curls/0.jpg'),
  ('Tricep Pushdown',               'Triceps_Pushdown/0.jpg'),
  ('Triceps Pushdown',              'Triceps_Pushdown/0.jpg'),
  ('Triceps Push-Down',             'Triceps_Pushdown/0.jpg'),
  ('Cable Triceps Pushdown',        'Triceps_Pushdown/0.jpg'),
  ('Overhead Tricep Extension',     'Overhead_Triceps/0.jpg'),
  ('Skull Crusher',                 'EZ-Bar_Skullcrusher/0.jpg'),
  ('Tricep Dip',                    'Dips_-_Triceps_Version/0.jpg'),
  ('Dumbbell Pullover',             'Straight-Arm_Dumbbell_Pullover/0.jpg'),

  -- Conditioning / core
  ('Kettlebell Swing',              'One-Arm_Kettlebell_Swings/0.jpg'),
  ('Kettlebell Swings',             'One-Arm_Kettlebell_Swings/0.jpg'),
  ('Box Jump',                      'Front_Box_Jump/0.jpg'),
  -- No burpee entry: the dataset has none, so that row keeps media_url NULL
  -- and renders the placeholder rather than a wrong demonstration.
  ('Farmer''s Walk',                'Farmers_Walk/0.jpg'),
  ('Stationary Bike',               'Bicycling_Stationary/0.jpg'),
  ('Treadmill Running',             'Running_Treadmill/0.jpg'),
  ('Plank',                         'Plank/0.jpg'),
  ('Forearm Plank',                 'Plank/0.jpg'),
  ('Sit-Up',                        '3_4_Sit-Up/0.jpg'),
  ('Sit Up',                        '3_4_Sit-Up/0.jpg'),
  ('Crunch',                        'Cable_Crunch/0.jpg'),
  ('Ab Crunch',                     'Cable_Crunch/0.jpg'),
  ('Cable Crunch',                  'Cable_Crunch/0.jpg'),
  ('Russian Twist',                 'Russian_Twist/0.jpg'),
  ('Mountain Climber',              'Mountain_Climbers/0.jpg'),
  ('Mountain Climbers',             'Mountain_Climbers/0.jpg'),
  ('Dead Bug',                      'Dead_Bug/0.jpg'),
  ('Power Clean',                   'Power_Clean/0.jpg')
) AS m(exercise_name, asset_path)
WHERE e.name = m.exercise_name
  AND e.media_url IS NULL;

-- Self-healing: if migration 008 ran against a table that already carried a
-- 'gif' default, any row the first UPDATE skipped would otherwise keep the
-- wrong renderer while pointing at a still image.
UPDATE exercises
SET media_type = 'image'
WHERE media_url LIKE 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/%'
  AND media_type <> 'image';