**Fitness Tracker App - AI Development Prompt**

## **Project Overview**

Build a full-stack fitness tracking application that enables personal trainers to monitor and provide feedback on their clients' workouts and nutrition. The app features a two-sided platform connecting trainers with athletes through real-time workout logging, meal tracking, and collaborative feedback.

---

## **1. FUNCTIONAL REQUIREMENTS**

### **1.1 User Management**

- **User Types**: Trainer and Athlete (role-based access control)
- **Authentication**:
  - Email/password registration and login
  - JWT-based session management
  - Secure logout (token invalidation)
  - Password reset functionality
- **User Profiles**:
  - Athletes: name, email, age, weight, height, fitness goals, trainer assignment
  - Trainers: name, email, certifications, specializations, client list

### **1.2 Trainer-Athlete Relationships**

- Trainers can invite athletes via email/unique code
- Athletes can accept/decline trainer invitations
- Athletes can have only ONE active trainer at a time
- Trainers can manage multiple athletes
- Either party can terminate the relationship

### **1.3 Workout Tracking (Athlete)**

- **Log Workouts** with:
  - Date and time
  - Exercise name (searchable dropdown with common exercises + custom entry)
  - Weight (numeric input)
  - Weight unit (kg/lbs toggle)
  - Sets (number)
  - Reps per set (number or array for varied reps)
  - Rest time between sets (seconds/minutes)
  - Optional: duration, intensity, notes
- **View History**: Calendar view + list view of past workouts
- **Edit/Delete**: Own workout entries (within 24 hours of logging)

### **1.4 Meal Tracking (Athlete)**

- **Log Meals** with:
  - Date and meal time (breakfast/lunch/dinner/snack)
  - Food items and quantities
  - Optional: calories, macros (protein/carbs/fats), photos
- **Daily Summary**: Total calories and macro breakdown
- **View History**: Calendar and list views
- **Edit/Delete**: Own meal entries (within 24 hours)

### **1.5 Trainer Oversight Dashboard**

- **Client List**: View all assigned athletes
- **Client Details**: Switch between clients to view:
  - Workout history (filterable by date range, exercise type)
  - Meal logs (filterable by date range, meal type)
  - Progress charts (workout volume, consistency, nutrition trends)
- **Real-time Updates**: See new entries as athletes log them

### **1.6 Communication & Feedback**

- **Comments System**:
  - Trainers can comment on specific workouts or meals
  - Athletes receive notifications for new comments
  - Athletes can reply to trainer comments
  - Threaded conversation view
  - Comment timestamps and edit history
- **Feedback Types**: Positive reinforcement, corrections, suggestions

---

## **2. PROJECT CONTEXT**

**Note**: For comprehensive project documentation including:
- Technology stack and architecture
- Database schema and API endpoints
- Design patterns and code quality standards
- File inventory and development workflow

Please refer to **[context-map.md](context-map.md)** for the complete project context.
