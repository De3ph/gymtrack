import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { relationshipApi } from "@/api/relationshipApi";

interface Client {
  userId?: number;
  username?: string;
  email?: string;
  profile?: { name?: string };
}

export function ClientsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: () => relationshipApi.getMyClients(),
  });

  const clients: Client[] = (data as { clients?: Client[] })?.clients ?? [];

  const { mutate: generateCode, isPending: generating } = useMutation({
    mutationFn: () => relationshipApi.generateInvitation(),
    onSuccess: (res) => {
      const invite = (res as { invitation?: { code?: string; expiresAt?: string } })?.invitation;
      if (invite?.code) {
        Alert.alert("Invitation Code", `Share this code with your athlete:\n\n${invite.code}\n\nExpires: ${invite.expiresAt ?? "7 days"}`, [
          { text: "OK" },
        ]);
      }
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to generate invitation");
    },
  });

  const renderItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/trainer/client/${item.username}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.username ?? "?")[0].toUpperCase()}</Text>
      </View>
      <View>
        <Text style={styles.clientName}>{item.profile?.name || item.username}</Text>
        <Text style={styles.clientUsername}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load clients</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => String(item.userId ?? "")}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => generateCode()}
              disabled={generating}
              activeOpacity={0.7}
            >
              {generating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.inviteText}>Generate Invite Code</Text>
              )}
            </TouchableOpacity>
          }
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No clients yet</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 0.5, borderColor: "#e5e7eb" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  clientName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  clientUsername: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  emptyText: { fontSize: 15, color: "#6b7280" },
  errorText: { fontSize: 15, color: "#ef4444", marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
  inviteButton: {
    backgroundColor: "#7c3aed", paddingVertical: 14, borderRadius: 10,
    alignItems: "center", marginBottom: 12,
  },
  inviteText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
