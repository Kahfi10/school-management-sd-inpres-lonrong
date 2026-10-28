/**
 * Background Web Worker Crypto Offloader
 * Executes 100,000 iteration PBKDF2 SHA-256 derivations in a dedicated background thread,
 * ensuring the main browser UI thread maintains a silky 60 FPS without frame drops on teacher mobile phones.
 */

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

let cryptoWorker: Worker | null = null;
const pendingWorkerRequests = new Map<string, { resolve: (val: string) => void; reject: (err: any) => void }>();

function getOrCreateWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (!cryptoWorker) {
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      cryptoWorker = new Worker(workerUrl);
      cryptoWorker.onmessage = (event) => {
        const { id, success, result, error } = event.data;
        const cb = pendingWorkerRequests.get(id);
        if (cb) {
          pendingWorkerRequests.delete(id);
          if (success) {
            cb.resolve(result);
          } else {
            cb.reject(new Error(error));
          }
        }
      };
    } catch {
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
  const worker = getOrCreateWorker();
  if (!worker) {
    // Main-thread fallback
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

  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return new Promise((resolve, reject) => {
    pendingWorkerRequests.set(id, { resolve, reject });
    worker.postMessage({ id, password, salt, iterations });
  });
}
