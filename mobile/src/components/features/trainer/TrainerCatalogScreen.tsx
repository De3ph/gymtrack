import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { trainerCatalogApi } from "@/api/trainerCatalogApi";

interface TrainerItem {
  userId?: number;
  username?: string;
  profile?: { name?: string; bio?: string; specializations?: string };
}

export function TrainerCatalogScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["trainers", search],
    queryFn: () => trainerCatalogApi.searchTrainers(search ? { specialization: search } : undefined),
  });

  const trainers: TrainerItem[] = (data as { trainers?: TrainerItem[] })?.trainers ?? [];

  const renderTrainer = ({ item }: { item: TrainerItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/trainer-catalog/${item.userId}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.username ?? "?")[0].toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.trainerName}>{item.profile?.name ?? item.username}</Text>
          {item.profile?.bio ? <Text style={styles.bio} numberOfLines={2}>{item.profile.bio}</Text> : null}
        </View>
      </View>
      {item.profile?.specializations ? (
        <View style={styles.tags}>
          {String(item.profile.specializations).split(",").map((s, i) => (
            <View key={i} style={styles.tag}><Text style={styles.tagText}>{s.trim()}</Text></View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by specialization..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load trainers</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trainers}
          keyExtractor={(item) => String(item.userId ?? "")}
          renderItem={renderTrainer}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No trainers found</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  searchBar: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  searchInput: { backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: "#111827" },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#e5e7eb" },
  cardHeader: { flexDirection: "row", gap: 12, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  cardInfo: { flex: 1 },
  trainerName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  bio: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { backgroundColor: "#dbeafe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: "600", color: "#1d4ed8" },
  errorText: { fontSize: 15, color: "#ef4444", marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyText: { fontSize: 15, color: "#6b7280" },
});
