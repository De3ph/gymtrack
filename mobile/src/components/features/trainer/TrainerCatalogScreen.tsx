import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { trainerCatalogApi } from "@/api/trainerCatalogApi";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

interface TrainerItem {
  userId?: number;
  username?: string;
  profile?: { name?: string; bio?: string; specializations?: string };
}

export function TrainerCatalogScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const styles = createStyles(c);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["trainers", search],
    queryFn: () => trainerCatalogApi.searchTrainers(search ? { specialization: search } : undefined),
  });

  const trainers = useMemo(() => {
    const result = data as { trainers?: TrainerItem[] };
    return result.trainers ?? [];
  }, [data]);

  const renderTrainer = useCallback(
    ({ item }: { item: TrainerItem }) => (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/trainer-catalog/${item.userId}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.username ?? "?")[0].toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.trainerName}>{item.profile?.name ?? item.username}</Text>
            {item.profile?.bio ? (
              <Text style={styles.bio} numberOfLines={2}>
                {item.profile.bio}
              </Text>
            ) : null}
          </View>
        </View>
        {item.profile?.specializations ? (
          <View style={styles.tags}>
            {String(item.profile.specializations).split(",").map((s, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{s.trim()}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    ),
    [router]
  );

  const keyExtractor = useCallback((item: TrainerItem) => String(item.userId ?? ""), []);

  return (
    <View style={styles.flex}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by specialization..."
          placeholderTextColor={c.textTertiary}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load trainers</Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={trainers}
          keyExtractor={keyExtractor}
          renderItem={renderTrainer}
          
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No trainers found</Text></View>}
        />
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    searchBar: { padding: 16, backgroundColor: c.card, borderBottomWidth: 0.5, borderBottomColor: c.border },
    searchInput: { backgroundColor: c.surfaceSubtle, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: c.text },
    list: { padding: 16, gap: 12 },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: c.border },
    cardHeader: { flexDirection: "row", gap: 12, marginBottom: 10 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
    avatarText: { color: c.onAccent, fontSize: 20, fontWeight: "700" },
    cardInfo: { flex: 1 },
    trainerName: { fontSize: 16, fontWeight: "700", color: c.text },
    bio: { fontSize: 13, color: c.textSecondary, marginTop: 3 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: { backgroundColor: c.accentSurface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    tagText: { fontSize: 11, fontWeight: "600", color: c.accentOnLight },
    errorText: { fontSize: 15, color: c.danger, marginBottom: 12 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.accent, borderRadius: 8 },
    retryText: { color: c.onAccent, fontWeight: "600" },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}