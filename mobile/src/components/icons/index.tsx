import type { ComponentProps, ComponentType } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type AppIconProps = Omit<
  ComponentProps<typeof MaterialCommunityIcons>,
  "name"
>;

export type AppIcon = ComponentType<AppIconProps>;

export function HomeIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="home-variant-outline" {...props} />;
}

export function WorkoutIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="dumbbell" {...props} />;
}

export function MealIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="food-apple-outline" {...props} />;
}

export function MeasurementIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="tape-measure" {...props} />;
}

export function ExerciseIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="weight-lifter" {...props} />;
}

export function TrainerIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="account-search-outline" {...props} />;
}

export function ProfileIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="account-outline" {...props} />;
}

export function PlusIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="plus" {...props} />;
}

export function PencilIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="pencil-outline" {...props} />;
}

export function BinIcon(props: AppIconProps) {
  return <MaterialCommunityIcons name="trash-can-outline" {...props} />;
}
