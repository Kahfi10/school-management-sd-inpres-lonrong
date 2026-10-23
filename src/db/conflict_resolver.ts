/**
 * Conflict Resolver: Field-Level 3-Way Delta Merger for Distributed Local-First Sync
 * Prevents offline teacher modifications from being overwritten by incoming cloud records.
 */

export interface MergeResult<T> {
  merged: T;
  conflictsResolved: number;
  hasLocalModifications: boolean;
}

/**
 * Merge an incoming remote record with the local record at the granular field level.
 * If local record has a pending outbox change on a specific field, that field is preserved.
 * Non-conflicting fields from remote are integrated automatically (CRDT-Lite Field Merge).
 */
export function mergeFieldLevel<T extends Record<string, any>>(
  localRecord: T | undefined,
  remoteRecord: T,
  pendingOutboxPayload?: Partial<T>
): MergeResult<T> {
  if (!localRecord) {
    return {
      merged: { ...remoteRecord },
      conflictsResolved: 0,
      hasLocalModifications: false,
    };
  }

  const merged = { ...localRecord, ...remoteRecord };
  let conflictsResolved = 0;
  let hasLocalModifications = false;

  if (pendingOutboxPayload && typeof pendingOutboxPayload === 'object') {
    for (const [key, pendingVal] of Object.entries(pendingOutboxPayload)) {
      if (pendingVal !== undefined && pendingVal !== null && key !== 'id') {
        if (remoteRecord[key] !== pendingVal) {
          (merged as any)[key] = pendingVal;
          conflictsResolved++;
          hasLocalModifications = true;
        }
      }
    }
  }

  // Deterministic timestamp resolution
  const localTime = new Date(localRecord.updatedAt || 0).getTime();
  const remoteTime = new Date(remoteRecord.updatedAt || 0).getTime();
  if (localTime > remoteTime) {
    merged.updatedAt = localRecord.updatedAt;
  }

  return { merged, conflictsResolved, hasLocalModifications };
}

/**
 * Batch resolves conflicts for a collection of incoming remote records.
 */
export async function resolveBatchWithLocal<T extends { id: string }>(
  incomingRecords: T[],
  getLocalRecordFn: (id: string) => Promise<T | undefined>,
  getPendingPayloadFn: (recordId: string) => Promise<Partial<T> | undefined>
): Promise<{ resolved: T[]; totalConflicts: number }> {
  const resolved: T[] = [];
  let totalConflicts = 0;

  for (const remote of incomingRecords) {
    const local = await getLocalRecordFn(remote.id);
    const pendingPayload = await getPendingPayloadFn(remote.id);
    const result = mergeFieldLevel(local, remote, pendingPayload);
    resolved.push(result.merged);
    totalConflicts += result.conflictsResolved;
  }

  return { resolved, totalConflicts };
}
