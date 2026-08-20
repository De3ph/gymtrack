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
import { useThemeColors } from "@/components/useThemeColors";
import type { ThemeColors } from "@/constants/Colors";

export function LoginScreen() {
  const c = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const styles = createStyles(c);

  const handleLogin = async () => {
    setError("");

    if (!identifier.trim()) {
      setError(t("auth.login.email.error.required"));
      return;
    }
    if (!password) {
      setError(t("auth.login.password.error.required"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.login.password.error.min_length"));
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password);
      // Navigation handled automatically by _layout auth guard
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("common.errors.generic");
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
          <Text style={styles.title}>{t("auth.login.title")}</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>
              {t("auth.login.email.label")}
            </Text>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={t("auth.login.email.placeholder")}
              placeholderTextColor={c.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              {t("auth.login.password.label")}
            </Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.login.password.placeholder")}
              placeholderTextColor={c.textTertiary}
              secureTextEntry
              textContentType="password"
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={c.onAccent} size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {t("auth.login.submit")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t("auth.login.no_account")}{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.link}>
              {t("auth.login.sign_up")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: c.background,
    },
    header: {
      marginBottom: 32,
      alignItems: "center",
    },
    brand: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textTertiary,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: c.text,
    },
    errorBox: {
      backgroundColor: c.dangerSurface,
      borderLeftWidth: 3,
      borderLeftColor: c.danger,
      padding: 12,
      marginBottom: 20,
      borderRadius: 4,
    },
    errorText: {
      color: c.dangerText,
      fontSize: 14,
      fontWeight: "500",
    },
    form: {
      gap: 16,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textSecondary,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.text,
    },
    button: {
      backgroundColor: c.accent,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: c.onAccent,
      fontSize: 16,
      fontWeight: "700",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 32,
      alignItems: "center",
    },
    footerText: {
      fontSize: 14,
      color: c.textSecondary,
    },
    link: {
      fontSize: 14,
      fontWeight: "700",
      color: c.accent,
    },
  });
}
