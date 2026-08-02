import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainerCatalogApi } from "@/api/trainerCatalogApi";
import { availabilityApi } from "@/api/availabilityApi";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface AvailabilitySlot {
  availabilityId?: number;
  trainerId?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function TrainerProfileScreen() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["trainerProfile"],
    queryFn: () => trainerCatalogApi.getMyProfile(),
  });

  const p = (profile as { profile?: { name?: string; bio?: string; hourlyRate?: number; certifications?: string; specializations?: string } })?.profile;

  const { data: availData, isLoading: loadingAvail } = useQuery({
    queryKey: ["myAvailability"],
    queryFn: () => availabilityApi.getMyAvailability(),
  });

  const serverSlots: AvailabilitySlot[] =
    (availData as { slots?: AvailabilitySlot[] })?.slots ?? [];

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p?.name ?? "");
  const [bio, setBio] = useState(p?.bio ?? "");
  const [hourlyRate, setHourlyRate] = useState(String(p?.hourlyRate ?? ""));

  const [editingAvail, setEditingAvail] = useState(false);
  const [availSlots, setAvailSlots] = useState<AvailabilitySlot[]>([]);

  // Keep local availSlots in sync with server data when not actively editing
  useEffect(() => {
    if (!editingAvail) {
      setAvailSlots(serverSlots.length > 0 ? serverSlots.map((s) => ({ ...s })) : []);
    }
  }, [serverSlots, editingAvail]);

  const startEditAvail = () => {
    setAvailSlots(
      serverSlots.length > 0
        ? serverSlots.map((s) => ({ ...s }))
        : [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]
    );
    setEditingAvail(true);
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: Record<string, unknown>) => trainerCatalogApi.updateTrainerProfile(data),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["trainerProfile"] });
    },
  });

  const { mutate: saveAvail, isPending: savingAvail } = useMutation({
    mutationFn: (slots: { dayOfWeek: number; startTime: string; endTime: string }[]) =>
      availabilityApi.setMyAvailability(
        slots.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }))
      ),
    onSuccess: () => {
      setEditingAvail(false);
      queryClient.invalidateQueries({ queryKey: ["myAvailability"] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to save availability");
    },
  });

  const { mutate: deleteSlot } = useMutation({
    mutationFn: (slotId: number) => availabilityApi.deleteSlot(String(slotId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAvailability"] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to delete slot");
    },
  });

  if (loadingProfile || loadingAvail) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  const updateSlot = (index: number, field: string, value: string | number) => {
    setAvailSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const addSlot = () => {
    setAvailSlots((prev) => [
      ...prev,
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
    ]);
  };

  const removeSlot = (index: number) => {
    const slot = availSlots[index];
    if (slot.availabilityId != null) {
      Alert.alert("Delete Slot", "Remove this availability slot?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteSlot(slot.availabilityId!),
        },
      ]);
    } else {
      setAvailSlots((prev) => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Trainer Profile</Text>
      {editing ? (
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#9ca3af" />
          <Text style={styles.label}>Bio</Text>
          <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline numberOfLines={4} textAlignVertical="top" placeholderTextColor="#9ca3af" />
          <Text style={styles.label}>Hourly Rate</Text>
          <TextInput style={styles.input} value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholderTextColor="#9ca3af" />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => save({ name, bio, hourlyRate: Number(hourlyRate) || undefined })} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.label}>Name</Text><Text style={styles.value}>{p?.name || "Not set"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Bio</Text><Text style={styles.value}>{p?.bio || "Not set"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Rate</Text><Text style={styles.value}>{p?.hourlyRate ? `${p.hourlyRate}/hr` : "Not set"}</Text></View>
          <TouchableOpacity style={styles.editBtn} onPress={() => {
            setName(p?.name ?? "");
            setBio(p?.bio ?? "");
            setHourlyRate(String(p?.hourlyRate ?? ""));
            setEditing(true);
          }}>
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Availability</Text>
      {editingAvail ? (
        <View style={styles.availForm}>
          {availSlots.map((slot, i) => (
            <View key={i} style={styles.availSlot}>
              <View style={styles.availHeader}>
                <Text style={styles.availLabel}>Slot {i + 1}</Text>
                <TouchableOpacity onPress={() => removeSlot(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dayRow}>
                {DAY_NAMES.map((d, di) => (
                  <TouchableOpacity
                    key={di}
                    style={[styles.dayBtn, slot.dayOfWeek === di && styles.dayBtnActive]}
                    onPress={() => updateSlot(i, "dayOfWeek", di)}
                  >
                    <Text style={[styles.dayText, slot.dayOfWeek === di && styles.dayTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={slot.startTime}
                  onChangeText={(v) => updateSlot(i, "startTime", v)}
                  placeholder="09:00"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.timeSep}>to</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={slot.endTime}
                  onChangeText={(v) => updateSlot(i, "endTime", v)}
                  placeholder="17:00"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addSlotBtn} onPress={addSlot}>
            <Text style={styles.addSlotText}>+ Add Slot</Text>
          </TouchableOpacity>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingAvail(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveAvail(availSlots)} disabled={savingAvail}>
              {savingAvail ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : serverSlots.length > 0 ? (
        <View style={styles.card}>
          {serverSlots.map((slot) => (
            <View key={slot.availabilityId ?? slot.dayOfWeek} style={styles.availRow}>
              <Text style={styles.availDay}>{DAY_NAMES[slot.dayOfWeek]}</Text>
              <Text style={styles.availTime}>{slot.startTime} – {slot.endTime}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.editBtn} onPress={startEditAvail}>
            <Text style={styles.editText}>Edit Availability</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyAvail}>No availability set</Text>
          <TouchableOpacity style={styles.editBtn} onPress={startEditAvail}>
            <Text style={styles.editText}>Set Availability</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 18 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  label: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  value: { fontSize: 14, color: "#111827", fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  form: { gap: 10 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#111827" },
  textArea: { minHeight: 80, paddingTop: 10 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  editBtn: { marginTop: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#2563eb", alignItems: "center" },
  editText: { fontSize: 14, fontWeight: "600", color: "#2563eb" },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginTop: 28, marginBottom: 12 },
  availForm: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  availSlot: {
    backgroundColor: "#f9fafb", borderRadius: 10, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  availHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  availLabel: { fontSize: 13, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  removeBtn: { fontSize: 18, color: "#ef4444", fontWeight: "600", padding: 2 },
  dayRow: { flexDirection: "row", gap: 4, marginBottom: 10 },
  dayBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1,
    borderColor: "#d1d5db", alignItems: "center", backgroundColor: "#fff",
  },
  dayBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  dayText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  dayTextActive: { color: "#fff" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeInput: { flex: 1, backgroundColor: "#fff" },
  timeSep: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  addSlotBtn: { paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center", marginBottom: 14 },
  addSlotText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  availRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  availDay: { fontSize: 14, fontWeight: "600", color: "#2563eb" },
  availTime: { fontSize: 13, color: "#6b7280" },
  emptyAvail: { fontSize: 14, color: "#9ca3af", textAlign: "center", paddingVertical: 12 },
});
