import { initializeDatabaseSeed } from './db/seed_data';
import { syncEngine, type SyncTelemetry } from './db/sync_engine';
import { authService } from './modules/auth/auth_service';
import { renderLoginModal } from './modules/auth/login_view';
import { renderDashboardView } from './modules/dashboard/dashboard_view';
import { renderSiswaView } from './modules/siswa/siswa_view';
import { renderKepegawaianView } from './modules/kepegawaian/kepegawaian_view';
import { renderEfilingView } from './modules/efiling/efiling_view';
import { renderSarprasView } from './modules/sarpras/sarpras_view';
import { renderJurnalView } from './modules/jurnal/jurnal_view';
import { renderBukuTamuView } from './modules/bukutamu/bukutamu_view';
import { openSecurityCenterModal } from './modules/security/security_view';
import { openCloudSyncModal } from './modules/sync/cloud_sync_modal';
import { openAdminSettingsModal } from './modules/settings/settings_modal';
import { renderPageSkeleton } from './utils/skeleton_loader';
import { showAlert, showConfirmDialog } from './utils/apple_alerts';
import type { UserAccount } from './db/local_db';

let currentNav = 'dashboard';

const navTitles: Record<string, string> = {
  dashboard: 'Dashboard Informasi Sekolah',
  siswa: 'Data Siswa & Alumni',
  kepegawaian: 'Data Guru & Beban Mengajar',
  efiling: 'Arsip Berkas Digital (Google Drive)',
  sarpras: 'Inventaris Sarana & Prasarana',
  jurnal: 'Jurnal Harian Mengajar Guru',
  bukutamu: 'Buku Tamu Kunjungan Sekolah',
};

function updateCurrentDateDisplay() {
  const dateEl = document.getElementById('currentDateDisplay');
  if (!dateEl) return;
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  dateEl.textContent = now.toLocaleDateString('id-ID', options);
}

async function initApp() {
  console.log('[Lonrong SmartEdu] Starting up application...');

  // 1. Initialize IndexedDB seed data
  await initializeDatabaseSeed();

  // 2. Setup Sync Telemetry Observer
  setupSyncTelemetry();

  // 3. Setup Theme Switcher
  setupTheme();

  // 4. Update Header Date
  updateCurrentDateDisplay();

  // 5. Setup Authentication and Routing
  authService.subscribe((user) => {
    updateUserInterface(user);
  });
}

function updateUserInterface(user: UserAccount | null) {
  const modalRoot = document.getElementById('modalRoot') as HTMLElement;
  const userNameEl = document.getElementById('sidebarUserName') as HTMLElement;
  const userRoleEl = document.getElementById('sidebarUserRole') as HTMLElement;
  const userAvatarEl = document.getElementById('sidebarUserAvatar') as HTMLElement;
  const btnAdminSettings = document.getElementById('btnAdminSettings') as HTMLElement;

  if (!user) {
    // Show Smart Login
    renderLoginModal(modalRoot, () => {
      modalRoot.innerHTML = '';
      updateUserInterface(authService.getCurrentUser());
    });
    return;
  }

  // Clear login modal
  modalRoot.innerHTML = '';

  // Update Sidebar user info
  if (userNameEl) userNameEl.textContent = user.namaLengkap;
  if (userRoleEl) {
    userRoleEl.textContent =
      user.role === 'admin'
        ? 'Kepala Sekolah (Super Admin)'
        : user.role === 'tendik'
        ? 'Tenaga Kependidikan / Operator'
        : 'Guru Kelas / Mapel';
  }
  if (userAvatarEl) userAvatarEl.textContent = user.namaLengkap.charAt(0);

  // Sembunyikan tombol pengaturan sistem jika peran adalah Guru biasa (agar tidak membingungkan)
  if (btnAdminSettings) {
    btnAdminSettings.style.display = user.role === 'guru' ? 'none' : 'inline-flex';
  }

  // Render current view
  navigateTo(currentNav);
}

function navigateTo(navKey: string) {
  currentNav = navKey;
  const viewContent = document.getElementById('appViewContent') as HTMLElement;
  const topNavTitle = document.getElementById('topNavTitle') as HTMLElement;

  if (topNavTitle) {
    topNavTitle.textContent = navTitles[navKey] || 'SD Inpres Lonrong';
  }

  // Update active sidebar item
  document.querySelectorAll('#sidebarNav .nav-item').forEach((item) => {
    const k = (item as HTMLElement).dataset.nav;
    if (k === navKey) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  if (!viewContent) return;

  // Proteksi Halaman Khusus (Bebas Jargon Teknis)
  const currentUser = authService.getCurrentUser();
  if (navKey === 'efiling' && currentUser?.role === 'guru') {
    viewContent.innerHTML = `
      <div class="page-container view-fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 55vh; text-align: center; padding: 2rem;">
        <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(255, 149, 0, 0.12); color: var(--apple-orange); display: flex; align-items: center; justify-content: center; margin-bottom: 1.15rem;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <h2 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.015em; margin-bottom: 0.35rem; color: var(--apple-text-primary);">Halaman Khusus Kepala Sekolah & Operator</h2>
        <p style="font-size: 0.88rem; color: var(--apple-text-secondary); max-width: 500px; line-height: 1.5; margin-bottom: 1.35rem;">
          Modul Arsip Berkas Digital Google Drive hanya dapat diakses oleh Kepala Sekolah dan Tenaga Administrasi / Operator Dapodik.
        </p>
        <button class="apple-btn apple-btn-primary" onclick="window.appNavigate('dashboard')">
          Kembali ke Dashboard Utama
        </button>
      </div>
    `;
    return;
  }

  // 1. Silky Smooth Top Progress Bar Animation
  const progressBar = document.getElementById('pageTopProgressBar');
  if (progressBar) {
    progressBar.classList.add('active');
    progressBar.style.width = '15%';
    setTimeout(() => {
      if (progressBar && currentNav === navKey) progressBar.style.width = '70%';
    }, 40);
  }

  // 2. Render tailored Apple HIG Skeleton immediately for smooth transition
  renderPageSkeleton(viewContent, navKey);

  // 3. Render actual view with smooth fade-in after a comfortable transition duration
  const targetNav = navKey;
  setTimeout(async () => {
    if (currentNav !== targetNav) return;

    switch (targetNav) {
      case 'dashboard':
        await renderDashboardView(viewContent);
        break;
      case 'siswa':
        await renderSiswaView(viewContent);
        break;
      case 'kepegawaian':
        await renderKepegawaianView(viewContent);
        break;
      case 'efiling':
        await renderEfilingView(viewContent);
        break;
      case 'sarpras':
        await renderSarprasView(viewContent);
        break;
      case 'jurnal':
        await renderJurnalView(viewContent);
        break;
      case 'bukutamu':
        await renderBukuTamuView(viewContent);
        break;
      default:
        await renderDashboardView(viewContent);
    }

    // Complete Progress Bar smoothly
    if (progressBar) {
      progressBar.style.width = '100%';
      setTimeout(() => {
        progressBar.classList.remove('active');
        setTimeout(() => {
          if (progressBar) progressBar.style.width = '0%';
        }, 220);
      }, 160);
    }

    // Apply view fade-in animation
    const container = viewContent.querySelector('.page-container') || viewContent.firstElementChild;
    if (container) {
      container.classList.add('view-fade-in');
    }
  }, 160);
}

function setupSyncTelemetry() {
  const pill = document.getElementById('syncStatusPill');
  const text = document.getElementById('syncStatusText');
  const btnManual = document.getElementById('btnManualSync');

  syncEngine.subscribe((telemetry: SyncTelemetry) => {
    if (!pill || !text) return;

    if (!telemetry.networkOnline) {
      pill.className = 'sync-pill offline';
      text.textContent = 'Mode Offline (Tersimpan di Komputer)';
    } else if (telemetry.state === 'syncing') {
      pill.className = 'sync-pill syncing';
      text.textContent = 'Menyimpan perubahan...';
    } else {
      pill.className = 'sync-pill';
      text.textContent = 'Data Tersimpan Otomatis';
    }
  });

  btnManual?.addEventListener('click', async () => {
    if (text) text.textContent = 'Memperbarui data...';
    await syncEngine.flushOutbox();
    const viewContent = document.getElementById('appViewContent');
    if (viewContent) {
      navigateTo(currentNav);
    }
    showAlert({ title: 'Data Diperbarui', message: 'Tampilan data sekolah telah berhasil disegarkan.', type: 'info', duration: 4000 });
    setTimeout(() => {
      if (text) text.textContent = 'Data Tersimpan Otomatis';
    }, 500);
  });

  // Real-Time automatic view refresher across tabs and local mutations
  let autoRefreshTimer: any = null;
  syncEngine.onDataChange((tableName, action) => {
    console.log(`[App] Real-time live update for table: ${tableName} (${action})`);

    // Debounce view refresh (180ms) to batch multiple quick changes
    if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
    autoRefreshTimer = setTimeout(() => {
      // Avoid interrupting the user if an interactive modal dialog is currently open
      const activeModal = document.querySelector('.modal-backdrop.active');
      if (activeModal) return;

      const viewContent = document.getElementById('appViewContent');
      if (!viewContent) return;

      // Smart targeted refresh based on current view
      if (currentNav === 'dashboard') {
        renderDashboardView(viewContent);
      } else if (currentNav === 'siswa' && (tableName === 'siswa' || tableName === 'mutasiSiswa')) {
        renderSiswaView(viewContent);
      } else if (currentNav === 'sarpras' && tableName === 'sarpras') {
        renderSarprasView(viewContent);
      } else if (currentNav === 'jurnal' && tableName === 'jurnalKinerja') {
        renderJurnalView(viewContent);
      } else if (currentNav === 'bukutamu' && tableName === 'bukuTamu') {
        renderBukuTamuView(viewContent);
      } else if (currentNav === 'kepegawaian' && (tableName === 'pegawai' || tableName === 'bebanAjar')) {
        renderKepegawaianView(viewContent);
      } else if (currentNav === 'efiling' && tableName === 'arsipDigital') {
        renderEfilingView(viewContent);
      }
    }, 180);
  });
}

function setupTheme() {
  const btn = document.getElementById('btnThemeToggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let isDark = localStorage.getItem('lonrong_theme') === 'dark' || prefersDark;

  function apply() {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('lonrong_theme', isDark ? 'dark' : 'light');
  }

  apply();

  btn?.addEventListener('click', () => {
    isDark = !isDark;
    apply();
  });
}

// PWA & Service Worker Initialization (Latar Belakang Bersih & Hening)
function initPwaServiceWorker() {
  if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker aktif:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker gagal registrasi:', err);
        });
    });
  }
}

// Global Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initPwaServiceWorker();

  // Navigation clicks with Route Protection
  document.querySelectorAll('#sidebarNav .nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const navKey = (e.currentTarget as HTMLElement).dataset.nav;
      if (navKey) navigateTo(navKey);
    });
  });

  // Tombol Pengaturan Sistem Khusus Admin & Operator (Di Sidebar Footer)
  document.getElementById('btnAdminSettings')?.addEventListener('click', () => {
    openAdminSettingsModal();
  });

  // Logout button with elegant Apple confirmation dialog
  document.getElementById('btnLogout')?.addEventListener('click', async () => {
    const confirmed = await showConfirmDialog({
      title: 'Keluar dari Akun',
      message: 'Apakah Anda yakin ingin mengakhiri sesi dan keluar dari sistem manajemen sekolah SD Inpres Lonrong?',
      confirmText: 'Keluar',
      cancelText: 'Tetap Masuk',
      type: 'danger',
    });
    if (confirmed) {
      authService.logout();
    }
  });

  // Global Card & Shortcut Navigation Handler
  (window as any).appNavigate = navigateTo;
  (window as any).openAdminSettingsModal = openAdminSettingsModal;
  (window as any).openCloudSyncModal = openCloudSyncModal;
  (window as any).openSecurityCenterModal = openSecurityCenterModal;
  window.addEventListener('app:navigate', (e: any) => {
    if (e.detail) navigateTo(e.detail);
  });
});
