import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommentThread } from '@/components/features/comments/CommentThread'
import { commentApi } from '@/lib/api'
import type { Comment } from '@/types'

// Mock API
vi.mock('@/lib/api', () => ({
  commentApi: {
    getByTarget: vi.fn(),
    create: vi.fn(),
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
    content: 'Root comment',
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
    content: 'Reply',
    parentCommentId: 'c1',
    createdAt: new Date('2024-01-01T10:05:00Z').toISOString(),
    editedAt: null,
  },
]

describe('CommentThread', () => {
  let queryClient: QueryClient
  const mockGet = vi.mocked(commentApi.getByTarget)
  const mockCreate = vi.mocked(commentApi.create)

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    mockGet.mockResolvedValue({ comments: mockComments })
  })

  const renderWithProvider = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)

  it('shows loading spinner while fetching', async () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    renderWithProvider(<CommentThread targetType="workout" targetId="w1" />)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders comments after fetch', async () => {
    renderWithProvider(<CommentThread targetType="workout" targetId="w1" />)
    await waitFor(() => {
      expect(screen.getByText(/root comment/i)).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    renderWithProvider(<CommentThread targetType="workout" targetId="w1" />)
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  it('displays comment count in header', async () => {
    renderWithProvider(<CommentThread targetType="workout" targetId="w1" />)
    await waitFor(() => {
      expect(screen.getByText(/comments \(2\)/i)).toBeInTheDocument()
    })
  })

  it('hides form when readOnly=true', async () => {
    renderWithProvider(<CommentThread targetType="workout" targetId="w1" readOnly />)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /comment/i })).toBeNull()
    })
  })
})