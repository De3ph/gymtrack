"use client";

// import { useState } from "react"; // not needed
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/i18n/dayjs";
import { coachingRequestApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { STALE_TIMES } from "@/lib/api/api-constants";

interface CoachingRequestsListProps {
  userType: "trainer" | "athlete";
}

export function CoachingRequestsList({ userType }: CoachingRequestsListProps) {
  const tList = useTranslations('coaching.list')
  const { data, isLoading, error } = useQuery({
    queryKey: ["coachingRequests", userType],
    queryFn: () => coachingRequestApi.getMyRequests(),
    staleTime: STALE_TIMES.FIVE_MINUTES,
  });
  const requests = data?.requests ?? [];

  const queryClient = useQueryClient();

  const { mutate: acceptMutate, isPending: acceptPending } = useMutation({
    mutationFn: (requestId: number) => coachingRequestApi.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachingRequests", userType] });
    },
    onError: (err: unknown) => {
      // handle error via toast or console; keeping simple
      console.error(err);
    },
  });

  const { mutate: rejectMutate, isPending: rejectPending } = useMutation({
    mutationFn: (requestId: number) => coachingRequestApi.rejectRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachingRequests", userType] });
    },
    onError: (err: unknown) => {
      console.error(err);
    },
  });

  const handleAccept = (requestId: number) => {
    acceptMutate(requestId);
  };

  const handleReject = (requestId: number) => {
    rejectMutate(requestId);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      pending: "default",
      accepted: "secondary",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="h-auto rounded-none px-3 py-1.5">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-none border border-border">
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            {tList('loading')}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-none border border-border">
        <div className="p-6">
          <div className="text-center text-destructive">{error instanceof Error ? error.message : String(error)}</div>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-none border border-border">
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            {userType === "trainer"
              ? tList('no_pending_requests')
              : tList('no_requests_sent')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.requestId} className="rounded-none border border-border">
          <div className="flex justify-between items-start border-b border-border px-6 py-4">
            <div>
              <h3 className="text-base font-[500] text-foreground">
                {userType === "trainer"
                  ? tList('request_from', { name: request.athlete?.profile?.name || request.athlete?.email || "" })
                  : tList('request_to', { name: request.trainer?.profile?.name || request.trainer?.email || "" })}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">
                  {formatDate(request.createdAt, "MMM D, YYYY h:mm A")}
                </span>
                {getStatusBadge(request.status)}
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            {request.message && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-[500] text-sm text-foreground">{tList('message_label')}</span>
                </div>
                <p className="text-foreground bg-muted p-3 rounded-none">
                  {request.message}
                </p>
              </div>
            )}

            {userType === "trainer" && request.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAccept(request.requestId)}
                  disabled={acceptPending || rejectPending}
                  className="flex-1 rounded-none"
                >
                  {acceptPending ? tList('accepting') : tList('accept')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(request.requestId)}
                  disabled={acceptPending || rejectPending}
                  className="flex-1 rounded-none"
                >
                  {rejectPending ? tList('rejecting') : tList('reject')}
                </Button>
              </div>
            )}

            {userType === "athlete" && request.status === "accepted" && (
              <div className="rounded-none border border-accent bg-accent/10 p-3">
                <span className="font-[500] text-foreground">{tList('request_accepted')}</span> <span className="text-muted-foreground">{tList('accepted_description')}</span>
              </div>
            )}

            {userType === "athlete" && request.status === "rejected" && (
              <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-destructive text-sm">
                {tList('rejected_description')}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
