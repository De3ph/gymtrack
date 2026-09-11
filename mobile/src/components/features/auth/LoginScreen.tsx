import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useLogin } from "@/hooks/useAuth";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import {
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  Icon,
  LockIcon,
  MailIcon,
} from "@/components/ui/icon";

interface LoginFieldErrors {
  identifier?: string;
  password?: string;
}

export function LoginScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { mutateAsync: login, isPending: loading } = useLogin();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [apiError, setApiError] = useState("");

  const validate = useCallback((): LoginFieldErrors => {
    const next: LoginFieldErrors = {};
    if (!identifier.trim()) {
      next.identifier = t("auth.login.email.error.required");
    }
    if (!password) {
      next.password = t("auth.login.password.error.required");
    } else if (password.length < 6) {
      next.password = t("auth.login.password.error.min_length");
    }
    return next;
  }, [identifier, password, t]);

  const clearIdentifierError = useCallback(() => {
    setErrors((prev) =>
      prev.identifier ? { ...prev, identifier: undefined } : prev,
    );
  }, []);

  const clearPasswordError = useCallback(() => {
    setErrors((prev) =>
      prev.password ? { ...prev, password: undefined } : prev,
    );
  }, []);

  const handleLogin = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setApiError("");
    if (nextErrors.identifier || nextErrors.password) return;

    try {
      await login({ identifier: identifier.trim(), password });
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("common.errors.generic");
      setApiError(message);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="grow justify-center gap-6 bg-background px-8 py-8"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Box className="items-center">
          <Box
            className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-brand shadow-lg"
            importantForAccessibility="no"
          >
            <Text className="text-[32px] font-black leading-none text-white">
              G
            </Text>
          </Box>
          <Text className="mb-3 text-xs font-bold uppercase tracking-[3px] text-text-tertiary">
            GymTrack
          </Text>
          <Text className="text-center text-[26px] font-extrabold leading-tight text-text">
            {t("auth.login.title")}
          </Text>
          <Text className="mt-2 text-center text-base leading-relaxed text-text-secondary">
            {t("auth.login.subtitle")}
          </Text>
        </Box>

        {apiError ? (
          <HStack
            space="md"
            className="items-start rounded-xl border border-danger-border bg-danger-surface p-4"
          >
            <Icon
              as={AlertCircleIcon}
              size="md"
              className="mt-0.5 shrink-0 text-danger"
            />
            <Text
              className="flex-1 text-sm font-medium leading-snug text-danger-text"
              selectable
            >
              {apiError}
            </Text>
          </HStack>
        ) : null}

        <VStack space="xl">
          <FormControl isInvalid={!!errors.identifier}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-semibold text-text">
                {t("auth.login.email.label")}
              </FormControlLabelText>
            </FormControlLabel>
            <Input isInvalid={!!errors.identifier}>
              <InputSlot>
                <InputIcon as={MailIcon} className="text-text-tertiary" />
              </InputSlot>
              <InputField
                value={identifier}
                onChangeText={(value) => {
                  setIdentifier(value);
                  clearIdentifierError();
                }}
                placeholder={t("auth.login.email.placeholder")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                editable={!loading}
              />
            </Input>
            {errors.identifier ? (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} />
                <FormControlErrorText>{errors.identifier}</FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          <FormControl isInvalid={!!errors.password}>
            <FormControlLabel className="flex-row justify-between">
              <FormControlLabelText className="text-sm font-semibold text-text">
                {t("auth.login.password.label")}
              </FormControlLabelText>
              <Pressable
                onPress={() => {}}
                accessibilityRole="button"
                accessibilityHint={t("auth.login.forgot_password")}
                hitSlop={8}
              >
                <Text className="text-xs font-semibold text-primary">
                  {t("auth.login.forgot_password")}
                </Text>
              </Pressable>
            </FormControlLabel>
            <Input isInvalid={!!errors.password}>
              <InputSlot>
                <InputIcon as={LockIcon} className="text-text-tertiary" />
              </InputSlot>
              <InputField
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearPasswordError();
                }}
                placeholder={t("auth.login.password.placeholder")}
                secureTextEntry={!showPassword}
                textContentType="password"
                editable={!loading}
              />
              <InputSlot
                onPress={() => setShowPassword((visible) => !visible)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? t("auth.login.password.hide")
                    : t("auth.login.password.show")
                }
                accessibilityState={{ selected: showPassword }}
                hitSlop={8}
              >
                <InputIcon
                  as={showPassword ? EyeOffIcon : EyeIcon}
                  className="text-text-secondary"
                />
              </InputSlot>
            </Input>
            {errors.password ? (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} />
                <FormControlErrorText>{errors.password}</FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          <Box className="items-end">
            <Host matchContents>
              <Button
                label={
                  loading ? t("auth.login.submitting") : t("auth.login.submit")
                }
                onPress={handleLogin}
                disabled={loading}
              />
            </Host>
          </Box>
        </VStack>

        <HStack space="xs" className="items-center justify-center">
          <Text className="text-sm text-text-secondary">
            {t("auth.login.no_account")}
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/register")}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text className="text-sm font-bold text-primary">
              {t("auth.login.sign_up")}
            </Text>
          </Pressable>
        </HStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
