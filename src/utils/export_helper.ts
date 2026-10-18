import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitizeFilename } from './security';

/**
 * Universal safe caller for jspdf-autotable across ESM/CJS bundlers
 */
export function applyAutoTable(doc: jsPDF, options: any) {
  try {
    if (typeof (doc as any).autoTable === 'function') {
      (doc as any).autoTable(options);
    } else if (typeof autoTable === 'function') {
      autoTable(doc, options);
    } else if (typeof (autoTable as any)?.default === 'function') {
      (autoTable as any).default(doc, options);
    } else {
      console.error('jspdf-autotable plugin not found');
    }
  } catch (err) {
    console.error('Error applying autoTable:', err);
    throw err;
  }
}

/**
 * Robust cross-browser blob downloader with long lifetime to prevent corrupted 0-byte downloads
 * Protected against path traversal attacks.
 */
export function downloadBlob(blob: Blob, rawFilename: string): string {
  const safeFilename = sanitizeFilename(rawFilename, 'dokumen_sekolah');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  // Keep object URL active for 60 seconds to ensure OS file system write completes
  setTimeout(() => {
    try {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    } catch {
      // Ignored
    }
  }, 60000);
  return url;
}

/**
 * Modern Apple HIG on-screen floating notification card for exported files
 */
export function showExportNotification(params: {
  filename: string;
  fileType: 'excel' | 'pdf';
  blob: Blob;
  previewUrl?: string;
}) {
  const existing = document.getElementById('apple-export-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'apple-export-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 999999;
    background: var(--apple-surface, #ffffff);
    color: var(--apple-text, #1d1d1f);
    border: 1px solid var(--apple-border, rgba(0, 0, 0, 0.12));
    border-radius: 16px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
    padding: 1.1rem 1.35rem;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    animation: appleSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  `;

  const sizeKb = Math.max(1, Math.round(params.blob.size / 1024));
  const isPdf = params.fileType === 'pdf';
  const iconSvg = isPdf
    ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
    : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`;
  const badgeColor = isPdf ? 'var(--apple-red, #ff3b30)' : 'var(--apple-green, #34c759)';

  toast.innerHTML = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: ${badgeColor}15; color: ${badgeColor}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${iconSvg}
        </div>
        <div>
          <div style="font-weight: 600; font-size: 0.95rem; line-height: 1.2;">File Berhasil Dibuat</div>
          <div style="font-size: 0.8rem; color: var(--apple-text-secondary, #86868b); margin-top: 0.2rem; word-break: break-all;">
            ${params.filename} (${sizeKb} KB)
          </div>
        </div>
      </div>
      <button id="toastCloseBtn" style="background: none; border: none; cursor: pointer; color: var(--apple-text-secondary, #86868b); padding: 2px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div style="font-size: 0.82rem; color: var(--apple-text-secondary, #86868b); line-height: 1.35;">
      ${
        isPdf
          ? 'Dokumen PDF telah otomatis diunduh dan siap dibuka atau dicetak.'
          : 'File spreadsheet Excel (.xlsx) standar telah selesai diunduh dan dapat langsung dibuka di Microsoft Excel, WPS, atau Google Spreadsheet.'
      }
    </div>
    <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.25rem;">
      ${
        params.previewUrl
          ? `<button id="toastOpenBtn" class="apple-btn apple-btn-secondary" style="padding: 0.4rem 0.85rem; font-size: 0.82rem;">Buka Tab Baru</button>`
          : ''
      }
      <button id="toastDownloadBtn" class="apple-btn apple-btn-primary" style="padding: 0.4rem 0.85rem; font-size: 0.82rem;">Unduh Lagi</button>
    </div>
  `;

  document.body.appendChild(toast);

  toast.querySelector('#toastCloseBtn')?.addEventListener('click', () => toast.remove());
  toast.querySelector('#toastDownloadBtn')?.addEventListener('click', () => {
    downloadBlob(params.blob, params.filename);
  });
  if (params.previewUrl) {
    toast.querySelector('#toastOpenBtn')?.addEventListener('click', () => {
      window.open(params.previewUrl, '_blank');
    });
  }

  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.35s ease';
      setTimeout(() => toast.remove(), 350);
    }
  }, 15000);
}

/**
 * Generate standard, 100% compliant Excel .xlsx file and download
 */
export function exportDataToExcel(
  data: Record<string, any>[],
  sheetName: string,
  filename: string
): { success: boolean; url: string } {
  try {
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-fit column widths
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      ws['!cols'] = keys.map((k) => {
        const maxLen = Math.max(
          k.length,
          ...data.map((row) => String(row[k] || '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

    // Pure binary Uint8Array representation (prevents UTF-8 encoding corruption in browsers)
    const wbout = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array',
      compression: true,
    });

    // Standard IANA OpenXML Spreadsheet MIME type (strictly without charset parameter)
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    const url = downloadBlob(blob, safeFilename);

    // Show on-screen user notification with action buttons
    showExportNotification({
      filename: safeFilename,
      fileType: 'excel',
      blob,
    });

    return { success: true, url };
  } catch (err) {
    console.error('Failed to export Excel file:', err);
    alert(`Gagal mengekspor file Excel: ${(err as Error).message}`);
    return { success: false, url: '' };
  }
}

/**
 * Export and download jsPDF document with automatic fallback and new tab viewer
 */
export function exportDocToPdf(
  doc: jsPDF,
  filename: string,
  openInNewTab: boolean = false
): { success: boolean; url: string } {
  try {
    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    const pdfBlob = doc.output('blob');

    const downloadUrl = downloadBlob(pdfBlob, safeFilename);
    let previewUrl: string | undefined;

    if (openInNewTab) {
      previewUrl = URL.createObjectURL(pdfBlob);
      // Attempt opening new tab; browsers that block popups will still have the toast action button
      try {
        const win = window.open(previewUrl, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          console.warn('Popup blocked by browser. Showing toast button instead.');
        }
      } catch (e) {
        console.warn('Could not open preview tab directly:', e);
      }
    }

    // Show on-screen user notification with direct action buttons
    showExportNotification({
      filename: safeFilename,
      fileType: 'pdf',
      blob: pdfBlob,
      previewUrl: previewUrl || downloadUrl,
    });

    return { success: true, url: downloadUrl };
  } catch (err) {
    console.error('Failed to export PDF file:', err);
    alert(`Gagal mengekspor dokumen PDF: ${(err as Error).message}`);
    return { success: false, url: '' };
  }
}
