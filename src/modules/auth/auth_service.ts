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
    await this.ensureSuperAdminIntegrity();
    await this.restoreSession();
    return this.currentUser;
  }

  private async ensureSuperAdminIntegrity() {
    try {
      const allUsers = await db.users.toArray();
      if (allUsers.length === 0) return;

      // Temukan atau tetapkan Super Admin utama
      let superAdmin = allUsers.find((u) => u.isSuperAdmin === true || u.username === 'admin');
      if (!superAdmin) {
        superAdmin = allUsers.find((u) => u.role === 'admin') || allUsers[0];
      }

      if (superAdmin && (!superAdmin.isSuperAdmin || superAdmin.role !== 'admin')) {
        await db.users.update(superAdmin.id, { isSuperAdmin: true, role: 'admin' });
      }

      // Pastikan HANYA 1 Super Admin di sistem
      for (const u of allUsers) {
        if (superAdmin && u.id !== superAdmin.id && u.isSuperAdmin) {
          await db.users.update(u.id, { isSuperAdmin: false });
        }
      }
    } catch (e) {
      console.warn('[AuthService] Super admin integrity check deferred:', e);
    }
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
    const updates: Partial<UserAccount> = {
      passwordHash: hashed,
      updatedAt: new Date().toISOString(),
    };
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

  public isSuperAdmin(user?: UserAccount | null): boolean {
    const u = user !== undefined ? user : this.currentUser;
    if (!u) return false;
    return u.isSuperAdmin === true || (u.role === 'admin' && u.username === 'admin');
  }

  public async getAllUsers(): Promise<UserAccount[]> {
    const users = await db.users.toArray();
    return users.sort((a, b) => {
      if (a.isSuperAdmin || a.username === 'admin') return -1;
      if (b.isSuperAdmin || b.username === 'admin') return 1;
      return a.namaLengkap.localeCompare(b.namaLengkap);
    });
  }

  public async createUser(data: {
    username: string;
    password: string;
    pinCode: string;
    role: 'guru' | 'tendik';
    namaLengkap: string;
    nipNuptk?: string;
    pegawaiId?: string;
  }): Promise<{ success: boolean; message: string; user?: UserAccount }> {
    if (!this.isSuperAdmin()) {
      return { success: false, message: 'Akses ditolak: Hanya Super Admin yang berhak membuat akun pengguna baru.' };
    }

    if ((data.role as any) === 'admin') {
      return { success: false, message: 'Ditolak: Sistem hanya mengizinkan 1 Super Admin utama di sekolah.' };
    }

    const cleanUsername = data.username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, message: 'Nama pengguna minimal 3 karakter huruf/angka.' };
    }
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      return { success: false, message: 'Nama pengguna hanya boleh mengandung huruf kecil, angka, titik, dan garis bawah.' };
    }

    const existingUser = await db.users.where('username').equals(cleanUsername).first();
    if (existingUser) {
      return { success: false, message: `Nama pengguna "${cleanUsername}" sudah digunakan oleh akun lain.` };
    }

    const cleanPin = data.pinCode.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return { success: false, message: 'PIN Cepat wajib terdiri dari tepat 4 digit angka.' };
    }

    const existingPin = await db.users.where('pinCode').equals(cleanPin).first();
    if (existingPin) {
      return { success: false, message: `PIN Cepat "${cleanPin}" sudah digunakan oleh ${existingPin.namaLengkap}. Pilih kombinasi 4 digit lain.` };
    }

    if (!data.password || data.password.length < 6) {
      return { success: false, message: 'Kata sandi minimal 6 karakter.' };
    }

    if (!data.namaLengkap || data.namaLengkap.trim().length < 2) {
      return { success: false, message: 'Nama lengkap wajib diisi.' };
    }

    const passwordHash = await hashPassword(data.password);
    const newId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newUser: UserAccount = {
      id: newId,
      username: cleanUsername,
      passwordHash,
      role: data.role,
      isSuperAdmin: false,
      isActive: true,
      pinCode: cleanPin,
      namaLengkap: data.namaLengkap.trim(),
      nipNuptk: data.nipNuptk?.trim() || undefined,
      pegawaiId: data.pegawaiId || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.users.add(newUser);

    await logSecurityEvent({
      actorUsername: this.currentUser?.username || 'admin',
      actorRole: 'admin',
      action: 'USER_CREATED_BY_SUPERADMIN',
      resource: 'User_Management',
      status: 'SUCCESS',
      details: `Super Admin menerbitkan akun baru untuk ${newUser.namaLengkap} (@${newUser.username}) dengan peran ${newUser.role}`,
    });

    return {
      success: true,
      message: `Akun untuk ${newUser.namaLengkap} (@${newUser.username}) berhasil diterbitkan!`,
      user: newUser,
    };
  }

  public async resetUserCredentials(
    userId: string,
    newPassword?: string,
    newPin?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isSuperAdmin()) {
      return { success: false, message: 'Akses ditolak: Hanya Super Admin yang berhak mereset kredensial pengguna.' };
    }

    const targetUser = await db.users.get(userId);
    if (!targetUser) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    const updates: Partial<UserAccount> = { updatedAt: new Date().toISOString() };

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
      }
      updates.passwordHash = await hashPassword(newPassword.trim());
    }

    if (newPin && newPin.trim()) {
      const cleanPin = newPin.trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        return { success: false, message: 'PIN Cepat wajib terdiri dari 4 digit angka.' };
      }
      const existingPin = await db.users.where('pinCode').equals(cleanPin).first();
      if (existingPin && existingPin.id !== userId) {
        return { success: false, message: `PIN Cepat "${cleanPin}" sudah digunakan akun lain.` };
      }
      updates.pinCode = cleanPin;
    }

    await db.users.update(userId, updates);

    await logSecurityEvent({
      actorUsername: this.currentUser?.username || 'admin',
      actorRole: 'admin',
      action: 'USER_CREDENTIALS_RESET_BY_SUPERADMIN',
      resource: 'User_Management',
      status: 'SUCCESS',
      details: `Super Admin mereset kredensial akun @${targetUser.username} (${targetUser.namaLengkap})`,
    });

    return {
      success: true,
      message: `Kredensial untuk @${targetUser.username} berhasil diperbarui!`,
    };
  }

  public async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    if (!this.isSuperAdmin()) {
      return { success: false, message: 'Akses ditolak: Hanya Super Admin yang berhak menghapus akun pengguna.' };
    }

    const targetUser = await db.users.get(userId);
    if (!targetUser) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    if (targetUser.isSuperAdmin || targetUser.username === 'admin' || targetUser.id === this.currentUser?.id) {
      return {
        success: false,
        message: 'Proteksi Keamanan: Akun Super Admin utama bersifat permanen dan tidak dapat dihapus!',
      };
    }

    await db.users.delete(userId);

    await logSecurityEvent({
      actorUsername: this.currentUser?.username || 'admin',
      actorRole: 'admin',
      action: 'USER_DELETED_BY_SUPERADMIN',
      resource: 'User_Management',
      status: 'SUCCESS',
      details: `Super Admin menghapus akun @${targetUser.username} (${targetUser.namaLengkap})`,
    });

    return {
      success: true,
      message: `Akun @${targetUser.username} (${targetUser.namaLengkap}) berhasil dihapus.`,
    };
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

