<div align="center">

<img src="./public/logo.png" alt="Logo SD Inpres Lonrong" width="120" height="120" />

# Sistem Manajemen Administrasi Sekolah Terpadu
### **SD INPRES LONRONG — KABUPATEN BANTAENG**
**NPSN: 40304087 • Akreditasi A (Unggul) • Kurikulum Merdeka**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Dexie.js](https://img.shields.io/badge/Dexie.js-IndexedDB-black?logo=indexeddb&logoColor=white)](https://dexie.com/)
[![Design: Apple HIG](https://img.shields.io/badge/UI_Design-Apple_HIG_Solid-0071E3)](https://developer.apple.com/design/human-interface-guidelines)
[![Security: Sanitized](https://img.shields.io/badge/Security-Sanitized_0_Leaks-34C759)](#-keamanan--privasi)

<p align="center">
  Aplikasi tata kelola administrasi sekolah dasar modern dengan arsitektur <b>Offline-First</b>, sinkronisasi otomatis real-time, standar data Kurikulum Merdeka Kemendikbudristek, dan antarmuka premium <b>Apple Human Interface Guidelines (Solid Colors, Zero Gradients)</b>.
</p>

[Tentang Aplikasi](#-tentang-aplikasi) • [Fitur Utama](#-fitur-utama) • [Arsitektur Teknis](#-arsitektur-teknis) • [Panduan Instalasi](#-panduan-instalasi) • [Akun Demo](#-akun-demo-pengujian) • [Profil Sekolah](#-profil-institusi-resmi) • [Lisensi](#-lisensi)

</div>

---

## 📖 Tentang Aplikasi (About)

**Sistem Manajemen Administrasi SD Inpres Lonrong** adalah platform digital komprehensif yang dirancang khusus untuk memenuhi kebutuhan tata kelola administrasi Sekolah Dasar di Indonesia, merujuk pada standar resmi **Data Pokok Pendidikan (Dapodik) Kemendikdasmen** dan regulasi **Kurikulum Merdeka**.

Aplikasi ini mengatasi kendala konektivitas internet yang fluktuatif di lingkungan sekolah melalui arsitektur **Offline-First (IndexedDB)**. Seluruh data peserta didik, jam mengajar guru, aset sarpras, e-filing, dan jurnal kinerja tersimpan aman di peramban lokal dan dapat disinkronkan secara otomatis begitu perangkat terhubung ke jaringan internet.

### Nilai Utama:
- **Ketepatan Data Pendidikan**: Menghilangkan data dummy dengan struktur data autentik sesuai jenjang Fase A (Kelas 1–2), Fase B (Kelas 3–4), dan Fase C (Kelas 5–6).
- **Efisiensi Administrasi Guru & Tenaga Kependidikan**: Memudahkan pencatatan aktivitas harian untuk bukti dukung SKP E-Kinerja BKN dengan validasi 1-klik Kepala Sekolah.
- **Desain Kelas Industri (Craftsman-Grade)**: Menghilangkan elemen visual kecerdasan buatan sintetis (*anti-slop AI*), menggantikan warna gradasi dengan palet solid Apple HIG berstandar aksesibilitas tinggi (WCAG 2.2 AA).

---

## ✨ Fitur Utama

### 1. 📊 Dashboard Eksekutif Real-Time
- **Bento Metric Cards Interaktif**: 4 kartu ringkasan eksekutif (Peserta Didik, Pendidik & Tendik, Inventaris Sarpras, dan E-Kinerja/Buku Tamu) yang dilengkapi *sub-metric chips* dan navigasi langsung ke modul masing-masing.
- **Toolbar Aksi Cepat Administrasi**: Tombol jalan pintas untuk menambah siswa baru, mencatat buku tamu, menulis jurnal E-Kinerja, dan mengunggah arsip ke Google Drive.
- **Demografi Peserta Didik Stacked Bar**: Visualisasi rasio gender siswa (Laki-laki solid blue `#0071E3`, Perempuan solid indigo `#5856D6`) per rombel kelas.
- **Distribusi Aset Inventaris (KIB)**: Donut chart interaktif klasifikasi KIB B (Peralatan TIK & Mesin), KIB C (Gedung & Ruang), dan KIB E (Buku Kurikulum & APE).
- **Indikator Beban Ajar Guru (JJM)**: Monitoring kepatuhan minimal 24 Jam Tatap Muka per minggu sesuai regulasi sertifikasi guru Kemdikbud.
- **Live Activity Feed**: Pemantauan aktivitas real-time dengan tombol **1-Klik Setujui E-Kinerja** langsung untuk Kepala Sekolah.

### 2. 🎓 Manajemen Siswa & Alumni
- **Buku Induk Elektronik**: Pengelolaan data lengkap peserta didik (NISN, NIK, nama orang tua, tempat/tanggal lahir, alamat, dan fase pembelajaran).
- **Filter Berjenjang**: Pengelompokan siswa aktif berdasarkan kelas 1 s/d 6, riwayat mutasi masuk/keluar, dan direktori alumni.
- **Ekspor Dokumen Resmi**: Cetak laporan Buku Induk Siswa berformat **PDF resmi** (lengkap dengan kop sekolah, nomor NPSN, dan lembar pengesahan) serta ekspor tabel **Excel Spreadsheet (.xlsx)** melalui SheetJS.
- **Import Massal Excel**: Memungkinkan pengunggahan data rombel baru dalam jumlah banyak sekaligus.

### 3. 👨‍🏫 Kepegawaian & Beban Ajar (GTK)
- **Database Tenaga Pendidik & Kependidikan**: Rincian profil GTK, NIP/NUPTK, pangkat/golongan, jabatan, dan status formasi (PNS, PPPK, Honorer Daerah).
- **Distribusi Jam Mengajar (Beban Ajar)**: Alokasi mata pelajaran tematik dan mapel khusus (PAI, PJOK) dengan bilah pemantauan target 24 JJM.
- **Kontak Terintegrasi**: Tautan langsung ke nomor WhatsApp resmi setiap guru dan staf tenaga kependidikan (`wa.me`).

### 4. 📦 Inventaris Sarana & Prasarana (Sarpras)
- **Klasifikasi Standar KIB A–E**: Pencatatan tanah (KIB A), perangkat komputer/Chromebook/proyektor (KIB B), bangunan sekolah (KIB C), dan buku teks Kurikulum Merdeka (KIB E).
- **Pelacakan Sumber Dana**: Pengelompokan aset berdasarkan sumber perolehan (BOS Reguler, BOS Kinerja, DAK Fisik, Hibah Pemkab Bantaeng).
- **Generator Label QR Code**: Pembuatan kode QR otomatis untuk setiap unit aset guna memudahkan inventarisasi fisik di lapangan.

### 5. 📁 E-Filing Google Drive (Arsip Digital)
- **Penyimpanan Terstruktur**: Direktori digital khusus untuk SK Penetapan Kepala Sekolah, SK Pembagian Tugas Mengajar (PBM), Sertifikat Pendidik (Serdik), dan Ijazah Pegawai.
- **Integrasi Cloud**: Penautan langsung dengan Google Drive untuk akses cepat dokumen arsip pegawai.
- **Metadata Lengkap**: Pencatatan nomor SK dinas, tanggal unggah, serta ukuran file PDF resmi.

### 6. 📝 Jurnal & Program Kerja Harian (E-Kinerja)
- **Bukti Sasaran Kinerja Pegawai (SKP BKN)**: Catatan waktu, rincian aktivitas mengajar/administrasi harian, hasil output kerja, dan lampiran Google Drive.
- **Sistem Verifikasi Berjenjang**: Status pengajuan terpantau (*Menunggu Verifikasi*, *Disetujui*, *Perlu Revisi*) dengan kotak catatan evaluasi Kepala Sekolah.
- **Cetak Rekap Bulanan**: Pembuatan dokumen rekapitulasi kinerja pegawai bulanan siap cetak dalam format PDF.

### 7. 📖 Buku Tamu Digital & Kiosk Mode
- **Resepsionis Digital**: Pencatatan kunjungan kedinasan (Dinas Pendidikan Kab. Bantaeng), Pengawas Sekolah Pembina, wali murid, dan mitra sekolah.
- **Layar Kiosk Tamu (iPad / Tablet)**: Antarmuka mandiri bagi tamu front office untuk mengisi formulir kehadiran.
- **Tanda Tangan Digital**: Canvas penandatanganan digital berakurasi tinggi menggunakan SignaturePad.

### 8. 🔐 Smart Multi-User Login & Keamanan Peran
- **Role-Based Access Control (RBAC)**: Pembagian hak akses yang tegas untuk **Super Admin / Kepala Sekolah**, **Tenaga Administrasi / Operator**, dan **Dewan Guru**.
- **Autentikasi Ganda**: Mendukung login dengan kredensial kata sandi maupun autentikasi cepat 4-digit PIN Pad untuk efisiensi di ruang guru.

---

## 🛠️ Arsitektur Teknis

```
sd-inpres-lonrong/
├── src/
│   ├── config/
│   │   └── school_profile.ts     # Profil resmi Dapodik SD Inpres Lonrong
│   ├── db/
│   │   ├── local_db.ts           # Skema Dexie.js (IndexedDB lokal)
│   │   ├── seed_data.ts          # Data inisialisasi awal kurikulum & GTK
│   │   └── sync_engine.ts        # Mesin sinkronisasi real-time & outbox
│   ├── modules/
│   │   ├── auth/                 # Layanan autentikasi & tampilan login
│   │   ├── dashboard/            # Panel eksekutif & visualisasi Chart.js
│   │   ├── siswa/                # Buku induk siswa, mutasi & ekspor laporan
│   │   ├── kepegawaian/          # Profil GTK & manajemen beban ajar (JJM)
│   │   ├── sarpras/              # Inventaris KIB A-E & generator QR code
│   │   ├── efiling/              # Arsip dokumen digital Google Drive
│   │   ├── jurnal/               # Jurnal harian bukti dukung E-Kinerja
│   │   └── bukutamu/             # Buku tamu front office & kiosk tablet
│   ├── styles/
│   │   └── apple_design.css      # Design system Apple HIG solid tokens
│   ├── utils/
│   │   └── export_helper.ts      # Engine ekspor jsPDF AutoTable & SheetJS
│   └── main.ts                   # Router SPA & inisialisasi aplikasi
├── public/                       # Aset logo Tut Wuri Handayani & profil
├── .env.example                  # Template variabel lingkungan aman
├── .gitignore                    # Proteksi kebocoran kredensial & node_modules
├── tsconfig.json                 # Konfigurasi TypeScript ketat
└── vite.config.ts                # Bundler Vite produksi
```

---

## 🚀 Panduan Instalasi (Quick Start)

### Prasyarat
- **Node.js** versi 18.x atau lebih baru
- **npm** versi 9.x atau lebih baru

### Langkah Pemasangan:

1. **Clone Repositori**:
   ```bash
   git clone https://github.com/Kahfi10/school-management-sd-inpres-lonrong.git
   cd school-management-sd-inpres-lonrong
   ```

2. **Pasang Dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan Server Pengembangan Lokal**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan secara lokal di: `http://localhost:3000/`

4. **Kompilasi Bundel Produksi**:
   ```bash
   npm run build
   ```

---

## 🔑 Akun Demo Pengujian

Aplikasi telah dilengkapi dengan akun demo internal yang tersimpan pada penyimpanan lokal browser (IndexedDB):

| Peran (Role) | Username | Kata Sandi | PIN Akses | Hak Akses Utama |
| :--- | :--- | :--- | :---: | :--- |
| **Super Admin / Kepsek** | `admin` | `admin123` | `1234` | Akses penuh, persetujuan E-Kinerja, mutasi siswa, & pengelolaan arsip. |
| **Tendik / Operator** | `tendik` | `tendik123` | `1234` | Manajemen Dapodik, input siswa massal, inventaris sarpras, & buku tamu. |
| **Dewan Guru** | `guru` | `guru123` | `1234` | Pengisian jurnal harian E-Kinerja, jadwal mengajar, & rekap kelas. |

---

## 🛡️ Keamanan & Privasi (20 Pilar Standar Keamanan)

Aplikasi ini menerapkan arsitektur **Defense-in-Depth** tingkat industri dengan implementasi penuh pada 20 pilar keamanan:

| No | Pilar Keamanan | Mekanisme & Implementasi Teknis |
| :-: | :--- | :--- |
| **1** | **Rate Limit API** | Token-Bucket sliding window (maks 5 percobaan/menit) mencegah brute-force login dan flooding. |
| **2** | **CORS Ketat** | Konfigurasi header same-origin ketat dan pembatasan origin eksternal pada sync engine. |
| **3** | **Proteksi CSRF** | Token kriptografis acak UUID divalidasi pada setiap transaksi outbox dan mutasi data. |
| **4** | **Cegah SSRF** | Whitelist domain resmi (Google Drive, WhatsApp) dan pemblokiran total IP privat/loopback/cloud metadata. |
| **5** | **Path Traversal** | Sanitasi regex pada nama berkas ekspor (`export_helper.ts`) menghapus karakter traversal (`../`, `\0`, dll.). |
| **6** | **Validasi Input API** | Validasi regex ketat untuk NISN (10 digit), NIK (16 digit), NIP, nomor SK, dan tipe data numerik. |
| **7** | **Validasi Output (Anti-XSS)** | Sanitasi seluruh teks dinamis menggunakan **DOMPurify 3.2.4** dan HTML entity escaping. |
| **8** | **Admin Route Aman (RBAC)** | Route Guard membatasi akses modul administratif khusus Super Admin (Kepala Sekolah) dan Tendik. |
| **9** | **Kriptografi Password Hashing** | Menggantikan teks polos dengan **Web Crypto API PBKDF2/SHA-256** ber-salt 100.000 iterasi. |
| **10**| **Audit Log Terpusat** | Merekam setiap aktivitas login, mutasi, dan ekspor dengan tanda tangan digital SHA-256 anti-repudiasi. |
| **11**| **Verifikasi Webhook** | Verifikasi tanda tangan kriptografis **HMAC-SHA256** pada sinkronisasi outbox. |
| **12**| **Validasi Anggaran BOS/DAK** | Pemeriksaan batas harga dan unit inventaris (`>= 0`) untuk mencegah manipulasi nilai anggaran sekolah. |
| **13**| **Data Anti-Tamper Checksum** | Digest SHA-256 untuk mendeteksi perubahan data tidak sah langsung pada IndexedDB browser. |
| **14**| **Pencegahan IDOR** | Ownership guard: Dewan Guru hanya dapat menyunting jurnal kinerja milik pribadi. |
| **15**| **Log Sanitasi & Proteksi PII** | Masking data pribadi siswa dan GTK (NIK: `7303******0001`, telepon: `0812****8823`). |
| **16**| **Private Source Map** | Vite build disetel `sourcemap: false` untuk mencegah kebocoran kode sumber di browser DevTools. |
| **17**| **Audit Dependensi Bersih** | Audit NPM diverifikasi **0 Vulnerabilities** (bebas dari celah keamanan pustaka pihak ketiga). |
| **18**| **Mesin Backup & Restore** | Cadangan database JSON terverifikasi tanda tangan digital & pemulihan terproteksi kecocokan NPSN. |
| **19**| **HTTP Security Headers** | Header CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` di meta tag, `_headers`, & `vercel.json`. |
| **20**| **Pengujian Keamanan Otomatis** | Suite pengujian live bawaan (**Security Center Modal**) yang menguji ke-20 pilar secara instan. |

---

## 🏫 Profil Institusi Resmi

| Komponen | Data Referensi Kemendikdasmen |
| :--- | :--- |
| **Nama Sekolah** | **SD INPRES LONRONG** |
| **NPSN** | **40304087** |
| **Bentuk Pendidikan** | Sekolah Dasar (SD) Negeri |
| **Status Akreditasi** | A (Unggul) — Nilai: 91 |
| **Kurikulum** | Kurikulum Merdeka |
| **Alamat** | Jl. Dongkokang, Desa Lonrong, Kec. Eremerasa |
| **Kabupaten / Provinsi**| Kab. Bantaeng, Sulawesi Selatan (Kode Pos: 92415) |
| **Kepala Sekolah** | Drs. H. Syamsuddin, M.Pd. (NIP: 19680512 199307 1 002) |
| **Tautan Referensi** | [Data Pokok Pendidikan Kemendikbud](https://referensi.data.kemendikdasmen.go.id/pendidikan/npsn/40304087) |

---

## 📄 Lisensi (License)

Proyek ini didistribusikan di bawah lisensi **MIT License**. Hak cipta dilindungi undang-undang:
```text
Copyright (c) 2026 Kahfi10 (ashabulk265@gmail.com)
SD Inpres Lonrong - Sistem Manajemen Administrasi Sekolah Terpadu
```
Silakan merujuk ke berkas [LICENSE](./LICENSE) untuk ketentuan penggunaan dan distribusi perangkat lunak selengkapnya.
