import {
  Apple,
  Dumbbell,
  Flame,
  Ruler,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface LandingFeature {
  /** Stable id, used as list key. */
  id: string;
  /** Icon shown in the tile next to the feature title. */
  icon: LucideIcon;
  /** Icon shown next to the live stat. */
  statIcon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  statKey: string;
  /** Prefix of the example keys: `<exampleKey>.label`, `.title`, ... */
  exampleKey: string;
}

export const landingFeatures: LandingFeature[] = [
  {
    id: "workouts",
    icon: Dumbbell,
    statIcon: TrendingUp,
    titleKey: "features.workouts.title",
    descriptionKey: "features.workouts.description",
    statKey: "features.stats_workouts",
    exampleKey: "features.workouts.example",
  },
  {
    id: "nutrition",
    icon: Apple,
    statIcon: Flame,
    titleKey: "features.nutrition.title",
    descriptionKey: "features.nutrition.description",
    statKey: "features.stats_nutrition",
    exampleKey: "features.nutrition.example",
  },
  {
    id: "measurements",
    icon: Ruler,
    statIcon: TrendingDown,
    titleKey: "features.measurements.title",
    descriptionKey: "features.measurements.description",
    statKey: "features.stats_measurements",
    exampleKey: "features.measurements.example",
  },
  {
    id: "coaching",
    icon: Users,
    statIcon: Users,
    titleKey: "features.coaching.title",
    descriptionKey: "features.coaching.description",
    statKey: "features.stats_coaching",
    exampleKey: "features.coaching.example",
  },
];
