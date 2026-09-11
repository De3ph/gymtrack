import { memo, useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";
import { ThemeSettingsCard } from "./ThemeSettingsCard";
import { useLogout } from "@/hooks/useAuth";
import { userApi } from "@/api/userApi";
import { queryClient } from "@/lib/query-client";
import type { User } from "@/types";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Divider } from "@/components/ui/divider";
import { Button, Host } from "@expo/ui";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Badge, BadgeText } from "@/components/ui/badge";
import {
  Avatar,
  AvatarBadge,
  AvatarFallbackText,
} from "@/components/ui/avatar";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import {
  Icon,
  AlertCircleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  EditIcon,
  FavouriteIcon,
  InfoIcon,
  MailIcon,
  MessageCircleIcon,
} from "@/components/ui/icon";
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
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";

const NAME_MIN_LENGTH = 2;
const BIO_MAX_LENGTH = 500;

interface ProfileFieldErrors {
  name?: string;
  bio?: string;
}

const sectionTitleClassName =
  "text-xs font-bold uppercase tracking-[1.5px] text-text-secondary";
const fieldLabelClassName =
  "text-xs font-bold uppercase tracking-[1px] text-text-secondary";
const dossierKickerClassName =
  "text-[11px] font-black uppercase tracking-[2.5px]";
const ledgerIndexClassName =
  "text-[11px] font-black tabular-nums text-text-tertiary";

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function shortYear(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return String(date.getFullYear());
}

const ProfileHeader = memo(function ProfileHeader({ user }: { user: User }) {
  const { t, locale } = useI18n();
  const displayName = user.profile?.name || user.username || user.email || "";
  const initial = (displayName || "?")[0].toUpperCase();
  const handle = user.username ? `@${user.username}` : (user.email ?? "");

  return (
    <Animated.View entering={FadeInUp.duration(450)}>
      <Card className="overflow-hidden border-border-strong p-0">
        {/* Dossier cover — fixed ink panel, asymmetric editorial layout */}
        <Box className="relative overflow-hidden bg-ink">
          {/* expo-linear-gradient needs literal colors; keep in sync with --ink / --ink-subtle tokens */}
          <LinearGradient
            colors={["#0B1220", "#1A2B4A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
          {/* Diagonal brand tape — the unforgettable mark */}
          <Box className="absolute -left-12 top-9 h-2 w-[150%] -rotate-6 bg-brand" />
          <Box className="absolute -left-12 top-[52px] h-px w-[150%] -rotate-6 bg-ink-foreground/25" />
          {/* Giant ghost initial watermark */}
          <Text
            aria-hidden
            className="absolute -right-3 -top-7 text-[128px] font-black leading-none text-ink-foreground/10"
          >
            {initial}
          </Text>

          <VStack space="lg" className="px-5 pb-5 pt-5">
            <HStack className="items-center justify-between">
              <Text
                className={`${dossierKickerClassName} text-ink-foreground/60`}
              >
                {t("profile.title")} — {t("profile.personal_info")}
              </Text>
              <Badge className="rounded-sm bg-ink-foreground px-2.5 py-1">
                <BadgeText className="text-[11px] font-black capitalize tracking-[1px] text-ink">
                  {user.role}
                </BadgeText>
              </Badge>
            </HStack>

            <HStack space="md" className="items-end">
              <Avatar className="h-[76px] w-[76px] rounded-2xl border-2 border-ink-foreground/25 bg-primary">
                <AvatarFallbackText className="text-[30px] font-black text-primary-foreground">
                  {initial}
                </AvatarFallbackText>
                <AvatarBadge className="border-ink bg-success" />
              </Avatar>
              <VStack className="flex-1 gap-0.5 pb-0.5">
                <Heading
                  size="2xl"
                  className="text-left font-black leading-tight text-ink-foreground"
                  numberOfLines={2}
                >
                  {displayName}
                </Heading>
                {handle ? (
                  <Text
                    className="text-left text-[13px] font-semibold tabular-nums text-ink-foreground/65"
                    numberOfLines={1}
                  >
                    {handle}
                  </Text>
                ) : null}
              </VStack>
            </HStack>

            {/* Credential strip — dossier stats with vertical rules */}
            <HStack className="items-stretch rounded-xl border border-ink-foreground/10 bg-ink-foreground/5 px-4 py-3">
              <VStack className="flex-1 gap-1">
                <HStack space="xs" className="items-center">
                  <Box className="h-1.5 w-1.5 rounded-full bg-success" />
                  <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-ink-foreground/55">
                    {t("profile.status")}
                  </Text>
                </HStack>
                <Text className="text-sm font-bold tabular-nums text-ink-foreground">
                  {t("profile.active")}
                </Text>
              </VStack>
              <Divider
                orientation="vertical"
                className="mx-3 h-auto bg-ink-foreground/15"
              />
              <VStack className="flex-1 gap-1">
                <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-ink-foreground/55">
                  {t("profile.member_since")}
                </Text>
                <Text className="text-sm font-bold tabular-nums text-ink-foreground">
                  {shortYear(user.createdAt)}
                </Text>
              </VStack>
              <Divider
                orientation="vertical"
                className="mx-3 h-auto bg-ink-foreground/15"
              />
              <VStack className="flex-[1.4] gap-1">
                <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-ink-foreground/55">
                  {t("profile.fields.email")}
                </Text>
                <Text
                  className="text-sm font-bold tabular-nums text-ink-foreground"
                  numberOfLines={1}
                >
                  {(user.email ?? "—").split("@")[0]}
                </Text>
              </VStack>
            </HStack>

            {user.createdAt ? (
              <HStack space="xs" className="items-center">
                <Icon
                  as={CalendarDaysIcon}
                  size="xs"
                  className="text-ink-foreground/50"
                />
                <Text className="text-[11px] font-semibold tabular-nums text-ink-foreground/55">
                  {formatDate(user.createdAt, locale)}
                </Text>
              </HStack>
            ) : null}
          </VStack>
        </Box>
      </Card>
    </Animated.View>
  );
});

interface InfoRowProps {
  icon: React.ComponentType<Record<string, unknown>>;
  label: string;
  value: string;
  index: string;
  isLast?: boolean;
}

const InfoRow = memo(function InfoRow({
  icon,
  label,
  value,
  index,
  isLast = false,
}: InfoRowProps) {
  return (
    <Box>
      <HStack space="md" className="items-center py-3.5">
        <Text className={ledgerIndexClassName}>{index}</Text>
        <Box className="h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-subtle">
          <Icon as={icon} size="sm" className="text-brand-on-light" />
        </Box>
        <VStack className="flex-1 gap-0.5">
          <Text className="text-[11px] font-bold uppercase tracking-[1px] text-text-secondary">
            {label}
          </Text>
          <Text
            className="text-[15px] font-semibold tabular-nums text-text"
            numberOfLines={3}
          >
            {value}
          </Text>
        </VStack>
      </HStack>
      {!isLast ? <Divider /> : null}
    </Box>
  );
});

function SectionHeading({
  index,
  title,
  action,
}: {
  index: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <HStack space="sm" className="items-center">
      <Text className={ledgerIndexClassName}>{index}</Text>
      <Text className={sectionTitleClassName}>{title}</Text>
      <Divider className="mx-1 flex-1" />
      {action}
    </HStack>
  );
}

interface ActionRowProps {
  icon: React.ComponentType<Record<string, unknown>>;
  label: string;
  hint?: string;
  onPress: () => void;
  testID?: string;
  isLast?: boolean;
}

const ActionRow = memo(function ActionRow({
  icon,
  label,
  hint,
  onPress,
  testID,
  isLast = false,
}: ActionRowProps) {
  return (
    <Box>
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="flex-row items-center rounded-xl border border-transparent active:border-border-strong active:bg-surface-subtle"
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <HStack space="md" className="flex-1 items-center px-2 py-3.5">
          <Box className="h-10 w-10 items-center justify-center rounded-lg bg-ink">
            <Icon as={icon} size="sm" className="text-ink-foreground" />
          </Box>
          <VStack className="flex-1 gap-0">
            <Text className="text-[15px] font-black uppercase tracking-[0.5px] text-text">
              {label}
            </Text>
            {hint ? (
              <Text className="text-xs text-text-secondary">{hint}</Text>
            ) : null}
          </VStack>
          <Box className="h-8 w-8 items-center justify-center rounded-full bg-brand-surface">
            <Icon
              as={ChevronRightIcon}
              size="sm"
              className="text-brand-on-light"
            />
          </Box>
        </HStack>
      </Pressable>
      {!isLast ? <Divider /> : null}
    </Box>
  );
});

export function ProfileScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { mutate: logout } = useLogout();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const { mutate: saveProfile, isPending: saving } = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      userApi.updateCurrentUser(data),
    onSuccess: (updated) => {
      setEditing(false);
      setError("");
      setUser(updated);
      queryClient.setQueryData(["user"], updated);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (err: Error) => {
      setError(err.message || t("profile.update_error"));
    },
  });

  const startEditing = useCallback(() => {
    setName(user?.profile?.name ?? "");
    setBio(user?.profile?.bio ?? "");
    setError("");
    setFieldErrors({});
    setEditing(true);
  }, [user?.profile?.bio, user?.profile?.name]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setError("");
    setFieldErrors({});
  }, []);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedBio = bio.trim();

    const nextFieldErrors: ProfileFieldErrors = {};
    if (trimmedName.length < NAME_MIN_LENGTH) {
      nextFieldErrors.name = t("auth.register.name.error.required");
    }
    if (trimmedBio.length > BIO_MAX_LENGTH) {
      nextFieldErrors.bio = t("profile.validation.bio_too_long");
    }
    setFieldErrors(nextFieldErrors);
    setError("");
    if (nextFieldErrors.name || nextFieldErrors.bio) return;

    // Preserve other profile fields (e.g. trainer fields) and update the edited ones
    saveProfile({
      profile: { ...user?.profile, name: trimmedName, bio: trimmedBio },
    });
  }, [bio, name, saveProfile, t, user?.profile]);

  const openLogoutDialog = useCallback(() => setShowLogoutDialog(true), []);
  const closeLogoutDialog = useCallback(() => setShowLogoutDialog(false), []);
  const confirmLogout = useCallback(() => {
    setShowLogoutDialog(false);
    void logout();
  }, [logout]);

  const goToMyTrainer = useCallback(
    () => router.push("/athlete/my-trainer/0"),
    [router],
  );
  const goToClients = useCallback(
    () => router.push("/trainer/clients"),
    [router],
  );
  const goToTrainerProfile = useCallback(
    () => router.push("/trainer/profile"),
    [router],
  );

  if (!user) {
    return (
      <Center className="flex-1 bg-background p-6">
        <Spinner size="large" />
      </Center>
    );
  }

  const showQuickActions = user.role === "athlete" || user.role === "trainer";
  const bioAtLimit = bio.length >= BIO_MAX_LENGTH;

  return (
    <Box className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-6 pb-12"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader user={user} />

        {error ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <HStack
              space="sm"
              className="items-center rounded-lg border-2 border-danger bg-danger-surface p-3"
            >
              <Box className="h-8 w-8 items-center justify-center rounded-sm bg-danger">
                <Icon
                  as={AlertCircleIcon}
                  size="sm"
                  className="text-danger-on-fill"
                />
              </Box>
              <Text className="flex-1 text-sm font-bold text-danger-text">
                {error}
              </Text>
            </HStack>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInLeft.duration(400).delay(80)}>
          <Card className="border-border-strong">
            <SectionHeading
              index="01"
              title={t("profile.personal_info")}
              action={
                !editing ? (
                  <Pressable
                    onPress={startEditing}
                    accessibilityRole="button"
                    accessibilityLabel={t("profile.edit_profile")}
                    className="h-8 items-center justify-center rounded-sm bg-ink px-3 active:opacity-70"
                  >
                    <HStack space="xs" className="items-center">
                      <Icon
                        as={EditIcon}
                        size="xs"
                        className="text-ink-foreground"
                      />
                      <Text className="text-[11px] font-black uppercase tracking-[1px] text-ink-foreground">
                        {t("common.actions.edit")}
                      </Text>
                    </HStack>
                  </Pressable>
                ) : undefined
              }
            />

            <Divider />

            <InfoRow
              icon={MailIcon}
              index="01"
              label={t("profile.fields.email")}
              value={user.email ?? ""}
            />
            <InfoRow
              icon={CheckCircleIcon}
              index="02"
              label={t("profile.fields.role")}
              value={user.role ?? ""}
              isLast={editing}
            />

            {editing ? (
              <VStack space="md" className="pt-3">
                <FormControl isInvalid={!!fieldErrors.name}>
                  <FormControlLabel>
                    <FormControlLabelText className={fieldLabelClassName}>
                      {t("profile.fields.name")}
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input isInvalid={!!fieldErrors.name}>
                    <InputField
                      testID="input-profile-name"
                      value={name}
                      onChangeText={(value) => {
                        setName(value);
                        if (fieldErrors.name) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            name: undefined,
                          }));
                        }
                      }}
                      placeholder={t("auth.register.name.placeholder")}
                      autoCapitalize="words"
                      editable={!saving}
                    />
                  </Input>
                  {fieldErrors.name ? (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircleIcon} />
                      <FormControlErrorText>
                        {fieldErrors.name}
                      </FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </FormControl>
                <FormControl isInvalid={!!fieldErrors.bio}>
                  <FormControlLabel>
                    <FormControlLabelText className={fieldLabelClassName}>
                      {t("profile.fields.bio")}
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Textarea isInvalid={!!fieldErrors.bio}>
                    <TextareaInput
                      testID="input-profile-bio"
                      value={bio}
                      onChangeText={(value) => {
                        setBio(value);
                        if (fieldErrors.bio) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            bio: undefined,
                          }));
                        }
                      }}
                      placeholder={t("profile.fields.bio")}
                      maxLength={BIO_MAX_LENGTH}
                      editable={!saving}
                      multiline
                    />
                  </Textarea>
                  {fieldErrors.bio ? (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircleIcon} />
                      <FormControlErrorText>
                        {fieldErrors.bio}
                      </FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </FormControl>
                <Text
                  className={`text-right text-xs ${
                    bioAtLimit ? "text-danger" : "text-text-secondary"
                  }`}
                >
                  {bio.length}/{BIO_MAX_LENGTH}
                </Text>
                <HStack space="sm" className="mt-1">
                  <Host matchContents>
                    <Button
                      label={t("common.actions.cancel")}
                      variant="outlined"
                      onPress={cancelEditing}
                      disabled={saving}
                    />
                  </Host>
                  <Host matchContents>
                    <Button
                      label={t("common.actions.save")}
                      onPress={handleSave}
                      disabled={saving}
                    />
                  </Host>
                </HStack>
              </VStack>
            ) : (
              <Box>
                <InfoRow
                  icon={InfoIcon}
                  index="03"
                  label={t("profile.fields.name")}
                  value={user.profile?.name || t("common.not_set")}
                />
                <InfoRow
                  icon={MessageCircleIcon}
                  index="04"
                  label={t("profile.fields.bio")}
                  value={user.profile?.bio || t("common.not_set")}
                  isLast
                />
                <Host matchContents>
                  <Button
                    label={t("profile.edit_profile")}
                    onPress={startEditing}
                  />
                </Host>
              </Box>
            )}
          </Card>
        </Animated.View>

        {showQuickActions ? (
          <Animated.View entering={FadeInRight.duration(400).delay(140)}>
            <Card className="border-border-strong">
              <SectionHeading index="02" title={t("common.actions.title")} />
              <Divider />
              {user.role === "athlete" ? (
                <ActionRow
                  testID="action-my-trainer"
                  icon={FavouriteIcon}
                  label={t("athlete.trainer.title")}
                  onPress={goToMyTrainer}
                  isLast
                />
              ) : (
                <Box>
                  <ActionRow
                    testID="action-my-clients"
                    icon={MessageCircleIcon}
                    label={t("trainer.clients.title")}
                    onPress={goToClients}
                  />
                  <ActionRow
                    testID="action-trainer-profile"
                    icon={EditIcon}
                    label={t("profile.trainer_profile")}
                    onPress={goToTrainerProfile}
                    isLast
                  />
                </Box>
              )}
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInRight.duration(400).delay(170)}>
          <ThemeSettingsCard />
        </Animated.View>

        <Animated.View entering={FadeInRight.duration(400).delay(200)}>
          <Card className="border-danger-border">
            <SectionHeading
              index="04"
              title={t("common.navigation.settings")}
            />
            <Divider />
            <Host>
              <Button
                label={t("auth.logout.button")}
                onPress={openLogoutDialog}
                testID="btn-logout"
              />
            </Host>
            <Text className="pt-1 text-center text-[11px] font-semibold uppercase tracking-[1px] text-text-tertiary">
              {t("auth.logout.message")}
            </Text>
          </Card>
        </Animated.View>

        <AlertDialog isOpen={showLogoutDialog} onClose={closeLogoutDialog}>
          <AlertDialogBackdrop />
          <AlertDialogContent>
            <AlertDialogHeader>
              <Text className="text-lg font-bold text-text">
                {t("auth.logout.confirm")}
              </Text>
            </AlertDialogHeader>
            <AlertDialogBody>
              <Text className="text-sm text-text-secondary">
                {t("auth.logout.message")}
              </Text>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Host matchContents>
                <Button
                  label={t("common.actions.cancel")}
                  variant="outlined"
                  onPress={closeLogoutDialog}
                />
              </Host>
              <Host matchContents>
                <Button
                  label={t("auth.logout.button")}
                  style={{ backgroundColor: "#dc2626" }}
                  onPress={confirmLogout}
                />
              </Host>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ScrollView>
    </Box>
  );
}
