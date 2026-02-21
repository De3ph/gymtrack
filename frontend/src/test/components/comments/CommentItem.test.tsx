import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
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
  commentId: 'c1',
  targetType: 'workout',
  targetId: 'w1',
  authorId: 'u1',
  authorRole: 'trainer',
  content: 'Nice job',
  parentCommentId: null,
  createdAt: new Date().toISOString(),
  editedAt: null,
}

describe('CommentItem', () => {
  let queryClient: QueryClient
  let mockUpdate: any
  let mockDelete: any
  let mockAuth: any

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
    mockAuth.mockReturnValue({ user: { userId: 'u1' } })
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
    mockAuth.mockReturnValue({ user: { userId: 'u1' } })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('hides edit and delete buttons for other users', () => {
    mockAuth.mockReturnValue({ user: { userId: 'other' } })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
  })

  it('enters edit mode and shows textarea', async () => {
    mockAuth.mockReturnValue({ user: { userId: 'u1' } })
    mockUpdate.mockResolvedValue({ ...mockComment, content: 'Updated' })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    const textarea = screen.getByDisplayValue('Nice job')
    expect(textarea).toBeInTheDocument()
  })

  it('cancels edit mode', () => {
    mockAuth.mockReturnValue({ user: { userId: 'u1' } })
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByText(/Nice job/i)).toBeInTheDocument()
  })

  it('deletes comment after confirmation', async () => {
    mockAuth.mockReturnValue({ user: { userId: 'u1' } })
    mockDelete.mockResolvedValue({ message: 'Comment deleted' })
    vi.stubGlobal('confirm', () => true)
    renderWithProvider(
      <CommentItem
        comment={mockComment}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('c1')
    })
  })

  it('shows reply button when onReply provided and not a reply', () => {
    mockAuth.mockReturnValue({ user: { userId: 'u1' } })
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
    expect(onReply).toHaveBeenCalledWith('c1')
  })
})