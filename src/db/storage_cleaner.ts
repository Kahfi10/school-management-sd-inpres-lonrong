import { db } from './local_db';

export interface StorageQuotaStats {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  blobRecordCount: number;
  isStoragePressure: boolean;
}

export interface GarbageCollectionResult {
  totalBlobsScanned: number;
  orphanedBlobsPurged: number;
  estimatedBytesFreed: number;
  durationMs: number;
}

/**
 * Storage Cleaner: Autonomous Garbage Collector for Media Blobs & Signatures.
 * Eliminates orphaned Base64 blobs when guestbook or document records are deleted,
 * preserving precious browser IndexedDB quota on teacher mobile devices.
 */
export class StorageCleaner {
  /**
   * Scan and collect active blob IDs referenced across all tables
   */
  public async getActiveBlobIds(): Promise<Set<string>> {
    const activeIds = new Set<string>();

    try {
      // 1. Scan Buku Tamu signatures
      const tamuList = await db.bukuTamu.toArray();
      for (const t of tamuList) {
        if (t.tandaTanganBlobId) activeIds.add(t.tandaTanganBlobId);
      }

      // 2. Scan Arsip Digital if referenced
      const arsipList = await db.arsipDigital.toArray();
      for (const a of arsipList) {
        if ((a as any).blobId) activeIds.add((a as any).blobId);
      }
    } catch (err) {
      console.warn('[StorageCleaner] Error reading active records:', err);
    }

    return activeIds;
  }

  /**
   * Run garbage collection to purge all unreferenced media blobs
   */
  public async runGarbageCollection(): Promise<GarbageCollectionResult> {
    const startTime = performance.now();
    const activeIds = await this.getActiveBlobIds();
    const allBlobs = await db.mediaBlobs.toArray();

    const orphanedIds: string[] = [];
    let bytesFreed = 0;

    for (const blob of allBlobs) {
      if (!activeIds.has(blob.id)) {
        orphanedIds.push(blob.id);
        bytesFreed += (blob.base64Data?.length || 0);
      }
    }

    if (orphanedIds.length > 0) {
      await db.mediaBlobs.bulkDelete(orphanedIds);
      console.log(`[StorageCleaner] Purged ${orphanedIds.length} orphaned blobs (${Math.round(bytesFreed / 1024)} KB freed)`);
    }

    const durationMs = Math.round(performance.now() - startTime);

    return {
      totalBlobsScanned: allBlobs.length,
      orphanedBlobsPurged: orphanedIds.length,
      estimatedBytesFreed: bytesFreed,
      durationMs,
    };
  }

  /**
   * Estimate browser storage quota and check for storage pressure
   */
  public async getStorageQuota(): Promise<StorageQuotaStats> {
    let usedBytes = 0;
    let quotaBytes = 1024 * 1024 * 1024; // Default 1GB fallback

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        usedBytes = est.usage || 0;
        quotaBytes = est.quota || quotaBytes;
      } catch {
        // Fallback
      }
    }

    const blobRecordCount = await db.mediaBlobs.count();
    const percentUsed = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

    return {
      usedBytes,
      quotaBytes,
      percentUsed: Math.round(percentUsed * 100) / 100,
      blobRecordCount,
      isStoragePressure: percentUsed > 80,
    };
  }
}

export const storageCleaner = new StorageCleaner();
