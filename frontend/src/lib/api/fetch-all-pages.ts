/**
 * Walks a `limit`/`offset` + `count` endpoint until every row is collected.
 *
 * Chart views need the complete history, not a single capped batch, and the
 * backend caps nothing — it just returns whatever `limit` asks for. The loop
 * stops as soon as the server's total is reached or a page comes back empty,
 * so a stale `count` cannot spin forever.
 */
export async function fetchAllPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<{ items: T[]; count: number }>,
  pageSize: number,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;

  for (;;) {
    const page = await fetchPage(offset, pageSize);
    all.push(...page.items);

    if (page.items.length === 0 || all.length >= page.count) {
      return all;
    }
    offset += page.items.length;
  }
}
