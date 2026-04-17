# Testing Strategy for Fitness Tracker App

This document outlines comprehensive unit and e2e test scenarios for the implemented features in the fitness tracking application. The testing strategy covers Phase 1 (Authentication) and Phase 2 (Athlete Core Features) components.

## Current Implementation Status

Based on the codebase analysis, the following features are implemented:

### Phase 1: Authentication ✅
- User registration (trainer/athlete roles)
- Login/logout with JWT
- User profile management
- Protected routes with middleware

### Phase 2: Athlete Core Features ✅
- Workout logging (create, read, update, delete)
- Workout history (calendar and list views)
- Meal logging (create, read, update, delete)
- Meal history and daily nutrition summary
- Trainer invitation system for athletes

### Phase 3: Advanced Features ✅
- Basic trainer-athlete relationship system
- Invitation code generation and acceptance
- **NEW**: Trainer availability management
- **NEW**: Coaching request system
- **NEW**: Trainer catalog with filtering
- **NEW**: Review and rating system
- **NEW**: Comment system for workouts/meals

## Testing Framework Setup

### Frontend Testing Stack
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright
- **Mocking**: MSW (Mock Service Worker) for API calls

### Backend Testing Stack
- **Unit Tests**: Go's built-in testing package + testify
- **Integration Tests**: Testify + Couchbase test container
- **API Tests**: httptest package

## Unit Test Scenarios

### Frontend Unit Tests

#### Authentication Components
1. **Login Form Component**
   - Valid email/password submission
   - Invalid email format validation
   - Empty field validation
   - Loading state during submission
   - Error message display on failed login

2. **Registration Form Component**
   - Valid registration data submission
   - Email format validation
   - Password strength validation
   - Role selection (trainer/athlete)
   - Duplicate email handling

3. **Auth Store (Zustand)**
   - Login state management
   - User data persistence
   - Token storage and retrieval
   - Logout functionality

#### Workout Components
4. **WorkoutForm Component**
   - Exercise selection from dropdown
   - Weight input with kg/lbs toggle
   - Sets and reps validation
   - Rest time input
   - Form submission with valid data
   - Form reset after submission

5. **WorkoutList Component**
   - Display of workout entries
   - Edit/Delete button visibility (within 24h)
   - Empty state display
   - Loading state

6. **WorkoutCalendar Component**
   - Date selection
   - Workout indicators on calendar
   - Navigation between months
   - Today's date highlighting

7. **EditWorkoutDialog Component**
   - Pre-filling form with existing data
   - Update validation
   - Cancel functionality
   - Success state handling

#### Meal Components
8. **MealForm Component**
   - Food item input
   - Quantity input
   - Calorie and macro inputs
   - Meal type selection
   - Multiple food items management

9. **MealList Component**
   - Meal entry display
   - Daily summary calculation
   - Edit/Delete functionality (within 24h)
   - Empty state handling

10. **DailyNutritionSummary Component**
    - Total calories calculation
    - Macro breakdown display
    - Progress indicators
    - Daily goal tracking

#### Athlete Components
11. **AcceptInvitationDialog Component**
    - Invitation code validation (8 alphanumeric chars)
    - Code sanitization
    - Success state handling
    - Error message display
    - Loading state during submission

### Backend Unit Tests

#### Authentication Handlers
12. **Auth Handler**
    - User registration with valid data
    - Duplicate user registration
    - Login with correct credentials
    - Login with incorrect credentials
    - JWT token generation
    - Password hashing verification

#### User Management
13. **User Handler**
    - Get current user profile
    - Update user profile
    - Profile validation
    - Unauthorized access prevention

#### Workout Management
14. **Workout Handler**
    - Create workout with valid data
    - Create workout with invalid data
    - Get workout by ID
    - Get workout history with filters
    - Update workout (owner only)
    - Delete workout (owner only, within 24h)
    - Unauthorized access prevention

#### Meal Management
15. **Meal Handler**
    - Create meal with valid data
    - Create meal with invalid data
    - Get meal by ID
    - Get meal history with filters
    - Update meal (owner only)
    - Delete meal (owner only, within 24h)
    - Daily nutrition calculation

#### Relationship Management
16. **Relationship Handler**
    - Generate invitation code
    - Accept valid invitation
    - Accept invalid invitation
    - Get client list (trainer)
    - Get trainer info (athlete)
    - Terminate relationship

#### Availability Management
17. **Availability Handler**
    - Get trainer's own availability slots
    - Set/update trainer availability slots
    - Delete availability slots
    - Validate time slot format (HH:MM)
    - Validate day of week range (0-6)
    - Prevent overlapping time slots
    - Unauthorized access prevention

#### Coaching Request Management
18. **Coaching Request Handler**
    - Create coaching request (athlete only)
    - Get coaching requests for trainer
    - Accept coaching request (trainer only)
    - Reject coaching request (trainer only)
    - Get coaching request status
    - Validate request status transitions
    - Prevent duplicate requests
    - Unauthorized access prevention

#### Trainer Catalog Management
19. **Trainer Catalog Handler**
    - Get all trainers (paginated)
    - Filter trainers by specialization
    - Filter trainers by location
    - Filter trainers by minimum rating
    - Filter by availability for new clients
    - Search trainers by name
    - Sort trainers (rating, name, location)
    - Get trainer profile details
    - Get trainer reviews

#### Review Management
20. **Review Handler**
    - Create trainer review (athlete only)
    - Update own review (athlete only)
    - Delete own review (athlete only)
    - Get trainer reviews
    - Get review by ID
    - Validate rating range (1-5)
    - Prevent duplicate reviews
    - Unauthorized access prevention

#### Comment Management
21. **Comment Handler**
    - Create comment on workout/meal
    - Get comments for target (workout/meal)
    - Update own comment
    - Delete own comment
    - Create reply comment
    - Get comment thread (replies)
    - Validate comment permissions
    - Unauthorized access prevention

#### Repository Layer
22. **User Repository**
    - Create user
    - Get user by email
    - Get user by ID
    - Update user
    - User existence checks

23. **Workout Repository**
    - Create workout
    - Get workout by ID
    - Get workouts by user ID
    - Update workout
    - Delete workout
    - Date-based queries

24. **Meal Repository**
    - Create meal
    - Get meal by ID
    - Get meals by user ID
    - Update meal
    - Delete meal
    - Daily nutrition aggregation

25. **Availability Repository**
    - Create availability slot
    - Get availability by trainer ID
    - Update availability slot
    - Delete availability slot
    - Check for overlapping slots

26. **Coaching Request Repository**
    - Create coaching request
    - Get requests by trainer ID
    - Get requests by athlete ID
    - Update request status
    - Check for existing requests

27. **Review Repository**
    - Create review
    - Get reviews by trainer ID
    - Get review by ID
    - Update review
    - Delete review
    - Check for existing reviews

28. **Comment Repository**
    - Create comment
    - Get comments by target
    - Get comment by ID
    - Update comment
    - Delete comment
    - Get replies by parent ID

## Integration Test Scenarios

### Frontend Integration Tests

#### Authentication Flow
29. **Complete Registration to Dashboard Flow**
    - Navigate to registration
    - Fill form with valid data
    - Submit and redirect to login
    - Login with new credentials
    - Verify dashboard access

30. **Login to Profile Flow**
    - Login with existing credentials
    - Navigate to profile
    - Update profile information
    - Verify changes persist

#### Workout Management Flow
31. **Workout Creation to History Flow**
    - Navigate to workout logging
    - Create new workout with multiple exercises
    - Submit and verify success
    - Navigate to workout history
    - Verify new workout appears
    - Edit workout and verify changes
    - Delete workout and verify removal

#### Meal Management Flow
32. **Meal Creation to Nutrition Summary Flow**
    - Navigate to meal logging
    - Create multiple meals for a day
    - Verify daily nutrition summary updates
    - Edit meal and verify summary changes
    - Delete meal and verify summary updates

#### Trainer Invitation Flow
33. **Invitation Acceptance Flow**
    - Navigate to invitation dialog
    - Enter valid invitation code
    - Verify success state
    - Check trainer relationship established

#### Advanced Features Integration Flows
34. **Trainer Availability Management Flow**
    - Login as trainer
    - Navigate to availability settings
    - Set weekly availability slots
    - Update existing slots
    - Delete availability slots
    - Verify availability persists

35. **Coaching Request Flow**
    - Login as athlete
    - Browse trainer catalog
    - Send coaching request to trainer
    - Login as trainer
    - View and accept coaching request
    - Verify relationship establishment

36. **Trainer Catalog and Review Flow**
    - Browse trainer catalog with filters
    - View trainer profiles and reviews
    - Establish coaching relationship
    - Create workout/meal data
    - Leave trainer review
    - Verify review appears in catalog

37. **Comment System Integration Flow**
    - Login as athlete
    - Create workout and meal entries
    - Login as trainer
    - View client data
    - Add comments to workouts/meals
    - Login as athlete
    - View and reply to comments
    - Verify comment thread functionality

### Backend Integration Tests

#### API Integration
38. **Authentication API Integration**
    - Registration → Login → Protected API access
    - Token refresh mechanism
    - Logout token invalidation

39. **Workout API Integration**
    - Create workout → Get workout → Update workout → Delete workout
    - Permission validation for different user roles
    - Date-based filtering

40. **Meal API Integration**
    - Create meal → Get meal → Update meal → Delete meal
    - Daily nutrition aggregation
    - Permission validation

41. **Availability API Integration**
    - Set availability → Get availability → Update availability
    - Time slot validation
    - Overlap prevention

42. **Coaching Request API Integration**
    - Create request → Get requests → Accept/Reject request
    - Status transition validation
    - Permission validation

43. **Trainer Catalog API Integration**
    - Get trainers with filters
    - Pagination testing
    - Search functionality
    - Review aggregation

44. **Review API Integration**
    - Create review → Get reviews → Update review → Delete review
    - Rating validation
    - Duplicate prevention

45. **Comment API Integration**
    - Create comment → Get comments → Update comment → Delete comment
    - Permission validation
    - Thread functionality

## E2E Test Scenarios

### Critical User Journeys

#### New Athlete Onboarding
46. **Complete Athlete Registration Journey**
    - Visit application
    - Register as new athlete
    - Login successfully
    - Complete profile setup
    - Connect with trainer using invitation code
    - Log first workout
    - Log first meal
    - Verify data appears in history

#### Existing User Daily Workflow
47. **Athlete Daily Workout and Meal Logging**
    - Login as existing athlete
    - Log morning workout with multiple exercises
    - Log breakfast meal
    - Log lunch meal
    - Verify workout appears in calendar
    - Verify nutrition summary updates
    - Edit workout entry
    - View workout history

#### Trainer Workflow
48. **Trainer Client Management**
    - Login as trainer
    - Generate invitation code
    - View client list
    - Monitor client workout activity
    - Monitor client nutrition data
    - View client progress over time

#### Advanced Trainer Workflow
49. **Complete Trainer Business Flow**
    - Login as trainer
    - Set up weekly availability
    - Browse coaching requests
    - Accept new client
    - Monitor client activities
    - Provide feedback via comments
    - Receive client review

#### Data Management
50. **Workout and Meal Data Management**
    - Create comprehensive workout data
    - Create comprehensive meal data
    - Test edit functionality (within 24h window)
    - Test delete functionality (within 24h window)
    - Verify data persistence after refresh
    - Test data filtering and sorting

#### Trainer Discovery and Engagement
51. **Athlete Trainer Discovery Journey**
    - Login as athlete
    - Browse trainer catalog
    - Filter by specialization and location
    - View trainer profiles and reviews
    - Send coaching request
    - Monitor request status
    - Establish coaching relationship

#### Communication and Feedback
52. **Trainer-Athlete Communication Flow**
    - Establish trainer-athlete relationship
    - Athlete logs workout and meal
    - Trainer provides feedback via comments
    - Athlete responds to feedback
    - Verify notification system
    - Test comment threading

#### Review and Rating System
53. **Trainer Review Lifecycle**
    - Complete coaching engagement
    - Athlete leaves review and rating
    - Verify review appears in trainer catalog
    - Test review update functionality
    - Test review deletion
    - Verify rating aggregation

### Cross-Browser and Device Testing
54. **Responsive Design Testing**
    - Mobile view workout logging
    - Tablet view meal history
    - Desktop view dashboard
    - Touch interactions on mobile

### Performance Testing
55. **Load Testing Scenarios**
    - Multiple concurrent users
    - Large dataset handling
    - API response times
    - Frontend rendering performance

## Test Data Management

### Test Fixtures
- User accounts (trainer/athlete)
- Sample workout data
- Sample meal data
- Invitation codes
- Relationship data
- **NEW**: Trainer availability slots
- **NEW**: Coaching request data
- **NEW**: Trainer profiles with specializations
- **NEW**: Review and rating data
- **NEW**: Comment threads and replies

### Test Environment Setup
- Isolated test database
- Mock external services
- Test-specific configuration
- Cleanup procedures

## Test Coverage Goals

### Frontend Coverage
- Component coverage: 90%+
- Hook coverage: 85%+
- Utility function coverage: 95%+

### Backend Coverage
- Handler coverage: 90%+
- Service coverage: 85%+
- Repository coverage: 90%+
- Model coverage: 95%+

## Implementation Priority

### Phase 1: Critical Path (Week 1)
1. Authentication unit tests (frontend + backend)
2. Workout CRUD operations tests
3. Meal CRUD operations tests
4. Basic E2E user journey

### Phase 2: Comprehensive Coverage (Week 2)
5. Integration tests for all major flows
6. Edge case and error handling tests
7. Permission and authorization tests
8. Cross-browser E2E tests

### Phase 3: Advanced Testing (Week 3)
9. Performance and load testing
10. Security testing
11. Accessibility testing
12. Visual regression testing

## Test Automation Strategy

### CI/CD Integration
- Automated test runs on PR
- Coverage reporting
- E2E test execution in staging
- Performance monitoring

### Test Reporting
- Coverage reports
- Test result summaries
- Failure notifications
- Performance metrics

This testing strategy ensures comprehensive coverage of all implemented features while maintaining high quality and reliability of the fitness tracking application.

## Missing Test Files to Create

Based on the backend analysis, the following test files are missing and need to be created:

### Backend Handler Tests
- `internal/api/handlers/availability_handler_test.go`
- `internal/api/handlers/coaching_request_handler_test.go`
- `internal/api/handlers/review_handler_test.go`
- `internal/api/handlers/trainer_catalog_handler_test.go`
- `internal/api/handlers/comment_handler_test.go`

### Backend Service Tests
- `internal/domain/services/availability_service_test.go`
- `internal/domain/services/coaching_request_service_test.go`
- `internal/domain/services/review_service_test.go`
- `internal/domain/services/trainer_catalog_service_test.go`
- `internal/domain/services/invitation_service_test.go`

### Backend Repository Tests
- `internal/domain/repositories/availability_repository_test.go`
- `internal/domain/repositories/coaching_request_repository_test.go`
- `internal/domain/repositories/review_repository_test.go`
- `internal/domain/repositories/trainer_profile_repository_test.go`
- `internal/domain/repositories/comment_repository_test.go`

### Frontend Component Tests
- `src/components/features/availability/__tests__/AvailabilityManager.test.tsx`
- `src/components/features/coaching/__tests__/CoachingRequest.test.tsx`
- `src/components/features/catalog/__tests__/TrainerCatalog.test.tsx`
- `src/components/features/reviews/__tests__/ReviewSystem.test.tsx`
- `src/components/features/comments/__tests__/CommentSystem.test.tsx`

### Integration Test Files
- `tests/integration/availability.integration.test.ts`
- `tests/integration/coaching-requests.integration.test.ts`
- `tests/integration/trainer-catalog.integration.test.ts`
- `tests/integration/reviews.integration.test.ts`
- `tests/integration/comments.integration.test.ts`

### E2E Test Files
- `tests/e2e/trainer-workflow.e2e.test.ts`
- `tests/e2e/coaching-requests.e2e.test.ts`
- `tests/e2e/trainer-discovery.e2e.test.ts`
- `tests/e2e/reviews.e2e.test.ts`
- `tests/e2e/comments.e2e.test.ts`

## Test Implementation Priority

### Phase 1: Critical Backend Tests (Week 1)
1. Availability handler and service tests
2. Coaching request handler and service tests
3. Review handler and service tests
4. Comment handler and service tests (partially done)

### Phase 2: Advanced Features Tests (Week 2)
5. Trainer catalog handler and service tests
6. Repository layer tests for all new features
7. Integration tests for advanced features
8. Frontend component tests for new features

### Phase 3: Complete Coverage (Week 3)
9. E2E tests for advanced workflows
10. Cross-browser and performance tests
11. Security and accessibility tests
12. Visual regression tests for new components
