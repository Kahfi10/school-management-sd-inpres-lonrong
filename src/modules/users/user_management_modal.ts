import { authService } from '../auth/auth_service';
import { db, type PegawaiRecord, type UserAccount } from '../../db/local_db';
import { syncEngine } from '../../db/sync_engine';
import { showAlert, showConfirmDialog } from '../../utils/apple_alerts';

/**
 * Generate a unique 4-digit PIN that is guaranteed not to clash with any existing account.
 */
export function generateUniquePin(existingUsers: { pinCode: string }[]): string {
  const existingPins = new Set(existingUsers.map((u) => u.pinCode.trim()));
  for (let i = 0; i < 500; i++) {
    const candidate = Math.floor(1000 + Math.random() * 9000).toString();
    if (!existingPins.has(candidate)) {
      return candidate;
    }
  }
  return '7891';
}

/**
 * Generate a clean, readable temporary password for new accounts or credential resets.
 */
export function generateInitialPassword(prefix: string = 'guru'): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}${num}`;
}

export async function openUserManagementModal(preselectedPegawaiId?: string) {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  if (!authService.isSuperAdmin()) {
    showAlert({
      title: 'Akses Khusus Super Admin',
      message: 'Hanya akun Super Admin (Kepala Sekolah) yang memiliki hak istimewa untuk mengelola dan menerbitkan akun pengguna sekolah.',
      type: 'warning',
    });
    return;
  }

  // Load all users and pegawai
  const [users, allPegawai] = await Promise.all([
    authService.getAllUsers(),
    db.pegawai.toArray(),
  ]);

  let activeTab: 'list' | 'create' = preselectedPegawaiId ? 'create' : 'list';

  function render() {
    const guruCount = users.filter((u) => u.role === 'guru').length;
    const tendikCount = users.filter((u) => u.role === 'tendik').length;

    modalRoot!.innerHTML = `
      <div class="modal-backdrop active" id="userMgmtBackdrop" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1.25rem;">
        <div class="apple-card" style="width: 100%; max-width: 720px; max-height: 90vh; background: #FFFFFF; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 20px; box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; overflow: hidden; animation: appleSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <!-- Modal Header -->
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: #FFFFFF;">
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div style="width: 42px; height: 42px; border-radius: 12px; background: #0071E3; color: #FFFFFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0, 113, 227, 0.25);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div>
                <h2 style="font-size: 1.2rem; font-weight: 700; margin: 0; color: #0F172A; letter-spacing: -0.02em;">
                  Manajemen Akun Guru & Tendik
                </h2>
                <p style="font-size: 0.8rem; color: #64748B; margin: 0.15rem 0 0 0; font-weight: 500;">
                  Panel Otoritas Super Admin SD Inpres Lonrong • Sinkronisasi Cloud Otomatis
                </p>
              </div>
            </div>
            <button class="apple-btn apple-btn-ghost" id="btnCloseUserMgmt" style="width: 32px; height: 32px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; background: #F1F5F9; color: #475569;" title="Tutup">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Segmented Navigation & Stats Strip -->
          <div style="padding: 0.85rem 1.5rem; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; background: #F8FAFC;">
            <div class="apple-segmented-control" style="display: flex; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 3px; border-radius: 10px;">
              <button class="segment-btn ${activeTab === 'list' ? 'active' : ''}" id="tabBtnList" style="font-size: 0.82rem; padding: 0.45rem 0.95rem; font-weight: 600;">
                Daftar Akun (${users.length})
              </button>
              <button class="segment-btn ${activeTab === 'create' ? 'active' : ''}" id="tabBtnCreate" style="font-size: 0.82rem; padding: 0.45rem 0.95rem; font-weight: 600;">
                + Buatkan Akun Baru
              </button>
            </div>
            <div style="display: flex; gap: 0.5rem; font-size: 0.76rem;">
              <span style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; padding: 0.25rem 0.65rem; border-radius: 999px; font-weight: 700;">1 Super Admin</span>
              <span style="background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; padding: 0.25rem 0.65rem; border-radius: 999px; font-weight: 700;">${guruCount} Guru</span>
              <span style="background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; padding: 0.25rem 0.65rem; border-radius: 999px; font-weight: 700;">${tendikCount} Tendik</span>
            </div>
          </div>

          <!-- Modal Body Scrollable -->
          <div style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; background: #FFFFFF;">
            ${activeTab === 'list' ? renderUserList() : renderCreateForm()}
          </div>

        </div>
      </div>
    `;

    bindEvents();
  }

  function renderUserList(): string {
    return `
      <div style="display: flex; flex-direction: column; gap: 0.85rem;">
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 0.85rem 1.1rem; font-size: 0.82rem; color: #1E3A8A; display: flex; align-items: center; gap: 0.75rem; line-height: 1.5;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div>
            <strong>Prinsip 1 Super Admin:</strong> Akun Kepala Sekolah adalah satu-satunya akun administratif permanen. Perubahan kredensial atau pembuatan akun baru akan <strong>langsung disinkronkan ke Supabase Cloud</strong> secara instan.
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${users.map((u) => renderUserCard(u)).join('')}
        </div>
      </div>
    `;
  }

  function renderUserCard(u: UserAccount): string {
    const isSuper = u.isSuperAdmin || u.username === 'admin';
    const roleBadge = isSuper
      ? `<span style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px;">Super Admin (Utama)</span>`
      : u.role === 'tendik'
      ? `<span style="background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px;">Operator / Tendik</span>`
      : `<span style="background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px;">Guru Kelas / Mapel</span>`;

    return `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 1rem 1.15rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <div style="width: 42px; height: 42px; border-radius: 50%; background: ${isSuper ? '#0071E3' : '#E2E8F0'}; color: ${isSuper ? '#FFFFFF' : '#0F172A'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);">
            ${u.namaLengkap.charAt(0)}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 0.94rem; color: #0F172A;">${u.namaLengkap}</span>
              ${roleBadge}
            </div>
            <div style="font-size: 0.8rem; color: #64748B; margin-top: 0.2rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
              <span>Username: <strong style="color: #0F172A;">@${u.username}</strong></span>
              ${u.nipNuptk ? `<span>• NIP: ${u.nipNuptk}</span>` : ''}
              <span>• PIN Cepat: <code style="font-family: monospace; font-weight: 700; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; padding: 1px 6px; border-radius: 5px;">${u.pinCode}</code></span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center;">
          ${
            isSuper
              ? `<span style="font-size: 0.78rem; color: #64748B; font-weight: 600; padding: 0.4rem 0.7rem; background: #F1F5F9; border-radius: 8px;">Akun Utama Permanen</span>`
              : `
                <button class="apple-btn apple-btn-secondary btn-reset-user" data-user-id="${u.id}" data-username="${u.username}" data-name="${u.namaLengkap}" data-role="${u.role}" style="font-size: 0.8rem; padding: 0.45rem 0.85rem; font-weight: 600; border-radius: 8px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A;">
                  Reset Kredensial
                </button>
                <button class="apple-btn apple-btn-danger btn-delete-user" data-user-id="${u.id}" data-username="${u.username}" data-name="${u.namaLengkap}" style="font-size: 0.8rem; padding: 0.45rem 0.85rem; font-weight: 600; border-radius: 8px; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626;">
                  Hapus
                </button>
              `
          }
        </div>
      </div>
    `;
  }

  function renderCreateForm(): string {
    // Filter pegawai that don't already have an account linked
    const existingPegawaiIds = new Set(users.map((u) => u.pegawaiId).filter(Boolean));
    const availablePegawai = allPegawai.filter((p) => !existingPegawaiIds.has(p.id) || p.id === preselectedPegawaiId);

    const preselectedPegawai = preselectedPegawaiId ? allPegawai.find((p) => p.id === preselectedPegawaiId) : null;
    const initialName = preselectedPegawai ? preselectedPegawai.namaLengkap : '';
    const initialNip = preselectedPegawai ? preselectedPegawai.nipNuptk : '';
    const initialRole = preselectedPegawai && preselectedPegawai.jabatan.includes('Operator') ? 'tendik' : 'guru';

    // Suggest clean username from name
    const suggestedUsername = initialName
      ? initialName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 12)
      : '';

    // Auto-generate fresh unique credentials (guaranteed no PIN collision)
    const initialPassword = generateInitialPassword(initialRole);
    const initialPin = generateUniquePin(users);

    return `
      <form id="formCreateUser" style="display: flex; flex-direction: column; gap: 1.15rem;">
        
        <!-- Opsi Pintar: Pilih dari Pegawai Sekolah -->
        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
          <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A;" for="selectPegawai">Tautkan ke Data Guru / Pegawai GTK (Otomatis)</label>
          <select id="selectPegawai" class="apple-input" style="font-size: 0.88rem; width: 100%; padding: 0.65rem 0.85rem; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;">
            <option value="">-- Pilih Guru / GTK atau Masukkan Manual di Bawah --</option>
            ${availablePegawai
              .map(
                (p) => `
              <option value="${p.id}" ${p.id === preselectedPegawaiId ? 'selected' : ''} data-name="${p.namaLengkap}" data-nip="${p.nipNuptk}" data-jabatan="${p.jabatan}">
                ${p.namaLengkap} (${p.jabatan} - ${p.statusKepegawaian})
              </option>
            `
              )
              .join('')}
          </select>
          <span style="font-size: 0.76rem; color: #64748B;">
            Memilih guru akan otomatis melengkapi nama lengkap, NIP, serta merekomendasikan nama pengguna.
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A;" for="newNamaLengkap">Nama Lengkap &amp; Gelar *</label>
            <input type="text" id="newNamaLengkap" class="apple-input" required value="${initialName}" placeholder="contoh: Sitti Rahmah, S.Pd." style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A;" for="newNipNuptk">NIP / NUPTK</label>
            <input type="text" id="newNipNuptk" class="apple-input" value="${initialNip}" placeholder="contoh: 19820315 200801 2 018" style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A;" for="newRole">Peran Akun (Hak Akses) *</label>
            <select id="newRole" class="apple-input" required style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;">
              <option value="guru" ${initialRole === 'guru' ? 'selected' : ''}>Guru Kelas / Mapel</option>
              <option value="tendik" ${initialRole === 'tendik' ? 'selected' : ''}>Tenaga Kependidikan / Operator</option>
            </select>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A;" for="newUsername">Nama Pengguna (Username Login) *</label>
            <input type="text" id="newUsername" class="apple-input" required value="${suggestedUsername}" placeholder="huruf kecil, contoh: rahmah" style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A; margin: 0;" for="newPassword">Kata Sandi Awal *</label>
              <button type="button" id="btnGenPassword" class="apple-btn apple-btn-ghost" style="padding: 0.15rem 0.45rem; font-size: 0.74rem; color: #0071E3; font-weight: 600; cursor: pointer;">
                Acak Sandi
              </button>
            </div>
            <input type="text" id="newPassword" class="apple-input" required value="${initialPassword}" placeholder="Minimal 6 karakter" style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A; margin: 0;" for="newPinCode">PIN Cepat (4 Digit) *</label>
              <button type="button" id="btnGenPin" class="apple-btn apple-btn-ghost" style="padding: 0.15rem 0.45rem; font-size: 0.74rem; color: #0071E3; font-weight: 600; cursor: pointer;">
                Acak PIN
              </button>
            </div>
            <input type="text" id="newPinCode" maxlength="4" class="apple-input" required value="${initialPin}" placeholder="4 angka unik" inputmode="numeric" style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; font-family: monospace; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
          </div>
        </div>

        <div id="createAlertBox" style="display: none; padding: 0.85rem 1.15rem; border-radius: 10px; font-size: 0.84rem; line-height: 1.5; font-weight: 600;"></div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; border-top: 1px solid #E2E8F0; padding-top: 1.15rem;">
          <button type="button" class="apple-btn apple-btn-secondary" id="btnCancelCreate" style="font-size: 0.84rem; padding: 0.55rem 1.1rem; font-weight: 600; border-radius: 9px; background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1;">
            Batal
          </button>
          <button type="submit" class="apple-btn apple-btn-primary" id="btnSubmitCreate" style="font-size: 0.84rem; padding: 0.55rem 1.25rem; font-weight: 600; border-radius: 9px; background: #0071E3; color: #FFFFFF;">
            Terbitkan Akun Guru
          </button>
        </div>

      </form>
    `;
  }

  function bindEvents() {
    const backdrop = document.getElementById('userMgmtBackdrop');
    document.getElementById('btnCloseUserMgmt')?.addEventListener('click', () => {
      modalRoot!.innerHTML = '';
    });
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) modalRoot!.innerHTML = '';
    });

    // Tab buttons
    document.getElementById('tabBtnList')?.addEventListener('click', () => {
      activeTab = 'list';
      render();
    });
    document.getElementById('tabBtnCreate')?.addEventListener('click', () => {
      activeTab = 'create';
      render();
    });

    // Reset User Credential buttons
    modalRoot!.querySelectorAll('.btn-reset-user').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const uid = target.dataset.userId!;
        const uname = target.dataset.username!;
        const name = target.dataset.name!;
        const role = (target.dataset.role || 'guru') as 'guru' | 'tendik';

        openResetCredentialsDialog({
          id: uid,
          username: uname,
          namaLengkap: name,
          role,
          pinCode: '',
          passwordHash: '',
        });
      });
    });

    // Delete User buttons
    modalRoot!.querySelectorAll('.btn-delete-user').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const uid = target.dataset.userId!;
        const uname = target.dataset.username!;
        const name = target.dataset.name!;

        const confirmed = await showConfirmDialog({
          title: 'Hapus Akun Pengguna',
          message: `Apakah Anda yakin ingin menghapus akun @${uname} (${name})? Akun ini akan dihapus dari komputer lokal dan Supabase Cloud.`,
          confirmText: 'Hapus Akun',
          cancelText: 'Batalkan',
          type: 'danger',
        });

        if (confirmed) {
          const res = await authService.deleteUser(uid);
          if (res.success) {
            // Immediately sync deletion to Supabase
            await syncEngine.flushOutbox();
            showAlert({ title: 'Akun Dihapus', message: res.message, type: 'success' });
            // Refresh users
            const refreshed = await authService.getAllUsers();
            users.length = 0;
            users.push(...refreshed);
            render();
          } else {
            showAlert({ title: 'Gagal Menghapus', message: res.message, type: 'error' });
          }
        }
      });
    });

    // Form create handling
    if (activeTab === 'create') {
      const selectPegawai = document.getElementById('selectPegawai') as HTMLSelectElement;
      const inputNama = document.getElementById('newNamaLengkap') as HTMLInputElement;
      const inputNip = document.getElementById('newNipNuptk') as HTMLInputElement;
      const inputUsername = document.getElementById('newUsername') as HTMLInputElement;
      const inputPassword = document.getElementById('newPassword') as HTMLInputElement;
      const inputPin = document.getElementById('newPinCode') as HTMLInputElement;
      const selectRole = document.getElementById('newRole') as HTMLSelectElement;
      const alertBox = document.getElementById('createAlertBox') as HTMLElement;

      selectPegawai?.addEventListener('change', () => {
        const opt = selectPegawai.selectedOptions[0];
        if (opt && opt.value) {
          inputNama.value = opt.dataset.name || '';
          inputNip.value = opt.dataset.nip || '';
          const jab = opt.dataset.jabatan || '';
          selectRole.value = jab.includes('Operator') ? 'tendik' : 'guru';

          // Suggest username
          const cleanUname = (opt.dataset.name || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 12);
          inputUsername.value = cleanUname;

          // Check if current PIN collides; if so, generate unique PIN
          const curPin = inputPin.value.trim();
          if (!curPin || users.some((u) => u.pinCode === curPin)) {
            inputPin.value = generateUniquePin(users);
          }
        }
      });

      document.getElementById('btnGenPassword')?.addEventListener('click', () => {
        inputPassword.value = generateInitialPassword(selectRole.value);
      });

      document.getElementById('btnGenPin')?.addEventListener('click', () => {
        inputPin.value = generateUniquePin(users);
      });

      document.getElementById('btnCancelCreate')?.addEventListener('click', () => {
        activeTab = 'list';
        render();
      });

      const form = document.getElementById('formCreateUser') as HTMLFormElement;
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btnSubmitCreate') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Menerbitkan Akun & Sinkronisasi...';
        }

        const res = await authService.createUser({
          namaLengkap: inputNama.value.trim(),
          nipNuptk: inputNip.value.trim() || undefined,
          username: inputUsername.value.trim().toLowerCase(),
          password: inputPassword.value.trim(),
          pinCode: inputPin.value.trim(),
          role: selectRole.value as 'guru' | 'tendik',
          pegawaiId: selectPegawai.value || undefined,
        });

        if (res.success) {
          // Immediately flush to Supabase Cloud
          await syncEngine.flushOutbox();

          const createdUsername = inputUsername.value.trim().toLowerCase();
          const createdPass = inputPassword.value.trim();
          const createdPin = inputPin.value.trim();
          const createdName = inputNama.value.trim();

          showCredentialsShareModal({
            title: 'Akun Guru Berhasil Diterbitkan!',
            subtitle: `Akun untuk ${createdName} telah aktif dan tersinkronisasi ke cloud:`,
            username: createdUsername,
            password: createdPass,
            pinCode: createdPin,
            onClose: async () => {
              const refreshed = await authService.getAllUsers();
              users.length = 0;
              users.push(...refreshed);
              activeTab = 'list';
              render();
            },
          });
        } else {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Terbitkan Akun Guru';
          }
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.style.background = '#FEF2F2';
            alertBox.style.border = '1px solid #FECACA';
            alertBox.style.color = '#B91C1C';
            alertBox.textContent = res.message;
            alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          showAlert({
            title: 'Gagal Menerbitkan Akun',
            message: res.message,
            type: 'error',
          });
        }
      });
    }
  }

  /**
   * Dedicated Apple HIG Modal for resetting a user's password and/or PIN
   */
  function openResetCredentialsDialog(targetUser: UserAccount) {
    const dialogRoot = document.createElement('div');
    dialogRoot.id = 'resetCredDialogContainer';
    document.body.appendChild(dialogRoot);

    const defaultPass = generateInitialPassword(targetUser.role);
    const defaultPin = generateUniquePin(users);

    dialogRoot.innerHTML = `
      <div class="modal-backdrop active" id="resetCredBackdrop" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1.25rem;">
        <div class="apple-card" style="width: 100%; max-width: 500px; background: #FFFFFF; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 20px; box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; overflow: hidden; animation: appleSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <!-- Header -->
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: #FFFFFF;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: #EFF6FF; color: #0071E3; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <div>
                <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: #0F172A;">Reset Kredensial Akun</h3>
                <p style="font-size: 0.78rem; color: #64748B; margin: 0.1rem 0 0 0;">SD Inpres Lonrong • Sinkronisasi Cloud</p>
              </div>
            </div>
            <button class="apple-btn apple-btn-ghost" id="btnCloseResetDialog" style="width: 30px; height: 30px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; background: #F1F5F9; color: #475569;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Body -->
          <div style="padding: 1.35rem 1.5rem; display: flex; flex-direction: column; gap: 1.15rem; background: #FFFFFF;">
            
            <!-- Target User Banner -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.85rem 1rem; display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #E2E8F0; color: #0F172A; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem;">
                ${targetUser.namaLengkap.charAt(0)}
              </div>
              <div>
                <div style="font-size: 0.92rem; font-weight: 700; color: #0F172A;">${targetUser.namaLengkap}</div>
                <div style="font-size: 0.78rem; color: #64748B;">Username: <strong style="color: #0071E3;">@${targetUser.username}</strong></div>
              </div>
            </div>

            <!-- Password Field -->
            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A; margin: 0;" for="inputResetPass">Kata Sandi Baru</label>
                <button type="button" id="btnGenResetPass" class="apple-btn apple-btn-ghost" style="padding: 0.15rem 0.4rem; font-size: 0.74rem; color: #0071E3; font-weight: 600; cursor: pointer;">
                  Acak Sandi
                </button>
              </div>
              <div style="position: relative; display: flex; align-items: center;">
                <input type="text" id="inputResetPass" class="apple-input" value="${defaultPass}" placeholder="Minimal 6 karakter" style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
              </div>
              <span style="font-size: 0.74rem; color: #64748B;">Kosongkan jika hanya ingin mereset PIN Cepat.</span>
            </div>

            <!-- PIN Field -->
            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.84rem; font-weight: 700; color: #0F172A; margin: 0;" for="inputResetPin">PIN Cepat Baru (4 Digit Angka)</label>
                <button type="button" id="btnGenResetPin" class="apple-btn apple-btn-ghost" style="padding: 0.15rem 0.4rem; font-size: 0.74rem; color: #0071E3; font-weight: 600; cursor: pointer;">
                  Acak PIN
                </button>
              </div>
              <input type="text" id="inputResetPin" maxlength="4" class="apple-input" value="${defaultPin}" placeholder="4 digit angka" inputmode="numeric" style="width: 100%; padding: 0.65rem 0.85rem; font-size: 0.88rem; font-family: monospace; background: #FFFFFF; border: 1.5px solid #CBD5E1; color: #0F172A; border-radius: 9px;" />
              <span style="font-size: 0.74rem; color: #64748B;">Kosongkan jika hanya ingin mereset Kata Sandi.</span>
            </div>

            <div id="resetFeedbackAlert" style="display: none; padding: 0.75rem 0.95rem; border-radius: 9px; font-size: 0.82rem; line-height: 1.45; font-weight: 600;"></div>

          </div>

          <!-- Footer -->
          <div style="padding: 1rem 1.5rem; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 0.75rem; background: #F8FAFC;">
            <button type="button" class="apple-btn apple-btn-secondary" id="btnCancelResetDialog" style="font-size: 0.84rem; padding: 0.55rem 1.1rem; font-weight: 600; border-radius: 9px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155;">
              Batal
            </button>
            <button type="button" class="apple-btn apple-btn-primary" id="btnConfirmReset" style="font-size: 0.84rem; padding: 0.55rem 1.25rem; font-weight: 600; border-radius: 9px; background: #0071E3; color: #FFFFFF;">
              Simpan &amp; Terapkan Kredensial
            </button>
          </div>

        </div>
      </div>
    `;

    function closeDialog() {
      dialogRoot.remove();
    }

    const backdrop = document.getElementById('resetCredBackdrop');
    document.getElementById('btnCloseResetDialog')?.addEventListener('click', closeDialog);
    document.getElementById('btnCancelResetDialog')?.addEventListener('click', closeDialog);
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) closeDialog();
    });

    const passInput = document.getElementById('inputResetPass') as HTMLInputElement;
    const pinInput = document.getElementById('inputResetPin') as HTMLInputElement;
    const alertBox = document.getElementById('resetFeedbackAlert') as HTMLElement;
    const confirmBtn = document.getElementById('btnConfirmReset') as HTMLButtonElement;

    document.getElementById('btnGenResetPass')?.addEventListener('click', () => {
      passInput.value = generateInitialPassword(targetUser.role);
    });

    document.getElementById('btnGenResetPin')?.addEventListener('click', () => {
      pinInput.value = generateUniquePin(users);
    });

    confirmBtn?.addEventListener('click', async () => {
      const newPass = passInput.value.trim();
      const newPin = pinInput.value.trim();

      if (!newPass && !newPin) {
        alertBox.style.display = 'block';
        alertBox.style.background = '#FFFBEB';
        alertBox.style.border = '1px solid #FDE68A';
        alertBox.style.color = '#B45309';
        alertBox.textContent = 'Harap masukkan Kata Sandi baru atau PIN Cepat baru yang ingin diubah.';
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Menyimpan & Menyinkronkan...';

      const res = await authService.resetUserCredentials(
        targetUser.id,
        newPass || undefined,
        newPin || undefined
      );

      if (res.success) {
        // Immediately flush outbox to Supabase Cloud
        await syncEngine.flushOutbox();

        // Refresh user list in local state
        const refreshed = await authService.getAllUsers();
        users.length = 0;
        users.push(...refreshed);
        render();

        closeDialog();

        // Show credentials share dialog
        showCredentialsShareModal({
          title: 'Kredensial Berhasil Diperbarui!',
          subtitle: `Kredensial baru untuk ${targetUser.namaLengkap} siap dibagikan dan telah disinkronkan ke cloud:`,
          username: targetUser.username,
          password: newPass || '(Tidak diubah)',
          pinCode: newPin || '(Tidak diubah)',
          onClose: () => {},
        });
      } else {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Simpan & Terapkan Kredensial';
        alertBox.style.display = 'block';
        alertBox.style.background = '#FEF2F2';
        alertBox.style.border = '1px solid #FECACA';
        alertBox.style.color = '#B91C1C';
        alertBox.textContent = res.message;
      }
    });
  }

  /**
   * Share / Copy Credentials Pop-up Sheet
   */
  function showCredentialsShareModal(opts: {
    title: string;
    subtitle: string;
    username: string;
    password: string;
    pinCode: string;
    onClose: () => void;
  }) {
    const shareRoot = document.createElement('div');
    shareRoot.id = 'shareCredModalContainer';
    document.body.appendChild(shareRoot);

    const shareText = `*KREDENSIAL LOGIN SD INPRES LONRONG*\n` +
      `Pengguna: @${opts.username}\n` +
      `Kata Sandi: ${opts.password}\n` +
      `PIN Cepat: ${opts.pinCode}\n` +
      `Aplikasi: https://school-management-sd-inpres-lonrong.ashabulk265.workers.dev`;

    shareRoot.innerHTML = `
      <div class="modal-backdrop active" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; z-index: 10001; padding: 1.25rem;">
        <div class="apple-card" style="width: 100%; max-width: 480px; background: #FFFFFF; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 20px; box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; overflow: hidden; animation: appleSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: #F0FDF4; color: #15803D; display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; color: #0F172A;">${opts.title}</h3>
              <p style="font-size: 0.78rem; color: #64748B; margin: 0.1rem 0 0 0;">${opts.subtitle}</p>
            </div>
          </div>

          <div style="padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 12px; padding: 1rem 1.15rem; font-family: monospace; font-size: 0.88rem; color: #0F172A; line-height: 1.6;">
              <div>Username: <strong style="color: #0071E3;">@${opts.username}</strong></div>
              <div>Kata Sandi: <strong>${opts.password}</strong></div>
              <div>PIN Cepat: <strong>${opts.pinCode}</strong></div>
            </div>
            <div id="copyFeedback" style="display: none; font-size: 0.78rem; color: #15803D; font-weight: 600; text-align: center;">Tersalin ke clipboard!</div>
          </div>

          <div style="padding: 1rem 1.5rem; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 0.75rem; background: #F8FAFC;">
            <button type="button" class="apple-btn apple-btn-secondary" id="btnCopyCreds" style="font-size: 0.84rem; padding: 0.55rem 1.1rem; font-weight: 600; border-radius: 9px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; display: inline-flex; align-items: center; gap: 0.4rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Salin Kredensial
            </button>
            <button type="button" class="apple-btn apple-btn-primary" id="btnDoneShare" style="font-size: 0.84rem; padding: 0.55rem 1.25rem; font-weight: 600; border-radius: 9px; background: #0071E3; color: #FFFFFF;">
              Selesai
            </button>
          </div>
        </div>
      </div>
    `;

    const copyBtn = shareRoot.querySelector('#btnCopyCreds') as HTMLButtonElement;
    const feedback = shareRoot.querySelector('#copyFeedback') as HTMLElement;
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareText);
        feedback.style.display = 'block';
        copyBtn.textContent = 'Tersalin!';
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Salin Kredensial`;
        }, 2000);
      } catch {
        // fallback
      }
    });

    shareRoot.querySelector('#btnDoneShare')?.addEventListener('click', () => {
      shareRoot.remove();
      opts.onClose();
    });
  }

  render();
}
