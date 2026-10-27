import { getBlockValue } from "notion-utils";

/**
 * Notion record-map entries have shipped in two shapes:
 * - legacy: `{ role, value: payload }`
 * - current: `{ spaceId, value: { role, value: payload } }`
 *
 * `getBlockValue` walks `.value` until it finds an object with an id, which
 * covers blocks, collections, and views. Payloads that never have an id
 * (collection reducers, for example) fall through to the same wrapper walk.
 */
export function unwrapRecord<T>(record: unknown): T | undefined {
  if (!record || typeof record !== "object") return undefined;

  const viaHelper = getBlockValue(record as Parameters<typeof getBlockValue>[0]);
  if (viaHelper) return viaHelper as unknown as T;

  let current: unknown = record;
  for (let depth = 0; depth < 4; depth++) {
    if (!current || typeof current !== "object") return undefined;
    const wrapper = current as { value?: unknown };
    const keys = Object.keys(wrapper);
    const isWrapper =
      wrapper.value != null &&
      typeof wrapper.value === "object" &&
      keys.every((key) => key === "value" || key === "role" || key === "spaceId");
    if (!isWrapper) break;
    current = wrapper.value;
  }

  if (!current || typeof current !== "object") return undefined;
  if (
    "id" in current ||
    "schema" in current ||
    "type" in current ||
    "blockIds" in current ||
    "properties" in current
  ) {
    return current as T;
  }
  return undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/**
 * Page ids for one collection-query result.
 * Returns an array (possibly empty) when the result is a recognized query
 * shape, and undefined when the value isn't a query result at all.
 */
export function blockIdsFromQueryResult(query: unknown): string[] | undefined {
  const record = asObject(query);
  if (!record) return undefined;

  const grouped = asObject(record.collection_group_results);
  if (grouped && Array.isArray(grouped.blockIds)) {
    return grouped.blockIds.filter((id): id is string => typeof id === "string");
  }

  if (Array.isArray(record.blockIds)) {
    return record.blockIds.filter((id): id is string => typeof id === "string");
  }

  const collected: string[] = [];
  let found = false;
  for (const value of Object.values(record)) {
    const entry = asObject(value);
    if (entry && Array.isArray(entry.blockIds)) {
      found = true;
      collected.push(
        ...entry.blockIds.filter((id): id is string => typeof id === "string"),
      );
    }
  }
  return found ? collected : undefined;
}

type CollectionQueryMap = {
  collection_query?: Record<string, Record<string, unknown> | undefined>;
};

type CollectionViewSort = {
  page_sort?: readonly string[];
  page_sort_idx?: readonly string[];
};

/**
 * Prefer live `queryCollection` reducer results. `page_sort` / `page_sort_idx`
 * are only a fallback: Notion keeps stale ids there (this database's default
 * view currently lists 164 sort entries for 9 rows).
 * An empty reducer result is authoritative and does not fall through.
 */
export function getCollectionPageIds(
  recordMap: CollectionQueryMap,
  collectionId: string,
  collectionView: CollectionViewSort | undefined,
): string[] {
  const queries = recordMap.collection_query?.[collectionId];
  if (queries) {
    let best: string[] | undefined;
    for (const query of Object.values(queries)) {
      const ids = blockIdsFromQueryResult(query);
      if (!ids) continue;
      if (!best || ids.length > best.length) best = ids;
    }
    if (best) return best;
  }

  if (Array.isArray(collectionView?.page_sort_idx)) {
    return [...collectionView.page_sort_idx];
  }
  if (Array.isArray(collectionView?.page_sort)) {
    return [...collectionView.page_sort];
  }
  return [];
}
