# Implement‑Ready Plan for Backend Services Refactor

  ## Summary

  The services under backend/internal/domain/services are functional but can be tightened to follow idiomatic Go best‑practices (error wrapping, context propagation, zero‑value usefulness, DRY, performance,
  and testability).
  The plan is broken into sub‑plans, each addressing a recommendation from the code review.  Every sub‑plan lists concrete steps, affected files, and a status field (todo, in‑progress, in‑test, done).  All
  sub‑plans start at todo; they can be progressed independently.

  ———

  ## Sub‑plan catalogue

  | Sub‑plan ID | Goal | Status |
  |-------------|------|--------|
  | SP‑01 | Wrap all external/repository errors with %w for traceability | done |
  | SP‑02 | Propagate context.Context to every repository/DB call | done |
  | SP‑03 | Introduce a Clock interface to replace time.Now() in services | done |
  | SP‑04 | Extract duplicated enrichment logic in CoachingRequestService | done |
  | SP‑05 | Add helper repository method HasActiveRelationship(trainerID, athleteID) and use it in comment & review services | done |
  | SP‑06 | Reduce N+1 rating queries in TrainerCatalogService by adding batch rating retrieval | done |
  | SP‑07 | Validate invitation code length & odd‑length handling in InvitationService | todo |
  | SP‑08 | Ensure all repository calls accept ctx (e.g., relationshipRepo.Create, userRepo.UpdateUser) | done |
  | SP‑09 | Enforce immutability of input slices (e.g., copy slots in AvailabilityService) or document mutation | todo |
  | SP‑10 | Add sentinel errors (ErrAlreadyReviewed, ErrInvalidInvitation) and use them where appropriate | todo |
  | SP‑11 | Introduce unit tests for the new helper functions and error paths (high‑coverage) | todo |
  | SP‑12 | Run golangci-lint and staticcheck after changes; fix any new lint failures | todo |

  ### Detailed sub‑plan actions

#### SP‑01 – Consistent error wrapping

   - What to do
       - Scan each service file for return fmt.Errorf("...") patterns that embed a repository error without %w.
       - Replace with fmt.Errorf("...: %w", err) preserving existing message text.
   - Affected files
       - availability_service.go
       - coaching_request_service.go
       - comment_service.go
       - invitation_service.go
       - review_service.go
       - trainer_catalog_service.go
   - Outcome
       - Errors retain original context, enabling errors.Is / errors.As checks.
   - Status
       - ✅ Complete

#### SP‑02 – Full context propagation

   - What to do
       - Add a ctx context.Context parameter to every repository method call that currently lacks it.
       - Update repository interface definitions accordingly (e.g., Create(context.Context, *Model) error).
       - Adjust all service implementations to forward the incoming ctx.
   - Affected files
       - Repository interface files under internal/domain/repositories/*.
       - All service files listed above.
   - Outcome
       - Calls respect deadlines, cancellation, and tracing.
   - Status
       - ✅ Complete

#### SP‑03 – Clock abstraction

   - What to do
       - Define type Clock interface { Now() time.Time } in a new internal/utils/clock.go.
       - Provide a production implementation RealClock and a mock FakeClock for tests.
       - Replace direct time.Now() usages in services with svc.clock.Now().
       - Inject the clock via service constructors (optional using functional options).
   - Affected files
       - All services that call time.Now() (availability_service.go, invitation_service.go, review_service.go, trainer_catalog_service.go).
   - Outcome
       - Deterministic timestamps in tests; easier to simulate time‑based logic.
   - Status
       - ✅ Complete

#### SP‑04 – De‑duplicate request enrichment

   - What to do
       - Create a private method func (s *CoachingRequestService) enrich(req *models.CoachingRequest) *models.CoachingRequestWithDetails that loads athlete & trainer structs.
       - Replace the duplicated loops in GetMyRequests and GetPendingRequestsForTrainer with calls to this helper.
   - Affected files
       - coaching_request_service.go
   - Outcome
       - DRY, easier to maintain and test enrichment logic.
   - Status
       - Implementation complete and verified.

#### SP‑05 – Active‑relationship helper

   - What to do
       - Add HasActiveRelationship(ctx context.Context, trainerID, athleteID string) (bool, error) to RelationshipRepository.
       - Implement it using a single query that checks status = "active".
       - Refactor CommentService.CanAccessComments and ReviewService.CanReview to call this helper instead of loading all relationships.
   - Affected files
       - Repository interface & implementation (likely under internal/domain/repositories/relationship_repository.go).
       - comment_service.go, review_service.go.
   - Outcome
       - Reduces data transfer and improves performance.
   - Status
       - ✅ Complete

#### SP‑06 – Batch rating aggregation

   - What to do
       - Extend ReviewRepository with GetRatingsForTrainers(ctx context.Context, trainerIDs []string) (map[string]struct{Avg float64; Count int}, error).
       - In TrainerCatalogService.SearchTrainers, collect trainer IDs, call the batch method, and populate AverageRating/ReviewCount in one pass.
   - Affected files
       - review_repository.go (new method).
       - trainer_catalog_service.go.
   - Outcome
       - Eliminates N+1 database calls when listing many trainers.
   - Status
       - ✅ Complete

  #### SP‑07 – Invitation code length safety

  - What to do
      - Add validation in generateRandomCode that length must be even; if odd, add one extra byte and trim, or document that only even lengths are accepted.
      - Return a sentinel error ErrInvalidInvitationCodeLength.
  - Affected files
      - invitation_service.go.
  - Outcome
      - Prevents surprising empty or malformed codes.

#### SP‑08 – Repository signatures receive context

   - What to do
       - Audit all repository interfaces for missing context.Context.
       - Add ctx where absent (Create(ctx, ...), Update(ctx, ...), Delete(ctx, ...), GetByID(ctx, ...)).
       - Update concrete implementations accordingly.
   - Affected files
       - All files under internal/domain/repositories/*.
   - Outcome
       - Uniform context handling across the data layer.
   - Status
       - ✅ Complete

  #### SP‑09 – Input slice mutation safety

  - What to do
      - In AvailabilityService.SetAvailability, copy the incoming slots slice before mutating (slotsCopy := append([]models.TrainerAvailability(nil), slots...)).
      - Or add a comment documenting that the slice is intentionally mutated.
  - Affected files
      - availability_service.go.
  - Outcome
      - Prevents unexpected side‑effects for callers.

  #### SP‑10 – Sentinel errors

  - What to do
       - Define new sentinel errors in a shared backend/internal/domain/errors.go (e.g., ErrAlreadyReviewed, ErrInvalidInvitation).
       - Replace generic fmt.Errorf messages for these cases with the sentinel errors wrapped (fmt.Errorf("%w: %s", ErrAlreadyReviewed, details)).
   - Affected files
       - review_service.go, invitation_service.go, any other service that has a repeatable domain error.
   - Outcome
       - Callers can programmatically differentiate error types.
   - Status
       - ⏳ In-progress

      - Add tests for:
      - Run golangci-lint run ./... after each sub‑plan is marked done.
      - Fix any newly introduced lint warnings (e.g., unused imports after interface changes).
  - Outcome
      - Codebase remains clean and passes CI checks.

  ———

  ## Execution flow (suggested)

  1. SP‑01 → SP‑02 → SP‑08 (error and context upgrades are foundational; they may require interface adjustments, so perform together). - DONE
  2. SP‑03 (clock) can run in parallel once repository signatures are stable. - DONE
  3. SP‑04, SP‑05, SP‑06 (deduplication & performance helpers) depend on updated repository interfaces, so schedule after step 1.
  4. SP‑07, SP‑09, SP‑10 are isolated edits; they can be applied once the baseline refactor is complete.
  5. SP‑11 (tests) and SP‑12 (lint) run after the functional changes are merged.

  Each sub‑plan can be tracked independently in the issue tracker using the IDs above.  When a sub‑plan reaches done, move its status accordingly; the composite view always reflects overall progress.

  ———

  ## Assumptions

  - Repository implementations are under our control and can be modified without breaking external contracts.
  - No external clients rely on the exact method signatures of the repository interfaces (they are internal).
  - Unit tests already exist for the services; new tests will extend coverage but will not replace existing ones.
  - The project uses golangci-lint as configured in .golangci.yml; the CI pipeline will run it automatically.

  ———
