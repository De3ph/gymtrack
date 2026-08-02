import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutPlanApi } from "@/api/workoutPlanApi";

interface Plan {
  planId?: number;
  name?: string;
  description?: string;
  exercises?: unknown[];
}

export function WorkoutPlansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workoutPlans"],
    queryFn: () => workoutPlanApi.getAll(),
  });

  const { mutate: createPlan, isPending: creating } = useMutation({
    mutationFn: () => workoutPlanApi.create({ name: newName, description: newDesc, exercises: [] }),
    onSuccess: () => {
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
    },
  });

  const { mutate: deletePlan } = useMutation({
    mutationFn: (planId: number) => workoutPlanApi.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to delete plan");
    },
  });

  const handleDeletePlan = (planId: number) => {
    Alert.alert("Delete Plan", "Delete this workout plan?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePlan(planId) },
    ]);
  };

  const plans: Plan[] = (data as { plans?: Plan[] })?.plans ?? [];

  const renderItem = ({ item }: { item: Plan }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/trainer/plans/${item.planId}`)} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        <Text style={styles.planName}>{item.name}</Text>
        {item.description ? <Text style={styles.planDesc} numberOfLines={2}>{item.description}</Text> : null}
        <Text style={styles.exerciseCount}>{item.exercises?.length ?? 0} exercises</Text>
      </View>
      {/* RN gesture responder fires inner onPress before parent card onPress,
          so stopPropagation (a DOM API) is unnecessary here. */}
      <TouchableOpacity
        style={styles.deleteIcon}
        onPress={() => { handleDeletePlan(item.planId!); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteIconText}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load plans</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => String(item.planId ?? "")}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No plans yet</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Workout Plan</Text>
            <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Plan name" placeholderTextColor="#9ca3af" />
            <TextInput style={[styles.input, styles.textArea]} value={newDesc} onChangeText={setNewDesc} placeholder="Description (optional)" placeholderTextColor="#9ca3af" multiline numberOfLines={3} textAlignVertical="top" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={() => createPlan()} disabled={creating || !newName.trim()}>
                {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, gap: 12, paddingBottom: 80 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#e5e7eb", flexDirection: "row", alignItems: "flex-start" },
  cardContent: { flex: 1 },
  planName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  planDesc: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  exerciseCount: { fontSize: 12, fontWeight: "600", color: "#2563eb" },
  deleteIcon: { paddingLeft: 12, paddingTop: 2 },
  deleteIconText: { fontSize: 22, color: "#9ca3af", fontWeight: "300", lineHeight: 24 },
  emptyText: { fontSize: 15, color: "#6b7280" },
  errorText: { fontSize: 15, color: "#ef4444", marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", elevation: 6 },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "300", lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, gap: 14 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 4 },
  input: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#111827" },
  textArea: { minHeight: 70, paddingTop: 10 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  createBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  createText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
