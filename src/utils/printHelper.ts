export type PrintDocumentType =
  | 'invoice'
  | 'receipt'
  | 'proforma'
  | 'bulk-invoices'
  | 'bulk-receipts'
  | 'report'
  | 'financial-ledger'
  | 'financial-voucher'
  | 'dashboard'
  | 'documents'
  | 'document-single'
  | 'inventory'
  | 'customers'
  | 'employees'
  | 'invoices-ledger'
  | 'jobs'
  | 'daily-work'
  | 'settings'
  | 'manual';

export const setPrintMode = (type: PrintDocumentType) => {
  const mode = type.toLowerCase();
  document.documentElement.setAttribute('data-print-mode', mode);
  document.body.setAttribute('data-print-mode', mode);
};

export const clearPrintMode = () => {
  document.documentElement.removeAttribute('data-print-mode');
  document.body.removeAttribute('data-print-mode');
};

/**
 * Triggers printing of STRICTLY and ONLY the selected document type.
 * Sets the `data-print-mode` attribute on both <html> and <body>,
 * which instructs the CSS print stylesheet to isolate and display ONLY
 * the target document while completely hiding and collapsing all other
 * documents (invoices, receipts, proformas, dashboards, navigation, etc.).
 */
export const printDocument = (type: PrintDocumentType) => {
  setPrintMode(type);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearPrintMode();
    window.removeEventListener('afterprint', cleanup);
  };

  // Clean up when print dialog finishes or is cancelled
  window.addEventListener('afterprint', cleanup);

  // Timeout ensures DOM attributes and print layouts are settled before browser captures layout
  setTimeout(() => {
    window.print();
    // Safety fallback timeout in case afterprint does not fire in certain browser webviews
    setTimeout(cleanup, 3000);
  }, 120);
};

const isElementVisible = (el: HTMLElement | null): boolean => {
  if (!el || !document.body.contains(el)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return el.getClientRects().length > 0;
};

// Global listener for native print shortcuts (Ctrl+P / Cmd+P / Browser Menu Print)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', () => {
    if (!document.documentElement.getAttribute('data-print-mode')) {
      // 1. Check active visible modal overlays first
      const visibleChecks: [string, PrintDocumentType][] = [
        ['receipt-print-area', 'receipt'],
        ['invoice-print-area', 'invoice'],
        ['document-single-print-area', 'document-single'],
        ['bulk-print-area', 'bulk-invoices'],
        ['financial-voucher-print-area', 'financial-voucher'],
        ['manual-print-area', 'manual'],
        ['proforma-print-area', 'proforma'],
        ['report-print-area', 'report'],
        ['financial-ledger-print-area', 'financial-ledger'],
      ];

      for (const [elId, mode] of visibleChecks) {
        if (isElementVisible(document.getElementById(elId))) {
          setPrintMode(mode);
          return;
        }
      }

      // 2. Fallback to whichever active module's dedicated print container is mounted
      const mountedChecks: [string, PrintDocumentType][] = [
        ['invoices-ledger-print-area', 'invoices-ledger'],
        ['customers-print-area', 'customers'],
        ['jobs-print-area', 'jobs'],
        ['inventory-print-area', 'inventory'],
        ['employees-print-area', 'employees'],
        ['daily-work-print-area', 'daily-work'],
        ['documents-print-area', 'documents'],
        ['dashboard-print-area', 'dashboard'],
        ['settings-print-area', 'settings'],
        ['manual-print-area', 'manual'],
      ];

      for (const [elId, mode] of mountedChecks) {
        if (document.getElementById(elId)) {
          setPrintMode(mode);
          return;
        }
      }
    }
  });

  window.addEventListener('afterprint', () => {
    clearPrintMode();
  });
}
