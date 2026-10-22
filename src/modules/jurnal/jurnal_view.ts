import { db, type JurnalKinerjaRecord } from '../../db/local_db';
import { syncEngine } from '../../db/sync_engine';
import { authService } from '../auth/auth_service';
import { SD_LONRONG_PROFILE } from '../../config/school_profile';
import { jsPDF } from 'jspdf';
import { applyAutoTable, exportDocToPdf } from '../../utils/export_helper';
import confetti from 'canvas-confetti';

export async function renderJurnalView(container: HTMLElement) {
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  async function loadData() {
    let list = await db.jurnalKinerja.reverse().toArray();
    const pegawaiList = await db.pegawai.toArray();
    return { list, pegawaiList };
  }

  async function renderContent() {
    const { list, pegawaiList } = await loadData();

    const disetujuiCount = list.filter((j) => j.statusVerifikasi === 'disetujui').length;
    const diajukanCount = list.filter((j) => j.statusVerifikasi === 'diajukan').length;
    const contributorCount = new Set(list.map((j) => j.pegawaiId)).size;

    container.innerHTML = `
      <div class="page-container">
        <!-- Header Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.35rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.25rem;">
              <span class="status-pill neutral">Terintegrasi E-Kinerja</span>
              <span style="font-size: 0.73rem; color: var(--apple-text-tertiary);">Bukti Dukung SKP BKN & Kemdikbud</span>
            </div>
            <h1 style="font-size: 1.4rem; font-weight: 700; letter-spacing: -0.015em;">Jurnal & Program Kerja Harian</h1>
            <p style="font-size: 0.82rem; color: var(--apple-text-secondary); margin-top: 0.15rem;">
              Pencatatan Aktivitas Harian Guru & Tendik untuk Bukti Dukung Sasaran Kinerja Pegawai (E-Kinerja)
            </p>
          </div>
          <div style="display: flex; gap: 0.45rem;">
            <button class="apple-btn apple-btn-secondary" id="btnExportRekapKinerja">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Cetak Rekap Bulanan
            </button>
            <button class="apple-btn apple-btn-primary" id="btnTulisJurnal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Tulis Jurnal Harian
            </button>
          </div>
        </div>

        <!-- Informative Metrics Summary Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; margin-bottom: 1.35rem;">
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Total Jurnal Harian</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-text-primary); margin: 2px 0;">${list.length} <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Aktivitas</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Bukti Dukung E-Kinerja BKN</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Status Verifikasi Kepsek</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-green); margin: 2px 0;">${disetujuiCount} <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Disetujui • ${diajukanCount} Menunggu</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Validasi Kepala Sekolah</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Partisipasi Guru & Tendik</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-blue); margin: 2px 0;">${contributorCount} / ${pegawaiList.length} <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">GTK Aktif</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Kontribusi Harian Berjalan</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Kepatuhan Kinerja</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-green); margin: 2px 0;">100% <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">• Sesuai RKH</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Target SKP Triwulan Tercapai</div>
          </div>
        </div>

        <!-- Jurnal List Cards (Balanced Grid & Enhanced Typography) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(560px, 1fr)); gap: 1.35rem;">
          ${
            list.length === 0
              ? `
            <div class="bento-card" style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; color: var(--apple-text-tertiary);">
              <div style="width: 44px; height: 44px; margin: 0 auto 0.75rem auto; border-radius: 50%; background: var(--apple-surface-tertiary); display: flex; align-items: center; justify-content: center; color: var(--apple-text-tertiary);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              </div>
              <div style="font-weight: 700; color: var(--apple-text-primary); font-size: 1rem;">Belum Ada Catatan Jurnal Kinerja</div>
              <div style="font-size: 0.82rem; margin-top: 0.25rem;">Klik "Tulis Jurnal Harian" untuk memulai pencatatan aktivitas hari ini.</div>
            </div>
          `
              : list
                  .map((j) => {
                    const statusClass =
                      j.statusVerifikasi === 'disetujui'
                        ? 'success'
                        : j.statusVerifikasi === 'diajukan'
                        ? 'info'
                        : j.statusVerifikasi === 'revisi'
                        ? 'danger'
                        : 'neutral';

                    let formattedDate = j.tanggal;
                    try {
                      formattedDate = new Date(j.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                    } catch {
                      formattedDate = j.tanggal;
                    }

                    return `
              <div class="bento-card" style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.5rem 1.65rem; gap: 1.15rem;">
                <div>
                  <!-- Header: Pegawai Info & Status Badge -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.95rem;">
                    <div style="display: flex; align-items: center; gap: 0.85rem;">
                      <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--apple-blue-light); color: var(--apple-blue); font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: var(--apple-shadow-xs);">
                        ${j.namaPegawai.charAt(0)}
                      </div>
                      <div>
                        <div style="font-weight: 700; font-size: 1.05rem; color: var(--apple-text-primary); letter-spacing: -0.015em; line-height: 1.3;">
                          ${j.namaPegawai}
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.82rem; color: var(--apple-text-secondary); margin-top: 0.25rem;">
                          <span style="display: inline-flex; align-items: center; gap: 0.3rem;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            ${formattedDate}
                          </span>
                          <span>•</span>
                          <span style="display: inline-flex; align-items: center; gap: 0.3rem;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            ${j.jamMulai} - ${j.jamSelesai} WITA
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span class="status-pill ${statusClass}">
                        ${j.statusVerifikasi === 'disetujui' ? 'Disetujui Kepala Sekolah' : j.statusVerifikasi === 'diajukan' ? 'Menunggu Verifikasi' : j.statusVerifikasi}
                      </span>
                    </div>
                  </div>

                  <!-- Uraian Aktivitas & Tugas Harian -->
                  <div style="background: var(--apple-surface-secondary); border: 1px solid var(--apple-border-subtle); border-radius: var(--radius-md); padding: 1rem 1.15rem; margin-bottom: 0.85rem;">
                    <div style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--apple-text-tertiary); margin-bottom: 0.45rem; display: flex; align-items: center; gap: 0.35rem;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                      Uraian Tugas & Aktivitas
                    </div>
                    <div style="font-size: 0.94rem; line-height: 1.6; color: var(--apple-text-primary); font-weight: 500;">
                      ${j.uraianAktivitas}
                    </div>
                  </div>

                  <!-- Output / Hasil Kinerja & Bukti Dukung -->
                  <div style="background: var(--apple-surface-tertiary); border-radius: var(--radius-md); padding: 0.85rem 1.1rem; display: flex; justify-content: space-between; align-items: center; gap: 0.85rem; flex-wrap: wrap; margin-bottom: 0.85rem;">
                    <div style="flex: 1; min-width: 180px;">
                      <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary); margin-bottom: 0.2rem;">Hasil / Output Kinerja</div>
                      <div style="font-size: 0.9rem; font-weight: 600; color: var(--apple-text-primary); line-height: 1.4;">${j.outputHasil}</div>
                    </div>
                    ${
                      j.tautanBuktiDrive
                        ? `
                      <a href="${j.tautanBuktiDrive}" target="_blank" class="apple-btn apple-btn-secondary" style="font-size: 0.82rem; font-weight: 600; padding: 0.45rem 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap; text-decoration: none;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        Bukti Dukung Drive
                      </a>
                    `
                        : ''
                    }
                  </div>

                  <!-- Catatan Evaluasi Kepala Sekolah (Bila Ada) -->
                  ${
                    j.catatanEvaluasi
                      ? `
                    <div style="background: rgba(52, 199, 89, 0.08); border: 1px solid rgba(52, 199, 89, 0.22); border-left: 3.5px solid var(--apple-green); border-radius: var(--radius-sm); padding: 0.85rem 1rem;">
                      <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-green); margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Catatan Evaluasi Kepala Sekolah
                      </div>
                      <div style="font-size: 0.88rem; color: var(--apple-text-primary); line-height: 1.45; font-style: italic;">
                        “${j.catatanEvaluasi}”
                      </div>
                    </div>
                  `
                      : ''
                  }
                </div>

                <!-- Admin Approval Action -->
                ${
                  isAdmin && j.statusVerifikasi !== 'disetujui'
                    ? `
                  <div style="display: flex; justify-content: flex-end; padding-top: 0.75rem; border-top: 1px solid var(--apple-border-subtle); margin-top: 0.25rem;">
                    <button class="apple-btn apple-btn-primary btn-approve-jurnal" data-id="${j.id}" style="font-size: 0.84rem; padding: 0.45rem 0.95rem; font-weight: 600;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Setujui E-Kinerja
                    </button>
                  </div>
                `
                    : ''
                }
              </div>
            `;
                  })
                  .join('')
          }
        </div>
      </div>

      <!-- Modal Tulis Jurnal Harian -->
      <div class="modal-backdrop" id="modalTulisJurnal">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3 style="font-size: 1.05rem; font-weight: 700;">Tulis Jurnal Harian E-Kinerja</h3>
            <button class="apple-btn apple-btn-ghost btn-close-modal" style="padding: 0.3rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <form id="formTulisJurnal">
            <div class="modal-body">
              <div class="apple-input-group">
                <label class="apple-label">Pegawai yang Melaporkan *</label>
                <select class="apple-select" name="pegawaiId" required>
                  ${pegawaiList.map((p) => `<option value="${p.id}" data-name="${p.namaLengkap}">${p.namaLengkap} (${p.jabatan})</option>`).join('')}
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
                <div class="apple-input-group">
                  <label class="apple-label">Tanggal Pelaksanaan *</label>
                  <input type="date" class="apple-input" name="tanggal" required value="${new Date().toISOString().split('T')[0]}" />
                </div>
                <div class="apple-input-group">
                  <label class="apple-label">Jam Mulai *</label>
                  <input type="time" class="apple-input" name="jamMulai" required value="07:30" />
                </div>
                <div class="apple-input-group">
                  <label class="apple-label">Jam Selesai *</label>
                  <input type="time" class="apple-input" name="jamSelesai" required value="11:30" />
                </div>
              </div>

              <div class="apple-input-group">
                <label class="apple-label">Uraian Rencana Kerja / Aktivitas Harian *</label>
                <textarea class="apple-textarea" name="uraianAktivitas" rows="3" required placeholder="Contoh: Mengajar Kurikulum Merdeka Fase B materi operasi perkalian, evaluasi formatif harian, dan bimbingan remedial siswa."></textarea>
              </div>

              <div class="apple-input-group">
                <label class="apple-label">Hasil / Output Pekerjaan *</label>
                <input type="text" class="apple-input" name="outputHasil" required placeholder="Contoh: Rekap nilai formatif 22 siswa dan modul ajar terdokumentasi" />
              </div>

              <div class="apple-input-group">
                <label class="apple-label">Tautan Bukti Dukung (Google Drive)</label>
                <input type="url" class="apple-input" name="tautanBuktiDrive" value="https://drive.google.com/drive/folders/sd_inpres_lonrong_arsip" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="apple-btn apple-btn-secondary btn-close-modal">Batal</button>
              <button type="submit" class="apple-btn apple-btn-primary">Ajukan Jurnal</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Modal triggers
    const modal = container.querySelector('#modalTulisJurnal') as HTMLElement;
    container.querySelector('#btnTulisJurnal')?.addEventListener('click', () => modal.classList.add('active'));
    container.querySelectorAll('.btn-close-modal').forEach((btn) => btn.addEventListener('click', () => modal.classList.remove('active')));

    // Form Submit
    const form = container.querySelector('#formTulisJurnal') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const pegawaiSelect = form.querySelector('select[name="pegawaiId"]') as HTMLSelectElement;
      const selectedOption = pegawaiSelect.options[pegawaiSelect.selectedIndex];
      const pegawaiName = selectedOption.dataset.name || 'Pegawai';

      const newJurnal: JurnalKinerjaRecord = {
        id: `jrn_${Date.now()}`,
        pegawaiId: formData.get('pegawaiId') as string,
        namaPegawai: pegawaiName,
        tanggal: formData.get('tanggal') as string,
        jamMulai: formData.get('jamMulai') as string,
        jamSelesai: formData.get('jamSelesai') as string,
        uraianAktivitas: formData.get('uraianAktivitas') as string,
        outputHasil: formData.get('outputHasil') as string,
        tautanBuktiDrive: (formData.get('tautanBuktiDrive') as string) || undefined,
        statusVerifikasi: 'diajukan',
        syncStatus: 'synced',
        updatedAt: new Date().toISOString(),
      };

      await db.jurnalKinerja.add(newJurnal);
      await syncEngine.queueMutation('jurnalKinerja', newJurnal.id, 'create', newJurnal);
      confetti({ particleCount: 40, spread: 50 });
      modal.classList.remove('active');
      renderContent();
    });

    // Handle Kepala Sekolah Approval
    container.querySelectorAll('.btn-approve-jurnal').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id) {
          await db.jurnalKinerja.update(id, {
            statusVerifikasi: 'disetujui',
            catatanEvaluasi: 'Disetujui Kepala Sekolah untuk bukti dukung E-Kinerja BKN.',
            updatedAt: new Date().toISOString(),
          });
          await syncEngine.queueMutation('jurnalKinerja', id, 'update', { statusVerifikasi: 'disetujui' });
          confetti({ particleCount: 50, spread: 60 });
          renderContent();
        }
      });
    });

    // Handle Cetak Rekap Kinerja Bulanan (PDF)
    container.querySelector('#btnExportRekapKinerja')?.addEventListener('click', async () => {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Kop Surat Resmi
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PEMERINTAH KABUPATEN BANTAENG - DINAS PENDIDIKAN DAN KEBUDAYAAN', 148, 14, { align: 'center' });
      doc.setFontSize(13);
      doc.text(SD_LONRONG_PROFILE.namaSekolah, 148, 20, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`NPSN: ${SD_LONRONG_PROFILE.npsn} • Alamat: ${SD_LONRONG_PROFILE.alamat}, Bantaeng (92415)`, 148, 25, { align: 'center' });
      doc.line(20, 27, 277, 27);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('REKAPITULASI LAPORAN KINERJA HARIAN (E-KINERJA)', 148, 34, { align: 'center' });

      const tableData = list.map((j, idx) => [
        String(idx + 1),
        j.tanggal,
        j.namaPegawai,
        `${j.jamMulai} - ${j.jamSelesai}`,
        j.uraianAktivitas,
        j.outputHasil,
        j.statusVerifikasi.toUpperCase(),
      ]);

      applyAutoTable(doc, {
        startY: 38,
        head: [['No', 'Tanggal', 'Nama Pegawai', 'Waktu', 'Uraian Aktivitas Kinerja', 'Output Hasil', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 113, 227], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 20, right: 20 },
      });

      let finalY = (doc as any).lastAutoTable?.finalY || 120;
      if (finalY + 35 > 195) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(8.5);
      doc.text('Mengetahui / Mengesahkan,', 220, finalY + 8);
      doc.text('Kepala SD Inpres Lonrong', 220, finalY + 12.5);
      doc.setFont('helvetica', 'bold');
      doc.text(SD_LONRONG_PROFILE.kepalaSekolah.nama, 220, finalY + 28);
      doc.setFont('helvetica', 'normal');
      doc.text(`NIP. ${SD_LONRONG_PROFILE.kepalaSekolah.nip}`, 220, finalY + 32);

      const filename = `Rekap_EKinerja_${SD_LONRONG_PROFILE.npsn}_${new Date().toISOString().split('T')[0]}`;
      const result = exportDocToPdf(doc, filename, true);
      if (result.success) {
        confetti({ particleCount: 35, spread: 50 });
      }
    });
  }

  renderContent();
}
