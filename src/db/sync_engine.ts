import { db, type SyncOutboxRecord, registerDbMutationListener, type DbMutationAction } from './local_db';

export type SyncState = 'online_synced' | 'syncing' | 'offline' | 'error';

export interface SyncTelemetry {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt: Date | null;
  networkOnline: boolean;
  relativeTimeStr: string;
}

type SyncListener = (telemetry: SyncTelemetry) => void;
type DataChangeListener = (tableName: string, action: DbMutationAction, recordId: string) => void;

interface RealtimeBroadcastMessage {
  type: 'DB_MUTATION' | 'SYNC_FLUSHED';
  tableName?: string;
  action?: DbMutationAction;
  recordId?: string;
  syncedAt?: number;
  timestamp: number;
  senderTabId: string;
}

class RealTimeSyncEngine {
  private telemetryListeners: Set<SyncListener> = new Set();
  private dataListeners: Set<DataChangeListener> = new Set();
  private isSyncing = false;
  private lastSyncedAt: Date | null = new Date();
  private networkOnline = navigator.onLine;
  private autoSyncDebounceTimer: any = null;
  private relativeTimeInterval: any = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private tabId = `tab_${Math.random().toString(36).substring(2, 9)}`;

  constructor() {
    this.initBroadcastChannel();
    this.initNetworkListeners();
    this.initPeriodicHeartbeat();
    this.registerLocalDbHooks();
  }

  /**
   * Initialize cross-tab & cross-window real-time BroadcastChannel
   */
  private initBroadcastChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('sd_lonrong_realtime_sync');
        this.broadcastChannel.onmessage = (event: MessageEvent<RealtimeBroadcastMessage>) => {
          const msg = event.data;
          if (!msg || msg.senderTabId === this.tabId) return;

          if (msg.type === 'DB_MUTATION' && msg.tableName && msg.action && msg.recordId) {
            console.log(`[RealTimeSync] Cross-tab real-time event received: ${msg.tableName} (${msg.action})`);
            this.notifyDataSubscribers(msg.tableName, msg.action, msg.recordId, false);
            this.emitTelemetry();
          } else if (msg.type === 'SYNC_FLUSHED' && msg.syncedAt) {
            this.lastSyncedAt = new Date(msg.syncedAt);
            this.emitTelemetry();
          }
        };
      }
    } catch (e) {
      console.warn('[RealTimeSync] BroadcastChannel not supported in this environment:', e);
    }
  }

  /**
   * Hook into local IndexedDB mutations automatically
   */
  private registerLocalDbHooks() {
    registerDbMutationListener((tableName, action, recordId, payload) => {
      this.onRecordMutated(tableName, action, recordId, payload);
    });
  }

  /**
   * Monitor online/offline network connectivity
   */
  private initNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[RealTimeSync] Network status: ONLINE. Flushing pending mutations...');
      this.networkOnline = true;
      this.emitTelemetry();
      this.flushOutbox();
    });

    window.addEventListener('offline', () => {
      console.warn('[RealTimeSync] Network status: OFFLINE. Queuing local-first changes.');
      this.networkOnline = false;
      this.emitTelemetry();
    });
  }

  /**
   * Regular heartbeat to refresh relative sync timestamps and check pending outbox
   */
  private initPeriodicHeartbeat() {
    this.relativeTimeInterval = setInterval(() => {
      this.emitTelemetry();
    }, 5000);

    // Periodic check every 30 seconds for any missed items
    setInterval(() => {
      if (this.networkOnline && !this.isSyncing) {
        this.flushOutbox();
      }
    }, 30000);
  }

  /**
   * Subscribe to sync state and telemetry changes
   */
  public subscribe(listener: SyncListener) {
    this.telemetryListeners.add(listener);
    this.emitTelemetry();
    return () => this.telemetryListeners.delete(listener);
  }

  /**
   * Subscribe to real-time data modifications across all modules
   */
  public onDataChange(listener: DataChangeListener) {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  private notifyDataSubscribers(
    tableName: string,
    action: DbMutationAction,
    recordId: string,
    broadcastToOtherTabs: boolean = true
  ) {
    // 1. Notify programmatic subscribers
    for (const listener of this.dataListeners) {
      try {
        listener(tableName, action, recordId);
      } catch (err) {
        console.error('[RealTimeSync] Error in data listener:', err);
      }
    }

    // 2. Dispatch global DOM CustomEvent for decoupled components
    window.dispatchEvent(
      new CustomEvent('lonrong:data-changed', {
        detail: { tableName, action, recordId },
      })
    );

    // 3. Broadcast to other open browser tabs/windows
    if (broadcastToOtherTabs && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'DB_MUTATION',
          tableName,
          action,
          recordId,
          timestamp: Date.now(),
          senderTabId: this.tabId,
        });
      } catch (err) {
        console.warn('[RealTimeSync] Broadcast error:', err);
      }
    }
  }

  /**
   * Calculate human-readable relative time (e.g. "baru saja", "10 dtk lalu")
   */
  private getRelativeTimeStr(): string {
    if (!this.lastSyncedAt) return 'Belum pernah';
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.lastSyncedAt.getTime()) / 1000));

    if (elapsedSeconds < 4) return 'baru saja';
    if (elapsedSeconds < 60) return `${elapsedSeconds} dtk lalu`;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes < 60) return `${elapsedMinutes} mnt lalu`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    return `${elapsedHours} jam lalu`;
  }

  private async emitTelemetry() {
    const pendingCount = await db.syncOutbox.where('status').equals('pending').count();
    let state: SyncState = 'online_synced';

    if (!this.networkOnline) {
      state = 'offline';
    } else if (this.isSyncing) {
      state = 'syncing';
    } else if (pendingCount > 0) {
      state = 'syncing';
    }

    const telemetry: SyncTelemetry = {
      state,
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      networkOnline: this.networkOnline,
      relativeTimeStr: this.getRelativeTimeStr(),
    };

    for (const listener of this.telemetryListeners) {
      listener(telemetry);
    }
  }

  /**
   * Automatic mutation handler invoked by database hooks
   */
  public async onRecordMutated(
    tableName: string,
    action: DbMutationAction,
    recordId: string,
    payload: unknown
  ) {
    console.log(`[RealTimeSync] Automatic sync triggered by ${tableName}.${action} (${recordId})`);

    // 1. Immediately notify local subscribers and other tabs in real-time
    this.notifyDataSubscribers(tableName, action, recordId, true);

    // 2. Queue mutation into local outbox
    await this.queueMutation(tableName, recordId, action, payload);

    // 3. Debounce automatic background synchronization (300ms)
    if (this.autoSyncDebounceTimer) {
      clearTimeout(this.autoSyncDebounceTimer);
    }
    this.autoSyncDebounceTimer = setTimeout(() => {
      this.flushOutbox();
    }, 300);
  }

  /**
   * Queue a local mutation to be synchronized to the cloud
   */
  public async queueMutation(
    tableName: string,
    recordId: string,
    action: DbMutationAction,
    payload: unknown
  ) {
    try {
      const outboxItem: SyncOutboxRecord = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        tableName,
        recordId,
        action,
        payloadJson: JSON.stringify(payload || {}),
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      };

      await db.syncOutbox.add(outboxItem);
      this.emitTelemetry();
    } catch (err) {
      console.error('[RealTimeSync] Error queuing mutation:', err);
    }
  }

  /**
   * Process pending outbox mutations automatically
   */
  public async flushOutbox(): Promise<{ processed: number; errors: number }> {
    if (this.isSyncing || !this.networkOnline) {
      return { processed: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.emitTelemetry();

    try {
      const pendingItems = await db.syncOutbox
        .where('status')
        .equals('pending')
        .limit(30)
        .toArray();

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        this.lastSyncedAt = new Date();
        this.emitTelemetry();
        return { processed: 0, errors: 0 };
      }

      let processed = 0;
      let errors = 0;

      // Real-time edge sync simulation with minimal latency (50ms per item)
      for (const item of pendingItems) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Mark as synced locally
          await db.syncOutbox.update(item.id, {
            status: 'synced',
          });
          processed++;
        } catch (err) {
          errors++;
          await db.syncOutbox.update(item.id, {
            retryCount: item.retryCount + 1,
            status: item.retryCount > 4 ? 'failed' : 'pending',
          });
        }
      }

      this.isSyncing = false;
      this.lastSyncedAt = new Date();
      this.emitTelemetry();

      // Broadcast sync completion to other tabs
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'SYNC_FLUSHED',
            syncedAt: this.lastSyncedAt.getTime(),
            timestamp: Date.now(),
            senderTabId: this.tabId,
          });
        } catch (e) {
          // Ignored
        }
      }

      // If more items remain, immediately continue flushing
      const remainingCount = await db.syncOutbox.where('status').equals('pending').count();
      if (remainingCount > 0 && this.networkOnline) {
        setTimeout(() => this.flushOutbox(), 100);
      }

      return { processed, errors };
    } catch (err) {
      console.error('[RealTimeSync] Flush error:', err);
      this.isSyncing = false;
      this.emitTelemetry();
      return { processed: 0, errors: 1 };
    }
  }

  public async getPendingCount(): Promise<number> {
    return await db.syncOutbox.where('status').equals('pending').count();
  }
}

export const syncEngine = new RealTimeSyncEngine();
