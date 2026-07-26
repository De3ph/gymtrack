import { useState } from "react";
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
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";
import { userApi } from "@/api/userApi";
import { queryClient } from "@/lib/query-client";

export function ProfileScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.profile?.name ?? "");
  const [bio, setBio] = useState(user?.profile?.bio ?? "");

  const { mutate: saveProfile, isPending: saving } = useMutation({
    mutationFn: (data: Record<string, unknown>) => userApi.updateCurrentUser(data),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const handleSave = () => {
    saveProfile({ profile: { name: name.trim(), bio: bio.trim() } });
  };

  const handleLogout = () => {
    Alert.alert(t("auth.logout.confirm"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.logout.button"),
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.username ?? user?.email ?? "?")[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.profile?.name || user?.username || t("profile.title")}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.title")}</Text>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>{t("auth.register.email.label")}</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>{t("profile.role")}</Text>
          <Text style={styles.value}>{user?.role}</Text>
        </View>

        {editing ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>{t("profile.name")}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t("auth.register.name.placeholder")}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{t("profile.bio")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder={t("trainer.bio")}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>{t("common.save")}</Text>}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t("profile.name")}</Text>
              <Text style={styles.value}>{user?.profile?.name || t("common.not_set")}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t("profile.bio")}</Text>
              <Text style={styles.value}>{user?.profile?.bio || t("common.not_set")}</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editText}>{t("profile.edit_profile")}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("common.actions")}</Text>
        {user?.role === "athlete" && (
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/athlete/my-trainer/0")}>
            <Text style={styles.linkText}>{t("profile.my_trainer")}</Text>
          </TouchableOpacity>
        )}
        {user?.role === "trainer" && (
          <>
            <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/trainer/clients")}>
              <Text style={styles.linkText}>My Clients</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/trainer/profile")}>
              <Text style={styles.linkText}>Trainer Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t("auth.logout.button")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  container: { padding: 24, paddingBottom: 48 },
  header: { alignItems: "center", marginBottom: 28, marginTop: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6 },
  roleBadge: { backgroundColor: "#dbeafe", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 13, fontWeight: "600", color: "#1d4ed8", textTransform: "capitalize" },
  section: { backgroundColor: "#fff", borderRadius: 12, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  value: { fontSize: 14, color: "#111827", fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  input: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#111827" },
  textArea: { minHeight: 80, paddingTop: 10 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  saveText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  editButton: { marginTop: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#2563eb", alignItems: "center" },
  editText: { fontSize: 14, fontWeight: "600", color: "#2563eb" },
  linkButton: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  linkText: { fontSize: 15, fontWeight: "500", color: "#2563eb" },
  logoutButton: { marginTop: 8, paddingVertical: 14, borderRadius: 8, borderWidth: 1.5, borderColor: "#ef4444", alignItems: "center" },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
});
