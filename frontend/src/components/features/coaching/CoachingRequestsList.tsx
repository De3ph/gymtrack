"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { coachingRequestApi } from "@/lib/api";
import { CoachingRequestWithDetails } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, MessageCircle } from "lucide-react";

interface CoachingRequestsListProps {
  userType: "trainer" | "athlete";
}

export function CoachingRequestsList({ userType }: CoachingRequestsListProps) {
  const [requests, setRequests] = useState<CoachingRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await coachingRequestApi.getMyRequests();
      setRequests(response.requests);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await coachingRequestApi.acceptRequest(requestId);
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await coachingRequestApi.rejectRequest(requestId);
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reject request");
    } finally {
      setActionLoading(null);
    }
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Loading coaching requests...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            {userType === "trainer"
              ? "No pending coaching requests"
              : "No coaching requests sent"}
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
                    ? `Request from ${request.athlete?.profile?.name || request.athlete?.email}`
                    : `Request to ${request.trainer?.profile?.name || request.trainer?.email}`}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">
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
                  <MessageCircle className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-sm">Message:</span>
                </div>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">
                  {request.message}
                </p>
              </div>
            )}

            {userType === "trainer" && request.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAccept(request.requestId)}
                  disabled={actionLoading === request.requestId}
                  className="flex-1"
                >
                  {actionLoading === request.requestId
                    ? "Accepting..."
                    : "Accept"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(request.requestId)}
                  disabled={actionLoading === request.requestId}
                  className="flex-1"
                >
                  {actionLoading === request.requestId
                    ? "Rejecting..."
                    : "Reject"}
                </Button>
              </div>
            )}

            {userType === "athlete" && request.status === "accepted" && (
              <div className="text-green-600 bg-green-50 p-3 rounded">
                <strong>🎉 Request Accepted!</strong> You can now start working
                with your trainer.
              </div>
            )}

            {userType === "athlete" && request.status === "rejected" && (
              <div className="text-red-600 bg-red-50 p-3 rounded">
                This request was declined by the trainer. You can try sending a
                new request or look for other trainers.
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
