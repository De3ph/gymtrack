import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { useAuthStore } from "@/stores/authStore";
import { AssignClientModal } from "./AssignClientModal";
import { useState } from "react";

interface PlanDetail {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: { name?: string; sets?: number; reps?: number; weight?: number }[];
}

export function WorkoutPlanDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const isTrainer = user?.role === "trainer";

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workoutPlan", id],
    queryFn: () => workoutPlanApi.getById(id!),
    enabled: !!id,
  });

  const { mutate: savePlan, isPending: saving } = useMutation({
    mutationFn: () =>
      workoutPlanApi.update(id!, {
        name: editName,
        description: editDescription,
        exercises: (data as PlanDetail)?.exercises ?? [],
      }),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["workoutPlan", id] });
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to update plan");
    },
  });

  const { mutate: deletePlan, isPending: deleting } = useMutation({
    mutationFn: () => workoutPlanApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
      router.back();
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to delete plan");
    },
  });

  const handleDelete = () => {
    Alert.alert("Delete Plan", "This action cannot be undone. Delete this plan?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePlan() },
    ]);
  };

  const handleEdit = () => {
    const plan = data as PlanDetail;
    setEditName(plan.name ?? "");
    setEditDescription(plan.description ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (isError || !data) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Failed to load plan</Text>
      <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );

  const plan = data as PlanDetail;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {isEditing ? (
        <>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Plan name"
            placeholderTextColor="#9ca3af"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={editDescription}
            onChangeText={setEditDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.editButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => savePlan()} disabled={saving || !editName.trim()}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>{plan.name}</Text>
          {plan.description ? <Text style={styles.desc}>{plan.description}</Text> : null}
        </>
      )}

      {isTrainer && !isEditing && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.assignButton} onPress={() => setShowAssignModal(true)}>
            <Text style={styles.assignButtonText}>Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={deleting}>
            {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.deleteButtonText}>Delete</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Exercises ({plan.exercises?.length ?? 0})</Text>
      {(plan.exercises ?? []).map((ex, i) => (
        <View key={i} style={styles.exerciseCard}>
          <Text style={styles.exName}>{ex.name || `Exercise ${i + 1}`}</Text>
          <Text style={styles.exDetail}>{ex.sets} sets × {ex.reps} reps {ex.weight ? `@ ${ex.weight}kg` : ""}</Text>
        </View>
      ))}

      <AssignClientModal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        planId={id!}
        onAssigned={() => refetch()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 8 },
  desc: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  exerciseCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: "#e5e7eb" },
  exName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  exDetail: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  errorText: { fontSize: 15, color: "#ef4444", marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginBottom: 16, marginTop: 8 },
  editButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  editButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  assignButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#059669", alignItems: "center" },
  assignButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  deleteButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#ef4444", alignItems: "center" },
  deleteButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#111827", marginBottom: 10 },
  textArea: { minHeight: 70, paddingTop: 10 },
  editButtons: { flexDirection: "row", gap: 10, marginBottom: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
