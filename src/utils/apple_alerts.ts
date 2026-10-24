/**
 * Apple HIG Elegant Alert, Toast & Confirmation Modal System
 * Provides silky-smooth, accessible, and non-blocking alert notifications
 * and modal confirmation dialogs for SD Inpres Lonrong.
 */

export interface ToastOptions {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
}

let toastContainer: HTMLElement | null = null;

function getOrCreateToastContainer(): HTMLElement {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'appleToastContainer';
    toastContainer.className = 'apple-toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show a sleek, floating Apple-style Toast Notification
 */
export function showAlert(optionsOrMessage: ToastOptions | string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) {
  const options: ToastOptions =
    typeof optionsOrMessage === 'string'
      ? { message: optionsOrMessage, type, title, duration: 4000 }
      : { type: 'info', duration: 4000, ...optionsOrMessage };

  const container = getOrCreateToastContainer();

  const toast = document.createElement('div');
  toast.className = `apple-toast apple-toast-${options.type || 'info'}`;

  // Icons based on type
  let iconSvg = '';
  switch (options.type) {
    case 'success':
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      break;
    case 'error':
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      break;
    case 'warning':
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      break;
    default:
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  const defaultTitles: Record<string, string> = {
    success: 'Berhasil',
    error: 'Perhatian',
    warning: 'Pemberitahuan',
    info: 'Informasi',
  };

  const finalTitle = options.title || defaultTitles[options.type || 'info'];

  toast.innerHTML = `
    <div class="toast-icon-box toast-icon-${options.type || 'info'}">
      ${iconSvg}
    </div>
    <div class="toast-body">
      ${finalTitle ? `<div class="toast-title">${finalTitle}</div>` : ''}
      <div class="toast-message">${options.message}</div>
    </div>
    <button class="toast-close-btn" aria-label="Tutup">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  // Dismiss on close click
  const closeBtn = toast.querySelector('.toast-close-btn');
  const dismiss = () => {
    toast.classList.add('dismissing');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 220);
  };

  closeBtn?.addEventListener('click', dismiss);
  toast.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.toast-close-btn')) return;
    dismiss();
  });

  container.appendChild(toast);

  // Auto dismiss
  const timer = setTimeout(dismiss, options.duration || 3500);
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
}

/**
 * Show an elegant Apple modal sheet confirmation dialog.
 * Replaces window.confirm with a beautiful Promise-based interface.
 */
export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // Remove any existing confirm dialog
    const existing = document.getElementById('appleConfirmBackdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'appleConfirmBackdrop';
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = '99999';

    const isDanger = options.type !== 'info' && options.type !== 'warning';

    let iconSvg = '';
    if (options.type === 'info') {
      iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    } else if (options.type === 'warning') {
      iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
      // Danger default
      iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }

    backdrop.innerHTML = `
      <div class="modal-sheet confirm-sheet" style="max-width: 420px; padding: 1.85rem 1.65rem; text-align: center;">
        <div class="confirm-icon-badge confirm-icon-${options.type || 'danger'}">
          ${iconSvg}
        </div>
        <h3 style="font-size: 1.18rem; font-weight: 700; color: var(--apple-text-primary); margin: 0.85rem 0 0.35rem 0; letter-spacing: -0.015em;">
          ${options.title}
        </h3>
        <p style="font-size: 0.86rem; color: var(--apple-text-secondary); line-height: 1.45; margin: 0 0 1.5rem 0;">
          ${options.message}
        </p>
        <div style="display: flex; gap: 0.75rem; justify-content: center;">
          <button class="apple-btn apple-btn-secondary" id="btnConfirmCancel" style="flex: 1; padding: 0.65rem 1rem; font-size: 0.86rem;">
            ${options.cancelText || 'Batal'}
          </button>
          <button class="apple-btn ${isDanger ? 'apple-btn-danger' : 'apple-btn-primary'}" id="btnConfirmProceed" style="flex: 1; padding: 0.65rem 1rem; font-size: 0.86rem;">
            ${options.confirmText || 'Lanjutkan'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const cleanup = (confirmed: boolean) => {
      backdrop.classList.remove('active');
      setTimeout(() => {
        if (backdrop.parentElement) backdrop.remove();
        resolve(confirmed);
      }, 160);
    };

    backdrop.querySelector('#btnConfirmCancel')?.addEventListener('click', () => cleanup(false));
    backdrop.querySelector('#btnConfirmProceed')?.addEventListener('click', () => cleanup(true));

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup(false);
    });

    const keyListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', keyListener);
        cleanup(false);
      } else if (e.key === 'Enter') {
        window.removeEventListener('keydown', keyListener);
        cleanup(true);
      }
    };
    window.addEventListener('keydown', keyListener);
  });
}

// Expose globally for convenience
(window as any).showAlert = showAlert;
(window as any).showConfirmDialog = showConfirmDialog;
