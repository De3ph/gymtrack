import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ExerciseMediaPanel } from '@/components/features/exercise/ExerciseMediaPanel'
import { ExerciseInstructions } from '@/components/features/exercise/ExerciseInstructions'
import type { ExerciseLibrary } from '@/types'

const baseExercise: ExerciseLibrary = {
  exerciseId: 1,
  name: 'Bench Press',
  category: 'strength',
  muscleGroupId: 1,
  equipmentId: 1,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('ExerciseMediaPanel', () => {
  it('renders a placeholder when the exercise has no media', () => {
    render(<ExerciseMediaPanel exercise={baseExercise} />)

    expect(screen.getByTestId('exercise-media-placeholder')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders an image for a gif asset', () => {
    render(
      <ExerciseMediaPanel
        exercise={{
          ...baseExercise,
          mediaUrl: 'https://example.com/bench.gif',
          mediaType: 'gif',
        }}
      />,
    )

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/bench.gif')
    // The test setup mocks next-intl so a translation resolves to its key; what
    // matters here is that the alt text is generated from a label rather than
    // left empty, since an unlabelled image is invisible to a screen reader.
    expect(img.getAttribute('alt')).toBe('Demonstration of Bench Press')
  })

  it('renders a video element for a video asset', () => {
    const { container } = render(
      <ExerciseMediaPanel
        exercise={{
          ...baseExercise,
          mediaUrl: 'https://example.com/bench.mp4',
          mediaType: 'video',
        }}
      />,
    )

    const video = container.querySelector('video')
    expect(video).toHaveAttribute('src', 'https://example.com/bench.mp4')
    // muted/loop are DOM properties rather than reflected attributes, so they
    // are asserted on the element itself.
    expect((video as HTMLVideoElement).muted).toBe(true)
    expect(video).toHaveAttribute('loop')
    expect(video).not.toHaveAttribute('autoplay')
  })

  it('defaults to the gif renderer when mediaType is absent', () => {
    render(
      <ExerciseMediaPanel
        exercise={{ ...baseExercise, mediaUrl: 'https://example.com/bench.gif' }}
      />,
    )

    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})

describe('ExerciseInstructions', () => {
  it('renders a placeholder when there are no instructions', () => {
    render(<ExerciseInstructions />)

    expect(screen.getByText(/no instructions have been written/i)).toBeInTheDocument()
  })

  it('renders newline-separated instructions as numbered steps', () => {
    render(
      <ExerciseInstructions
        instructions={'Lie on a flat bench.\nGrip the bar shoulder width.\nPress the bar up.'}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Lie on a flat bench.')
    expect(items[2]).toHaveTextContent('Press the bar up.')
  })

  it('splits a single numbered blob into steps', () => {
    render(
      <ExerciseInstructions instructions="1. Lie down. 2. Press up. 3. Lock out." />,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders a single unnumbered instruction as prose, not a one-item list', () => {
    const { container } = render(
      <ExerciseInstructions instructions="Lie on a flat bench and press the bar up." />,
    )

    // One step is prose; an <ol> with a single item adds numbering with no
    // meaning behind it.
    expect(container.querySelector('ol')).toBeNull()
    expect(
      screen.getByText('Lie on a flat bench and press the bar up.'),
    ).toBeInTheDocument()
  })

  it('does not invent steps by splitting on sentences', () => {
    render(
      <ExerciseInstructions
        instructions={
          'Bend the knees. Keep the back flat.\nLower until the thigh touches the floor.'
        }
      />,
    )

    // Two authored lines, not three sentences.
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
