import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { exerciseApi } from "@/api/exerciseApi";

interface Exercise {
  exerciseId: number;
  name: string;
  category?: string;
  muscleGroupId?: number;
  equipmentId?: number;
  instructions?: string;
}

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => exerciseApi.getAll() as Promise<Exercise[]>,
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!visible) setSearch("");
  }, [visible]);

  const exercises = useMemo(() => {
    const list: Exercise[] = Array.isArray(data) ? data : [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        (ex.category && ex.category.toLowerCase().includes(q))
    );
  }, [data, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Exercise Catalog</Text>
          <View style={styles.closeBtn} />
        </View>

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Failed to load exercises</Text>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => String(item.exerciseId)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exerciseRow}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                activeOpacity={0.6}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  {item.category ? (
                    <Text style={styles.exerciseCategory}>{item.category}</Text>
                  ) : null}
                </View>
                <Text style={styles.chevron}>{">"}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No exercises found</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  closeBtn: { width: 60 },
  closeText: { fontSize: 15, color: "#2563eb", fontWeight: "600" },
  title: { fontSize: 17, fontWeight: "700", color: "#111827" },
  searchInput: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  listContent: { padding: 16, paddingTop: 4 },
  exerciseRow: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  exerciseCategory: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    textTransform: "capitalize",
  },
  chevron: { fontSize: 16, color: "#9ca3af", marginLeft: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { fontSize: 15, color: "#ef4444" },
  emptyText: { fontSize: 15, color: "#6b7280" },
});
