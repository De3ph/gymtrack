import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommentList } from '@/components/features/comments/CommentList'
import type { Comment } from '@/types'

// Mock API
vi.mock('@/lib/api', () => ({
  commentApi: {
    // Not used directly in CommentList
  },
}))

// `Comment.commentId` is typed optional, so the id is pinned here rather than
// read off the fixture. The string form this file used to assert ("c1") never
// matched the numeric ids the component actually passes.
const FIRST_COMMENT_ID = 1

const mockComments: Comment[] = [
  {
    type: 'comment',
    commentId: 1,
    targetType: 'workout',
    targetId: 1,
    authorId: 1,
    authorRole: 'trainer',
    content: 'First comment',
    parentCommentId: undefined,
    createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
    editedAt: undefined,
  },
  {
    type: 'comment',
    commentId: 2,
    targetType: 'workout',
    targetId: 1,
    authorId: 2,
    authorRole: 'athlete',
    content: 'Reply to first',
    parentCommentId: 1,
    createdAt: new Date('2024-01-01T10:05:00Z').toISOString(),
    editedAt: undefined,
  },
  {
    type: 'comment',
    commentId: 3,
    targetType: 'workout',
    targetId: 1,
    authorId: 3,
    authorRole: 'athlete',
    content: 'Second root comment',
    parentCommentId: undefined,
    createdAt: new Date('2024-01-01T10:10:00Z').toISOString(),
    editedAt: undefined,
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
    // `Comment.commentId` is numeric, so the handler receives the id, not a slug.
    expect(onStartReply).toHaveBeenCalledWith(FIRST_COMMENT_ID)
  })

  it('renders reply form when replyingToId matches', () => {
    renderWithProvider(
      <CommentList
        comments={mockComments}
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        replyingToId={FIRST_COMMENT_ID}
        onStartReply={vi.fn()}
        onCancelReply={vi.fn()}
      />
    )
    expect(screen.getByText(/write a reply/i)).toBeInTheDocument()
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
