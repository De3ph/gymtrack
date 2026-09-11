import { useState, useCallback, useMemo } from "react";
import { ScrollView, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainerCatalogApi } from "@/api/trainerCatalogApi";
import { reviewApi } from "@/api/reviewApi";
import { coachingRequestApi } from "@/api/coachingRequestApi";
import { availabilityApi } from "@/api/availabilityApi";
import { useAuthStore } from "@/stores/authStore";
import { StarRatingInput } from "./StarRatingInput";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
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
import { Icon, StarIcon } from "@/components/ui/icon";

interface TrainerData {
  userId?: number;
  username?: string;
  profile?: { name?: string; bio?: string; certifications?: string; specializations?: string };
}

interface ReviewItem {
  reviewId?: number;
  rating?: number;
  comment?: string;
}

export function TrainerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [message, setMessage] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: trainer, isLoading, isError, refetch } = useQuery({
    queryKey: ["trainer", id],
    queryFn: () => trainerCatalogApi.getTrainerProfile(id!),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => reviewApi.getTrainerReviews(id!),
    enabled: !!id,
  });

  const { data: availData } = useQuery({
    queryKey: ["availability", id],
    queryFn: () => availabilityApi.getTrainerAvailability(id!),
    enabled: !!id,
  });

  const { mutate: sendRequestMutate, isPending: sending } = useMutation({
    mutationFn: (data: { trainerId: number; message?: string }) =>
      coachingRequestApi.createCoachingRequest(data),
    onSuccess: () => {
      Alert.alert("Request Sent");
      setShowRequestForm(false);
      setMessage("");
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const { mutate: submitReviewMutate, isPending: submittingReview } = useMutation({
    mutationFn: (data: { rating: number; comment?: string }) =>
      reviewApi.createReview(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
      Alert.alert("Review Submitted");
      setShowReviewForm(false);
      setRating(0);
      setReviewComment("");
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  if (isLoading)
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <Spinner size="large" />
      </Box>
    );
  if (isError || !trainer)
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <Text className="mb-3 text-[15px] text-danger">Failed to load trainer</Text>
        <Host matchContents>
          <Button label="Retry" onPress={() => refetch()} />
        </Host>
      </Box>
    );

  const tData = trainer as TrainerData;
  const reviews = ((reviewsData as { reviews?: ReviewItem[] })?.reviews ?? []) as ReviewItem[];

  const slots =
    availData?.slots?.map((slot) => ({
      dayOfWeek: String(slot.dayOfWeek),
      startTime: slot.startTime || "",
      endTime: slot.endTime || "",
    })) ?? [];

  const handleSendRequest = () => {
    if (!id) return;
    sendRequestMutate({ trainerId: Number(id), message: message.trim() || undefined });
  };

  const handleSubmitReview = () => {
    submitReviewMutate({ rating, comment: reviewComment.trim() || undefined });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-6 pb-12"
    >
      <Box className="mb-6 items-center">
        <Box className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Text className="text-[32px] font-extrabold text-primary-foreground">
            {(tData.username ?? "?")[0].toUpperCase()}
          </Text>
        </Box>
        <Text className="mb-1.5 text-2xl font-bold text-text">
          {tData.profile?.name || tData.username}
        </Text>
        {tData.profile?.bio ? (
          <Text className="text-center text-sm text-text-secondary">{tData.profile.bio}</Text>
        ) : null}
      </Box>

      {tData.profile?.specializations ? (
        <Box className="mb-4 rounded-xl bg-card p-4">
          <Text className="mb-2.5 text-sm font-bold uppercase tracking-[1px] text-text-secondary">
            Specializations
          </Text>
          <HStack space="xs" className="flex-wrap">
            {tData.profile.specializations.split(",").map((s, i) => (
              <Box key={i} className="rounded-lg bg-brand-surface px-2.5 py-1">
                <Text className="text-xs font-semibold text-brand-on-light">{s.trim()}</Text>
              </Box>
            ))}
          </HStack>
        </Box>
      ) : null}

      {slots.length > 0 ? (
        <Box className="mb-4 rounded-xl bg-card p-4">
          <Text className="mb-2.5 text-sm font-bold uppercase tracking-[1px] text-text-secondary">
            Availability
          </Text>
          {slots.map((slot, i) => (
            <Text key={i} className="py-[3px] text-sm text-text">
              {slot.dayOfWeek}: {slot.startTime} - {slot.endTime}
            </Text>
          ))}
        </Box>
      ) : null}

      {reviews.length > 0 ? (
        <Box className="mb-4 rounded-xl bg-card p-4">
          <Text className="mb-2.5 text-sm font-bold uppercase tracking-[1px] text-text-secondary">
            Reviews ({reviews.length})
          </Text>
          {reviews.map((r) => (
            <Box key={r.reviewId} className="border-b border-border py-2.5">
              <HStack space="xs" className="mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    as={StarIcon}
                    className={
                      star <= (r.rating ?? 0)
                        ? "text-warning"
                        : "text-neutral-300 dark:text-neutral-700"
                    }
                  />
                ))}
              </HStack>
              {r.comment ? (
                <Text className="text-sm text-text-body">{r.comment}</Text>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}

      {user?.role === "athlete" && (
        <Box className="mb-4 rounded-xl bg-card p-4">
          <Text className="mb-2.5 text-sm font-bold uppercase tracking-[1px] text-text-secondary">
            Write a Review
          </Text>
          {showReviewForm ? (
            <VStack space="md">
              <StarRatingInput value={rating} onChange={setRating} label="Your rating" />
              <FormControl>
                <Textarea>
                  <TextareaInput
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    placeholder="Add a comment (optional)..."
                  />
                </Textarea>
              </FormControl>
              <HStack space="sm">
                <Host matchContents>
                  <Button
                    label="Cancel"
                    variant="outlined"
                    onPress={() => {
                      if (!submittingReview) {
                        setShowReviewForm(false);
                        setRating(0);
                        setReviewComment("");
                      }
                    }}
                    disabled={submittingReview}
                  />
                </Host>
                <Host matchContents>
                  <Button
                    label="Submit Review"
                    onPress={handleSubmitReview}
                    disabled={!id || rating === 0 || submittingReview}
                  />
                </Host>
              </HStack>
            </VStack>
          ) : (
            <Host matchContents>
              <Button
                label="Rate This Trainer"
                onPress={() => setShowReviewForm(true)}
              />
            </Host>
          )}
        </Box>
      )}

      {user?.role === "athlete" && (
        <Box className="mt-2">
          {showRequestForm ? (
            <VStack space="md">
              <FormControl>
                <Textarea>
                  <TextareaInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Add a message (optional)..."
                  />
                </Textarea>
              </FormControl>
              <HStack space="sm">
                <Host matchContents>
                  <Button
                    label="Cancel"
                    variant="outlined"
                    onPress={() => {
                      if (!sending) {
                        setShowRequestForm(false);
                      }
                    }}
                    disabled={sending}
                  />
                </Host>
                <Host matchContents>
                  <Button
                    label="Send Request"
                    onPress={handleSendRequest}
                    disabled={sending}
                  />
                </Host>
              </HStack>
            </VStack>
          ) : (
            <Host matchContents>
              <Button
                label="Request Coaching"
                onPress={() => setShowRequestForm(true)}
              />
            </Host>
          )}
        </Box>
      )}
    </ScrollView>
  );
}
