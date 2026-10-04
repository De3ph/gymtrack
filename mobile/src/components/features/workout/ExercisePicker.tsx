import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Button, Host } from "@expo/ui";
import { exerciseApi } from "@/api/exerciseApi";
import { useI18n } from "@/lib/i18n";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
} from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import {
  Icon,
  AlertCircleIcon,
  ChevronRightIcon,
  CloseCircleIcon,
  CloseIcon,
  SearchIcon,
} from "@/components/ui/icon";

interface Exercise {
  exerciseId: number;
  name: string;
  category?: string;
  muscleGroupId?: number;
  equipmentId?: number;
  instructions?: string;
}

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

const EMPTY_LIST: Exercise[] = [];

const RowSeparator = React.memo(function RowSeparator() {
  return <Box className="h-px bg-border" />;
});

interface ExerciseRowProps {
  item: Exercise;
  onPress: (item: Exercise) => void;
}

const ExerciseRow = React.memo(function ExerciseRow({ item, onPress }: ExerciseRowProps) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={item.category ? `${item.name}, ${item.category}` : item.name}
      className="flex-row items-center justify-between py-3.5 active:bg-surface-subtle"
    >
      <Box className="flex-1">
        <Text className="text-[15px] font-medium text-text" numberOfLines={1}>
          {item.name}
        </Text>
        {item.category ? (
          <Text className="mt-0.5 text-xs capitalize text-text-tertiary" numberOfLines={1}>
            {item.category}
          </Text>
        ) : null}
      </Box>
      <Icon as={ChevronRightIcon} className="ml-3 shrink-0 text-text-tertiary" size="sm" />
    </Pressable>
  );
});

function ListLoading() {
  const { t } = useI18n();
  return (
    <Box className="items-center justify-center py-16">
      <Spinner size="large" className="text-primary" />
      <Text className="mt-4 text-sm text-text-secondary">{t("exercise.selector.loading")}</Text>
    </Box>
  );
}

function ListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <Box className="items-center justify-center px-6 py-16">
      <Icon as={AlertCircleIcon} className="text-danger" size="lg" />
      <Text className="mt-3 text-center text-[15px] font-medium text-text">
        {t("exercise.selector.load_failed")}
      </Text>
      <Text className="mt-1 text-center text-[13px] text-text-secondary">
        {t("exercise.selector.connection_hint")}
      </Text>
      <Box className="mt-5">
        <Host matchContents>
          <Button label={t("common.actions.retry")} onPress={onRetry} />
        </Host>
      </Box>
    </Box>
  );
}

function ListEmpty({ searching }: { searching: boolean }) {
  const { t } = useI18n();
  return (
    <Box className="items-center justify-center px-6 py-16">
      <Text className="text-center text-[15px] font-medium text-text">
        {searching ? t("exercise.selector.no_matching") : t("exercise.selector.no_exercises")}
      </Text>
      <Text className="mt-1 text-center text-[13px] text-text-secondary">
        {searching
          ? t("exercise.selector.no_matching_hint")
          : t("exercise.selector.no_exercises_hint")}
      </Text>
    </Box>
  );
}

export function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => exerciseApi.getAll() as Promise<Exercise[]>,
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });

  const handleClose = useCallback(() => {
    setSearch("");
    onClose();
  }, [onClose]);

  const exercises = useMemo<Exercise[]>(
    () => (Array.isArray(data) ? data : EMPTY_LIST),
    [data]
  );

  const searchIndex = useMemo(
    () =>
      exercises.map((ex) =>
        ex.category
          ? `${ex.name.toLowerCase()} ${ex.category.toLowerCase()}`
          : ex.name.toLowerCase()
      ),
    [exercises]
  );

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((_, i) => searchIndex[i].includes(q));
  }, [exercises, searchIndex, deferredSearch]);

  const handleItemPress = useCallback(
    (item: Exercise) => {
      onSelect(item);
      handleClose();
    },
    [onSelect, handleClose]
  );

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => <ExerciseRow item={item} onPress={handleItemPress} />,
    [handleItemPress]
  );

  const keyExtractor = useCallback((item: Exercise) => String(item.exerciseId), []);

  const clearSearch = useCallback(() => setSearch(""), []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const isSearching = search.trim().length > 0;

  const listEmpty = useMemo(() => {
    if (isLoading) return <ListLoading />;
    if (isError) return <ListError onRetry={handleRetry} />;
    return <ListEmpty searching={isSearching} />;
  }, [isLoading, isError, isSearching, handleRetry]);

  return (
    <Modal isOpen={visible} onClose={handleClose} size="md">
      <ModalBackdrop />
      <ModalContent className="h-[85%] bg-background p-0">
        <ModalHeader className="flex-row items-start justify-between border-b border-border px-4 pb-3 pt-4">
          <Box className="flex-1 pr-3">
            <Text className="text-[17px] font-bold text-text">
              {t("exercise.selector.catalog_title")}
            </Text>
            <Text className="mt-0.5 text-[13px] text-text-secondary">
              {t("exercise.selector.description")}
            </Text>
          </Box>
          <ModalCloseButton>
            <Icon as={CloseIcon} className="text-text-secondary" size="md" />
          </ModalCloseButton>
        </ModalHeader>

        <Box className="px-4 pb-2 pt-3">
          <Input>
            <InputSlot>
              <InputIcon as={SearchIcon} />
            </InputSlot>
            <InputField
              value={search}
              onChangeText={setSearch}
              placeholder={t("exercise.selector.search_placeholder")}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {isSearching ? (
              <InputSlot>
                <Pressable
                  onPress={clearSearch}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.actions.clear")}
                >
                  <Icon as={CloseCircleIcon} className="text-text-tertiary" size="sm" />
                </Pressable>
              </InputSlot>
            ) : null}
          </Input>
        </Box>

        {/* Plain flex container, not ModalBody (a ScrollView): FlashList needs
            a bounded height from its parent to scroll. */}
        <Box className="min-h-0 flex-1 px-4 pb-4">
          <FlashList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={RowSeparator}
            ListEmptyComponent={listEmpty}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        </Box>
      </ModalContent>
    </Modal>
  );
}
