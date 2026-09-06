import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coachingRequestApi } from "@/api/coachingRequestApi";
import { useAuthStore } from "@/stores/authStore";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

interface Request {
  requestId?: number;
  athleteId?: number;
  trainerId?: number;
  athleteUsername?: string;
  trainerUsername?: string;
  message?: string;
  status: string;
  createdAt?: string;
}

export function CoachingRequestsScreen() {
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const isTrainer = user?.role === "trainer";

  const styles = createStyles(c);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["coachingRequests", isTrainer],
    queryFn: () => isTrainer ? coachingRequestApi.getPendingRequests() : coachingRequestApi.getMyRequests(),
  });

  const { mutate: accept } = useMutation({
    mutationFn: (id: number) => coachingRequestApi.acceptRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coachingRequests"] }),
  });

  const { mutate: reject } = useMutation({
    mutationFn: (id: number) => coachingRequestApi.rejectRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coachingRequests"] }),
  });

  const requests: Request[] = (data as { requests?: Request[] })?.requests ?? [];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "accepted": return { bg: c.successSurface, color: c.successText };
      case "rejected": return { bg: c.dangerSurface, color: c.dangerText };
      default: return { bg: c.warningSurface, color: c.warningText };
    }
  };

  const renderItem = ({ item }: { item: Request }) => {
    const st = getStatusStyle(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{isTrainer ? item.athleteUsername : item.trainerUsername}</Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color }]}>{item.status}</Text>
          </View>
        </View>
        {item.message ? <Text style={styles.message}>{item.message}</Text> : null}
        {isTrainer && item.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => item.requestId && accept(item.requestId)}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => item.requestId && reject(item.requestId)}>
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={c.accent} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load requests</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.requestId ?? "")}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No requests</Text></View>}
        />
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    list: { padding: 16, gap: 12 },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: c.border },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
    message: { fontSize: 14, color: c.textSecondary, marginBottom: 10 },
    actions: { flexDirection: "row", gap: 10, marginTop: 8 },
    acceptBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: c.success, alignItems: "center" },
    acceptText: { color: c.onAccent, fontWeight: "700", fontSize: 14 },
    rejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: c.danger, alignItems: "center" },
    rejectText: { color: c.danger, fontWeight: "700", fontSize: 14 },
    emptyText: { fontSize: 15, color: c.textSecondary },
    errorText: { fontSize: 15, color: c.danger, marginBottom: 12 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.accent, borderRadius: 8 },
    retryText: { color: c.onAccent, fontWeight: "600" },
  });
}
