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
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

export function ProfileScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const styles = createStyles(c);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.profile?.name ?? "");
  const [bio, setBio] = useState(user?.profile?.bio ?? "");
  const [error, setError] = useState("");

  const { mutate: saveProfile, isPending: saving } = useMutation({
    mutationFn: (data: Record<string, unknown>) => userApi.updateCurrentUser(data),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (err: Error) => {
      setError(err.message || t("profile.update_error"));
    },
  });

  const handleSave = () => {
    setError("");
    const trimmedName = name.trim();
    const trimmedBio = bio.trim();

    if (trimmedName.length < 2) {
      setError(t("auth.register.name.error.required"));
      return;
    }
    if (trimmedBio.length > 500) {
      setError(t("common.errors.invalid"));
      return;
    }

    saveProfile({ profile: { name: trimmedName, bio: trimmedBio } });
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

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

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
                placeholderTextColor={c.textTertiary}
                editable={!saving}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{t("profile.bio")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder={t("trainer.bio")}
                placeholderTextColor={c.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditing(false);
                  setError("");
                }}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={c.onAccent} size="small" /> : <Text style={styles.saveText}>{t("common.save")}</Text>}
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

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    container: { padding: 24, paddingBottom: 48 },
    errorBox: { backgroundColor: c.dangerSurface, borderLeftWidth: 3, borderLeftColor: c.danger, padding: 12, marginBottom: 16, borderRadius: 4 },
    errorText: { color: c.dangerText, fontSize: 14, fontWeight: "500" },
    header: { alignItems: "center", marginBottom: 28, marginTop: 16 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    avatarText: { color: c.onAccent, fontSize: 28, fontWeight: "800" },
    name: { fontSize: 22, fontWeight: "700", color: c.text, marginBottom: 6 },
    roleBadge: { backgroundColor: c.accentSurface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    roleText: { fontSize: 13, fontWeight: "600", color: c.accentOnLight, textTransform: "capitalize" },
    section: { backgroundColor: c.card, borderRadius: 12, padding: 18, marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: c.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
    fieldRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: c.border },
    field: { marginBottom: 12 },
    label: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
    value: { fontSize: 14, color: c.text, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
    input: { backgroundColor: c.background, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: c.text },
    textArea: { minHeight: 80, paddingTop: 10 },
    buttonRow: { flexDirection: "row", gap: 10, marginTop: 14 },
    cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center" },
    cancelText: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
    saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: c.accent, alignItems: "center" },
    saveText: { fontSize: 14, fontWeight: "600", color: c.onAccent },
    editButton: { marginTop: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: c.accent, alignItems: "center" },
    editText: { fontSize: 14, fontWeight: "600", color: c.accent },
    linkButton: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: c.border },
    linkText: { fontSize: 15, fontWeight: "500", color: c.accent },
    logoutButton: { marginTop: 8, paddingVertical: 14, borderRadius: 8, borderWidth: 1.5, borderColor: c.danger, alignItems: "center" },
    logoutText: { fontSize: 15, fontWeight: "700", color: c.danger },
  });
}
