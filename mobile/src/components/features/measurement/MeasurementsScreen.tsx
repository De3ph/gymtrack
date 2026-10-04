import { useState, useMemo, useCallback, memo } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Alert,
  useWindowDimensions,
} from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bodyMeasurementApi } from "@/api/bodyMeasurementApi";
import { canEdit } from "@/lib/canEdit";
import { useI18n } from "@/lib/i18n";
import type { BodyMeasurement } from "@/types";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
} from "@/components/ui/modal";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Icon, AddIcon, CloseIcon } from "@/components/ui/icon";
import { isSessionExpiredError } from "@/api/client";
import { SessionExpiredView } from "@/components/features/auth/SessionExpiredView";

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

/** Matches backend models.SupportedBodyParts. */
const BODY_PARTS = [
  "chest",
  "waist",
  "hips",
  "neck",
  "shoulders",
  "bicepLeft",
  "bicepRight",
  "forearmLeft",
  "forearmRight",
  "thighLeft",
  "thighRight",
  "calfLeft",
  "calfRight",
];

const labelClassName =
  "text-xs font-bold uppercase tracking-[1px] text-text-secondary";

const PART_LABEL_PREFIX = "body_measurement.list.part_labels.";

function partLabel(t: TranslateFn, key: string): string {
  const translated = t(PART_LABEL_PREFIX + key);
  return translated === PART_LABEL_PREFIX + key ? key : translated;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function buildMeasurementBody(
  date: string,
  weight: string,
  bodyFat: string,
  notes: string,
  parts: Record<string, string>,
): Record<string, unknown> {
  const body: Record<string, unknown> = { date };
  if (weight) body.weight = Number(weight);
  if (bodyFat) body.bodyFatPct = Number(bodyFat);
  if (notes.trim()) body.notes = notes.trim();
  body.weightUnit = "kg";
  // Backend expects parts as Record<string, { value: number }>
  const pv: Record<string, { value: number }> = {};
  Object.entries(parts).forEach(([k, v]) => {
    if (v) pv[k] = { value: Number(v) };
  });
  if (Object.keys(pv).length > 0) body.parts = pv;
  return body;
}

function isValidNumber(value: string): boolean {
  if (!value.trim()) return true;
  const n = Number(value);
  return !Number.isNaN(n) && n >= 0;
}

function Sparkline({
  data,
  color,
  height,
}: {
  data: number[];
  color: string;
  height: number;
}) {
  const { width: windowWidth } = useWindowDimensions();
  if (data.length < 2) return null;
  const w = Math.min(Math.max(windowWidth - 96, 200), 400);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * height}`,
    )
    .join(" ");
  const lastX = w;
  const lastY = height - ((data[data.length - 1] - min) / range) * height;
  return (
    <Svg width={w} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx={lastX} cy={lastY} r={3} fill={color} />
    </Svg>
  );
}

interface MeasurementCardProps {
  measurement: BodyMeasurement;
  onEdit: (m: BodyMeasurement) => void;
  onDelete: (m: BodyMeasurement) => void;
}

const MeasurementCard = memo(function MeasurementCard({
  measurement,
  onEdit,
  onDelete,
}: MeasurementCardProps) {
  const { t } = useI18n();
  const editable = canEdit(measurement.createdAt);
  const partEntries = Object.entries(measurement.parts ?? {});

  return (
    <Box className="rounded-xl border border-border bg-card p-3.5">
      <HStack className="mb-1.5 items-center justify-between">
        <Text className="text-sm font-semibold text-text">
          {measurement.date}
        </Text>
        <HStack space="md">
          {measurement.weight ? (
            <Text className="text-[13px] font-bold text-primary">
              {measurement.weight} {t("body_measurement.charts.weight_unit_kg")}
            </Text>
          ) : null}
          {measurement.bodyFatPct ? (
            <Text className="text-[13px] font-bold text-primary">
              {t("body_measurement.list.body_fat_short", {
                value: measurement.bodyFatPct,
              })}
            </Text>
          ) : null}
        </HStack>
      </HStack>
      {partEntries.length > 0 && (
        <Box className="mt-1.5 flex-row flex-wrap gap-1.5">
          {partEntries.slice(0, 4).map(([k, part]) => (
            <Box key={k} className="rounded bg-surface-subtle px-2 py-0.5">
              <Text className="text-[11px] text-text-secondary">
                {partLabel(t, k)}: {part?.value ?? 0}
                {t("body_measurement.list.unit_cm")}
              </Text>
            </Box>
          ))}
        </Box>
      )}
      {measurement.notes ? (
        <Text className="mt-1.5 text-xs text-text-tertiary" numberOfLines={2}>
          {measurement.notes}
        </Text>
      ) : null}
      {editable && (
        <HStack className="mt-2.5 justify-end gap-4 border-t border-border pt-2">
          <Pressable onPress={() => onEdit(measurement)} className="px-2 py-1">
            <Text className="text-[13px] font-semibold text-primary">
              {t("common.actions.edit")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(measurement)}
            className="px-2 py-1"
          >
            <Text className="text-[13px] font-semibold text-danger">
              {t("common.actions.delete")}
            </Text>
          </Pressable>
        </HStack>
      )}
    </Box>
  );
});

export function MeasurementsScreen() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingMeasurement, setEditingMeasurement] =
    useState<BodyMeasurement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BodyMeasurement | null>(
    null,
  );
  const [weight, setWeight] = useState(""),
    [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const [parts, setParts] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ["measurements"],
    queryFn: () => bodyMeasurementApi.getAll(),
  });
  const { data: latest } = useQuery({
    queryKey: ["latestMeasurement"],
    queryFn: () => bodyMeasurementApi.getLatest(),
  });

  const invalidateMeasurementQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["measurements"] });
    qc.invalidateQueries({ queryKey: ["latestMeasurement"] });
  }, [qc]);

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      bodyMeasurementApi.create(body),
    onSuccess: () => {
      closeForm();
      invalidateMeasurementQueries();
    },
    onError: (err: Error) => {
      Alert.alert(t("common.errors.generic"), err.message);
    },
  });

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      bodyMeasurementApi.update(id, body),
    onSuccess: () => {
      closeForm();
      invalidateMeasurementQueries();
    },
    onError: (err: Error) => {
      Alert.alert(t("common.errors.generic"), err.message);
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: number) => bodyMeasurementApi.delete(id),
    onSuccess: invalidateMeasurementQueries,
    onError: (err: Error) => {
      Alert.alert(t("common.errors.generic"), err.message);
    },
  });

  const isPending = creating || updating;

  const closeForm = useCallback(() => {
    setShowAdd(false);
    setEditingMeasurement(null);
    setWeight("");
    setBodyFat("");
    setNotes("");
    setParts({});
    setFormError("");
  }, []);

  const openCreateForm = useCallback(() => {
    closeForm();
    setShowAdd(true);
  }, [closeForm]);

  const openEditForm = useCallback((m: BodyMeasurement) => {
    setEditingMeasurement(m);
    setWeight(m.weight != null ? String(m.weight) : "");
    setBodyFat(m.bodyFatPct != null ? String(m.bodyFatPct) : "");
    setNotes(m.notes ?? "");
    const partsStr: Record<string, string> = {};
    Object.entries(m.parts ?? {}).forEach(([k, part]) => {
      if (part?.value != null) partsStr[k] = String(part.value);
    });
    setParts(partsStr);
    setFormError("");
    setShowAdd(true);
  }, []);

  function handleSave() {
    if (!isValidNumber(weight) || !isValidNumber(bodyFat)) {
      setFormError(t("body_measurement.form.validation.invalid_number"));
      return;
    }
    const badPart = Object.entries(parts).find(([, v]) => !isValidNumber(v));
    if (badPart) {
      setFormError(
        t("body_measurement.form.validation.part_invalid", {
          part: partLabel(t, badPart[0]),
        }),
      );
      return;
    }
    setFormError("");
    const body = buildMeasurementBody(
      editingMeasurement?.date ?? todayISO(),
      weight,
      bodyFat,
      notes,
      parts,
    );

    if (editingMeasurement?.measurementId != null) {
      update({ id: editingMeasurement.measurementId, body });
    } else {
      create(body);
    }
  }

  const handleDelete = useCallback((m: BodyMeasurement) => {
    if (m.measurementId == null) return;
    setPendingDelete(m);
  }, []);

  const confirmDelete = useCallback(() => {
    const id = pendingDelete?.measurementId;
    setPendingDelete(null);
    if (id == null) return;
    remove(id);
  }, [pendingDelete, remove]);

  const measurements = useMemo<BodyMeasurement[]>(
    () => data?.measurements ?? [],
    [data],
  );
  const latestM = latest ?? null;
  const wData = useMemo(
    () =>
      [...measurements]
        .reverse()
        .map((m) => m.weight ?? 0)
        .filter((w) => w > 0),
    [measurements],
  );

  const renderItem = useCallback(
    ({ item }: { item: BodyMeasurement }) => (
      <MeasurementCard
        measurement={item}
        onEdit={openEditForm}
        onDelete={handleDelete}
      />
    ),
    [openEditForm, handleDelete],
  );

  const modalTitle = editingMeasurement
    ? t("body_measurement.edit.title")
    : t("body_measurement.form.create_title");
  const saveLabel = editingMeasurement
    ? t("common.actions.update")
    : t("common.actions.save");

  return (
    <Box className="flex-1 bg-background">
      {isLoading ? (
        <Box className="flex-1 items-center justify-center p-6">
          <Spinner size="large" className="text-primary" />
        </Box>
      ) : isError ? (
        isSessionExpiredError(error) ? (
          <SessionExpiredView message={(error as Error)?.message} />
        ) : (
          <Box className="flex-1 items-center justify-center p-6">
            <Text className="mb-3 text-[15px] text-danger">
              {t("body_measurement.list.load_failed")}
            </Text>
            <Host matchContents>
              <Button
                label={t("common.actions.retry")}
                onPress={() => refetch()}
              />
            </Host>
          </Box>
        )
      ) : (
        <FlatList
          data={measurements}
          keyExtractor={(item, index) =>
            String(item.measurementId ?? `measurement-${index}`)
          }
          renderItem={renderItem}
          contentContainerClassName="gap-3 p-4 pb-20"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListHeaderComponent={
            <>
              {latestM && (
                <Box className="mb-4 rounded-2xl border border-border bg-card p-5">
                  <Text className="mb-3.5 text-[13px] font-bold uppercase tracking-[1px] text-text-secondary">
                    {t("body_measurement.list.latest")}
                  </Text>
                  <HStack space="xl" className="mb-2">
                    {latestM.weight ? (
                      <Box className="items-start">
                        <Text className="text-[32px] font-extrabold text-primary">
                          {latestM.weight}
                        </Text>
                        <Text className="mt-0.5 text-xs font-semibold text-text-secondary">
                          {t("body_measurement.charts.weight_unit_kg")}
                        </Text>
                      </Box>
                    ) : null}
                    {latestM.bodyFatPct != null ? (
                      <Box className="items-start">
                        <Text className="text-[32px] font-extrabold text-primary">
                          {latestM.bodyFatPct}%
                        </Text>
                        <Text className="mt-0.5 text-xs font-semibold text-text-secondary">
                          {t("body_measurement.charts.body_fat_label")}
                        </Text>
                      </Box>
                    ) : null}
                  </HStack>
                  <Text className="mt-1 text-[13px] text-text-tertiary">
                    {latestM.date}
                  </Text>
                  {latestM.parts && Object.keys(latestM.parts).length > 0 && (
                    <VStack space="sm" className="mt-4">
                      {Object.entries(latestM.parts).map(([k, part]) => {
                        const value = part?.value ?? 0;
                        return (
                          <HStack key={k} space="sm" className="items-center">
                            <Text
                              className="w-[90px] text-xs font-semibold text-text-secondary"
                              numberOfLines={1}
                            >
                              {partLabel(t, k)}
                            </Text>
                            <Box className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                              <Box
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${Math.min((value / 150) * 100, 100)}%`,
                                }}
                              />
                            </Box>
                            <Text className="w-[50px] text-right text-xs font-semibold text-text">
                              {value} {t("body_measurement.list.unit_cm")}
                            </Text>
                          </HStack>
                        );
                      })}
                    </VStack>
                  )}
                </Box>
              )}
              {wData.length >= 2 && (
                <Box className="mb-4 items-center rounded-2xl border border-border bg-card p-4">
                  <Text className="mb-3 text-[13px] font-bold uppercase tracking-[1px] text-text-secondary">
                    {t("body_measurement.list.weight_trend")}
                  </Text>
                  <Sparkline
                    data={wData.slice(-14)}
                    color="#22c55e"
                    height={80}
                  />
                </Box>
              )}
            </>
          }
          ListEmptyComponent={
            <Box className="flex-1 items-center justify-center p-6">
              <Text className="text-[15px] text-text-secondary">
                {t("body_measurement.list.no_measurements")}
              </Text>
            </Box>
          }
        />
      )}
      {!showAdd && (
        <Pressable
          onPress={openCreateForm}
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-hard-2"
        >
          <Icon
            as={AddIcon}
            size="xl"
            className="h-7 w-7 text-primary-foreground"
          />
        </Pressable>
      )}
      <Modal isOpen={showAdd} onClose={closeForm} size="lg">
        <ModalBackdrop />
        <ModalContent className="max-h-[85%] p-0">
          <ScrollView contentContainerClassName="gap-2.5 bg-card p-6 pb-10">
            <ModalHeader>
              <Text className="mb-1.5 text-xl font-bold text-text">
                {modalTitle}
              </Text>
              <ModalCloseButton>
                <Icon as={CloseIcon} className="text-text-secondary" />
              </ModalCloseButton>
            </ModalHeader>
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className={labelClassName}>
                  {t("body_measurement.form.weight_label")}
                </FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="75.0"
                />
              </Input>
            </FormControl>
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className={labelClassName}>
                  {t("body_measurement.form.body_fat_label")}
                </FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  keyboardType="numeric"
                  placeholder="15.0"
                />
              </Input>
            </FormControl>
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className={labelClassName}>
                  {t("body_measurement.form.notes_label")}
                </FormControlLabelText>
              </FormControlLabel>
              <Textarea>
                <TextareaInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t("body_measurement.form.notes_placeholder")}
                />
              </Textarea>
            </FormControl>
            <Text className={labelClassName}>
              {t("body_measurement.form.parts_label")}
            </Text>
            <VStack space="sm">
              {BODY_PARTS.map((p) => (
                <HStack key={p} space="sm" className="items-center">
                  <Text className="w-24 shrink-0 text-[13px] font-semibold text-text-body">
                    {partLabel(t, p)}
                  </Text>
                  <Input className="flex-1">
                    <InputField
                      value={parts[p] ?? ""}
                      onChangeText={(v) =>
                        setParts((pr) => ({ ...pr, [p]: v }))
                      }
                      keyboardType="numeric"
                      placeholder="--"
                    />
                  </Input>
                </HStack>
              ))}
            </VStack>
            {formError ? (
              <Box className="mb-4 rounded border-l-4 border-l-danger bg-danger-surface p-3">
                <Text className="text-sm font-medium text-danger-text">
                  {formError}
                </Text>
              </Box>
            ) : null}
            <HStack space="sm" className="mt-2">
              <Host matchContents>
                <Button
                  label={t("common.actions.cancel")}
                  variant="outlined"
                  onPress={closeForm}
                />
              </Host>
              <Host matchContents>
                <Button
                  label={saveLabel}
                  onPress={handleSave}
                  disabled={isPending}
                />
              </Host>
            </HStack>
          </ScrollView>
        </ModalContent>
      </Modal>
      <AlertDialog
        isOpen={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Text className="text-lg font-bold text-text">
              {t("body_measurement.delete.title")}
            </Text>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-sm text-text-secondary">
              {t("body_measurement.delete.description_generic")}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Host matchContents>
              <Button
                label={t("body_measurement.delete.cancel")}
                variant="outlined"
                onPress={() => setPendingDelete(null)}
              />
            </Host>
            <Host matchContents>
              <Button
                label={t("body_measurement.delete.confirm")}
                style={{ backgroundColor: "#dc2626" }}
                onPress={confirmDelete}
              />
            </Host>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
