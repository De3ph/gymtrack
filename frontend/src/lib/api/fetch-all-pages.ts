/**
 * Walks a `limit`/`offset` + `count` endpoint until every row is collected.
 *
 * Chart views need the complete history, not a single capped batch, and the
 * backend caps nothing — it just returns whatever `limit` asks for.
 *
 * The first page establishes the total, then every remaining offset is fetched
 * in parallel. The previous serial loop paid one full round-trip per page
 * (10 sequential requests for a 365-row chart against a backend that ignores
 * the requested limit), which dominated chart load time. The stride comes from
 * the number of rows actually returned, not the requested `limit`, so a page
 * size the server silently reduced still walks the history correctly.
 */
export async function fetchAllPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<{ items: T[]; count: number }>,
  pageSize: number,
): Promise<T[]> {
  const first = await fetchPage(0, pageSize);

  // Empty history, or the first page already covered the whole total.
  if (first.items.length === 0 || first.items.length >= first.count) {
    return first.items;
  }

  const stride = first.items.length;
  const offsets: number[] = [];
  for (let offset = stride; offset < first.count; offset += stride) {
    offsets.push(offset);
  }

  const rest = await Promise.all(
    offsets.map((offset) => fetchPage(offset, pageSize)),
  );

  return [first.items, ...rest.map((page) => page.items)].flat();
}
