import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useConfirmPasswordReset } from "@/hooks/useAuth";
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
  ArrowLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  Icon,
  LockIcon,
  UnlockIcon,
} from "@/components/ui/icon";

interface ResetFieldErrors {
  token?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ResetPasswordScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { mutateAsync: confirmReset, isPending: loading } =
    useConfirmPasswordReset();

  const [token, setToken] = useState(
    typeof params.token === "string" ? params.token : ""
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<ResetFieldErrors>({});
  const [apiError, setApiError] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  const validate = useCallback((): ResetFieldErrors => {
    const next: ResetFieldErrors = {};
    if (!token.trim()) {
      next.token = t("auth.reset_password.token.error.required");
    }
    if (!newPassword) {
      next.newPassword = t("auth.reset_password.new_password.error.required");
    } else if (newPassword.length < 8) {
      next.newPassword = t(
        "auth.reset_password.new_password.error.min_length"
      );
    }
    if (!confirmPassword) {
      next.confirmPassword = t(
        "auth.reset_password.confirm_password.error.required"
      );
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = t(
        "auth.reset_password.confirm_password.error.mismatch"
      );
    }
    return next;
  }, [token, newPassword, confirmPassword, t]);

  const clearFieldError = useCallback((field: keyof ResetFieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  }, []);

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setApiError("");
    if (nextErrors.token || nextErrors.newPassword || nextErrors.confirmPassword)
      return;

    try {
      await confirmReset({ token: token.trim(), newPassword });
      setSucceeded(true);
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
            {t(
              succeeded
                ? "auth.reset_password.success.title"
                : "auth.reset_password.title"
            )}
          </Text>
          <Text className="mt-2 text-center text-base leading-relaxed text-text-secondary">
            {t(
              succeeded
                ? "auth.reset_password.success.subtitle"
                : "auth.reset_password.subtitle"
            )}
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

        {succeeded ? (
          <VStack space="xl">
            <HStack space="md" className="items-center justify-center">
              <Icon
                as={CheckCircleIcon}
                size="md"
                className="shrink-0 text-success"
              />
              <Text className="flex-1 text-sm font-semibold text-text">
                {t("auth.reset_password.success.subtitle")}
              </Text>
            </HStack>

            <Box className="items-center">
              <Host matchContents>
                <Button
                  label={t("auth.reset_password.back_to_login")}
                  onPress={() => router.replace("/(auth)/login")}
                />
              </Host>
            </Box>
          </VStack>
        ) : (
          <VStack space="xl">
            <FormControl isInvalid={!!errors.token}>
              <FormControlLabel>
                <FormControlLabelText className="text-sm font-semibold text-text">
                  {t("auth.reset_password.token.label")}
                </FormControlLabelText>
              </FormControlLabel>
              <Input isInvalid={!!errors.token}>
                <InputSlot>
                  <InputIcon as={UnlockIcon} className="text-text-tertiary" />
                </InputSlot>
                <InputField
                  value={token}
                  onChangeText={(value) => {
                    setToken(value);
                    clearFieldError("token");
                  }}
                  placeholder={t("auth.reset_password.token.placeholder")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </Input>
              {errors.token ? (
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircleIcon} />
                  <FormControlErrorText>{errors.token}</FormControlErrorText>
                </FormControlError>
              ) : null}
            </FormControl>

            <FormControl isInvalid={!!errors.newPassword}>
              <FormControlLabel>
                <FormControlLabelText className="text-sm font-semibold text-text">
                  {t("auth.reset_password.new_password.label")}
                </FormControlLabelText>
              </FormControlLabel>
              <Input isInvalid={!!errors.newPassword}>
                <InputSlot>
                  <InputIcon as={LockIcon} className="text-text-tertiary" />
                </InputSlot>
                <InputField
                  value={newPassword}
                  onChangeText={(value) => {
                    setNewPassword(value);
                    clearFieldError("newPassword");
                  }}
                  placeholder={t(
                    "auth.reset_password.new_password.placeholder"
                  )}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
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
              {errors.newPassword ? (
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircleIcon} />
                  <FormControlErrorText>
                    {errors.newPassword}
                  </FormControlErrorText>
                </FormControlError>
              ) : null}
            </FormControl>

            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormControlLabel>
                <FormControlLabelText className="text-sm font-semibold text-text">
                  {t("auth.reset_password.confirm_password.label")}
                </FormControlLabelText>
              </FormControlLabel>
              <Input isInvalid={!!errors.confirmPassword}>
                <InputSlot>
                  <InputIcon as={LockIcon} className="text-text-tertiary" />
                </InputSlot>
                <InputField
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    clearFieldError("confirmPassword");
                  }}
                  placeholder={t(
                    "auth.reset_password.confirm_password.placeholder"
                  )}
                  secureTextEntry={!showConfirmPassword}
                  textContentType="newPassword"
                  editable={!loading}
                  onSubmitEditing={handleSubmit}
                />
                <InputSlot
                  onPress={() => setShowConfirmPassword((visible) => !visible)}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? t("auth.login.password.hide")
                      : t("auth.login.password.show")
                  }
                  accessibilityState={{ selected: showConfirmPassword }}
                  hitSlop={8}
                >
                  <InputIcon
                    as={showConfirmPassword ? EyeOffIcon : EyeIcon}
                    className="text-text-secondary"
                  />
                </InputSlot>
              </Input>
              {errors.confirmPassword ? (
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircleIcon} />
                  <FormControlErrorText>
                    {errors.confirmPassword}
                  </FormControlErrorText>
                </FormControlError>
              ) : null}
            </FormControl>

            <Box className="items-end">
              <Host matchContents>
                <Button
                  label={
                    loading
                      ? t("auth.reset_password.submitting")
                      : t("auth.reset_password.submit")
                  }
                  onPress={handleSubmit}
                  disabled={loading}
                />
              </Host>
            </Box>
          </VStack>
        )}

        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          accessibilityRole="link"
          hitSlop={8}
          className="flex-row items-center justify-center gap-2"
        >
          <Icon as={ArrowLeftIcon} size="sm" className="text-text-secondary" />
          <Text className="text-sm font-semibold text-text-secondary">
            {t("auth.reset_password.back_to_login")}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
