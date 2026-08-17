# GymTrack Backend Architecture Analysis

## Key Architectural Friction Points Identified:

### 1. Repetitive Boilerplate in Dependency Injection (`internal/app/module.go`)
- **Files**: `backend/internal/app/module.go` (lines 47-116)
- **Problem**: Extremely repetitive patterns for registering cache factories, cached repositories, and services for each domain
- **Example**: Each domain follows the exact same pattern with only the types changing
- **Friction**: Violates DRY principle, makes adding new domains tedious and error-prone
- **Deletion Test**: Yes, concentrates complexity - would move to a registration helper or convention-over-configuration approach

### 2. JSONB Marshalling/Unmarshalling Repetition
- **Files**: PostgreSQL repository implementations (e.g., `user.go`, `workout_plan.go`)
- **Problem**: Same marshalling/unmarshalling code repeated in every method
- **Example**: `profileJSON, err := MarshalToJSONB(user.Profile)` and unmarshaling patterns
- **Friction**: Scattered implementation details, hard to change JSON handling strategy
- **Deletion Test**: Yes, concentrates complexity - would move to helper methods or base repository

### 3. Cache-Aside Pattern Repetition
- **Files**: Cached repository implementations (e.g., `user_cached.go`)
- **Problem**: All follow the exact same pattern with singleflight group, cache get/set/invalidate
- **Friction**: Duplicated logic across many files, inconsistent implementation risks
- **Deletion Test**: Yes, concentrates complexity - would move to generic cached repository decorator

### 4. Shallow Service Layer
- **Files**: Service implementations (e.g., `user_service.go`)
- **Problem**: Many methods are thin delegators to repository with minimal business logic
- **Friction**: Interface nearly as complex as implementation (shallow modules)
- **Deletion Test**: Depends on specific service - some may concentrate complexity if collapsed

### 5. Missing Caching for Workout Plans
- **Files**: `backend/internal/infrastructure/persistence/postgres/` (missing `workout_plan_cached.go`)
- **Problem**: Workout plans lack caching implementation despite being referenced in DI
- **Friction**: Inconsistent caching strategy across similar entities
- **Note**: May be intentional (comment says "write-heavy or non-reference data")

## Top Recommendation:

**Address the Repetitive Boilerplate in Dependency Injection (`internal/app/module.go`)**

### Why this is the top candidate:
1. **High Impact**: Centralized location affects entire application startup and wiring
2. **Clear Leverage Point**: Small changes here propagate to many domains
3. **Improves Locality**: Related registration logic is currently scattered throughout the file
4. **Enhances AI-Navigability**: Reduces repetitive code that obscures the actual wiring logic
5. **Recent Activity**: File was recently modified (shown in git log), indicating it's an active area
6. **Strong Deletion Test**: Complexity would definitely concentrate in a better abstraction

### Suggested Solution:
Create a convention-over-configuration approach or helper functions to reduce the repetitive fx.Module registrations. For example:
- Group related registrations (cache factories, repositories, services) by domain
- Use reflection or code generation to reduce boilerplate
- Create domain-specific registration helpers that encapsulate the pattern for each layer

### Benefits:
- **Locality**: Registration logic for each domain would be colocated
- **Leverage**: Adding new domains requires fewer changes in fewer places
- **Testability**: Clearer separation between wiring and business logic
- **Maintainability**: Reduced risk of inconsistencies when adding/modifying domains