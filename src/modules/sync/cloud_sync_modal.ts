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
      : 'solid-badge-slate';

  const modalHtml = `
    <div class="modal-backdrop active" id="cloudSyncBackdrop" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1.25rem;">
      <div class="modal-sheet" style="width: 100%; max-width: 720px; max-height: 90vh; background: #FFFFFF; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 20px; box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; overflow: hidden; animation: appleSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);">
        
        <!-- Modal Header -->
        <div class="modal-header" style="padding: 1.25rem 1.5rem; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: #0071E3; color: #FFFFFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0, 113, 227, 0.25);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            </div>
            <div>
              <h2 style="font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em; margin: 0; color: #0F172A;">Pusat Sinkronisasi & Data Terdistribusi</h2>
              <p style="font-size: 0.8rem; color: #64748B; margin: 0.15rem 0 0 0; font-weight: 500;">SD Inpres Lonrong • High-Performance Outbox • Zero-Lag Delta Sync</p>
            </div>
          </div>
          <button class="apple-btn apple-btn-ghost" id="btnCloseCloudSync" style="width: 32px; height: 32px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; background: #F1F5F9; color: #475569;" title="Tutup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div class="modal-body" style="padding: 1.5rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 1.25rem; background: #FFFFFF;">

          <!-- Telemetry & Live Status Strip -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B;">Status Sinkronisasi Saat Ini</div>
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-top: 0.35rem; flex-wrap: wrap;">
                <span class="solid-badge ${providerBadgeClass}" style="font-size: 0.78rem; font-weight: 600; padding: 0.28rem 0.7rem; border-radius: 6px;">${providerLabel}</span>
                <span style="font-size: 0.8rem; color: #475569; font-weight: 500;">• Terakhir: <strong style="color: #0F172A;">${lastSyncStr}</strong></span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div style="text-align: right;">
                <div style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; color: #64748B;">Antrean Outbox</div>
                <div style="font-size: 0.95rem; font-weight: 800; color: ${pendingCount > 0 ? '#D97706' : '#059669'};">
                  ${pendingCount} Mutasi Pending
                </div>
              </div>
              <button class="apple-btn apple-btn-primary" id="btnSyncNowDirect" style="font-size: 0.82rem; padding: 0.5rem 0.95rem; display: inline-flex; align-items: center; gap: 0.45rem; font-weight: 600; border-radius: 9px; background: #0071E3;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                Sinkronkan Sekarang
              </button>
            </div>
          </div>

          <!-- Segmented Tab Navigation -->
          <div class="apple-segmented-control" style="width: 100%; display: grid; grid-template-columns: repeat(4, 1fr); background: #F1F5F9; border: 1px solid #E2E8F0; padding: 3px; border-radius: 10px;">
            <button class="segment-btn active" id="tabBtnSupabase" style="font-size: 0.82rem; padding: 0.5rem 0.6rem;">Supabase Cloud</button>
            <button class="segment-btn" id="tabBtnGoogle" style="font-size: 0.82rem; padding: 0.5rem 0.6rem;">Google Sheets</button>
            <button class="segment-btn" id="tabBtnIntranet" style="font-size: 0.82rem; padding: 0.5rem 0.6rem;">Intranet Wi-Fi</button>
            <button class="segment-btn" id="tabBtnBackup" style="font-size: 0.82rem; padding: 0.5rem 0.6rem;">Cadangan JSON</button>
          </div>

          <!-- Alert Notification Box -->
          <div id="syncFeedbackAlert" style="display: none; padding: 0.85rem 1.15rem; border-radius: 10px; font-size: 0.85rem; line-height: 1.5; font-weight: 500;"></div>

          <!-- Tab 1: Supabase (Recommended) -->
          <div id="tabContentSupabase" style="display: flex; flex-direction: column; gap: 1.15rem;">
            <!-- Blue Announcement Banner -->
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 0.95rem 1.15rem;">
              <div style="font-weight: 700; font-size: 0.9rem; color: #1D4ED8; margin-bottom: 0.3rem;">Rekomendasi Utama: PostgreSQL Real-Time Cloud (100% Gratis)</div>
              <div style="font-size: 0.82rem; color: #1E3A8A; line-height: 1.5;">
                Menghubungkan aplikasi ke database Supabase gratis. Mendukung <strong>Bulk Batch Upsert</strong> (mengirim puluhan perubahan sekaligus dalam 1 request) dan <strong>Delta High-Water Mark</strong> (hanya menarik data yang baru diubah).
              </div>
            </div>

            <!-- Field 1: Supabase Project URL -->
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A;">Supabase Project URL</label>
                <button type="button" id="btnFillMyProjectUrl" class="apple-btn apple-btn-ghost" style="font-size: 0.74rem; color: #0071E3; padding: 0.15rem 0.4rem; text-decoration: underline; cursor: pointer; font-weight: 600;">
                  Gunakan URL Project Saya (sd-lonrong)
                </button>
              </div>
              <input type="url" id="inputSupabaseUrl" class="apple-input" placeholder="https://xxxxxxxx.supabase.co" value="${escapeHtml(currentConfig.supabaseUrl || 'https://ohqzmwdveugzqpzyvwye.supabase.co')}" style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
              <span style="font-size: 0.76rem; color: #64748B;">Buka Dashboard Supabase &gt; Project Settings &gt; API &gt; Project URL</span>
            </div>

            <!-- Field 2: Supabase Anon Key -->
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A;">Supabase Anon Public API Key</label>
                <button type="button" id="btnToggleKeyVisibility" class="apple-btn apple-btn-ghost" style="font-size: 0.74rem; color: #64748B; padding: 0.15rem 0.4rem; cursor: pointer; font-weight: 600;">
                  Tampilkan Kunci
                </button>
              </div>
              <input type="password" id="inputSupabaseKey" class="apple-input" placeholder="sb_publishable_... atau eyJhbGci..." value="${escapeHtml(currentConfig.supabaseAnonKey)}" style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; font-family: monospace; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
              <span style="font-size: 0.76rem; color: #64748B;">Salin Publishable Key (<code>sb_publishable_...</code>) dari Project Settings &gt; API</span>
            </div>

            <!-- Switch Activation -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
              <div>
                <div style="font-size: 0.86rem; font-weight: 700; color: #0F172A;">Jadikan Supabase Sebagai Cloud Provider Utama</div>
                <div style="font-size: 0.78rem; color: #64748B;">Aktifkan sinkronisasi otomatis batch saat komputer terhubung ke internet</div>
              </div>
              <input type="checkbox" id="chkUseSupabase" ${currentConfig.provider === 'supabase' || !currentConfig.provider || currentConfig.provider === 'none' ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; accent-color: #0071E3;" />
            </div>

            <!-- Preparation & Verification Grid -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.25rem;">
              <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B;">Langkah Persiapan &amp; Pengujian</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <button class="apple-btn apple-btn-secondary" id="btnCopySqlSchema" style="font-size: 0.82rem; padding: 0.65rem 0.9rem; justify-content: center; font-weight: 600; border-radius: 9px; display: inline-flex; align-items: center; gap: 0.45rem;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  Salin Skema SQL (10 Tabel)
                </button>
                <button class="apple-btn apple-btn-secondary" id="btnTestSupabase" style="font-size: 0.82rem; padding: 0.65rem 0.9rem; justify-content: center; font-weight: 600; border-radius: 9px; display: inline-flex; align-items: center; gap: 0.45rem;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Uji Koneksi REST
                </button>
              </div>
            </div>

            <!-- Manual Sync Actions Grid -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B;">Sinkronisasi Data Manual</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <button class="apple-btn apple-btn-secondary" id="btnPullSupabaseDelta" style="font-size: 0.82rem; padding: 0.65rem 0.9rem; justify-content: center; font-weight: 600; border-radius: 9px; display: inline-flex; align-items: center; gap: 0.45rem;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Tarik Data Baru (Delta)
                </button>
                <button class="apple-btn apple-btn-secondary" id="btnPullSupabaseFull" style="font-size: 0.82rem; padding: 0.65rem 0.9rem; justify-content: center; font-weight: 600; border-radius: 9px; display: inline-flex; align-items: center; gap: 0.45rem;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>
                  Tarik Semua Data (Full)
                </button>
              </div>
            </div>
          </div>

          <!-- Tab 2: Google Sheets -->
          <div id="tabContentGoogle" style="display: none; flex-direction: column; gap: 1.15rem;">
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 0.95rem 1.15rem;">
              <div style="font-weight: 700; font-size: 0.9rem; color: #15803D; margin-bottom: 0.3rem;">Audit Trail: Google Drive / Spreadsheet Sekolah (Satu Arah)</div>
              <div style="font-size: 0.82rem; color: #166534; line-height: 1.5;">
                Berfungsi sebagai pencatat riwayat (audit log) otomatis setiap kali terjadi mutasi siswa, jurnal guru, atau aset. Berkas spreadsheet dapat dilihat langsung oleh Kepala Sekolah di Google Drive tanpa mengubah basis data lokal.
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A;">Google Apps Script Web App URL</label>
              <input type="url" id="inputGoogleWebhook" class="apple-input" placeholder="https://script.google.com/macros/s/xxxx/exec" value="${escapeHtml(currentConfig.googleWebhookUrl)}" style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
              <span style="font-size: 0.76rem; color: #64748B;">URL Web App yang diperoleh setelah Deploy di Google Apps Script</span>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
              <div>
                <div style="font-size: 0.86rem; font-weight: 700; color: #0F172A;">Aktifkan Pengiriman Log ke Google Sheets</div>
                <div style="font-size: 0.78rem; color: #64748B;">Setiap mutasi siswa/guru akan otomatis dikirim sebagai baris baru di Spreadsheet</div>
              </div>
              <input type="checkbox" id="chkUseGoogle" ${currentConfig.provider === 'googlesheets' ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; accent-color: #0071E3;" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <button class="apple-btn apple-btn-secondary" id="btnTestGoogle" style="font-size: 0.82rem; padding: 0.65rem 0.9rem; justify-content: center; font-weight: 600; border-radius: 9px; display: inline-flex; align-items: center; gap: 0.45rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Uji Webhook
              </button>
              <button class="apple-btn apple-btn-secondary" id="btnCopyGasCode" style="font-size: 0.82rem; padding: 0.65rem 0.9rem; justify-content: center; font-weight: 600; border-radius: 9px; display: inline-flex; align-items: center; gap: 0.45rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Salin Kode Apps Script
              </button>
            </div>
          </div>

          <!-- Tab 3: Intranet Sekolah (Offline Wi-Fi Hub) -->
          <div id="tabContentIntranet" style="display: none; flex-direction: column; gap: 1.15rem;">
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 0.95rem 1.15rem;">
              <div style="font-weight: 700; font-size: 0.9rem; color: #B45309; margin-bottom: 0.3rem;">Mode Terdistribusi: Jaringan Lokal Wi-Fi SD Inpres Lonrong</div>
              <div style="font-size: 0.82rem; color: #92400E; line-height: 1.5;">
                Jika sekolah mengalami kendala jaringan internet (mati lampu atau kuota habis), aplikasi dapat tetap beroperasi secara terdistribusi di ruang guru melalui jaringan Wi-Fi lokal sekolah.
              </div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.15rem; display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="font-weight: 700; font-size: 0.88rem; color: #0F172A;">Panduan Penggunaan Intranet Guru:</div>
              <ol style="margin: 0; padding-left: 1.25rem; font-size: 0.82rem; color: #475569; line-height: 1.7;">
                <li>Jadikan laptop Operator / Tata Usaha sebagai <strong>Local Hub Server</strong> dengan menjalankan perintah <code style="background: #E2E8F0; padding: 0.15rem 0.35rem; border-radius: 4px; font-family: monospace;">npm run preview -- --host</code>.</li>
                <li>Pastikan laptop guru dan tablet tamu terhubung ke Wi-Fi sekolah yang sama (misal: <em>WIFI-SD-LONRONG</em>).</li>
                <li>Buka peramban di laptop guru dengan alamat IP lokal, contoh: <code style="background: #E2E8F0; padding: 0.15rem 0.35rem; border-radius: 4px; font-family: monospace;">http://192.168.1.100:3000</code>.</li>
                <li>Seluruh data akan otomatis tersinkron antar-tab dan tersimpan aman di IndexedDB masing-masing perangkat.</li>
              </ol>
            </div>
          </div>

          <!-- Tab 4: Disaster Recovery Backup & Restore -->
          <div id="tabContentBackup" style="display: none; flex-direction: column; gap: 1.15rem;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.95rem 1.15rem;">
              <div style="font-weight: 700; font-size: 0.9rem; color: #0F172A; margin-bottom: 0.3rem;">Cadangan Database Mandiri (Offline JSON Backup)</div>
              <div style="font-size: 0.82rem; color: #475569; line-height: 1.5;">
                Unduh seluruh isi basis data lengkap (10 tabel: Siswa, Pegawai, Sarpras, Beban Ajar, Rombel, Mutasi, Jurnal SKP, Buku Tamu, dll.) ke berkas JSON untuk disimpan di flashdisk atau drive pribadi.
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.75rem; border: 1.5px dashed #CBD5E1; padding: 1.25rem; border-radius: 12px; text-align: center; align-items: center; background: #FFFFFF;">
              <div style="font-weight: 700; font-size: 0.92rem; color: #0F172A;">Cadangkan Semua Data Sekolah</div>
              <p style="font-size: 0.82rem; color: #64748B; max-width: 440px; margin: 0; line-height: 1.45;">
                Satu klik untuk mengunduh snapshot data lengkap SD Inpres Lonrong yang dapat dipulihkan kapan saja di komputer mana pun tanpa koneksi internet.
              </p>
              <button class="apple-btn apple-btn-primary" id="btnDownloadJsonBackup" style="font-size: 0.84rem; padding: 0.6rem 1.25rem; font-weight: 600; border-radius: 9px; background: #0071E3; display: inline-flex; align-items: center; gap: 0.45rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Unduh Berkas Cadangan (.json)
              </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.75rem; border: 1.5px dashed #CBD5E1; padding: 1.25rem; border-radius: 12px; text-align: center; align-items: center; background: #FFFFFF;">
              <div style="font-weight: 700; font-size: 0.92rem; color: #D97706;">Pulihkan Database Dari Berkas Cadangan</div>
              <p style="font-size: 0.82rem; color: #64748B; max-width: 440px; margin: 0; line-height: 1.45;">
                Pilih berkas JSON hasil unduhan sebelumnya untuk memulihkan seluruh catatan lokal dengan aman.
              </p>
              <input type="file" id="inputFileRestore" accept=".json" style="display: none;" />
              <button class="apple-btn apple-btn-secondary" id="btnTriggerRestoreFile" style="font-size: 0.84rem; padding: 0.6rem 1.25rem; font-weight: 600; border-radius: 9px; display: inline-flex; align-items: center; gap: 0.45rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Pilih Berkas Cadangan (.json)
              </button>
            </div>
          </div>

        </div>

        <!-- Modal Footer (Fixed Sticky Bottom) -->
        <div class="modal-footer" style="padding: 1rem 1.5rem; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
          <button class="apple-btn apple-btn-secondary" id="btnCancelModal" style="font-size: 0.84rem; padding: 0.55rem 1.15rem; font-weight: 600; border-radius: 9px;">
            Tutup
          </button>
          <button class="apple-btn apple-btn-primary" id="btnSaveConfigFooter" style="font-size: 0.86rem; padding: 0.6rem 1.4rem; font-weight: 600; border-radius: 9px; background: #0071E3; box-shadow: 0 4px 12px rgba(0, 113, 227, 0.25);">
            Simpan &amp; Terapkan Konfigurasi
          </button>
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
      el.style.background = '#F0FDF4';
      el.style.color = '#15803D';
      el.style.border = '1px solid #BBF7D0';
    } else if (type === 'error') {
      el.style.background = '#FEF2F2';
      el.style.color = '#B91C1C';
      el.style.border = '1px solid #FECACA';
    } else {
      el.style.background = '#EFF6FF';
      el.style.color = '#1D4ED8';
      el.style.border = '1px solid #BFDBFE';
    }
    el.textContent = msg;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Close handlers
  const closeModal = () => {
    modalRoot.innerHTML = '';
  };

  document.getElementById('btnCloseCloudSync')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelModal')?.addEventListener('click', closeModal);
  document.getElementById('cloudSyncBackdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Toggle API Key visibility
  let keyVisible = false;
  const keyInput = document.getElementById('inputSupabaseKey') as HTMLInputElement;
  const toggleKeyBtn = document.getElementById('btnToggleKeyVisibility');
  toggleKeyBtn?.addEventListener('click', () => {
    keyVisible = !keyVisible;
    if (keyInput) {
      keyInput.type = keyVisible ? 'text' : 'password';
      toggleKeyBtn.textContent = keyVisible ? 'Sembunyikan' : 'Tampilkan Kunci';
    }
  });

  // Quick fill project URL button
  document.getElementById('btnFillMyProjectUrl')?.addEventListener('click', () => {
    const urlInput = document.getElementById('inputSupabaseUrl') as HTMLInputElement;
    if (urlInput) {
      urlInput.value = 'https://ohqzmwdveugzqpzyvwye.supabase.co';
      showAlert('URL Project sd-lonrong berhasil diisikan otomatis!', 'info');
    }
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

  let currentTab: 'supabase' | 'google' | 'intranet' | 'backup' = 'supabase';

  const switchTab = (activeTab: HTMLElement, activeContent: HTMLElement, tabKey: typeof currentTab) => {
    [tabSupabase, tabGoogle, tabIntranet, tabBackup].forEach((t) => t?.classList.remove('active'));
    [contentSupabase, contentGoogle, contentIntranet, contentBackup].forEach((c) => {
      if (c) c.style.display = 'none';
    });
    activeTab.classList.add('active');
    activeContent.style.display = 'flex';
    currentTab = tabKey;
  };

  tabSupabase?.addEventListener('click', () => switchTab(tabSupabase, contentSupabase!, 'supabase'));
  tabGoogle?.addEventListener('click', () => switchTab(tabGoogle, contentGoogle!, 'google'));
  tabIntranet?.addEventListener('click', () => switchTab(tabIntranet, contentIntranet!, 'intranet'));
  tabBackup?.addEventListener('click', () => switchTab(tabBackup, contentBackup!, 'backup'));

  // Common Save Handler (from Footer or Tab)
  const saveAllConfig = async () => {
    if (currentTab === 'supabase') {
      const url = (document.getElementById('inputSupabaseUrl') as HTMLInputElement).value.trim();
      const key = (document.getElementById('inputSupabaseKey') as HTMLInputElement).value.trim();
      const useSupabase = (document.getElementById('chkUseSupabase') as HTMLInputElement).checked;

      cloudSyncService.saveConfig({
        provider: useSupabase ? 'supabase' : 'none',
        supabaseUrl: url,
        supabaseAnonKey: key,
      });

      showAlert('Pengaturan Supabase Cloud berhasil disimpan! Menjalankan sinkronisasi awal...', 'success');
      await syncEngine.flushOutbox();
    } else if (currentTab === 'google') {
      const url = (document.getElementById('inputGoogleWebhook') as HTMLInputElement).value.trim();
      const useGoogle = (document.getElementById('chkUseGoogle') as HTMLInputElement).checked;

      cloudSyncService.saveConfig({
        provider: useGoogle ? 'googlesheets' : 'none',
        googleWebhookUrl: url,
      });

      showAlert('Pengaturan Google Sheets berhasil disimpan!', 'success');
    } else {
      showAlert('Pengaturan tersimpan.', 'success');
    }
  };

  document.getElementById('btnSaveConfigFooter')?.addEventListener('click', saveAllConfig);

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
