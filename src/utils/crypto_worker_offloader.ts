/**
 * Cryptographic Password Derivation Engine
 * Uses the browser's native Web Crypto API (SubtleCrypto) with Web Worker offloading
 * and zero-lag fallback. SubtleCrypto executes asynchronously in native C++ background
 * threads, guaranteeing smooth 60 FPS UI performance without CSP blocking risks.
 */

async function nativeSubtleHash(
  password: string,
  salt: string,
  iterations: number
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password + salt),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );

  const rawKey = await crypto.subtle.exportKey('raw', key);
  const hashArray = Array.from(new Uint8Array(rawKey));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

let workerFailedOrBlocked = false;
let cryptoWorker: Worker | null = null;
const pendingWorkerRequests = new Map<
  string,
  { resolve: (val: string) => void; reject: (err: any) => void }
>();

function getOrCreateWorker(): Worker | null {
  if (workerFailedOrBlocked) return null;
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;

  if (!cryptoWorker) {
    try {
      const workerCode = `
        self.onmessage = async (e) => {
          const { id, password, salt, iterations } = e.data;
          try {
            const enc = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
              'raw',
              enc.encode(password + salt),
              { name: 'PBKDF2' },
              false,
              ['deriveBits', 'deriveKey']
            );
            const key = await crypto.subtle.deriveKey(
              {
                name: 'PBKDF2',
                salt: enc.encode(salt),
                iterations: iterations || 100000,
                hash: 'SHA-256',
              },
              keyMaterial,
              { name: 'HMAC', hash: 'SHA-256', length: 256 },
              true,
              ['sign']
            );
            const rawKey = await crypto.subtle.exportKey('raw', key);
            const hashArray = Array.from(new Uint8Array(rawKey));
            const result = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
            self.postMessage({ id, success: true, result });
          } catch (err) {
            self.postMessage({ id, success: false, error: String(err) });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      cryptoWorker = new Worker(workerUrl);

      cryptoWorker.onmessage = (event) => {
        const { id, success, result, error } = event.data || {};
        const cb = pendingWorkerRequests.get(id);
        if (cb) {
          pendingWorkerRequests.delete(id);
          if (success) {
            cb.resolve(result);
          } else {
            cb.reject(new Error(error || 'Worker PBKDF2 calculation failed'));
          }
        }
      };

      cryptoWorker.onerror = (err) => {
        console.warn('[CryptoEngine] Web Worker error / CSP block detected, falling back to native SubtleCrypto:', err);
        workerFailedOrBlocked = true;
        // Reject all waiting promises so they fallback immediately
        for (const [id, cb] of pendingWorkerRequests.entries()) {
          cb.reject(new Error('Worker error'));
          pendingWorkerRequests.delete(id);
        }
        if (cryptoWorker) {
          try {
            cryptoWorker.terminate();
          } catch {}
          cryptoWorker = null;
        }
      };
    } catch (e) {
      console.warn('[CryptoEngine] Worker initialization blocked or unsupported:', e);
      workerFailedOrBlocked = true;
      cryptoWorker = null;
    }
  }

  return cryptoWorker;
}

export async function hashPasswordWithWorker(
  password: string,
  salt: string = 'sd_inpres_lonrong_salt_2026',
  iterations: number = 100000
): Promise<string> {
  // If worker was previously blocked or failed, jump straight to native Web Crypto (40ms)
  if (!workerFailedOrBlocked) {
    const worker = getOrCreateWorker();
    if (worker) {
      try {
        const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const workerPromise = new Promise<string>((resolve, reject) => {
          pendingWorkerRequests.set(id, { resolve, reject });
          worker.postMessage({ id, password, salt, iterations });
        });

        // 800ms safety timeout: if worker hangs due to CSP silent block, reject and fallback
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Worker timed out (likely CSP restriction)')), 800)
        );

        return await Promise.race([workerPromise, timeoutPromise]);
      } catch (err) {
        console.warn('[CryptoEngine] Worker execution aborted, activating native WebCrypto fallback:', err);
        workerFailedOrBlocked = true;
      }
    }
  }

  // Resilient Native Web Crypto Fallback (runs in native C++ background thread, ~40ms)
  return await nativeSubtleHash(password, salt, iterations);
}
