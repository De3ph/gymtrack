import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommentForm } from '@/components/features/comments/CommentForm'
import { commentApi } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  commentApi: {
    create: vi.fn(),
  },
}))

describe('CommentForm', () => {
  let queryClient: QueryClient
  let mockCreate: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    mockCreate = vi.mocked(commentApi.create)
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('renders form with textarea and submit button', () => {
    renderWithQueryClient(<CommentForm targetType="workout" targetId="w1" queryKey={['comments']} />)

    expect(screen.getByTestId('comment-content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Your comment' })).toBeInTheDocument()
  })

  it('renders with "Reply" button when parentCommentId provided', () => {
    renderWithQueryClient(
      <CommentForm
        targetType="workout"
        targetId="w1"
        parentCommentId="parent1"
        queryKey={['comments']}
      />
    )

    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument()
  })

  it('renders cancel button when onCancel provided', () => {
    const onCancel = vi.fn()
    renderWithQueryClient(
      <CommentForm
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        onCancel={onCancel}
      />
    )

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('submits valid comment data', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockCreate.mockResolvedValue({ commentId: 'c1' })

    renderWithQueryClient(
      <CommentForm
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        onSuccess={onSuccess}
      />
    )

    const textarea = screen.getByTestId('comment-content')
    await user.type(textarea, 'Great workout!')

    const submitButton = screen.getByRole('button', { name: 'Your comment' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        targetType: 'workout',
        targetId: 'w1',
        content: 'Great workout!',
        parentCommentId: undefined,
      })
    })
  })

  it('shows validation error for empty content', async () => {
    const user = userEvent.setup()
    mockCreate.mockResolvedValue({ commentId: 'c1' })

    renderWithQueryClient(
      <CommentForm
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )

    const submitButton = screen.getByRole('button', { name: 'Your comment' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/content is required/i)).toBeInTheDocument()
    })
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockCreate.mockResolvedValue({ commentId: 'c1' })

    renderWithQueryClient(
      <CommentForm
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        onSuccess={onSuccess}
      />
    )

    const textarea = screen.getByTestId('comment-content')
    await user.type(textarea, 'Test comment')

    const submitButton = screen.getByRole('button', { name: 'Your comment' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('calls onSuccess callback after submission', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockCreate.mockResolvedValue({ commentId: 'c1' })

    renderWithQueryClient(
      <CommentForm
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        onSuccess={onSuccess}
      />
    )

    const textarea = screen.getByTestId('comment-content')
    await user.type(textarea, 'Test comment')

    const submitButton = screen.getByRole('button', { name: 'Your comment' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('handles API error gracefully', async () => {
    const user = userEvent.setup()
    mockCreate.mockRejectedValue(new Error('Failed to create comment'))

    renderWithQueryClient(
      <CommentForm
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
      />
    )

    const textarea = screen.getByTestId('comment-content')
    await user.type(textarea, 'Test comment')

    const submitButton = screen.getByRole('button', { name: 'Your comment' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('comment-content')).toBeInTheDocument()
    })
  })

  it('uses custom placeholder when provided', () => {
    renderWithQueryClient(
      <CommentForm
        targetType="workout"
        targetId="w1"
        queryKey={['comments']}
        placeholder="Write your thoughts..."
      />
    )

    expect(screen.getByText('Write your thoughts...')).toBeInTheDocument()
  })
})
