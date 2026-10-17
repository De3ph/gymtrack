import { describe, it, expect, vi } from 'vitest'
import { fetchAllPages } from '@/lib/api/fetch-all-pages'

type Row = { id: number }

describe('fetchAllPages', () => {
  it('returns the first page untouched when it covers the total', async () => {
    const fetchPage = vi.fn(async () => ({ items: [{ id: 1 }, { id: 2 }], count: 2 }))

    await expect(fetchAllPages<Row>(fetchPage, 10)).resolves.toEqual([
      { id: 1 },
      { id: 2 },
    ])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('returns no items for an empty history', async () => {
    const fetchPage = vi.fn(async () => ({ items: [], count: 0 }))

    await expect(fetchAllPages<Row>(fetchPage, 10)).resolves.toEqual([])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('fetches remaining offsets in parallel and keeps API order', async () => {
    const total = 25
    const all = Array.from({ length: total }, (_, i) => ({ id: i }))

    const fetchPage = vi.fn(async (offset: number, limit: number) => ({
      items: all.slice(offset, offset + limit),
      count: total,
    }))

    const result = await fetchAllPages<Row>(fetchPage, 10)

    expect(result.map((r) => r.id)).toEqual(all.map((r) => r.id))
    expect(fetchPage.mock.calls.map(([offset]) => offset)).toEqual([0, 10, 20])
  })

  it('derives the stride from rows returned, not the requested limit', async () => {
    // Server silently caps a 365-row request to 10 rows per page.
    const total = 30
    const all = Array.from({ length: total }, (_, i) => ({ id: i }))
    const serverPageSize = 10

    const fetchPage = vi.fn(async (offset: number) => ({
      items: all.slice(offset, offset + serverPageSize),
      count: total,
    }))

    const result = await fetchAllPages<Row>(fetchPage, 365)

    expect(result).toHaveLength(total)
    expect(fetchPage.mock.calls.map(([offset]) => offset)).toEqual([0, 10, 20])
  })
})
