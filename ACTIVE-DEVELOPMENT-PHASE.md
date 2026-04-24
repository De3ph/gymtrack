**Development Phase**

## Phase 1: Create an arhitectural overview in Obsidian - DONE

- [x] Create a new vault in Obsidian
- [x] Create a new note called "Architecture Overview"
- [x] Create a new note called "Database Schema"
- [x] Create a new note called "API Endpoints"
- [x] Create a new note called "UI Components"
- [x] Create a new note called "Business Logic"
- [x] Create a new note called "Testing Strategy"
- [x] Create a new note called "Deployment Strategy"
- [x] Create a new note called "Security Considerations"
- [x] Create a new note called "Performance Considerations"
- [x] Create a new note called "Future Enhancements"

## Phase 2: Enhance AI support

- [ ] Revising existing files (deleting, refactor, reorganize etc.)
- [ ] Update context-map.md
- [ ] Update README.md
- [ ] Universial architecturial patterns should be documented
    - [ ] handler - service - repository pattern
    - [ ] custom errors
    - [ ] validation patterns
    - [ ] code style guidelines (e.g. early returns, descriptive comments, TODO and FIXME tags)

## Phase 3: Code Quality and Testing

- [x] Create a test scenarios document with all test cases
- [ ] Service and handler tests should be rewritten, most of them are broken or outdated
- [ ] For each user case, there has to be a e2e test (Playwright)
- [ ] Create a regression test suite to ensure that new changes don't break existing functionality
- [ ] Extracting common functions into reusable modules with configurable parameters (date formatting, etc.)
- [ ] Git hooks to format code before commit
- [ ] CI / CD pipeline to run tests via GitHub Actions

## Phase 4: Enhance Workout and Meal Logging - DONE

Currently, the workout and meal logging is quite basic.

- [x] User should pick predefined exercises from a list
- [x] Sets and weight options should be more convenient to use
    - [x] Weight should be able to enter for each set, instead of just for the entire exercise
- [x] Each set should have its own entires
    - [x] reps
    - [x] weight
    - [x] rest time


## Phase 5: UI Polishments

- [ ] Considiring migrate to Base UI from Radix UI based system (shadcn/ui)
- [ ] Add loading states and spinners
- [ ] Decide on a consistent color scheme and design
- [ ] Add theme toggle (light/dark)
- [ ] Replacing custom components with shadcn/ui components

## Phase 6: i18n support for frontend

- [ ] Create blueprint for i18n architecture
    - [ ] decide on a library to use
    - [ ] decide on a strategy for organizing translations
    - [ ] decide on a strategy for loading translations (DON'T USE inline translations in jsx)
- [ ] Implement i18n support for frontend
- [ ] Add translations for all strings
    - [ ] English
    - [ ] Turkish
- [ ] Add language toggle
