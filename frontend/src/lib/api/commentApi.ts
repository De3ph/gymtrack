import { CreateCommentRequest, UpdateCommentRequest } from "@/types"
import api from "./index"
import { CommentListResponse, MessageResponse } from "./api-types"
import { Comment } from "@/types"

export const commentApi = {
  getByTarget: async (
    targetType: "workout" | "meal",
    targetId: string
  ) => {
    return api.get<CommentListResponse>("/comments", {
      params: { targetType, targetId }
    })
  },

  create: async (data: CreateCommentRequest) => {
    return api.post<Comment>("/comments", data)
  },

  update: async (id: string, data: UpdateCommentRequest) => {
    return api.put<Comment>(`/comments/${id}`, data)
  },

  delete: async (id: string) => {
    return api.delete<MessageResponse>(`/comments/${id}`)
  }
}
