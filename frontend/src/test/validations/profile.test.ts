import { describe, it, expect } from 'vitest'
import {
  PROFILE_RANGES,
  checkOptionalInt,
  parseOptionalInt,
} from '@/lib/validations/profile'

describe('parseOptionalInt', () => {
  const range = PROFILE_RANGES.age // 13..120

  it('parses a valid whole number', () => {
    expect(parseOptionalInt('25', range)).toEqual({ value: 25, error: null })
  })

  it('accepts the range boundaries', () => {
    expect(parseOptionalInt('13', range).value).toBe(13)
    expect(parseOptionalInt('120', range).value).toBe(120)
  })

  it('treats a blank value as "clear this field"', () => {
    // undefined is dropped by JSON.stringify, which is how a cleared value
    // reaches the Go handler as a zero value.
    expect(parseOptionalInt('', range)).toEqual({ value: undefined, error: null })
    expect(parseOptionalInt('   ', range)).toEqual({ value: undefined, error: null })
  })

  it('rejects values below the range', () => {
    expect(parseOptionalInt('12', range).error).toBe('out_of_range')
    expect(parseOptionalInt('0', range).error).toBe('out_of_range')
    expect(parseOptionalInt('-30', range).error).toBe('out_of_range')
  })

  it('rejects values above the range', () => {
    expect(parseOptionalInt('121', range).error).toBe('out_of_range')
  })

  it('rejects decimals - the backend stores these as int', () => {
    expect(parseOptionalInt('70.5', PROFILE_RANGES.weight).error).toBe('out_of_range')
    expect(parseOptionalInt('175.9', PROFILE_RANGES.height).error).toBe('out_of_range')
  })

  it('rejects non-numeric input', () => {
    expect(parseOptionalInt('abc', range).error).toBe('out_of_range')
    expect(parseOptionalInt('NaN', range).error).toBe('out_of_range')
  })
})

describe('checkOptionalInt', () => {
  it('returns the range as message params when invalid', () => {
    expect(checkOptionalInt('5', PROFILE_RANGES.weight)).toEqual({
      min: 20,
      max: 500,
    })
  })

  it('returns undefined when valid or blank', () => {
    expect(checkOptionalInt('70', PROFILE_RANGES.weight)).toBeUndefined()
    expect(checkOptionalInt('', PROFILE_RANGES.weight)).toBeUndefined()
  })

  it('agrees with parseOptionalInt on every verdict', () => {
    const samples = ['', ' ', '0', '19', '20', '70', '500', '501', '70.5', 'abc']
    for (const range of Object.values(PROFILE_RANGES)) {
      for (const sample of samples) {
        const invalid = checkOptionalInt(sample, range) !== undefined
        const errored = parseOptionalInt(sample, range).error !== null
        expect(invalid, `"${sample}" vs ${JSON.stringify(range)}`).toBe(errored)
      }
    }
  })
})