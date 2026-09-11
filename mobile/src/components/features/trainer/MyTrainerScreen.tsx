import { useState, useCallback } from "react";
import { ScrollView, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { relationshipApi } from "@/api/relationshipApi";
import { useRouter } from "expo-router";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, Host } from "@expo/ui";
import { Input, InputField } from "@/components/ui/input";
import { Badge, BadgeText } from "@/components/ui/badge";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";

export function MyTrainerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["myTrainer"],
    queryFn: () => relationshipApi.getMyTrainer(),
  });

  const { mutate: terminate, isPending: terminating } = useMutation({
    mutationFn: (id: number) => relationshipApi.terminateRelationship(id),
    onSuccess: () => router.back(),
  });

  const [inviteCode, setInviteCode] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);

  const { mutate: acceptInvite, isPending: accepting } = useMutation({
    mutationFn: (code: string) => relationshipApi.acceptInvitation(code),
    onSuccess: async () => {
      setInviteCode("");
      setShowSuccess(true);
      Alert.alert("Success", "Invitation accepted! You are now connected with your trainer.");
      await queryClient.invalidateQueries({ queryKey: ["myTrainer"] });
      setShowSuccess(false);
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to accept invitation");
    },
  });

  const handleAcceptInvite = useCallback(() => {
    if (inviteCode.trim()) {
      acceptInvite(inviteCode.trim());
    }
  }, [inviteCode, acceptInvite]);

  const handleTerminate = useCallback(() => {
    setShowTerminateDialog(true);
  }, []);

  const confirmTerminate = useCallback(() => {
    const trainer = (data as { trainer?: { relationshipId?: number } })?.trainer;
    if (trainer?.relationshipId) {
      terminate(trainer.relationshipId);
    }
    setShowTerminateDialog(false);
  }, [data, terminate]);

  if (isLoading || showSuccess)
    return (
      <Center className="flex-1 p-6">
        <Spinner />
      </Center>
    );
  if (isError || !data)
    return (
      <Center className="flex-1 p-6">
        <Text className="mb-3 text-base text-text-secondary">No trainer assigned yet</Text>
        <Box className="mb-4 w-full max-w-[320px] rounded-xl border border-border bg-card p-4">
          <Text className="mb-2.5 text-center text-sm font-semibold text-text-body">
            Have an invite code?
          </Text>
          <Box className="rounded-lg border border-dashed border-border-strong bg-surface-subtle p-3">
            <Input className="border-0 bg-transparent">
              <InputField
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="Enter 8-character code"
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!accepting}
                className="text-center text-lg font-bold tracking-[4px]"
              />
            </Input>
          </Box>
          <Host matchContents>
            <Button
              label="Accept Invitation"
              onPress={handleAcceptInvite}
              disabled={!inviteCode.trim() || accepting}
              style={{
                backgroundColor:
                  !inviteCode.trim() || accepting ? "#c4b5fd" : "#7c3aed",
              }}
            />
          </Host>
        </Box>
        <Host matchContents>
          <Button label="Retry" onPress={() => refetch()} />
        </Host>
      </Center>
    );

  const trainer = (data as { trainer?: { relationshipId?: number; username?: string; email?: string; profile?: { name?: string; bio?: string; specializations?: string } } })?.trainer;
  if (!trainer)
    return (
      <Center className="flex-1 p-6">
        <Text className="mb-3 text-base text-text-secondary">No trainer assigned</Text>
      </Center>
    );

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-6 pb-12">
      <Box className="mb-6 items-center">
        <Box className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Text className="text-[32px] font-extrabold text-primary-foreground">
            {(trainer.username ?? "?")[0].toUpperCase()}
          </Text>
        </Box>
        <Text className="mb-1.5 text-2xl font-bold text-text">
          {trainer.profile?.name || trainer.username}
        </Text>
        {trainer.profile?.bio ? (
          <Text className="text-center text-sm text-text-secondary">{trainer.profile.bio}</Text>
        ) : null}
      </Box>
      {trainer.profile?.specializations ? (
        <Box className="mb-4 rounded-xl bg-card p-4">
          <Text className="mb-2.5 text-sm font-bold uppercase tracking-[1px] text-text-secondary">
            Specializations
          </Text>
          <HStack space="xs" className="flex-wrap">
            {trainer.profile.specializations.split(",").map((s: string, i: number) => (
              <Badge key={i} className="rounded-lg bg-brand-surface px-2.5 py-1">
                <BadgeText className="text-xs font-semibold text-brand-on-light">
                  {s.trim()}
                </BadgeText>
              </Badge>
            ))}
          </HStack>
        </Box>
      ) : null}
      <VStack className="mt-2">
        <Host matchContents>
          <Button
            label={terminating ? "Terminating..." : "Terminate Relationship"}
            variant="outlined"
            onPress={handleTerminate}
            disabled={terminating}
          />
        </Host>
      </VStack>

      <AlertDialog isOpen={showTerminateDialog} onClose={() => setShowTerminateDialog(false)}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Text className="text-lg font-bold text-text">Terminate Relationship</Text>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-sm text-text-secondary">Are you sure?</Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Host matchContents>
              <Button
                label="Cancel"
                variant="outlined"
                onPress={() => setShowTerminateDialog(false)}
              />
            </Host>
            <Host matchContents>
              <Button
                label="Terminate"
                style={{ backgroundColor: "#dc2626" }}
                onPress={confirmTerminate}
                disabled={terminating}
              />
            </Host>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollView>
  );
}
