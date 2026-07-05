import { CreateCommentRequest, UpdateCommentRequest } from "@/types"
import api from "./api-client"
import { CommentListResponse, MessageResponse } from "./api-types"
import { Comment } from "@/types"

export const commentApi = {
  getByTarget: async (
    targetType: "workout" | "meal",
    targetId: string | number
  ) => {
    return api.get<CommentListResponse>("/comments", {
      params: { targetType, targetId }
    })
  },

  create: async (data: CreateCommentRequest) => {
    return api.post<Comment>("/comments", data)
  },

  update: async (id: string | number, data: UpdateCommentRequest) => {
    return api.put<Comment>(`/comments/${id}`, data)
  },

  delete: async (id: string | number) => {
    return api.delete<MessageResponse>(`/comments/${id}`)
  }
}
