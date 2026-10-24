import { authService } from './auth_service';

export function renderLoginModal(container: HTMLElement, onLoginSuccess: () => void) {
  renderAuthPortal(container, onLoginSuccess);
}

export function renderAuthPortal(container: HTMLElement, onLoginSuccess: () => void) {
  container.innerHTML = `
    <div class="auth-portal-wrapper">
      <div class="auth-card">
        <!-- School Branding Header -->
        <div class="auth-header">
          <div class="auth-school-badge">
            <img src="/logo.png" alt="Logo SD Inpres Lonrong" />
          </div>
          <h2 class="auth-title">SD INPRES LONRONG</h2>
          <p class="auth-subtitle">
            Sistem Informasi Manajemen Administrasi Sekolah Terpadu (NPSN: 40304087)
          </p>
        </div>

        <!-- Mode Segmented Control: Credentials vs Quick PIN -->
        <div class="apple-segmented-control" id="loginTypeControl" style="width: 100%; margin-bottom: 1.25rem; display: flex;">
          <button class="segment-btn active" data-tab="credentials" style="flex: 1;">Kredensial Akun</button>
          <button class="segment-btn" data-tab="pin" style="flex: 1;">PIN Cepat</button>
        </div>

        <!-- Alert Notification Box -->
        <div id="loginAlertBox" style="display: none; padding: 0.75rem 0.95rem; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 1.15rem; line-height: 1.45;"></div>

        <!-- Form 1: Username & Password (Kredensial Resmi) -->
        <form id="formLoginCredentials" autocomplete="off">
          <div class="apple-input-group" style="margin-bottom: 1rem;">
            <label class="apple-label" for="loginUsername">NIP / Nama Pengguna</label>
            <input 
              type="text" 
              id="loginUsername"
              name="username_official" 
              class="apple-input" 
              placeholder="Masukkan NIP atau nama pengguna" 
              autocomplete="off" 
              value=""
              required 
              autofocus
            />
          </div>

          <div class="apple-input-group" style="margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label class="apple-label" for="loginPassword" style="margin: 0;">Kata Sandi</label>
              <button type="button" id="btnTogglePassword" class="apple-btn apple-btn-ghost" style="padding: 0.15rem 0.4rem; font-size: 0.74rem; color: var(--apple-text-secondary);">
                Lihat Sandi
              </button>
            </div>
            <input 
              type="password" 
              id="loginPassword"
              name="password_official" 
              class="apple-input" 
              placeholder="Masukkan kata sandi akun" 
              autocomplete="new-password" 
              value=""
              required 
            />
          </div>

          <button type="submit" id="btnLoginSubmit" class="apple-btn apple-btn-primary" style="width: 100%; padding: 0.75rem; font-size: 0.92rem; font-weight: 600; justify-content: center;">
            Masuk ke Sistem
          </button>
        </form>

        <!-- Form 2: Quick PIN (Untuk Guru / Operator di Perangkat Bersama) -->
        <form id="formLoginPin" style="display: none; text-align: center;">
          <div style="font-size: 0.82rem; color: var(--apple-text-secondary); margin-bottom: 1rem;">
            Masukkan 4 digit PIN Cepat Anda:
          </div>
          <div style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
            <input 
              type="password" 
              maxlength="4" 
              id="inputPinCode" 
              class="apple-input" 
              style="font-size: 1.75rem; letter-spacing: 0.45em; text-align: center; width: 180px; font-weight: 700; height: 50px;" 
              placeholder="••••" 
              inputmode="numeric"
            />
          </div>
          <p style="font-size: 0.74rem; color: var(--apple-text-tertiary); margin-bottom: 1.25rem;">
            PIN 4-digit khusus untuk akses harian guru di sekolah.
          </p>
          <button type="submit" id="btnPinSubmit" class="apple-btn apple-btn-primary" style="width: 100%; padding: 0.75rem; font-size: 0.92rem; font-weight: 600; justify-content: center;">
            Verifikasi & Masuk
          </button>
        </form>

        <!-- Informative Official Footer -->
        <div class="auth-footer-note">
          <span>Keamanan Terlindungi • Local-First Offline & Enkripsi Kriptografis</span>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  const formCred = container.querySelector('#formLoginCredentials') as HTMLFormElement;
  const formPin = container.querySelector('#formLoginPin') as HTMLFormElement;
  const alertBox = container.querySelector('#loginAlertBox') as HTMLElement;
  const btnToggle = container.querySelector('#btnTogglePassword') as HTMLButtonElement;
  const inputPassword = container.querySelector('#loginPassword') as HTMLInputElement;

  if (btnToggle && inputPassword) {
    btnToggle.addEventListener('click', () => {
      const isPassword = inputPassword.type === 'password';
      inputPassword.type = isPassword ? 'text' : 'password';
      btnToggle.textContent = isPassword ? 'Sembunyikan' : 'Lihat Sandi';
    });
  }

  container.querySelectorAll('#loginTypeControl .segment-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('#loginTypeControl .segment-btn').forEach((b) => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
      const tab = (e.currentTarget as HTMLElement).dataset.tab;

      if (formCred) formCred.style.display = tab === 'credentials' ? 'block' : 'none';
      if (formPin) formPin.style.display = tab === 'pin' ? 'block' : 'none';
      if (alertBox) alertBox.style.display = 'none';

      if (tab === 'pin') {
        const pinInput = container.querySelector('#inputPinCode') as HTMLInputElement;
        if (pinInput) setTimeout(() => pinInput.focus(), 50);
      } else {
        const userInput = container.querySelector('#loginUsername') as HTMLInputElement;
        if (userInput) setTimeout(() => userInput.focus(), 50);
      }
    });
  });

  // Handle Credentials Submit
  formCred?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formCred.querySelector('#btnLoginSubmit') as HTMLButtonElement;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Memverifikasi...';
    }

    const formData = new FormData(formCred);
    const u = ((formData.get('username_official') || formData.get('username') || '') as string).trim();
    const p = ((formData.get('password_official') || formData.get('password') || '') as string).trim();

    const res = await authService.loginWithCredentials(u, p);
    if (res.success) {
      onLoginSuccess();
    } else {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Masuk ke Sistem';
      }
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'var(--apple-red-light)';
        alertBox.style.color = 'var(--apple-red)';
        alertBox.textContent = res.message;
      }
    }
  });

  // Handle PIN Submit
  formPin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formPin.querySelector('#btnPinSubmit') as HTMLButtonElement;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Memverifikasi...';
    }

    const pin = ((container.querySelector('#inputPinCode') as HTMLInputElement)?.value || '').trim();
    const res = await authService.loginWithPin(pin);
    if (res.success) {
      onLoginSuccess();
    } else {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Verifikasi & Masuk';
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
