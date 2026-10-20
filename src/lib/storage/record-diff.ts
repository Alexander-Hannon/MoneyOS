/** Changes between two versions of a record list, keyed by `id`. */
export type RecordDiff<T extends { id: string }> = {
  upserts: T[];
  deletes: string[];
};

/**
 * Only records that were added or changed are upserted; ids that disappeared
 * are deleted. Unchanged records are never re-sent.
 */
export function diffRecords<T extends { id: string }>(prev: T[], next: T[]): RecordDiff<T> {
  const before = new Map(prev.map((r) => [r.id, JSON.stringify(r)]));
  const nextIds = new Set(next.map((r) => r.id));
  return {
    upserts: next.filter((r) => before.get(r.id) !== JSON.stringify(r)),
    deletes: prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id),
  };
}

export function isEmptyDiff(diff: RecordDiff<{ id: string }>): boolean {
  return diff.upserts.length === 0 && diff.deletes.length === 0;
}
