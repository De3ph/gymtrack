import { createLink } from "@gluestack-ui/core/link/creator";
import { View, Text } from "react-native";

const UILink = createLink({
  Root: View,
  Text: Text,
});

const Link = UILink;
const LinkText = UILink.Text;

export { Link, LinkText };
