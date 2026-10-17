import { describe, it, expect } from 'vitest'
import {
  COMMENT_MAX_LENGTH,
  validateCommentContent,
} from '@/lib/validations/comment'

describe('validateCommentContent', () => {
  it('accepts ordinary content', () => {
    expect(validateCommentContent('Nice workout!')).toBeUndefined()
  })

  it('rejects blank content', () => {
    expect(validateCommentContent('')).toBe('empty')
    expect(validateCommentContent('   ')).toBe('empty')
    expect(validateCommentContent('\n\t ')).toBe('empty')
  })

  it('accepts content at the backend limit', () => {
    expect(validateCommentContent('a'.repeat(COMMENT_MAX_LENGTH))).toBeUndefined()
  })

  it('rejects content past the backend limit', () => {
    expect(validateCommentContent('a'.repeat(COMMENT_MAX_LENGTH + 1))).toBe('too_long')
  })

  it('uses the limit the backend enforces (max=2000)', () => {
    // models.Comment.Content has validate:"required,min=1,max=2000"
    expect(COMMENT_MAX_LENGTH).toBe(2000)
  })
})