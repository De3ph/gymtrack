# Design Plan for DailyNutritionSummary

## Subject
- Concrete subject: Daily nutrition summary for athletes in the Gymtrack app.
- Audience: Athletes and trainers tracking their meals.
- Page's single job: Show the total calories, protein, carbs, and fats for the day at a glance.

## Token System

### Color
- color-energy: #FF6B35 (vibrant orange for energy)
- color-balance: #4ECDC4 (teal for balance)
- color-warmth: #FFE66D (yellow for warmth)
- color-bg: #F8F9FA (light gray for card background)
- color-text: #2D3748 (dark gray for text)
- color-muted: #A0AEC0 (gray for secondary text)

### Type
- Display: "Clash Grotesk" (for titles and big numbers)
- Body: "IBM Plex Sans" (for labels and secondary text)
- Type Scale:
  - Title: 2.5rem, weight 800
  - Number: 2rem, weight 700
  - Label: 0.875rem, weight 400

### Layout
Layout concept: Prominent calorie focus with macronutrients as supporting chips.
ASCII Wireframe:
```
+-------------------------------------------------+
|  Daily Nutrition Summary - Aug 15, 2026        |
|                                                 |
|           2,345                               |
|           kcal                                |
|                                                 |
|  [150g Protein] [250g Carbs] [80g Fats]       |
|                                                 |
+-------------------------------------------------+
```
- Header: Title with date (left-aligned)
- Main: Large calorie number (centered) with unit below
- Footer: Horizontal row of macronutrient chips (centered)

### Signature
The signature element is the dominant calorie display: a large number (2rem) with the unit "kcal" directly below, using the energy color (#FF6B35). This makes calories the immediate visual focal point, reflecting their importance in daily nutrition tracking.

## Risk Justification
Taking the risk of emphasizing calories over other macros by making them 2-3x larger visually. This is justified because:
1. In fitness contexts, calories are often the primary metric users monitor first
2. The design maintains hierarchy: calories → macros → date/context
3. Supporting chips ensure all macros remain visible and comparable
4. Uses project's existing UI primitives (Card) with custom internal layout