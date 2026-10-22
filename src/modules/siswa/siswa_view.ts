import { db, type SiswaRecord, type MutasiRecord } from '../../db/local_db';
import { syncEngine } from '../../db/sync_engine';
import { SD_LONRONG_PROFILE } from '../../config/school_profile';
import { exportDataToExcel, exportDocToPdf, applyAutoTable } from '../../utils/export_helper';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

export async function renderSiswaView(container: HTMLElement) {
  let currentFilter = 'aktif';
  let currentClassFilter: number | null = null;
  let searchQuery = '';

  async function loadData() {
    let query = db.siswa.toCollection();

    if (currentFilter === 'aktif') {
      query = db.siswa.where('statusSiswa').equals('aktif');
    } else if (currentFilter === 'lulus') {
      query = db.siswa.where('statusSiswa').equals('lulus');
    } else if (currentFilter === 'mutasi_keluar') {
      query = db.siswa.where('statusSiswa').equals('mutasi_keluar');
    }

    let list = await query.toArray();

    if (currentClassFilter !== null && currentFilter === 'aktif') {
      list = list.filter((s) => s.tingkatKelas === currentClassFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.namaLengkap.toLowerCase().includes(q) ||
          s.nisn.includes(q) ||
          s.nik.includes(q) ||
          s.alamat.toLowerCase().includes(q)
      );
    }

    return list;
  }

  async function renderTable() {
    const list = await loadData();
    const tableBody = container.querySelector('#siswaTableBody') as HTMLElement;
    const totalCountEl = container.querySelector('#totalSiswaCount') as HTMLElement;

    if (totalCountEl) {
      totalCountEl.textContent = `${list.length} Siswa Terdaftar`;
    }

    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: var(--apple-text-tertiary);">
            <div style="width: 40px; height: 40px; margin: 0 auto 0.75rem auto; border-radius: 50%; background: var(--apple-surface-tertiary); display: flex; align-items: center; justify-content: center; color: var(--apple-text-tertiary);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <div style="font-weight: 700; color: var(--apple-text-primary); font-size: 0.95rem;">Tidak Ada Data Siswa</div>
            <div style="font-size: 0.78rem; margin-top: 0.2rem;">Sesuaikan filter kelas atau kata kunci pencarian.</div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = list
      .map(
        (s, idx) => `
      <tr>
        <td style="font-weight: 600; color: var(--apple-text-tertiary); width: 36px;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: var(--apple-text-primary); font-size: 0.94rem;">${s.namaLengkap}</div>
          <div style="font-size: 0.78rem; color: var(--apple-text-tertiary); font-family: var(--font-family-mono); margin-top: 2px;">
            NISN: ${s.nisn} • NIK: ${s.nik}
          </div>
        </td>
        <td>
          <span class="status-pill ${s.jenisKelamin === 'L' ? 'info' : 'neutral'}" style="font-size: 0.76rem;">
            ${s.jenisKelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}
          </span>
        </td>
        <td>
          <div style="font-weight: 700; font-size: 0.9rem; color: var(--apple-text-primary);">Kelas ${s.tingkatKelas}</div>
          <div style="font-size: 0.75rem; color: var(--apple-text-secondary);">Fase ${s.tingkatKelas <= 2 ? 'A' : s.tingkatKelas <= 4 ? 'B' : 'C'} (Kurikulum Merdeka)</div>
        </td>
        <td>
          <div style="font-size: 0.86rem; color: var(--apple-text-primary); font-weight: 500;">${s.tempatLahir}, ${s.tanggalLahir}</div>
          <div style="font-size: 0.76rem; color: var(--apple-text-secondary);">Ibu: <strong>${s.namaIbu}</strong></div>
        </td>
        <td>
          <span class="status-pill ${
            s.statusSiswa === 'aktif' ? 'success' : s.statusSiswa === 'lulus' ? 'neutral' : 'danger'
          }">
            ${s.statusSiswa === 'aktif' ? 'Aktif' : s.statusSiswa === 'lulus' ? 'Alumni' : 'Pindah/Mutasi'}
          </span>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 0.45rem;">
            <button class="apple-btn apple-btn-secondary btn-action-mutasi" data-id="${s.id}" style="padding: 0.35rem 0.65rem; font-size: 0.78rem; font-weight: 600;">
              Mutasi
            </button>
            <button class="apple-btn apple-btn-ghost btn-action-delete" data-id="${s.id}" style="padding: 0.35rem 0.55rem; font-size: 0.78rem; color: var(--apple-red);">
              Hapus
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');

    // Attach row events
    container.querySelectorAll('.btn-action-mutasi').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id) openMutasiModal(id);
      });
    });

    container.querySelectorAll('.btn-action-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id && confirm('Yakin ingin menghapus data siswa ini?')) {
          await db.siswa.delete(id);
          await syncEngine.queueMutation('siswa', id, 'delete', { id });
          renderTable();
        }
      });
    });
  }

  container.innerHTML = `
    <div class="page-container">
      <!-- Header Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.35rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.4rem; font-weight: 700; letter-spacing: -0.015em;">Manajemen Siswa & Alumni</h1>
          <p style="font-size: 0.82rem; color: var(--apple-text-secondary); margin-top: 0.15rem;">
            Buku Induk Elektronik Peserta Didik SD Inpres Lonrong
          </p>
        </div>
        <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
          <button class="apple-btn apple-btn-secondary" id="btnExportExcel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export Excel
          </button>
          <button class="apple-btn apple-btn-secondary" id="btnCetakPDF">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Cetak PDF
          </button>
          <button class="apple-btn apple-btn-secondary" id="btnImportExcel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Import Excel
          </button>
          <button class="apple-btn apple-btn-primary" id="btnTambahSiswa">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Tambah Siswa
          </button>
        </div>
      </div>

      <!-- Informative Metrics Summary Strip -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; margin-bottom: 1.15rem;">
        <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
          <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Total Siswa Aktif</div>
          <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-text-primary); margin: 2px 0;">12 <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Siswa</span></div>
          <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">7 Laki-Laki • 5 Perempuan • 100% Terdaftar</div>
        </div>
        <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
          <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Fase A (Kelas 1-2)</div>
          <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-blue); margin: 2px 0;">4 <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Siswa</span></div>
          <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Fondasi Literasi & Numerasi Awal</div>
        </div>
        <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
          <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Fase B (Kelas 3-4)</div>
          <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-green); margin: 2px 0;">4 <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Siswa</span></div>
          <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Penguatan Kompetensi & Projek P5</div>
        </div>
        <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
          <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Fase C (Kelas 5-6)</div>
          <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-orange); margin: 2px 0;">4 <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Siswa</span></div>
          <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Persiapan Kelulusan & Transisi SMP</div>
        </div>
      </div>

      <!-- Segmented Status & Class Filter -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.15rem; flex-wrap: wrap; gap: 0.75rem;">
        <div class="apple-segmented-control" id="statusFilterControl">
          <button class="segment-btn active" data-filter="aktif">Siswa Aktif</button>
          <button class="segment-btn" data-filter="lulus">Alumni / Lulus</button>
          <button class="segment-btn" data-filter="mutasi_keluar">Mutasi Keluar</button>
        </div>

        <div class="apple-segmented-control" id="classFilterControl">
          <button class="segment-btn active" data-class="all">Semua Kelas</button>
          <button class="segment-btn" data-class="1">Kelas 1</button>
          <button class="segment-btn" data-class="2">Kelas 2</button>
          <button class="segment-btn" data-class="3">Kelas 3</button>
          <button class="segment-btn" data-class="4">Kelas 4</button>
          <button class="segment-btn" data-class="5">Kelas 5</button>
          <button class="segment-btn" data-class="6">Kelas 6</button>
        </div>
      </div>

      <!-- Table Container -->
      <div class="apple-table-card">
        <div class="table-toolbar">
          <div class="table-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--apple-text-tertiary);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="inputSearchSiswa" placeholder="Cari nama, NISN, NIK, alamat..." />
          </div>
          <div id="totalSiswaCount" style="font-size: 0.78rem; font-weight: 600; color: var(--apple-text-secondary);">
            Memuat data...
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table class="apple-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Peserta Didik</th>
                <th>Gender</th>
                <th>Tingkat Kelas</th>
                <th>Kelahiran & Orang Tua</th>
                <th>Status</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="siswaTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form Tambah Siswa -->
    <div class="modal-backdrop" id="modalTambahSiswa">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 style="font-size: 1.05rem; font-weight: 700;">Tambah Peserta Didik Baru</h3>
          <button class="apple-btn apple-btn-ghost btn-close-modal" style="padding: 0.3rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <form id="formTambahSiswa">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="apple-input-group">
                <label class="apple-label">NISN (10 Digit) *</label>
                <input type="text" class="apple-input" name="nisn" required placeholder="Contoh: 0189123401" maxlength="10" />
              </div>
              <div class="apple-input-group">
                <label class="apple-label">NIK Siswa (16 Digit) *</label>
                <input type="text" class="apple-input" name="nik" required placeholder="Contoh: 730303..." maxlength="16" />
              </div>
            </div>

            <div class="apple-input-group">
              <label class="apple-label">Nama Lengkap Siswa *</label>
              <input type="text" class="apple-input" name="namaLengkap" required placeholder="Nama lengkap sesuai akta kelahiran" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
              <div class="apple-input-group">
                <label class="apple-label">Jenis Kelamin *</label>
                <select class="apple-select" name="jenisKelamin" required>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Tingkat Kelas *</label>
                <select class="apple-select" name="tingkatKelas" required>
                  <option value="1">Kelas 1 (Fase A)</option>
                  <option value="2">Kelas 2 (Fase A)</option>
                  <option value="3">Kelas 3 (Fase B)</option>
                  <option value="4">Kelas 4 (Fase B)</option>
                  <option value="5">Kelas 5 (Fase C)</option>
                  <option value="6">Kelas 6 (Fase C)</option>
                </select>
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Tahun Masuk</label>
                <input type="number" class="apple-input" name="tahunMasuk" value="2025" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="apple-input-group">
                <label class="apple-label">Tempat Lahir</label>
                <input type="text" class="apple-input" name="tempatLahir" value="Bantaeng" />
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Tanggal Lahir</label>
                <input type="date" class="apple-input" name="tanggalLahir" required value="2018-05-01" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="apple-input-group">
                <label class="apple-label">Nama Ibu Kandung *</label>
                <input type="text" class="apple-input" name="namaIbu" required placeholder="Nama ibu kandung" />
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Nama Ayah</label>
                <input type="text" class="apple-input" name="namaAyah" placeholder="Nama ayah kandung" />
              </div>
            </div>

            <div class="apple-input-group">
              <label class="apple-label">Alamat Tempat Tinggal</label>
              <input type="text" class="apple-input" name="alamat" value="Desa Lonrong, Kec. Eremerasa, Bantaeng" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="apple-btn apple-btn-secondary btn-close-modal">Batal</button>
            <button type="submit" class="apple-btn apple-btn-primary">Simpan Siswa</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Import Excel Massal -->
    <div class="modal-backdrop" id="modalImportExcel">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 style="font-size: 1.05rem; font-weight: 700;">Import Siswa Massal via Excel</h3>
          <button class="apple-btn apple-btn-ghost btn-close-modal" style="padding: 0.3rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.82rem; color: var(--apple-text-secondary); margin-bottom: 1rem;">
            Unggah file spreadsheet (.xlsx/.csv) sesuai dengan format standar Dapodik SD Inpres Lonrong.
          </p>

          <div style="background: var(--apple-surface-secondary); border: 1px dashed var(--apple-border-strong); border-radius: var(--radius-md); padding: 1.5rem; text-align: center; margin-bottom: 1.25rem;">
            <input type="file" id="fileInputExcel" accept=".xlsx, .xls, .csv" style="display: none;" />
            <button class="apple-btn apple-btn-primary" id="btnSelectExcelFile" type="button">
              Pilih Berkas Excel
            </button>
            <div id="selectedFileName" style="font-size: 0.78rem; color: var(--apple-text-secondary); margin-top: 0.5rem;">
              Belum ada berkas dipilih
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: var(--radius-sm); background: var(--apple-surface-tertiary);">
            <span style="font-size: 0.78rem; font-weight: 600;">Format berkas impor standar</span>
            <button class="apple-btn apple-btn-secondary" id="btnDownloadTemplateExcel" style="font-size: 0.72rem; padding: 0.3rem 0.65rem;">
              Unduh Template (.xlsx)
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="apple-btn apple-btn-secondary btn-close-modal">Tutup</button>
          <button type="button" class="apple-btn apple-btn-primary" id="btnProcessImport" disabled>Proses Import</button>
        </div>
      </div>
    </div>

    <!-- Modal Mutasi Siswa -->
    <div class="modal-backdrop" id="modalMutasiSiswa">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 style="font-size: 1.05rem; font-weight: 700;">Proses Mutasi / Kelulusan Siswa</h3>
          <button class="apple-btn apple-btn-ghost btn-close-modal" style="padding: 0.3rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <form id="formMutasiSiswa">
          <input type="hidden" name="mutasiSiswaId" id="mutasiSiswaId" />
          <div class="modal-body">
            <div id="mutasiSiswaDetail" style="padding: 0.75rem; border-radius: var(--radius-sm); background: var(--apple-surface-tertiary); margin-bottom: 1rem; font-size: 0.82rem;"></div>

            <div class="apple-input-group">
              <label class="apple-label">Jenis Status Mutasi *</label>
              <select class="apple-select" name="jenisMutasi" required>
                <option value="mutasi_keluar">Mutasi Keluar (Pindah Sekolah)</option>
                <option value="lulus">Lulus / Alumni</option>
              </select>
            </div>

            <div class="apple-input-group">
              <label class="apple-label">Tanggal Mutasi / Kelulusan *</label>
              <input type="date" class="apple-input" name="tanggalMutasi" required value="${new Date().toISOString().split('T')[0]}" />
            </div>

            <div class="apple-input-group">
              <label class="apple-label">Sekolah Tujuan (Jika Mutasi Keluar)</label>
              <input type="text" class="apple-input" name="sekolahTujuan" placeholder="Contoh: SDN 1 Lembang Bantaeng" />
            </div>

            <div class="apple-input-group">
              <label class="apple-label">Alasan Mutasi</label>
              <input type="text" class="apple-input" name="alasan" placeholder="Mengikuti kepindahan orang tua" />
            </div>

            <div class="apple-input-group">
              <label class="apple-label">Nomor Surat Mutasi Resmi</label>
              <input type="text" class="apple-input" name="noSurat" value="421.2/024/SDI-LON/VII/2025" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="apple-btn apple-btn-secondary btn-close-modal">Batal</button>
            <button type="submit" class="apple-btn apple-btn-primary">Simpan Mutasi</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Attach Filter Listeners
  container.querySelectorAll('#statusFilterControl .segment-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('#statusFilterControl .segment-btn').forEach((b) => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
      currentFilter = (e.currentTarget as HTMLElement).dataset.filter || 'aktif';
      renderTable();
    });
  });

  container.querySelectorAll('#classFilterControl .segment-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('#classFilterControl .segment-btn').forEach((b) => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
      const val = (e.currentTarget as HTMLElement).dataset.class;
      currentClassFilter = val === 'all' ? null : parseInt(val || '1');
      renderTable();
    });
  });

  // Search input
  const searchInput = container.querySelector('#inputSearchSiswa') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderTable();
  });

  // Modals management
  const modalTambah = container.querySelector('#modalTambahSiswa') as HTMLElement;
  const modalImport = container.querySelector('#modalImportExcel') as HTMLElement;
  const modalMutasi = container.querySelector('#modalMutasiSiswa') as HTMLElement;

  container.querySelector('#btnTambahSiswa')?.addEventListener('click', () => {
    modalTambah.classList.add('active');
  });

  container.querySelector('#btnImportExcel')?.addEventListener('click', () => {
    modalImport.classList.add('active');
  });

  container.querySelectorAll('.btn-close-modal').forEach((btn) => {
    btn.addEventListener('click', () => {
      modalTambah.classList.remove('active');
      modalImport.classList.remove('active');
      modalMutasi.classList.remove('active');
    });
  });

  // Handle Form Tambah Siswa
  const formTambah = container.querySelector('#formTambahSiswa') as HTMLFormElement;
  formTambah?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formTambah);
    const nisn = formData.get('nisn') as string;

    const existing = await db.siswa.where('nisn').equals(nisn).first();
    if (existing) {
      alert(`Siswa dengan NISN ${nisn} sudah terdaftar (${existing.namaLengkap}).`);
      return;
    }

    const newSiswa: SiswaRecord = {
      id: `sis_${Date.now()}`,
      nisn,
      nik: formData.get('nik') as string,
      namaLengkap: formData.get('namaLengkap') as string,
      jenisKelamin: formData.get('jenisKelamin') as 'L' | 'P',
      tempatLahir: formData.get('tempatLahir') as string,
      tanggalLahir: formData.get('tanggalLahir') as string,
      namaIbu: formData.get('namaIbu') as string,
      namaAyah: (formData.get('namaAyah') as string) || '-',
      alamat: (formData.get('alamat') as string) || SD_LONRONG_PROFILE.desaKelurahan,
      rombelId: `rmb-0${formData.get('tingkatKelas')}`,
      tingkatKelas: parseInt(formData.get('tingkatKelas') as string),
      statusSiswa: 'aktif',
      tahunMasuk: parseInt(formData.get('tahunMasuk') as string) || 2025,
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
    };

    await db.siswa.add(newSiswa);
    await syncEngine.queueMutation('siswa', newSiswa.id, 'create', newSiswa);
    confetti({ particleCount: 40, spread: 50 });
    modalTambah.classList.remove('active');
    formTambah.reset();
    renderTable();
  });

  // Open Mutasi Modal
  async function openMutasiModal(siswaId: string) {
    const s = await db.siswa.get(siswaId);
    if (!s) return;
    (container.querySelector('#mutasiSiswaId') as HTMLInputElement).value = s.id;
    (container.querySelector('#mutasiSiswaDetail') as HTMLElement).innerHTML = `
      <strong>${s.namaLengkap}</strong> (NISN: ${s.nisn})<br/>
      Kelas ${s.tingkatKelas} • Status: <span class="status-pill ${s.statusSiswa === 'aktif' ? 'success' : 'neutral'}">${s.statusSiswa}</span>
    `;
    modalMutasi.classList.add('active');
  }

  // Handle Form Mutasi
  const formMutasi = container.querySelector('#formMutasiSiswa') as HTMLFormElement;
  formMutasi?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formMutasi);
    const siswaId = formData.get('mutasiSiswaId') as string;
    const jenis = formData.get('jenisMutasi') as 'mutasi_keluar' | 'lulus';

    const siswa = await db.siswa.get(siswaId);
    if (!siswa) return;

    await db.siswa.update(siswaId, {
      statusSiswa: jenis,
      tahunLulus: jenis === 'lulus' ? new Date().getFullYear() : undefined,
      updatedAt: new Date().toISOString(),
    });

    const mutasiRecord: MutasiRecord = {
      id: `mut_${Date.now()}`,
      siswaId,
      namaSiswa: siswa.namaLengkap,
      nisn: siswa.nisn,
      jenisMutasi: jenis === 'mutasi_keluar' ? 'keluar' : 'lulus',
      tanggalMutasi: formData.get('tanggalMutasi') as string,
      sekolahAsalTujuan: (formData.get('sekolahTujuan') as string) || '-',
      alasan: (formData.get('alasan') as string) || 'Selesai masa belajar / mutasi',
      noSurat: (formData.get('noSurat') as string) || '-',
      syncStatus: 'synced',
    };

    await db.mutasiSiswa.add(mutasiRecord);
    await syncEngine.queueMutation('mutasiSiswa', mutasiRecord.id, 'create', mutasiRecord);
    modalMutasi.classList.remove('active');
    renderTable();
  });

  // Handle Download Excel Template
  container.querySelector('#btnDownloadTemplateExcel')?.addEventListener('click', () => {
    const templateData = [
      {
        NISN: '0189123499',
        NIK: '7303031205180099',
        'Nama Lengkap': 'Contoh Siswa Baru',
        'Jenis Kelamin (L/P)': 'L',
        'Tingkat Kelas (1-6)': 1,
        'Tempat Lahir': 'Bantaeng',
        'Tanggal Lahir (YYYY-MM-DD)': '2018-06-15',
        'Nama Ibu': 'Ibu Contoh',
        'Nama Ayah': 'Ayah Contoh',
        Alamat: 'Desa Lonrong, Kec. Eremerasa',
      },
    ];

    exportDataToExcel(templateData, 'Template_Siswa', 'Template_Import_Siswa_SD_Inpres_Lonrong');
  });

  // Handle Excel File Selection & Parse
  const fileInput = container.querySelector('#fileInputExcel') as HTMLInputElement;
  const selectFileBtn = container.querySelector('#btnSelectExcelFile') as HTMLElement;
  const selectedNameEl = container.querySelector('#selectedFileName') as HTMLElement;
  const processImportBtn = container.querySelector('#btnProcessImport') as HTMLButtonElement;
  let parsedExcelData: any[] = [];

  selectFileBtn?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    selectedNameEl.textContent = `Memeriksa: ${file.name} (${Math.round(file.size / 1024)} KB)...`;
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        parsedExcelData = data;
        selectedNameEl.innerHTML = `<span style="color: var(--apple-green); font-weight: 600;">Terverifikasi: ${data.length} baris data dari ${file.name}</span>`;
        processImportBtn.disabled = false;
      } catch (err) {
        selectedNameEl.innerHTML = `<span style="color: var(--apple-red);">Gagal memproses file: ${(err as Error).message}</span>`;
        processImportBtn.disabled = true;
      }
    };
    reader.readAsBinaryString(file);
  });

  processImportBtn?.addEventListener('click', async () => {
    if (parsedExcelData.length === 0) return;

    let addedCount = 0;
    for (const row of parsedExcelData) {
      const rawNisn = String(row['NISN'] || row['nisn'] || '').trim();
      const rawNama = String(row['Nama Lengkap'] || row['namaLengkap'] || row['Nama'] || '').trim();

      if (!rawNisn || !rawNama) continue;

      const existing = await db.siswa.where('nisn').equals(rawNisn).first();
      if (!existing) {
        const tingkat = parseInt(String(row['Tingkat Kelas (1-6)'] || row['tingkatKelas'] || '1')) || 1;
        const newS: SiswaRecord = {
          id: `sis_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          nisn: rawNisn,
          nik: String(row['NIK'] || row['nik'] || '7303030000000000'),
          namaLengkap: rawNama,
          jenisKelamin: String(row['Jenis Kelamin (L/P)'] || row['jenisKelamin'] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
          tempatLahir: String(row['Tempat Lahir'] || 'Bantaeng'),
          tanggalLahir: String(row['Tanggal Lahir (YYYY-MM-DD)'] || '2018-01-01'),
          namaIbu: String(row['Nama Ibu'] || 'Ibu'),
          namaAyah: String(row['Nama Ayah'] || '-'),
          alamat: String(row['Alamat'] || SD_LONRONG_PROFILE.desaKelurahan),
          rombelId: `rmb-0${tingkat}`,
          tingkatKelas: tingkat,
          statusSiswa: 'aktif',
          tahunMasuk: new Date().getFullYear(),
          syncStatus: 'synced',
          updatedAt: new Date().toISOString(),
        };

        await db.siswa.add(newS);
        await syncEngine.queueMutation('siswa', newS.id, 'create', newS);
        addedCount++;
      }
    }

    confetti({ particleCount: 50, spread: 60 });
    alert(`Import Berhasil: ${addedCount} data siswa baru telah ditambahkan.`);
    modalImport.classList.remove('active');
    renderTable();
  });

  // Handle Export Excel (Robust Pure ArrayBuffer Blob Download)
  container.querySelector('#btnExportExcel')?.addEventListener('click', async () => {
    const list = await loadData();
    const exportRows = list.map((s, idx) => ({
      No: idx + 1,
      NISN: s.nisn,
      NIK: s.nik,
      'Nama Lengkap': s.namaLengkap,
      'Jenis Kelamin': s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      'Tingkat Kelas': `Kelas ${s.tingkatKelas}`,
      'Tempat Lahir': s.tempatLahir,
      'Tanggal Lahir': s.tanggalLahir,
      'Nama Ibu': s.namaIbu,
      'Nama Ayah': s.namaAyah,
      Alamat: s.alamat,
      Status: s.statusSiswa === 'aktif' ? 'Aktif' : s.statusSiswa === 'lulus' ? 'Alumni' : 'Pindah/Mutasi',
    }));

    const filename = `Data_Siswa_${SD_LONRONG_PROFILE.namaSekolah.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const result = exportDataToExcel(exportRows, 'Daftar_Siswa', filename);
    if (result.success) {
      confetti({ particleCount: 40, spread: 50 });
    }
  });

  // Handle Cetak PDF Formal (Kop Surat Resmi & Auto New Tab Viewer)
  container.querySelector('#btnCetakPDF')?.addEventListener('click', async () => {
    const list = await loadData();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Kop Surat Resmi
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PEMERINTAH KABUPATEN BANTAENG', 105, 14, { align: 'center' });
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 105, 19, { align: 'center' });
    doc.setFontSize(13);
    doc.text(SD_LONRONG_PROFILE.namaSekolah, 105, 25, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NPSN: ${SD_LONRONG_PROFILE.npsn} • Alamat: ${SD_LONRONG_PROFILE.alamat}, Bantaeng (92415)`, 105, 30, { align: 'center' });

    doc.setLineWidth(0.6);
    doc.line(15, 33, 195, 33);
    doc.setLineWidth(0.2);
    doc.line(15, 34, 195, 34);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('BUKU INDUK / DAFTAR PESERTA DIDIK', 105, 41, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Tahun Ajaran: ${SD_LONRONG_PROFILE.tahunAjaran} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 105, 46, { align: 'center' });

    const tableRows = list.map((s, idx) => [
      String(idx + 1),
      s.nisn,
      s.namaLengkap,
      s.jenisKelamin,
      `Kelas ${s.tingkatKelas}`,
      `${s.tempatLahir}, ${s.tanggalLahir}`,
      s.namaIbu,
      s.statusSiswa.toUpperCase(),
    ]);

    applyAutoTable(doc, {
      startY: 50,
      head: [['No', 'NISN', 'Nama Peserta Didik', 'L/P', 'Kelas', 'Kelahiran', 'Ibu Kandung', 'Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 113, 227], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
    });

    let finalY = (doc as any).lastAutoTable?.finalY || 160;
    if (finalY + 45 > 280) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(8.5);
    doc.text('Mengetahui,', 140, finalY + 8);
    doc.text('Kepala SD Inpres Lonrong', 140, finalY + 13);
    doc.setFont('helvetica', 'bold');
    doc.text(SD_LONRONG_PROFILE.kepalaSekolah.nama, 140, finalY + 31);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${SD_LONRONG_PROFILE.kepalaSekolah.nip}`, 140, finalY + 35);

    const filename = `Buku_Induk_Siswa_${SD_LONRONG_PROFILE.npsn}_${new Date().toISOString().split('T')[0]}`;
    // Export and automatically open in preview new tab for instant view/print
    const result = exportDocToPdf(doc, filename, true);
    if (result.success) {
      confetti({ particleCount: 40, spread: 50 });
    }
  });

  renderTable();
}
