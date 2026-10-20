import { db, type SarprasRecord } from '../../db/local_db';
import { syncEngine } from '../../db/sync_engine';
import { SD_LONRONG_PROFILE } from '../../config/school_profile';
import confetti from 'canvas-confetti';

export async function renderSarprasView(container: HTMLElement) {
  let selectedKib = 'all';
  let selectedKondisi = 'all';
  let searchQuery = '';

  async function loadData() {
    let list = await db.sarpras.toArray();

    if (selectedKib !== 'all') {
      list = list.filter((s) => s.kategoriKib.startsWith(selectedKib));
    }
    if (selectedKondisi !== 'all') {
      list = list.filter((s) => s.kondisi === selectedKondisi);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.namaBarang.toLowerCase().includes(q) ||
          s.kodeAset.toLowerCase().includes(q) ||
          s.merkTipe.toLowerCase().includes(q) ||
          s.lokasiRuang.toLowerCase().includes(q)
      );
    }

    return list;
  }

  async function renderTable() {
    const list = await loadData();
    const tableBody = container.querySelector('#sarprasTableBody') as HTMLElement;
    const totalCountEl = container.querySelector('#totalSarprasCount') as HTMLElement;

    if (totalCountEl) {
      const totalUnits = list.reduce((a, b) => a + b.jumlahUnit, 0);
      totalCountEl.textContent = `${list.length} Item Terdata (${totalUnits} Total Unit)`;
    }

    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: var(--apple-text-tertiary);">
            <div style="width: 40px; height: 40px; margin: 0 auto 0.75rem auto; border-radius: 50%; background: var(--apple-surface-tertiary); display: flex; align-items: center; justify-content: center; color: var(--apple-text-tertiary);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </div>
            <div style="font-weight: 700; color: var(--apple-text-primary); font-size: 0.95rem;">Tidak Ada Data Aset</div>
            <div style="font-size: 0.78rem; margin-top: 0.2rem;">Sesuaikan filter klasifikasi KIB atau kata kunci pencarian.</div>
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
          <div style="font-weight: 700; color: var(--apple-text-primary); font-size: 0.85rem;">${s.namaBarang}</div>
          <div style="font-size: 0.72rem; color: var(--apple-text-tertiary); font-family: var(--font-family-mono); margin-top: 1px;">
            Kode: ${s.kodeAset}
          </div>
        </td>
        <td>
          <div style="font-size: 0.82rem;">${s.merkTipe}</div>
          <div style="font-size: 0.72rem; color: var(--apple-text-secondary);">${s.kategoriKib}</div>
        </td>
        <td>
          <strong style="font-size: 0.92rem;">${s.jumlahUnit}</strong> <span style="font-size: 0.72rem; color: var(--apple-text-tertiary);">${s.satuan}</span>
        </td>
        <td>
          <span class="status-pill ${
            s.kondisi === 'Baik' ? 'success' : s.kondisi === 'Rusak Ringan' ? 'warning' : 'danger'
          }">
            ${s.kondisi}
          </span>
        </td>
        <td>
          <div style="font-size: 0.8rem;">${s.lokasiRuang}</div>
          <div style="font-size: 0.7rem; color: var(--apple-text-tertiary);">${s.sumberDana} (${s.tahunPengadaan})</div>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 0.35rem;">
            <button class="apple-btn apple-btn-secondary btn-print-label" data-kode="${s.kodeAset}" data-nama="${s.namaBarang}" data-ruang="${s.lokasiRuang}" style="padding: 0.25rem 0.55rem; font-size: 0.72rem;">
              Label QR
            </button>
            <button class="apple-btn apple-btn-ghost btn-delete-sarpras" data-id="${s.id}" style="color: var(--apple-red); padding: 0.25rem 0.45rem; font-size: 0.72rem;">
              Hapus
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');

    // Attach Row Listeners
    container.querySelectorAll('.btn-print-label').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        printAssetLabel(target.dataset.kode || '', target.dataset.nama || '', target.dataset.ruang || '');
      });
    });

    container.querySelectorAll('.btn-delete-sarpras').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id && confirm('Yakin ingin menghapus data aset sarpras ini?')) {
          await db.sarpras.delete(id);
          await syncEngine.queueMutation('sarpras', id, 'delete', { id });
          renderTable();
        }
      });
    });
  }

  function printAssetLabel(kode: string, nama: string, ruang: string) {
    const win = window.open('', '_blank', 'width=420,height=280');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Label Inventaris - ${kode}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 15px; text-align: center; }
            .label-box { border: 1.5px solid #000; padding: 10px; border-radius: 6px; width: 320px; margin: 0 auto; }
            .header { font-size: 10px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
            .code { font-family: monospace; font-size: 12px; font-weight: bold; margin: 4px 0; }
            .item-name { font-size: 13px; font-weight: bold; }
            .location { font-size: 10px; color: #444; margin-top: 3px; }
            .qr-sim { border: 1px solid #000; width: 50px; height: 50px; margin: 6px auto; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="label-box">
            <div class="header">PEMERINTAH KAB. BANTAENG<br/>${SD_LONRONG_PROFILE.namaSekolah} (NPSN: ${SD_LONRONG_PROFILE.npsn})</div>
            <div class="qr-sim">QR CODE</div>
            <div class="code">${kode}</div>
            <div class="item-name">${nama}</div>
            <div class="location">Lokasi: ${ruang}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  }

  container.innerHTML = `
    <div class="page-container">
      <!-- Header Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.35rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Inventaris Sarana & Prasarana</h1>
          <p style="font-size: 0.82rem; color: var(--apple-text-secondary); margin-top: 0.15rem;">
            Pencatatan Aset Barang Sekolah Dasar Inpres Lonrong Sesuai Standar KIB A-E
          </p>
        </div>
        <div>
          <button class="apple-btn apple-btn-primary" id="btnTambahSarpras">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Tambah Aset Barang
          </button>
        </div>
      </div>

      <!-- Informative Metrics Summary Strip -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; margin-bottom: 1.35rem;">
        <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--apple-text-tertiary);">Total Inventaris Sekolah</div>
          <div style="font-size: 1.55rem; font-weight: 800; color: var(--apple-text-primary); margin: 2px 0;">261 <span style="font-size: 0.82rem; font-weight: 600; color: var(--apple-text-secondary);">Total Unit</span></div>
          <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">6 Kategori Inventaris KIB Aktif</div>
        </div>
        <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--apple-text-tertiary);">KIB B (Peralatan TIK & Mesin)</div>
          <div style="font-size: 1.55rem; font-weight: 800; color: var(--apple-blue); margin: 2px 0;">18 <span style="font-size: 0.82rem; font-weight: 600; color: var(--apple-text-secondary);">Unit</span></div>
          <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Chromebook, InFocus, Printer TU</div>
        </div>
        <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--apple-text-tertiary);">KIB C (Gedung & Ruangan)</div>
          <div style="font-size: 1.55rem; font-weight: 800; color: var(--apple-orange); margin: 2px 0;">2 <span style="font-size: 0.82rem; font-weight: 600; color: var(--apple-text-secondary);">Gedung</span></div>
          <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Ruang Kelas 1-3 & Perpustakaan</div>
        </div>
        <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--apple-text-tertiary);">KIB E (Buku Teks & APE)</div>
          <div style="font-size: 1.55rem; font-weight: 800; color: var(--apple-green); margin: 2px 0;">240 <span style="font-size: 0.82rem; font-weight: 600; color: var(--apple-text-secondary);">Eksemplar</span></div>
          <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">100% Kondisi Baik & Layak</div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.15rem; flex-wrap: wrap; gap: 0.75rem;">
        <div class="apple-segmented-control" id="kibFilterControl">
          <button class="segment-btn active" data-kib="all">Semua KIB</button>
          <button class="segment-btn" data-kib="KIB B">KIB B (TIK & Mesin)</button>
          <button class="segment-btn" data-kib="KIB C">KIB C (Gedung/Ruang)</button>
          <button class="segment-btn" data-kib="KIB E">KIB E (Buku & APE)</button>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <select class="apple-select" id="selectFilterKondisi" style="font-weight: 600; width: 150px; padding: 0.35rem 0.65rem; font-size: 0.78rem;">
            <option value="all">Semua Kondisi</option>
            <option value="Baik">Kondisi Baik</option>
            <option value="Rusak Ringan">Rusak Ringan</option>
            <option value="Rusak Berat">Rusak Berat</option>
          </select>
        </div>
      </div>

      <!-- Table Card -->
      <div class="apple-table-card">
        <div class="table-toolbar">
          <div class="table-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--apple-text-tertiary);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="inputSearchSarpras" placeholder="Cari nama barang, kode aset, lokasi..." />
          </div>
          <div id="totalSarprasCount" style="font-size: 0.78rem; font-weight: 600; color: var(--apple-text-secondary);">
            Memuat...
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table class="apple-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Barang & Aset</th>
                <th>Merk & Klasifikasi</th>
                <th>Jumlah Unit</th>
                <th>Kondisi Fisik</th>
                <th>Lokasi & Sumber Dana</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="sarprasTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form Tambah Sarpras -->
    <div class="modal-backdrop" id="modalTambahSarpras">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 style="font-size: 1.05rem; font-weight: 700;">Tambah Aset Sarana & Prasarana</h3>
          <button class="apple-btn apple-btn-ghost btn-close-modal" style="padding: 0.3rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <form id="formTambahSarpras">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="apple-input-group">
                <label class="apple-label">Klasifikasi KIB *</label>
                <select class="apple-select" name="kategoriKib" required>
                  <option value="KIB B (Peralatan/TIK)">KIB B (Peralatan / Mesin / TIK)</option>
                  <option value="KIB C (Gedung/Ruang)">KIB C (Gedung & Bangunan)</option>
                  <option value="KIB E (Buku/APE)">KIB E (Buku Perpustakaan & APE)</option>
                  <option value="KIB A (Tanah)">KIB A (Tanah Sekolah)</option>
                </select>
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Kode Aset Unik *</label>
                <input type="text" class="apple-input" name="kodeAset" required value="LON-KIBB-2025-0${Math.floor(Math.random() * 900 + 100)}" />
              </div>
            </div>

            <div class="apple-input-group">
              <label class="apple-label">Nama Barang / Aset *</label>
              <input type="text" class="apple-input" name="namaBarang" required placeholder="Contoh: Meja Kursi Siswa Kayu Jati" />
            </div>

            <div class="apple-input-group">
              <label class="apple-label">Merk / Spesifikasi Tipe</label>
              <input type="text" class="apple-input" name="merkTipe" placeholder="Contoh: Standar Kemdikbud Set 1 Meja 2 Kursi" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
              <div class="apple-input-group">
                <label class="apple-label">Jumlah Unit *</label>
                <input type="number" class="apple-input" name="jumlahUnit" min="1" value="1" required />
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Satuan *</label>
                <input type="text" class="apple-input" name="satuan" value="Unit" required />
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Kondisi Fisik *</label>
                <select class="apple-select" name="kondisi" required>
                  <option value="Baik">Baik</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="apple-input-group">
                <label class="apple-label">Lokasi Ruang / Tempat *</label>
                <input type="text" class="apple-input" name="lokasiRuang" value="Ruang Kelas 1" required />
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Sumber Dana</label>
                <select class="apple-select" name="sumberDana">
                  <option value="BOS Reguler">BOS Reguler</option>
                  <option value="BOS Kinerja">BOS Kinerja</option>
                  <option value="DAK Fisik">DAK Fisik</option>
                  <option value="Hibah Pemkab Bantaeng">Hibah Pemkab Bantaeng</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="apple-btn apple-btn-secondary btn-close-modal">Batal</button>
            <button type="submit" class="apple-btn apple-btn-primary">Simpan Aset</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Attach filter listeners
  container.querySelectorAll('#kibFilterControl .segment-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('#kibFilterControl .segment-btn').forEach((b) => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
      selectedKib = (e.currentTarget as HTMLElement).dataset.kib || 'all';
      renderTable();
    });
  });

  container.querySelector('#selectFilterKondisi')?.addEventListener('change', (e) => {
    selectedKondisi = (e.target as HTMLSelectElement).value;
    renderTable();
  });

  const searchInput = container.querySelector('#inputSearchSarpras') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderTable();
  });

  // Modal Triggers
  const modal = container.querySelector('#modalTambahSarpras') as HTMLElement;
  container.querySelector('#btnTambahSarpras')?.addEventListener('click', () => modal.classList.add('active'));
  container.querySelectorAll('.btn-close-modal').forEach((btn) => btn.addEventListener('click', () => modal.classList.remove('active')));

  // Form Submit
  const form = container.querySelector('#formTambahSarpras') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const newAset: SarprasRecord = {
      id: `srp_${Date.now()}`,
      kodeAset: formData.get('kodeAset') as string,
      kategoriKib: formData.get('kategoriKib') as any,
      namaBarang: formData.get('namaBarang') as string,
      merkTipe: (formData.get('merkTipe') as string) || '-',
      jumlahUnit: parseInt(formData.get('jumlahUnit') as string) || 1,
      satuan: formData.get('satuan') as string,
      kondisi: formData.get('kondisi') as any,
      lokasiRuang: formData.get('lokasiRuang') as string,
      tahunPengadaan: new Date().getFullYear(),
      sumberDana: formData.get('sumberDana') as any,
      qrCodeData: `${formData.get('kodeAset')}|${formData.get('namaBarang')}|SD-Inpres-Lonrong`,
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
    };

    await db.sarpras.add(newAset);
    await syncEngine.queueMutation('sarpras', newAset.id, 'create', newAset);
    confetti({ particleCount: 40, spread: 50 });
    modal.classList.remove('active');
    form.reset();
    renderTable();
  });

  renderTable();
}
