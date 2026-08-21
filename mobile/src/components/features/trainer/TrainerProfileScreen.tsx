import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainerCatalogApi } from "@/api/trainerCatalogApi";
import { availabilityApi } from "@/api/availabilityApi";
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface AvailabilitySlot {
  availabilityId?: number;
  trainerId?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function TrainerProfileScreen() {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const styles = createStyles(c);
  const { data: profile, isLoading: loadingProfile, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ["trainerProfile"],
    queryFn: () => trainerCatalogApi.getMyProfile(),
  });

  const p = useMemo(() => {
    return (profile as { profile?: { name?: string; bio?: string; hourlyRate?: number; certifications?: string; specializations?: string } })?.profile;
  }, [profile]);

  const { data: availData, isLoading: loadingAvail, isError: availError, refetch: refetchAvail } = useQuery({
    queryKey: ["myAvailability"],
    queryFn: () => availabilityApi.getMyAvailability(),
  });

  const serverSlots = useMemo(() => {
    return (availData as { slots?: AvailabilitySlot[] })?.slots ?? [];
  }, [availData]);

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(p?.name ?? "");
  const [bio, setBio] = useState(p?.bio ?? "");
  const [hourlyRate, setHourlyRate] = useState(String(p?.hourlyRate ?? ""));

  // Keep local edits in sync with state
  useEffect(() => {
    setName(p?.name ?? "");
    setBio(p?.bio ?? "");
    setHourlyRate(String(p?.hourlyRate ?? ""));
  }, [p]);

  const [editingAvail, setEditingAvail] = useState(false);
  const [availSlots, setAvailSlots] = useState<AvailabilitySlot[]>([]);

  // Keep local availSlots in sync with server data when not actively editing
  useEffect(() => {
    if (!editingAvail) {
      const slots = (availData as { slots?: AvailabilitySlot[] })?.slots ?? [];
      setAvailSlots(slots.length > 0 ? slots.map((s) => ({ ...s })) : []);
    }
  }, [availData, editingAvail]);

  const startEditAvail = useCallback(() => {
    setAvailSlots(
      serverSlots.length > 0
        ? serverSlots.map((s) => ({ ...s }))
        : [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]
    );
    setEditingAvail(true);
  }, [serverSlots]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: Record<string, unknown>) => trainerCatalogApi.updateTrainerProfile(data),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["trainerProfile"] });
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to save profile");
    },
  });

  const handleSaveProfile = useCallback(() => {
    setError("");
    const trimmedName = name.trim();
    const trimmedBio = bio.trim();

    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (trimmedBio.length > 500) {
      setError("Bio must be 500 characters or fewer");
      return;
    }
    if (hourlyRate.trim() !== "") {
      const rate = Number(hourlyRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        setError("Hourly rate must be a positive number");
        return;
      }
    }

    save({
      name: trimmedName,
      bio: trimmedBio,
      hourlyRate: hourlyRate.trim() !== "" ? Number(hourlyRate) : undefined,
    });
  }, [name, bio, hourlyRate, save]);

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

  const updateSlot = useCallback((index: number, field: string, value: string | number) => {
    setAvailSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }, []);

  const addSlot = useCallback(() => {
    setAvailSlots((prev) => [
      ...prev,
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
    ]);
  }, []);

  const removeSlot = useCallback(
    (index: number) => {
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
    },
    [availSlots, deleteSlot]
  );

  if (loadingProfile || loadingAvail) return <View style={styles.center}><ActivityIndicator size="large" color={c.accent} /></View>;

  if (profileError) return (
    <View style={styles.center}>
      <Text style={styles.loadErrorText}>Failed to load trainer profile</Text>
      <Pressable onPress={() => refetchProfile()} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );

  if (availError) return (
    <View style={styles.center}>
      <Text style={styles.loadErrorText}>Failed to load availability</Text>
      <Pressable onPress={() => refetchAvail()} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>Trainer Profile</Text>
      {editing ? (
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={c.textTertiary} />
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={c.textTertiary}
          />
          <Text style={styles.label}>Hourly Rate</Text>
          <TextInput
            style={styles.input}
            value={hourlyRate}
            onChangeText={setHourlyRate}
            keyboardType="numeric"
            placeholderTextColor={c.textTertiary}
          />
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setEditing(false);
                setError("");
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, saving && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={c.onAccent} size="small" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.label}>Name</Text><Text style={styles.value}>{p?.name || "Not set"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Bio</Text><Text style={styles.value}>{p?.bio || "Not set"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Rate</Text><Text style={styles.value}>{p?.hourlyRate ? `${p.hourlyRate}/hr` : "Not set"}</Text></View>
          <Pressable
            style={styles.editBtn}
            onPress={() => {
              setName(p?.name ?? "");
              setBio(p?.bio ?? "");
              setHourlyRate(String(p?.hourlyRate ?? ""));
              setError("");
              setEditing(true);
            }}
          >
            <Text style={styles.editText}>Edit Profile</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>Availability</Text>
      {editingAvail ? (
        <View style={styles.availForm}>
          {availSlots.map((slot, i) => (
            <View key={i} style={styles.availSlot}>
              <View style={styles.availHeader}>
                <Text style={styles.availLabel}>Slot {i + 1}</Text>
                <Pressable
                  onPress={() => removeSlot(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeBtn}>✕</Text>
                </Pressable>
              </View>
              <View style={styles.dayRow}>
                {DAY_NAMES.map((d, di) => (
                  <Pressable
                    key={di}
                    style={[styles.dayBtn, slot.dayOfWeek === di && styles.dayBtnActive]}
                    onPress={() => updateSlot(i, "dayOfWeek", di)}
                  >
                    <Text style={[styles.dayText, slot.dayOfWeek === di && styles.dayTextActive]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={slot.startTime}
                  onChangeText={(v) => updateSlot(i, "startTime", v)}
                  placeholder="09:00"
                  placeholderTextColor={c.textTertiary}
                />
                <Text style={styles.timeSep}>to</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={slot.endTime}
                  onChangeText={(v) => updateSlot(i, "endTime", v)}
                  placeholder="17:00"
                  placeholderTextColor={c.textTertiary}
                />
              </View>
            </View>
          ))}
          <Pressable style={styles.addSlotBtn} onPress={addSlot}>
            <Text style={styles.addSlotText}>+ Add Slot</Text>
          </Pressable>
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setEditingAvail(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, savingAvail && styles.buttonDisabled]}
              onPress={() => saveAvail(availSlots)}
              disabled={savingAvail}
            >
              {savingAvail ? (
                <ActivityIndicator color={c.onAccent} size="small" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </Pressable>
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
          <Pressable style={styles.editBtn} onPress={startEditAvail}>
            <Text style={styles.editText}>Edit Availability</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyAvail}>No availability set</Text>
          <Pressable style={styles.editBtn} onPress={startEditAvail}>
            <Text style={styles.editText}>Set Availability</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { padding: 24, paddingBottom: 48 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorBox: { backgroundColor: c.dangerSurface, borderLeftWidth: 3, borderLeftColor: c.danger, padding: 12, marginBottom: 16, borderRadius: 4 },
    errorText: { color: c.dangerText, fontSize: 14, fontWeight: "500" },
    loadErrorText: { fontSize: 15, color: c.danger, marginBottom: 12 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.accent, borderRadius: 8 },
    retryText: { color: c.onAccent, fontWeight: "600" },
    title: { fontSize: 24, fontWeight: "700", color: c.text, marginBottom: 20 },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 18 },
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: c.border },
    label: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
    value: { fontSize: 14, color: c.text, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
    form: { gap: 10 },
    input: { backgroundColor: c.card, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: c.text },
    textArea: { minHeight: 80, paddingTop: 10 },
    buttonRow: { flexDirection: "row", gap: 10, marginTop: 8 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center" },
    cancelText: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
    saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: c.accent, alignItems: "center" },
    saveText: { color: c.onAccent, fontWeight: "600", fontSize: 14 },
    buttonDisabled: { opacity: 0.5 },
    editBtn: { marginTop: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: c.accent, alignItems: "center" },
    editText: { fontSize: 14, fontWeight: "600", color: c.accent },
    sectionTitle: { fontSize: 20, fontWeight: "700", color: c.text, marginTop: 28, marginBottom: 12 },
    availForm: { backgroundColor: c.card, borderRadius: 12, padding: 16 },
    availSlot: {
      backgroundColor: c.background, borderRadius: 10, padding: 14, marginBottom: 12,
      borderWidth: 1, borderColor: c.border,
    },
    availHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    availLabel: { fontSize: 13, fontWeight: "700", color: c.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
    removeBtn: { fontSize: 18, color: c.danger, fontWeight: "600", padding: 2 },
    dayRow: { flexDirection: "row", gap: 4, marginBottom: 10 },
    dayBtn: {
      flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1,
      borderColor: c.borderStrong, alignItems: "center", backgroundColor: c.card,
    },
    dayBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
    dayText: { fontSize: 12, fontWeight: "600", color: c.textSecondary },
    dayTextActive: { color: c.onAccent },
    timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    timeInput: { flex: 1, backgroundColor: c.card },
    timeSep: { fontSize: 13, color: c.textSecondary, fontWeight: "500" },
    addSlotBtn: { paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center", marginBottom: 14 },
    addSlotText: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
    availRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: c.border },
    availDay: { fontSize: 14, fontWeight: "600", color: c.accent },
    availTime: { fontSize: 13, color: c.textSecondary },
    emptyAvail: { fontSize: 14, color: c.textTertiary, textAlign: "center", paddingVertical: 12 },
  });
}