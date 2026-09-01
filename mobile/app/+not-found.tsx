import { StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { useThemeColors } from "@/components/useThemeColors";

export default function NotFoundScreen() {
  const c = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: c.accent }]}>
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: { fontSize: 14 },
});
