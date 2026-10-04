import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useRequestPasswordReset } from "@/hooks/useAuth";
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
  Icon,
  MailIcon,
} from "@/components/ui/icon";

export function ForgotPasswordScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { mutateAsync: requestReset, isPending: loading } =
    useRequestPasswordReset();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resending, setResending] = useState(false);

  const validate = useCallback(
    (value: string): string => {
      if (!value.trim()) {
        return t("auth.forgot_password.email.error.required");
      }
      if (!/\S+@\S+\.\S+/.test(value.trim())) {
        return t("auth.forgot_password.email.error.invalid");
      }
      return "";
    },
    [t]
  );

  const handleSubmit = async () => {
    const error = validate(email);
    setFieldError(error);
    setApiError("");
    if (error) return;

    try {
      await requestReset({ email: email.trim() });
      setSubmittedEmail(email.trim());
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("common.errors.generic");
      setApiError(message);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail || resending) return;
    setResending(true);
    setApiError("");
    try {
      await requestReset({ email: submittedEmail });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("common.errors.generic");
      setApiError(message);
    } finally {
      setResending(false);
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
              submittedEmail
                ? "auth.forgot_password.success.title"
                : "auth.forgot_password.title"
            )}
          </Text>
          <Text className="mt-2 text-center text-base leading-relaxed text-text-secondary">
            {submittedEmail
              ? t("auth.forgot_password.success.subtitle", {
                  email: submittedEmail,
                })
              : t("auth.forgot_password.subtitle")}
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

        {submittedEmail ? (
          <VStack space="xl">
            <HStack space="md" className="items-center justify-center">
              <Icon
                as={CheckCircleIcon}
                size="md"
                className="shrink-0 text-success"
              />
              <Text
                className="flex-1 text-sm font-semibold text-text"
                selectable
              >
                {submittedEmail}
              </Text>
            </HStack>

            <HStack space="xs" className="items-center justify-center">
              <Text className="text-sm text-text-secondary">
                {t("auth.forgot_password.success.didnt_get_it")}
              </Text>
              <Pressable
                onPress={handleResend}
                disabled={resending}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text className="text-sm font-bold text-primary">
                  {resending
                    ? t("auth.forgot_password.success.resending")
                    : t("auth.forgot_password.success.resend")}
                </Text>
              </Pressable>
            </HStack>

            <Box className="items-center">
              <Host matchContents>
                <Button
                  label={t("auth.forgot_password.enter_code")}
                  onPress={() => router.push("/(auth)/reset-password")}
                />
              </Host>
            </Box>
          </VStack>
        ) : (
          <VStack space="xl">
            <FormControl isInvalid={!!fieldError}>
              <FormControlLabel>
                <FormControlLabelText className="text-sm font-semibold text-text">
                  {t("auth.forgot_password.email.label")}
                </FormControlLabelText>
              </FormControlLabel>
              <Input isInvalid={!!fieldError}>
                <InputSlot>
                  <InputIcon as={MailIcon} className="text-text-tertiary" />
                </InputSlot>
                <InputField
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (fieldError) setFieldError("");
                  }}
                  placeholder={t("auth.forgot_password.email.placeholder")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                  onSubmitEditing={handleSubmit}
                />
              </Input>
              {fieldError ? (
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircleIcon} />
                  <FormControlErrorText>{fieldError}</FormControlErrorText>
                </FormControlError>
              ) : null}
            </FormControl>

            <Box className="items-end">
              <Host matchContents>
                <Button
                  label={
                    loading
                      ? t("auth.forgot_password.submitting")
                      : t("auth.forgot_password.submit")
                  }
                  onPress={handleSubmit}
                  disabled={loading}
                />
              </Host>
            </Box>

            <HStack space="xs" className="items-center justify-center">
              <Text className="text-sm text-text-secondary">
                {t("auth.forgot_password.have_code")}
              </Text>
              <Pressable
                onPress={() => router.push("/(auth)/reset-password")}
                accessibilityRole="link"
                hitSlop={8}
              >
                <Text className="text-sm font-bold text-primary">
                  {t("auth.forgot_password.enter_code")}
                </Text>
              </Pressable>
            </HStack>
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
            {t("auth.forgot_password.back_to_login")}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
