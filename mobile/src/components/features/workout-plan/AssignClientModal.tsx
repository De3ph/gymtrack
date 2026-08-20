import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { relationshipApi } from "@/api/relationshipApi";
import { workoutPlanApi } from "@/api/workoutPlanApi";
import { useState } from "react";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

interface Athlete {
  userId?: number;
  email?: string;
  username?: string;
  profile?: { name?: string; avatar?: string };
}

interface ClientItem {
  relationship: { relationshipId?: number; athleteId?: number; trainerId?: number; status?: string };
  athlete: Athlete;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  planId: string | number;
  onAssigned: () => void;
}

export function AssignClientModal({ visible, onClose, planId, onAssigned }: Props) {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const styles = createStyles(c);


  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["myClients"],
    queryFn: () => relationshipApi.getMyClients(),
    enabled: visible,
  });

  const { mutate: assignPlan, isPending: assigning } = useMutation({
    mutationFn: (athleteIds: string[]) =>
      workoutPlanApi.assign(planId, { athleteIds }),
    onSuccess: () => {
      Alert.alert("Assigned", "Workout plan assigned successfully");
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["workoutPlan", planId] });
      onAssigned();
      onClose();
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to assign plan");
    },
  });

  const clients: ClientItem[] =
    (data as { clients?: ClientItem[] })?.clients ?? [];

  const toggleClient = (athleteId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  };

  const handleAssign = () => {
    if (selectedIds.size === 0) {
      Alert.alert("Select", "Select at least one athlete");
      return;
    }
    assignPlan(Array.from(selectedIds).map(String));
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  const renderItem = ({ item }: { item: ClientItem }) => {
    const athlete = item.athlete;
    const athleteId = athlete.userId ?? item.relationship.athleteId ?? 0;
    const isSelected = selectedIds.has(athleteId);
    const name = athlete.profile?.name || athlete.username || athlete.email || "Unknown";
    const subtitle = athlete.email || athlete.username || "";

    return (
      <TouchableOpacity
        style={[styles.clientItem, isSelected && styles.clientItemSelected]}
        onPress={() => toggleClient(athleteId)}
        activeOpacity={0.7}
      >
        <View style={styles.checkRow}>
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{name}</Text>
            {subtitle ? <Text style={styles.clientSub}>{subtitle}</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Assign to Athletes</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={c.accent} /></View>
          ) : isError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Failed to load clients</Text>
              <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : clients.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No active clients</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={clients}
                keyExtractor={(item, index) => String(item.relationship?.relationshipId ?? item.athlete?.userId ?? index)}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
              />
              <TouchableOpacity
                style={[styles.assignBtn, (selectedIds.size === 0 || assigning) && styles.assignBtnDisabled]}
                onPress={handleAssign}
                disabled={selectedIds.size === 0 || assigning}
              >
                {assigning ? (
                  <ActivityIndicator color={c.onAccent} size="small" />
                ) : (
                  <Text style={styles.assignText}>Assign ({selectedIds.size})</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}


function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    content: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "80%" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    title: { fontSize: 20, fontWeight: "700", color: c.text },
    closeBtn: { fontSize: 20, color: c.textSecondary, padding: 4 },
    center: { alignItems: "center", padding: 32 },
    errorText: { fontSize: 14, color: c.danger, marginBottom: 12 },
    retryBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.accent, borderRadius: 8 },
    retryText: { color: c.onAccent, fontWeight: "600", fontSize: 13 },
    emptyText: { fontSize: 14, color: c.textSecondary },
    list: { gap: 8 },
    clientItem: {
      backgroundColor: c.background, borderRadius: 10, padding: 14,
      borderWidth: 1.5, borderColor: "transparent",
    },
    clientItemSelected: { borderColor: c.accent, backgroundColor: c.accentSurface },
    checkRow: { flexDirection: "row", alignItems: "center" },
    checkbox: {
      width: 24, height: 24, borderRadius: 6, borderWidth: 2,
      borderColor: c.borderStrong, marginRight: 12,
      alignItems: "center", justifyContent: "center",
    },
    checkboxChecked: { backgroundColor: c.accent, borderColor: c.accent },
    checkmark: { color: c.onAccent, fontSize: 14, fontWeight: "700" },
    clientInfo: { flex: 1 },
    clientName: { fontSize: 15, fontWeight: "600", color: c.text },
    clientSub: { fontSize: 13, color: c.textSecondary, marginTop: 1 },
    assignBtn: {
      marginTop: 16, backgroundColor: c.accent, borderRadius: 10,
      paddingVertical: 14, alignItems: "center",
    },
    assignBtnDisabled: { backgroundColor: c.accentDisabled },
    assignText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
  });
}

