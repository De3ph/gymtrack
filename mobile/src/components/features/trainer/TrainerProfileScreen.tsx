import { useState, useEffect, useCallback, useMemo } from "react";
import { ScrollView, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainerCatalogApi } from "@/api/trainerCatalogApi";
import { availabilityApi } from "@/api/availabilityApi";
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
import { Spinner } from "@/components/ui/spinner";
import { Icon, CloseCircleIcon } from "@/components/ui/icon";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const labelClassName =
  "text-xs font-bold uppercase tracking-[1px] text-text-secondary";

interface AvailabilitySlot {
  availabilityId?: number;
  trainerId?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function TrainerProfileScreen() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: loadingProfile, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ["trainerProfile"],
    queryFn: () => trainerCatalogApi.getMyProfile(),
  });

  const p = useMemo(() => {
    return (profile as { profile?: { name?: string; bio?: string; hourlyRate?: number; certifications?: string; specializations?: string } })?.profile;
  }, [profile]);

  const { data: availData, isLoading: loadingAvail, isError: availError, refetch: refetchAvail } = useQuery({
    queryKey: ["myAvailability"],
    queryFn: () => availabilityApi.getMyAvailability(),
  });

  const serverSlots = useMemo(() => {
    return (availData as { slots?: AvailabilitySlot[] })?.slots ?? [];
  }, [availData]);

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(p?.name ?? "");
  const [bio, setBio] = useState(p?.bio ?? "");
  const [hourlyRate, setHourlyRate] = useState(String(p?.hourlyRate ?? ""));

  // Keep local edits in sync with state
  useEffect(() => {
    setName(p?.name ?? "");
    setBio(p?.bio ?? "");
    setHourlyRate(String(p?.hourlyRate ?? ""));
  }, [p]);

  const [editingAvail, setEditingAvail] = useState(false);
  const [availSlots, setAvailSlots] = useState<AvailabilitySlot[]>([]);

  // Keep local availSlots in sync with server data when not actively editing
  useEffect(() => {
    if (!editingAvail) {
      const slots = (availData as { slots?: AvailabilitySlot[] })?.slots ?? [];
      setAvailSlots(slots.length > 0 ? slots.map((s) => ({ ...s })) : []);
    }
  }, [availData, editingAvail]);

  const startEditAvail = useCallback(() => {
    setAvailSlots(
      serverSlots.length > 0
        ? serverSlots.map((s) => ({ ...s }))
        : [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]
    );
    setEditingAvail(true);
  }, [serverSlots]);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: Record<string, unknown>) => trainerCatalogApi.updateTrainerProfile(data),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["trainerProfile"] });
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to save profile");
    },
  });

  const handleSaveProfile = useCallback(() => {
    setError("");
    const trimmedName = name.trim();
    const trimmedBio = bio.trim();

    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (trimmedBio.length > 500) {
      setError("Bio must be 500 characters or fewer");
      return;
    }
    if (hourlyRate.trim() !== "") {
      const rate = Number(hourlyRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        setError("Hourly rate must be a positive number");
        return;
      }
    }

    save({
      name: trimmedName,
      bio: trimmedBio,
      hourlyRate: hourlyRate.trim() !== "" ? Number(hourlyRate) : undefined,
    });
  }, [name, bio, hourlyRate, save]);

  const { mutate: saveAvail, isPending: savingAvail } = useMutation({
    mutationFn: (slots: { dayOfWeek: number; startTime: string; endTime: string }[]) =>
      availabilityApi.setMyAvailability(
        slots.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }))
      ),
    onSuccess: () => {
      setEditingAvail(false);
      queryClient.invalidateQueries({ queryKey: ["myAvailability"] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to save availability");
    },
  });

  const { mutate: deleteSlot } = useMutation({
    mutationFn: (slotId: number) => availabilityApi.deleteSlot(String(slotId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAvailability"] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to delete slot");
    },
  });

  const updateSlot = useCallback((index: number, field: string, value: string | number) => {
    setAvailSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }, []);

  const addSlot = useCallback(() => {
    setAvailSlots((prev) => [
      ...prev,
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
    ]);
  }, []);

  const removeSlot = useCallback(
    (index: number) => {
      const slot = availSlots[index];
      if (slot.availabilityId != null) {
        Alert.alert("Delete Slot", "Remove this availability slot?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteSlot(slot.availabilityId!),
          },
        ]);
      } else {
        setAvailSlots((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [availSlots, deleteSlot]
  );

  if (loadingProfile || loadingAvail)
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </Box>
    );

  if (profileError)
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <Text className="mb-3 text-[15px] text-danger">Failed to load trainer profile</Text>
        <Host matchContents>
          <Button label="Retry" onPress={() => refetchProfile()} />
        </Host>
      </Box>
    );

  if (availError)
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <Text className="mb-3 text-[15px] text-danger">Failed to load availability</Text>
        <Host matchContents>
          <Button label="Retry" onPress={() => refetchAvail()} />
        </Host>
      </Box>
    );

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-6 pb-12"
    >
      {error ? (
        <Box className="mb-4 rounded border-l-4 border-l-danger bg-danger-surface p-3">
          <Text className="text-sm font-medium text-danger-text">{error}</Text>
        </Box>
      ) : null}
      <Text className="mb-5 text-2xl font-bold text-text">Trainer Profile</Text>
      {editing ? (
        <VStack space="md">
          <FormControl>
            <FormControlLabel>
              <FormControlLabelText className={labelClassName}>
                Name
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField value={name} onChangeText={setName} editable={!saving} />
            </Input>
          </FormControl>
          <FormControl>
            <FormControlLabel>
              <FormControlLabelText className={labelClassName}>
                Bio
              </FormControlLabelText>
            </FormControlLabel>
            <Textarea>
              <TextareaInput value={bio} onChangeText={setBio} editable={!saving} />
            </Textarea>
          </FormControl>
          <FormControl>
            <FormControlLabel>
              <FormControlLabelText className={labelClassName}>
                Hourly Rate
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                value={hourlyRate}
                onChangeText={setHourlyRate}
                keyboardType="numeric"
                editable={!saving}
              />
            </Input>
          </FormControl>
          <HStack space="sm" className="mt-1">
            <Host matchContents>
              <Button
                label="Cancel"
                variant="outlined"
                onPress={() => {
                  setEditing(false);
                  setError("");
                }}
              />
            </Host>
            <Host matchContents>
              <Button
                label="Save"
                onPress={handleSaveProfile}
                disabled={saving}
              />
            </Host>
          </HStack>
        </VStack>
      ) : (
        <Box className="rounded-xl bg-card p-[18px]">
          <HStack className="justify-between border-b border-border py-2.5">
            <Text className="text-[13px] font-semibold text-text-secondary">Name</Text>
            <Text className="max-w-[60%] text-right text-sm font-medium text-text">
              {p?.name || "Not set"}
            </Text>
          </HStack>
          <HStack className="justify-between border-b border-border py-2.5">
            <Text className="text-[13px] font-semibold text-text-secondary">Bio</Text>
            <Text className="max-w-[60%] text-right text-sm font-medium text-text">
              {p?.bio || "Not set"}
            </Text>
          </HStack>
          <HStack className="justify-between border-b border-border py-2.5">
            <Text className="text-[13px] font-semibold text-text-secondary">Rate</Text>
            <Text className="max-w-[60%] text-right text-sm font-medium text-text">
              {p?.hourlyRate ? `${p.hourlyRate}/hr` : "Not set"}
            </Text>
          </HStack>
          <Host matchContents>
            <Button
              label="Edit Profile"
              variant="outlined"
              onPress={() => {
                setName(p?.name ?? "");
                setBio(p?.bio ?? "");
                setHourlyRate(String(p?.hourlyRate ?? ""));
                setError("");
                setEditing(true);
              }}
            />
          </Host>
        </Box>
      )}

      <Text className="mb-3 mt-7 text-xl font-bold text-text">Availability</Text>
      {editingAvail ? (
        <Box className="rounded-xl bg-card p-4">
          {availSlots.map((slot, i) => (
            <Box
              key={i}
              className="mb-3 rounded-[10px] border border-border bg-background p-3.5"
            >
              <HStack className="mb-2.5 items-center justify-between">
                <Text className={labelClassName}>Slot {i + 1}</Text>
                <Pressable onPress={() => removeSlot(i)}>
                  <Icon as={CloseCircleIcon} className="text-danger" size="md" />
                </Pressable>
              </HStack>
              <HStack space="xs" className="mb-2.5">
                {DAY_NAMES.map((d, di) => {
                  const active = slot.dayOfWeek === di;
                  return (
                    <Pressable
                      key={di}
                      onPress={() => updateSlot(i, "dayOfWeek", di)}
                      className={`flex-1 items-center rounded-md border py-2 ${
                        active ? "border-primary bg-primary" : "border-border-strong bg-card"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          active ? "text-primary-foreground" : "text-text-secondary"
                        }`}
                      >
                        {d}
                      </Text>
                    </Pressable>
                  );
                })}
              </HStack>
              <HStack space="sm" className="items-center">
                <Input className="flex-1">
                  <InputField
                    value={slot.startTime}
                    onChangeText={(v) => updateSlot(i, "startTime", v)}
                    placeholder="09:00"
                  />
                </Input>
                <Text className="text-[13px] font-medium text-text-secondary">to</Text>
                <Input className="flex-1">
                  <InputField
                    value={slot.endTime}
                    onChangeText={(v) => updateSlot(i, "endTime", v)}
                    placeholder="17:00"
                  />
                </Input>
              </HStack>
            </Box>
          ))}
          <Host matchContents>
            <Button label="Add Slot" variant="outlined" onPress={addSlot} />
          </Host>
          <HStack space="sm" className="mt-1">
            <Host matchContents>
              <Button
                label="Cancel"
                variant="outlined"
                onPress={() => setEditingAvail(false)}
              />
            </Host>
            <Host matchContents>
              <Button
                label="Save"
                onPress={() => saveAvail(availSlots)}
                disabled={savingAvail}
              />
            </Host>
          </HStack>
        </Box>
      ) : serverSlots.length > 0 ? (
        <Box className="rounded-xl bg-card p-[18px]">
          {serverSlots.map((slot) => (
            <HStack
              key={slot.availabilityId ?? slot.dayOfWeek}
              className="justify-between border-b border-border py-2.5"
            >
              <Text className="text-sm font-semibold text-primary">
                {DAY_NAMES[slot.dayOfWeek]}
              </Text>
              <Text className="text-[13px] text-text-secondary">
                {slot.startTime} – {slot.endTime}
              </Text>
            </HStack>
          ))}
          <Host matchContents>
            <Button
              label="Edit Availability"
              variant="outlined"
              onPress={startEditAvail}
            />
          </Host>
        </Box>
      ) : (
        <Box className="rounded-xl bg-card p-[18px]">
          <Text className="py-3 text-center text-sm text-text-tertiary">
            No availability set
          </Text>
          <Host matchContents>
            <Button
              label="Set Availability"
              variant="outlined"
              onPress={startEditAvail}
            />
          </Host>
        </Box>
      )}
    </ScrollView>
  );
}
