import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ExerciseDetailClient } from '@/app/[locale]/(dashboard)/exercises/[id]/_components/ExerciseDetailClient'
import type { ExerciseLibrary } from '@/types'

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

const exercise: ExerciseLibrary = {
  exerciseId: 7,
  name: 'Bench Press',
  category: 'strength',
  muscleGroupId: 1,
  equipmentId: 1,
  instructions: 'Lie on a flat bench.\nPress the bar up.',
  createdAt: '2026-01-01T00:00:00Z',
}

/**
 * The page renders a react-query consumer (the "add to plan" dialog fetches the
 * user's plans), so every render needs a client provider.
 */
function renderDetail(
  props: Partial<React.ComponentProps<typeof ExerciseDetailClient>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ExerciseDetailClient exercise={exercise} role="trainer" {...props} />
    </QueryClientProvider>,
  )
}

/**
 * Base UI's Button renders a native <button> and warns when `render` is given a
 * non-button element. "Back to the library" is navigation, so it must be a real
 * anchor - these assertions pin both halves of that: an <a href> that works
 * without JS, and no Base UI button wrapper around it.
 */
describe('ExerciseDetailClient', () => {
  it('renders back as a real anchor, not a button element', () => {
    renderDetail()

    const back = screen.getByRole('link', { name: /back/i })
    expect(back.tagName).toBe('A')
    expect(back).toHaveAttribute('href', '/exercises')
  })

  it('applies button styling to the anchor without a Base UI button wrapper', () => {
    renderDetail()

    const back = screen.getByRole('link', { name: /back/i })
    // buttonVariants supplies the visual treatment; the class is the proof the
    // anchor is still styled like the rest of the app's buttons.
    expect(back.className).toContain('inline-flex')
    // A Base UI button wrapper would stamp data-slot="button" onto the element
    // and wrap the anchor in it.
    expect(back.closest('[data-slot="button"]')).toBeNull()
  })

  it('shows the exercise name and its instructions', () => {
    renderDetail()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bench Press' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('offers the add-to-plan action to a trainer', () => {
    renderDetail({ role: 'trainer' })

    expect(
      screen.getByRole('button', { name: /add to plan/i }),
    ).toBeInTheDocument()
  })

  // Admins cannot own workout plans - the backend rejects plan creation and
  // updates for them - so the action would only ever fail for them.
  it('hides the add-to-plan action from an admin', () => {
    renderDetail({ role: 'admin' })

    expect(
      screen.queryByRole('button', { name: /add to plan/i }),
    ).not.toBeInTheDocument()
  })

  describe('demonstration section', () => {
    // Regression: the page rendered an unlabelled image in one column and a
    // "Demonstration — a demonstration is available above" text block in the
    // other. That block described the image instead of being the video/GIF
    // section, and it pointed upward at something with no heading of its own.
    it('renders the media inside a labelled Demonstration section', () => {
      renderDetail({
        exercise: {
          ...exercise,
          mediaUrl: 'https://example.com/bench.gif',
          mediaType: 'gif',
        },
      })

      const heading = screen.getByRole('heading', { name: 'Demonstration' })
      // The media has to live in the same section as its own heading, not
      // somewhere else on the page that the heading merely refers to.
      const section = heading.closest('section')!
      expect(section).not.toBeNull()
      expect(section.querySelector('img')).not.toBeNull()
    })

    it('no longer renders the "available above" pointer text', () => {
      renderDetail({
        exercise: {
          ...exercise,
          mediaUrl: 'https://example.com/bench.gif',
          mediaType: 'gif',
        },
      })

      expect(screen.queryByText('media_present')).toBeNull()
      expect(screen.queryByText('media_absent')).toBeNull()
    })

    // "No demonstration yet" is a normal catalog state (the migration leaves
    // unmapped movements with a NULL media_url), so it has to render as an
    // intentional placeholder rather than an empty section.
    it('shows the placeholder in place when there is no media', () => {
      renderDetail()

      expect(screen.getByTestId('exercise-media-placeholder')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Demonstration' })).toBeInTheDocument()
    })
  })
})
