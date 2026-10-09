import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
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
 * Base UI's Button renders a native <button> and warns when `render` is given a
 * non-button element. "Back to the library" is navigation, so it must be a real
 * anchor - these assertions pin both halves of that: an <a href> that works
 * without JS, and no Base UI button wrapper in the tree.
 */
describe('ExerciseDetailClient', () => {
  it('renders back as a real anchor, not a button element', () => {
    render(<ExerciseDetailClient exercise={exercise} />)

    const back = screen.getByRole('link', { name: /back/i })
    expect(back.tagName).toBe('A')
    expect(back).toHaveAttribute('href', '/exercises')
  })

  it('applies button styling to the anchor without a Base UI button wrapper', () => {
    const { container } = render(<ExerciseDetailClient exercise={exercise} />)

    const back = screen.getByRole('link', { name: /back/i })
    // buttonVariants supplies the visual treatment; the class is the proof the
    // anchor is still styled like the rest of the app's buttons.
    expect(back.className).toContain('inline-flex')
    // A Base UI button wrapper would stamp data-slot="button" onto the element.
    expect(container.querySelector('[data-slot="button"]')).toBeNull()
  })

  it('shows the exercise name and its instructions', () => {
    render(<ExerciseDetailClient exercise={exercise} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bench Press' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})