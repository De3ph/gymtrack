"use client";

// import { useState } from "react"; // not needed
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { coachingRequestApi } from "@/lib/api";
import { CoachingRequestWithDetails } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface CoachingRequestsListProps {
  userType: "trainer" | "athlete";
}

export function CoachingRequestsList({ userType }: CoachingRequestsListProps) {
  const tList = useTranslations('coaching.list')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["coachingRequests", userType],
    queryFn: () => coachingRequestApi.getMyRequests(),
    staleTime: 5 * 60 * 1000,
  });
  const requests = data?.requests ?? [];

  const queryClient = useQueryClient();

  const { mutate: acceptMutate, isPending: acceptPending } = useMutation({
    mutationFn: (requestId: string) => coachingRequestApi.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachingRequests", userType] });
    },
    onError: (err: any) => {
      // handle error via toast or console; keeping simple
      console.error(err);
    },
  });

  const { mutate: rejectMutate, isPending: rejectPending } = useMutation({
    mutationFn: (requestId: string) => coachingRequestApi.rejectRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachingRequests", userType] });
    },
    onError: (err: any) => {
      console.error(err);
    },
  });

  const handleAccept = (requestId: string) => {
    acceptMutate(requestId);
  };

  const handleReject = (requestId: string) => {
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
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("MMM D, YYYY h:mm A");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {tList('loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error instanceof Error ? error.message : String(error)}</div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {userType === "trainer"
              ? tList('no_pending_requests')
              : tList('no_requests_sent')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.requestId}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  {userType === "trainer"
                    ? tList('request_from', { name: request.athlete?.profile?.name || request.athlete?.email })
                    : tList('request_to', { name: request.trainer?.profile?.name || request.trainer?.email })}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatDate(request.createdAt)}
                  </span>
                  {getStatusBadge(request.status)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {request.message && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{tList('message_label')}</span>
                </div>
                <p className="text-foreground bg-muted p-3 rounded">
                  {request.message}
                </p>
              </div>
            )}

            {userType === "trainer" && request.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAccept(request.requestId)}
                  disabled={acceptPending || rejectPending}
                  className="flex-1"
                >
                  {acceptPending ? tList('accepting') : tList('accept')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(request.requestId)}
                  disabled={acceptPending || rejectPending}
                  className="flex-1"
                >
                  {rejectPending ? tList('rejecting') : tList('reject')}
                </Button>
              </div>
            )}

            {userType === "athlete" && request.status === "accepted" && (
              <div className="text-green-600 bg-green-50 p-3 rounded">
                <strong>{tList('request_accepted')}</strong> {tList('accepted_description')}
              </div>
            )}

            {userType === "athlete" && request.status === "rejected" && (
              <div className="text-red-600 bg-red-50 p-3 rounded">
                {tList('rejected_description')}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
