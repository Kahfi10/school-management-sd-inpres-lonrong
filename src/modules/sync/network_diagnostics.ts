/**
 * Distributed Network Diagnostics & Intranet Health Benchmark
 * Empirically measures local IndexedDB throughput and network round-trip latency (RTT)
 * to provide real-time connection telemetry for SD Inpres Lonrong.
 */

import { db } from '../../db/local_db';

export interface DiagnosticMetrics {
  indexedDbWriteOpsPerSec: number;
  indexedDbReadOpsPerSec: number;
  networkLatencyMs: number | null;
  effectiveConnectionType: string;
  isOnline: boolean;
  timestamp: string;
}

export async function runIntranetDiagnostics(pingUrl?: string): Promise<DiagnosticMetrics> {
  const isOnline = navigator.onLine;
  const navConn = (navigator as any).connection;
  const effectiveConnectionType = navConn?.effectiveType || (isOnline ? 'online' : 'offline');

  // 1. Measure local IndexedDB write throughput
  const writeStart = performance.now();
  const testIds: string[] = [];
  const testItems = Array.from({ length: 50 }, (_, i) => {
    const id = `diag_test_${Date.now()}_${i}`;
    testIds.push(id);
    return {
      id,
      tableName: 'diagnostics',
      recordId: id,
      action: 'create' as const,
      payloadJson: '{}',
      timestamp: Date.now(),
      status: 'synced' as const,
      retryCount: 0,
    };
  });

  await db.syncOutbox.bulkAdd(testItems);
  const writeDuration = performance.now() - writeStart;
  const writeOps = Math.round((50 / (writeDuration / 1000)));

  // 2. Measure local IndexedDB read throughput
  const readStart = performance.now();
  await db.syncOutbox.where('id').anyOf(testIds).toArray();
  const readDuration = performance.now() - readStart;
  const readOps = Math.round((50 / (readDuration / 1000)));

  // Clean up diagnostic records
  await db.syncOutbox.bulkDelete(testIds);

  // 3. Measure Network Latency RTT
  let networkLatencyMs: number | null = null;
  if (isOnline && pingUrl) {
    try {
      const pingStart = performance.now();
      await fetch(pingUrl, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
      networkLatencyMs = Math.round(performance.now() - pingStart);
    } catch {
      networkLatencyMs = null;
    }
  }

  return {
    indexedDbWriteOpsPerSec: writeOps,
    indexedDbReadOpsPerSec: readOps,
    networkLatencyMs,
    effectiveConnectionType,
    isOnline,
    timestamp: new Date().toISOString(),
  };
}
