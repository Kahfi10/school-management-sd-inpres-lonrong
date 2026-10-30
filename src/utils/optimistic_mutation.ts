/**
 * Optimistic Mutation Engine with Micro-Rollback
 * Provides 0ms perception latency on mobile devices by immediately updating the UI state
 * before persisting to IndexedDB. If local storage fails or is constrained, rolls back
 * state automatically with an Apple HIG warning dialog.
 */

export interface OptimisticMutationOptions<TState> {
  applyOptimistic: () => void;
  persist: () => Promise<void>;
  rollback: (error: any) => void;
  onSuccess?: () => void;
}

export async function executeOptimisticMutation<TState>(
  options: OptimisticMutationOptions<TState>
): Promise<boolean> {
  // 1. Immediately apply optimistic UI mutation (0ms latency perception)
  try {
    options.applyOptimistic();
  } catch (renderErr) {
    console.error('[OptimisticMutation] Immediate UI render error:', renderErr);
  }

  // 2. Persist to Dexie IndexedDB in background micro-task
  try {
    await options.persist();
    if (options.onSuccess) {
      options.onSuccess();
    }
    return true;
  } catch (dbErr) {
    console.error('[OptimisticMutation] Persistence failed. Rolling back UI state:', dbErr);
    // 3. Rollback UI on failure
    try {
      options.rollback(dbErr);
    } catch (rollbackErr) {
      console.error('[OptimisticMutation] Rollback handler failed:', rollbackErr);
    }
    return false;
  }
}
