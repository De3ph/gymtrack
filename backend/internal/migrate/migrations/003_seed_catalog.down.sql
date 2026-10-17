-- Rollback for migration 003 (exercise catalog seed).
--
-- Removes only the exercises this migration seeds. Custom exercises are kept.
--
-- Lookup rows (muscle_groups / equipment_definitions) are intentionally NOT
-- deleted: they are shared reference data, may have existed before this
-- migration (cmd/ensure-schema creates some of the same codes) or be
-- referenced by user-created exercises. Deleting them would either remove
-- data this migration did not create or violate the exercises FK.

SET search_path = public, pg_temp;

DELETE FROM exercises
WHERE name IN (
  'Barbell Bench Press',
  'Dumbbell Bench Press',
  'Incline Barbell Bench Press',
  'Incline Dumbbell Press',
  'Decline Bench Press',
  'Chest Fly (Machine)',
  'Cable Chest Fly',
  'Push-Up',
  'Dumbbell Pullover',
  'Barbell Row',
  'Dumbbell Row',
  'Pull-Up',
  'Chin-Up',
  'Lat Pulldown',
  'Seated Cable Row',
  'T-Bar Row',
  'Face Pull',
  'Overhead Press (Barbell)',
  'Dumbbell Shoulder Press',
  'Lateral Raise',
  'Front Raise',
  'Reverse Fly',
  'Arnold Press',
  'Upright Row',
  'Dumbbell Shrug',
  'Barbell Curl',
  'Dumbbell Curl',
  'Hammer Curl',
  'Tricep Pushdown',
  'Skull Crusher',
  'Tricep Dip',
  'Concentration Curl',
  'Overhead Tricep Extension',
  'Barbell Back Squat',
  'Front Squat',
  'Leg Press',
  'Romanian Deadlift',
  'Leg Curl (Machine)',
  'Leg Extension (Machine)',
  'Standing Calf Raise',
  'Dumbbell Lunge',
  'Goblet Squat',
  'Barbell Hip Thrust',
  'Leg Raise',
  'Russian Twist',
  'Cable Crunch',
  'Hanging Leg Raise',
  'Pallof Press',
  'Deadlift (Conventional)',
  'Sumo Deadlift',
  'Power Clean',
  'Kettlebell Swing',
  'Burpee',
  'Farmer''s Walk',
  'Barbell Thruster',
  'Box Jump',
  'Treadmill Running',
  'Stationary Bike'
);
