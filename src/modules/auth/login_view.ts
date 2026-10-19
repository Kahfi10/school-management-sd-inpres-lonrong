import { authService } from './auth_service';
import confetti from 'canvas-confetti';

export function renderLoginModal(container: HTMLElement, onLoginSuccess: () => void) {
  container.innerHTML = `
    <div class="modal-backdrop active" id="smartLoginBackdrop" style="background: rgba(0, 0, 0, 0.55);">
      <div class="modal-sheet" style="max-width: 420px; padding: 2rem 1.75rem;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="width: 54px; height: 54px; margin: 0 auto 0.75rem auto; display: flex; align-items: center; justify-content: center;">
            <img src="/logo.png" alt="Logo SD Inpres Lonrong" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--apple-text-primary);">Smart Login</h2>
          <p style="font-size: 0.8rem; color: var(--apple-text-secondary); margin-top: 0.2rem;">
            Sistem Informasi Administrasi SD Inpres Lonrong
          </p>
        </div>

        <!-- Mode Segmented Control -->
        <div class="apple-segmented-control" id="loginTypeControl" style="width: 100%; margin-bottom: 1.25rem; display: flex;">
          <button class="segment-btn active" data-tab="credentials" style="flex: 1;">Kredensial</button>
          <button class="segment-btn" data-tab="pin" style="flex: 1;">PIN Cepat</button>
          <button class="segment-btn" data-tab="quick" style="flex: 1;">Pilih Peran</button>
        </div>

        <div id="loginAlertBox" style="display: none; padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.8rem; margin-bottom: 1rem;"></div>

        <!-- Tab 1: Username & Password Form -->
        <form id="formLoginCredentials">
          <div class="apple-input-group">
            <label class="apple-label">Nama Pengguna</label>
            <input type="text" class="apple-input" name="username" required value="admin" placeholder="admin / tendik / guru" />
          </div>

          <div class="apple-input-group">
            <label class="apple-label">Kata Sandi</label>
            <input type="password" class="apple-input" name="password" required value="admin123" placeholder="Masukkan kata sandi" />
          </div>

          <button type="submit" class="apple-btn apple-btn-primary" style="width: 100%; padding: 0.7rem; margin-top: 0.5rem; font-size: 0.88rem;">
            Masuk
          </button>
        </form>

        <!-- Tab 2: Quick PIN Form -->
        <form id="formLoginPin" style="display: none; text-align: center;">
          <div style="font-size: 0.82rem; color: var(--apple-text-secondary); margin-bottom: 1rem;">
            Masukkan 4 digit PIN Cepat pengguna:
          </div>
          <div style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
            <input type="password" maxlength="4" id="inputPinCode" class="apple-input" style="font-size: 1.6rem; letter-spacing: 0.4em; text-align: center; width: 170px; font-weight: 700;" placeholder="••••" />
          </div>
          <div style="font-size: 0.73rem; color: var(--apple-text-tertiary); margin-bottom: 1.25rem;">
            Default PIN: Admin (1234) • Tendik (2345) • Guru (3456)
          </div>
          <button type="submit" class="apple-btn apple-btn-primary" style="width: 100%; padding: 0.7rem; font-size: 0.88rem;">
            Verifikasi PIN
          </button>
        </form>

        <!-- Tab 3: Quick Role Selector (Instant Demo) -->
        <div id="quickRoleSelector" style="display: none; flex-direction: column; gap: 0.65rem;">
          <div style="font-size: 0.78rem; color: var(--apple-text-secondary); margin-bottom: 0.25rem;">
            Pilih hak akses untuk masuk langsung:
          </div>
          
          <button class="apple-btn apple-btn-secondary btn-quick-role" data-role="admin" style="justify-content: flex-start; padding: 0.75rem 0.85rem; border-radius: var(--radius-sm);">
            <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--apple-blue-light); color: var(--apple-blue); display: flex; align-items: center; justify-content: center; margin-right: 0.75rem; flex-shrink: 0;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <div style="text-align: left;">
              <div style="font-weight: 700; font-size: 0.84rem; color: var(--apple-text-primary);">Super Admin / Kepala Sekolah</div>
              <div style="font-size: 0.72rem; color: var(--apple-text-tertiary);">Drs. H. Syamsuddin, M.Pd. (Akses Penuh)</div>
            </div>
          </button>

          <button class="apple-btn apple-btn-secondary btn-quick-role" data-role="tendik" style="justify-content: flex-start; padding: 0.75rem 0.85rem; border-radius: var(--radius-sm);">
            <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--apple-green-light); color: var(--apple-green); display: flex; align-items: center; justify-content: center; margin-right: 0.75rem; flex-shrink: 0;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </div>
            <div style="text-align: left;">
              <div style="font-weight: 700; font-size: 0.84rem; color: var(--apple-text-primary);">Tenaga Kependidikan / Operator TU</div>
              <div style="font-size: 0.72rem; color: var(--apple-text-tertiary);">Andi Nurul Qalbi, S.Kom. (Siswa & Sarpras)</div>
            </div>
          </button>

          <button class="apple-btn apple-btn-secondary btn-quick-role" data-role="guru" style="justify-content: flex-start; padding: 0.75rem 0.85rem; border-radius: var(--radius-sm);">
            <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--apple-orange-light); color: var(--apple-orange); display: flex; align-items: center; justify-content: center; margin-right: 0.75rem; flex-shrink: 0;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <div style="text-align: left;">
              <div style="font-weight: 700; font-size: 0.84rem; color: var(--apple-text-primary);">Guru Kelas & Mata Pelajaran</div>
              <div style="font-size: 0.72rem; color: var(--apple-text-tertiary);">Sitti Rahmah, S.Pd. (Jurnal & Beban Ajar)</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  const formCred = container.querySelector('#formLoginCredentials') as HTMLElement;
  const formPin = container.querySelector('#formLoginPin') as HTMLElement;
  const quickSelector = container.querySelector('#quickRoleSelector') as HTMLElement;
  const alertBox = container.querySelector('#loginAlertBox') as HTMLElement;

  container.querySelectorAll('#loginTypeControl .segment-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('#loginTypeControl .segment-btn').forEach((b) => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
      const tab = (e.currentTarget as HTMLElement).dataset.tab;

      formCred.style.display = tab === 'credentials' ? 'block' : 'none';
      formPin.style.display = tab === 'pin' ? 'block' : 'none';
      quickSelector.style.display = tab === 'quick' ? 'flex' : 'none';
      alertBox.style.display = 'none';
    });
  });

  // Handle Credentials Submit
  formCred?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formCred as HTMLFormElement);
    const u = formData.get('username') as string;
    const p = formData.get('password') as string;

    const res = await authService.loginWithCredentials(u, p);
    if (res.success) {
      confetti({ particleCount: 40, spread: 50 });
      onLoginSuccess();
    } else {
      alertBox.style.display = 'block';
      alertBox.style.background = 'var(--apple-red-light)';
      alertBox.style.color = 'var(--apple-red)';
      alertBox.textContent = res.message;
    }
  });

  // Handle PIN Submit
  formPin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = (container.querySelector('#inputPinCode') as HTMLInputElement).value;
    const res = await authService.loginWithPin(pin);
    if (res.success) {
      confetti({ particleCount: 40, spread: 50 });
      onLoginSuccess();
    } else {
      alertBox.style.display = 'block';
      alertBox.style.background = 'var(--apple-red-light)';
      alertBox.style.color = 'var(--apple-red)';
      alertBox.textContent = res.message;
    }
  });

  // Handle Quick Role Buttons
  container.querySelectorAll('.btn-quick-role').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const role = (e.currentTarget as HTMLElement).dataset.role as 'admin' | 'tendik' | 'guru';
      await authService.switchRoleQuick(role);
      confetti({ particleCount: 40, spread: 50 });
      onLoginSuccess();
    });
  });
}
