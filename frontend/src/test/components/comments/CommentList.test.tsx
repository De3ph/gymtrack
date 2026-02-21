import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommentList } from '@/components/features/comments/CommentList'
import { commentApi } from '@/lib/api'
import type { Comment } from '@/types'

// Mock API
vi.mock('@/lib/api', () => ({
  commentApi: {
    // Not used directly in CommentList
  },
}))

const mockComments: Comment[] = [
  {
    type: 'comment',
    commentId: 'c1',
    targetType: 'workout',
    targetId: 'w1',
    authorId: 'u1',
    authorRole: 'trainer',
    content: 'First comment',
    parentCommentId: null,
    createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
    editedAt: null,
  },
  {
    type: 'comment',
    commentId: 'c2',
    targetType: 'workout',
    targetId: 'w1',
    authorId: 'u2',
    authorRole: 'athlete',
    content: 'Reply to first',
    parentCommentId: 'c1',
    createdAt: new Date('2024-01-01T10:05:00Z').toISOString(),
    editedAt: null,
  },
  {
    type: 'comment',
    commentId: 'c3',
    targetType: 'workout',
    targetId: 'w1',
    authorId: 'u3',
    authorRole: 'athlete',
    content: 'Second root comment',
    parentCommentId: null,
    createdAt: new Date('2024-01-01T10:10:00Z').toISOString(),
    editedAt: null,
  },
]

describe('CommentList', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  const renderWithProvider = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)

  it('shows empty state when no comments', () => {
    renderWithProvider(
      <CommentList
        comments={[]}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        replyingToId={null}
        onStartReply={vi.fn()}
        onCancelReply={vi.fn()}
      />
    )
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument()
  })

  it('renders root comments and nested replies', () => {
    renderWithProvider(
      <CommentList
        comments={mockComments}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        replyingToId={null}
        onStartReply={vi.fn()}
        onCancelReply={vi.fn()}
      />
    )
    // Root comments
    expect(screen.getByText(/first comment/i)).toBeInTheDocument()
    expect(screen.getByText(/second root comment/i)).toBeInTheDocument()
    // Reply
    expect(screen.getByText(/reply to first/i)).toBeInTheDocument()
  })

  it('calls onStartReply with correct id when reply button clicked', () => {
    const onStartReply = vi.fn()
    renderWithProvider(
      <CommentList
        comments={mockComments}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        replyingToId={null}
        onStartReply={onStartReply}
        onCancelReply={vi.fn()}
      />
    )
    const replyBtn = screen.getAllByRole('button', { name: /reply/i })[0]
    fireEvent.click(replyBtn)
    expect(onStartReply).toHaveBeenCalledWith('c1')
  })

  it('renders reply form when replyingToId matches', () => {
    renderWithProvider(
      <CommentList
        comments={mockComments}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        replyingToId="c1"
        onStartReply={vi.fn()}
        onCancelReply={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument()
  })

  it('hides reply button when readOnly=true', () => {
    renderWithProvider(
      <CommentList
        comments={mockComments}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        replyingToId={null}
        onStartReply={vi.fn()}
        onCancelReply={vi.fn()}
        readOnly
      />
    )
    expect(screen.queryAllByRole('button', { name: /reply/i })).toHaveLength(0)
  })
})