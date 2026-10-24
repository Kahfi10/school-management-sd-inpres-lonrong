import { authService } from '../auth/auth_service';
import { openCloudSyncModal } from '../sync/cloud_sync_modal';
import { openSecurityCenterModal } from '../security/security_view';

export function openAdminSettingsModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const currentUser = authService.getCurrentUser();
  const currentRole = currentUser?.role || 'admin';

  const modalHtml = `
    <div class="modal-backdrop active" id="adminSettingsBackdrop" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
      <div class="apple-card" style="width: 100%; max-width: 520px; background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-lg); box-shadow: var(--apple-shadow-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Header Modal -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--apple-border-subtle); padding-bottom: 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 38px; height: 38px; border-radius: var(--radius-sm); background: var(--apple-surface-secondary); color: var(--apple-blue); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </div>
            <div>
              <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--apple-text-primary);">Pengaturan Sistem Sekolah</h2>
              <p style="font-size: 0.78rem; color: var(--apple-text-secondary); margin: 2px 0 0 0;">Khusus Kepala Sekolah & Operator Dapodik</p>
            </div>
          </div>
          <button class="apple-btn apple-btn-ghost" id="btnCloseAdminSettings" style="padding: 0.35rem;" title="Tutup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <!-- Item 1: Cloud Sync -->
          <div style="background: var(--apple-surface-secondary); border: 1px solid var(--apple-border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
            <div>
              <div style="font-weight: 600; font-size: 0.9rem; color: var(--apple-text-primary); display: flex; align-items: center; gap: 0.4rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                Sinkronisasi Cloud (Supabase)
              </div>
              <div style="font-size: 0.78rem; color: var(--apple-text-secondary); margin-top: 3px;">Hubungkan database online agar data sinkron antar-laptop guru</div>
            </div>
            <button class="apple-btn apple-btn-secondary" id="btnLaunchCloudSync" style="font-size: 0.8rem; padding: 0.4rem 0.85rem; white-space: nowrap;">
              Buka
            </button>
          </div>

          <!-- Item 2: Security & Backup -->
          <div style="background: var(--apple-surface-secondary); border: 1px solid var(--apple-border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
            <div>
              <div style="font-weight: 600; font-size: 0.9rem; color: var(--apple-text-primary); display: flex; align-items: center; gap: 0.4rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Pusat Keamanan & Cadangan Data
              </div>
              <div style="font-size: 0.78rem; color: var(--apple-text-secondary); margin-top: 3px;">Ekspor file cadangan data sekolah & audit keamanan sistem</div>
            </div>
            <button class="apple-btn apple-btn-secondary" id="btnLaunchSecurityCenter" style="font-size: 0.8rem; padding: 0.4rem 0.85rem; white-space: nowrap;">
              Buka
            </button>
          </div>

          <!-- Item 3: Quick Role Switch (for Testing) -->
          <div style="background: var(--apple-surface-secondary); border: 1px solid var(--apple-border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
            <div style="font-weight: 600; font-size: 0.9rem; color: var(--apple-text-primary); margin-bottom: 0.25rem;">Uji Coba Peran Akun</div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary); margin-bottom: 0.75rem;">Beralih mode untuk menguji tampilan sebagai:</div>
            <div class="apple-segmented-control" style="width: 100%; display: grid; grid-template-columns: 1fr 1fr 1fr;">
              <button class="segment-btn ${currentRole === 'admin' ? 'active' : ''}" data-modal-switch="admin">Admin (Kepsek)</button>
              <button class="segment-btn ${currentRole === 'tendik' ? 'active' : ''}" data-modal-switch="tendik">Tendik (Operator)</button>
              <button class="segment-btn ${currentRole === 'guru' ? 'active' : ''}" data-modal-switch="guru">Guru Kelas</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  modalRoot.innerHTML = modalHtml;

  // Close handlers
  const backdrop = document.getElementById('adminSettingsBackdrop');
  document.getElementById('btnCloseAdminSettings')?.addEventListener('click', () => {
    modalRoot.innerHTML = '';
  });
  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) modalRoot.innerHTML = '';
  });

  // Launch Cloud Sync Modal
  document.getElementById('btnLaunchCloudSync')?.addEventListener('click', () => {
    modalRoot.innerHTML = '';
    openCloudSyncModal();
  });

  // Launch Security Center Modal
  document.getElementById('btnLaunchSecurityCenter')?.addEventListener('click', () => {
    modalRoot.innerHTML = '';
    openSecurityCenterModal();
  });

  // Switch role buttons
  modalRoot.querySelectorAll('[data-modal-switch]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const targetRole = (e.currentTarget as HTMLElement).dataset.modalSwitch as 'admin' | 'tendik' | 'guru';
      modalRoot.innerHTML = '';
      await authService.switchRoleQuick(targetRole);
    });
  });
}
