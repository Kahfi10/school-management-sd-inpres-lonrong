# Arsitektur Terdistribusi & Protokol Sinkronisasi SD Inpres Lonrong
**Sistem Informasi Manajemen Administrasi Sekolah Terpadu (NPSN: 40304087)**

Dokumen ini menguraikan arsitektur sistem terdistribusi, protokol sinkronisasi *Local-First*, mitigasi konflik data multi-pengguna, dan ketahanan *offline* yang diterapkan pada aplikasi `lonrong-smartedu`.

---

## 1. Topologi Arsitektur Local-First

Aplikasi dibangun dengan prinsip **Local-First Software**:
1. **Lokal Utama:** Seluruh operasi baca dan tulis (CRUD) dieksekusi secara instan ke dalam peramban lokal melalui **IndexedDB (Dexie.js v2)** tanpa menunggu latensi jaringan internet.
2. **Asinkron & Terdistribusi:** Setiap mutasi data dicatat ke dalam antrean lokal (`syncOutbox`) dan dipadatkan secara otomatis (*outbox coalescing*).
3. **Multi-Penyedia Cloud:** Sistem mendukung pertukaran data dua arah (*two-way synchronization*) dengan **PostgreSQL Supabase** dan pencatatan audit satu arah (*append-only audit log*) ke **Google Sheets**.
4. **Intranet Sekolah Tanpa Internet:** Dalam kondisi mati lampu atau ketiadaan jaringan internet di Eremerasa/Bantaeng, perangkat dapat membentuk **Local Hub Wi-Fi** di ruang guru untuk pertukaran data lokal.

---

## 2. Diagram Alir Data & Siklus Hidup Sinkronisasi

```text
[ Browser Guru / HP ]
        │
        ├─► 1. Optimistic UI Render (0ms Perception)
        │
        ├─► 2. Tulis ke IndexedDB (Dexie v2 + Compound Index)
        │
        ├─► 3. Outbox Coalescing (Penyatuan Mutasi Create/Update/Delete)
        │
        ├─► 4. Background Web Worker (Kompresi Gzip Stream & Kriptografi PBKDF2)
        │
        ▼
[ Sync Engine Dispatcher ]
        │
        ├──► Online? ──► [ Push Batch Upsert ] ──► [ Supabase PostgreSQL Cloud ]
        │                       │
        │                       ▼
        │             [ Delta High-Water Mark ]
        │                       │
        │                       ▼
        │         [ Field-Level 3-Way Merger ] ──► [ Local DB Update (Silent Guard) ]
        │
        └──► Offline? ──► [ Service Worker Sync Event ] (Menunggu Koneksi Pulih)
```

---

## 3. Komponen Inti Sistem Terdistribusi

### A. Silent Pull Guard & Pencegahan Loop Echo
Saat data ditarik dari cloud (*delta pull*), flag `db.isSyncPulling = true` diaktifkan secara internal. Hal ini mematikan *Dexie mutation hooks* sementara waktu agar data yang baru diunduh dari cloud tidak sengaja dimasukkan kembali ke antrean `syncOutbox`, sehingga mengeliminasi risiko *infinite echo loop*.

### B. Field-Level 3-Way Delta Conflict Resolver (CRDT-Lite)
Menggantikan aturan konvensional *Last-Write-Wins (LWW)* yang sering menimpa satu baris penuh.
- Ketika record yang ditarik dari cloud bertabrakan dengan data lokal yang sedang memiliki perubahan *pending*, sistem membandingkan tiap kolom (*field*) secara terpisah.
- Modifikasi lokal yang aktif pada suatu kolom dipertahankan, sedangkan pembaruan pada kolom lain dari cloud digabungkan secara mulus tanpa kehilangan data guru.

### C. Pemadatan Antrean Keluar (Outbox Compaction)
Sebelum dikirim ke jaringan, antrean `syncOutbox` dipadatkan:
- Operasi `create` diikuti `update` disatukan menjadi 1 record `create` dengan muatan data terbaru.
- Operasi `create` diikuti `delete` langsung dihapus dari antrean tanpa perlu menyentuh cloud (*zero network overhead*).
- Operasi berulang pada baris yang sama hanya menyisakan kondisi akhir data (*latest state*).

### D. Kompresi Native Gzip Stream
Muatan data JSON dikompresi menggunakan antarmuka Web Stream standar `CompressionStream('gzip')` dan didekompresi via `DecompressionStream('gzip')`. Mengurangi konsumsi kuota bandwidth hingga ~80%, mempercepat proses sinkronisasi di jaringan seluler pedesaan.

### E. Blob Storage Garbage Collector
Tanda tangan digital buku tamu dan berkas gambar dipisahkan ke dalam tabel `mediaBlobs`. Modul `StorageCleaner` memindai referensi aktif di basis data dan secara otomatis memusnahkan blob yatim (*orphaned blobs*) guna mencegah pembengkakan memori peramban.

### F. Kebijakan Ketat 1 Super Admin & Hak Akses Berjenjang
1. **Super Admin Utama:** Akun tunggal Kepala Sekolah bersifat permanen (*undeletable & invariable*).
2. **Penerbitan Akun Guru:** Akun untuk guru dan tendik dibuatkan secara terkontrol oleh Super Admin melalui panel manajemen pengguna terintegrasi.
3. **Isolasi Modul:** Arsip digital dinas Google Drive dan pusat pengaturan sistem dilindungi dengan pemeriksaan hak akses berlapis.

---

## 4. Matriks Pengujian Otomatis

Seluruh logika terdistribusi diuji secara otomatis melalui test suite terpadu di `tests/run_all_tests.mjs`:
1. **Kriptografi & Cache:** Hash PBKDF2 SHA-256 (100.000 iterasi) & in-memory LRU cache.
2. **Outbox Coalescing:** Pemadatan create+update dan pembersihan create+delete.
3. **Batch Upsert Partitioning:** Pemisahan payload array massal per tabel domain.
4. **Skema Dexie v2 & Compound Index:** Indeks majemuk `[statusSiswa+tingkatKelas]` & isolasi `mediaBlobs`.
5. **Deduplikasi Pesan Broadcast:** Penyaringan ID pesan lintas tab & jendela.
6. **Kebijakan 1 Super Admin:** Proteksi akun permanen dan penolakan admin ganda.
7. **Field-Level 3-Way Merger:** Resolusi konflik kolom mandiri.
8. **Kompresi Gzip Stream:** Pengujian round-trip kompresi dan dekompresi data sekolah.
9. **Garbage Collection:** Identifikasi dan pembersihan berkas blob yatim.
10. **Stress Test Beban Tinggi:** 300 mutasi serentak diproses dalam < 100ms (3ms empiris).
