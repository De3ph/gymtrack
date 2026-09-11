import React, { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useRegister } from "@/hooks/useAuth";
import {
  useRegisterFormStore,
  type RegisterRole,
} from "@/stores/register-form-store";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
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
  AtSignIcon,
  EyeIcon,
  EyeOffIcon,
  Icon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "@/components/ui/icon";

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const ROLE_OPTIONS: { value: RegisterRole; icon: typeof UserIcon }[] = [
  { value: "athlete", icon: UserIcon },
  { value: "trainer", icon: UserIcon },
];

function RegisterScreenInner() {
  const { t } = useI18n();
  const router = useRouter();
  const { mutateAsync: register, isPending: loading } = useRegister();

  const role = useRegisterFormStore((s) => s.role);
  const error = useRegisterFormStore((s) => s.error);
  const username = useRegisterFormStore((s) => s.username);
  const name = useRegisterFormStore((s) => s.name);
  const email = useRegisterFormStore((s) => s.email);
  const password = useRegisterFormStore((s) => s.password);
  const confirmPassword = useRegisterFormStore((s) => s.confirmPassword);
  const age = useRegisterFormStore((s) => s.age);
  const weight = useRegisterFormStore((s) => s.weight);
  const height = useRegisterFormStore((s) => s.height);
  const fitnessGoals = useRegisterFormStore((s) => s.fitnessGoals);
  const certifications = useRegisterFormStore((s) => s.certifications);
  const specializations = useRegisterFormStore((s) => s.specializations);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  }, []);

  const handleRegister = useCallback(async () => {
    const form = useRegisterFormStore.getState();
    form.setError("");
    setFieldErrors({});

    const nextErrors: FieldErrors = {};

    if (!form.username.trim() || form.username.trim().length < 3) {
      nextErrors.username = t("auth.register.username.error.required");
    } else if (!/^[a-zA-Z0-9]+$/.test(form.username.trim())) {
      nextErrors.username = t("auth.register.username.error.invalid");
    }

    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = t("auth.register.email.error.invalid");
    }

    if (!form.password || form.password.length < 8) {
      nextErrors.password = t("auth.register.password.error.min_length");
    }

    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = t(
        "auth.register.confirm_password.error.mismatch",
      );
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const profile: Record<string, unknown> = {};
    if (form.name.trim()) profile.name = form.name.trim();
    if (form.role === "athlete") {
      if (form.age) profile.age = Number(form.age);
      if (form.weight) profile.weight = Number(form.weight);
      if (form.height) profile.height = Number(form.height);
      if (form.fitnessGoals.trim()) {
        profile.fitnessGoals = form.fitnessGoals.trim();
      }
    } else {
      if (form.certifications.trim()) {
        profile.certifications = form.certifications.trim();
      }
      if (form.specializations.trim()) {
        profile.specializations = form.specializations.trim();
      }
    }

    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        profile: Object.keys(profile).length > 0 ? profile : undefined,
      });
      form.resetForm();
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("common.errors.generic");
      form.setError(message);
    }
  }, [register, router, t]);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="grow bg-background px-6 pb-12 pt-12"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Box className="mb-7 items-center">
          <Box
            className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg"
            importantForAccessibility="no"
          >
            <Text className="text-[32px] font-black leading-none text-primary-foreground">
              G
            </Text>
          </Box>
          <Text className="mb-2 text-[13px] font-semibold uppercase tracking-[2px] text-text-tertiary">
            GymTrack
          </Text>
          <Text className="text-center text-[26px] font-extrabold leading-tight text-text">
            {t("auth.register.title")}
          </Text>
        </Box>

        {error ? (
          <HStack
            space="md"
            className="mb-5 items-start rounded-xl border border-danger-border bg-danger-surface p-4"
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
              {error}
            </Text>
          </HStack>
        ) : null}

        <VStack space="xl">
          <FormControl>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-semibold text-text">
                {t("auth.register.role.label")}
              </FormControlLabelText>
            </FormControlLabel>
            <HStack space="md">
              {ROLE_OPTIONS.map(({ value: r, icon: RoleIcon }) => {
                const active = role === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => useRegisterFormStore.getState().setRole(r)}
                    accessibilityRole="button"
                    accessibilityLabel={t(`auth.register.role.${r}`)}
                    accessibilityState={{ selected: active }}
                    hitSlop={8}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] py-3.5 ${
                      active
                        ? "border-primary bg-primary"
                        : "border-border-strong bg-card"
                    }`}
                  >
                    <Icon
                      as={RoleIcon}
                      size="sm"
                      className={
                        active
                          ? "text-primary-foreground"
                          : "text-text-secondary"
                      }
                    />
                    <Text
                      className={`text-[15px] font-semibold ${
                        active ? "text-primary-foreground" : "text-text-body"
                      }`}
                    >
                      {t(`auth.register.role.${r}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
          </FormControl>

          <FormControl isInvalid={!!fieldErrors.username}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-semibold text-text">
                {t("auth.register.username.label")}
              </FormControlLabelText>
            </FormControlLabel>
            <Input isInvalid={!!fieldErrors.username}>
              <InputSlot>
                <InputIcon as={AtSignIcon} className="text-text-tertiary" />
              </InputSlot>
              <InputField
                value={username}
                onChangeText={(value) => {
                  useRegisterFormStore.getState().setUsername(value);
                  clearFieldError("username");
                }}
                placeholder={t("auth.register.username.placeholder")}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                editable={!loading}
              />
            </Input>
            {fieldErrors.username ? (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} />
                <FormControlErrorText>
                  {fieldErrors.username}
                </FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          <FormControl>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-semibold text-text">
                {t("auth.register.name.label")}
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputSlot>
                <InputIcon as={UserIcon} className="text-text-tertiary" />
              </InputSlot>
              <InputField
                value={name}
                onChangeText={(value) =>
                  useRegisterFormStore.getState().setName(value)
                }
                placeholder={t("auth.register.name.placeholder")}
                textContentType="name"
                editable={!loading}
              />
            </Input>
          </FormControl>

          <FormControl isInvalid={!!fieldErrors.email}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-semibold text-text">
                {t("auth.register.email.label")}
              </FormControlLabelText>
            </FormControlLabel>
            <Input isInvalid={!!fieldErrors.email}>
              <InputSlot>
                <InputIcon as={MailIcon} className="text-text-tertiary" />
              </InputSlot>
              <InputField
                value={email}
                onChangeText={(value) => {
                  useRegisterFormStore.getState().setEmail(value);
                  clearFieldError("email");
                }}
                placeholder={t("auth.register.email.placeholder")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />
            </Input>
            {fieldErrors.email ? (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} />
                <FormControlErrorText>{fieldErrors.email}</FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          <FormControl isInvalid={!!fieldErrors.password}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-semibold text-text">
                {t("auth.register.password.label")}
              </FormControlLabelText>
            </FormControlLabel>
            <Input isInvalid={!!fieldErrors.password}>
              <InputSlot>
                <InputIcon as={LockIcon} className="text-text-tertiary" />
              </InputSlot>
              <InputField
                value={password}
                onChangeText={(value) => {
                  useRegisterFormStore.getState().setPassword(value);
                  clearFieldError("password");
                }}
                placeholder={t("auth.register.password.placeholder")}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                editable={!loading}
              />
              <InputSlot
                onPress={() => setShowPassword((v) => !v)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? t("auth.login.password.hide")
                    : t("auth.login.password.show")
                }
                accessibilityState={{ selected: showPassword, disabled: loading }}
                hitSlop={8}
              >
                <InputIcon
                  as={showPassword ? EyeOffIcon : EyeIcon}
                  className="text-text-secondary"
                />
              </InputSlot>
            </Input>
            {fieldErrors.password ? (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} />
                <FormControlErrorText>{fieldErrors.password}</FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          <FormControl isInvalid={!!fieldErrors.confirmPassword}>
            <FormControlLabel>
              <FormControlLabelText className="text-sm font-semibold text-text">
                {t("auth.register.confirm_password.label")}
              </FormControlLabelText>
            </FormControlLabel>
            <Input isInvalid={!!fieldErrors.confirmPassword}>
              <InputSlot>
                <InputIcon as={LockIcon} className="text-text-tertiary" />
              </InputSlot>
              <InputField
                value={confirmPassword}
                onChangeText={(value) => {
                  useRegisterFormStore.getState().setConfirmPassword(value);
                  clearFieldError("confirmPassword");
                }}
                placeholder={t("auth.register.confirm_password.placeholder")}
                secureTextEntry={!showConfirmPassword}
                textContentType="newPassword"
                editable={!loading}
                onSubmitEditing={handleRegister}
              />
              <InputSlot
                onPress={() => setShowConfirmPassword((v) => !v)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirmPassword
                    ? t("auth.login.password.hide")
                    : t("auth.login.password.show")
                }
                accessibilityState={{ selected: showConfirmPassword, disabled: loading }}
                hitSlop={8}
              >
                <InputIcon
                  as={showConfirmPassword ? EyeOffIcon : EyeIcon}
                  className="text-text-secondary"
                />
              </InputSlot>
            </Input>
            {fieldErrors.confirmPassword ? (
              <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} />
                <FormControlErrorText>
                  {fieldErrors.confirmPassword}
                </FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          {role === "athlete" ? (
            <>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-sm font-semibold text-text">
                    {t("auth.register.age.label")}
                  </FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={age}
                    onChangeText={(value) =>
                      useRegisterFormStore.getState().setAge(value)
                    }
                    placeholder={t("auth.register.age.placeholder")}
                    keyboardType="numeric"
                    textContentType="none"
                    editable={!loading}
                  />
                </Input>
              </FormControl>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-sm font-semibold text-text">
                    {t("auth.register.weight.label")}
                  </FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={weight}
                    onChangeText={(value) =>
                      useRegisterFormStore.getState().setWeight(value)
                    }
                    placeholder={t("auth.register.weight.placeholder")}
                    keyboardType="numeric"
                    textContentType="none"
                    editable={!loading}
                  />
                </Input>
              </FormControl>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-sm font-semibold text-text">
                    {t("auth.register.height.label")}
                  </FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={height}
                    onChangeText={(value) =>
                      useRegisterFormStore.getState().setHeight(value)
                    }
                    placeholder={t("auth.register.height.placeholder")}
                    keyboardType="numeric"
                    textContentType="none"
                    editable={!loading}
                  />
                </Input>
              </FormControl>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-sm font-semibold text-text">
                    {t("auth.register.fitness_goals.label")}
                  </FormControlLabelText>
                </FormControlLabel>
                <Textarea>
                  <TextareaInput
                    value={fitnessGoals}
                    onChangeText={(value) =>
                      useRegisterFormStore.getState().setFitnessGoals(value)
                    }
                    placeholder={t("auth.register.fitness_goals.placeholder")}
                    editable={!loading}
                  />
                </Textarea>
              </FormControl>
            </>
          ) : (
            <>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-sm font-semibold text-text">
                    {t("auth.register.certifications.label")}
                  </FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={certifications}
                    onChangeText={(value) =>
                      useRegisterFormStore.getState().setCertifications(value)
                    }
                    placeholder={t("auth.register.certifications.placeholder")}
                    editable={!loading}
                  />
                </Input>
              </FormControl>
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-sm font-semibold text-text">
                    {t("auth.register.specializations.label")}
                  </FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={specializations}
                    onChangeText={(value) =>
                      useRegisterFormStore.getState().setSpecializations(value)
                    }
                    placeholder={t("auth.register.specializations.placeholder")}
                    editable={!loading}
                  />
                </Input>
              </FormControl>
            </>
          )}

          <Host matchContents>
            <Button
              label={
                loading
                  ? t("auth.register.submitting")
                  : t("auth.register.submit")
              }
              onPress={handleRegister}
              disabled={loading}
            />
          </Host>
        </VStack>

        <HStack space="sm" className="mt-7 items-center justify-center">
          <Text className="text-sm text-text-secondary">
            {t("auth.register.has_account")}
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text className="text-sm font-bold text-primary">
              {t("auth.register.sign_in")}
            </Text>
          </Pressable>
        </HStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const RegisterScreen = React.memo(RegisterScreenInner);
