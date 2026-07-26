import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";

type Role = "athlete" | "trainer";

export function RegisterScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [role, setRole] = useState<Role>("athlete");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [fitnessGoals, setFitnessGoals] = useState("");
  const [certifications, setCertifications] = useState("");
  const [specializations, setSpecializations] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (!username.trim() || username.trim().length < 3) {
      setError(t("auth.register.username.error.required"));
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(username.trim())) {
      setError(t("auth.register.username.error.invalid"));
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError(t("auth.register.email.error.invalid"));
      return;
    }
    if (!password || password.length < 8) {
      setError(t("auth.register.password.error.min_length"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.register.confirm_password.error.mismatch"));
      return;
    }

    const profile: Record<string, unknown> = {};
    if (name.trim()) profile.name = name.trim();
    if (role === "athlete") {
      if (age) profile.age = Number(age);
      if (weight) profile.weight = Number(weight);
      if (height) profile.height = Number(height);
      if (fitnessGoals.trim()) profile.fitnessGoals = fitnessGoals.trim();
    } else {
      if (certifications.trim()) profile.certifications = certifications.trim();
      if (specializations.trim()) profile.specializations = specializations.trim();
    }

    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        profile: Object.keys(profile).length > 0 ? profile : undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("common.errors.generic");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.brand}>GymTrack</Text>
          <Text style={styles.title}>{t("auth.register.title")}</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.register.role.label")}</Text>
            <View style={styles.roleRow}>
              {(["athlete", "trainer"] as Role[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleButton, role === r && styles.roleButtonActive]}
                  onPress={() => setRole(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                    {t(`auth.register.role.${r}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.register.username.label")}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t("auth.register.username.placeholder")}
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.register.name.label")}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("auth.register.name.placeholder")}
              placeholderTextColor="#9ca3af"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.register.email.label")}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.register.email.placeholder")}
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.register.password.label")}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.register.password.placeholder")}
              placeholderTextColor="#9ca3af"
              secureTextEntry
              textContentType="newPassword"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.register.confirm_password.label")}</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("auth.register.confirm_password.placeholder")}
              placeholderTextColor="#9ca3af"
              secureTextEntry
              textContentType="newPassword"
              editable={!loading}
              onSubmitEditing={handleRegister}
            />
          </View>

          {role === "athlete" ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>{t("auth.register.age.label")}</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder={t("auth.register.age.placeholder")} placeholderTextColor="#9ca3af" keyboardType="numeric" editable={!loading} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t("auth.register.weight.label")}</Text>
                <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder={t("auth.register.weight.placeholder")} placeholderTextColor="#9ca3af" keyboardType="numeric" editable={!loading} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t("auth.register.height.label")}</Text>
                <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder={t("auth.register.height.placeholder")} placeholderTextColor="#9ca3af" keyboardType="numeric" editable={!loading} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t("auth.register.fitness_goals.label")}</Text>
                <TextInput style={[styles.input, styles.textArea]} value={fitnessGoals} onChangeText={setFitnessGoals} placeholder={t("auth.register.fitness_goals.placeholder")} placeholderTextColor="#9ca3af" multiline numberOfLines={3} textAlignVertical="top" editable={!loading} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>{t("auth.register.certifications.label")}</Text>
                <TextInput style={styles.input} value={certifications} onChangeText={setCertifications} placeholder={t("auth.register.certifications.placeholder")} placeholderTextColor="#9ca3af" editable={!loading} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t("auth.register.specializations.label")}</Text>
                <TextInput style={styles.input} value={specializations} onChangeText={setSpecializations} placeholder={t("auth.register.specializations.placeholder")} placeholderTextColor="#9ca3af" editable={!loading} />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>{t("auth.register.submit")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("auth.register.has_account")} </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.link}>{t("auth.register.sign_in")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, paddingTop: 48, paddingBottom: 48, backgroundColor: "#f9fafb" },
  header: { marginBottom: 28, alignItems: "center" },
  brand: { fontSize: 13, fontWeight: "600", color: "#9ca3af", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  errorBox: { backgroundColor: "#fef2f2", borderLeftWidth: 3, borderLeftColor: "#ef4444", padding: 12, marginBottom: 20, borderRadius: 4 },
  errorText: { color: "#dc2626", fontSize: 14, fontWeight: "500" },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: "#6b7280", letterSpacing: 1, textTransform: "uppercase" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#111827" },
  textArea: { minHeight: 80, paddingTop: 12 },
  roleRow: { flexDirection: "row", gap: 10 },
  roleButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, borderColor: "#d1d5db", alignItems: "center", backgroundColor: "#fff" },
  roleButtonActive: { borderColor: "#2563eb", backgroundColor: "#2563eb" },
  roleText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  roleTextActive: { color: "#fff" },
  button: { backgroundColor: "#2563eb", paddingVertical: 14, borderRadius: 8, alignItems: "center", justifyContent: "center", minHeight: 48, marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28, alignItems: "center" },
  footerText: { fontSize: 14, color: "#6b7280" },
  link: { fontSize: 14, fontWeight: "700", color: "#2563eb" },
});