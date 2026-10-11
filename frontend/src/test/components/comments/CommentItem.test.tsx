import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommentItem } from '@/components/features/comments/CommentItem'
import { commentApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { Comment } from '@/types'

// Mock comment API
vi.mock('@/lib/api', () => ({
  commentApi: {
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockComment: Comment = {
  type: 'comment',
  commentId: 1,
  targetType: 'workout',
  targetId: 1,
  authorId: 1,
  authorRole: 'trainer',
  content: 'Nice job',
  parentCommentId: undefined,
  createdAt: new Date().toISOString(),
  editedAt: undefined,
}

// `Comment.authorId` and `User.userId` are both numeric in the generated
// types. Ownership is `user.userId === comment.authorId`, so the fixtures and
// the mocked store have to agree on the type as well as the value.
const COMMENT_ID = mockComment.commentId
const AUTHOR_ID = mockComment.authorId
const OTHER_USER_ID = 999

describe('CommentItem', () => {
  let queryClient: QueryClient
  let mockUpdate: Mock
  let mockDelete: Mock
  let mockAuth: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    mockUpdate = vi.mocked(commentApi.update)
    mockDelete = vi.mocked(commentApi.delete)
    mockAuth = vi.mocked(useAuthStore)
  })

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders comment content and metadata', () => {
    mockAuth.mockReturnValue({ user: { userId: AUTHOR_ID } })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    expect(screen.getByText(/trainer/i)).toBeInTheDocument()
    expect(screen.getByText(/Nice job/i)).toBeInTheDocument()
  })

  it('shows edit and delete buttons only for own comments', () => {
    mockAuth.mockReturnValue({ user: { userId: AUTHOR_ID } })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('hides edit and delete buttons for other users', () => {
    mockAuth.mockReturnValue({ user: { userId: OTHER_USER_ID } })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('enters edit mode and shows textarea', async () => {
    mockAuth.mockReturnValue({ user: { userId: AUTHOR_ID } })
    mockUpdate.mockResolvedValue({ ...mockComment, content: 'Updated' })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const textarea = screen.getByDisplayValue('Nice job')
    expect(textarea).toBeInTheDocument()
  })

  it('cancels edit mode', () => {
    mockAuth.mockReturnValue({ user: { userId: AUTHOR_ID } })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByText(/Nice job/i)).toBeInTheDocument()
  })

  it('deletes comment after confirmation', async () => {
    mockAuth.mockReturnValue({ user: { userId: AUTHOR_ID } })
    mockDelete.mockResolvedValue({ message: 'Comment deleted' })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    // Deletion is confirmed through an AlertDialog, not window.confirm.
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(COMMENT_ID)
    })
  })

  it('does not delete when the confirmation is dismissed', async () => {
    mockAuth.mockReturnValue({ user: { userId: AUTHOR_ID } })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull()
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('shows reply button when onReply provided and not a reply', () => {
    mockAuth.mockReturnValue({ user: { userId: AUTHOR_ID } })
    const onReply = vi.fn()
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        onReply={onReply}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /reply/i }))
    expect(onReply).toHaveBeenCalledWith(COMMENT_ID)
  })
})
