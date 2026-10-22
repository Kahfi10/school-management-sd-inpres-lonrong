// Cloud Sync Service: Free Multi-User Synchronization via Supabase & Google Apps Script
import { db, type SyncOutboxRecord } from './local_db';

export interface CloudSyncConfig {
  provider: 'none' | 'supabase' | 'googlesheets';
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleWebhookUrl: string;
  lastSyncTimestamp: number | null;
  autoSyncEnabled: boolean;
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
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[CloudSync] Failed to parse stored config:', e);
    }

    return {
      provider: 'none',
      supabaseUrl: '',
      supabaseAnonKey: '',
      googleWebhookUrl: '',
      lastSyncTimestamp: null,
      autoSyncEnabled: true,
    };
  }

  /**
   * Test connection to configured Supabase instance
   */
  public async testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
    if (!url || !key) {
      return { success: false, message: 'URL Supabase dan Anon Public Key wajib diisi.' };
    }

    const cleanUrl = url.trim().replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': key.trim(),
          'Authorization': `Bearer ${key.trim()}`,
        },
      });

      if (response.ok || response.status === 200 || response.status === 404) {
        return {
          success: true,
          message: 'Koneksi ke Supabase Cloud Berhasil! Endpoint REST aktif & siap digunakan.',
        };
      } else {
        return {
          success: false,
          message: `Gagal terhubung (${response.status}): ${response.statusText}. Pastikan URL & API Key benar.`,
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
   * Push a single mutation to cloud provider
   */
  public async pushMutation(item: SyncOutboxRecord): Promise<boolean> {
    if (this.config.provider === 'none') {
      return true; // Local-only mode, consider success
    }

    if (this.config.provider === 'supabase') {
      return await this.pushToSupabase(item);
    }

    if (this.config.provider === 'googlesheets') {
      return await this.pushToGoogleWebhook(item);
    }

    return true;
  }

  private async pushToSupabase(item: SyncOutboxRecord): Promise<boolean> {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) return false;

    const cleanUrl = this.config.supabaseUrl.trim().replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/${item.tableName}`;
    const payload = JSON.parse(item.payloadJson || '{}');

    try {
      let method = 'POST';
      let targetUrl = endpoint;

      if (item.action === 'create') {
        method = 'POST';
        // Use Prefer: resolution=merge-duplicates so creates act as upserts
        const res = await fetch(targetUrl, {
          method,
          headers: {
            'apikey': this.config.supabaseAnonKey.trim(),
            'Authorization': `Bearer ${this.config.supabaseAnonKey.trim()}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(payload),
        });
        return res.ok;
      } else if (item.action === 'update') {
        method = 'PATCH';
        targetUrl = `${endpoint}?id=eq.${encodeURIComponent(item.recordId)}`;
        const res = await fetch(targetUrl, {
          method,
          headers: {
            'apikey': this.config.supabaseAnonKey.trim(),
            'Authorization': `Bearer ${this.config.supabaseAnonKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        return res.ok;
      } else if (item.action === 'delete') {
        method = 'DELETE';
        targetUrl = `${endpoint}?id=eq.${encodeURIComponent(item.recordId)}`;
        const res = await fetch(targetUrl, {
          method,
          headers: {
            'apikey': this.config.supabaseAnonKey.trim(),
            'Authorization': `Bearer ${this.config.supabaseAnonKey.trim()}`,
          },
        });
        return res.ok;
      }
      return true;
    } catch (e) {
      console.error('[CloudSync] Supabase push error:', e);
      return false;
    }
  }

  private async pushToGoogleWebhook(item: SyncOutboxRecord): Promise<boolean> {
    if (!this.config.googleWebhookUrl) return false;

    try {
      await fetch(this.config.googleWebhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: item.tableName,
          action: item.action,
          recordId: item.recordId,
          data: JSON.parse(item.payloadJson || '{}'),
          timestamp: item.timestamp,
        }),
      });
      return true;
    } catch (e) {
      console.error('[CloudSync] Google Webhook push error:', e);
      return false;
    }
  }

  /**
   * Pull changes from Supabase tables to local IndexedDB
   */
  public async pullAllFromSupabase(): Promise<{ totalPulled: number; errors: number }> {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
      return { totalPulled: 0, errors: 0 };
    }

    const tables = ['siswa', 'pegawai', 'sarpras', 'jurnalKinerja', 'bukuTamu', 'arsipDigital'];
    const cleanUrl = this.config.supabaseUrl.trim().replace(/\/+$/, '');
    let totalPulled = 0;
    let errors = 0;

    for (const table of tables) {
      try {
        const endpoint = `${cleanUrl}/rest/v1/${table}?select=*`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'apikey': this.config.supabaseAnonKey.trim(),
            'Authorization': `Bearer ${this.config.supabaseAnonKey.trim()}`,
          },
        });

        if (res.ok) {
          const records = await res.json();
          if (Array.isArray(records) && records.length > 0) {
            const localTable = (db as any)[table];
            if (localTable) {
              await localTable.bulkPut(records);
              totalPulled += records.length;
            }
          }
        }
      } catch (err) {
        errors++;
        console.warn(`[CloudSync] Error pulling table ${table}:`, err);
      }
    }

    this.saveConfig({ lastSyncTimestamp: Date.now() });
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

-- Enable Row Level Security (RLS) & Public Access untuk Anon Key (SD Intranet)
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sarpras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."jurnalKinerja" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."bukuTamu" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."arsipDigital" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for anon" ON public.siswa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for anon" ON public.pegawai FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for anon" ON public.sarpras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for anon" ON public."jurnalKinerja" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for anon" ON public."bukuTamu" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for anon" ON public."arsipDigital" FOR ALL USING (true) WITH CHECK (true);
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
      'rombel',
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
    for (const [tableName, records] of Object.entries(data.tables)) {
      const table = (db as any)[tableName];
      if (table && Array.isArray(records)) {
        await table.clear();
        await table.bulkAdd(records);
        restoredCount += records.length;
      }
    }

    return { restoredCount };
  }
}

export const cloudSyncService = new CloudSyncService();
