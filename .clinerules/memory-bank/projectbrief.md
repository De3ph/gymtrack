# Project Brief: GymTrack

## Core Mission
A two-sided fitness tracking platform connecting **personal trainers** with **athletes**. Athletes log workouts, meals, and body measurements; trainers monitor progress and provide feedback through comments. The system also includes a trainer catalog where athletes can browse and request coaching.

## Why This Project Exists
To bridge the gap between athletes and trainers by providing a unified platform for:
- **Athletes**: Logging workouts, meals, and body measurements in one place
- **Trainers**: Monitoring client progress and providing structured feedback
- **Coach Discovery**: A catalog system where athletes find and request coaching

## Core Requirements

### Athlete Features
- Log workouts with predefined exercises, sets, reps, weights, and rest times
- Log meals with food items, portion sizes, and nutritional info
- Track body measurements (weight, body fat, body part measurements)
- View training history via calendar and list views
- Browse trainer catalog and send coaching requests
- Manage current trainer relationship

### Trainer Features
- Dashboard with client list and progress overview
- View client workouts, meals, and body measurements
- Add threaded comments on client workouts/meals
- Manage trainer profile, availability, and reviews
- Accept/reject coaching requests
- Create and assign workout plans

### Admin Features
- Manage exercise catalog (CRUD operations)
- Manage equipment and muscle group data

### Cross-Cutting Features
- JWT-based authentication with access + refresh tokens
- Role-based authorization (athlete, trainer, admin)
- 24-hour edit window for workouts, meals, and measurements
- Internationalization (English + Turkish)
- Dark/light theme support

## Target Users
- **Athletes**: Individuals who exercise and want to track progress
- **Personal Trainers**: Professionals managing multiple clients
- **Fitness Enthusiasts**: Anyone wanting structured workout/meal logging

## Success Metrics
- Athletes can log workouts in < 2 minutes
- Trainers can review client progress from a single dashboard
- Real-time comment system enables effective trainer-athlete communication
- Coach discovery enables athletes to find and connect with trainers