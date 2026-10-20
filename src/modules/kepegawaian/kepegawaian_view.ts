import { db, type PegawaiRecord, type BebanAjarRecord } from '../../db/local_db';
import { syncEngine } from '../../db/sync_engine';
import confetti from 'canvas-confetti';

export async function renderKepegawaianView(container: HTMLElement) {
  async function loadData() {
    const list = await db.pegawai.toArray();
    const bebanList = await db.bebanAjar.toArray();
    const rombelList = await db.kelasRombel.toArray();
    return { list, bebanList, rombelList };
  }

  async function renderContent() {
    const { list, bebanList, rombelList } = await loadData();

    // Map teaching hours per pegawai
    const bebanMap: Record<string, BebanAjarRecord[]> = {};
    bebanList.forEach((b) => {
      if (!bebanMap[b.pegawaiId]) bebanMap[b.pegawaiId] = [];
      bebanMap[b.pegawaiId].push(b);
    });

    // Compute Kepegawaian overview stats
    const pnsCount = list.filter((p) => p.statusKepegawaian === 'PNS').length;
    const pppkCount = list.filter((p) => p.statusKepegawaian === 'PPPK').length;
    const honorerCount = list.filter((p) => p.statusKepegawaian.includes('Honorer')).length;
    const guruOnly = list.filter((p) => p.jabatan.includes('Guru'));
    const totalJamSemua = bebanList.reduce((acc, curr) => acc + curr.jumlahJamMinggu, 0);
    const compliantCount = guruOnly.filter(
      (p) => (bebanMap[p.id] || []).reduce((acc, curr) => acc + curr.jumlahJamMinggu, 0) >= 24
    ).length;

    container.innerHTML = `
      <div class="page-container">
        <!-- Header Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.35rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Kepegawaian & Beban Ajar</h1>
            <p style="font-size: 0.82rem; color: var(--apple-text-secondary); margin-top: 0.15rem;">
              Manajemen Data GTK & Alokasi Jam Mengajar Kurikulum Merdeka (Standar 24 Jam/Minggu)
            </p>
          </div>
          <div style="display: flex; gap: 0.45rem;">
            <button class="apple-btn apple-btn-secondary" id="btnAturBeban">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Tambah Beban Ajar
            </button>
            <button class="apple-btn apple-btn-primary" id="btnTambahPegawai">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Tambah Pegawai
            </button>
          </div>
        </div>

        <!-- Informative Metrics Summary Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; margin-bottom: 1.35rem;">
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--apple-text-tertiary);">Total Pendidik & Tendik</div>
            <div style="font-size: 1.55rem; font-weight: 800; color: var(--apple-text-primary); margin: 2px 0;">${list.length} <span style="font-size: 0.82rem; font-weight: 600; color: var(--apple-text-secondary);">Orang</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">1 Kepsek, 6 Guru, 1 Tendik</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--apple-text-tertiary);">Status Formasi Kepegawaian</div>
            <div style="font-size: 1.55rem; font-weight: 800; color: var(--apple-blue); margin: 2px 0;">${pnsCount} PNS <span style="font-size: 0.82rem; font-weight: 600; color: var(--apple-text-secondary);">• ${pppkCount} PPPK</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">${honorerCount} Honorer Daerah Terdata</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--apple-text-tertiary);">Kepatuhan Beban Ajar</div>
            <div style="font-size: 1.55rem; font-weight: 800; color: var(--apple-green); margin: 2px 0;">${compliantCount}/${guruOnly.length} <span style="font-size: 0.82rem; font-weight: 600; color: var(--apple-text-secondary);">Guru</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">${Math.round((compliantCount / (guruOnly.length || 1)) * 100)}% Memenuhi Minimal 24 JJM</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--apple-text-tertiary);">Total Beban Mengajar</div>
            <div style="font-size: 1.55rem; font-weight: 800; color: var(--apple-orange); margin: 2px 0;">${totalJamSemua} <span style="font-size: 0.82rem; font-weight: 600; color: var(--apple-text-secondary);">Jam / Minggu</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Tatap Muka Kurikulum Merdeka</div>
          </div>
        </div>

        <!-- Grid Pegawai Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.35rem;">
          ${list
            .map((p) => {
              const assigned = bebanMap[p.id] || [];
              const totalJJM = assigned.reduce((acc, curr) => acc + curr.jumlahJamMinggu, 0);
              const isMemenuhi = totalJJM >= 24;

              return `
              <div class="bento-card" style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.45rem 1.6rem; gap: 1.15rem;">
                <div>
                  <!-- Header: Avatar, Name & Status Pill -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.85rem;">
                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                      <div class="user-avatar" style="width: 44px; height: 44px; font-size: 1.1rem; border-radius: var(--radius-sm); font-weight: 800; flex-shrink: 0;">
                        ${p.namaLengkap.charAt(0)}
                      </div>
                      <div>
                        <div style="font-weight: 700; font-size: 1.05rem; color: var(--apple-text-primary); letter-spacing: -0.015em; line-height: 1.3;">${p.namaLengkap}</div>
                        <div style="font-size: 0.82rem; color: var(--apple-text-secondary); font-family: var(--font-family-mono); margin-top: 2px;">
                          NIP: ${p.nipNuptk}
                        </div>
                      </div>
                    </div>
                    <span class="status-pill ${
                      p.statusKepegawaian === 'PNS' ? 'success' : p.statusKepegawaian === 'PPPK' ? 'info' : 'warning'
                    }">
                      ${p.statusKepegawaian}
                    </span>
                  </div>

                  <!-- Metadata: Jabatan & Pangkat/Golongan -->
                  <div style="padding: 0.75rem 0.95rem; background: var(--apple-surface-secondary); border: 1px solid var(--apple-border-subtle); border-radius: var(--radius-md); margin-bottom: 0.85rem; font-size: 0.85rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                      <span style="color: var(--apple-text-secondary); font-weight: 500;">Jabatan / Tugas:</span>
                      <strong style="color: var(--apple-text-primary); text-align: right;">${p.jabatan}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--apple-text-secondary); font-weight: 500;">Pangkat / Golongan:</span>
                      <strong style="color: var(--apple-text-primary); text-align: right;">${p.pangkatGolongan}</strong>
                    </div>
                  </div>

                  <!-- Beban Mengajar Progress Bar -->
                  ${
                    p.jabatan.includes('Guru')
                      ? `
                    <div style="margin-bottom: 0.85rem;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; font-size: 0.82rem;">
                        <span style="font-weight: 600; color: var(--apple-text-secondary);">Beban Mengajar:</span>
                        <span style="font-weight: 700; color: ${isMemenuhi ? 'var(--apple-green)' : 'var(--apple-orange)'};">
                          ${totalJJM} / 24 JJM (${isMemenuhi ? 'Terpenuhi' : 'Kurang'})
                        </span>
                      </div>
                      <div style="width: 100%; height: 7px; background: var(--apple-surface-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                        <div style="width: ${Math.min((totalJJM / 24) * 100, 100)}%; height: 100%; background: ${
                          isMemenuhi ? 'var(--apple-green)' : 'var(--apple-orange)'
                        }; border-radius: var(--radius-full); transition: width 0.3s ease;"></div>
                      </div>
                    </div>

                    <!-- List Jadwal Mapel -->
                    <div style="font-size: 0.82rem; color: var(--apple-text-secondary); max-height: 85px; overflow-y: auto;">
                      ${
                        assigned.length > 0
                          ? assigned
                              .map(
                                (b) => `
                            <div style="padding: 0.3rem 0; border-bottom: 1px dashed var(--apple-border-subtle); display: flex; justify-content: space-between; align-items: center;">
                              <span style="color: var(--apple-text-primary); font-weight: 500;">${b.mataPelajaran}</span>
                              <strong style="color: var(--apple-text-primary);">${b.jumlahJamMinggu} Jam (${b.hariMengajar})</strong>
                            </div>
                          `
                              )
                              .join('')
                          : '<div style="font-style: italic; color: var(--apple-text-tertiary); padding: 0.35rem 0;">Belum ada alokasi jadwal beban ajar.</div>'
                      }
                    </div>
                  `
                      : `
                    <div style="padding: 0.65rem 0.85rem; background: var(--apple-surface-tertiary); border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--apple-text-secondary); line-height: 1.4;">
                      Tugas Manajerial Administrasi & Layanan Sistem Informasi Sekolah
                    </div>
                  `
                  }
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--apple-border-subtle); font-size: 0.82rem; color: var(--apple-text-secondary);">
                  <a href="https://wa.me/${p.noHp.replace(/^0/, '62')}" target="_blank" style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 600; color: var(--apple-blue); text-decoration: none;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    ${p.noHp} (WhatsApp ↗)
                  </a>
                  <button class="apple-btn apple-btn-ghost btn-delete-pegawai" data-id="${p.id}" style="color: var(--apple-red); font-size: 0.82rem; padding: 0.4rem 0.65rem;">
                    Hapus
                  </button>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>

      <!-- Modal Tambah Pegawai -->
      <div class="modal-backdrop" id="modalTambahPegawai">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3 style="font-size: 1.05rem; font-weight: 700;">Tambah Pendidik / Tenaga Kependidikan</h3>
            <button class="apple-btn apple-btn-ghost btn-close-modal" style="padding: 0.3rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <form id="formTambahPegawai">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="apple-input-group">
                  <label class="apple-label">NIP / NUPTK *</label>
                  <input type="text" class="apple-input" name="nipNuptk" required placeholder="Contoh: 19820315..." />
                </div>
                <div class="apple-input-group">
                  <label class="apple-label">Nama Lengkap & Gelar *</label>
                  <input type="text" class="apple-input" name="namaLengkap" required placeholder="Contoh: Hasriani, S.Pd." />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="apple-input-group">
                  <label class="apple-label">Status Kepegawaian *</label>
                  <select class="apple-select" name="statusKepegawaian" required>
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="Honorer Daerah">Honorer Daerah</option>
                    <option value="GTT/PTT">GTT / PTT Sekolah</option>
                  </select>
                </div>
                <div class="apple-input-group">
                  <label class="apple-label">Pangkat / Golongan</label>
                  <input type="text" class="apple-input" name="pangkatGolongan" value="Penata Muda, III/a" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="apple-input-group">
                  <label class="apple-label">Jabatan Utama *</label>
                  <select class="apple-select" name="jabatan" required>
                    <option value="Guru Kelas">Guru Kelas</option>
                    <option value="Guru Mapel">Guru Mata Pelajaran</option>
                    <option value="Tenaga Administrasi">Tenaga Administrasi</option>
                    <option value="Operator Dapodik">Operator Dapodik / IT</option>
                  </select>
                </div>
                <div class="apple-input-group">
                  <label class="apple-label">Jenis Kelamin</label>
                  <select class="apple-select" name="jenisKelamin">
                    <option value="P">Perempuan</option>
                    <option value="L">Laki-laki</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="apple-input-group">
                  <label class="apple-label">Nomor WhatsApp / HP</label>
                  <input type="text" class="apple-input" name="noHp" value="08" />
                </div>
                <div class="apple-input-group">
                  <label class="apple-label">Email</label>
                  <input type="email" class="apple-input" name="email" placeholder="nama@sdinpreslonrong.sch.id" />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="apple-btn apple-btn-secondary btn-close-modal">Batal</button>
              <button type="submit" class="apple-btn apple-btn-primary">Simpan Pegawai</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Tambah Beban Ajar -->
      <div class="modal-backdrop" id="modalAturBeban">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3 style="font-size: 1.05rem; font-weight: 700;">Alokasikan Beban Mengajar Guru</h3>
            <button class="apple-btn apple-btn-ghost btn-close-modal" style="padding: 0.3rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <form id="formAturBeban">
            <div class="modal-body">
              <div class="apple-input-group">
                <label class="apple-label">Pilih Guru Pengampu *</label>
                <select class="apple-select" name="pegawaiId" required>
                  ${list
                    .filter((p) => p.jabatan.includes('Guru') || p.jabatan === 'Kepala Sekolah')
                    .map((p) => `<option value="${p.id}">${p.namaLengkap} (${p.jabatan})</option>`)
                    .join('')}
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="apple-input-group">
                  <label class="apple-label">Target Rombongan Belajar *</label>
                  <select class="apple-select" name="rombelId" required>
                    ${rombelList.map((r) => `<option value="${r.id}">${r.namaRombel} (${r.fase})</option>`).join('')}
                  </select>
                </div>
                <div class="apple-input-group">
                  <label class="apple-label">Jumlah Jam Pelajaran (JJM) *</label>
                  <input type="number" class="apple-input" name="jumlahJamMinggu" min="1" max="24" value="4" required />
                </div>
              </div>

              <div class="apple-input-group">
                <label class="apple-label">Mata Pelajaran / Muatan Pembelajaran *</label>
                <input type="text" class="apple-input" name="mataPelajaran" placeholder="Contoh: Tematik Guru Kelas / PAI / PJOK" required />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="apple-input-group">
                  <label class="apple-label">Hari Mengajar</label>
                  <input type="text" class="apple-input" name="hariMengajar" value="Senin - Jumat" />
                </div>
                <div class="apple-input-group">
                  <label class="apple-label">Jam Pelaksanaan</label>
                  <input type="text" class="apple-input" name="jamMulaiSelesai" value="07.30 - 11.30" />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="apple-btn apple-btn-secondary btn-close-modal">Batal</button>
              <button type="submit" class="apple-btn apple-btn-primary">Simpan Beban Ajar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Modal triggers
    const modalPegawai = container.querySelector('#modalTambahPegawai') as HTMLElement;
    const modalBeban = container.querySelector('#modalAturBeban') as HTMLElement;

    container.querySelector('#btnTambahPegawai')?.addEventListener('click', () => {
      modalPegawai.classList.add('active');
    });

    container.querySelector('#btnAturBeban')?.addEventListener('click', () => {
      modalBeban.classList.add('active');
    });

    container.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        modalPegawai.classList.remove('active');
        modalBeban.classList.remove('active');
      });
    });

    // Form Tambah Pegawai Submit
    const formPegawai = container.querySelector('#formTambahPegawai') as HTMLFormElement;
    formPegawai?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(formPegawai);

      const newPegawai: PegawaiRecord = {
        id: `pgw_${Date.now()}`,
        nipNuptk: formData.get('nipNuptk') as string,
        namaLengkap: formData.get('namaLengkap') as string,
        statusKepegawaian: formData.get('statusKepegawaian') as any,
        pangkatGolongan: formData.get('pangkatGolongan') as string,
        jabatan: formData.get('jabatan') as any,
        jenisKelamin: formData.get('jenisKelamin') as any,
        noHp: formData.get('noHp') as string,
        email: formData.get('email') as string,
        googleDriveFolderId: `gdrive_folder_${Date.now()}`,
        syncStatus: 'synced',
        updatedAt: new Date().toISOString(),
      };

      await db.pegawai.add(newPegawai);
      await syncEngine.queueMutation('pegawai', newPegawai.id, 'create', newPegawai);
      confetti({ particleCount: 40, spread: 50 });
      modalPegawai.classList.remove('active');
      formPegawai.reset();
      renderContent();
    });

    // Form Tambah Beban Ajar Submit
    const formBeban = container.querySelector('#formAturBeban') as HTMLFormElement;
    formBeban?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(formBeban);

      const newBeban: BebanAjarRecord = {
        id: `bbn_${Date.now()}`,
        pegawaiId: formData.get('pegawaiId') as string,
        rombelId: formData.get('rombelId') as string,
        mataPelajaran: formData.get('mataPelajaran') as string,
        jumlahJamMinggu: parseInt(formData.get('jumlahJamMinggu') as string) || 4,
        hariMengajar: (formData.get('hariMengajar') as string) || 'Senin',
        jamMulaiSelesai: (formData.get('jamMulaiSelesai') as string) || '07.30 - 11.30',
        syncStatus: 'synced',
      };

      await db.bebanAjar.add(newBeban);
      await syncEngine.queueMutation('bebanAjar', newBeban.id, 'create', newBeban);
      confetti({ particleCount: 40, spread: 50 });
      modalBeban.classList.remove('active');
      formBeban.reset();
      renderContent();
    });

    // Delete Pegawai
    container.querySelectorAll('.btn-delete-pegawai').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id && confirm('Yakin ingin menghapus data pegawai ini?')) {
          await db.pegawai.delete(id);
          await syncEngine.queueMutation('pegawai', id, 'delete', { id });
          renderContent();
        }
      });
    });
  }

  renderContent();
}
