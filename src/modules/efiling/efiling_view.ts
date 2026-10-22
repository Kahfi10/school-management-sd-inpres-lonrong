import { db, type ArsipDigitalRecord } from '../../db/local_db';
import { syncEngine } from '../../db/sync_engine';
import confetti from 'canvas-confetti';

export async function renderEfilingView(container: HTMLElement) {
  let selectedCategory = 'all';
  let selectedPegawaiId = 'all';

  async function loadData() {
    let list = await db.arsipDigital.toArray();
    const pegawaiList = await db.pegawai.toArray();

    if (selectedCategory !== 'all') {
      list = list.filter((a) => a.kategori === selectedCategory);
    }
    if (selectedPegawaiId !== 'all') {
      list = list.filter((a) => a.pegawaiId === selectedPegawaiId);
    }

    return { list, pegawaiList };
  }

  async function renderContent() {
    const { list, pegawaiList } = await loadData();

    container.innerHTML = `
      <div class="page-container">
        <!-- Header Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.35rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.25rem;">
              <span class="status-pill neutral">Google Drive Terhubung</span>
              <span style="font-size: 0.73rem; color: var(--apple-text-tertiary); font-family: var(--font-family-mono);">
                drive.google.com/folders/sd_inpres_lonrong_arsip
              </span>
            </div>
            <h1 style="font-size: 1.4rem; font-weight: 700; letter-spacing: -0.015em;">E-Filing (Arsip Digital Google Drive)</h1>
            <p style="font-size: 0.82rem; color: var(--apple-text-secondary); margin-top: 0.15rem;">
              Penyimpanan cloud terpusat untuk SK Kepegawaian, Ijazah, dan Sertifikat Pendidik Guru/Tendik
            </p>
          </div>
          <div>
            <button class="apple-btn apple-btn-primary" id="btnUploadArsip">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Upload ke Google Drive
            </button>
          </div>
        </div>

        <!-- Informative Metrics Summary Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; margin-bottom: 1.35rem;">
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Total Berkas E-Filing</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-text-primary); margin: 2px 0;">${list.length} <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Dokumen</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Format PDF Terverifikasi</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">SK Pengangkatan & PBM</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-blue); margin: 2px 0;">2 <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Berkas</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">SK Kepala Sekolah & Guru</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Sertifikasi & Serdik</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-green); margin: 2px 0;">1 <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Berkas</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Kemendikbudristek RI</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Cloud Google Drive</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-green); margin: 2px 0;">Aktif <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">• Unlimited</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Backup Digital Terpadu</div>
          </div>
        </div>

        <!-- Filter Controls -->
        <div style="display: flex; gap: 0.85rem; margin-bottom: 1.25rem; flex-wrap: wrap; align-items: center;">
          <div style="min-width: 200px;">
            <select class="apple-select" id="selectFilterPegawai" style="font-weight: 600; padding: 0.4rem 0.75rem; font-size: 0.8rem;">
              <option value="all">Semua Pegawai & GTK (${pegawaiList.length})</option>
              ${pegawaiList.map((p) => `<option value="${p.id}" ${selectedPegawaiId === p.id ? 'selected' : ''}>${p.namaLengkap}</option>`).join('')}
            </select>
          </div>

          <div class="apple-segmented-control" id="categoryFilterControl">
            <button class="segment-btn ${selectedCategory === 'all' ? 'active' : ''}" data-cat="all">Semua Kategori</button>
            <button class="segment-btn ${selectedCategory === 'SK Pengangkatan' ? 'active' : ''}" data-cat="SK Pengangkatan">SK Pengangkatan</button>
            <button class="segment-btn ${selectedCategory === 'SK PBM' ? 'active' : ''}" data-cat="SK PBM">SK PBM</button>
            <button class="segment-btn ${selectedCategory === 'Sertifikat Pendidik' ? 'active' : ''}" data-cat="Sertifikat Pendidik">Serdik</button>
            <button class="segment-btn ${selectedCategory === 'Ijazah' ? 'active' : ''}" data-cat="Ijazah">Ijazah</button>
          </div>
        </div>

        <!-- Document Cards Grid -->
        ${
          list.length === 0
            ? `
          <div class="bento-card" style="text-align: center; padding: 3.5rem 1rem; color: var(--apple-text-tertiary);">
            <div style="width: 44px; height: 44px; margin: 0 auto 0.75rem auto; border-radius: 50%; background: var(--apple-surface-tertiary); display: flex; align-items: center; justify-content: center; color: var(--apple-text-tertiary);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div style="font-weight: 700; color: var(--apple-text-primary); font-size: 0.95rem;">Belum Ada Arsip Digital</div>
            <div style="font-size: 0.78rem; margin-top: 0.2rem;">Gunakan tombol "Upload ke Google Drive" untuk mengarsipkan dokumen pegawai.</div>
          </div>
        `
            : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.35rem;">
            ${list
              .map(
                (a) => {
                  let formattedDate = a.uploadedAt;
                  try {
                    formattedDate = new Date(a.uploadedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                  } catch {
                    formattedDate = a.uploadedAt;
                  }

                  return `
              <div class="bento-card" style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.45rem 1.6rem; gap: 1.15rem;">
                <div>
                  <!-- Card Header: Icon, Category & Date -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.85rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <div style="width: 42px; height: 42px; border-radius: var(--radius-sm); background: rgba(0, 113, 227, 0.08); color: var(--apple-blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                      </div>
                      <div>
                        <span class="status-pill info">${a.kategori}</span>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 0.8rem; font-weight: 600; color: var(--apple-text-secondary);">${formattedDate}</div>
                      <span style="font-size: 0.74rem; font-weight: 700; color: var(--apple-text-tertiary);">${Math.round(a.fileSizeBytes / 1024)} KB • PDF</span>
                    </div>
                  </div>

                  <!-- Document Title -->
                  <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--apple-text-primary); margin-bottom: 0.85rem; line-height: 1.4; letter-spacing: -0.015em;">
                    ${a.judulDokumen}
                  </h3>

                  <!-- Clean Structured Metadata Box -->
                  <div style="background: var(--apple-surface-secondary); border: 1px solid var(--apple-border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.55rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.84rem;">
                      <span style="color: var(--apple-text-secondary); font-weight: 500;">Pegawai / GTK</span>
                      <strong style="color: var(--apple-text-primary); text-align: right;">${a.namaPegawai}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 0.84rem; gap: 0.65rem;">
                      <span style="color: var(--apple-text-secondary); font-weight: 500; flex-shrink: 0;">Nomor Surat / SK</span>
                      <span style="font-family: var(--font-family-mono); color: var(--apple-text-primary); font-weight: 600; font-size: 0.82rem; text-align: right; word-break: break-all;">${a.nomorSurat || '—'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.84rem;">
                      <span style="color: var(--apple-text-secondary); font-weight: 500;">Penyimpanan</span>
                      <span style="display: inline-flex; align-items: center; gap: 0.35rem; color: var(--apple-green); font-weight: 600; font-size: 0.82rem;">
                        <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--apple-green);"></span>
                        Tersimpan di Google Drive
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Footer Actions -->
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.65rem; padding-top: 0.75rem; border-top: 1px solid var(--apple-border-subtle);">
                  <a href="${a.driveWebUrl}" target="_blank" class="apple-btn apple-btn-secondary" style="flex: 1; justify-content: center; font-size: 0.84rem; font-weight: 600; padding: 0.5rem 0.85rem; text-decoration: none;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    Buka di Drive
                  </a>
                  <button class="apple-btn apple-btn-ghost btn-delete-arsip" data-id="${a.id}" title="Hapus Berkas" style="color: var(--apple-red); font-size: 0.82rem; padding: 0.5rem 0.75rem;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Hapus
                  </button>
                </div>
              </div>
            `;
                }
              )
              .join('')}
          </div>
        `
        }
      </div>

      <!-- Modal Upload Arsip Google Drive -->
      <div class="modal-backdrop" id="modalUploadArsip">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3 style="font-size: 1.05rem; font-weight: 700;">Upload Dokumen ke Google Drive</h3>
            <button class="apple-btn apple-btn-ghost btn-close-modal" style="padding: 0.3rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <form id="formUploadArsip">
            <div class="modal-body">
              <div class="apple-input-group">
                <label class="apple-label">Pilih Pegawai / GTK Pemilik Berkas *</label>
                <select class="apple-select" name="pegawaiId" required>
                  ${pegawaiList.map((p) => `<option value="${p.id}" data-name="${p.namaLengkap}">${p.namaLengkap} (${p.jabatan})</option>`).join('')}
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="apple-input-group">
                  <label class="apple-label">Kategori Arsip *</label>
                  <select class="apple-select" name="kategori" required>
                    <option value="SK Pengangkatan">SK Pengangkatan</option>
                    <option value="SK Pangkat/Berkala">SK Pangkat / Berkala</option>
                    <option value="SK PBM">SK Pembagian Tugas (PBM)</option>
                    <option value="Sertifikat Pendidik">Sertifikat Pendidik (Serdik)</option>
                    <option value="Ijazah">Ijazah & Transkrip</option>
                    <option value="Berkas Pribadi">Berkas Pribadi (KTP/KK)</option>
                  </select>
                </div>
                <div class="apple-input-group">
                  <label class="apple-label">Nomor Surat / SK</label>
                  <input type="text" class="apple-input" name="nomorSurat" placeholder="Contoh: 821.2/012/..." />
                </div>
              </div>

              <div class="apple-input-group">
                <label class="apple-label">Judul Dokumen Lengkap *</label>
                <input type="text" class="apple-input" name="judulDokumen" required placeholder="Contoh: SK Kenaikan Pangkat Golongan IV/a Tahun 2024" />
              </div>

              <div style="background: var(--apple-surface-secondary); border: 1px dashed var(--apple-border-strong); border-radius: var(--radius-md); padding: 1.35rem; text-align: center; margin-bottom: 0.85rem;">
                <input type="file" id="fileArsipInput" accept=".pdf, .jpg, .png" style="display: none;" />
                <button type="button" class="apple-btn apple-btn-secondary" id="btnSelectFileArsip">
                  Pilih Dokumen PDF / Berkas Scan
                </button>
                <div id="fileArsipName" style="font-size: 0.78rem; color: var(--apple-text-secondary); margin-top: 0.45rem;">
                  Format: PDF (Maksimal 25MB)
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="apple-btn apple-btn-secondary btn-close-modal">Batal</button>
              <button type="submit" class="apple-btn apple-btn-primary" id="btnSubmitArsip">
                Upload & Simpan ke Drive
              </button>
            </div>
          </form>
      </div>
    `;

    // Filter Pegawai change
    container.querySelector('#selectFilterPegawai')?.addEventListener('change', (e) => {
      selectedPegawaiId = (e.target as HTMLSelectElement).value;
      renderContent();
    });

    // Category Segmented Controls
    container.querySelectorAll('#categoryFilterControl .segment-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        selectedCategory = (e.currentTarget as HTMLElement).dataset.cat || 'all';
        renderContent();
      });
    });

    // Modal triggers
    const modal = container.querySelector('#modalUploadArsip') as HTMLElement;
    container.querySelector('#btnUploadArsip')?.addEventListener('click', () => modal.classList.add('active'));
    container.querySelectorAll('.btn-close-modal').forEach((btn) => btn.addEventListener('click', () => modal.classList.remove('active')));

    // File input selection
    const fileInput = container.querySelector('#fileArsipInput') as HTMLInputElement;
    const fileLabel = container.querySelector('#fileArsipName') as HTMLElement;
    container.querySelector('#btnSelectFileArsip')?.addEventListener('click', () => fileInput?.click());

    let selectedFileSize = 1850000;
    fileInput?.addEventListener('change', () => {
      const f = fileInput.files?.[0];
      if (f) {
        selectedFileSize = f.size;
        fileLabel.innerHTML = `<strong>${f.name}</strong> (${Math.round(f.size / 1024)} KB)`;
      }
    });

    // Form Submit (Upload to Google Drive)
    const form = container.querySelector('#formUploadArsip') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const pegawaiSelect = form.querySelector('select[name="pegawaiId"]') as HTMLSelectElement;
      const selectedOption = pegawaiSelect.options[pegawaiSelect.selectedIndex];
      const pegawaiName = selectedOption.dataset.name || 'Pegawai';
      const submitBtn = container.querySelector('#btnSubmitArsip') as HTMLButtonElement;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengunggah ke Google Drive...';

      // Simulating Google Drive API Chunked upload latency
      await new Promise((r) => setTimeout(r, 450));

      const driveFileId = `1GDrive_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newArsip: ArsipDigitalRecord = {
        id: `ars_${Date.now()}`,
        pegawaiId: formData.get('pegawaiId') as string,
        namaPegawai: pegawaiName,
        kategori: formData.get('kategori') as any,
        judulDokumen: formData.get('judulDokumen') as string,
        nomorSurat: (formData.get('nomorSurat') as string) || undefined,
        driveFileId,
        driveWebUrl: `https://drive.google.com/file/d/${driveFileId}/view`,
        fileSizeBytes: selectedFileSize,
        fileMimeType: 'application/pdf',
        uploadedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };

      await db.arsipDigital.add(newArsip);
      await syncEngine.queueMutation('arsipDigital', newArsip.id, 'create', newArsip);

      confetti({ particleCount: 40, spread: 50 });
      modal.classList.remove('active');
      renderContent();
    });

    // Delete Arsip
    container.querySelectorAll('.btn-delete-arsip').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id && confirm('Hapus arsip digital ini dari basis data dan Google Drive?')) {
          await db.arsipDigital.delete(id);
          await syncEngine.queueMutation('arsipDigital', id, 'delete', { id });
          renderContent();
        }
      });
    });
  }

  renderContent();
}
