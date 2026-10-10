export type PrintDocumentType = 
  | 'invoice' 
  | 'receipt' 
  | 'proforma' 
  | 'bulk-invoices' 
  | 'bulk-receipts' 
  | 'report';

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

// Global listener for native print shortcuts (Ctrl+P / Cmd+P / Browser Menu Print)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', () => {
    if (!document.documentElement.getAttribute('data-print-mode')) {
      // 1. Detect open Receipt modal
      const receiptEl = document.getElementById('receipt-print-area');
      if (receiptEl && receiptEl.offsetParent !== null) {
        setPrintMode('receipt');
        return;
      }

      // 2. Detect open Invoice modal
      const invoiceEl = document.getElementById('invoice-print-area');
      if (invoiceEl && invoiceEl.offsetParent !== null) {
        setPrintMode('invoice');
        return;
      }

      // 3. Detect Proforma Desk
      const proformaEl = document.getElementById('proforma-print-area');
      if (proformaEl && proformaEl.offsetParent !== null) {
        setPrintMode('proforma');
        return;
      }

      // 4. Detect Bulk Print container
      const bulkEl = document.getElementById('bulk-print-area');
      if (bulkEl && bulkEl.offsetParent !== null) {
        setPrintMode('bulk-invoices');
        return;
      }

      // 5. Detect Report Ledger
      const reportEl = document.getElementById('report-print-area');
      if (reportEl && reportEl.offsetParent !== null) {
        setPrintMode('report');
        return;
      }
    }
  });

  window.addEventListener('afterprint', () => {
    clearPrintMode();
  });
}
