# Mobile — Gluestack UI v5 + NativeWind v5 + Tailwind v4 Migration

Branch: `feature/mobile/gluestack`
Status: planning

## Context

`mobile/` (Expo SDK 57, RN 0.86, expo-router) currently builds every screen with raw `react-native` primitives and `StyleSheet.create`. Color tokens live in `src/constants/Colors.ts` (30+ semantic names, two schemes) and are consumed via `useThemeColors()`. There is no UI library — no gluestack, no paper, no RNUI, no @rn-primitives.

Gluestack UI v5 (alpha) + NativeWind v5 + Tailwind v4 has already been wired in the previous commit:

- `metro.config.js` wraps the default config with `withNativewind`
- `postcss.config.js` registers `@tailwindcss/postcss`
- `global.css` exists at project root with the v4 import list and a starter token set
- `gluestack-ui.config.json` points `app.components` at `src/components/ui`
- `app/_layout.tsx` wraps the tree in `<GluestackUIProvider mode="system">` (composes `OverlayProvider` + `ToastProvider`)
- `package.json` pins `lightningcss@1.30.1` in `overrides` + `resolutions`
- `babel.config.js` uses `react-native-worklets/plugin` (reanimated 4 requirement)

This plan replaces every `View`/`Text`/`TextInput`/`TouchableOpacity`/`StyleSheet.create` site with gluestack components styled via `className`, and ports the semantic palette from `Colors.ts` into `global.css` so the visual identity survives.

---

## Audit summary

- **22 feature screens** in `src/components/features/*/`, all using raw RN primitives.
- **Zero** `Themed.*` wrapper usage (file exists, dead).
- **25 files** import `useThemeColors` from `@/components/useThemeColors`.
- **12 files** call `Alert.alert` (kept; no Toast migration).
- **No** `@gorhom/bottom-sheet` or `@expo/ui` consumer in `src/`.
- **No** gluestack / paper / RNUI / @rn-primitives / react-native-reusables.
- **`@shopify/flash-list`** in use — keep (no gluestack equivalent worth swapping).
- **Delete candidates (verified orphan)**:
  - `src/components/useClientOnlyValue.ts` — no callers
  - `src/components/SplashScreen.tsx` — no callers
  - `src/components/Themed.tsx` — no callers
  - `src/lib/ios-accessibility.ts` — no callers; `@expo/ui` removal makes it permanently dead
- **Dep candidates for removal**: `@expo/ui`, `@gorhom/bottom-sheet`.

---

## Decisions

- Icons: `@expo/vector-icons` (already installed; used in `(tabs)/`). Render via gluestack `Icon as={Ionicons}` etc.
- Component sourcing: `npx gluestack-ui@latest add <component> --use-pnpm -y` for every primitive. CLI writes into `src/components/ui/<name>/` per `gluestack-ui.config.json`.
- `Alert.alert` stays for success/error notifications.
- `AlertDialog` only for destructive confirms (logout, terminate relationship).
- 4 commits total: one per phase. Branch `feature/mobile/gluestack`.
- Skills enabled for visual QA at the end: `better-ui`, `better-typography`, `better-colors`, `better-accessibility`.

---

## Phase 0 — Token migration + dependency cleanup - DONE

**Commit:** `chore(mobile): drop @expo/ui, @gorhom/bottom-sheet, dead helpers; port tokens to global.css`

1. `pnpm remove @expo/ui @gorhom/bottom-sheet`
2. Delete orphaned files:
   - `src/components/useClientOnlyValue.ts`
   - `src/components/SplashScreen.tsx`
   - `src/components/Themed.tsx`
   - `src/lib/ios-accessibility.ts`
3. Delete the full theme chain (replaced by `global.css`):
   - `src/constants/Colors.ts`
   - `src/components/useThemeColors.ts`
   - `src/components/useColorScheme.ts`
4. Port the palette from `Colors.ts` into `global.css`:
   - `@theme` block with primitive ramps (`--color-accent-50..900`, `--color-neutral-50..900`, `--color-danger-*`, `--color-success-*`, `--color-warning-*`, `--color-invite-*`) — these become `bg-accent-500`, `text-neutral-700`, etc.
   - Semantic tokens (`--color-text`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-body`, `--color-background`, `--color-surface-subtle`, `--color-card`, `--color-border`, `--color-border-strong`, `--color-accent`, `--color-accent-on-light`, `--color-accent-disabled`, `--color-accent-surface`, `--color-on-accent`, `--color-danger`, `--color-danger-text`, `--color-danger-surface`, `--color-danger-border`, `--color-danger-on-fill`, `--color-success`, `--color-success-text`, `--color-success-surface`, `--color-warning`, `--color-warning-text`, `--color-warning-surface`, `--color-invite`, `--color-invite-disabled`, `--color-tab-icon-default`, `--color-tab-icon-selected`) — every key in `ThemeColors` interface maps to one. Light defaults in `:root`, dark overrides in `@media (prefers-color-scheme: dark)` and `:root.dark`.
5. Verify: `pnpm tsc --noEmit`, `pnpm lint`.

---

## Phase 1 — Add gluestack-ui components via CLI - DONE

**Commit:** `feat(mobile): add gluestack-ui v5 components (box, text, button, …)`

Use `npx gluestack-ui@latest add <component> --use-pnpm -y` for each. Add order (deps first):

1. `box` (foundation)
2. `text`, `heading`
3. `hstack`, `vstack`, `center`, `divider`
4. `pressable`
5. `icon`
6. `button`
7. `input`, `textarea`
8. `form-control`
9. `checkbox`, `radio`, `switch`
10. `spinner`
11. `avatar`, `badge`, `card`
12. `link`
13. `modal`
14. `alert-dialog`

Verify after each `add` (or in groups): `pnpm tsc --noEmit`. If CLI TTY-fails, fallback: manually copy from `node_modules/@gluestack-ui/core/<name>/creator/` into `src/components/ui/<name>/`.

Skipped (no equivalent worth swapping):
- `FlashList` (keep `@shopify/flash-list`)
- `ScrollView`, `KeyboardAvoidingView`, `RefreshControl` (keep from RN)
- `Toast`, `Actionsheet`, `BottomSheet` (out of scope this round)

---

## Phase 2 — Migrate screens, domain by domain

**Commit:** `refactor(mobile): migrate screens to gluestack-ui + NativeWind`

Order (least → most coupled):

1. **Auth** — `LoginScreen.tsx`, `RegisterScreen.tsx`
2. **Profile** — `ProfileScreen.tsx`
3. **Trainer catalog** — `TrainerCatalogScreen.tsx`, `TrainerDetailScreen.tsx`
4. **Trainer workspace** — `ClientsScreen.tsx`, `ClientDetailScreen.tsx`, `TrainerProfileScreen.tsx`, `StarRatingInput.tsx`, `MyTrainerScreen.tsx`
5. **Workout/Meal/Measurement** — `WorkoutsScreen.tsx`, `WorkoutDetailScreen.tsx`, `MealsScreen.tsx`, `MealDetailScreen.tsx`, `MeasurementsScreen.tsx`, `ExercisePicker.tsx`
6. **Workout plans** — `WorkoutPlansScreen.tsx`, `WorkoutPlanDetailScreen.tsx`, `MyWorkoutPlansScreen.tsx`, `AssignClientModal.tsx`, `CoachingRequestsScreen.tsx`
7. **Comments + Dashboard + Loading** — `CommentSection.tsx`, `DashboardScreen.tsx`, `LoadingScreen.tsx`

Conversion rules per file:
- `createStyles(c)` → `className="bg-background text-text …"` strings (or `tva(...)` if variants matter)
- `<View>` → `<Box>` / `<HStack>` / `<VStack>` as appropriate
- `<Text>` → `<Text>` (gluestack wraps RN `Text`)
- `<TouchableOpacity>` button blocks → `<Button variant="solid|outline|link" action="primary|secondary|negative"><ButtonText>…</ButtonText></Button>`
- `<TextInput>` → `<Input><InputField … /></Input>` (or `<Textarea>` if multiline)
- Custom checkbox in `AssignClientModal` → `<Checkbox><CheckboxIndicator><CheckboxIcon as={CheckIcon}/></CheckboxIndicator><CheckboxLabel>…</CheckboxLabel></Checkbox>`
- `<RN Modal animationType="slide">` → gluestack `<Modal>` with `ModalBackdrop`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`
- Star icon `<Text>★</Text>` → `<Icon as={Ionicons} name="star"/>`
- Role chip / status pill → `<Badge><Text>…</Text></Badge>`
- Destructive confirm (logout) → `<AlertDialog>` with trigger button + `AlertDialogContent`/`Header`/`Body`/`Footer`

---

## Phase 3 — Validate + final cleanup

**Commit:** `chore(mobile): verify migration + remove residual dead code`

1. `pnpm tsc --noEmit` clean
2. `pnpm lint` clean
3. `pnpm validate:i18n` (keys untouched)
4. `npx expo export --platform web` — confirm `_expo/static/css/global-*.css` size reasonable
5. Grep for leftovers — must be zero:
   - `Colors.`, `useThemeColors`, `useColorScheme` from `@/components`
   - `@expo/ui`, `@gorhom/bottom-sheet`
6. Visual QA pass on web build with `better-ui`, `better-typography`, `better-colors`, `better-accessibility` skills
7. Maestro smoke if `.maestro/` covers touched screens

---

## Risks / open questions

1. **CLI TTY**: `npx gluestack-ui@latest init` already failed with `ERR_TTY_INIT_FAILED` in non-interactive shells. The `-y` flag is meant to bypass prompts but unverified for `add`. If `add` also TTY-fails, fall back to manual copy from `node_modules/@gluestack-ui/core/<name>/creator/`.
2. **`--use-pnpm`** documented for `init`; unconfirmed for `add`. If CLI rejects it, run `pnpm add <deps>` manually after `add` writes source files.
3. **Default path**: CLI may write to `components/ui/` (project root) instead of `src/components/ui/`. First run must verify, use `--path src/components/ui` if needed.
4. **Token RGB triples**: existing `Colors.ts` uses hex; `global.css` v5 default uses `rgb(var(--x))` triples. Conversion: `#2563eb` → `37 99 235`. All 30+ semantic tokens must be in this format.
5. **`<Text style={…}>` vs `className`**: gluestack `<Text>` accepts `className`. The few screens that compute `color: c.warning` for the star icon will move to `className="text-warning"`.
6. **iOS accessibility**: `src/lib/ios-accessibility.ts` has zero callers but was designed for SwiftUI integration. Removing `@expo/ui` makes it permanently dead — confirmed deletion in Phase 0.
7. **`@expo/vector-icons`**: confirming `Ionicons` is the right set (per `(tabs)/`). If a different family is preferred later, swap the `as={…}` prop only.

---

## Success criteria

- Zero `StyleSheet.create` calls outside `app/_layout.tsx` and the new component shims.
- Zero imports of `Colors`, `useThemeColors`, `useColorScheme` from the deleted files.
- Zero `@expo/ui` / `@gorhom/bottom-sheet` references in `package.json` or `src/`.
- All 22 feature screens render without visual regression on web + iOS + Android.
- Dark mode flips via system preference, no JS toggle.
- Each phase is independently revertable (one commit each).
