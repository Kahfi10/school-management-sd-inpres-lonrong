// Cloud Sync Service: Free Multi-User Synchronization via Supabase & Google Apps Script
import { db, type SyncOutboxRecord } from './local_db';
import { resolveBatchWithLocal } from './conflict_resolver';

export interface CloudSyncConfig {
  provider: 'none' | 'supabase' | 'googlesheets';
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleWebhookUrl: string;
  lastSyncTimestamp: number | null;
  autoSyncEnabled: boolean;
}

export const ALL_SYNC_TABLES = [
  'users',
  'pegawai',
  'kelasRombel',
  'siswa',
  'mutasiSiswa',
  'bebanAjar',
  'arsipDigital',
  'sarpras',
  'jurnalKinerja',
  'bukuTamu',
] as const;

export type SyncTableName = (typeof ALL_SYNC_TABLES)[number];

export const SUPABASE_ALLOWED_COLUMNS: Record<string, readonly string[]> = {
  users: [
    'id',
    'username',
    'passwordHash',
    'role',
    'isSuperAdmin',
    'isActive',
    'pinCode',
    'namaLengkap',
    'nipNuptk',
    'pegawaiId',
    'lastLogin',
    'updatedAt',
  ],
  pegawai: [
    'id',
    'nipNuptk',
    'namaLengkap',
    'jenisKelamin',
    'jabatan',
    'statusKepegawaian',
    'pangkatGolongan',
    'email',
    'noHp',
    'googleDriveFolderId',
    'syncStatus',
    'updatedAt',
  ],
  kelasRombel: [
    'id',
    'tingkat',
    'namaRombel',
    'fase',
    'tahunAjaran',
    'waliKelasId',
  ],
  siswa: [
    'id',
    'nisn',
    'nik',
    'namaLengkap',
    'jenisKelamin',
    'tempatLahir',
    'tanggalLahir',
    'namaIbu',
    'namaAyah',
    'alamat',
    'rombelId',
    'tingkatKelas',
    'statusSiswa',
    'tahunMasuk',
    'tahunLulus',
    'syncStatus',
    'updatedAt',
  ],
  mutasiSiswa: [
    'id',
    'siswaId',
    'namaSiswa',
    'nisn',
    'jenisMutasi',
    'tanggalMutasi',
    'sekolahAsalTujuan',
    'alasan',
    'noSurat',
    'syncStatus',
  ],
  bebanAjar: [
    'id',
    'pegawaiId',
    'rombelId',
    'mataPelajaran',
    'jumlahJamMinggu',
    'hariMengajar',
    'jamMulaiSelesai',
    'syncStatus',
  ],
  arsipDigital: [
    'id',
    'pegawaiId',
    'namaPegawai',
    'kategori',
    'judulDokumen',
    'nomorSurat',
    'driveFileId',
    'driveWebUrl',
    'fileSizeBytes',
    'fileMimeType',
    'uploadedAt',
    'syncStatus',
  ],
  sarpras: [
    'id',
    'kodeAset',
    'kategoriKib',
    'namaBarang',
    'merkTipe',
    'jumlahUnit',
    'satuan',
    'kondisi',
    'lokasiRuang',
    'tahunPengadaan',
    'sumberDana',
    'qrCodeData',
    'syncStatus',
    'updatedAt',
  ],
  jurnalKinerja: [
    'id',
    'pegawaiId',
    'namaPegawai',
    'tanggal',
    'jamMulai',
    'jamSelesai',
    'uraianAktivitas',
    'outputHasil',
    'tautanBuktiDrive',
    'statusVerifikasi',
    'catatanEvaluasi',
    'syncStatus',
    'updatedAt',
  ],
  bukuTamu: [
    'id',
    'tanggalKunjungan',
    'jamKunjungan',
    'namaTamu',
    'instansiAsal',
    'kategoriTamu',
    'noWhatsapp',
    'tujuanKunjungan',
    'pegawaiDituju',
    'tandaTanganBase64',
    'fotoSelfieUrl',
    'syncStatus',
  ],
};

export function sanitizeSupabasePayload(tableName: string, record: any): any {
  if (!record || typeof record !== 'object') return record;
  const allowedCols = SUPABASE_ALLOWED_COLUMNS[tableName];
  if (!allowedCols) {
    const clean = { ...record };
    delete clean.createdAt;
    return clean;
  }

  // Normalize all keys across the batch so PostgREST never fails with PGRST102 ('All object keys must match')
  const sanitized: Record<string, any> = {};
  for (const col of allowedCols) {
    sanitized[col] = record[col] !== undefined ? record[col] : null;
  }
  if (record.id && !sanitized.id) {
    sanitized.id = record.id;
  }
  return sanitized;
}

const CONFIG_STORAGE_KEY = 'lonrong_cloud_sync_config_v1';

export class CloudSyncService {
  private config: CloudSyncConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  public getConfig(): CloudSyncConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<CloudSyncConfig>) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('[CloudSync] Failed to save config to localStorage:', e);
    }
  }

  private loadConfig(): CloudSyncConfig {
    const defaultUrl = 'https://ohqzmwdveugzqpzyvwye.supabase.co';
    const defaultKey = 'sb_publishable_B4cB8w6LlyRqbvC90-XflA_4PVk7PsW';

    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || defaultUrl;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || defaultKey;
    const envProvider = envUrl && envKey ? 'supabase' : 'none';

    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          supabaseUrl: parsed.supabaseUrl || envUrl,
          supabaseAnonKey: parsed.supabaseAnonKey || envKey,
          provider: parsed.provider && parsed.provider !== 'none' ? parsed.provider : envProvider,
        };
      }
    } catch (e) {
      console.warn('[CloudSync] Failed to parse stored config:', e);
    }

    return {
      provider: envProvider,
      supabaseUrl: envUrl,
      supabaseAnonKey: envKey,
      googleWebhookUrl: (import.meta as any).env?.VITE_GOOGLE_SHEETS_WEBHOOK || '',
      lastSyncTimestamp: null,
      autoSyncEnabled: true,
    };
  }

  /**
   * Build authentication headers compatible with both new (sb_publishable_...) and legacy (JWT eyJ...) Supabase keys
   */
  private buildSupabaseHeaders(key: string, extraHeaders: Record<string, string> = {}): Record<string, string> {
    const cleanKey = key.trim();
    const headers: Record<string, string> = {
      apikey: cleanKey,
      ...extraHeaders,
    };
    // Only attach Authorization: Bearer if the key is a legacy JWT (starts with eyJ)
    // New Supabase publishable keys (sb_publishable_...) must NOT be sent in Authorization: Bearer
    if (cleanKey.startsWith('eyJ')) {
      headers['Authorization'] = `Bearer ${cleanKey}`;
    }
    return headers;
  }

  /**
   * Test connection to configured Supabase instance
   */
  public async testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
    if (!url || !key) {
      return { success: false, message: 'URL Supabase dan Anon Public Key wajib diisi.' };
    }

    const cleanUrl = url.trim().replace(/\/+$/, '');
    // Query a specific table with limit 1, which works with both new publishable keys and legacy keys
    const endpoint = `${cleanUrl}/rest/v1/siswa?select=id&limit=1`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.buildSupabaseHeaders(key),
      });

      if (response.ok || response.status === 200) {
        return {
          success: true,
          message: 'Koneksi ke Supabase Cloud Berhasil! Basis data terhubung dan siap digunakan.',
        };
      } else if (response.status === 404) {
        return {
          success: true,
          message: 'Koneksi ke Supabase Berhasil! Namun tabel siswa belum ada. Silakan klik "Salin Skema SQL" dan jalankan di SQL Editor Supabase.',
        };
      } else {
        return {
          success: false,
          message: `Gagal terhubung (${response.status}): ${response.statusText}. Pastikan Publishable Key benar.`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Koneksi gagal atau diblokir CORS: ${err.message || 'Periksa jaringan internet Anda.'}`,
      };
    }
  }

  /**
   * Test connection to Google Apps Script Webhook
   */
  public async testGoogleWebhook(url: string): Promise<{ success: boolean; message: string }> {
    if (!url) {
      return { success: false, message: 'Google Apps Script Webhook URL wajib diisi.' };
    }

    try {
      const response = await fetch(url.trim(), {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script redirects usually require no-cors in browsers
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping', timestamp: Date.now() }),
      });

      return {
        success: true,
        message: 'Permintaan uji berhasil dikirim ke Google Apps Script Webhook (no-cors mode aktif).',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal mengirim payload webhook: ${err.message}`,
      };
    }
  }

  /**
   * Push a batch of outbox mutations to the configured cloud provider in high-efficiency bulk requests
   */
  public async pushBatch(
    items: SyncOutboxRecord[]
  ): Promise<{ successfulIds: string[]; failedIds: string[] }> {
    if (items.length === 0) return { successfulIds: [], failedIds: [] };

    if (this.config.provider === 'none') {
      // Local-only mode, consider all successful
      return { successfulIds: items.map((i) => i.id), failedIds: [] };
    }

    if (this.config.provider === 'supabase') {
      return await this.pushToSupabaseBatch(items);
    }

    if (this.config.provider === 'googlesheets') {
      return await this.pushToGoogleWebhookBatch(items);
    }

    return { successfulIds: items.map((i) => i.id), failedIds: [] };
  }

  /**
   * High-Efficiency Bulk Upsert / Delete for Supabase PostgREST
   * Groups items by table and sends 1 bulk POST per table instead of N separate HTTP requests.
   */
  private async pushToSupabaseBatch(
    items: SyncOutboxRecord[]
  ): Promise<{ successfulIds: string[]; failedIds: string[] }> {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
      return { successfulIds: [], failedIds: items.map((i) => i.id) };
    }

    const cleanUrl = this.config.supabaseUrl.trim().replace(/\/+$/, '');
    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    // Group items by table
    const tableMap = new Map<string, SyncOutboxRecord[]>();
    for (const item of items) {
      const list = tableMap.get(item.tableName) || [];
      list.push(item);
      tableMap.set(item.tableName, list);
    }

    for (const [tableName, tableItems] of tableMap.entries()) {
      const endpoint = `${cleanUrl}/rest/v1/${tableName}`;
      const upsertItems: SyncOutboxRecord[] = [];
      const deleteItems: SyncOutboxRecord[] = [];

      for (const it of tableItems) {
        if (it.action === 'delete') {
          deleteItems.push(it);
        } else {
          upsertItems.push(it);
        }
      }

      // 1. Process Bulk Upserts (Prefer: resolution=merge-duplicates)
      if (upsertItems.length > 0) {
        try {
          // Collapse multiple updates for same recordId to latest payload
          const collapsedMap = new Map<string, { payload: any; itemIds: string[] }>();
          for (const it of upsertItems) {
            let parsed = {};
            try {
              parsed = JSON.parse(it.payloadJson || '{}');
            } catch {
              parsed = {};
            }
            const existing = collapsedMap.get(it.recordId);
            if (existing) {
              existing.payload = { ...existing.payload, ...parsed };
              existing.itemIds.push(it.id);
            } else {
              collapsedMap.set(it.recordId, { payload: parsed, itemIds: [it.id] });
            }
          }

          // Defensive payload enrichment & schema sanitization
          const localTable = (db as any)[tableName];
          for (const [recId, entry] of collapsedMap.entries()) {
            if (localTable) {
              try {
                const localRec = await localTable.get(recId);
                if (localRec) {
                  entry.payload = { ...localRec, ...entry.payload, id: recId };
                }
              } catch {
                // Ignore local read errors during enrichment
              }
            }
            if (!entry.payload.id) {
              entry.payload.id = recId;
            }
            entry.payload = sanitizeSupabasePayload(tableName, entry.payload);
          }

          const bulkPayload = Array.from(collapsedMap.values()).map((v) => v.payload);
          const allItemIds = Array.from(collapsedMap.values()).flatMap((v) => v.itemIds);

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: this.buildSupabaseHeaders(this.config.supabaseAnonKey, {
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            }),
            body: JSON.stringify(bulkPayload),
          });

          if (res.ok) {
            successfulIds.push(...allItemIds);
          } else {
            const errBody = await res.text().catch(() => '');
            console.warn(
              `[CloudSync] Supabase bulk upsert returned ${res.status} for ${tableName}, activating resilient single-record fallback:`,
              errBody
            );
            // Resilient single-record fallback so one invalid record never blocks the entire batch
            for (const entry of collapsedMap.values()) {
              try {
                const singleRes = await fetch(endpoint, {
                  method: 'POST',
                  headers: this.buildSupabaseHeaders(this.config.supabaseAnonKey, {
                    'Content-Type': 'application/json',
                    Prefer: 'resolution=merge-duplicates',
                  }),
                  body: JSON.stringify([entry.payload]),
                });
                if (singleRes.ok) {
                  successfulIds.push(...entry.itemIds);
                } else {
                  const singleErr = await singleRes.text().catch(() => '');
                  console.error(`[CloudSync] Single upsert failed for ${tableName} (${entry.payload.id}):`, singleErr);
                  failedIds.push(...entry.itemIds);
                }
              } catch {
                failedIds.push(...entry.itemIds);
              }
            }
          }
        } catch (err) {
          console.error(`[CloudSync] Error during Supabase bulk upsert for ${tableName}:`, err);
          failedIds.push(...upsertItems.map((i) => i.id));
        }
      }

      // 2. Process Bulk Deletes
      if (deleteItems.length > 0) {
        try {
          const deleteRecordIds = deleteItems.map((d) => d.recordId);
          const deleteItemIds = deleteItems.map((d) => d.id);
          const deleteUrl = `${endpoint}?id=in.(${deleteRecordIds.map((id) => encodeURIComponent(id)).join(',')})`;

          const res = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: this.buildSupabaseHeaders(this.config.supabaseAnonKey),
          });

          if (res.ok) {
            successfulIds.push(...deleteItemIds);
          } else {
            console.error(`[CloudSync] Supabase bulk delete failed for ${tableName}:`, res.status);
            failedIds.push(...deleteItemIds);
          }
        } catch (err) {
          console.error(`[CloudSync] Error during Supabase bulk delete for ${tableName}:`, err);
          failedIds.push(...deleteItems.map((i) => i.id));
        }
      }
    }

    return { successfulIds, failedIds };
  }

  /**
   * Batch push for Google Apps Script Webhook
   */
  private async pushToGoogleWebhookBatch(
    items: SyncOutboxRecord[]
  ): Promise<{ successfulIds: string[]; failedIds: string[] }> {
    if (!this.config.googleWebhookUrl) {
      return { successfulIds: [], failedIds: items.map((i) => i.id) };
    }

    try {
      const batchPayload = items.map((item) => ({
        tableName: item.tableName,
        action: item.action,
        recordId: item.recordId,
        data: JSON.parse(item.payloadJson || '{}'),
        timestamp: item.timestamp,
      }));

      await fetch(this.config.googleWebhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: batchPayload,
          count: batchPayload.length,
          timestamp: Date.now(),
        }),
      });

      return { successfulIds: items.map((i) => i.id), failedIds: [] };
    } catch (e) {
      console.error('[CloudSync] Google Webhook batch push error:', e);
      return { successfulIds: [], failedIds: items.map((i) => i.id) };
    }
  }

  /**
   * Push a single mutation to cloud provider (backward compatible)
   */
  public async pushMutation(item: SyncOutboxRecord): Promise<boolean> {
    const result = await this.pushBatch([item]);
    return result.successfulIds.length > 0;
  }

  /**
   * Upload all local records from IndexedDB to Supabase (Initial Full Push)
   * Essential for synchronizing existing offline/seed data up to the cloud.
   */
  public async uploadAllToSupabase(): Promise<{
    totalUploaded: number;
    tableResults: Record<string, number>;
    errors: number;
  }> {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
      return { totalUploaded: 0, tableResults: {}, errors: 1 };
    }

    const cleanUrl = this.config.supabaseUrl.trim().replace(/\/+$/, '');
    let totalUploaded = 0;
    let errors = 0;
    const tableResults: Record<string, number> = {};

    for (const table of ALL_SYNC_TABLES) {
      try {
        const localTable = (db as any)[table];
        if (!localTable) continue;

        const records = await localTable.toArray();
        if (records.length === 0) {
          tableResults[table] = 0;
          continue;
        }

        const chunkSize = 50;
        let tableUploaded = 0;

        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const sanitizedChunk = chunk.map((r: any) => sanitizeSupabasePayload(table, r));

          const endpoint = `${cleanUrl}/rest/v1/${table}`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: this.buildSupabaseHeaders(this.config.supabaseAnonKey, {
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            }),
            body: JSON.stringify(sanitizedChunk),
          });

          if (res.ok) {
            tableUploaded += chunk.length;
          } else {
            console.warn(`[CloudSync] Full push batch failed for ${table}, attempting single-record upsert:`, res.status);
            for (const item of sanitizedChunk) {
              try {
                const singleRes = await fetch(endpoint, {
                  method: 'POST',
                  headers: this.buildSupabaseHeaders(this.config.supabaseAnonKey, {
                    'Content-Type': 'application/json',
                    Prefer: 'resolution=merge-duplicates',
                  }),
                  body: JSON.stringify([item]),
                });
                if (singleRes.ok) {
                  tableUploaded++;
                } else {
                  errors++;
                  console.error(`[CloudSync] Item upload failed for ${table} (${item.id}):`, await singleRes.text().catch(() => ''));
                }
              } catch {
                errors++;
              }
            }
          }
        }

        tableResults[table] = tableUploaded;
        totalUploaded += tableUploaded;
      } catch (err) {
        errors++;
        console.error(`[CloudSync] Error during uploadAllToSupabase for ${table}:`, err);
      }
    }

    this.saveConfig({ lastSyncTimestamp: Date.now() });
    return { totalUploaded, tableResults, errors };
  }

  /**
   * Pull changes from Supabase tables to local IndexedDB
   * Features:
   * 1. Silent Pull Guard: Disables Dexie mutation hooks during bulkPut to prevent infinite echo loops.
   * 2. High-Water Mark (Delta Sync): Only pulls records modified after lastSyncTimestamp.
   * 3. Covers all 10 domain tables.
   */
  public async pullAllFromSupabase(
    forceFullSync: boolean = false
  ): Promise<{ totalPulled: number; errors: number }> {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
      return { totalPulled: 0, errors: 0 };
    }

    const cleanUrl = this.config.supabaseUrl.trim().replace(/\/+$/, '');
    let totalPulled = 0;
    let errors = 0;
    const updatedTables: string[] = [];

    // Enable Silent Pull Guard to ensure local IndexedDB hooks do not echo mutations to outbox
    db.isSyncPulling = true;

    try {
      const lastSync = this.config.lastSyncTimestamp;
      const useDelta = !forceFullSync && lastSync !== null && Date.now() - lastSync < 30 * 24 * 3600 * 1000;
      // 2-minute safety buffer backwards for clock drift tolerance across devices
      const safeSyncIso = lastSync ? new Date(Math.max(0, lastSync - 120000)).toISOString() : null;

      const pullTasks = ALL_SYNC_TABLES.map(async (table) => {
        try {
          let endpoint = `${cleanUrl}/rest/v1/${table}?select=*`;

          // If incremental delta sync is active, query only updated records for large tables
          if (useDelta && safeSyncIso) {
            if (['siswa', 'pegawai', 'sarpras', 'jurnalKinerja'].includes(table)) {
              endpoint += `&updatedAt=gt.${encodeURIComponent(safeSyncIso)}`;
            }
          }

          const res = await fetch(endpoint, {
            method: 'GET',
            headers: this.buildSupabaseHeaders(this.config.supabaseAnonKey),
          });

          if (res.ok) {
            const records = await res.json();
            if (Array.isArray(records) && records.length > 0) {
              const localTable = (db as any)[table];
              if (localTable) {
                const { resolved } = await resolveBatchWithLocal(
                  records,
                  (id) => localTable.get(id),
                  async (recordId) => {
                    const pendingItem = await db.syncOutbox
                      .where('recordId')
                      .equals(recordId)
                      .and((item) => item.status === 'pending')
                      .first();
                    return pendingItem ? JSON.parse(pendingItem.payloadJson || '{}') : undefined;
                  }
                );

                await localTable.bulkPut(resolved);
                return { table, count: resolved.length, error: false };
              }
            }
            return { table, count: 0, error: false };
          } else if (res.status !== 404) {
            console.warn(`[CloudSync] Supabase pull warning for ${table}:`, res.status);
            return { table, count: 0, error: true };
          }
        } catch (err) {
          console.warn(`[CloudSync] Error pulling table ${table}:`, err);
          return { table, count: 0, error: true };
        }
        return { table, count: 0, error: false };
      });

      const results = await Promise.all(pullTasks);
      for (const r of results) {
        if (r.error) errors++;
        if (r.count > 0) {
          totalPulled += r.count;
          updatedTables.push(r.table);
        }
      }

      this.saveConfig({ lastSyncTimestamp: Date.now() });
    } finally {
      // Always reset the Silent Pull Guard
      db.isSyncPulling = false;
    }

    // Trigger reactive UI re-renders across all active views if new data was pulled
    if (totalPulled > 0 && typeof window !== 'undefined') {
      for (const t of updatedTables) {
        window.dispatchEvent(
          new CustomEvent('lonrong:data-changed', {
            detail: { tableName: t, action: 'update', recordId: 'cloud_pull' },
          })
        );
      }
      window.dispatchEvent(
        new CustomEvent('lonrong:data-changed', {
          detail: { tableName: 'all', action: 'update', recordId: 'cloud_pull' },
        })
      );
    }

    return { totalPulled, errors };
  }

  /**
   * Generate Ready-to-Execute SQL for Supabase Table Creation
   */
  public getSupabaseSqlSchema(): string {
    return `-- ====================================================================
-- SKEMA DATABASE CLOUD SUPABASE (POSTGRESQL) - 100% GRATIS
-- SD INPRES LONRONG (NPSN: 40304087) - KABUPATEN BANTAENG
-- Salin dan tempel skrip ini ke SQL Editor di dashboard Supabase Anda.
-- ====================================================================

-- 1. Tabel Siswa & Buku Induk
CREATE TABLE IF NOT EXISTS public.siswa (
    id TEXT PRIMARY KEY,
    nisn TEXT,
    nik TEXT,
    "namaLengkap" TEXT NOT NULL,
    "jenisKelamin" TEXT,
    "tempatLahir" TEXT,
    "tanggalLahir" TEXT,
    "namaIbu" TEXT,
    "namaAyah" TEXT,
    alamat TEXT,
    "rombelId" TEXT,
    "tingkatKelas" INTEGER,
    "statusSiswa" TEXT DEFAULT 'aktif',
    "tahunMasuk" INTEGER,
    "tahunLulus" INTEGER,
    "syncStatus" TEXT DEFAULT 'synced',
    "updatedAt" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Pegawai & Pendidik (24 JJM)
CREATE TABLE IF NOT EXISTS public.pegawai (
    id TEXT PRIMARY KEY,
    "nipNuptk" TEXT,
    "namaLengkap" TEXT NOT NULL,
    "jenisKelamin" TEXT,
    jabatan TEXT,
    "statusKepegawaian" TEXT,
    "pangkatGolongan" TEXT,
    email TEXT,
    "noHp" TEXT,
    "googleDriveFolderId" TEXT,
    "syncStatus" TEXT DEFAULT 'synced',
    "updatedAt" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Inventaris Sarpras (KIB A-E)
CREATE TABLE IF NOT EXISTS public.sarpras (
    id TEXT PRIMARY KEY,
    "kodeAset" TEXT,
    "kategoriKib" TEXT,
    "namaBarang" TEXT NOT NULL,
    "merkTipe" TEXT,
    "jumlahUnit" INTEGER,
    satuan TEXT,
    kondisi TEXT,
    "lokasiRuang" TEXT,
    "tahunPengadaan" INTEGER,
    "sumberDana" TEXT,
    "qrCodeData" TEXT,
    "syncStatus" TEXT DEFAULT 'synced',
    "updatedAt" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Jurnal E-Kinerja BKN
CREATE TABLE IF NOT EXISTS public."jurnalKinerja" (
    id TEXT PRIMARY KEY,
    "pegawaiId" TEXT,
    "namaPegawai" TEXT,
    tanggal TEXT,
    "jamMulai" TEXT,
    "jamSelesai" TEXT,
    "uraianAktivitas" TEXT,
    "outputHasil" TEXT,
    "tautanBuktiDrive" TEXT,
    "statusVerifikasi" TEXT DEFAULT 'draft',
    "catatanEvaluasi" TEXT,
    "syncStatus" TEXT DEFAULT 'synced',
    "updatedAt" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Buku Tamu Digital Kiosk
CREATE TABLE IF NOT EXISTS public."bukuTamu" (
    id TEXT PRIMARY KEY,
    "tanggalKunjungan" TEXT,
    "jamKunjungan" TEXT,
    "namaTamu" TEXT NOT NULL,
    "instansiAsal" TEXT,
    "kategoriTamu" TEXT,
    "noWhatsapp" TEXT,
    "tujuanKunjungan" TEXT,
    "pegawaiDituju" TEXT,
    "tandaTanganBase64" TEXT,
    "fotoSelfieUrl" TEXT,
    "syncStatus" TEXT DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Arsip Digital Google Drive
CREATE TABLE IF NOT EXISTS public."arsipDigital" (
    id TEXT PRIMARY KEY,
    "pegawaiId" TEXT,
    "namaPegawai" TEXT,
    kategori TEXT,
    "judulDokumen" TEXT,
    "nomorSurat" TEXT,
    "driveFileId" TEXT,
    "driveWebUrl" TEXT,
    "fileSizeBytes" BIGINT,
    "fileMimeType" TEXT,
    "uploadedAt" TEXT,
    "syncStatus" TEXT DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel Akun Pengguna (RBAC Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    role TEXT NOT NULL,
    "isSuperAdmin" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "pinCode" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "nipNuptk" TEXT,
    "pegawaiId" TEXT,
    "lastLogin" TEXT,
    "updatedAt" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabel Rombongan Belajar (Rombel Kelas 1-6)
CREATE TABLE IF NOT EXISTS public."kelasRombel" (
    id TEXT PRIMARY KEY,
    tingkat INTEGER NOT NULL,
    "namaRombel" TEXT NOT NULL,
    fase TEXT NOT NULL,
    "tahunAjaran" TEXT NOT NULL,
    "waliKelasId" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabel Mutasi & Alumni Siswa
CREATE TABLE IF NOT EXISTS public."mutasiSiswa" (
    id TEXT PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "namaSiswa" TEXT NOT NULL,
    nisn TEXT NOT NULL,
    "jenisMutasi" TEXT NOT NULL,
    "tanggalMutasi" TEXT NOT NULL,
    "sekolahAsalTujuan" TEXT,
    alasan TEXT,
    "noSurat" TEXT,
    "syncStatus" TEXT DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabel Beban Ajar Guru (24 JJM Target)
CREATE TABLE IF NOT EXISTS public."bebanAjar" (
    id TEXT PRIMARY KEY,
    "pegawaiId" TEXT NOT NULL,
    "rombelId" TEXT NOT NULL,
    "mataPelajaran" TEXT NOT NULL,
    "jumlahJamMinggu" INTEGER NOT NULL,
    "hariMengajar" TEXT,
    "jamMulaiSelesai" TEXT,
    "syncStatus" TEXT DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi Kolom Tambahan (Idempotent - aman dieksekusi jika tabel sudah ada sebelumnya)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public.pegawai ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public.sarpras ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."jurnalKinerja" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Enable Row Level Security (RLS) & Public Access untuk Anon Key (SD Intranet)
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sarpras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."jurnalKinerja" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."bukuTamu" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."arsipDigital" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."kelasRombel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."mutasiSiswa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."bebanAjar" ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation (Hapus dahulu jika ada, lalu buat baru)
DROP POLICY IF EXISTS "Allow public read-write for anon" ON public.siswa;
CREATE POLICY "Allow public read-write for anon" ON public.siswa FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for anon" ON public.pegawai;
CREATE POLICY "Allow public read-write for anon" ON public.pegawai FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for anon" ON public.sarpras;
CREATE POLICY "Allow public read-write for anon" ON public.sarpras FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for anon" ON public."jurnalKinerja";
CREATE POLICY "Allow public read-write for anon" ON public."jurnalKinerja" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for anon" ON public."bukuTamu";
CREATE POLICY "Allow public read-write for anon" ON public."bukuTamu" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for anon" ON public."arsipDigital";
CREATE POLICY "Allow public read-write for anon" ON public."arsipDigital" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for anon" ON public.users;
CREATE POLICY "Allow public read-write for anon" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for anon" ON public."kelasRombel";
CREATE POLICY "Allow public read-write for anon" ON public."kelasRombel" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for anon" ON public."mutasiSiswa";
CREATE POLICY "Allow public read-write for anon" ON public."mutasiSiswa" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for anon" ON public."bebanAjar";
CREATE POLICY "Allow public read-write for anon" ON public."bebanAjar" FOR ALL USING (true) WITH CHECK (true);
`;
  }

  /**
   * Generate Ready-to-Paste Google Apps Script
   */
  public getGoogleAppsScriptCode(): string {
    return `/**
 * Google Apps Script Webhook untuk SD Inpres Lonrong (NPSN: 40304087)
 * 1. Buka spreadsheet Google Drive sekolah Anda.
 * 2. Klik Extensions > Apps Script.
 * 3. Hapus kode default dan paste kode di bawah ini.
 * 4. Klik Deploy > New Deployment > Web App.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Salin Web App URL dan masukkan ke SIM Lonrong Cloud Sync.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.tableName || "LogSinkronisasi";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Buat header sederhana
      sheet.appendRow(["Timestamp", "Action", "RecordId", "Payload JSON"]);
    }

    sheet.appendRow([
      new Date(),
      data.action || "UNKNOWN",
      data.recordId || "-",
      JSON.stringify(data.data || {})
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data tersimpan di Google Sheets"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
  }

  /**
   * Export all database records to JSON string (Disaster Recovery backup)
   */
  public async exportFullBackup(): Promise<string> {
    const backup: Record<string, any[]> = {};
    const tableNames = [
      'users',
      'pegawai',
      'kelasRombel',
      'siswa',
      'mutasiSiswa',
      'bebanAjar',
      'arsipDigital',
      'sarpras',
      'jurnalKinerja',
      'bukuTamu',
    ];

    for (const name of tableNames) {
      const table = (db as any)[name];
      if (table) {
        backup[name] = await table.toArray();
      }
    }

    return JSON.stringify(
      {
        appName: 'SD Inpres Lonrong - SIM SmartEdu',
        npsn: '40304087',
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        tables: backup,
      },
      null,
      2
    );
  }

  /**
   * Restore all database records from a JSON file
   */
  public async restoreFullBackup(jsonString: string): Promise<{ restoredCount: number }> {
    const data = JSON.parse(jsonString);
    if (!data.tables) {
      throw new Error('Format berkas cadangan tidak valid (objek "tables" tidak ditemukan).');
    }

    let restoredCount = 0;
    db.isSyncPulling = true;
    try {
      for (const [rawTableName, records] of Object.entries(data.tables)) {
        const tableName = rawTableName === 'rombel' ? 'kelasRombel' : rawTableName;
        const table = (db as any)[tableName];
        if (table && Array.isArray(records)) {
          await table.clear();
          await table.bulkAdd(records);
          restoredCount += records.length;
        }
      }
    } finally {
      db.isSyncPulling = false;
    }

    return { restoredCount };
  }
}

export const cloudSyncService = new CloudSyncService();
