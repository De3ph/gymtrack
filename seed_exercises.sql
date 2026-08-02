-- ============================================================================
-- Seed Exercises - GymTrack
-- Auto-generates SERIAL ids via sequence; uses exercise name uniqueness for idempotency.
-- Safe to run multiple times.
-- ============================================================================

-- ============================================================================
-- 1. Lookup tables (muscle_groups, equipment_definitions) - idempotent
-- ============================================================================
INSERT INTO muscle_groups (id, code, description) VALUES
    (1, 'chest',     'Chest'),
    (2, 'back',      'Back'),
    (3, 'shoulders', 'Shoulders'),
    (4, 'arms',      'Arms'),
    (5, 'legs',      'Legs'),
    (6, 'core',      'Core'),
    (7, 'full-body', 'Full Body')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment_definitions (id, code, description) VALUES
    (1, 'barbell',         'Barbell'),
    (2, 'dumbbell',        'Dumbbell'),
    (3, 'machine',         'Machine'),
    (4, 'cable',           'Cable'),
    (5, 'bodyweight',      'Bodyweight'),
    (6, 'kettlebell',      'Kettlebell'),
    (7, 'resistance-band', 'Resistance Band'),
    (8, 'other',           'Other')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Exercises (id is auto-generated via SERIAL sequence)
-- ============================================================================
INSERT INTO exercises (name, category, muscle_group_id, equipment_id, instructions, created_at) VALUES

-- Chest (muscle_group_id = 1)
('Barbell Bench Press',       'strength', 1, 1, 'Lie on flat bench, grip barbell at shoulder width, lower to mid-chest, press up.',                                                                                                                      NOW()),
('Dumbbell Bench Press',      'strength', 1, 2, 'Lie on flat bench holding dumbbells at chest level, press up until arms fully extended, lower with control.',                                                                                         NOW()),
('Incline Barbell Bench Press','strength', 1, 1, 'Set bench to 30-45 degrees, press barbell from upper chest to full extension.',                                                                                                                       NOW()),
('Incline Dumbbell Press',    'strength', 1, 2, 'Bench at 30-45 degrees, press dumbbells from upper chest to full extension.',                                                                                                                          NOW()),
('Decline Bench Press',       'strength', 1, 1, 'Lie on decline bench, press barbell from lower chest to full extension.',                                                                                                                            NOW()),
('Chest Fly (Machine)',       'strength', 1, 3, 'Sit at pec deck machine, bring handles together in front of chest with slight elbow bend.',                                                                                                           NOW()),
('Cable Chest Fly',           'strength', 1, 4, 'Stand between cable columns, bring hands together in front of chest with slight elbow bend.',                                                                                                         NOW()),
('Push-Up',                   'strength', 1, 5, 'Start in plank position with hands shoulder-width apart, lower chest to floor, push back up.',                                                                                                        NOW()),
('Dumbbell Pullover',         'strength', 1, 2, 'Lie across a flat bench with hips low, hold one dumbbell with both hands above chest, lower behind head, bring back up.',                                                                             NOW()),

-- Back (muscle_group_id = 2)
('Barbell Row',               'strength', 2, 1, 'Bend at hips with a flat back, grip barbell at shoulder width, pull to lower ribcage, lower with control.',                                                                                            NOW()),
('Dumbbell Row',              'strength', 2, 2, 'Place one knee and hand on a bench, pull dumbbell to hip with the other arm, lower with control.',                                                                                                    NOW()),
('Pull-Up',                   'strength', 2, 5, 'Hang from a bar with palms facing away, pull chin over the bar, lower with control.',                                                                                                                 NOW()),
('Chin-Up',                   'strength', 2, 5, 'Hang from a bar with palms facing toward you, pull chin over the bar, lower with control.',                                                                                                            NOW()),
('Lat Pulldown',              'strength', 2, 4, 'Sit at cable machine, grip bar wide overhead, pull to upper chest, return with control.',                                                                                                              NOW()),
('Seated Cable Row',          'strength', 2, 4, 'Sit with feet braced, grip handle, pull to lower abdomen keeping back straight, return with control.',                                                                                                NOW()),
('T-Bar Row',                 'strength', 2, 1, 'Straddle the T-bar, bend with a flat back, pull the bar to chest, lower with control.',                                                                                                                NOW()),
('Face Pull',                 'strength', 2, 4, 'Set cable at upper-chest height with rope attachment, pull toward face while externally rotating shoulders.',                                                                                          NOW()),

-- Shoulders (muscle_group_id = 3)
('Overhead Press (Barbell)',  'strength', 3, 1, 'Stand with barbell at shoulders, press overhead until arms fully extended, lower to shoulders.',                                                                                                       NOW()),
('Dumbbell Shoulder Press',   'strength', 3, 2, 'Sit or stand with dumbbells at shoulder height, press overhead, lower with control.',                                                                                                                NOW()),
('Lateral Raise',             'strength', 3, 2, 'Stand with dumbbells at sides, raise arms out to the side to shoulder height, lower with control.',                                                                                                  NOW()),
('Front Raise',               'strength', 3, 2, 'Stand with dumbbells in front of thighs, raise arms forward to shoulder height, lower with control.',                                                                                                NOW()),
('Reverse Fly',               'strength', 3, 2, 'Bend forward with a flat back holding dumbbells, raise arms out to sides, squeeze shoulder blades together.',                                                                                          NOW()),
('Arnold Press',              'strength', 3, 2, 'Start with dumbbells in front of shoulders palms facing you, press overhead while rotating palms forward.',                                                                                           NOW()),
('Upright Row',               'strength', 3, 1, 'Stand with barbell at thigh level, pull straight up to chin leading with elbows, lower with control.',                                                                                                NOW()),
('Dumbbell Shrug',            'strength', 3, 2, 'Stand holding dumbbells at sides, shrug shoulders up toward ears, hold briefly, lower.',                                                                                                              NOW()),

-- Arms (muscle_group_id = 4)
('Barbell Curl',              'strength', 4, 1, 'Stand with barbell at thigh level, curl bar to shoulders keeping elbows fixed, lower with control.',                                                                                                  NOW()),
('Dumbbell Curl',             'strength', 4, 2, 'Stand with dumbbells at sides, curl to shoulders alternating or together, keep elbows fixed.',                                                                                                        NOW()),
('Hammer Curl',               'strength', 4, 2, 'Stand with dumbbells at sides palms facing each other, curl to shoulders keeping palms facing in.',                                                                                                    NOW()),
('Tricep Pushdown',           'strength', 4, 4, 'Set cable at high position, grip rope or bar, push down to full arm extension, return with control.',                                                                                                 NOW()),
('Skull Crusher',             'strength', 4, 1, 'Lie on bench with barbell or EZ-bar above face, lower toward forehead by bending elbows, extend back up.',                                                                                             NOW()),
('Tricep Dip',                'strength', 4, 5, 'Grip parallel bars or bench edge, lower body by bending elbows to 90 degrees, push back up.',                                                                                                         NOW()),
('Concentration Curl',        'strength', 4, 2, 'Sit on bench, rest elbow against inner thigh, curl dumbbell to shoulder, lower with control.',                                                                                                        NOW()),
('overhead-tricep-extension','Overhead Tricep Extension',  'strength', 4, 2, 'Stand or sit holding a dumbbell overhead with both hands, lower behind head by bending elbows, extend back up.',                                                                                     NOW()),

-- Legs (muscle_group_id = 5)
('Barbell Back Squat',        'strength', 5, 1, 'Rest barbell on upper back, feet shoulder-width apart, squat to at least parallel, drive back up.',                                                                                                    NOW()),
('Front Squat',               'strength', 5, 1, 'Rest barbell across front of shoulders, keep torso upright, squat to parallel, drive back up.',                                                                                                      NOW()),
('Leg Press',                 'strength', 5, 3, 'Sit in leg press machine, place feet shoulder-width on platform, lower until knees at 90 degrees, press back up.',                                                                                    NOW()),
('Romanian Deadlift',         'strength', 5, 1, 'Hold barbell at hip level, hinge at hips pushing hips back, lower bar along legs until hamstrings stretch, return.',                                                                                  NOW()),
('Leg Curl (Machine)',        'strength', 5, 3, 'Lie face down on leg curl machine, curl heels toward glutes, lower with control.',                                                                                                                    NOW()),
('Leg Extension (Machine)',   'strength', 5, 3, 'Sit on leg extension machine, extend legs until straight, lower with control.',                                                                                                                        NOW()),
('Standing Calf Raise',       'strength', 5, 3, 'Stand on calf raise machine with shoulders under pads, rise up on toes, lower with control.',                                                                                                         NOW()),
('Dumbbell Lunge',            'strength', 5, 2, 'Hold dumbbells at sides, step forward into lunge, lower back knee toward floor, push back to start.',                                                                                                NOW()),
('Goblet Squat',              'strength', 5, 6, 'Hold a kettlebell or dumbbell at chest, squat to parallel keeping torso upright, drive back up.',                                                                                                    NOW()),
('Barbell Hip Thrust',        'strength', 5, 1, 'Sit on floor with upper back against bench, barbell across hips, thrust upward squeezing glutes at top.',                                                                                             NOW()),

-- Core (muscle_group_id = 6)
('Plank',                     'strength', 6, 5, 'Hold push-up position on forearms, keep body in straight line from head to heels, hold position.',                                                                                                     NOW()),
('Crunch',                    'strength', 6, 5, 'Lie on back with knees bent, hands behind head, curl shoulders off floor squeezing abs, lower with control.',                                                                                         NOW()),
('Leg Raise',                 'strength', 6, 5, 'Lie on back with legs straight, raise legs to 90 degrees keeping them straight, lower with control.',                                                                                                NOW()),
('Russian Twist',             'strength', 6, 5, 'Sit with feet off floor, lean back slightly, rotate torso side to side optionally holding a weight.',                                                                                                NOW()),
('Cable Crunch',              'strength', 6, 4, 'Kneel facing cable machine with rope attached overhead, crunch forward curling torso, return with control.',                                                                                         NOW()),
('Hanging Leg Raise',         'strength', 6, 5, 'Hang from a bar, raise legs to parallel or higher keeping them straight, lower with control.',                                                                                                        NOW()),
('Pallof Press',              'strength', 6, 4, 'Stand sideways to cable column, grip handle at chest height, press hands forward resisting rotation, return.',                                                                                        NOW()),

-- Full Body (muscle_group_id = 7)
('Deadlift (Conventional)',   'strength', 7, 1, 'Stand with feet hip-width apart, barbell over mid-foot, bend down grip bar, drive through heels to stand up, lower with control.',                                                                     NOW()),
('Sumo Deadlift',             'strength', 7, 1, 'Stand with feet wide toes pointed out, grip bar inside knees, drive through heels to stand up.',                                                                                                      NOW()),
('Power Clean',               'strength', 7, 1, 'Pull barbell from floor to shoulders in one explosive motion, catch in partial squat, stand up.',                                                                                                    NOW()),
('Kettlebell Swing',          'strength', 7, 6, 'Stand with kettlebell between legs, hinge at hips, swing to chest height using hip drive.',                                                                                                           NOW()),
('Burpee',                    'cardio',   7, 5, 'From standing squat down, kick feet to plank, do push-up, jump feet forward, explode up.',                                                                                                             NOW()),
('Farmer''s Walk',            'strength', 7, 2, 'Hold heavy dumbbells at sides, walk with upright posture for distance or time.',                                                                                                                      NOW()),
('Barbell Thruster',          'strength', 7, 1, 'Hold barbell at shoulders, squat to parallel, drive up into overhead press in one fluid motion.',                                                                                                     NOW()),
('Box Jump',                  'cardio',   7, 8, 'Stand facing a sturdy box, squat slightly, jump onto box landing softly, step down.',                                                                                                                 NOW()),
('Treadmill Running',         'cardio',   7, 3, 'Run or walk on treadmill at desired speed and incline.',                                                                                                                                               NOW()),
('Stationary Bike',           'cardio',   7, 3, 'Cycle on a stationary bike at desired resistance and pace.',                                                                                                                                           NOW())
ON CONFLICT (name) DO NOTHING;
