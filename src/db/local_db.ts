import Dexie, { type EntityTable } from 'dexie';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'tendik' | 'guru';
  pinCode: string;
  namaLengkap: string;
  nipNuptk?: string;
  pegawaiId?: string;
  lastLogin?: string;
}

export interface PegawaiRecord {
  id: string;
  nipNuptk: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  jabatan: 'Kepala Sekolah' | 'Guru Kelas' | 'Guru Mapel' | 'Tenaga Administrasi' | 'Operator Dapodik';
  statusKepegawaian: 'PNS' | 'PPPK' | 'Honorer Daerah' | 'GTT/PTT';
  pangkatGolongan: string;
  email: string;
  noHp: string;
  googleDriveFolderId?: string;
  syncStatus: 'synced' | 'pending';
  updatedAt: string;
}

export interface RombelRecord {
  id: string;
  tingkat: number; // 1 to 6
  namaRombel: string;
  fase: 'Fase A' | 'Fase B' | 'Fase C';
  tahunAjaran: string;
  waliKelasId?: string;
}

export interface SiswaRecord {
  id: string;
  nisn: string;
  nik: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  namaIbu: string;
  namaAyah: string;
  alamat: string;
  rombelId: string;
  tingkatKelas: number;
  statusSiswa: 'aktif' | 'lulus' | 'mutasi_keluar';
  tahunMasuk: number;
  tahunLulus?: number;
  syncStatus: 'synced' | 'pending';
  updatedAt: string;
}

export interface MutasiRecord {
  id: string;
  siswaId: string;
  namaSiswa: string;
  nisn: string;
  jenisMutasi: 'masuk' | 'keluar' | 'lulus';
  tanggalMutasi: string;
  sekolahAsalTujuan: string;
  alasan: string;
  noSurat: string;
  syncStatus: 'synced' | 'pending';
}

export interface BebanAjarRecord {
  id: string;
  pegawaiId: string;
  rombelId: string;
  mataPelajaran: string;
  jumlahJamMinggu: number;
  hariMengajar: string;
  jamMulaiSelesai: string;
  syncStatus: 'synced' | 'pending';
}

export interface ArsipDigitalRecord {
  id: string;
  pegawaiId: string;
  namaPegawai: string;
  kategori: 'SK Pengangkatan' | 'SK Pangkat/Berkala' | 'SK PBM' | 'Ijazah' | 'Sertifikat Pendidik' | 'Berkas Pribadi';
  judulDokumen: string;
  nomorSurat?: string;
  driveFileId: string;
  driveWebUrl: string;
  fileSizeBytes: number;
  fileMimeType: string;
  uploadedAt: string;
  syncStatus: 'synced' | 'pending';
}

export interface SarprasRecord {
  id: string;
  kodeAset: string;
  kategoriKib: 'KIB A (Tanah)' | 'KIB B (Peralatan/TIK)' | 'KIB C (Gedung/Ruang)' | 'KIB E (Buku/APE)';
  namaBarang: string;
  merkTipe: string;
  jumlahUnit: number;
  satuan: string;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  lokasiRuang: string;
  tahunPengadaan: number;
  sumberDana: 'BOS Reguler' | 'BOS Kinerja' | 'DAK Fisik' | 'Hibah Pemkab Bantaeng';
  qrCodeData: string;
  syncStatus: 'synced' | 'pending';
  updatedAt: string;
}

export interface JurnalKinerjaRecord {
  id: string;
  pegawaiId: string;
  namaPegawai: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  uraianAktivitas: string;
  outputHasil: string;
  tautanBuktiDrive?: string;
  statusVerifikasi: 'draft' | 'diajukan' | 'disetujui' | 'revisi';
  catatanEvaluasi?: string;
  syncStatus: 'synced' | 'pending';
  updatedAt: string;
}

export interface BukuTamuRecord {
  id: string;
  tanggalKunjungan: string;
  jamKunjungan: string;
  namaTamu: string;
  instansiAsal: string;
  kategoriTamu: 'Dinas Pendidikan' | 'Pengawas Sekolah' | 'Wali Murid' | 'Tamu Umum' | 'Mitra/Vendor';
  noWhatsapp: string;
  tujuanKunjungan: string;
  pegawaiDituju: string;
  tandaTanganBase64: string;
  fotoSelfieUrl?: string;
  syncStatus: 'synced' | 'pending';
}

export interface SyncOutboxRecord {
  id: string;
  tableName: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  payloadJson: string;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

export type DbMutationAction = 'create' | 'update' | 'delete';

export type DbMutationCallback = (
  tableName: string,
  action: DbMutationAction,
  recordId: string,
  payload: unknown
) => void;

let dbMutationHandler: DbMutationCallback | null = null;

export function registerDbMutationListener(callback: DbMutationCallback) {
  dbMutationHandler = callback;
}

/**
 * Dexie Local Database Instance for Lonrong SmartEdu
 */
export class LonrongDatabase extends Dexie {
  users!: EntityTable<UserAccount, 'id'>;
  pegawai!: EntityTable<PegawaiRecord, 'id'>;
  kelasRombel!: EntityTable<RombelRecord, 'id'>;
  siswa!: EntityTable<SiswaRecord, 'id'>;
  mutasiSiswa!: EntityTable<MutasiRecord, 'id'>;
  bebanAjar!: EntityTable<BebanAjarRecord, 'id'>;
  arsipDigital!: EntityTable<ArsipDigitalRecord, 'id'>;
  sarpras!: EntityTable<SarprasRecord, 'id'>;
  jurnalKinerja!: EntityTable<JurnalKinerjaRecord, 'id'>;
  bukuTamu!: EntityTable<BukuTamuRecord, 'id'>;
  syncOutbox!: EntityTable<SyncOutboxRecord, 'id'>;

  public isSeeding = false;

  constructor() {
    super('LonrongSmartEduDB');
    this.version(1).stores({
      users: 'id, username, role, pinCode',
      pegawai: 'id, nipNuptk, namaLengkap, jabatan, statusKepegawaian, syncStatus',
      kelasRombel: 'id, tingkat, namaRombel, fase',
      siswa: 'id, nisn, nik, namaLengkap, rombelId, tingkatKelas, statusSiswa, syncStatus',
      mutasiSiswa: 'id, siswaId, jenisMutasi, tanggalMutasi, syncStatus',
      bebanAjar: 'id, pegawaiId, rombelId, mataPelajaran, syncStatus',
      arsipDigital: 'id, pegawaiId, kategori, driveFileId, syncStatus',
      sarpras: 'id, kodeAset, kategoriKib, namaBarang, kondisi, lokasiRuang, syncStatus',
      jurnalKinerja: 'id, pegawaiId, tanggal, statusVerifikasi, syncStatus',
      bukuTamu: 'id, tanggalKunjungan, namaTamu, kategoriTamu, syncStatus',
      syncOutbox: 'id, tableName, recordId, action, status, timestamp',
    });

    this.setupAutoSyncHooks();
  }

  private setupAutoSyncHooks() {
    const trackedTables = [
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

    for (const tableName of trackedTables) {
      const table = (this as any)[tableName];
      if (!table || typeof table.hook !== 'function') continue;

      table.hook('creating', (primKey: any, obj: any) => {
        if (this.isSeeding) return;
        const recordId = String(primKey || obj?.id || '');
        setTimeout(() => {
          if (dbMutationHandler) {
            dbMutationHandler(tableName, 'create', recordId, obj);
          }
        }, 30);
      });

      table.hook('updating', (modifications: any, primKey: any, obj: any) => {
        if (this.isSeeding) return;
        const recordId = String(primKey || obj?.id || '');
        setTimeout(() => {
          if (dbMutationHandler) {
            dbMutationHandler(tableName, 'update', recordId, modifications);
          }
        }, 30);
      });

      table.hook('deleting', (primKey: any) => {
        if (this.isSeeding) return;
        const recordId = String(primKey || '');
        setTimeout(() => {
          if (dbMutationHandler) {
            dbMutationHandler(tableName, 'delete', recordId, null);
          }
        }, 30);
      });
    }
  }
}

export const db = new LonrongDatabase();

