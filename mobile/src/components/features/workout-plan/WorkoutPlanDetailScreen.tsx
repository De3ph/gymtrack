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
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";
import type { WorkoutPlanExercise } from "@/types";

interface PlanDetail {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: { name?: string; sets?: number; reps?: number; weight?: number }[];
}

function flattenExercises(
  exercises: WorkoutPlanExercise[] | undefined
): NonNullable<PlanDetail["exercises"]> {
  return (
    exercises?.map((e) => ({
      name: e.name,
      sets: e.sets?.length,
      reps: e.sets?.[0]?.reps,
      weight: e.sets?.[0]?.weight,
    })) ?? []
  );
}

export function WorkoutPlanDetailScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const isTrainer = user?.role === "trainer";

  const styles = createStyles(c);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExercises, setEditExercises] = useState<{ name?: string; sets?: number; reps?: number; weight?: number }[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workoutPlan", id],
    queryFn: () => workoutPlanApi.getById(id!),
    enabled: !!id,
  });

  const { mutate: savePlan, isPending: saving } = useMutation({
    mutationFn: () =>
      workoutPlanApi.update(id!, {
        creatorId: user?.userId ?? 0,
        name: editName,
        description: editDescription,
        exercises: editExercises.map((ex, index) => ({
          exerciseId: 0, // This should be set properly
          name: ex.name || "",
          sets: Array(ex.sets || 0).fill(0).map(() => ({
            setId: "",
            weight: ex.weight || 0,
            weightUnit: "kg",
            reps: ex.reps || 0,
            restTime: 60
          })),
          notes: "",
          order: index
        })),
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
      queryClient.removeQueries({ queryKey: ["workoutPlan", id] });
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
    if (!data) return;
    setEditName(data.name ?? "");
    setEditDescription(data.description ?? "");
    setEditExercises(flattenExercises(data.exercises));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={c.accent} /></View>;
  if (isError || !data) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Failed to load plan</Text>
      <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );

  const plan: PlanDetail = {
    planId: data.planId,
    name: data.name,
    description: data.description,
    exercises: flattenExercises(data.exercises)
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {isEditing ? (
        <>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Plan name"
            placeholderTextColor={c.textTertiary}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={editDescription}
            onChangeText={setEditDescription}
            placeholder="Description (optional)"
            placeholderTextColor={c.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.editButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => savePlan()} disabled={saving || !editName.trim()}>
              {saving ? <ActivityIndicator color={c.onAccent} size="small" /> : <Text style={styles.saveText}>Save</Text>}
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
            {deleting ? <ActivityIndicator color={c.onAccent} size="small" /> : <Text style={styles.deleteButtonText}>Delete</Text>}
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

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { padding: 24, paddingBottom: 48 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 24, fontWeight: "700", color: c.text, marginBottom: 8 },
    desc: { fontSize: 14, color: c.textSecondary, marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: c.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginTop: 8 },
    exerciseCard: { backgroundColor: c.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: c.border },
    exName: { fontSize: 15, fontWeight: "600", color: c.text },
    exDetail: { fontSize: 13, color: c.textSecondary, marginTop: 3 },
    errorText: { fontSize: 15, color: c.danger, marginBottom: 12 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.accent, borderRadius: 8 },
    retryText: { color: c.onAccent, fontWeight: "600" },
    actions: { flexDirection: "row", gap: 10, marginBottom: 16, marginTop: 8 },
    editButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: c.accent, alignItems: "center" },
    editButtonText: { color: c.onAccent, fontSize: 14, fontWeight: "600" },
    assignButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: c.success, alignItems: "center" },
    assignButtonText: { color: c.onAccent, fontSize: 14, fontWeight: "600" },
    deleteButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: c.danger, alignItems: "center" },
    deleteButtonText: { color: c.onAccent, fontSize: 14, fontWeight: "600" },
    input: { backgroundColor: c.card, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: c.text, marginBottom: 10 },
    textArea: { minHeight: 70, paddingTop: 10 },
    editButtons: { flexDirection: "row", gap: 10, marginBottom: 16 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center" },
    cancelText: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
    saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: c.accent, alignItems: "center" },
    saveText: { color: c.onAccent, fontSize: 14, fontWeight: "600" },
  });
}
