import { createPressable } from "@gluestack-ui/core/pressable/creator";
import { View } from "react-native";

const UIPressable = createPressable({
  Root: View,
});

const Pressable = UIPressable;


export { Pressable };
