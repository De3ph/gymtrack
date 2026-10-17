-- Migration 003: Seed the exercise catalog (muscle groups, equipment, exercises).
--
-- A fresh production database previously had empty lookup tables and an empty
-- exercise catalog because only cmd/ensure-schema (a destructive dev tool)
-- seeded them. This migration makes a migrated database usable out of the box.
--
-- Every statement is idempotent:
--   * lookup rows upsert on code;
--   * exercise rows use ON CONFLICT (name) DO NOTHING (exercises_name_unique);
--   * foreign keys are resolved by code, never by hard-coded id, so the
--     mapping survives databases seeded in a different order.
--
-- Seed rows are staged in a temp table and FK codes are validated up front, so
-- a typo fails the migration instead of being silently dropped by a JOIN.
--
-- Must be kept in sync with the taxonomy/exercises in cmd/seed/main.go.

SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- Muscle groups
-- ---------------------------------------------------------------------------
INSERT INTO muscle_groups (code, description) VALUES
  ('chest',     'Chest'),
  ('back',      'Back'),
  ('shoulders', 'Shoulders'),
  ('arms',      'Arms'),
  ('legs',      'Legs'),
  ('core',      'Core'),
  ('full-body', 'Full Body')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- Equipment
-- ---------------------------------------------------------------------------
INSERT INTO equipment_definitions (code, description) VALUES
  ('barbell',         'Barbell'),
  ('dumbbell',        'Dumbbell'),
  ('machine',         'Machine'),
  ('cable',           'Cable'),
  ('bodyweight',      'Bodyweight'),
  ('kettlebell',      'Kettlebell'),
  ('resistance-band', 'Resistance Band'),
  ('other',           'Other')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- Exercises (58 rows across the seven muscle groups)
--
-- Stage the rows first, then validate every muscle/equipment code, then insert.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS _seed_exercises;
CREATE TEMP TABLE _seed_exercises (
  name           text PRIMARY KEY,
  category       text NOT NULL,
  muscle_code    text NOT NULL,
  equipment_code text NOT NULL,
  instructions   text NOT NULL
);

INSERT INTO _seed_exercises (name, category, muscle_code, equipment_code, instructions) VALUES
  -- Chest
  ('Barbell Bench Press',          'strength', 'chest',     'barbell',         'Lie on flat bench, grip barbell at shoulder width, lower to mid-chest, press up.'),
  ('Dumbbell Bench Press',         'strength', 'chest',     'dumbbell',        'Lie on flat bench holding dumbbells at chest level, press up until arms fully extended, lower with control.'),
  ('Incline Barbell Bench Press',  'strength', 'chest',     'barbell',         'Set bench to 30-45 degrees, press barbell from upper chest to full extension.'),
  ('Incline Dumbbell Press',       'strength', 'chest',     'dumbbell',        'Bench at 30-45 degrees, press dumbbells from upper chest to full extension.'),
  ('Decline Bench Press',          'strength', 'chest',     'barbell',         'Lie on decline bench, press barbell from lower chest to full extension.'),
  ('Chest Fly (Machine)',          'strength', 'chest',     'machine',         'Sit at pec deck machine, bring handles together in front of chest with slight elbow bend.'),
  ('Cable Chest Fly',              'strength', 'chest',     'cable',           'Stand between cable columns, bring hands together in front of chest with slight elbow bend.'),
  ('Push-Up',                      'strength', 'chest',     'bodyweight',      'Start in plank position with hands shoulder-width apart, lower chest to floor, push back up.'),
  ('Dumbbell Pullover',            'strength', 'chest',     'dumbbell',        'Lie across a flat bench with hips low, hold one dumbbell with both hands above chest, lower behind head, bring back up.'),

  -- Back
  ('Barbell Row',                  'strength', 'back',      'barbell',         'Bend at hips with a flat back, grip barbell at shoulder width, pull to lower ribcage, lower with control.'),
  ('Dumbbell Row',                 'strength', 'back',      'dumbbell',        'Place one knee and hand on a bench, pull dumbbell to hip with the other arm, lower with control.'),
  ('Pull-Up',                      'strength', 'back',      'bodyweight',      'Hang from a bar with palms facing away, pull chin over the bar, lower with control.'),
  ('Chin-Up',                      'strength', 'back',      'bodyweight',      'Hang from a bar with palms facing toward you, pull chin over the bar, lower with control.'),
  ('Lat Pulldown',                 'strength', 'back',      'cable',           'Sit at cable machine, grip bar wide overhead, pull to upper chest, return with control.'),
  ('Seated Cable Row',             'strength', 'back',      'cable',           'Sit with feet braced, grip handle, pull to lower abdomen keeping back straight, return with control.'),
  ('T-Bar Row',                    'strength', 'back',      'barbell',         'Straddle the T-bar, bend with a flat back, pull the bar to chest, lower with control.'),
  ('Face Pull',                    'strength', 'back',      'cable',           'Set cable at upper-chest height with rope attachment, pull toward face while externally rotating shoulders.'),

  -- Shoulders
  ('Overhead Press (Barbell)',     'strength', 'shoulders', 'barbell',         'Stand with barbell at shoulders, press overhead until arms fully extended, lower to shoulders.'),
  ('Dumbbell Shoulder Press',      'strength', 'shoulders', 'dumbbell',        'Sit or stand with dumbbells at shoulder height, press overhead, lower with control.'),
  ('Lateral Raise',                'strength', 'shoulders', 'dumbbell',        'Stand with dumbbells at sides, raise arms out to the side to shoulder height, lower with control.'),
  ('Front Raise',                  'strength', 'shoulders', 'dumbbell',        'Stand with dumbbells in front of thighs, raise arms forward to shoulder height, lower with control.'),
  ('Reverse Fly',                  'strength', 'shoulders', 'dumbbell',        'Bend forward with a flat back holding dumbbells, raise arms out to sides, squeeze shoulder blades together.'),
  ('Arnold Press',                 'strength', 'shoulders', 'dumbbell',        'Start with dumbbells in front of shoulders palms facing you, press overhead while rotating palms forward.'),
  ('Upright Row',                  'strength', 'shoulders', 'barbell',         'Stand with barbell at thigh level, pull straight up to chin leading with elbows, lower with control.'),
  ('Dumbbell Shrug',               'strength', 'shoulders', 'dumbbell',        'Stand holding dumbbells at sides, shrug shoulders up toward ears, hold briefly, lower.'),

  -- Arms
  ('Barbell Curl',                 'strength', 'arms',      'barbell',         'Stand with barbell at thigh level, curl bar to shoulders keeping elbows fixed, lower with control.'),
  ('Dumbbell Curl',                'strength', 'arms',      'dumbbell',        'Stand with dumbbells at sides, curl to shoulders alternating or together, keep elbows fixed.'),
  ('Hammer Curl',                  'strength', 'arms',      'dumbbell',        'Stand with dumbbells at sides palms facing each other, curl to shoulders keeping palms facing in.'),
  ('Tricep Pushdown',              'strength', 'arms',      'cable',           'Set cable at high position, grip rope or bar, push down to full arm extension, return with control.'),
  ('Skull Crusher',                'strength', 'arms',      'barbell',         'Lie on bench with barbell or EZ-bar above face, lower toward forehead by bending elbows, extend back up.'),
  ('Tricep Dip',                   'strength', 'arms',      'bodyweight',      'Grip parallel bars or bench edge, lower body by bending elbows to 90 degrees, push back up.'),
  ('Concentration Curl',           'strength', 'arms',      'dumbbell',        'Sit on bench, rest elbow against inner thigh, curl dumbbell to shoulder, lower with control.'),
  ('Overhead Tricep Extension',    'strength', 'arms',      'dumbbell',        'Stand or sit holding a dumbbell overhead with both hands, lower behind head by bending elbows, extend back up.'),

  -- Legs
  ('Barbell Back Squat',           'strength', 'legs',      'barbell',         'Rest barbell on upper back, feet shoulder-width apart, squat to at least parallel, drive back up.'),
  ('Front Squat',                  'strength', 'legs',      'barbell',         'Rest barbell across front of shoulders, keep torso upright, squat to parallel, drive back up.'),
  ('Leg Press',                    'strength', 'legs',      'machine',         'Sit in leg press machine, place feet shoulder-width on platform, lower until knees at 90 degrees, press back up.'),
  ('Romanian Deadlift',            'strength', 'legs',      'barbell',         'Hold barbell at hip level, hinge at hips pushing hips back, lower bar along legs until hamstrings stretch, return.'),
  ('Leg Curl (Machine)',           'strength', 'legs',      'machine',         'Lie face down on leg curl machine, curl heels toward glutes, lower with control.'),
  ('Leg Extension (Machine)',      'strength', 'legs',      'machine',         'Sit on leg extension machine, extend legs until straight, lower with control.'),
  ('Standing Calf Raise',          'strength', 'legs',      'machine',         'Stand on calf raise machine with shoulders under pads, rise up on toes, lower with control.'),
  ('Dumbbell Lunge',               'strength', 'legs',      'dumbbell',        'Hold dumbbells at sides, step forward into lunge, lower back knee toward floor, push back to start.'),
  ('Goblet Squat',                 'strength', 'legs',      'kettlebell',      'Hold a kettlebell or dumbbell at chest, squat to parallel keeping torso upright, drive back up.'),
  ('Barbell Hip Thrust',           'strength', 'legs',      'barbell',         'Sit on floor with upper back against bench, barbell across hips, thrust upward squeezing glutes at top.'),

  -- Core
  ('Leg Raise',                    'strength', 'core',      'bodyweight',      'Lie on back with legs straight, raise legs to 90 degrees keeping them straight, lower with control.'),
  ('Russian Twist',                'strength', 'core',      'bodyweight',      'Sit with feet off floor, lean back slightly, rotate torso side to side optionally holding a weight.'),
  ('Cable Crunch',                 'strength', 'core',      'cable',           'Kneel facing cable machine with rope attached overhead, crunch forward curling torso, return with control.'),
  ('Hanging Leg Raise',            'strength', 'core',      'bodyweight',      'Hang from a bar, raise legs to parallel or higher keeping them straight, lower with control.'),
  ('Pallof Press',                 'strength', 'core',      'cable',           'Stand sideways to cable column, grip handle at chest height, press hands forward resisting rotation, return.'),

  -- Full Body
  ('Deadlift (Conventional)',      'strength', 'full-body', 'barbell',         'Stand with feet hip-width apart, barbell over mid-foot, bend down grip bar, drive through heels to stand up, lower with control.'),
  ('Sumo Deadlift',                'strength', 'full-body', 'barbell',         'Stand with feet wide toes pointed out, grip bar inside knees, drive through heels to stand up.'),
  ('Power Clean',                  'strength', 'full-body', 'barbell',         'Pull barbell from floor to shoulders in one explosive motion, catch in partial squat, stand up.'),
  ('Kettlebell Swing',             'strength', 'full-body', 'kettlebell',      'Stand with kettlebell between legs, hinge at hips, swing to chest height using hip drive.'),
  ('Burpee',                       'cardio',   'full-body', 'bodyweight',      'From standing squat down, kick feet to plank, do push-up, jump feet forward, explode up.'),
  ('Farmer''s Walk',               'strength', 'full-body', 'dumbbell',        'Hold heavy dumbbells at sides, walk with upright posture for distance or time.'),
  ('Barbell Thruster',             'strength', 'full-body', 'barbell',         'Hold barbell at shoulders, squat to parallel, drive up into overhead press in one fluid motion.'),
  ('Box Jump',                     'cardio',   'full-body', 'other',           'Stand facing a sturdy box, squat slightly, jump onto box landing softly, step down.'),
  ('Treadmill Running',            'cardio',   'full-body', 'machine',         'Run or walk on treadmill at desired speed and incline.'),
  ('Stationary Bike',              'cardio',   'full-body', 'machine',         'Cycle on a stationary bike at desired resistance and pace.');

-- Fail loudly on a typo instead of letting the JOIN drop rows silently.
DO $$
DECLARE
  unresolved text;
BEGIN
  SELECT string_agg(DISTINCT s.muscle_code || '/' || s.equipment_code, ', ')
    INTO unresolved
    FROM _seed_exercises s
   WHERE NOT EXISTS (SELECT 1 FROM muscle_groups mg WHERE mg.code = s.muscle_code)
      OR NOT EXISTS (SELECT 1 FROM equipment_definitions eq WHERE eq.code = s.equipment_code);

  IF unresolved IS NOT NULL THEN
    RAISE EXCEPTION 'seed catalog: unresolved muscle/equipment code(s): %', unresolved;
  END IF;
END
$$;

INSERT INTO exercises (name, category, muscle_group_id, equipment_id, instructions)
SELECT s.name, s.category, mg.id, eq.id, s.instructions
FROM _seed_exercises s
JOIN muscle_groups mg ON mg.code = s.muscle_code
JOIN equipment_definitions eq ON eq.code = s.equipment_code
ON CONFLICT (name) DO NOTHING;

DROP TABLE _seed_exercises;
