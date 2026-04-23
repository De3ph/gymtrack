# ShadCN Component Migration Plan

## Current State Analysis
The codebase uses custom UI components in `/src/components/ui/` that closely mirror shadcn/ui primitives. The project already has shadcn configured (components.json shows style: new-york, uses lucide icons, tailwind setup).

## Component Migration Mapping

### 1. Button Component
**Current:** `src/components/ui/button.tsx`
**ShadCN Equivalent:** `@/components/ui/button` (should be identical)

**Prop Mapping:**
- `className` → `className` (same)
- `variant` → `variant` (same: default, destructive, outline, secondary, ghost, link)
- `size` → `size` (same: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg)
- `asChild` → `asChild` (same)

**Differences:**
- Current uses `motion.div` wrapper with `buttonPress` animations
- ShadCN uses `Slot` from radix-ui when `asChild`
- Both use `class-variance-authority` for variants

**Migration:**
```tsx
// Current
import { Button, buttonVariants } from "@/components/ui/button"

// ShadCN - Same import, should work directly
import { Button } from "@/components/ui/button"
```

**Testing:** Verify all variant and size combinations render correctly. Check disabled state.

---

### 2. Card Component
**Current:** `src/components/ui/card.tsx`
**ShadCN Equivalent:** `@/components/ui/card`

**Prop Mapping:**
- `className` → `className` (same)
- `animateHover` → Not in shadCN (custom prop)

**Component Structure:**
- Current has `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- ShadCN has same structure: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

**Differences:**
- Current `Card` uses `motion.div` with `cardHover` animation when `animateHover=true`
- ShadCN uses static `div`
- Current passes `{ animateHover, ...props }` to forwardRef

**Migration:**
```tsx
// Remove animateHover prop or implement custom animation
<Card className="...">
  <CardHeader>
    <CardTitle>...</CardTitle>
    <CardDescription>...</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

**Testing:** Verify card styling, header/footer layout, content spacing.

---

### 3. Dialog Component
**Current:** `src/components/ui/dialog.tsx`
**ShadCN Equivalent:** `@/components/ui/dialog`

**Prop Mapping:**
- `className` → `className` (same)
- Dialog-specific props remain same

**Component Structure:**
- Current uses `DialogPrimitive.Root`, `DialogPrimitive.Trigger`, `DialogPrimitive.Portal`, `DialogPrimitive.Close`
- Current uses `motion.div` with custom animations from `@/lib/animations`
- Both use Radix UI primitives under the hood

**Differences:**
- Current imports `motion` and uses custom variants from `@/lib/animations`
- Dialog content uses custom overlay and content animations

**Migration:**
```tsx
// Current custom animations may need to be replaced with shadcn variants
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Use shadcn's Dialog with potentially different animation classes
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

**Testing:** Verify dialog opens/closes, overlay works, focus management, escape key behavior.

---

### 4. Input Component
**Current:** `src/components/ui/input.tsx`
**ShadCN Equivalent:** `@/components/ui/input`

**Prop Mapping:**
- `className` → `className` (same)
- All standard HTML input props pass through

**Differences:**
- Current uses exact same Tailwind classes as shadcn
- `Input.displayName = "Input"` same

**Migration:**
```tsx
// Direct replacement
import { Input } from "@/components/ui/input"

// Usage identical
<Input type="text" placeholder="Enter value" />
```

**Testing:** Verify styling, focus states, disabled state, error states.

---

### 5. Label Component
**Current:** `src/components/ui/label.tsx`
**ShadCN Equivalent:** `@/components/ui/label`

**Prop Mapping:**
- `className` → `className` (same)
- All standard HTML label props pass through

**Differences:**
- May have different Tailwind classes

**Migration:**
```tsx
// Direct replacement
import { Label } from "@/components/ui/label"

<Label htmlFor="name">Name</Label>
```

**Testing:** Verify text styling, htmlFor prop works, association with inputs.

---

### 6. Badge Component
**Current:** `src/components/ui/badge.tsx`
**ShadCN Equivalent:** `@/components/ui/badge`

**Prop Mapping:**
- `className` → `className` (same)
- `variant` → `variant` (custom in current, standard in shadCN)

**Differences:**
- Current may have custom variant handling

**Migration:**
```tsx
import { Badge } from "@/components/ui/badge"

<Badge variant="default">Badge</Badge>
```

**Testing:** Verify variant prop, default appearance, pill styling.

---

## Migration Steps

### Phase 1: Setup Verification (1 day)
1. Verify shadcn/ui is properly installed (components.json confirms it is)
2. Check all shadcn component files exist in `src/components/ui/`
3. Run existing tests to establish baseline

### Phase 2: Direct Replacements (2-3 days)
Replace components that have identical props:
- Button (verify animations still work)
- Input
- Label
- Badge
- Card (remove animateHover or adapt)

### Phase 3: Dialog Migration (2 days)
- Replace Dialog components
- Verify custom animations are compatible or replace with shadcn variants
- Test focus traps and accessibility

### Phase 4: Testing & Validation (3-4 days)
- Visual regression testing
- Functional testing of all component props
- Integration testing in actual pages
- Accessibility audit

## Testing Strategy

### Unit Tests
- Verify each component renders with all prop variations
- Test disabled states
- Test variant prop combinations
- Test size prop combinations

### Integration Tests
- Test components in actual page layouts
- Verify dialog interactions
- Verify form inputs with react-hook-form
- Verify card layouts in dashboard

### Visual Regression
- Compare screenshots of key pages before/after
- Focus on: buttons, cards, dialogs, forms

## Risk Assessment

### Low Risk
- Button, Input, Label, Badge: near-identical, minimal risk
- Card: styling identical, only animateHover differs

### Medium Risk
- Dialog: custom animations may differ, need to verify overlay behavior
- Form integration: need to ensure validation states work

### Mitigation
- Test each component individually before full migration
- Keep old components as fallback during transition
- Use feature flags if needed for gradual rollout

## Files to Modify

### Direct Replacements (no changes needed)
- `src/components/ui/input.tsx` → use shadcn version
- `src/components/ui/label.tsx` → use shadcn version
- `src/components/ui/badge.tsx` → use shadcn version

### May Need Updates
- `src/components/ui/button.tsx` → verify animations work
- `src/components/ui/card.tsx` → handle animateHover removal
- `src/components/ui/dialog.tsx` → verify custom animations

### Import Updates Needed
Update imports across all pages:
- `src/app/(dashboard)/athlete/meals/page.tsx`
- `src/app/(dashboard)/athlete/trainer/[id]/page.tsx`
- `src/app/(dashboard)/trainer/clients/page.tsx`
- And all other pages using these components