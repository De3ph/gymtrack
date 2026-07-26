import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trainerCatalogApi } from "@/api/trainerCatalogApi";
import { reviewApi } from "@/api/reviewApi";
import { coachingRequestApi } from "@/api/coachingRequestApi";
import { availabilityApi } from "@/api/availabilityApi";
import { useAuthStore } from "@/stores/authStore";

interface TrainerData {
  userId?: number;
  username?: string;
  profile?: { name?: string; bio?: string; certifications?: string; specializations?: string };
}

interface ReviewItem {
  reviewId?: number;
  rating?: number;
  comment?: string;
}

export function TrainerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [message, setMessage] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  const { data: trainer, isLoading, isError, refetch } = useQuery({
    queryKey: ["trainer", id],
    queryFn: () => trainerCatalogApi.getTrainerProfile(id!),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => reviewApi.getTrainerReviews(id!),
    enabled: !!id,
  });

  const { data: availData } = useQuery({
    queryKey: ["availability", id],
    queryFn: () => availabilityApi.getTrainerAvailability(id!),
    enabled: !!id,
  });

  const { mutate: sendRequest, isPending: sending } = useMutation({
    mutationFn: () => coachingRequestApi.createCoachingRequest({ trainerId: Number(id), message: message.trim() || undefined }),
    onSuccess: () => { Alert.alert("Request Sent"); setShowRequestForm(false); setMessage(""); },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (isError || !trainer) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Failed to load trainer</Text>
      <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );

  const tData = trainer as TrainerData;
  const reviews: ReviewItem[] = (reviewsData as { reviews?: ReviewItem[] })?.reviews ?? [];
  const slots = (availData as { slots?: { dayOfWeek: string; startTime: string; endTime: string }[] })?.slots ?? [];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(tData.username ?? "?")[0].toUpperCase()}</Text></View>
        <Text style={styles.name}>{tData.profile?.name || tData.username}</Text>
        {tData.profile?.bio ? <Text style={styles.bio}>{tData.profile.bio}</Text> : null}
      </View>

      {tData.profile?.specializations ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specializations</Text>
          <View style={styles.tags}>
            {tData.profile.specializations.split(",").map((s, i) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{s.trim()}</Text></View>
            ))}
          </View>
        </View>
      ) : null}

      {slots.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          {slots.map((slot, i) => (
            <Text key={i} style={styles.slotText}>{slot.dayOfWeek}: {slot.startTime} - {slot.endTime}</Text>
          ))}
        </View>
      ) : null}

      {reviews.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews.map((r) => (
            <View key={r.reviewId} style={styles.reviewCard}>
              <Text style={styles.rating}>{"★".repeat(r.rating ?? 0)}</Text>
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {user?.role === "athlete" && (
        <View style={styles.actionSection}>
          {showRequestForm ? (
            <View style={styles.requestForm}>
              <TextInput style={styles.messageInput} value={message} onChangeText={setMessage} placeholder="Add a message (optional)..." placeholderTextColor="#9ca3af" multiline numberOfLines={3} textAlignVertical="top" />
              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRequestForm(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.sendBtn} onPress={() => sendRequest()} disabled={sending}>
                  {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendBtnText}>Send Request</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.requestButton} onPress={() => setShowRequestForm(true)}>
              <Text style={styles.requestText}>Request Coaching</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  slotText: { fontSize: 14, color: "#111827", paddingVertical: 3 },
  reviewCard: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  rating: { fontSize: 14, color: "#f59e0b", letterSpacing: 1, marginBottom: 4 },
  reviewComment: { fontSize: 14, color: "#374151" },
  actionSection: { marginTop: 8 },
  requestButton: { backgroundColor: "#2563eb", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  requestText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  requestForm: { gap: 12 },
  messageInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", minHeight: 80, textAlignVertical: "top" },
  formButtons: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  sendBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  sendBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  errorText: { fontSize: 15, color: "#ef4444", marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
});
