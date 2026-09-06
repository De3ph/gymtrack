import { createAvatar } from "@gluestack-ui/core/avatar/creator";
import { View, Image, Text } from "react-native";

const UIAvatar = createAvatar({
  Root: View,
  Badge: View,
  Group: View,
  Image: Image,
  FallbackText: Text,
});

const Avatar = UIAvatar;
const AvatarBadge = UIAvatar.Badge;
const AvatarGroup = UIAvatar.Group;
const AvatarImage = UIAvatar.Image;
const AvatarFallbackText = UIAvatar.FallbackText;

export { Avatar, AvatarBadge, AvatarGroup, AvatarImage, AvatarFallbackText };
