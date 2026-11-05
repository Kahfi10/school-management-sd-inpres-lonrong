// Cloud Sync Configuration Modal (Apple HIG Style)
import { cloudSyncService, type CloudSyncConfig } from '../../db/cloud_sync_service';
import { syncEngine } from '../../db/sync_engine';
import { showConfirmDialog } from '../../utils/apple_alerts';

export async function openCloudSyncModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const currentConfig = cloudSyncService.getConfig();
  const pendingCount = await syncEngine.getPendingCount();

  const lastSyncStr = currentConfig.lastSyncTimestamp
    ? new Date(currentConfig.lastSyncTimestamp).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Belum pernah';

  const providerLabel =
    currentConfig.provider === 'supabase'
      ? 'Supabase Cloud (Real-Time Dua Arah)'
      : currentConfig.provider === 'googlesheets'
      ? 'Google Sheets (Audit Log Satu Arah)'
      : 'Penyimpanan Lokal Mandiri (Offline)';

  const providerBadgeClass =
    currentConfig.provider === 'supabase'
      ? 'solid-badge-blue'
      : currentConfig.provider === 'googlesheets'
      ? 'solid-badge-emerald'
      : 'solid-badge-neutral';

  const modalHtml = `
    <div class="modal-backdrop active" id="cloudSyncBackdrop" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
      <div class="apple-card" style="width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; background: var(--apple-bg-primary); border-radius: var(--apple-radius-lg); box-shadow: var(--apple-shadow-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--apple-border-subtle); padding-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(0, 113, 227, 0.12); color: var(--apple-blue); display: flex; align-items: center; justify-content: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            </div>
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; color: var(--apple-text-primary);">Pusat Sinkronisasi & Data Terdistribusi</h2>
              <p style="font-size: 0.82rem; color: var(--apple-text-secondary); margin: 0.15rem 0 0 0;">SD Inpres Lonrong • High-Performance Outbox • Zero-Lag Delta Sync</p>
            </div>
          </div>
          <button class="apple-btn apple-btn-ghost" id="btnCloseCloudSync" style="padding: 0.4rem; color: var(--apple-text-tertiary);" title="Tutup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Telemetry & Live Status Strip -->
        <div style="background: var(--apple-bg-secondary); border: 1px solid var(--apple-border-subtle); border-radius: var(--apple-radius-md); padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--apple-text-tertiary);">Status Sinkronisasi Saat Ini</div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem;">
              <span class="solid-badge ${providerBadgeClass}" style="font-size: 0.78rem;">${providerLabel}</span>
              <span style="font-size: 0.78rem; color: var(--apple-text-secondary);">• Terakhir: <strong>${lastSyncStr}</strong></span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="text-align: right; margin-right: 0.35rem;">
              <div style="font-size: 0.72rem; color: var(--apple-text-tertiary);">Antrean Outbox</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: ${pendingCount > 0 ? 'var(--apple-orange)' : 'var(--apple-green)'};">
                ${pendingCount} Mutasi Pending
              </div>
            </div>
            <button class="apple-btn apple-btn-primary" id="btnSyncNowDirect" style="font-size: 0.8rem; padding: 0.45rem 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              Sinkronkan Sekarang
            </button>
          </div>
        </div>

        <!-- Segmented Tab Navigation -->
        <div class="apple-segmented-control" style="width: 100%; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;">
          <button class="segment-btn active" id="tabBtnSupabase">Supabase Cloud</button>
          <button class="segment-btn" id="tabBtnGoogle">Google Sheets</button>
          <button class="segment-btn" id="tabBtnIntranet">Intranet Sekolah</button>
          <button class="segment-btn" id="tabBtnBackup">Cadangan JSON</button>
        </div>

        <!-- Alert Notification Box -->
        <div id="syncFeedbackAlert" style="display: none; padding: 0.75rem 1rem; border-radius: var(--apple-radius-sm); font-size: 0.84rem; line-height: 1.4;"></div>

        <!-- Tab 1: Supabase (Recommended) -->
        <div id="tabContentSupabase" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="background: rgba(0, 113, 227, 0.05); border: 1px solid rgba(0, 113, 227, 0.2); border-radius: var(--apple-radius-md); padding: 0.85rem 1rem;">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--apple-blue); margin-bottom: 0.25rem;">Rekomendasi Utama: PostgreSQL Real-Time Cloud (100% Gratis)</div>
            <div style="font-size: 0.8rem; color: var(--apple-text-secondary); line-height: 1.45;">
              Menghubungkan aplikasi ke cloud Supabase gratis. Mendukung <strong>Bulk Batch Upsert</strong> (mengirim puluhan perubahan sekaligus dalam 1 request) dan <strong>Delta High-Water Mark</strong> (hanya menarik data yang baru diubah).
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--apple-text-primary);">Supabase Project URL</label>
            <input type="url" id="inputSupabaseUrl" class="apple-input" placeholder="https://xxxxxxxx.supabase.co" value="${escapeHtml(currentConfig.supabaseUrl)}" style="width: 100%; padding: 0.6rem 0.8rem; font-size: 0.86rem;" />
            <span style="font-size: 0.74rem; color: var(--apple-text-tertiary);">Dashboard Supabase > Project Settings > API > Project URL</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--apple-text-primary);">Supabase Anon Public API Key</label>
            <input type="password" id="inputSupabaseKey" class="apple-input" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="${escapeHtml(currentConfig.supabaseAnonKey)}" style="width: 100%; padding: 0.6rem 0.8rem; font-size: 0.86rem; font-family: monospace;" />
            <span style="font-size: 0.74rem; color: var(--apple-text-tertiary);">Kunci publik aman bawaan browser (Project Settings > API > anon public)</span>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; background: var(--apple-bg-secondary); border-radius: var(--apple-radius-sm);">
            <div>
              <div style="font-size: 0.84rem; font-weight: 700;">Jadikan Supabase Sebagai Cloud Provider Utama</div>
              <div style="font-size: 0.75rem; color: var(--apple-text-secondary);">Aktifkan sinkronisasi otomatis batch saat komputer terhubung ke internet</div>
            </div>
            <input type="checkbox" id="chkUseSupabase" ${currentConfig.provider === 'supabase' ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--apple-blue);" />
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.5rem;">
            <button class="apple-btn apple-btn-secondary" id="btnTestSupabase" style="font-size: 0.82rem; padding: 0.5rem 0.9rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Uji Koneksi
            </button>
            <button class="apple-btn apple-btn-secondary" id="btnCopySqlSchema" style="font-size: 0.82rem; padding: 0.5rem 0.9rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Salin Skema SQL (10 Tabel Lengkap)
            </button>
            <button class="apple-btn apple-btn-secondary" id="btnPullSupabaseDelta" style="font-size: 0.82rem; padding: 0.5rem 0.9rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Tarik Data Baru (Delta)
            </button>
            <button class="apple-btn apple-btn-secondary" id="btnPullSupabaseFull" style="font-size: 0.82rem; padding: 0.5rem 0.9rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>
              Tarik Semua Data (Full Pull)
            </button>
            <button class="apple-btn apple-btn-primary" id="btnSaveSupabase" style="font-size: 0.82rem; padding: 0.5rem 1.15rem; margin-left: auto;">
              Simpan & Terapkan
            </button>
          </div>
        </div>

        <!-- Tab 2: Google Sheets -->
        <div id="tabContentGoogle" style="display: none; flex-direction: column; gap: 1rem;">
          <div style="background: rgba(52, 199, 89, 0.08); border: 1px solid rgba(52, 199, 89, 0.25); border-radius: var(--apple-radius-md); padding: 0.85rem 1rem;">
            <div style="font-weight: 700; font-size: 0.88rem; color: #1e7e34; margin-bottom: 0.25rem;">Audit Trail: Google Drive / Spreadsheet Sekolah (Satu Arah)</div>
            <div style="font-size: 0.8rem; color: var(--apple-text-secondary); line-height: 1.45;">
              Berfungsi sebagai pencatat riwayat (audit log) otomatis setiap kali terjadi mutasi siswa, jurnal guru, atau aset. Berkas spreadsheet dapat dilihat langsung oleh Kepala Sekolah di Google Drive tanpa mengubah basis data lokal.
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--apple-text-primary);">Google Apps Script Web App URL</label>
            <input type="url" id="inputGoogleWebhook" class="apple-input" placeholder="https://script.google.com/macros/s/xxxx/exec" value="${escapeHtml(currentConfig.googleWebhookUrl)}" style="width: 100%; padding: 0.6rem 0.8rem; font-size: 0.86rem;" />
            <span style="font-size: 0.74rem; color: var(--apple-text-tertiary);">URL Web App yang diperoleh setelah Deploy di Google Apps Script</span>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; background: var(--apple-bg-secondary); border-radius: var(--apple-radius-sm);">
            <div>
              <div style="font-size: 0.84rem; font-weight: 700;">Aktifkan Pengiriman Log ke Google Sheets</div>
              <div style="font-size: 0.75rem; color: var(--apple-text-secondary);">Setiap mutasi siswa/guru akan otomatis dikirim sebagai baris baru di Spreadsheet</div>
            </div>
            <input type="checkbox" id="chkUseGoogle" ${currentConfig.provider === 'googlesheets' ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--apple-blue);" />
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.5rem;">
            <button class="apple-btn apple-btn-secondary" id="btnTestGoogle" style="font-size: 0.82rem; padding: 0.5rem 0.9rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Uji Webhook
            </button>
            <button class="apple-btn apple-btn-secondary" id="btnCopyGasCode" style="font-size: 0.82rem; padding: 0.5rem 0.9rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Salin Kode Apps Script
            </button>
            <button class="apple-btn apple-btn-primary" id="btnSaveGoogle" style="font-size: 0.82rem; padding: 0.5rem 1.15rem; margin-left: auto;">
              Simpan & Terapkan
            </button>
          </div>
        </div>

        <!-- Tab 3: Intranet Sekolah (Offline Wi-Fi Hub) -->
        <div id="tabContentIntranet" style="display: none; flex-direction: column; gap: 1rem;">
          <div style="background: rgba(255, 149, 0, 0.08); border: 1px solid rgba(255, 149, 0, 0.25); border-radius: var(--apple-radius-md); padding: 0.85rem 1rem;">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--apple-orange); margin-bottom: 0.25rem;">Mode Terdistribusi: Jaringan Lokal Wi-Fi SD Inpres Lonrong</div>
            <div style="font-size: 0.8rem; color: var(--apple-text-secondary); line-height: 1.45;">
              Jika sekolah mengalami kendala jaringan internet (mati lampu atau kuota habis), aplikasi dapat tetap beroperasi secara terdistribusi di ruang guru melalui jaringan Wi-Fi lokal sekolah.
            </div>
          </div>

          <div style="background: var(--apple-bg-secondary); border-radius: var(--apple-radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.65rem;">
            <div style="font-weight: 700; font-size: 0.86rem; color: var(--apple-text-primary);">Panduan Penggunaan Intranet Guru:</div>
            <ol style="margin: 0; padding-left: 1.25rem; font-size: 0.8rem; color: var(--apple-text-secondary); line-height: 1.6;">
              <li>Jadikan laptop Operator / Tata Usaha sebagai <strong>Local Hub Server</strong> dengan menjalankan perintah <code>npm run preview -- --host</code>.</li>
              <li>Pastikan laptop guru dan tablet tamu terhubung ke Wi-Fi sekolah yang sama (misal: <em>WIFI-SD-LONRONG</em>).</li>
              <li>Buka peramban di laptop guru dengan alamat IP lokal, contoh: <code>http://192.168.1.100:3000</code>.</li>
              <li>Seluruh data akan otomatis tersinkron antar-tab dan tersimpan aman di IndexedDB masing-masing perangkat.</li>
            </ol>
          </div>
        </div>

        <!-- Tab 4: Disaster Recovery Backup & Restore -->
        <div id="tabContentBackup" style="display: none; flex-direction: column; gap: 1rem;">
          <div style="background: var(--apple-bg-secondary); border-radius: var(--apple-radius-md); padding: 0.85rem 1rem;">
            <div style="font-weight: 700; font-size: 0.88rem; margin-bottom: 0.25rem;">Cadangan Database Mandiri (Offline JSON Backup)</div>
            <div style="font-size: 0.8rem; color: var(--apple-text-secondary); line-height: 1.45;">
              Unduh seluruh isi basis data lengkap (10 tabel: Siswa, Pegawai, Sarpras, Beban Ajar, Rombel, Mutasi, Jurnal SKP, Buku Tamu, dll.) ke berkas JSON untuk disimpan di flashdisk atau drive pribadi.
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; border: 1px dashed var(--apple-border-subtle); padding: 1.25rem; border-radius: var(--apple-radius-md); text-align: center; align-items: center;">
            <div style="font-weight: 700; font-size: 0.92rem;">Cadangkan Semua Data Sekolah</div>
            <p style="font-size: 0.8rem; color: var(--apple-text-secondary); max-width: 440px; margin: 0;">
              Satu klik untuk mengunduh snapshot data lengkap SD Inpres Lonrong yang dapat dipulihkan kapan saja di komputer mana pun tanpa koneksi internet.
            </p>
            <button class="apple-btn apple-btn-primary" id="btnDownloadJsonBackup" style="font-size: 0.86rem; padding: 0.6rem 1.25rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Unduh Berkas Cadangan (.json)
            </button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; border: 1px dashed var(--apple-border-subtle); padding: 1.25rem; border-radius: var(--apple-radius-md); text-align: center; align-items: center;">
            <div style="font-weight: 700; font-size: 0.92rem; color: var(--apple-orange);">Pulihkan Database Dari Berkas Cadangan</div>
            <p style="font-size: 0.8rem; color: var(--apple-text-secondary); max-width: 440px; margin: 0;">
              Pilih berkas JSON hasil unduhan sebelumnya untuk memulihkan seluruh catatan lokal dengan aman.
            </p>
            <input type="file" id="inputFileRestore" accept=".json" style="display: none;" />
            <button class="apple-btn apple-btn-secondary" id="btnTriggerRestoreFile" style="font-size: 0.86rem; padding: 0.6rem 1.25rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Pilih Berkas Cadangan (.json)
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  modalRoot.innerHTML = modalHtml;

  // Helpers
  function showAlert(msg: string, type: 'success' | 'error' | 'info') {
    const el = document.getElementById('syncFeedbackAlert');
    if (!el) return;
    el.style.display = 'block';
    if (type === 'success') {
      el.style.background = 'rgba(52, 199, 89, 0.12)';
      el.style.color = '#1e7e34';
      el.style.border = '1px solid rgba(52, 199, 89, 0.3)';
    } else if (type === 'error') {
      el.style.background = 'rgba(255, 59, 48, 0.12)';
      el.style.color = '#c82333';
      el.style.border = '1px solid rgba(255, 59, 48, 0.3)';
    } else {
      el.style.background = 'rgba(0, 113, 227, 0.1)';
      el.style.color = 'var(--apple-blue)';
      el.style.border = '1px solid rgba(0, 113, 227, 0.25)';
    }
    el.textContent = msg;
  }

  // Close handler
  const closeModal = () => {
    modalRoot.innerHTML = '';
  };

  document.getElementById('btnCloseCloudSync')?.addEventListener('click', closeModal);
  document.getElementById('cloudSyncBackdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Quick Sync Now button
  document.getElementById('btnSyncNowDirect')?.addEventListener('click', async () => {
    showAlert('Menjalankan sinkronisasi massal (Flush Outbox & Delta Pull)...', 'info');
    const flushRes = await syncEngine.flushOutbox();
    const pullRes = await cloudSyncService.pullAllFromSupabase(false);
    showAlert(
      `Sinkronisasi selesai! ${flushRes.processed} data dikirim, ${pullRes.totalPulled} data diperbarui.`,
      'success'
    );
  });

  // Tab switching
  const tabSupabase = document.getElementById('tabBtnSupabase');
  const tabGoogle = document.getElementById('tabBtnGoogle');
  const tabIntranet = document.getElementById('tabBtnIntranet');
  const tabBackup = document.getElementById('tabBtnBackup');
  const contentSupabase = document.getElementById('tabContentSupabase');
  const contentGoogle = document.getElementById('tabContentGoogle');
  const contentIntranet = document.getElementById('tabContentIntranet');
  const contentBackup = document.getElementById('tabContentBackup');

  const switchTab = (activeTab: HTMLElement, activeContent: HTMLElement) => {
    [tabSupabase, tabGoogle, tabIntranet, tabBackup].forEach((t) => t?.classList.remove('active'));
    [contentSupabase, contentGoogle, contentIntranet, contentBackup].forEach((c) => {
      if (c) c.style.display = 'none';
    });
    activeTab.classList.add('active');
    activeContent.style.display = 'flex';
  };

  tabSupabase?.addEventListener('click', () => switchTab(tabSupabase, contentSupabase!));
  tabGoogle?.addEventListener('click', () => switchTab(tabGoogle, contentGoogle!));
  tabIntranet?.addEventListener('click', () => switchTab(tabIntranet, contentIntranet!));
  tabBackup?.addEventListener('click', () => switchTab(tabBackup, contentBackup!));

  // Supabase actions
  document.getElementById('btnTestSupabase')?.addEventListener('click', async () => {
    const url = (document.getElementById('inputSupabaseUrl') as HTMLInputElement).value;
    const key = (document.getElementById('inputSupabaseKey') as HTMLInputElement).value;
    showAlert('Menguji koneksi ke Supabase Cloud REST endpoint...', 'info');
    const result = await cloudSyncService.testSupabaseConnection(url, key);
    showAlert(result.message, result.success ? 'success' : 'error');
  });

  document.getElementById('btnCopySqlSchema')?.addEventListener('click', async () => {
    const sql = cloudSyncService.getSupabaseSqlSchema();
    await navigator.clipboard.writeText(sql);
    showAlert('Skema SQL 10 tabel lengkap berhasil disalin! Tempelkan di SQL Editor dashboard Supabase.', 'success');
  });

  document.getElementById('btnSaveSupabase')?.addEventListener('click', async () => {
    const url = (document.getElementById('inputSupabaseUrl') as HTMLInputElement).value.trim();
    const key = (document.getElementById('inputSupabaseKey') as HTMLInputElement).value.trim();
    const useSupabase = (document.getElementById('chkUseSupabase') as HTMLInputElement).checked;

    cloudSyncService.saveConfig({
      provider: useSupabase ? 'supabase' : 'none',
      supabaseUrl: url,
      supabaseAnonKey: key,
    });

    showAlert('Pengaturan Supabase berhasil disimpan! Menjalankan sinkronisasi awal...', 'success');
    await syncEngine.flushOutbox();
  });

  document.getElementById('btnPullSupabaseDelta')?.addEventListener('click', async () => {
    showAlert('Menarik data mutasi terbaru (Delta Sync)...', 'info');
    const res = await cloudSyncService.pullAllFromSupabase(false);
    showAlert(`Berhasil! ${res.totalPulled} data baru ditarik ke penyimpanan lokal.`, 'success');
  });

  document.getElementById('btnPullSupabaseFull')?.addEventListener('click', async () => {
    showAlert('Menarik seluruh basis data dari Supabase Cloud (Full Sync)...', 'info');
    const res = await cloudSyncService.pullAllFromSupabase(true);
    showAlert(`Berhasil! Seluruh data (${res.totalPulled} catatan) berhasil diperbarui ke komputer lokal.`, 'success');
  });

  // Google actions
  document.getElementById('btnCopyGasCode')?.addEventListener('click', async () => {
    const code = cloudSyncService.getGoogleAppsScriptCode();
    await navigator.clipboard.writeText(code);
    showAlert('Kode Google Apps Script berhasil disalin ke clipboard! Tempelkan di Extensions > Apps Script pada Google Sheet sekolah.', 'success');
  });

  document.getElementById('btnTestGoogle')?.addEventListener('click', async () => {
    const url = (document.getElementById('inputGoogleWebhook') as HTMLInputElement).value;
    showAlert('Menguji webhook Google Apps Script...', 'info');
    const res = await cloudSyncService.testGoogleWebhook(url);
    showAlert(res.message, res.success ? 'success' : 'error');
  });

  document.getElementById('btnSaveGoogle')?.addEventListener('click', async () => {
    const url = (document.getElementById('inputGoogleWebhook') as HTMLInputElement).value.trim();
    const useGoogle = (document.getElementById('chkUseGoogle') as HTMLInputElement).checked;

    cloudSyncService.saveConfig({
      provider: useGoogle ? 'googlesheets' : 'none',
      googleWebhookUrl: url,
    });

    showAlert('Pengaturan Google Sheets berhasil disimpan!', 'success');
  });

  // Backup & Restore actions
  document.getElementById('btnDownloadJsonBackup')?.addEventListener('click', async () => {
    try {
      const jsonStr = await cloudSyncService.exportFullBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup_sd_inpres_lonrong_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showAlert('Berkas cadangan JSON 10 tabel berhasil diunduh ke perangkat Anda.', 'success');
    } catch (e: any) {
      showAlert(`Gagal mengekspor data: ${e.message}`, 'error');
    }
  });

  const fileInput = document.getElementById('inputFileRestore') as HTMLInputElement;
  document.getElementById('btnTriggerRestoreFile')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const ok = await showConfirmDialog({
          title: 'Pulihkan Cadangan Data',
          message: 'Peringatan: Memulihkan cadangan akan menimpa data lokal saat ini dengan isi berkas cadangan. Lanjutkan proses ini?',
          confirmText: 'Timpa & Pulihkan',
          type: 'danger',
        });
        if (!ok) return;
        showAlert('Memulihkan data dari berkas cadangan...', 'info');
        const res = await cloudSyncService.restoreFullBackup(text);
        showAlert(`Pemulihan berhasil! ${res.restoredCount} catatan berhasil dipulihkan. Halaman akan diperbarui.`, 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        showAlert(`Gagal memulihkan cadangan: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  });
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
