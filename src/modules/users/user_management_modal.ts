import { authService } from '../auth/auth_service';
import { db, type PegawaiRecord, type UserAccount } from '../../db/local_db';
import { showAlert, showConfirmDialog } from '../../utils/apple_alerts';

export async function openUserManagementModal(preselectedPegawaiId?: string) {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  if (!authService.isSuperAdmin()) {
    showAlert({
      title: 'Akses Khusus Super Admin',
      message: 'Hanya akun Super Admin (Kepala Sekolah) yang memiliki hak istimewa untuk mengelola dan membuatkan akun guru.',
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
      <div class="modal-backdrop active" id="userMgmtBackdrop" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.48); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
        <div class="apple-card" style="width: 100%; max-width: 680px; max-height: 90vh; background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-lg); box-shadow: var(--apple-shadow-lg); display: flex; flex-direction: column; overflow: hidden;">
          
          <!-- Modal Header -->
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--apple-border-subtle); display: flex; justify-content: space-between; align-items: center; background: var(--apple-surface-secondary);">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(0, 122, 255, 0.12); color: var(--apple-blue); display: flex; align-items: center; justify-content: center;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div>
                <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--apple-text-primary); letter-spacing: -0.015em;">
                  Manajemen Akun Guru & Tendik
                </h2>
                <p style="font-size: 0.78rem; color: var(--apple-text-secondary); margin: 2px 0 0 0;">
                  Panel Otoritas Super Admin (Kepala Sekolah) SD Inpres Lonrong
                </p>
              </div>
            </div>
            <button class="apple-btn apple-btn-ghost" id="btnCloseUserMgmt" style="padding: 0.35rem;" title="Tutup">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Segmented Navigation & Stats Strip -->
          <div style="padding: 0.85rem 1.5rem; border-bottom: 1px solid var(--apple-border-subtle); display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div class="apple-segmented-control" style="display: flex;">
              <button class="segment-btn ${activeTab === 'list' ? 'active' : ''}" id="tabBtnList">
                Daftar Akun (${users.length})
              </button>
              <button class="segment-btn ${activeTab === 'create' ? 'active' : ''}" id="tabBtnCreate">
                + Buatkan Akun Baru
              </button>
            </div>
            <div style="display: flex; gap: 0.6rem; font-size: 0.75rem; color: var(--apple-text-secondary);">
              <span style="background: rgba(0, 122, 255, 0.08); color: var(--apple-blue); padding: 0.2rem 0.5rem; border-radius: 999px; font-weight: 600;">1 Super Admin</span>
              <span style="background: rgba(52, 199, 89, 0.08); color: var(--apple-green); padding: 0.2rem 0.5rem; border-radius: 999px; font-weight: 600;">${guruCount} Guru</span>
              <span style="background: rgba(255, 149, 0, 0.08); color: var(--apple-orange); padding: 0.2rem 0.5rem; border-radius: 999px; font-weight: 600;">${tendikCount} Tendik</span>
            </div>
          </div>

          <!-- Modal Body Scrollable -->
          <div style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1;">
            ${activeTab === 'list' ? renderUserList() : renderCreateForm()}
          </div>

        </div>
      </div>
    `;

    bindEvents();
  }

  function renderUserList(): string {
    return `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="background: rgba(0, 122, 255, 0.05); border: 1px solid rgba(0, 122, 255, 0.15); border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--apple-blue); display: flex; align-items: center; gap: 0.6rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div>
            <strong>Prinsip 1 Super Admin:</strong> Akun Kepala Sekolah adalah satu-satunya Super Admin permanen. Guru dan Operator hanya memiliki akses sesuai tugas masing-masing dan akunnya diterbitkan oleh Super Admin.
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          ${users.map((u) => renderUserCard(u)).join('')}
        </div>
      </div>
    `;
  }

  function renderUserCard(u: UserAccount): string {
    const isSuper = u.isSuperAdmin || u.username === 'admin';
    const roleBadge = isSuper
      ? `<span style="background: rgba(0, 122, 255, 0.15); color: var(--apple-blue); border: 1px solid rgba(0, 122, 255, 0.25); font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px;">👑 Super Admin (Utama)</span>`
      : u.role === 'tendik'
      ? `<span style="background: rgba(255, 149, 0, 0.12); color: var(--apple-orange); font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 999px;">Operator / Tendik</span>`
      : `<span style="background: rgba(52, 199, 89, 0.12); color: var(--apple-green); font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 999px;">Guru Kelas / Mapel</span>`;

    return `
      <div style="background: var(--apple-surface-secondary); border: 1px solid var(--apple-border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: ${isSuper ? 'var(--apple-blue)' : 'var(--apple-surface-tertiary)'}; color: ${isSuper ? '#fff' : 'var(--apple-text-primary)'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem;">
            ${u.namaLengkap.charAt(0)}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 0.9rem; color: var(--apple-text-primary);">${u.namaLengkap}</span>
              ${roleBadge}
            </div>
            <div style="font-size: 0.78rem; color: var(--apple-text-secondary); margin-top: 2px;">
              Username: <strong style="color: var(--apple-text-primary);">@${u.username}</strong>
              ${u.nipNuptk ? ` • NIP: ${u.nipNuptk}` : ''}
              • PIN Cepat: <code style="font-family: monospace; background: var(--apple-surface); padding: 1px 4px; border-radius: 4px;">${u.pinCode}</code>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.4rem; align-items: center;">
          ${
            isSuper
              ? `<span style="font-size: 0.75rem; color: var(--apple-text-tertiary); font-style: italic;">Akun Utama Permanen</span>`
              : `
                <button class="apple-btn apple-btn-secondary btn-reset-user" data-user-id="${u.id}" data-username="${u.username}" data-name="${u.namaLengkap}" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
                  Reset Kredensial
                </button>
                <button class="apple-btn apple-btn-danger btn-delete-user" data-user-id="${u.id}" data-username="${u.username}" data-name="${u.namaLengkap}" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
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

    return `
      <form id="formCreateUser" style="display: flex; flex-direction: column; gap: 1rem;">
        
        <!-- Opsi Pintar: Pilih dari Pegawai Sekolah -->
        <div class="apple-input-group">
          <label class="apple-label" for="selectPegawai">Tautkan ke Data Guru / Pegawai GTK (Otomatis)</label>
          <select id="selectPegawai" class="apple-input" style="font-size: 0.88rem;">
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
          <span style="font-size: 0.74rem; color: var(--apple-text-tertiary); margin-top: 3px;">
            Memilih guru akan otomatis mengisi nama lengkap, NIP, dan merekomendasikan nama pengguna.
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="apple-input-group">
            <label class="apple-label" for="newNamaLengkap">Nama Lengkap & Gelar *</label>
            <input type="text" id="newNamaLengkap" class="apple-input" required value="${initialName}" placeholder="contoh: Sitti Rahmah, S.Pd." />
          </div>

          <div class="apple-input-group">
            <label class="apple-label" for="newNipNuptk">NIP / NUPTK</label>
            <input type="text" id="newNipNuptk" class="apple-input" value="${initialNip}" placeholder="contoh: 19820315 200801 2 018" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="apple-input-group">
            <label class="apple-label" for="newRole">Peran Akun (Hak Akses) *</label>
            <select id="newRole" class="apple-input" required>
              <option value="guru" ${initialRole === 'guru' ? 'selected' : ''}>Guru Kelas / Mapel</option>
              <option value="tendik" ${initialRole === 'tendik' ? 'selected' : ''}>Tenaga Kependidikan / Operator</option>
            </select>
          </div>

          <div class="apple-input-group">
            <label class="apple-label" for="newUsername">Nama Pengguna (Username Login) *</label>
            <input type="text" id="newUsername" class="apple-input" required value="${suggestedUsername}" placeholder="huruf kecil, contoh: rahmah" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="apple-input-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label class="apple-label" for="newPassword" style="margin: 0;">Kata Sandi Awal *</label>
              <button type="button" id="btnGenPassword" class="apple-btn apple-btn-ghost" style="padding: 0.15rem 0.4rem; font-size: 0.72rem; color: var(--apple-blue);">
                Acak Sandi
              </button>
            </div>
            <input type="text" id="newPassword" class="apple-input" required value="guru123" placeholder="Minimal 6 karakter" />
          </div>

          <div class="apple-input-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label class="apple-label" for="newPinCode" style="margin: 0;">PIN Cepat (4 Digit) *</label>
              <button type="button" id="btnGenPin" class="apple-btn apple-btn-ghost" style="padding: 0.15rem 0.4rem; font-size: 0.72rem; color: var(--apple-blue);">
                Acak PIN
              </button>
            </div>
            <input type="text" id="newPinCode" maxlength="4" class="apple-input" required value="1234" placeholder="4 angka" inputmode="numeric" />
          </div>
        </div>

        <div id="createAlertBox" style="display: none; padding: 0.75rem 0.95rem; border-radius: var(--radius-sm); font-size: 0.82rem; line-height: 1.45;"></div>

        <div style="display: flex; justify-content: flex-end; gap: 0.65rem; margin-top: 0.5rem; border-top: 1px solid var(--apple-border-subtle); padding-top: 1rem;">
          <button type="button" class="apple-btn apple-btn-secondary" id="btnCancelCreate">
            Batal
          </button>
          <button type="submit" class="apple-btn apple-btn-primary" id="btnSubmitCreate">
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
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const uid = target.dataset.userId!;
        const uname = target.dataset.username!;
        const name = target.dataset.name!;

        promptResetCredentials(uid, uname, name);
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
          message: `Apakah Anda yakin ingin menghapus akun @${uname} (${name})? Guru ini tidak akan bisa login lagi ke aplikasi.`,
          confirmText: 'Hapus Akun',
          cancelText: 'Batalkan',
          type: 'danger',
        });

        if (confirmed) {
          const res = await authService.deleteUser(uid);
          if (res.success) {
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
        }
      });

      document.getElementById('btnGenPassword')?.addEventListener('click', () => {
        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
        let pass = '';
        for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
        inputPassword.value = pass;
      });

      document.getElementById('btnGenPin')?.addEventListener('click', () => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        inputPin.value = pin;
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
          submitBtn.textContent = 'Menerbitkan Akun...';
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
          showAlert({
            title: 'Akun Berhasil Diterbitkan!',
            message: `Akun untuk ${inputNama.value} siap digunakan:\n• Username: @${inputUsername.value.toLowerCase()}\n• Sandi: ${inputPassword.value}\n• PIN Cepat: ${inputPin.value}\n\nSilakan bagikan kredensial ini kepada guru yang bersangkutan.`,
            type: 'success',
          });
          const refreshed = await authService.getAllUsers();
          users.length = 0;
          users.push(...refreshed);
          activeTab = 'list';
          render();
        } else {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Terbitkan Akun Guru';
          }
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.style.background = 'var(--apple-red-light)';
            alertBox.style.color = 'var(--apple-red)';
            alertBox.textContent = res.message;
          }
        }
      });
    }
  }

  async function promptResetCredentials(userId: string, username: string, name: string) {
    const defaultNewPass = 'guru' + Math.floor(100 + Math.random() * 900);
    const defaultNewPin = Math.floor(1000 + Math.random() * 9000).toString();

    const newPass = prompt(`Reset Kata Sandi untuk @${username} (${name}):\n(Kosongkan jika tidak ingin mengubah kata sandi)`, defaultNewPass);
    if (newPass === null) return; // User cancelled

    const newPin = prompt(`Reset PIN Cepat (4 digit angka) untuk @${username}:\n(Kosongkan jika tidak ingin mengubah PIN)`, defaultNewPin);
    if (newPin === null) return;

    if (!newPass.trim() && !newPin.trim()) {
      showAlert({ title: 'Tidak Ada Perubahan', message: 'Sandi dan PIN tidak diubah.', type: 'info' });
      return;
    }

    const res = await authService.resetUserCredentials(userId, newPass.trim() || undefined, newPin.trim() || undefined);
    if (res.success) {
      showAlert({
        title: 'Kredensial Berhasil Direset',
        message: `Kredensial baru untuk ${name}:\n• Username: @${username}\n${newPass.trim() ? `• Sandi Baru: ${newPass.trim()}\n` : ''}${newPin.trim() ? `• PIN Baru: ${newPin.trim()}` : ''}`,
        type: 'success',
      });
      const refreshed = await authService.getAllUsers();
      users.length = 0;
      users.push(...refreshed);
      render();
    } else {
      showAlert({ title: 'Gagal Mereset', message: res.message, type: 'error' });
    }
  }

  render();
}
