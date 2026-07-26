import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { relationshipApi } from "@/api/relationshipApi";
import { useRouter } from "expo-router";

export function MyTrainerScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["myTrainer"],
    queryFn: () => relationshipApi.getMyTrainer(),
  });

  const { mutate: terminate, isPending: terminating } = useMutation({
    mutationFn: (id: number) => relationshipApi.terminateRelationship(id),
    onSuccess: () => router.back(),
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (isError || !data) return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>No trainer assigned yet</Text>
      <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );

  const trainer = (data as { trainer?: { relationshipId?: number; username?: string; email?: string; profile?: { name?: string; bio?: string; specializations?: string } } })?.trainer;
  if (!trainer) return <View style={styles.center}><Text style={styles.emptyText}>No trainer assigned</Text></View>;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(trainer.username ?? "?")[0].toUpperCase()}</Text></View>
        <Text style={styles.name}>{trainer.profile?.name || trainer.username}</Text>
        {trainer.profile?.bio ? <Text style={styles.bio}>{trainer.profile.bio}</Text> : null}
      </View>
      {trainer.profile?.specializations ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specializations</Text>
          <View style={styles.tags}>
            {trainer.profile.specializations.split(",").map((s: string, i: number) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{s.trim()}</Text></View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.dangerSection}>
        <TouchableOpacity
          style={styles.terminateButton}
          onPress={() => {
            Alert.alert("Terminate Relationship", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Terminate", style: "destructive", onPress: () => trainer.relationshipId && terminate(trainer.relationshipId) },
            ]);
          }}
          disabled={terminating}
        >
          <Text style={styles.terminateText}>{terminating ? "Terminating..." : "Terminate Relationship"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  name: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 6 },
  bio: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  section: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { backgroundColor: "#dbeafe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: "600", color: "#1d4ed8" },
  dangerSection: { marginTop: 8 },
  terminateButton: { paddingVertical: 14, borderRadius: 8, borderWidth: 1.5, borderColor: "#ef4444", alignItems: "center" },
  terminateText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
  emptyText: { fontSize: 16, color: "#6b7280", marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
});
