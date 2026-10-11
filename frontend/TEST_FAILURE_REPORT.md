# Frontend Test Failure Report

**Project:** GymTrack Frontend (Next.js 16 / React 19)
**Run:** `pnpm test:run` (Vitest 4.1.5, jsdom)
**Date:** 2026-10-11

---

## 1. Summary

| Metric | Original | Now |
|---|---|---|
| Test files total | 29 (+4 e2e mis-collected) | 26 |
| Tests total | 177 | 189 (incl. 13 new tests) |
| **Tests failed** | **51** | **0** |
| Tests passed | 126 | 189 |
| Pass rate | 71.2% | **100%** |

The suite was **not randomly broken**. Every failure traced to a small number of root causes:

1. a `next-intl` mock that returned translation keys instead of copy,
2. an origin mismatch that made **every** MSW handler unreachable,
3. Vitest collecting Playwright specs,
4. two auth pages whose tests mocked a module they no longer import,
5. fixtures using stale string ids for numeric model fields,
6. three genuine product bugs the tests had been correctly failing on.

> 3 consecutive full runs: `189 passed (189)`.
> `tsc --noEmit`: **0 errors across `src/test/`** (was 16).
> `pnpm lint`: 0 errors in every file touched (the 9 remaining project-wide errors are pre-existing and unrelated).
> `pnpm validate:i18n`: both locales valid, key parity at 1156 keys.

---

## 2. Failure Distribution

| Test File | Failures | Root Cause Group |
|---|---|---|
| `src/test/api/account-management.test.ts` | 4 | MSW handlers missing |
| `src/test/components/athlete/AcceptInvitationDialog.test.tsx` | 8 | i18n mock returns key, not copy |
| `src/test/components/auth/LoginPage.test.tsx` | 7 | i18n mock returns key, not copy |
| `src/test/components/auth/RegisterPage.test.tsx` | 8 | i18n mock returns key, not copy |
| `src/test/components/comments/CommentForm.test.tsx` | 9 | i18n mock returns key, not copy |
| `src/test/components/comments/CommentItem.test.tsx` | 5 | i18n mock returns key, not copy |
| `src/test/components/comments/CommentList.test.tsx` | 3 | i18n mock returns key, not copy |
| `src/test/components/comments/CommentThread.test.tsx` | 1 | i18n mock returns key, not copy |
| `src/test/components/profile/DeleteAccountSection.test.tsx` | 2 | Broken test mock selector |
| `src/test/components/workout/WorkoutForm.test.tsx` | 4 | Form validation / async act |
| `src/e2e/**` (4 Playwright files) | — | Vitest collecting Playwright specs |

### Failure type histogram

| Error | Count |
|---|---|
| `Unable to find a label with the text of: /email/i` | 13 |
| `Unable to find accessible button /connect with trainer/i` | 8 |
| `Unable to find element with placeholder: Add a comment...` | 5 |
| `Unable to find accessible button /edit/i` | 3 |
| `AssertionError: expected vi.fn() to be called at least once` | 2 |
| `AssertionError: expected vi.fn() to be called with [ 'c1' ]` | 2 |
| `InternalError: [MSW] Cannot bypass a request … "error" strategy` | 2 |
| Other per-test selector/assertion failures | 16 |

---

## 3. Root Cause Analysis

### RC-1 — `next-intl` mock in `setup.ts` returns the key, not the copy (dominant cause; ~40 failures)

**File:** `src/test/setup.ts:7-17`

```ts
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const lastSegment = key.split('.').pop() || key   // "title" -> "title"
    return lastSegment
  },
}))
```

Components call `useTranslations(...)` and render `t("some.key")`. The mock returns only the **last dot-segment of the key**, so the DOM contains `label`, `title`, `submit`, `confirm`, `code`, `count` — never the English copy the tests assert against (`Email`, `Log Workout`, `Connect with Trainer`, `Comment`, …).

Proof from the failure output — the RegisterPage DOM shows the label rendering literally as the string `label`:

```html
<label for="username" data-slot="field-label">label</label>
<input id="username" placeholder="placeholder" type="text" />
```

Also note the mock does **not** interpolate ICU plurals (`{count}`, `plural, ...`), so composite strings like `Comments ({count})` degrade further.

**Impact:** every assertion using real user-facing copy fails.

**RESOLUTION — replaced with a faithful implementation.**

| File | Change |
|---|---|
| `src/test/i18n.ts` | **New.** Resolves keys against the real `messages/en.json` and formats the ICU subset the project uses — `{name}`, `{n, plural, =0 {..} other {..}}` with `#` substitution, `{n, select, ..}`, and `{n, number\|date\|time, <style>}`. Plural categories come from `Intl.PluralRules`. Deliberately dependency-free so the harness cannot break if pnpm re-prunes the currently-undeclared transitive `intl-messageformat`/`use-intl`. Missing keys fall back to the full dotted path so failures stay readable instead of throwing. |
| `src/test/setup.ts` | `useTranslations` now delegates to `createTestTranslator(namespace)`. Added `useLocale`, `useMessages`, `useNow`, `useTimeZone`, `hasLocale`, async `getTranslations`/`getLocale`/`getMessages`, and a pass-through `NextIntlClientProvider`. Factory made `async` so it can import `./i18n` after `vi.mock` hoisting. Also stubs `scrollIntoView` + pointer-capture (RC-7). |
| `src/test/i18n.test.ts` | **New.** 9 tests locking in key resolution, interpolation, plural `=0`/`=1`/`other`, `#` substitution, namespace scoping, missing-key fallback, and edge cases. |

**Assertions updated across 18 files** so they assert real copy rather than raw keys — e.g. `/submit/i` → `/log workout/i`, `filter_muscle_group` → `Muscle Group`, `/fallback_name/i` → `/exercise \d/i`, `'confirm'` → `'Delete My Account'`.

Two required judgement calls rather than blind substitution:

- **`exercise-library-filters.test.tsx`** was written *around* the broken mock — its comment asserted the localised label "renders as its code — 'shoulders', not the database's English 'Shoulders'". With real copy both are now `"Shoulders"`, so the discriminator vanished. Fixtures were changed to carry descriptions (`Deltoids`, `Pulley`) distinct from the translation, preserving the test's real intent: proving the resolver ran instead of falling back to the description column.
- **`CommentForm.test.tsx`** queried `getByPlaceholderText`, but `CommentForm` only passes `placeholder` to `<FieldLabel>` — the `<Textarea>` has no placeholder. Switching to `getByLabelText` exposed that Base UI's `FieldLabel` here carries no `for`/`aria-labelledby`, so **the textarea has no accessible name** (see RC-7). Switched to the existing `data-testid="comment-content"`.

**Outcome: 51 → 26 failures. 25 fixed, 0 newly broken.**


---

### RC-2 — Vitest was collecting Playwright `src/e2e/**` specs (4 failing files) — ✅ FIXED

**Files:** `src/e2e/auth/auth.spec.ts`, `src/e2e/plan/plan.spec.ts`, `src/e2e/track/track.spec.ts`, `src/e2e/rel/rel.spec.ts`

```
Playwright Test did not expect test.describe() to be called here.
```

`vitest.config.ts` had no `include`/`exclude`, so Vitest's default glob swept up `*.spec.ts` under `src/e2e/`.

**Resolution:** added `exclude: ['src/e2e/**', 'node_modules/**', '.next/**']` to `vitest.config.ts`. Playwright still owns those files via `pnpm test:e2e`.

---

### RC-3 - MSW handlers could never match: wrong origin (4 failures + a suite-wide latent bug) - ✅ FIXED

**Originally misdiagnosed as "handlers are missing".** Two of them were - but that was masking a suite-wide bug: **no MSW handler matched anything at all.**

`handlers.ts` defines every route as a **relative** path (`/api/workouts`, `/api/users/me`, ...). MSW resolves relative paths against the document origin, which under Vitest's default jsdom config is `http://localhost:3000/`. But `api-client.ts` builds an **absolute** URL - `http://localhost:8080/api/...`. So `/api/auth/login` resolved to `http://localhost:3000/api/auth/login` and never matched the request. Every API-level test failed with:

```
InternalError: [MSW] Cannot bypass a request when using the "error" strategy
for the "onUnhandledRequest" option.
```

This is why `account-management.test.ts` reported `[MSW] Cannot bypass...` for `DELETE /users/me` and `POST /auth/restore`: those two handlers genuinely were absent, but the same error masked the fact that *no* handler matched - including the pre-existing `POST /api/auth/login`. Verified directly: under the old config a relative `http.post('/api/auth/login')` failed to match, while an absolute `http.post('http://localhost:8080/api/auth/login')` matched immediately.

Component tests were unaffected because they mock `@/lib/api` wholesale, so MSW was never exercised - which is why this went unnoticed.

**Resolution:**

| File | Change |
|---|---|
| `vitest.config.ts` | `environmentOptions.jsdom.url` pinned to `http://localhost:8080` so relative handler paths resolve to the API origin and match. Verified nothing depends on the host - only `location.search` / `location.pathname` are read anywhere in `src`. |
| `src/test/mocks/handlers.ts` | Added the genuinely missing `DELETE /api/users/me` (soft delete; 401 `invalid password` on a wrong password) and `POST /auth/restore` (401 expired/invalid, else the `restored-*` tokens). Extracted and exported `DELETE_ACCOUNT_PASSWORD` / `RESTORE_PASSWORD`. |
| `src/test/api/account-management.test.ts` | Imports the shared password constants instead of duplicating `'correct123'`. |

This also fixed `DeleteAccountSection.test.tsx` (2 tests) as a side effect - its unmocked `userApi.deleteAccount` previously fell into the "unhandled request" error path; it now reaches a real handler.

**Outcome: 4 + 2 tests fixed.**

---

### RC-4 — `DeleteAccountSection` relied on an unreachable MSW handler (2 failures) — ✅ FIXED via RC-3

**File:** `src/test/components/profile/DeleteAccountSection.test.tsx:14-19`

```ts
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => { const state = { logout: mockLogout }; return selector(state) },
}))
```

`DeleteAccountSection` calls `userApi.deleteAccount(pw)` then `await logout()`. This test mocks the store but **not** `userApi`, so the real call went to MSW. Because of RC-3 that request matched no handler and threw, so `logout` was never reached and the error text was the MSW error rather than `invalid password`.

Adding the `DELETE /api/users/me` handler and fixing the origin (RC-3) made this pass without touching the test: the password sent is `'correct123'`, which is exactly the `DELETE_ACCOUNT_PASSWORD` the handler accepts.

**Worth noting for the future:** this test still depends on a real MSW handler matching. Mocking `@/lib/api/userApi` per test would make it independent of handler state, which is the more robust design.

---

### RC-5 — `WorkoutForm` submission path (4 failures)

**File:** `src/test/components/workout/WorkoutForm.test.tsx`

| Test | Line | Failure |
|---|---|---|
| `removes exercise when remove button is clicked` | 60 | `STACK_TRACE_ERROR` (unhandled rejection escaping the test) |
| `submits form with valid data` | 95 | `expected "vi.fn()" to be called with arguments: [ObjectContaining{…}] — Number of calls: 0` |
| `shows loading state during submission` | 127 | `expect(element).toBeDisabled()` — button is **not** disabled |
| `handles submission error` | 140 | `expected "vi.fn()" to be called at least once` |

The submit button only carries `disabled={isPending}` (`WorkoutForm.tsx:389`). Clicking submit on a pristine form fails Zod validation, so `useMutation` never runs, `isPending` stays `false`, and `mockCreate` is never called. The tests assume the form pre-validates or that the fields are pre-filled — they are not. The `STACK_TRACE_ERROR` at line 60 comes from the un-awaited rejection of `mockCreate.mockRejectedValue(...)` in a previous test bleeding into the next.

**Fix:** in the submission tests, fill the date / exercise / set fields (or mock the validation schema) before clicking, and `await` the rejected-promise assertions inside `waitFor`.

---

### RC-6 — `CommentItem` / `CommentList` reply wiring (2 failures)

```
AssertionError: expected "vi.fn()" to be called with arguments: [ 'c1' ]
```

- `CommentItem.test.tsx:163` — `onReply` never called
- `CommentList.test.tsx:114` — `onStartReply` never called

The reply button label resolves to `reply` via the RC-1 mock; the test's `getByRole('button', { name: /reply/i })` matches it, but the click does not propagate the expected id. Likely the id is passed as `commentId` (numeric `1` in the fixture) while the test expects the string `'c1'` — the test and the component disagree on the id type/shape. Verify `CommentItem`'s `onReply?.(...)` payload against the fixture (`commentId: 1`).

---

## 4. Per-Test Failure Messages

### `src/test/api/account-management.test.ts` (4)

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `userApi.deleteAccount sends DELETE /users/me with password body` | — | `InternalError: [MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.` |
| 2 | `userApi.deleteAccount throws on wrong password` | `account-management.test.ts:12:52` | `Error: expected [Function] to throw error including 'invalid password' but got '[MSW] Cannot bypass a request when us…'` |
| 3 | `authApi.restoreAccount sends POST /auth/restore with identifier and password` | — | `InternalError: [MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.` |
| 4 | `authApi.restoreAccount throws on invalid credentials` | `account-management.test.ts:30:5` | `Error: expected [Function] to throw error including 'restore period expired' but got '[MSW] Cannot bypass a request when us…'` |

### `src/test/components/auth/LoginPage.test.tsx` (7)

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `renders login form correctly` | `LoginPage.test.tsx:31:19` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 2 | `shows validation errors for empty fields` | `LoginPage.test.tsx:42:33` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /login/i` |
| 3 | `shows validation error for invalid email` | `LoginPage.test.tsx:55:31` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 4 | `submits form with valid data` | `LoginPage.test.tsx:72:31` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 5 | `shows error message on login failure` | `LoginPage.test.tsx:92:31` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 6 | `disables submit button and shows loading state during submission` | `LoginPage.test.tsx:111:31` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 7 | `clears error message when user starts typing` | `LoginPage.test.tsx:132:31` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |

### `src/test/components/auth/RegisterPage.test.tsx` (8)

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `renders registration form with all fields` | `RegisterPage.test.tsx:45:19` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 2 | `does not call register API when email format is invalid` | `RegisterPage.test.tsx:61:28` | `TestingLibraryElementError: Unable to find an accessible element with the role "textbox" and name /email/i` |
| 3 | `shows validation error when password is too short` | `RegisterPage.test.tsx:76:28` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 4 | `shows validation error when passwords do not match` | `RegisterPage.test.tsx:91:28` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 5 | `shows validation error when name is empty` | `RegisterPage.test.tsx:106:28` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 6 | `submits form with valid data and redirects after success` | `RegisterPage.test.tsx:137:28` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 7 | `shows error message on registration failure` | `RegisterPage.test.tsx:163:28` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |
| 8 | `disables submit button and shows loading state during submission` | `RegisterPage.test.tsx:183:28` | `TestingLibraryElementError: Unable to find a label with the text of: /email/i` |

### `src/test/components/athlete/AcceptInvitationDialog.test.tsx` (8)

All eight fail on the same missing trigger button.

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `renders trigger button to open dialog` | `AcceptInvitationDialog.test.tsx:29:19` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /connect with trainer/i` |
| 2 | `opens dialog when trigger is clicked` | `AcceptInvitationDialog.test.tsx:36:29` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /connect with trainer/i` |
| 3 | `validates invitation code must be exactly 8 alphanumeric characters` | `AcceptInvitationDialog.test.tsx:46:29` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /connect with trainer/i` |
| 4 | `sanitizes input to alphanumeric only` | `AcceptInvitationDialog.test.tsx:65:29` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /connect with trainer/i` |
| 5 | `disables submit when code is not exactly 8 characters` | `AcceptInvitationDialog.test.tsx:77:29` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /connect with trainer/i` |
| 6 | `shows success state when invitation accepted` | `AcceptInvitationDialog.test.tsx:93:29` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /connect with trainer/i` |
| 7 | `shows error message when API fails` | `AcceptInvitationDialog.test.tsx:113:29` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /connect with trainer/i` |
| 8 | `shows loading state during submission` | `AcceptInvitationDialog.test.tsx:133:29` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /connect with trainer/i` |

### `src/test/components/comments/CommentForm.test.tsx` (9)

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `renders form with textarea and submit button` | `CommentForm.test.tsx:40:19` | `TestingLibraryElementError: Unable to find an element with the placeholder text of: Add a comment...` |
| 2 | `renders with "Reply" button when parentCommentId provided` | `CommentForm.test.tsx:54:19` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Reply"` |
| 3 | `renders cancel button when onCancel provided` | `CommentForm.test.tsx:68:19` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Cancel"` |
| 4 | `submits valid comment data` | `CommentForm.test.tsx:85:29` | `TestingLibraryElementError: Unable to find an element with the placeholder text of: Add a comment...` |
| 5 | `shows validation error for empty content` | `CommentForm.test.tsx:113:33` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Comment"` |
| 6 | `resets form after successful submission` | `CommentForm.test.tsx:135:29` | `TestingLibraryElementError: Unable to find an element with the placeholder text of: Add a comment...` |
| 7 | `calls onSuccess callback after submission` | `CommentForm.test.tsx:160:29` | `TestingLibraryElementError: Unable to find an element with the placeholder text of: Add a comment...` |
| 8 | `handles API error gracefully` | `CommentForm.test.tsx:183:29` | `TestingLibraryElementError: Unable to find an element with the placeholder text of: Add a comment...` |
| 9 | `uses custom placeholder when provided` | `CommentForm.test.tsx:204:19` | `TestingLibraryElementError: Unable to find an element with the placeholder text of: Write your thoughts...` |

> Note: test 9 passes a custom `placeholder` prop but the component's rendered placeholder still resolves via `t("form.comment")`. Verify `placeholder` prop is actually threaded into the `Textarea` (`CommentForm.tsx:38, 90-91`) — the failure suggests the prop is ignored for the textarea and only used for the `FieldLabel`.

### `src/test/components/comments/CommentItem.test.tsx` (5)

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `shows edit and delete buttons only for own comments` | `CommentItem.test.tsx:83:19` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /edit/i` |
| 2 | `enters edit mode and shows textarea` | `CommentItem.test.tsx:112:28` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /edit/i` |
| 3 | `cancels edit mode` | `CommentItem.test.tsx:127:28` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /edit/i` |
| 4 | `deletes comment after confirmation` | `CommentItem.test.tsx:144:28` | `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name /delete/i` |
| 5 | `shows reply button when onReply provided and not a reply` | `CommentItem.test.tsx:163:21` | `AssertionError: expected "vi.fn()" to be called with arguments: [ 'c1' ]` |

### `src/test/components/comments/CommentList.test.tsx` (3)

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `shows empty state when no comments` | `CommentList.test.tsx:77:19` | `TestingLibraryElementError: Unable to find an element with the text: /no comments yet/i. This could be because the text is broken up by multiple elements…` |
| 2 | `calls onStartReply with correct id when reply button clicked` | `CommentList.test.tsx:114:26` | `AssertionError: expected "vi.fn()" to be called with arguments: [ 'c1' ]` |
| 3 | `renders reply form when replyingToId matches` | `CommentList.test.tsx:129:19` | `TestingLibraryElementError: Unable to find an element with the placeholder text of: /write a reply/i` |

### `src/test/components/comments/CommentThread.test.tsx` (1)

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `displays comment count in header` | `CommentThread.test.tsx:82:11` | `Error: Unable to find an element with the text: /comments \(2\)/i. This could be because the text is broken up by multiple elements…` |

> The rendered `aria-label` is `"title"` (raw key) — `CommentThread.tsx:45` uses `t("list.title")` with no count interpolation.

### `src/test/components/profile/DeleteAccountSection.test.tsx` (2)

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `calls deleteAccount with password on confirm` | `DeleteAccountSection.test.tsx:72:26` | `AssertionError: expected "vi.fn()" to be called at least once` (expected `mockLogout`; `userApi.deleteAccount` is unmocked and hits MSW) |
| 2 | `shows error on wrong password` | `DeleteAccountSection.test.tsx:96:11` | `Error: Unable to find an element with the text: invalid password. This could be because the text is broken up by multiple elements…` |

### `src/test/components/workout/WorkoutForm.test.tsx` (4)

| # | Test | Location | Failure message |
|---|---|---|---|
| 1 | `removes exercise when remove button is clicked` | `WorkoutForm.test.tsx:60:3` | `Error: STACK_TRACE_ERROR` (unhandled rejection leaking from the prior test's `mockRejectedValue`) |
| 2 | `submits form with valid data` | `WorkoutForm.test.tsx:95:26` | `AssertionError: expected "vi.fn()" to be called with arguments: [ObjectContaining{…}]` — `Number of calls: 0` |
| 3 | `shows loading state during submission` | `WorkoutForm.test.tsx:127:61` | `Error: expect(element).toBeDisabled()` — Received element is not disabled (button has `type="submit"` but no `disabled` attribute because `isPending` never became true) |
| 4 | `handles submission error` | `WorkoutForm.test.tsx:140:26` | `AssertionError: expected "vi.fn()" to be called at least once` |

---

## 5. Fix Progress

| # | Root cause | Fix | Tests |
|---|---|---|---|
| RC-1 | `next-intl` mock returned keys, not copy | `src/test/i18n.ts` (new), `src/test/setup.ts` | 25 |
| RC-2 | Vitest collected Playwright `src/e2e/**` specs | `vitest.config.ts` exclude | 4 files |
| RC-3 | MSW handlers unreachable (origin) + 2 genuinely missing | `vitest.config.ts`, `src/test/mocks/handlers.ts` | 6 |
| RC-4 | `DeleteAccountSection` depended on an unreachable handler | resolved by RC-3 | 2 |
| RC-5 | `WorkoutForm` submission blocked on a pristine form | `WorkoutForm.test.tsx` | 4 |
| RC-6 | Comment fixtures used stale string ids | `CommentItem.test.tsx`, `CommentList.test.tsx` | 7 |
| RC-7 | `CommentThread` never rendered the comment count | `CommentThread.tsx` | 1 |
| RC-8 | `LoginPage` never cleared the error on edit | `login/page.tsx` | 1 |
| — | Both auth pages mocked `next/navigation`, not `@/i18n/navigation` | `LoginPage.test.tsx`, `RegisterPage.test.tsx` | 12 |
| — | `RegisterPage` copy drift + unfilled `username` field | `RegisterPage.test.tsx` | 6 |

**Total: 51 → 0 failures. No test was deleted; 12 new tests were added.**

---

## 6. Product Issues — all fixed

- **Password length message contradicted the validator.** ✅ Fixed. Confirmed
  against the backend contract first: `backend/docs/swagger.json` declares
  `minLength: 8` for both register and login, and both Zod schemas and both
  inline validators reject under 8. The `"at least 6 characters"` strings in
  `messages/en.json` **and** `messages/tr.json` were simply wrong — corrected to
  8. The field's placeholder already said 8, which is what made the
  contradiction visible.
- **`FieldInfo` did not link its error to the input.** ✅ Fixed. Added
  `fieldErrorId(fieldName)` to `src/components/ui/field.tsx`; `FieldInfo` now
  stamps that id onto the `FieldError`, and 14 single-control call sites point at
  it with `aria-describedby` — register/login/forgot-password pages,
  `ProfileClient`, `CommentForm`, `FoodItemCard` (3), `MealFormFields` (incl. its
  `SelectTrigger`), and `CreateReviewDialog`. Locked in by a test.
  *Not wired:* the two `WorkoutExerciseCard` sites, whose errors describe a
  compound control (`ExerciseSelector`, a multi-input `ExerciseSetInput`) where
  one `aria-describedby` would not describe the group correctly. `role="alert"`
  still announces those on appearance.
- **`CommentForm`'s textarea had no accessible name.** ✅ Fixed. The `placeholder`
  prop now also lands on the `<Textarea>` *and* the `<FieldLabel htmlFor>` points
  at its id, so the control has a real name. `FoodItemCard`'s three inputs had
  the same defect (labels with no `htmlFor`, inputs with no `id`) and were fixed
  the same way.
- **Two defined-but-unused translation keys.** ✅ Fixed.
  `workout.form.submitting` ("Saving…" / "Kaydediliyor…") now renders on the
  WorkoutForm submit button instead of the button silently keeping "Log Workout"
  while pending. `comment.list.comments_count` was fixed earlier (RC-7).
- **`WorkoutExerciseCard`'s collapse toggle had a hardcoded English
  `aria-label`.** ✅ Fixed. Added `workout.form.expand_exercise` /
  `collapse_exercise` in both locales.
- **Both auth pages' tests mocked `next/navigation`** while the pages import
  `@/i18n/navigation`. ✅ Fixed in the tests. A shared render helper would
  prevent the drift recurring; not done here.

### Still outstanding (not test-covered)

- The 58 project-wide `tsc` errors and 9 ESLint errors are pre-existing and
  unrelated — mostly `currentUser.profile` possibly-undefined in
  `ProfileClient.tsx` and React 19 "impure function during render" warnings in
  the `animate-ui` primitives.
- `next build` was not run in this pass; these changes touch client components
  and message files only, so a build check is still worth doing before merge.

---

## 7. Reproduction

```bash
cd frontend
pnpm test:run                      # full suite
pnpm test:run --reporter=verbose   # per-test names
pnpm vitest run src/test/i18n.test.ts   # the translator harness on its own
pnpm vitest run --reporter=json --outputFile=results.json   # machine-readable
```

Current state: `Test Files 26 passed (26)`, `Tests 189 passed (189)`.
