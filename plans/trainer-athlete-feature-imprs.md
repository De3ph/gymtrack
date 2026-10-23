I have enough evidence. Here is the critique.

---

# Architecture Critique — Coach–Client Connection Feature

Scope: `backend/internal/{domain,infrastructure,api}`, `frontend/src/lib/api`, `frontend/src/components/features/{coaching,athlete,trainer}`, `mobile/src`.

## 1. Layering and dependency direction

**F1.1 — High — Handlers own the relationship business rules; there is no `RelationshipService`.**
`backend/internal/api/handlers/relationship_handler.go:19-26` — `RelationshipHandler` holds `relationshipRepo`, `userRepo`, `workoutRepo`, `mealRepo` directly. `TerminateRelationship` (`:490-549`) performs authorization, status transition (`relationship.Terminate()`), and the athlete-profile update in the handler. `GetClientDetails` (`:424-441`) and `GetClientStats` (`:597-614`) each re-implement "find the active relationship for this athlete" by scanning `GetByTrainerID` in Go.
- *Why it matters:* the invariant "one active trainer per athlete" is expressed in at least five different places (handler ×3, `coaching_request_service.go:39`, `coaching_request_service.go:102`, `invitation_service.go:90`) and each copy can drift. `invitation_service.go:90` correctly calls `IsActive()`; the two in `coaching_request_service.go` do not — the divergence is already visible in the codebase and is pinned as a known finding in `backend/internal/api/e2e/coach_e2e_test.go:449-481`.
- *Remediation:* introduce `RelationshipService` owning activation, termination, active-lookup and the athlete-profile projection; handlers should depend only on services. Replace the O(n) scan with a repository query (`GetActiveByAthleteID`).

**F1.2 — Medium — Domain model leaks persistence concerns; repositories leak domain concerns.**
`models/relationship.go:16` (`Type string` discriminator), `models/coaching_request.go:21`, `models/invitation.go:7` set `Type` in the repository layer (`postgres/relationship.go:44`, `postgres/coaching_request.go:44`, `postgres/invitation.go:56`) — a transport/presentation concern living in the domain model and persisted nowhere. Conversely `postgres/invitation.go:73-112` implements *validation semantics* (`ErrInvitationAlreadyUsed` vs `ErrInvitationExpired` vs `ErrInvalidInvitationCode`) that are business rules, and `domain/errors/errors.go:29-42` documents them as "raised by the repository layer".
- *Remediation:* drop the `Type` discriminator fields (the API contract doesn't need them); move invitation-state classification into a domain function invoked by the adapter.

**F1.3 — Medium — Infrastructure depends on the services layer.**
`postgres/invitation.go:13` imports `domain/services` purely to satisfy `var _ services.InvitationMethod` (`:182`), while `services/invitation_service.go:19-37` defines that port. The adapter therefore lives in infrastructure but the port in services, and `app/module.go:163-171` wires them. Acceptable hexagonal style, but the port is buried in a service that also depends on repositories, so the two cannot be separated or reused.
- *Remediation:* move `InvitationMethod` into `domain/repositories` (or a `domain/ports` package) so infrastructure depends only on domain.

**F1.4 — Low — The services layer is partly a passthrough.**
`services/review_service.go:126-132` (`GetTrainerReviews`) and `:143-145` (`CalculateTrainerStats`) are one-line repository delegations. `services/coaching_request_service.go:221-234` is a repo call plus an enrich loop.
- *Remediation:* acceptable for reads, but the enrich loop (see F10.2) should move into a single batched repository query.

## 2. Dual-mechanism design (coaching request vs invitation code)

**F2.1 — Critical — Two mechanisms produce the same aggregate with divergent invariants; `relationships` is the only real source of truth but neither mechanism is expressed in terms of it.**
- Invitation path: `services/invitation_service.go:125-151` creates a `relationships` row with status `active` directly (`models.NewRelationship` → `.Accept()`), bypassing any request-state machine.
- Request path: `services/coaching_request_service.go:107-141` also creates a `relationships` row with status `active` directly, then flips a `coaching_requests` row to `accepted`.
- There is no `Relationship` state machine that both paths share: `models/relationship.go:40-49` exposes `Accept()`/`Terminate()` with **no guards** — `Terminate()` on a `pending` relationship, or `Accept()` on a `terminated` one, are legal.
- *Why it matters:* "who is connected" is defined by `relationships.status='active'`, but the two mechanisms disagree on how you get there, on whether the athlete's other pending requests are invalidated, and on whether the trainer sees an inbox. An athlete can have a pending coaching request to T2 and simultaneously accept a code from T3 — T2's request stays `pending` and the trainer can later accept it, at which point `ErrAthleteAlreadyHasActiveTrainer` fires (`coaching_request_service.go:102-105`) but only *after* the trainer has already been told "accept". No row is invalidated.
- *Remediation:* model one `CoachingConnection` aggregate with a single `openRequest` / `openInvitation` / `establish` / `terminate` state machine, and have both mechanisms funnel into `establish()`. On establish, close the athlete's other pending requests in the same transaction.

**F2.2 — Medium — Duplicated, divergent naming across the two mechanisms.**
`routes/relationship_routes.go:14-24` uses `POST /relationships/invite`, `POST /relationships/accept`, `DELETE /relationships/:id`; `routes/coaching_request_routes.go:15-25` uses `POST /coaching-requests`, `PUT /coaching-requests/:id/accept`, `PUT /coaching-requests/:id/reject`. Same verbs, different nouns, different HTTP methods for the same semantic action (accept), and a third naming for the shared read (`/relationships/my-clients` vs `/relationships/client/:username` vs `/relationships/client/:username/stats`).
- *Remediation:* one resource family — `/coaching/requests`, `/coaching/invitations`, `/coaching/relationships` — with `POST`/`PATCH` verbs chosen consistently.

## 3. Data model and state machines

**F3.1 — High — `relationships` has a hard UNIQUE(trainer_id, athlete_id) but no partial unique on "one active trainer per athlete"; terminated relationships are therefore not reusable.**
`backend/internal/migrate/migrations/001_baseline.up.sql:919` — `relationships_trainer_id_athlete_id_key UNIQUE (trainer_id, athlete_id)`. Since termination is a *status change* (not a delete), the athlete can never reconnect to the **same** trainer again: `POST /relationships/accept` → `services/invitation_service.go:129` → `relationshipRepo.Create` → unique violation → `mapWriteError` (`postgres/errors.go:52-53`) → `ErrConflict` → HTTP 409. The same pair can never be re-invited.
- *Why it matters:* "end your current coaching relationship first" (`services/errors.go:27`) then re-engage the same coach is a normal product flow and is impossible.
- *Remediation:* drop the pair-unique and add `CREATE UNIQUE INDEX ... ON relationships (athlete_id) WHERE status = 'active'`, plus a separate partial unique on `(trainer_id, athlete_id) WHERE status IN ('pending','active')`.
- *Status (2026-10-23):* Fixed in migration `005_relationship_pair_reuse` — the pair-wide UNIQUE is dropped and `idx_relationships_open_pair` reserves only pending/active pairs. Reconnecting after termination appends a new active row; terminated rows stay as history. `GetByTrainerAndAthlete` now returns only open rows, and `RelationshipService.Activate` creates a new row instead of reactivating a terminated one.

**F3.2 — High — Transitions are enforced in the service layer only, and inconsistently; there is no single transition guard.**
`coaching_request_service.go:98-100` and `:159-161` correctly guard on `pending`. But `services/invitation_service.go:125-126` creates an *active* relationship without passing through any guard, and `relationship_handler.go:527-531` terminates without checking the current status (a `pending` or already-`terminated` row can be "terminated" again, and re-terminating resets `updated_at`).
- *Remediation:* put transitions on the aggregate (`Relationship.Accept()`, `.Terminate()` return an error on illegal transitions) and have every path use them.

**F3.3 — Medium — `invitations.athlete_id` is never written; the invitation row never records who accepted it.**
`postgres/invitation.go:80-83` — the claim UPDATE sets `status='used', used_at=$1` only. `athlete_id` remains NULL (column is nullable, `001_baseline.up.sql:258`), so the audit trail "which athlete redeemed which code" is lost, and `ON DELETE SET NULL` (`:1317`) has no effect.
- *Remediation:* set `athlete_id = $2` in the same claim statement.

**F3.4 — Medium — `invitations.status` has an `'expired'` value in the schema that no code ever writes.**
`001_baseline.up.sql:259` allows `('pending','used','expired')`; expiry is evaluated ad hoc in `postgres/invitation.go:82` (`expires_at > $1`) and `:131-133`. No sweep job exists (`infrastructure/retention/audit_log_retention.go` prunes only audit logs). Rows therefore linger as `pending` forever.
- *Remediation:* either drop `'expired'` from the CHECK or add a sweeper that marks expired rows.

**F3.5 — High — Race window on "one active trainer" and on duplicate requests.**
`coaching_request_service.go:39-54` reads `GetByAthleteID` then `GetByAthleteID` for requests, then inserts — a classic check-then-act. Two concurrent `POST /coaching-requests` from the same athlete to two different trainers both pass the check. There is no unique constraint on `coaching_requests` at all (`001_baseline.up.sql:103-112` has no UNIQUE), so the same athlete can create unlimited pending requests to the same trainer too — the `ErrPendingCoachingRequestExists` guard (`:51`) is advisory only.
- *Remediation:* enforce with a partial unique index on `coaching_requests (athlete_id, trainer_id) WHERE status='pending'` and on `relationships (athlete_id) WHERE status='active'`; treat the constraint violation as the authoritative check.

**F3.6 — Medium — `GetByAthleteID` returns the newest row of *any* status, which is a trap.**
`postgres/relationship.go:91` — `ORDER BY created_at DESC LIMIT 1`. Both `coaching_request_service.go:39` and `:102` treat "a row was returned" as "has an active trainer", which is precisely the bug pinned in `coach_e2e_test.go:449-481`.
- *Remediation:* replace with `GetActiveByAthleteID` and have the generic method return an explicit `ErrNotFound` when no *active* row exists.

## 4. Consistency

**F4.1 — Critical — The relationship + athlete-profile write pair is not transactional, in all three write paths.**
- `services/coaching_request_service.go:118-141`: create relationship → update `users.profile` → update request status. Failure at step 2 leaves an active relationship with no `trainerAssignment`; failure at step 3 leaves the request `pending` although a relationship exists.
- `services/invitation_service.go:129-151`: same, and the code comments acknowledge the non-atomicity (`:142-150`) and compensate by *releasing the code*, which then reverts to "athlete has an active trainer but no code" — a state no retry can escape.
- `relationship_handler.go:528-543`: terminate relationship → clear `trainerAssignment`. Failure at the second step leaves a `terminated` relationship but a stale `trainerAssignment` pointing at the old trainer, which is then served to the athlete by `GET /users/me`.
- *Remediation:* wrap each aggregate write in a single `pgx` transaction (repository-level `WithTx`), including the `users.profile` JSONB update. The current compensating-release design should be deleted once the writes are atomic.
- *Status (2026-10-23):* Fixed. `repositories.TransactionManager` (implemented by `postgres.PostgresTransactionManager`) puts the `pgx.Tx` on the context and joins an already-open transaction, so a service called from another service shares one commit. `RelationshipService.Activate` / `Terminate`, `CoachingRequestService.AcceptCoachingRequest`, and `InvitationService.AcceptInvitation` now run the relationship row, the `users.profile` projection, and (where applicable) the request status or invitation claim in a single transaction. The compensating designs were deleted: no relationship `Delete` rollback, no `Terminate` rollback of the request, and no `ReleaseClaim` — the claim rolls back with the accept. Repository methods resolve the executor from the context (`querierFor`), and cache invalidation in the user/relationship decorators is deferred until commit (`afterTransaction`).
- *Review follow-ups (2026-10-24):* (1) the projection is now a targeted `SetTrainerAssignment` / `ClearTrainerAssignment` (`jsonb_set` with the clear guard in the `WHERE`), so the aggregate write no longer rewrites `password_hash`/`role`/`status` from a stale copy and no longer decides the guard on a cached row; (2) `postgres/invitation_transaction_test.go` proves a failed activation rolls the claim and relationship back; (3) cached decorators bypass the cache inside a transaction (`isWithinTransaction`); (4) relationship unique violations are classified by constraint name (`ErrActiveRelationshipExists` only for `idx_relationships_one_active_per_athlete`), and accept/reject use the conditional `UpdateStatus` instead of check-then-act.

**F4.2 — High — `users.profile.trainerAssignment` (JSONB) is a second source of truth for "who is connected", and it is written by three different layers.**
`models/user.go:30` defines it; `invitation_service.go:140`, `coaching_request_service.go:129`, `relationship_handler.go:539` all write it. `services/user_service.go:55-72` explicitly *preserves* it to avoid wiping it, which confirms it is server-managed — but nothing makes it consistent with `relationships`. `models/user.go:35` also declares `ClientList []int` as the trainer-side mirror, which is never written by any of the three paths.
- *Why it matters:* readers of `users.profile.trainerAssignment` (e.g. `ProfileClient.tsx`) and readers of `relationships` can disagree indefinitely; the JSONB copy also cannot be queried or constrained.
- *Remediation:* delete `trainerAssignment` and `clientList`; derive the trainer from `relationships` via a join/view. If a denormalized copy is needed for performance, keep it in a real column maintained by the same transaction that writes `relationships`.

**F4.3 — Medium — The `users.profile` write is a whole-row read-modify-write that clobbers concurrent edits.**
`postgres/user.go:231-245` — `UPDATE users SET username=..., email=..., password_hash=..., role=..., status=..., profile=$6` writes *every* column from an in-memory copy. `invitation_service.go:135-141` loads the athlete, mutates one JSONB field, and writes the whole row back — racing with a concurrent profile edit or a `BumpTokenVersion`.
- *Remediation:* a targeted `UPDATE users SET profile = jsonb_set(profile, '{trainerAssignment}', $1)
- I'll continue the critique in smaller pieces to stay within limits.

---

**F4.3 (continued) — Remediate with:** a targeted `UPDATE users SET profile = jsonb_set(profile, '{trainerAssignment}', $1) WHERE user_id = $2` so only the field changes.
- *Status (2026-10-24):* Fixed for the relationship aggregate: `PostgresUserRepository.SetTrainerAssignment` / `ClearTrainerAssignment` do exactly this, with the clear guard (`profile->>'trainerAssignment' = $trainerID`) in the `WHERE`, so a stale read cannot wipe a newer assignment. The profile edit path (`UserService.UpdateUserProfile`) still does read-modify-write.

**F4.4 — Medium — `UpdateUser` writes `password_hash` and `role` from a stale in-memory copy.**
`postgres/user.go:231-245` — the UPDATE includes `password_hash` and `role`. The comment at `:227-230` acknowledges the stale-copy hazard for `token_version` but not for these. `invitation_service.go:135-141` loads the athlete and writes the row back, so a password reset or role change racing with an accept can be silently reverted.
- *Remediation:* split `UpdateUser` into purpose-specific statements (`UpdateUserProfile`, `SetTrainerAssignment`, `SetRole`, `SetPasswordHash`), each touching only its own columns.
- *Status (2026-10-24):* Partially fixed. The relationship aggregate no longer uses `UpdateUser`; `SetTrainerAssignment` / `ClearTrainerAssignment` touch only `profile` and `updated_at`. The self-service profile edit path still rewrites the whole row.

---

## 5. Caching layer (`relationship_cached.go`)

**F5.1 — High — The cache is invalidated by prefix-scan only on writes made through the cached decorator, and the decorator is not the only writer path.**
`postgres/relationship_cached.go:32, 78, 86` — `InvalidatePrefix("relationship:trainer:")`. `cache/gocache_adapter.go:123-128` implements this as an O(N) scan over *all* cache entries. `InvalidatePrefix` is called on `Create`/`Update`/`Delete`, but the decorator is registered for the `RelationshipRepository` interface only (`app/module.go:106-108`) — and `services/invitation_service.go` / `services/coaching_request_service.go` receive that same interface, so their writes do invalidate. The gap is the *cache namespace breadth*: only `GetByTrainerID` is cached (`relationship_cached.go:41-61`), yet `InvalidatePrefix` drops **every** trainer's entry on any single write — O(N) work for one trainer's relationship.

**F5.2 — High — Stale-cache correctness gap: the cached value is a slice of pointers, and `GetByTrainerID` results are mutated by callers.**
`relationship_cached.go:41-61` caches `[]*models.Relationship`; `cache/gocache_adapter.go:63-74` deep-copies via gob on Get, so the returned slice is isolated — good. But `singleflight` (`relationship_cached.go:44`) shares one `loadCtx` across waiters, and the cached slice is returned to **all** concurrent callers by pointer after the gob copy only happens once per cache miss. Two callers can therefore receive the *same* `*models.Relationship` pointers and mutate them (e.g. `relationship_handler.go:527` calls `relationship.Terminate()` on a row obtained from `GetByTrainerID`), mutating the cached copy's target without invalidation.
- *Why it matters:* a terminate that mutates a cached object in place means the cache can report `active` after the DB says `terminated`, until TTL (2 minutes, `cache/factory.go:65`) expires.
- *Remediation:* never mutate entities returned from a repository; make `Relationship` immutable and construct new values (copy-on-write) for updates.

**F5.3 — Medium — No cache-invalidation bus for the relationship cache, unlike the user/trainer-profile caches.**
`postgres/cache_invalidation.go:25-60` — the bus exists precisely because `users.profile` is written by two repositories and cached under two namespaces. The relationship cache has the same problem in a different form: `relationships` rows are read by `GetByTrainerID` (cached) and `HasActiveRelationship` / `GetByAthleteID` (**not** cached, `relationship_cached.go:63-73`). A trainer's cached client list can disagree with `HasActiveRelationship` used for authorization.
- *Remediation:* cache `GetByAthleteID` and `HasActiveRelationship` under the same invalidation scheme, or drop the cache for this aggregate given the write frequency.

**F5.4 — Medium — TTL is the only consistency backstop; there is no version/epoch in the key.**
`cache/factory.go:119-125` — 2-minute TTL. `relationship_cached.go:42` — key is `relationship:trainer:<id>` only. In a multi-instance deployment the invalidation is local to the process (`InvalidatePrefix` on the local cache), so other instances serve stale rosters for the full TTL.
- *Remediation:* key the cache by a version counter stored alongside the relationship set, or use a shared invalidation channel (Redis pub/sub) in multi-instance deployments.

---

## 6. Error handling and sentinel mapping

**F6.1 — High — Two sentinel vocabularies for the same concepts, with overlapping semantics.**
`domain/errors/errors.go` (8 sentinels) and `domain/services/errors.go` (13 sentinels) both define "not found"-style errors — `domainerrors.ErrNotFound` vs `services.ErrCoachingRequestNotFound` vs `services.ErrReviewNotFound` vs `services.ErrUserNotFound`. The handler catalog (`handlers/error_response.go:88-110`) must map all of them individually. Invitation errors live in `domain/errors` (`:31-42`) while coaching-request errors live in `domain/services` (`:24-71`) — the split follows no architectural rule, only which file happened to be written first.
- *Remediation:* one sentinel registry per bounded concept (connection, request, invitation), each with a single canonical "not found"/"conflict" error.

**F6.2 — Medium — Two different status codes for the same user-visible condition.**
`domainerrors.ErrInvalidInvitationCode` → **404** (`error_response.go:93`) while `services.ErrCoachTargetNotFound` → **404** (`:90`) and `domainerrors.ErrInvitationExpired` → **400** (`:109`) and `ErrInvitationAlreadyUsed` → **409** (`:105`). A typo'd code is "not found" but an expired code is "bad request" — inconsistent for the same user action (entering a code).
- *Remediation:* all three code-entry failures should map to the same status (400 with a distinct message, or 404 uniformly).

**F6.3 — Medium — `handleInternalError` vs `handleBusinessError` split produces inconsistent 500-vs-404 for identical repository errors.**
`relationship_handler.go:509` — `GetByID` failure is hard-coded to 404 regardless of cause (a DB outage reports "Relationship not found"). By contrast `error_response.go:166-184` `handleInternalError` classifies `ErrNotFound` as 500 (it only honours write-violation sentinels). So the same `ErrNotFound` from the same repository yields 404 on one route and 500 on another.
- *Remediation:* one classifier used by every handler; never branch on error identity in a handler.

**F6.4 — Low — Business errors are surfaced verbatim as user-facing text with no i18n key.**
`domain/services/errors.go:25-27` — the sentinel's English text *is* the API response body (`error_response.go:128`, `entry.sentinel.Error()`). The frontend has no error-code channel, so it can only display English strings while the rest of the UI is localized (`en`/`tr`).
- *Remediation:* return a stable error code + parameters; let the client map it to a translated message.

---

## 7. API design consistency

**F7.1 — Medium — Response shapes are inconsistent across the three connection endpoints.**
- `POST /relationships/accept` → `{message, relationship}` (`relationship_handler.go:224-227`)
- `PUT /coaching-requests/:id/accept` → `{message, relationship}` (`coaching_request_handler.go:154-157`)
- `PUT /coaching-requests/:id/reject` → `{message}` only (`:205`)
- `GET /relationships/my-clients` → `{clients, count}` (`:370-373`)
- `GET /coaching-requests/my` → `{requests}` — **no count** (`coaching_request_handler.go:243-244`)
- `GET /relationships/my-trainer` → `{pendingInvitations, activeTrainer?}` (`:295-302`)

**F7.2 — Medium — Pagination exists in the trainer catalog but not in any connection listing.**
`handlers/trainer_catalog_handler.go:62-78` supports `limit`/`offset` and returns `{trainers,total,limit,offset}`. `GET /coaching-requests/my`, `/pending`, and `/relationships/my-clients` return unbounded arrays with no total — `postgres/coaching_request.go:67,79,91` have no LIMIT. The frontend compensates with a client-side `useDeferredValue` filter (`trainer/clients/page.tsx:52-64`), i.e. the whole roster is shipped and filtered in the browser.

**F7.3 — Medium — Identifier strategy is inconsistent: relationship endpoints are keyed by `username` while mutations use numeric IDs, and one client passes the wrong identifier.**
`routes/relationship_routes.go:16-17` — `/client/:username`, `/client/:username/stats`. `DELETE /relationships/:id` takes a numeric relationship ID. `frontend/.../ClientDetailClient.tsx:188-189` passes `clientId={clientDetails.athlete?.userId ?? 0}` — the **athlete's user ID**, not the relationship ID — into `TerminateRelationshipDialog`, whose prop is then sent as `DELETE /relationships/${relationshipId}` (`features/trainer/TerminateRelationshipDialog.tsx:39`). The API surface mixes three identifier spaces (username, user ID, relationship ID) for one aggregate.
- *Remediation:* one canonical identifier per resource; use `relationshipId` everywhere for the relationship.

**F7.4 — Low — `GetMyTrainer`'s `pendingInvitations` field actually returns `relationships`, not invitations.**
`relationship_handler.go:263` calls `invitationService.GetPendingInvitations`, which returns `[]*models.Relationship` (`services/invitation_service.go:158-163`). The frontend type mirrors this (`frontend/src/types/index.ts:484`: `pendingInvitations: Relationship[]`). The name lies, and the pending-invitation feature is effectively dead: nothing ever creates a `pending` relationship row (`invitation_service.go:125-126` creates it `active`; `coaching_request_service.go:113` creates it `active`), so this array is always empty.
- *Remediation:* either remove the field or actually implement pending invitations.

---

## 8. Frontend / mobile duplication and divergence

**F8.1 — High — The two clients model the same endpoints with incompatible types, and the mobile client is wrong about two of them.**
`mobile/src/api/relationshipApi.ts:12` — `acceptInvitation` is typed `apiRequest<Relationship>` but the server returns `{message, relationship}` (`relationship_handler.go:224-227`). `mobile/src/api/relationshipApi.ts:15` — `getMyTrainer` typed `Relationship` but the server returns `{pendingInvitations, activeTrainer?}`. `mobile/src/api/relationshipApi.ts:9` — `getMyClients` typed `{clients: Relationship[]}` but the server returns `{clients: ClientWithAthlete[], count}` where each element is `{relationship, athlete}` (`relationship_handler.go:353-373`). The mobile `ClientsScreen.tsx:29-32` then reads `result.clients` as `Client[]` and renders `item.profile?.name` / `item.username` — fields that do not exist on `ClientWithAthlete`; they live at `item.athlete.profile.name`. The roster renders blank names.
- *Remediation:* share one generated contract package between web and mobile (the repo already generates `types/generated.ts` from the OpenAPI spec — use it for these responses instead of hand-written shapes).

**F8.2 — High — Two hand-maintained API clients with duplicated transport logic and diverging auth/error semantics.**
`frontend/src/lib/api/api-client.ts` (182 lines: `ApiError` with status, single refresh-and-replay, 204→`null`, timeout+abort) versus `mobile/src/api/client.ts` (135 lines: `SessionExpiredError`, refresh-and-replay, 204→`undefined`, timeout+abort). They differ in error shape (`ApiError.status` vs plain `Error`), in 204 handling (`null` vs `undefined`), and in session-expiry signalling. The mobile client also reads `error.message || error.error` (`client.ts:75,91`) while the backend returns `{"error": ...}` — consistent by luck, not by contract.
- *Remediation:* extract a shared `@gymtrack/api-client` package used by both, or generate both clients from the OpenAPI spec.

**F8.3 — Medium — Mobile query keys are inline literals, bypassing any key hierarchy.**
`mobile/src/components/features/coaching/CoachingRequestsScreen.tsx:43` — `queryKey: ["coachingRequests", isTrainer]`; invalidation at `:49,54` uses `["coachingRequests"]` (prefix-invalidates both variants, which happens to work). `mobile/src/components/features/trainer/ClientsScreen.tsx:25` — `["clients"]`. `mobile/src/components/features/trainer/MyTrainerScreen.tsx:29,48` — `["myTrainer"]`. The web app has a centralized factory (`frontend/src/lib/query-keys.ts:77-202`) with an explicit `all` prefix per domain. The mobile app has no equivalent, so cross-screen invalidation is ad hoc.
- *Remediation:* port the `qk` factory to mobile.

**F8.4 — Medium — Mutation invalidation sets are incomplete and inconsistent between web surfaces.**
`features/coaching/CoachingRequestsList.tsx:36-38` invalidates `qk.coaching.all` **and** `qk.clients.all` after accept — correct, since accept creates a relationship. `features/athlete/AcceptInvitationDialog.tsx:39-40` invalidates `qk.myTrainer.all` and `qk.currentUser` but **not** `qk.clients.all` — correct for the athlete, but the *trainer's* roster is not invalidated (no cross-user push exists; acceptable) while `qk.currentUser` is invalidated because `trainerAssignment` changed — an admission that the JSONB copy is client-visible state. `features/trainer/TerminateRelationshipDialog.tsx:46` invalidates only `qk.clients.all`, not `qk.myTrainer.all` — so an athlete who terminates their own relationship sees a stale "My Trainer" button.
- *Remediation:* derive invalidation sets from a single domain-event mapping rather than per-component choices.

**F8.5 — Low — The web `getMyTrainer` is fetched under three different query keys.**
`query-keys.ts:133-137` defines `qk.myTrainer.detail` and `qk.myTrainer.dashboard`; `MyTrainerButton.tsx:19`, `ProfileClient.tsx:571` and `athlete/my-trainer/[id]/page.tsx:27` all use `qk.myTrainer.detail` for the *same* endpoint, while `AthleteDashboardContent.tsx:63` uses `qk.myTrainer.dashboard` for it too. Two keys, one resource, one endpoint → two network fetches and two invalidation obligations.

---

## 9. Testability and test seams

**F9.1 — Medium — No unit tests for `CoachingRequestService`; the invitation path is well-tested by contrast.**
`services/invitation_service_test.go` provides `fakeInvitationMethod` + `stubRelationshipRepo` + `stubUserRepo` and covers claim/release/cancellation (`:160-288`). There is **no** `coaching_request_service_test.go` — the file list for `domain/services` shows none. The entire coaching-request state machine (duplicate detection, ownership, accept/reject transitions, the terminated-relationship guard) is covered only by HTTP-level e2e tests (`api/e2e/coach_e2e_test.go`).
- *Why it matters:* the service is the only place that could be tested cheaply for the state machine, and it is the least-tested part of the feature.

**F9.2 — Medium — The `InvitationMethod` port is a genuine seam, but `RelationshipRepository` has no equivalent test double at the service level for the coaching path.**
`invitation_service_test.go:76-115` hand-writes `stubRelationshipRepo` — a 40-line stub implementing all 8 interface methods, including two that are irrelevant to the tested paths. Every new service that touches relationships will need its own copy.
- *Remediation:* ship a shared `domain/repositories/testsupport` fake (or a gomock-generated mock) so stubs are not re-implemented per test.

**F9.3 — Medium — Handler-level fakes are duplicated across three files.**
`handlers/trainer_fakes_test.go:159-197` (`fakeRelationshipRepo`), `handlers/workout_plan_fakes_test.go:287-336` (`fakePlanRelationshipRepo`), `handlers/review_handler_test.go:18` (reuses `fakeRelationshipRepo`). Three implementations of the same interface in one package.
- *Remediation:* one shared fake in a `handlers/testsupport` file.

**F9.4 — Low — Repository tests are single-function happy-path suites.**
`postgres/relationship_test.go:15-159` is one `TestPostgresRelationshipRepository` with subtests; there is no test for the unique-constraint behaviour that F3.1 depends on, and no concurrency test for the claim/accept path.

---

## 10. Scalability, pagination, N+1

**F10.1 — High — N+1 user lookups in the trainer's client roster.**
`relationship_handler.go:359-368` — for each active relationship, `h.userRepo.GetUserByID` is issued individually. For a trainer with 200 clients that is 201 queries per page load. The `user:` cache (5-minute TTL, `cache/factory.go:88`) masks this in the common case but each call still does a cache lookup + gob deep-copy (`gocache_adapter.go:63`), and a cold cache turns it into 200 DB round-trips.
- *Remediation:* `GetUsersByIDs(ctx, []int)` batch query, as `TrainerCatalogService` already does for ratings (`services/trainer_catalog_service.go:58-73`).

**F10.2 — High — N+1 in the coaching-request list enrichment.**
`services/coaching_request_service.go:192-196` → `enrich` (`:201-219`) performs **two** `GetUserByID` calls per request, inside the loop, with errors swallowed (`:208`, `:214`). A trainer with 100 requests → 200 queries; a rejected athlete/trainer silently renders as `undefined
Continuing with the remainder of section 10 and the summary.

---

**F10.2 (continued) — *Remediation:*** batch-load the distinct athlete and trainer IDs for the page in two queries and hydrate from a map. `trainer_catalog_service.go:58-73` already demonstrates the batch pattern.

**F10.3 — High — Unbounded list queries with no pagination on every connection endpoint.**
`postgres/coaching_request.go:67` (`GetByAthleteID`), `:79` (`GetByTrainerID`), `:91` (`GetPendingByTrainerID`), `postgres/relationship.go:67` (`GetByTrainerID`) — no `LIMIT`/`OFFSET`. `GET /coaching-requests/my` for a long-lived trainer returns every request ever made, and `GET /relationships/my-clients` returns every relationship row including terminated ones (`relationship_handler.go:346-350` filters to active *after* fetching all).

**F10.4 — Medium — The stats endpoints load up to 1000 rows each and aggregate in Go.**
`relationship_handler.go:444-445` and `:617-618` — `GetByAthleteID(ctx, id, 1000, 0)` for workouts and meals, then `calculateWorkoutStats` / `calculateMealStats` (`:632-798`) aggregate in Go, including a `weeklyMap` and a `map[string]*ExerciseStat` whose iteration order is nondeterministic (`:701-704`, `:782-788`) so the response body ordering varies between calls. Errors from the loads are discarded (`:444-445` uses `_`), so a DB failure silently yields zeroed stats.
- *Remediation:* push the aggregation to SQL, make the row cap explicit and paginated, sort the result slices, and stop swallowing the errors.

**F10.5 — Medium — Authorization scans the full trainer relationship set on every request.**
`relationship_handler.go:424-441` and `:597-614` — `GetByTrainerID` (uncached for these purposes, and the cached variant returns *all* rows) is fetched and scanned in Go to answer "is this one athlete my client?". `services/workout_service.go:226-239` and `services/meal_service.go:154-167` repeat the same pattern.
- *Remediation:* use `HasActiveRelationship(trainerID, athleteID)` — a single indexed `EXISTS` — which the services already have (`postgres/relationship.go:132-141`).

**F10.6 — Medium — `GetByAthleteID` uses `LIMIT 1` without a status filter, so it cannot be indexed for the "active" question.**
`postgres/relationship.go:91` — `WHERE athlete_id = $1 ORDER BY created_at DESC LIMIT 1`. The index `idx_relationships_athlete (athlete_id, status)` (`001_baseline.up.sql:1133`) does not help the `ORDER BY created_at DESC` sort, so this is a scan-plus-sort per call, on a path hit by every accept, every `my-trainer` load, and every profile load.

---

## Architectural themes

- **The connection feature has no aggregate.** `relationships` is the de-facto source of truth, but no service owns it: handlers write it directly, and two separate services each re-implement "establish", "find active", and "terminate" with subtly different rules.
- **Two mechanisms, one outcome, no shared state machine.** Invitation codes and coaching requests both mint an `active` relationship row with different guards, leaving pending requests to the other trainer stranded and answerable after the athlete is already connected.
- **Invariants live in application code, not the schema.** No partial unique index for "one active trainer per athlete", no unique constraint on pending requests, no transactional grouping of the relationship + profile write — every rule is a read-then-write that a concurrent request can interleave with.
- **Denormalized state outlives its writer.** `users.profile.trainerAssignment` and `users.profile.clientList` duplicate the relationship graph in unqueryable JSONB, written by three layers, and are read by the frontend as authoritative.
- **Read paths are layered unevenly.** `RelationshipRepository` is cached for one method only, invalidated by a full-prefix scan, and bypassed by the service layer where the interesting authorization checks live; N+1 fan-outs on users and coaching requests are unmitigated.
- **Error handling is well-intentioned but fragmented.** Sentinel-based mapping is sound in principle, yet the sentinels live in two packages, three handlers classify identical errors differently, and the user-facing text is baked into the domain.
- **The HTTP contract is client-specific.** The same endpoints have different response envelopes, identifier semantics, and pagination support; the mobile client hand-writes types against a spec the web client also hand-writes, and the two disagree with the server in at least three places.
- **Test seams exist only where they were needed.** The invitation path has a proper port and fakes; the coaching-request path, the handler layer, and the relationship aggregate have no equivalent — and the guards that differ between them live precisely there.
