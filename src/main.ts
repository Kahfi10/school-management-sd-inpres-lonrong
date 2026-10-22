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
import type { UserAccount } from './db/local_db';

let currentNav = 'dashboard';

const navTitles: Record<string, string> = {
  dashboard: 'Dashboard Eksekutif Real-Time',
  siswa: 'Manajemen Siswa & Alumni',
  kepegawaian: 'Kepegawaian & Beban Ajar',
  efiling: 'E-Filing (Arsip Digital Google Drive)',
  sarpras: 'Inventaris Sarana & Prasarana',
  jurnal: 'Jurnal & Program Kerja (E-Kinerja)',
  bukutamu: 'Buku Tamu & Kunjungan Digital',
};

async function initApp() {
  console.log('[Lonrong SmartEdu] Starting up application...');

  // 1. Initialize IndexedDB seed data
  await initializeDatabaseSeed();

  // 2. Setup Sync Telemetry Observer
  setupSyncTelemetry();

  // 3. Setup Theme Switcher
  setupTheme();

  // 4. Setup Authentication and Routing
  authService.subscribe((user) => {
    updateUserInterface(user);
  });
}

function updateUserInterface(user: UserAccount | null) {
  const modalRoot = document.getElementById('modalRoot') as HTMLElement;
  const viewContent = document.getElementById('appViewContent') as HTMLElement;
  const userNameEl = document.getElementById('sidebarUserName') as HTMLElement;
  const userRoleEl = document.getElementById('sidebarUserRole') as HTMLElement;
  const userAvatarEl = document.getElementById('sidebarUserAvatar') as HTMLElement;

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
        ? 'Super Admin / Kepala Sekolah'
        : user.role === 'tendik'
        ? 'Tendik / Operator Dapodik'
        : 'Guru Kelas / Mapel';
  }
  if (userAvatarEl) userAvatarEl.textContent = user.namaLengkap.charAt(0);

  // Sync Header Role Switcher buttons
  document.querySelectorAll('#headerRoleSwitcher .segment-btn').forEach((btn) => {
    const role = (btn as HTMLElement).dataset.switch;
    if (role === user.role) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Render current view
  navigateTo(currentNav);
}

function navigateTo(navKey: string) {
  currentNav = navKey;
  const viewContent = document.getElementById('appViewContent') as HTMLElement;
  const topNavTitle = document.getElementById('topNavTitle') as HTMLElement;

  if (topNavTitle) {
    topNavTitle.textContent = navTitles[navKey] || 'Lonrong SmartEdu';
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

  // Point 8: Admin Route Aman (Role-Based Route Guard)
  const currentUser = authService.getCurrentUser();
  if (navKey === 'efiling' && currentUser?.role === 'guru') {
    viewContent.innerHTML = `
      <div class="page-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 55vh; text-align: center; padding: 2rem;">
        <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(255, 149, 0, 0.12); color: var(--apple-orange); display: flex; align-items: center; justify-content: center; margin-bottom: 1.15rem;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <h2 style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.015em; margin-bottom: 0.35rem;">Akses Dibatasi (RBAC Route Guard)</h2>
        <p style="font-size: 0.88rem; color: var(--apple-text-secondary); max-width: 500px; line-height: 1.5; margin-bottom: 1.35rem;">
          Modul E-Filing Arsip Digital Google Drive dibatasi khusus untuk <b>Super Admin (Kepala Sekolah)</b> dan <b>Tenaga Administrasi / Operator Dapodik</b>.
        </p>
        <button class="apple-btn apple-btn-primary" onclick="window.appNavigate('dashboard')">
          Kembali ke Dashboard Eksekutif
        </button>
      </div>
    `;
    return;
  }

  switch (navKey) {
    case 'dashboard':
      renderDashboardView(viewContent);
      break;
    case 'siswa':
      renderSiswaView(viewContent);
      break;
    case 'kepegawaian':
      renderKepegawaianView(viewContent);
      break;
    case 'efiling':
      renderEfilingView(viewContent);
      break;
    case 'sarpras':
      renderSarprasView(viewContent);
      break;
    case 'jurnal':
      renderJurnalView(viewContent);
      break;
    case 'bukutamu':
      renderBukuTamuView(viewContent);
      break;
    default:
      renderDashboardView(viewContent);
  }
}

function setupSyncTelemetry() {
  const pill = document.getElementById('syncStatusPill');
  const text = document.getElementById('syncStatusText');
  const btnManual = document.getElementById('btnManualSync');

  syncEngine.subscribe((telemetry: SyncTelemetry) => {
    if (!pill || !text) return;

    if (!telemetry.networkOnline) {
      pill.className = 'sync-pill offline';
      text.textContent = 'Mode Offline (Lokal)';
    } else if (telemetry.state === 'syncing') {
      pill.className = 'sync-pill syncing';
      const countMsg = telemetry.pendingCount > 0 ? ` (${telemetry.pendingCount})` : '';
      text.textContent = `Menyinkronkan otomatis${countMsg}...`;
    } else {
      pill.className = 'sync-pill';
      text.textContent = `Tersinkron Real-Time (${telemetry.relativeTimeStr})`;
    }
  });

  btnManual?.addEventListener('click', async () => {
    if (text) text.textContent = 'Menyinkronkan...';
    await syncEngine.flushOutbox();
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

// PWA & Service Worker Initialization
function initPwaServiceWorker() {
  if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // Handle BeforeInstallPrompt for PWA Install Button
  let deferredInstallPrompt: any = null;
  const btnInstall = document.getElementById('btnPwaInstall');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstall) {
      btnInstall.style.display = 'inline-flex';
    }
  });

  btnInstall?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);
      deferredInstallPrompt = null;
      btnInstall.style.display = 'none';
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Application successfully installed to homescreen!');
    if (btnInstall) btnInstall.style.display = 'none';
  });
}

// Global Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initPwaServiceWorker();

  // Navigation clicks with Route Protection (Point 8)
  document.querySelectorAll('#sidebarNav .nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const navKey = (e.currentTarget as HTMLElement).dataset.nav;
      if (navKey) navigateTo(navKey);
    });
  });

  // Cloud Sync Modal Trigger
  document.getElementById('btnCloudSync')?.addEventListener('click', () => {
    openCloudSyncModal();
  });

  // Make Sync Status Pill clickable to open Cloud Sync Modal
  const syncPill = document.getElementById('syncStatusPill');
  if (syncPill) {
    syncPill.style.cursor = 'pointer';
    syncPill.addEventListener('click', () => {
      openCloudSyncModal();
    });
  }

  // Security Center & 20-Point Audit Modal
  document.getElementById('btnSecurityCenter')?.addEventListener('click', () => {
    openSecurityCenterModal();
  });

  // Logout button
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    if (confirm('Keluar dari sesi Lonrong SmartEdu?')) {
      authService.logout();
    }
  });

  // Top nav role switcher
  document.querySelectorAll('#headerRoleSwitcher .segment-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const targetRole = (e.currentTarget as HTMLElement).dataset.switch as 'admin' | 'tendik' | 'guru';
      await authService.switchRoleQuick(targetRole);
    });
  });

  // Global Card & Shortcut Navigation Handler
  (window as any).appNavigate = navigateTo;
  (window as any).openCloudSyncModal = openCloudSyncModal;
  window.addEventListener('app:navigate', (e: any) => {
    if (e.detail) navigateTo(e.detail);
  });
});
