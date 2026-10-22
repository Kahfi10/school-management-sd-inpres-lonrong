import { db, type BukuTamuRecord } from '../../db/local_db';
import { syncEngine } from '../../db/sync_engine';
import { SD_LONRONG_PROFILE } from '../../config/school_profile';
import SignaturePad from 'signature_pad';
import confetti from 'canvas-confetti';

export async function renderBukuTamuView(container: HTMLElement) {
  let isKioskMode = false;

  async function loadData() {
    return await db.bukuTamu.reverse().toArray();
  }

  async function renderContent() {
    const list = await loadData();
    const pegawaiList = await db.pegawai.toArray();

    if (isKioskMode) {
      renderKioskMode(container, pegawaiList);
      return;
    }

    const dinasCount = list.filter((b) => b.kategoriTamu === 'Dinas Pendidikan').length;
    const pengawasCount = list.filter((b) => b.kategoriTamu === 'Pengawas Sekolah').length;
    const waliCount = list.filter((b) => b.kategoriTamu === 'Wali Murid').length;
    const umumCount = list.length - (dinasCount + pengawasCount + waliCount);

    container.innerHTML = `
      <div class="page-container">
        <!-- Header Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.35rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.25rem;">
              <span class="status-pill neutral">Resepsionis Digital Aktif</span>
              <span style="font-size: 0.73rem; color: var(--apple-text-tertiary);">Meja Piket & Front Office SD Inpres Lonrong</span>
            </div>
            <h1 style="font-size: 1.4rem; font-weight: 700; letter-spacing: -0.015em;">Buku Tamu & Kunjungan Digital</h1>
            <p style="font-size: 0.82rem; color: var(--apple-text-secondary); margin-top: 0.15rem;">
              Pencatatan Tamu Kedinasan, Pengawas Pembina, dan Wali Murid dengan Tanda Tangan Digital
            </p>
          </div>
          <div style="display: flex; gap: 0.45rem;">
            <button class="apple-btn apple-btn-primary" id="btnLaunchKiosk">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              Buka Kiosk Mode (Layar Tamu)
            </button>
          </div>
        </div>

        <!-- Informative Metrics Summary Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; margin-bottom: 1.35rem;">
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Total Kunjungan</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-text-primary); margin: 2px 0;">${list.length} <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Tamu Terdaftar</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Buku Tamu Meja Resepsionis</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Kunjungan Kedinasan</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-blue); margin: 2px 0;">${dinasCount} <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Tamu</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Dinas Pendidikan Kab. Bantaeng</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Supervisi Pengawas</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-green); margin: 2px 0;">${pengawasCount} <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Tamu</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Supervisi Manajerial & Akademik</div>
          </div>
          <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.85rem 1.15rem;">
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Wali Murid & Mitra</div>
            <div style="font-size: 1.45rem; font-weight: 700; color: var(--apple-orange); margin: 2px 0;">${waliCount + umumCount} <span style="font-size: 0.82rem; font-weight: 500; color: var(--apple-text-secondary);">Tamu</span></div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Konsultasi & Koordinasi Sekolah</div>
          </div>
        </div>

        <!-- Table Visitors Card -->
        <div class="apple-table-card">
          <div class="table-toolbar">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--apple-text-primary);">
              Daftar Kunjungan Terdaftar (${list.length} Tamu)
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table class="apple-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Nama Lengkap Tamu</th>
                  <th>Instansi / Kategori</th>
                  <th>Kontak WhatsApp</th>
                  <th>Tujuan Kunjungan</th>
                  <th>Pegawai yang Dituju</th>
                  <th style="text-align: center;">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>
                ${
                  list.length === 0
                    ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem; color: var(--apple-text-tertiary);">
                      Belum ada catatan buku tamu hari ini.
                    </td>
                  </tr>
                `
                    : list
                        .map(
                          (b) => `
                  <tr>
                    <td>
                      <div style="font-weight: 700; font-size: 0.82rem;">${b.jamKunjungan} WITA</div>
                      <div style="font-size: 0.7rem; color: var(--apple-text-tertiary);">${b.tanggalKunjungan}</div>
                    </td>
                    <td>
                      <div style="font-weight: 700; font-size: 0.85rem; color: var(--apple-text-primary);">${b.namaTamu}</div>
                    </td>
                    <td>
                      <span class="status-pill ${
                        b.kategoriTamu === 'Pengawas Sekolah'
                          ? 'info'
                          : b.kategoriTamu === 'Dinas Pendidikan'
                          ? 'success'
                          : b.kategoriTamu === 'Wali Murid'
                          ? 'warning'
                          : 'neutral'
                      }">
                        ${b.kategoriTamu}
                      </span>
                      <div style="font-size: 0.72rem; color: var(--apple-text-secondary); margin-top: 2px;">${b.instansiAsal}</div>
                    </td>
                    <td>
                      <a href="https://wa.me/${b.noWhatsapp.replace(/^0/, '62')}" target="_blank" style="color: var(--apple-blue); font-weight: 600; text-decoration: none; font-size: 0.8rem;">
                        ${b.noWhatsapp}
                      </a>
                    </td>
                    <td style="max-width: 250px;">
                      <div style="font-size: 0.8rem; line-height: 1.35;">${b.tujuanKunjungan}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600; font-size: 0.8rem;">${b.pegawaiDituju}</div>
                    </td>
                    <td style="text-align: center;">
                      ${
                        b.tandaTanganBase64
                          ? `
                        <div style="background: white; border: 1px solid var(--apple-border-subtle); border-radius: 4px; padding: 2px; display: inline-block;">
                          <img src="${b.tandaTanganBase64.replace(/"/g, "'")}" style="max-height: 32px; max-width: 85px;" alt="TTD Tamu" />
                        </div>
                      `
                          : '<span style="color: var(--apple-text-tertiary); font-size: 0.72rem;">-</span>'
                      }
                    </td>
                  </tr>
                `
                        )
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btnLaunchKiosk')?.addEventListener('click', () => {
      isKioskMode = true;
      renderContent();
    });
  }

  function renderKioskMode(cont: HTMLElement, pegawaiList: any[]) {
    cont.innerHTML = `
      <div style="min-height: 100vh; background: var(--apple-bg); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem;">
        <!-- Kiosk Header -->
        <div style="width: 100%; max-width: 660px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <img src="/logo.png" alt="Logo SD Inpres Lonrong" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--apple-text-primary); letter-spacing: -0.015em;">${SD_LONRONG_PROFILE.namaSekolah}</div>
              <div style="font-size: 0.78rem; color: var(--apple-text-secondary);">Buku Tamu & Kunjungan Tamu Resmi</div>
            </div>
          </div>
          <button class="apple-btn apple-btn-secondary" id="btnExitKiosk" style="font-size: 0.78rem; padding: 0.4rem 0.75rem;">
            Kembali ke Beranda
          </button>
        </div>

        <!-- Kiosk Card -->
        <div class="bento-card" style="width: 100%; max-width: 660px; box-shadow: var(--apple-shadow-md); border-radius: var(--radius-lg); padding: 1.75rem 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.2rem;">Formulir Kehadiran Tamu</h2>
          <p style="font-size: 0.8rem; color: var(--apple-text-secondary); margin-bottom: 1.35rem;">
            Silakan mengisi data kunjungan Anda pada formulir di bawah ini:
          </p>

          <form id="formKioskCheckIn">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="apple-input-group">
                <label class="apple-label">Nama Lengkap *</label>
                <input type="text" class="apple-input" name="namaTamu" required placeholder="Contoh: Dra. Hj. Maryam, M.Pd." />
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Nomor WhatsApp / HP *</label>
                <input type="tel" class="apple-input" name="noWhatsapp" required placeholder="Contoh: 081242..." />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="apple-input-group">
                <label class="apple-label">Kategori Tamu *</label>
                <select class="apple-select" name="kategoriTamu" required>
                  <option value="Wali Murid">Wali Murid / Orang Tua Siswa</option>
                  <option value="Pengawas Sekolah">Pengawas Sekolah Binaan</option>
                  <option value="Dinas Pendidikan">Dinas Pendidikan Kab. Bantaeng</option>
                  <option value="Tamu Umum">Tamu Umum / Instansi Lain</option>
                  <option value="Mitra/Vendor">Mitra Sekolah / Vendor</option>
                </select>
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Instansi / Asal Lembaga *</label>
                <input type="text" class="apple-input" name="instansiAsal" required placeholder="Contoh: Orang Tua Siswa Kelas 1 / Korwil" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="apple-input-group">
                <label class="apple-label">Pegawai yang Dituju *</label>
                <select class="apple-select" name="pegawaiDituju" required>
                  <option value="Kepala Sekolah">Kepala Sekolah (Drs. H. Syamsuddin, M.Pd.)</option>
                  ${pegawaiList.map((p) => `<option value="${p.namaLengkap}">${p.namaLengkap} (${p.jabatan})</option>`).join('')}
                </select>
              </div>
              <div class="apple-input-group">
                <label class="apple-label">Keperluan / Tujuan *</label>
                <input type="text" class="apple-input" name="tujuanKunjungan" required placeholder="Contoh: Koordinasi Administrasi / Konsultasi" />
              </div>
            </div>

            <!-- Signature Pad Canvas -->
            <div class="apple-input-group" style="margin-top: 0.35rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label class="apple-label">Tanda Tangan Digital *</label>
                <button type="button" class="apple-btn apple-btn-ghost" id="btnClearSignature" style="padding: 0.15rem 0.45rem; font-size: 0.72rem;">
                  Hapus / Ulangi
                </button>
              </div>
              <div style="background: #FFFFFF; border: 1.5px dashed var(--apple-border-strong); border-radius: var(--radius-sm); overflow: hidden; height: 140px; position: relative;">
                <canvas id="signatureCanvas" style="width: 100%; height: 100%; cursor: crosshair; touch-action: none;"></canvas>
              </div>
            </div>

            <div style="margin-top: 1.25rem;">
              <button type="submit" class="apple-btn apple-btn-primary" style="width: 100%; padding: 0.85rem; font-size: 0.95rem; font-weight: 700; border-radius: var(--radius-sm);">
                Simpan Kehadiran & Check-In
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Exit Kiosk
    cont.querySelector('#btnExitKiosk')?.addEventListener('click', () => {
      isKioskMode = false;
      renderContent();
    });

    // Initialize Signature Pad
    const canvas = cont.querySelector('#signatureCanvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.width = canvas.offsetWidth || 600;
      canvas.height = canvas.offsetHeight || 140;
      const signaturePad = new SignaturePad(canvas, {
        penColor: '#0071E3',
        minWidth: 1.5,
        maxWidth: 2.8,
      });

      cont.querySelector('#btnClearSignature')?.addEventListener('click', () => {
        signaturePad.clear();
      });

      // Submit Kiosk Form
      const form = cont.querySelector('#formKioskCheckIn') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        let ttdData = '';
        if (!signaturePad.isEmpty()) {
          ttdData = signaturePad.toDataURL();
        }

        const now = new Date();
        const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

        const newTamu: BukuTamuRecord = {
          id: `btm_${Date.now()}`,
          tanggalKunjungan: now.toISOString().split('T')[0],
          jamKunjungan: jamStr,
          namaTamu: formData.get('namaTamu') as string,
          instansiAsal: formData.get('instansiAsal') as string,
          kategoriTamu: formData.get('kategoriTamu') as any,
          noWhatsapp: formData.get('noWhatsapp') as string,
          tujuanKunjungan: formData.get('tujuanKunjungan') as string,
          pegawaiDituju: formData.get('pegawaiDituju') as string,
          tandaTanganBase64: ttdData,
          syncStatus: 'synced',
        };

        await db.bukuTamu.add(newTamu);
        await syncEngine.queueMutation('bukuTamu', newTamu.id, 'create', newTamu);

        confetti({ particleCount: 50, spread: 60 });
        alert(`Terima kasih Bapak/Ibu ${newTamu.namaTamu}. Kunjungan Anda telah resmi tercatat.`);
        isKioskMode = false;
        renderContent();
      });
    }
  }

  renderContent();
}
