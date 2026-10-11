import { describe, it, expect } from 'vitest'
import { createTestTranslator, formatMessage } from './i18n'

describe('test i18n translator', () => {
  it('resolves a key to real copy instead of the raw key', () => {
    const t = createTestTranslator('auth.login')

    expect(t('submit')).toBe('Login')
    expect(t('email.label')).toBe('Email or Username')
  })

  it('interpolates simple placeholders', () => {
    const t = createTestTranslator('exercise.library')

    expect(t('media_label', { name: 'Bench Press' })).toBe('Demonstration of Bench Press')
  })

  it('selects the matching plural branch', () => {
    const t = createTestTranslator('workout.pagination')

    expect(t('count', { count: 0 })).toBe('No workouts')
    expect(t('count', { count: 1 })).toBe('1 workout')
    expect(t('count', { count: 7 })).toBe('7 workouts')
  })

  it('substitutes # inside a plural branch', () => {
    const t = createTestTranslator('athlete.measurements.latest')

    expect(t('parts_count', { count: 4 })).toBe('4 parts tracked')
    expect(t('parts_count', { count: 0 })).toBe('No parts tracked')
  })

  it('scopes keys to the namespace', () => {
    expect(createTestTranslator('comment.form')('reply')).toBe('Reply')
    expect(createTestTranslator(['exercise', 'library'])('clear_filters')).toBe('Clear Filters')
  })

  it('falls back to the full key path when a message is missing', () => {
    const t = createTestTranslator('auth.login')

    expect(t('does.not.exist')).toBe('auth.login.does.not.exist')
  })

  describe('formatMessage', () => {
    it('handles select', () => {
      expect(
        formatMessage('{gender, select, female {She} male {He} other {They}} replied', {
          gender: 'female',
        }),
      ).toBe('She replied')

      expect(
        formatMessage('{gender, select, female {She} male {He} other {They}} replied', {
          gender: 'other',
        }),
      ).toBe('They replied')
    })

    it('leaves an unmatched placeholder empty rather than printing undefined', () => {
      expect(formatMessage('Hello {name}', {})).toBe('Hello ')
      expect(formatMessage('Hello {name}')).toBe('Hello ')
    })

    it('does not treat a stray brace as an argument', () => {
      expect(formatMessage('a { b')).toBe('a { b')
    })
  })
})
