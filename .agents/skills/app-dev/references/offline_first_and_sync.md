# Offline-First Architecture & Sync Engine Reference

Building resilient offline client experiences with local SQLite persistence and synchronized mutation queues.

---

## 1. Offline Mutation Queue Architecture

When a user triggers an action (submitting an assignment, marking attendance, updating profile) while disconnected:

```text
       Offline Mutation Queue
┌──────────────────────────────────────┐
│ ID: mut_001 | Op: ATTENDANCE_MARK   │
│ Payload: { studentId: "s1", status: "present" }
│ RetryCount: 0 | CreatedAt: 171991200 │
├──────────────────────────────────────┤
│ ID: mut_002 | Op: PROFILE_UPDATE    │
│ Payload: { phone: "+628123456789" } │
│ RetryCount: 0 | CreatedAt: 171991240 │
└──────────────────────────────────────┘
```

---

## 2. SQLite Schema & Queue Processor

```typescript
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('school_app.db');

export function initOfflineQueue() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
}

export async function enqueueMutation(endpoint: string, method: string, payload: unknown) {
  const id = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  db.runSync(
    `INSERT INTO sync_queue (id, endpoint, method, payload, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, endpoint, method, JSON.stringify(payload), Date.now()]
  );
}

export async function flushSyncQueue() {
  const pending = db.getAllSync<{
    id: string;
    endpoint: string;
    method: string;
    payload: string;
    retry_count: number;
  }>(`SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 20`);

  for (const item of pending) {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.payload,
      });

      if (response.ok) {
        db.runSync(`DELETE FROM sync_queue WHERE id = ?`, [item.id]);
      } else if (response.status >= 400 && response.status < 500) {
        // Unrecoverable client error; mark failed
        db.runSync(`UPDATE sync_queue SET status = 'failed' WHERE id = ?`, [item.id]);
      } else {
        // Network/Server 5xx; increment retry
        db.runSync(`UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?`, [item.id]);
      }
    } catch {
      db.runSync(`UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?`, [item.id]);
    }
  }
}
```
