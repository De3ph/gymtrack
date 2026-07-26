import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainerCatalogApi } from "@/api/trainerCatalogApi";
import { availabilityApi } from "@/api/availabilityApi";

export function TrainerProfileScreen() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["trainerProfile"],
    queryFn: () => trainerCatalogApi.getMyProfile(),
  });

  const p = (profile as { profile?: { name?: string; bio?: string; hourlyRate?: number; certifications?: string; specializations?: string } })?.profile;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p?.name ?? "");
  const [bio, setBio] = useState(p?.bio ?? "");
  const [hourlyRate, setHourlyRate] = useState(String(p?.hourlyRate ?? ""));

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: Record<string, unknown>) => trainerCatalogApi.updateTrainerProfile(data),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["trainerProfile"] });
    },
  });

  if (loadingProfile) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

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
});
