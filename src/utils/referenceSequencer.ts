/**
 * Reference Number Sequencer for SWEDS WOOD ENTERPRISE
 * 
 * Ensures all Invoices, Proforma Invoices, and Receipts print reference numbers
 * in strict ascending order (e.g. INV-2026-0001, PRO-2026-0001, REC-2026-0001)
 * to avoid double entry and maintain consistency.
 */

export function getNextAscendingReference(prefix: 'INV' | 'PRO' | 'REC', year?: number): string {
  const targetYear = year || new Date().getFullYear();
  const yearStr = String(targetYear);
  const pattern = new RegExp(`^${prefix}-${yearStr}-(\\d+)$`, 'i');
  
  let highestSeq = 0;

  // 1. Scan savedInvoices in localStorage (both potential keys)
  try {
    const keysToCheck = ['swedswood_saved_invoices', 'swedsfree_savedInvoices'];
    for (const key of keysToCheck) {
      const rawSaved = localStorage.getItem(key);
      if (rawSaved) {
        const list = JSON.parse(rawSaved);
        if (Array.isArray(list)) {
          list.forEach((doc: any) => {
            const ref = doc.invoiceNo || doc.proformaNo || doc.receiptNo || doc.id || '';
            const match = ref.match(pattern);
            if (match && match[1]) {
              const seq = parseInt(match[1], 10);
              if (!isNaN(seq) && seq > highestSeq) {
                highestSeq = seq;
              }
            }
          });
        }
      }
    }
  } catch (e) {
    console.error('Error scanning saved invoices for sequence:', e);
  }

  // 2. Scan jobs payments for receipts
  if (prefix === 'REC') {
    try {
      const rawJobs = localStorage.getItem('swedsfree_jobs');
      if (rawJobs) {
        const jobsList = JSON.parse(rawJobs);
        if (Array.isArray(jobsList)) {
          jobsList.forEach((j: any) => {
            if (Array.isArray(j.payments)) {
              j.payments.forEach((p: any) => {
                const ref = p.id || p.referenceId || '';
                const match = ref.match(pattern);
                if (match && match[1]) {
                  const seq = parseInt(match[1], 10);
                  if (!isNaN(seq) && seq > highestSeq) {
                    highestSeq = seq;
                  }
                }
              });
            }
          });
        }
      }
    } catch (e) {
      console.error('Error scanning jobs for receipt sequence:', e);
    }
  }

  // 3. Scan a persistent sequence counter key in localStorage to guarantee monotonic ascension
  const storageCounterKey = `swedsfree_seq_${prefix}_${yearStr}`;
  const storedCounter = parseInt(localStorage.getItem(storageCounterKey) || '0', 10);
  if (!isNaN(storedCounter) && storedCounter > highestSeq) {
    highestSeq = storedCounter;
  }

  const nextSeq = highestSeq + 1;
  return `${prefix}-${yearStr}-${String(nextSeq).padStart(4, '0')}`;
}

export function commitAscendingReference(prefix: 'INV' | 'PRO' | 'REC', refString: string): void {
  const match = refString.match(new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`, 'i'));
  if (match) {
    const yearStr = match[1];
    const seq = parseInt(match[2], 10);
    const storageCounterKey = `swedsfree_seq_${prefix}_${yearStr}`;
    const curr = parseInt(localStorage.getItem(storageCounterKey) || '0', 10);
    if (isNaN(curr) || seq > curr) {
      localStorage.setItem(storageCounterKey, String(seq));
    }
  }
}
