import { describe, it, expect } from 'vitest'
// Relative rather than aliased: vitest.config.ts only defines '@', and adding a
// second alias for one test would change shared config for everyone.
import en from '../../../../messages/en.json'
import tr from '../../../../messages/tr.json'
import {
  MUSCLE_GROUP_CODES,
  EQUIPMENT_CODES,
  normalizeCode,
} from '@/components/features/exercise/exercise-labels'

/**
 * Guards against translation keys silently reaching the UI.
 *
 * Component tests cannot catch a missing message: `next-intl` is mocked to
 * return the key's last segment, so `t('exercise.muscle_groups.shoulders')`
 * yields 'shoulders' whether or not the message exists. That is exactly how a
 * whole set of lookup labels once landed under the wrong namespace and shipped
 * as literal `exercise.equipment.barbell` strings on screen.
 *
 * These tests read the real message files instead, so a key that the resolver
 * can produce but the catalogues do not define is a failure here.
 */
const LOCALES = { en, tr } as const

function lookup(messages: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, segment) =>
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[segment]
          : undefined,
      messages,
    )
}

describe('exercise lookup translations', () => {
  const cases = [
    { namespace: 'exercise.muscle_groups', codes: MUSCLE_GROUP_CODES },
    { namespace: 'exercise.equipment', codes: EQUIPMENT_CODES },
  ] as const

  for (const [locale, messages] of Object.entries(LOCALES)) {
    describe(locale, () => {
      it.each(cases)(
        'defines every key under $namespace',
        ({ namespace, codes }) => {
          const missing = codes.filter(
            (code) =>
              typeof lookup(messages, `${namespace}.${code}`) !== 'string',
          )
          expect(missing).toEqual([])
        },
      )

      it('defines the fallback used when a code has no translation', () => {
        expect(typeof lookup(messages, 'exercise.library.unknown')).toBe('string')
      })

      it('does not orphan a lookup namespace under an unrelated parent', () => {
        // The regression: the labels were added to workout.form.exercise, which
        // renders fine and validates, but resolves nothing at runtime.
        expect(typeof lookup(messages, 'exercise.muscle_groups.chest')).toBe(
          'string',
        )
        expect(typeof lookup(messages, 'exercise.equipment.barbell')).toBe('string')
        expect(lookup(messages, 'workout.form.exercise.muscle_groups')).toBeUndefined()
        expect(
          lookup(messages, 'workout.form.exercise.equipment.barbell'),
        ).toBeUndefined()
      })

      it('keeps the pre-existing equipment/muscle_group UI labels intact', () => {
        // Adding code labels under exercise.equipment must not have displaced
        // the label keys the measurement and selector forms already use.
        expect(typeof lookup(messages, 'exercise.equipment.label')).toBe('string')
        expect(typeof lookup(messages, 'exercise.equipment.categories')).toBe('string')
        expect(typeof lookup(messages, 'exercise.muscle_group.label')).toBe('string')
      })
    })
  }

  it('translates every known code in both locales', () => {
    // Guards against a key present in en.json but absent from tr.json, which
    // key-parity checking can miss when a whole subtree is missing on one side.
    for (const code of MUSCLE_GROUP_CODES) {
      expect(
        typeof lookup(en as never, `exercise.muscle_groups.${code}`),
      ).toBe('string')
      expect(
        typeof lookup(tr as never, `exercise.muscle_groups.${code}`),
      ).toBe('string')
    }
    for (const code of EQUIPMENT_CODES) {
      expect(typeof lookup(en as never, `exercise.equipment.${code}`)).toBe('string')
      expect(typeof lookup(tr as never, `exercise.equipment.${code}`)).toBe('string')
    }
  })
})

describe('normalizeCode', () => {
  // Seed dumps are inconsistent about separators; an unfolded hyphen silently
  // drops half the catalog back to English.
  it.each([
    ['resistance-band', 'resistance_band'],
    ['Resistance-Band', 'resistance_band'],
    ['full-body', 'full_body'],
    ['SHOULDERS', 'shoulders'],
    ['  chest  ', 'chest'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeCode(input)).toBe(expected)
  })

  it('returns an empty string for a missing code', () => {
    expect(normalizeCode(undefined)).toBe('')
    expect(normalizeCode('')).toBe('')
  })
})