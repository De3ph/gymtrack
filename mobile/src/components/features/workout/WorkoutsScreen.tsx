import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ListRenderItemInfo,
  Alert
} from "react-native"
import { useRouter, type Href } from "expo-router"
import { useI18n } from "@/lib/i18n"
import { workoutApi } from "@/api/workoutApi"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Workout, WorkoutListResponse } from "@/types"
import { ExercisePicker } from "./ExercisePicker"

interface NewSet {
  id: string
  reps: string
  weight: string
}

interface NewExercise {
  id: string
  name: string
  notes: string
  sets: NewSet[]
}

let exerciseCounter = 0
let setCounter = 0

function nextExerciseId(): string {
  exerciseCounter += 1
  return "ex-" + String(exerciseCounter)
}

function nextSetId(): string {
  setCounter += 1
  return "set-" + String(setCounter)
}

function createEmptySet(): NewSet {
  return { id: nextSetId(), reps: "", weight: "" }
}

function createEmptyExercise(): NewExercise {
  return {
    id: nextExerciseId(),
    name: "",
    notes: "",
    sets: [createEmptySet()]
  }
}

function todayString(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return yyyy + "-" + mm + "-" + dd
}

/** Returns true if the item was created within the last 24 hours */
function canEdit(createdAt?: string): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  return now - created < 24 * 60 * 60 * 1000
}

/** Convert a Workout's exercises to the editable NewExercise[] shape */
function workoutToExercises(workout: Workout): NewExercise[] {
  return (workout.exercises ?? []).map((ex) => ({
    id: nextExerciseId(),
    name: ex.name ?? "",
    notes: ex.notes ?? "",
    sets: (ex.sets ?? []).map((s) => ({
      id: nextSetId(),
      reps: String(s.reps ?? ""),
      weight: String(s.weight ?? "")
    }))
  }))
}

interface WorkoutCardProps {
  workout: Workout
  editable: boolean
  onOpen: (workout: Workout) => void
  onEdit: (workout: Workout) => void
  onDelete: (workout: Workout) => void
}

function WorkoutCard({
  workout,
  editable,
  onOpen,
  onEdit,
  onDelete
}: WorkoutCardProps) {
  const { t } = useI18n()
  const exerciseCount = workout.exercises?.length ?? 0
  const totalSets =
    workout.exercises?.reduce((acc, ex) => acc + (ex.sets?.length ?? 0), 0) ?? 0

  const formattedDate = new Date(workout.date).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  })

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onOpen(workout)}
      activeOpacity={0.85}
    >
      <Text style={styles.cardDate}>{formattedDate}</Text>
      <View style={styles.cardStats}>
        <Text style={styles.cardStat}>
          {String(exerciseCount) + " " + t("workout.list.exercises")}
        </Text>
        <Text style={styles.cardStatDivider}>|</Text>
        <Text style={styles.cardStat}>{String(totalSets) + " sets"}</Text>
      </View>
      {editable && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => onEdit(workout)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardActionEdit}>
              {t("common.actions.edit")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => onDelete(workout)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardActionDelete}>
              {t("common.actions.delete")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )
}

export function WorkoutsScreen() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const router = useRouter()

  const openDetail = useCallback((w: Workout) => {
    if (w.workoutId == null) return
    router.push(("/workouts/" + String(w.workoutId)) as Href)
  }, [router])

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useQuery<WorkoutListResponse>({
      queryKey: ["workouts", "list"],
      queryFn: () => workoutApi.getAll() as Promise<WorkoutListResponse>
    })

  const workouts: Workout[] = data?.workouts ?? []

  // --- modal state (shared for create & edit) ---
  const [modalVisible, setModalVisible] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [newDate, setNewDate] = useState(todayString)
  const [newExercises, setNewExercises] = useState<NewExercise[]>([
    createEmptyExercise()
  ])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [pickingForExId, setPickingForExId] = useState<string | null>(null)

  const openPickerFor = (exId: string) => {
    setPickingForExId(exId)
    setPickerVisible(true)
  }

  const handleExerciseSelect = (exercise: { name: string; exerciseId: number; category?: string }) => {
    if (pickingForExId) {
      updateExerciseName(pickingForExId, exercise.name)
      if (exercise.category) {
        updateExerciseNotes(pickingForExId, `Category: ${exercise.category}`)
      }
    }
  }

  // --- create mutation ---
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => workoutApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "list"] })
      closeModalAndReset()
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("common.errors.generic"))
    }
  })

  // --- update mutation ---
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      workoutApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "list"] })
      closeModalAndReset()
    },
    onError: (err: Error) => {
      setSubmitError(err.message || t("common.errors.generic"))
    }
  })

  // --- delete mutation ---
  const deleteMutation = useMutation({
    mutationFn: (id: number) => workoutApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "list"] })
    },
    onError: (err: Error) => {
      Alert.alert(t("common.errors.generic"), err.message)
    }
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  // --- open create modal ---
  const openCreateModal = useCallback(() => {
    setEditingWorkout(null)
    setNewDate(todayString())
    setNewExercises([createEmptyExercise()])
    setSubmitError(null)
    setModalVisible(true)
  }, [])

  // --- open edit modal ---
  const openEditModal = useCallback((workout: Workout) => {
    setEditingWorkout(workout)
    setNewDate(workout.date)
    setNewExercises(workoutToExercises(workout))
    setSubmitError(null)
    setModalVisible(true)
  }, [])

  // --- handle delete ---
  const handleDelete = useCallback(
    (workout: Workout) => {
      const id = workout.workoutId
      if (id == null) return
      Alert.alert(
        t("workout.delete_dialog.title"),
        t("workout.delete_dialog.description"),
        [
          { text: t("workout.delete_dialog.cancel"), style: "cancel" },
          {
            text: t("workout.delete_dialog.confirm"),
            style: "destructive",
            onPress: () => deleteMutation.mutate(id)
          }
        ]
      )
    },
    [t, deleteMutation]
  )

  const closeModalAndReset = useCallback(() => {
    setModalVisible(false)
    setEditingWorkout(null)
    setNewDate(todayString())
    setNewExercises([createEmptyExercise()])
    setSubmitError(null)
  }, [])

  const updateExerciseName = (exId: string, name: string) => {
    setNewExercises((prev) =>
      prev.map((ex) => (ex.id === exId ? { ...ex, name } : ex))
    )
  }

  const updateExerciseNotes = (exId: string, notes: string) => {
    setNewExercises((prev) =>
      prev.map((ex) => (ex.id === exId ? { ...ex, notes } : ex))
    )
  }

  const addExercise = () => {
    setNewExercises((prev) => [...prev, createEmptyExercise()])
  }

  const removeExercise = (exId: string) => {
    setNewExercises((prev) => prev.filter((ex) => ex.id !== exId))
  }

  const addSet = (exId: string) => {
    setNewExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId ? { ...ex, sets: [...ex.sets, createEmptySet()] } : ex
      )
    )
  }

  const removeSet = (exId: string, setId: string) => {
    setNewExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
          : ex
      )
    )
  }

  const updateSetReps = (exId: string, setId: string, reps: string) => {
    setNewExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, reps } : s))
            }
          : ex
      )
    )
  }

  const updateSetWeight = (exId: string, setId: string, weight: string) => {
    setNewExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, weight } : s))
            }
          : ex
      )
    )
  }

  const handleSubmit = () => {
    setSubmitError(null)

    if (!newDate.trim()) {
      setSubmitError(t("workout.form.validation.date_required"))
      return
    }

    const validExercises = newExercises.filter((ex) => ex.name.trim() !== "")
    if (validExercises.length === 0) {
      setSubmitError(t("workout.form.validation.exercises_min_one"))
      return
    }

    for (const ex of validExercises) {
      if (ex.sets.length === 0) {
        setSubmitError(t("workout.form.validation.sets_min_one"))
        return
      }
      for (const s of ex.sets) {
        if (!s.reps.trim() || isNaN(Number(s.reps)) || Number(s.reps) < 1) {
          setSubmitError(t("workout.form.validation.reps_min_one"))
          return
        }
        if (
          s.weight.trim() &&
          (isNaN(Number(s.weight)) || Number(s.weight) < 0)
        ) {
          setSubmitError(t("workout.form.validation.weight_non_negative"))
          return
        }
      }
    }

    const payload: Record<string, unknown> = {
      date: newDate,
      exercises: validExercises.map((ex) => ({
        exerciseId: 0,
        name: ex.name.trim(),
        notes: ex.notes.trim() || undefined,
        sets: ex.sets.map((s) => ({
          weight: s.weight.trim() ? Number(s.weight) : 0,
          weightUnit: "kg",
          reps: Number(s.reps)
        }))
      }))
    }

    if (editingWorkout?.workoutId != null) {
      updateMutation.mutate({ id: editingWorkout.workoutId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Workout>) => (
      <WorkoutCard
        workout={item}
        editable={canEdit(item.createdAt)}
        onOpen={openDetail}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />
    ),
    [openDetail, openEditModal, handleDelete]
  )

  const keyExtractor = useCallback(
    (item: Workout) => String(item.workoutId ?? item.date),
    []
  )

  const setNumberLabel = t("workout.form.exercise.sets.set_number")

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size='large' color='#2563eb' />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    )
  }

  if (isError && workouts.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {(error as Error)?.message || t("common.errors.generic")}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>
            {t("common.actions.submit")}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  const modalTitle = editingWorkout
    ? t("workout.edit_dialog.title")
    : t("workout.form.title")
  const submitLabel = editingWorkout
    ? t("workout.edit_dialog.save_changes")
    : t("workout.form.submit")

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          workouts.length === 0 ? styles.emptyListContent : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>{"\u{1F3CB}"}</Text>
            <Text style={styles.emptyText}>
              {t("workout.list.no_workouts")}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={openCreateModal}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={closeModalAndReset}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps='handled'
          >
            <Text style={styles.modalTitle}>{modalTitle}</Text>

            <Text style={styles.fieldLabel}>
              {t("workout.form.date.label")}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                editingWorkout && styles.textInputDisabled
              ]}
              value={newDate}
              onChangeText={setNewDate}
              placeholder='YYYY-MM-DD'
              placeholderTextColor='#9ca3af'
              autoCapitalize='none'
              editable={!editingWorkout}
            />

            {newExercises.map((ex, exIdx) => (
              <View key={ex.id} style={styles.exerciseBlock}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseTitle}>
                    {t("workout.form.exercise.name.label") +
                      " " +
                      String(exIdx + 1)}
                  </Text>
                  {newExercises.length > 1 && (
                    <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                      <Text style={styles.removeLink}>
                        {t("common.actions.remove")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.nameRow}>
                  <TextInput
                    style={[styles.textInput, styles.nameInput]}
                    value={ex.name}
                    onChangeText={(v) => updateExerciseName(ex.id, v)}
                    placeholder={t("workout.form.exercise.name.label")}
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity
                    style={styles.browseButton}
                    onPress={() => openPickerFor(ex.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.browseText}>Browse</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  value={ex.notes}
                  onChangeText={(v) => updateExerciseNotes(ex.id, v)}
                  placeholder={t("workout.form.exercise.notes")}
                  placeholderTextColor='#9ca3af'
                  multiline
                />

                <Text style={styles.setsLabel}>
                  {t("workout.form.exercise.sets.label")}
                </Text>
                {ex.sets.map((s, sIdx) => (
                  <View key={s.id} style={styles.setRow}>
                    <Text style={styles.setNumber}>
                      {setNumberLabel.replace("{number}", String(sIdx + 1))}
                    </Text>
                    <TextInput
                      style={[styles.textInput, styles.setInput]}
                      value={s.weight}
                      onChangeText={(v) => updateSetWeight(ex.id, s.id, v)}
                      placeholder={t("workout.form.exercise.sets.weight")}
                      placeholderTextColor='#9ca3af'
                      keyboardType='numeric'
                    />
                    <TextInput
                      style={[styles.textInput, styles.setInput]}
                      value={s.reps}
                      onChangeText={(v) => updateSetReps(ex.id, s.id, v)}
                      placeholder={t("workout.form.exercise.sets.reps")}
                      placeholderTextColor='#9ca3af'
                      keyboardType='numeric'
                    />
                    {ex.sets.length > 1 && (
                      <TouchableOpacity onPress={() => removeSet(ex.id, s.id)}>
                        <Text style={styles.removeLink}>X</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addSetButton}
                  onPress={() => addSet(ex.id)}
                >
                  <Text style={styles.addSetButtonText}>
                    + {t("workout.form.exercise.sets.label")}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={addExercise}
            >
              <Text style={styles.addExerciseButtonText}>
                + {t("workout.form.add_exercise")}
              </Text>
            </TouchableOpacity>

            {submitError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModalAndReset}
                disabled={isPending}
              >
                <Text style={styles.cancelButtonText}>
                  {t("common.actions.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isPending && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isPending}
              >
                <Text style={styles.submitButtonText}>
                  {isPending ? t("workout.form.submitting") : submitLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleExerciseSelect}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f9fafb"
  },
  loadingText: { marginTop: 12, fontSize: 15, color: "#6b7280" },
  errorText: {
    fontSize: 15,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  listContent: { padding: 16, paddingBottom: 100 },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2
  },
  cardDate: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6
  },
  cardStats: { flexDirection: "row", alignItems: "center" },
  cardStat: { fontSize: 14, color: "#6b7280" },
  cardStatDivider: { fontSize: 14, color: "#d1d5db", marginHorizontal: 8 },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6"
  },
  cardActionButton: { paddingVertical: 4, paddingHorizontal: 8 },
  cardActionEdit: { fontSize: 14, fontWeight: "600", color: "#2563eb" },
  cardActionDelete: { fontSize: 14, fontWeight: "600", color: "#ef4444" },

  emptyCard: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: "#6b7280", textAlign: "center" },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6
  },
  fabText: { fontSize: 28, color: "#fff", lineHeight: 30 },

  modalOverlay: { flex: 1, backgroundColor: "#f9fafb" },
  modalScroll: { flex: 1 },
  modalContent: { padding: 20, paddingBottom: 40 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
    marginTop: 12
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fff",
    marginBottom: 8
  },
  textInputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af"
  },
  notesInput: { minHeight: 60, textAlignVertical: "top" },

  exerciseBlock: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    backgroundColor: "#fff"
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  exerciseTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  removeLink: { fontSize: 14, color: "#ef4444", fontWeight: "500" },
  nameRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  nameInput: { flex: 1 },
  browseButton: {
    backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 8,
  },
  browseText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  setsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
    marginBottom: 6
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4
  },
  setNumber: {
    fontSize: 13,
    color: "#6b7280",
    width: 40
  },
  setInput: { flex: 1, marginBottom: 0 },
  addSetButton: {
    paddingVertical: 8,
    marginTop: 4
  },
  addSetButtonText: { fontSize: 14, color: "#2563eb", fontWeight: "500" },

  addExerciseButton: {
    borderWidth: 1,
    borderColor: "#2563eb",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16
  },
  addExerciseButtonText: {
    fontSize: 15,
    color: "#2563eb",
    fontWeight: "600"
  },

  errorBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginTop: 16
  },
  errorBannerText: { fontSize: 14, color: "#ef4444" },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db"
  },
  cancelButtonText: { fontSize: 15, color: "#6b7280", fontWeight: "600" },
  submitButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 15, color: "#fff", fontWeight: "600" }
})