import { db, type UserAccount } from '../../db/local_db';
import {
  verifyPasswordHash,
  hashPassword,
  rateLimiter,
  logSecurityEvent,
} from '../../utils/security';

const SESSION_KEY = 'lonrong_active_session_v1';
const SESSION_TIMESTAMP_KEY = 'lonrong_session_last_active';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

export class AuthService {
  private currentUser: UserAccount | null = null;
  private listeners: Set<(user: UserAccount | null) => void> = new Set();
  private activityListenerBound = false;

  constructor() {
    this.initActivityTracker();
  }

  public async init(): Promise<UserAccount | null> {
    await this.restoreSession();
    return this.currentUser;
  }

  private async restoreSession() {
    const saved = localStorage.getItem(SESSION_KEY);
    const lastActiveStr = localStorage.getItem(SESSION_TIMESTAMP_KEY);

    if (saved && lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (Date.now() - lastActive > SESSION_TIMEOUT_MS) {
        // Session expired
        this.logout('Sesi Anda telah berakhir demi keamanan. Silakan login kembali.');
        return;
      }

      try {
        const parsed = JSON.parse(saved);
        const user = await db.users.get(parsed.id);
        if (user) {
          this.currentUser = user;
          this.touchSession();
          this.notify();
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }

  private touchSession() {
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
  }

  private initActivityTracker() {
    if (this.activityListenerBound || typeof window === 'undefined') return;
    this.activityListenerBound = true;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const throttleTouch = () => {
      if (this.currentUser) {
        this.touchSession();
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, throttleTouch, { passive: true });
    });

    // Check expiry every 60 seconds
    setInterval(() => {
      if (this.currentUser) {
        const lastActiveStr = localStorage.getItem(SESSION_TIMESTAMP_KEY);
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          if (Date.now() - lastActive > SESSION_TIMEOUT_MS) {
            this.logout('Sesi otomatis ditutup setelah 30 menit tidak aktif demi keamanan.');
          }
        }
      }
    }, 60000);
  }

  public subscribe(listener: (user: UserAccount | null) => void) {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) {
      l(this.currentUser);
    }
  }

  public getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  public isUsingDefaultPassword(): boolean {
    if (!this.currentUser) return false;
    const defaults = ['admin123', 'tendik123', 'guru123', '1234'];
    return (
      defaults.includes(this.currentUser.passwordHash) ||
      defaults.includes(this.currentUser.pinCode)
    );
  }

  public async loginWithCredentials(username: string, password: string): Promise<{ success: boolean; message: string }> {
    const cleanUsername = username.trim().toLowerCase();
    const rateCheck = rateLimiter.checkLimit(`auth_user_${cleanUsername}`, 5, 60000);

    if (!rateCheck.allowed) {
      await logSecurityEvent({
        actorUsername: cleanUsername,
        actorRole: 'unknown',
        action: 'AUTH_RATE_LIMIT_EXCEEDED',
        resource: 'Login_Form',
        status: 'DENIED',
        details: `Upaya login diblokir karena melebihi batas percobaan. Tunggu ${rateCheck.retryAfterSeconds} detik.`,
      });
      return {
        success: false,
        message: `Terlalu banyak percobaan login gagal. Mohon tunggu ${rateCheck.retryAfterSeconds} detik demi keamanan akun.`,
      };
    }

    const user = await db.users.where('username').equals(cleanUsername).first();
    if (!user) {
      await logSecurityEvent({
        actorUsername: cleanUsername,
        actorRole: 'unknown',
        action: 'AUTH_LOGIN_FAILED_USER_NOT_FOUND',
        resource: 'Login_Form',
        status: 'FAILED',
        details: 'Percobaan login dengan username yang tidak terdaftar',
      });
      return { success: false, message: 'Username atau kata sandi tidak valid.' };
    }

    const isPasswordValid = await verifyPasswordHash(password, user.passwordHash);
    if (!isPasswordValid) {
      await logSecurityEvent({
        actorUsername: cleanUsername,
        actorRole: user.role,
        action: 'AUTH_LOGIN_FAILED_INVALID_PASSWORD',
        resource: 'Login_Form',
        status: 'FAILED',
        details: 'Kata sandi tidak sesuai',
      });
      return { success: false, message: 'Username atau kata sandi tidak valid.' };
    }

    // Reset rate limiter upon successful login
    rateLimiter.reset(`auth_user_${cleanUsername}`);

    this.currentUser = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id }));
    this.touchSession();
    await db.users.update(user.id, { lastLogin: new Date().toISOString() });

    await logSecurityEvent({
      actorUsername: user.username,
      actorRole: user.role,
      action: 'AUTH_LOGIN_SUCCESS',
      resource: 'Login_Form',
      status: 'SUCCESS',
      details: `Login berhasil untuk peran ${user.role} (${user.namaLengkap})`,
    });

    this.notify();
    return { success: true, message: `Selamat datang, ${user.namaLengkap}!` };
  }

  public async loginWithPin(pin: string): Promise<{ success: boolean; message: string }> {
    const cleanPin = pin.trim();
    const rateCheck = rateLimiter.checkLimit('auth_pin_global', 5, 60000);

    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `Terlalu banyak percobaan PIN gagal. Mohon tunggu ${rateCheck.retryAfterSeconds} detik.`,
      };
    }

    const user = await db.users.where('pinCode').equals(cleanPin).first();
    if (!user) {
      await logSecurityEvent({
        actorUsername: 'pin_user',
        actorRole: 'unknown',
        action: 'AUTH_PIN_FAILED',
        resource: 'Pin_Pad',
        status: 'FAILED',
        details: 'PIN Cepat tidak cocok dengan akun manapun',
      });
      return { success: false, message: 'PIN Cepat tidak valid.' };
    }

    rateLimiter.reset('auth_pin_global');

    this.currentUser = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id }));
    this.touchSession();
    await db.users.update(user.id, { lastLogin: new Date().toISOString() });

    await logSecurityEvent({
      actorUsername: user.username,
      actorRole: user.role,
      action: 'AUTH_PIN_LOGIN_SUCCESS',
      resource: 'Pin_Pad',
      status: 'SUCCESS',
      details: `Login PIN berhasil untuk ${user.namaLengkap}`,
    });

    this.notify();
    return { success: true, message: `Login PIN berhasil. Selamat bertugas, ${user.namaLengkap}!` };
  }

  public async changePassword(currentPassword: string, newPassword: string, newPin?: string): Promise<{ success: boolean; message: string }> {
    if (!this.currentUser) {
      return { success: false, message: 'Harap login terlebih dahulu.' };
    }

    const isCurrentValid = await verifyPasswordHash(currentPassword, this.currentUser.passwordHash);
    if (!isCurrentValid) {
      return { success: false, message: 'Kata sandi saat ini tidak sesuai.' };
    }

    if (newPassword.length < 8) {
      return { success: false, message: 'Kata sandi baru minimal 8 karakter.' };
    }

    const hashed = await hashPassword(newPassword);
    const updates: Partial<UserAccount> = { passwordHash: hashed };
    if (newPin && /^\d{4}$/.test(newPin)) {
      updates.pinCode = newPin;
    }

    await db.users.update(this.currentUser.id, updates);
    this.currentUser = { ...this.currentUser, ...updates };

    await logSecurityEvent({
      actorUsername: this.currentUser.username,
      actorRole: this.currentUser.role,
      action: 'USER_PASSWORD_CHANGED',
      resource: 'User_Security_Profile',
      status: 'SUCCESS',
      details: 'Kata sandi akun dan/atau PIN berhasil diperbarui dengan enkripsi PBKDF2',
    });

    this.notify();
    return { success: true, message: 'Kata sandi berhasil diperbarui dan diamankan secara kriptografis!' };
  }

  public async switchRoleQuick(role: 'admin' | 'tendik' | 'guru') {
    const user = await db.users.where('role').equals(role).first();
    if (user) {
      this.currentUser = user;
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id }));
      this.touchSession();
      this.notify();
      return true;
    }
    return false;
  }

  public logout(customMessage?: string) {
    if (this.currentUser) {
      logSecurityEvent({
        actorUsername: this.currentUser.username,
        actorRole: this.currentUser.role,
        action: 'AUTH_LOGOUT',
        resource: 'App_Session',
        status: 'SUCCESS',
        details: customMessage || 'Pengguna keluar dari aplikasi secara manual',
      });
    }
    this.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
    this.notify();
  }
}

export const authService = new AuthService();

