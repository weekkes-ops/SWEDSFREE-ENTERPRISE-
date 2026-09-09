import { useState, useEffect, useRef, FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import { Job, Customer, Employee, formatCurrency, JobPayment, FinancialCategory, SavedInvoice, SavedInvoiceItem, PaymentAuditLogEntry } from '../types';
import { subscribeToCollection, saveDocument, deleteDocument, saveBatchDocuments } from '../lib/firestoreService';
import { 
  FileText, 
  Receipt, 
  Search, 
  Printer, 
  DollarSign, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  Building2, 
  ChevronRight,
  Sparkles,
  Percent,
  TrendingUp,
  FileCheck,
  Edit2,
  Eye,
  Plus,
  Trash2,
  FolderArchive,
  Download,
  CheckSquare,
  Square,
  FileDown,
  Save,
  FolderOpen,
  Filter,
  Tag,
  Clock,
  X,
  Check,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
  PlusCircle,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { buildInvoicePdfContent, buildReceiptPdfContent } from '../utils/pdfGenerator';

export interface CustomInvoiceItem {
  id: string;
  description: string;
  unitRate: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
}

export interface UploadedDocumentItem {
  id: string;
  jobId: string;
  docType: 'INVOICE' | 'RECEIPT';
  fileName: string;
  fileType: 'image' | 'pdf';
  fileDataUrl: string;
  fileSize?: string;
  uploadedAt: string;
  notes?: string;
}

// Default 300x300 Pixel Authorized Signature (SVG Data URL)
export const DEFAULT_300X300_SIGNATURE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="none"/><g transform="translate(15, 25)"><path d="M 25 150 C 55 60, 85 200, 115 90 C 130 50, 140 170, 160 130 C 175 100, 190 180, 220 120 C 235 90, 250 160, 265 110" fill="none" stroke="%231e3a8a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M 20 185 Q 140 220 270 165" fill="none" stroke="%231e3a8a" stroke-width="3" stroke-linecap="round"/><path d="M 170 175 L 255 175" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-dasharray="6 3"/><text x="145" y="235" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="bold" fill="%231e3a8a" text-anchor="middle" letter-spacing="1">AUTHENTICATED SIGNATURE</text><text x="145" y="252" font-family="sans-serif" font-size="9" font-weight="bold" fill="%2364748b" text-anchor="middle">300 x 300 PX OFFICIAL SIGNATURE</text></g></svg>`;

// Default 300x300 Pixel Official Stamp / Seal (SVG Data URL)
export const DEFAULT_300X300_STAMP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="none"/><g transform="rotate(-10 150 150)"><circle cx="150" cy="150" r="138" fill="none" stroke="%23991b1b" stroke-width="6"/><circle cx="150" cy="150" r="126" fill="none" stroke="%23991b1b" stroke-width="2.5" stroke-dasharray="8 5"/><path id="stampTopArc" d="M 35 150 A 115 115 0 0 1 265 150" fill="none"/><text font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="900" fill="%23991b1b" letter-spacing="2.5"><textPath href="%23stampTopArc" startOffset="50%" text-anchor="middle">SWED WOOD WORK</textPath></text><path id="stampBotArc" d="M 265 150 A 115 115 0 0 1 35 150" fill="none"/><text font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="800" fill="%23991b1b" letter-spacing="1.5"><textPath href="%23stampBotArc" startOffset="50%" text-anchor="middle">FREETOWN • SIERRA LEONE</textPath></text><circle cx="150" cy="150" r="88" fill="none" stroke="%23991b1b" stroke-width="3"/><rect x="35" y="122" width="230" height="56" fill="%23991b1b" rx="6"/><text x="150" y="157" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" fill="%23ffffff" text-anchor="middle" letter-spacing="2">OFFICIAL STAMP</text><text x="65" y="112" font-family="sans-serif" font-size="16" fill="%23991b1b">★</text><text x="220" y="112" font-family="sans-serif" font-size="16" fill="%23991b1b">★</text><text x="150" y="206" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="800" fill="%23991b1b" text-anchor="middle" letter-spacing="1">AUDITED & CLEARED</text><text x="150" y="222" font-family="monospace" font-size="10" font-weight="bold" fill="%23991b1b" text-anchor="middle">300x300 OFFICIAL SEAL</text></g></svg>`;

// Helper to rasterize logo URL (e.g. /logo.svg or custom upload) into PNG Data URL for jsPDF
export async function getLogoDataUrl(logoUrl?: string): Promise<string | null> {
  const url = logoUrl || '/logo.svg';
  if (url.startsWith('data:image/png') || url.startsWith('data:image/jpeg')) {
    return url;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (e) {
        console.error('Error rasterizing logo for PDF:', e);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export interface IntelliSenseResult {
  id: string;
  type: 'INVOICE' | 'RECEIPT' | 'ORDER' | 'LINE_ITEM' | 'CUSTOMER';
  title: string;
  subtitle: string;
  details?: string;
  badgeText: string;
  badgeColor: string;
  score: number;
  payload: {
    targetSubTab: 'INVOICE' | 'SAVED_INVOICES' | 'RECEIPT';
    jobId?: string;
    savedInvoice?: SavedInvoice;
    receipt?: { job: Job; payment: JobPayment };
  };
}

interface InvoiceReceiptManagerProps {
  jobs: Job[];
  customers: Customer[];
  currentUser: Employee | null;
  invoiceJobId?: string | null;
  initialSubTab?: 'INVOICE' | 'SAVED_INVOICES' | 'RECEIPT' | 'AUDIT_LOG';
  onClearInvoiceJobId?: () => void;
  onUpdateJob?: (updatedJob: Job) => void;
  onUpdateJobPayment?: (jobId: string, payment: JobPayment) => void;
  onDeleteJobPayment?: (jobId: string, paymentId: string) => void;
  paymentAuditLogs?: PaymentAuditLogEntry[];
}

export default function InvoiceReceiptManager({
  jobs,
  customers,
  currentUser,
  invoiceJobId,
  initialSubTab = 'INVOICE',
  onClearInvoiceJobId,
  onUpdateJob,
  onUpdateJobPayment,
  onDeleteJobPayment,
  paymentAuditLogs = []
}: InvoiceReceiptManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id || null);
  
  // Top level tabs: Invoice Workspace vs Saved Invoices Directory vs Receipt Workspace vs Payment Audit Log
  const [subTab, setSubTab] = useState<'INVOICE' | 'SAVED_INVOICES' | 'RECEIPT' | 'AUDIT_LOG'>('INVOICE');

  // Payment Audit Log Filters State
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<'ALL' | 'CREATED' | 'UPDATED' | 'DELETED'>('ALL');
  const [auditJobFilter, setAuditJobFilter] = useState<string>('ALL');

  // Saved Invoices Persistent State
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>(() => {
    const local = localStorage.getItem('swedswood_saved_invoices');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    let seeded = false;
    const unsub = subscribeToCollection<SavedInvoice>('savedInvoices', (items) => {
      if (items.length > 0) {
        setSavedInvoices(items);
        localStorage.setItem('swedswood_saved_invoices', JSON.stringify(items));
      } else if (!seeded) {
        seeded = true;
        let localItems: SavedInvoice[] = [];
        try {
          const raw = localStorage.getItem('swedswood_saved_invoices');
          if (raw) localItems = JSON.parse(raw);
        } catch (e) {}
        if (localItems && localItems.length > 0) {
          setSavedInvoices(localItems);
          saveBatchDocuments('savedInvoices', localItems);
        }
      }
    });
    return () => unsub();
  }, []);

  const [editingSavedInvoiceId, setEditingSavedInvoiceId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<SavedInvoice['status']>('Issued');

  // Directory filter & search
  const [savedInvoiceSearch, setSavedInvoiceSearch] = useState('');
  const [savedInvoiceStatusFilter, setSavedInvoiceStatusFilter] = useState<'ALL' | SavedInvoice['status']>('ALL');
  const [deleteConfirmInvoiceId, setDeleteConfirmInvoiceId] = useState<string | null>(null);

  // Sync savedInvoices to localStorage
  useEffect(() => {
    localStorage.setItem('swedswood_saved_invoices', JSON.stringify(savedInvoices));
  }, [savedInvoices]);

  // ==========================================
  // INTELLISENSE SEARCH ENGINE FOR INVOICES & RECEIPTS
  // ==========================================
  const [intelliQuery, setIntelliQuery] = useState('');
  const [showIntelliDropdown, setShowIntelliDropdown] = useState(false);
  const [focusedIntelliIndex, setFocusedIntelliIndex] = useState(0);
  const intelliSenseRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (intelliSenseRef.current && !intelliSenseRef.current.contains(e.target as Node)) {
        setShowIntelliDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalReceiptsCount = jobs.reduce((acc, j) => acc + (j.payments ? j.payments.length : 0), 0);

  const getIntelliSuggestions = (query: string): IntelliSenseResult[] => {
    if (!query || query.trim().length === 0) return [];
    const q = query.trim().toLowerCase();
    const results: IntelliSenseResult[] = [];

    // 1. Scan Saved Invoices
    savedInvoices.forEach(inv => {
      const matchesNo = inv.invoiceNo.toLowerCase().includes(q);
      const matchesCust = inv.customerName.toLowerCase().includes(q) || (inv.customerPhone && inv.customerPhone.toLowerCase().includes(q)) || (inv.customerEmail && inv.customerEmail.toLowerCase().includes(q));
      const matchesItem = inv.items.some(it => it.description.toLowerCase().includes(q));
      const matchesStatus = inv.status.toLowerCase().includes(q);
      const matchesTotal = inv.subtotal.toString().includes(q);

      if (matchesNo || matchesCust || matchesItem || matchesStatus || matchesTotal) {
        let score = 0;
        if (inv.invoiceNo.toLowerCase() === q) score += 100;
        else if (inv.invoiceNo.toLowerCase().startsWith(q)) score += 80;
        else if (inv.customerName.toLowerCase().startsWith(q)) score += 70;
        else score += 40;

        const matchedLineItem = inv.items.find(it => it.description.toLowerCase().includes(q));

        results.push({
          id: inv.id,
          type: 'INVOICE',
          title: `Invoice ${inv.invoiceNo} — ${inv.customerName}`,
          subtitle: matchedLineItem ? `Line Item: ${matchedLineItem.description}` : `Date: ${inv.date} • Terms: ${inv.terms}`,
          details: `Le ${inv.subtotal.toLocaleString()} (${inv.status})`,
          badgeText: `INVOICE • ${inv.status.toUpperCase()}`,
          badgeColor: inv.status === 'Paid' ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-700' : 'bg-blue-900/90 text-blue-300 border border-blue-700',
          score,
          payload: {
            targetSubTab: 'SAVED_INVOICES',
            savedInvoice: inv
          }
        });
      }
    });

    // 2. Scan Woodwork Commission Orders / Draft Invoices
    jobs.forEach(job => {
      const matchesId = job.id.toLowerCase().includes(q);
      const matchesTitle = job.title.toLowerCase().includes(q);
      const matchesDesc = job.description.toLowerCase().includes(q);
      const matchesCust = job.customerName.toLowerCase().includes(q);
      const matchesQuote = job.quoteAmount.toString().includes(q);
      const matchedItem = job.items?.find(it => it.description.toLowerCase().includes(q));

      if (matchesId || matchesTitle || matchesDesc || matchesCust || matchesQuote || matchedItem) {
        let score = 0;
        if (job.id.toLowerCase() === q) score += 95;
        else if (job.title.toLowerCase().startsWith(q)) score += 75;
        else score += 35;

        results.push({
          id: job.id,
          type: matchedItem ? 'LINE_ITEM' : 'ORDER',
          title: matchedItem ? `Item: ${matchedItem.description}` : `Order ${job.id}: ${job.title}`,
          subtitle: `Client: ${job.customerName} • Status: ${job.status}`,
          details: `Quote: Le ${job.quoteAmount.toLocaleString()}`,
          badgeText: matchedItem ? 'LINE ITEM' : 'WOODWORK ORDER',
          badgeColor: matchedItem ? 'bg-purple-900/90 text-purple-300 border border-purple-700' : 'bg-amber-900/90 text-amber-300 border border-amber-700',
          score,
          payload: {
            targetSubTab: 'INVOICE',
            jobId: job.id
          }
        });
      }

      // 3. Scan Receipts / Clearance Payments
      if (job.payments && job.payments.length > 0) {
        job.payments.forEach(p => {
          const receiptNo = `REC-${job.id}-${p.id.toUpperCase()}`;
          const matchesRecNo = receiptNo.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
          const matchesMethod = p.method.toLowerCase().includes(q);
          const matchesRef = p.referenceId && p.referenceId.toLowerCase().includes(q);
          const matchesAmount = p.amount.toString().includes(q);
          const matchesDate = p.date.includes(q);
          const matchesJobCust = job.customerName.toLowerCase().includes(q) || job.title.toLowerCase().includes(q);

          if (matchesRecNo || matchesMethod || matchesRef || matchesAmount || matchesDate || matchesJobCust) {
            let score = 0;
            if (receiptNo.toLowerCase() === q) score += 100;
            else if (p.method.toLowerCase().startsWith(q)) score += 60;
            else score += 30;

            results.push({
              id: `${job.id}-${p.id}`,
              type: 'RECEIPT',
              title: `Clearance Receipt ${receiptNo}`,
              subtitle: `Client: ${job.customerName} • Method: ${p.method} ${p.referenceId ? `(${p.referenceId})` : ''}`,
              details: `Le ${p.amount.toLocaleString()} on ${p.date}`,
              badgeText: 'RECEIPT',
              badgeColor: 'bg-emerald-900/90 text-emerald-300 border border-emerald-700',
              score,
              payload: {
                targetSubTab: 'RECEIPT',
                jobId: job.id,
                receipt: { job, payment: p }
              }
            });
          }
        });
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  };

  const intelliSuggestions = getIntelliSuggestions(intelliQuery);

  const handleSelectIntelliSuggestion = (item: IntelliSenseResult) => {
    const { targetSubTab, jobId, savedInvoice, receipt } = item.payload;

    if (targetSubTab === 'SAVED_INVOICES' && savedInvoice) {
      setSubTab('SAVED_INVOICES');
      setSavedInvoiceSearch(savedInvoice.invoiceNo);
      handleLoadSavedInvoice(savedInvoice);
      setSaveToast(`Loaded Invoice ${savedInvoice.invoiceNo}`);
      setTimeout(() => setSaveToast(null), 3000);
    } else if (targetSubTab === 'RECEIPT' && receipt) {
      setSubTab('RECEIPT');
      if (receipt.job.id) setSelectedJobId(receipt.job.id);
      setActiveReceipt(receipt);
      setSaveToast(`Loaded Receipt REC-${receipt.payment.id.toUpperCase()}`);
      setTimeout(() => setSaveToast(null), 3000);
    } else if (targetSubTab === 'INVOICE' && jobId) {
      setSubTab('INVOICE');
      setSelectedJobId(jobId);
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        setActiveInvoice(job);
        setSaveToast(`Loaded Order ${job.id}`);
        setTimeout(() => setSaveToast(null), 3000);
      }
    }

    setShowIntelliDropdown(false);
  };

  const handleIntelliKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showIntelliDropdown || intelliSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIntelliIndex(prev => (prev + 1) % intelliSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIntelliIndex(prev => (prev - 1 + intelliSuggestions.length) % intelliSuggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = intelliSuggestions[focusedIntelliIndex];
      if (item) {
        handleSelectIntelliSuggestion(item);
      }
    } else if (e.key === 'Escape') {
      setShowIntelliDropdown(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim() || !text) return text;
    const q = query.trim();
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-amber-300 text-slate-950 font-black px-0.5 rounded shadow-2xs">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Template format selection: 'SWEDS_WOOD' (scanned paper style) or 'MODERN' (original template)
  const [invoiceTemplate, setInvoiceTemplate] = useState<'SWEDS_WOOD' | 'MODERN'>('SWEDS_WOOD');
  const [invoiceCustomerMessage, setInvoiceCustomerMessage] = useState<string>("");

  // Custom states for Invoice customization prior to print
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(15); // Sierra Leone GST is 15%
  
  // Active documents being viewed in "PDF Form"
  const [activeInvoice, setActiveInvoice] = useState<Job | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<{ job: Job; payment: JobPayment } | null>(null);

  // Bulk PDF Export States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedBulkJobIds, setSelectedBulkJobIds] = useState<string[]>([]);
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  const [bulkTemplate, setBulkTemplate] = useState<'SWEDS_WOOD' | 'MODERN'>('SWEDS_WOOD');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // PDF Preview Modes: 'VIEW' (A4 mockup) or 'EDIT' (Interactive inputs)
  const [invoicePdfMode, setInvoicePdfMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [receiptPdfMode, setReceiptPdfMode] = useState<'VIEW' | 'EDIT'>('VIEW');

  // ==========================================
  // INLINE EDITABLE STATES - INVOICE PDF
  // ==========================================
  const [invoiceLogoUrl, setInvoiceLogoUrl] = useState<string>('/logo.svg');
  const [invoiceLogoSize, setInvoiceLogoSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [invoiceCompany, setInvoiceCompany] = useState("SWEDS WOOD ENTERPRISE");
  const [invoiceCompanyContact, setInvoiceCompanyContact] = useState("Corporate Carpentry, Woodwork, Timber Logistics & Design.\nFreetown Workshop & Site Installations.\nSierra Leone Office: 2 Sweds free Avenue, Sussex Freetown Sierra Leone.\nContact: info@swedwoodwork.com | +232 76 112 3344");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceTerms, setInvoiceTerms] = useState("Payment Clear / Standard Log");
  const [invoiceCustomerName, setInvoiceCustomerName] = useState("");
  const [invoiceCustomerCompany, setInvoiceCustomerCompany] = useState("");
  const [invoiceCustomerPhone, setInvoiceCustomerPhone] = useState("");
  const [invoiceCustomerEmail, setInvoiceCustomerEmail] = useState("");
  const [invoiceCustomerAddress, setInvoiceCustomerAddress] = useState("");
  const [invoiceProjectTitle, setInvoiceProjectTitle] = useState("");
  const [invoiceProjectDescription, setInvoiceProjectDescription] = useState("");
  const [invoiceTimeline, setInvoiceTimeline] = useState("");
  const [invoiceCommissionAmount, setInvoiceCommissionAmount] = useState<number>(0);
  const [invoiceBankInstructions, setInvoiceBankInstructions] = useState("");
  const [invoicePreparedBy, setInvoicePreparedBy] = useState("");

  // Custom line items in the invoice besides the main flat commission
  const [customInvoiceItems, setCustomInvoiceItems] = useState<CustomInvoiceItem[]>([]);
  const [newCustomItemDesc, setNewCustomItemDesc] = useState("");
  const [newCustomItemQty, setNewCustomItemQty] = useState<number | string>(1);
  const [newCustomItemUnitPrice, setNewCustomItemUnitPrice] = useState<number | string>(0);
  const [invoiceProjectQty, setInvoiceProjectQty] = useState<number | string>(1);

  // ==========================================
  // 300x300 SIGNATURE & STAMP IMAGE STATES
  // ==========================================
  const [signatureImageUrl, setSignatureImageUrl] = useState<string>(() => {
    return localStorage.getItem('swedswood_signature_300') || DEFAULT_300X300_SIGNATURE;
  });
  const [stampImageUrl, setStampImageUrl] = useState<string>(() => {
    return localStorage.getItem('swedswood_stamp_300') || DEFAULT_300X300_STAMP;
  });
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [showStamp, setShowStamp] = useState<boolean>(true);

  // Helper to normalize any uploaded signature/stamp image file to exactly 300x300 pixels
  const handleImageUpload300 = (e: ChangeEvent<HTMLInputElement>, type: 'signature' | 'stamp') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 300, 300);
          
          const aspect = img.width / img.height;
          let drawW = 300;
          let drawH = 300;
          let offsetX = 0;
          let offsetY = 0;
          if (aspect > 1) {
            drawH = 300 / aspect;
            offsetY = (300 - drawH) / 2;
          } else {
            drawW = 300 * aspect;
            offsetX = (300 - drawW) / 2;
          }
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          const dataUrl = canvas.toDataURL('image/png');
          if (type === 'signature') {
            setSignatureImageUrl(dataUrl);
            localStorage.setItem('swedswood_signature_300', dataUrl);
          } else {
            setStampImageUrl(dataUrl);
            localStorage.setItem('swedswood_stamp_300', dataUrl);
          }
        }
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleReset300x300Images = () => {
    setSignatureImageUrl(DEFAULT_300X300_SIGNATURE);
    setStampImageUrl(DEFAULT_300X300_STAMP);
    localStorage.removeItem('swedswood_signature_300');
    localStorage.removeItem('swedswood_stamp_300');
  };

  // ==========================================
  // UPLOADED INVOICE / RECEIPT DOCUMENTS STATE
  // ==========================================
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem('swedswood_uploaded_docs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('swedswood_uploaded_docs', JSON.stringify(uploadedDocs));
    } catch (e) {
      console.error("Failed to store uploaded docs", e);
    }
  }, [uploadedDocs]);

  // Active document source in workspace modals: 'TEMPLATE' (Auto-Generated) or 'UPLOADED' (Custom Scan/PDF)
  const [activeDocSource, setActiveDocSource] = useState<'TEMPLATE' | 'UPLOADED'>('TEMPLATE');

  const handleUploadInvoiceOrReceipt = (e: ChangeEvent<HTMLInputElement>, docType: 'INVOICE' | 'RECEIPT', targetJobId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const fileType = file.type.includes('pdf') ? 'pdf' : 'image';
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

      const newDoc: UploadedDocumentItem = {
        id: `DOC-${Date.now()}`,
        jobId: targetJobId,
        docType,
        fileName: file.name,
        fileType,
        fileDataUrl: dataUrl,
        fileSize: fileSizeMb,
        uploadedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        notes: `Custom uploaded ${docType.toLowerCase()} document scan for printout`
      };

      setUploadedDocs(prev => [newDoc, ...prev.filter(d => !(d.jobId === targetJobId && d.docType === docType))]);
      setActiveDocSource('UPLOADED');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUploadedDoc = (docId: string) => {
    setUploadedDocs(prev => prev.filter(d => d.id !== docId));
    setActiveDocSource('TEMPLATE');
  };

  const handlePrintUploadedDoc = (doc: UploadedDocumentItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to open the print view for this document.");
      return;
    }
    if (doc.fileType === 'image') {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print ${doc.docType} Scan - ${doc.fileName}</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #ffffff; font-family: sans-serif; }
              img { max-width: 100%; height: auto; max-height: 90vh; object-fit: contain; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px; }
              .header { margin-bottom: 12px; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
              @media print {
                body { padding: 0; background: #fff; }
                .header { display: none; }
                img { max-height: 100vh; width: 100%; box-shadow: none; border-radius: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header">SWEDSWOOD ENTERPRISE - OFFICIAL ${doc.docType} PRINTOUT</div>
            <img src="${doc.fileDataUrl}" onload="window.print();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print ${doc.docType} PDF - ${doc.fileName}</title>
            <style>
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${doc.fileDataUrl}"></iframe>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Helper to generate or view a 100% Full Payment Clearance Receipt
  const handleGenerateFullPaymentReceipt = (job: Job) => {
    const totalPaid = job.payments.reduce((sum, p) => sum + p.amount, 0);
    const fullAmount = job.quoteAmount || totalPaid || 0;
    
    let fullPaymentRecord: JobPayment;
    if (job.payments.length === 0 && fullAmount > 0) {
      fullPaymentRecord = {
        id: `FULL-CLEAR-${Date.now().toString().slice(-6)}`,
        amount: fullAmount,
        date: new Date().toISOString().split('T')[0],
        method: 'Bank Transfer',
        note: '100% FULL PAYMENT CONTRACT CLEARANCE'
      };
      
      const updatedJob: Job = {
        ...job,
        status: 'Completed',
        payments: [fullPaymentRecord]
      };
      
      if (onUpdateJob) {
        onUpdateJob(updatedJob);
      }
      saveDocument('jobs', updatedJob);
      
      setActiveReceipt({
        job: updatedJob,
        payment: fullPaymentRecord
      });
    } else {
      fullPaymentRecord = {
        id: `FULL-REC-${job.id.toUpperCase()}`,
        amount: Math.max(totalPaid, fullAmount),
        date: job.payments[job.payments.length - 1]?.date || new Date().toISOString().split('T')[0],
        method: job.payments[job.payments.length - 1]?.method || 'Bank Transfer',
        note: 'OFFICIAL 100% FULL PAYMENT CONTRACT CLEARANCE RECEIPT'
      };
      
      setActiveReceipt({
        job: job,
        payment: fullPaymentRecord
      });
    }
    setReceiptPdfMode('VIEW');
  };

  // ==========================================
  // INLINE EDITABLE STATES - RECEIPT PDF
  // ==========================================
  const [receiptCompany, setReceiptCompany] = useState("SWEDS WOOD ENTERPRISE");
  const [receiptCompanySub, setReceiptCompanySub] = useState("2 Sweds free Avenue, Sussex Freetown Sierra Leone • Official Commission Receipt");
  const [receiptNo, setReceiptNo] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [receiptCustomer, setReceiptCustomer] = useState("");
  const [receiptMethod, setReceiptMethod] = useState("");
  const [receiptProject, setReceiptProject] = useState("");
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptAcknowledge, setReceiptAcknowledge] = useState("");
  const [receiptReceivedBy, setReceiptReceivedBy] = useState("");

  // States for Quick Custom Payment Receipt Issuance
  const [customReceiptAmount, setCustomReceiptAmount] = useState<number>(1000);
  const [customReceiptMethod, setCustomReceiptMethod] = useState<'Cash' | 'Bank Transfer' | 'Check' | 'Mobile Money'>('Bank Transfer');
  const [customReceiptNote, setCustomReceiptNote] = useState<string>('Payment Clearance Installment');

  const handleIssueCustomReceipt = (
    job: Job,
    amount: number,
    method: 'Cash' | 'Bank Transfer' | 'Check' | 'Mobile Money',
    note: string
  ) => {
    if (amount <= 0) {
      alert("Please enter a valid payment amount greater than zero.");
      return;
    }
    const newPayment: JobPayment = {
      id: `REC-${Date.now().toString().slice(-6)}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      method: method,
      note: note || 'Payment Clearance Installment'
    };

    const updatedPayments = [...job.payments, newPayment];
    const totalPaid = updatedPayments.reduce((s, p) => s + p.amount, 0);
    const updatedJob: Job = {
      ...job,
      payments: updatedPayments,
      status: totalPaid >= job.quoteAmount ? 'Completed' : job.status
    };

    if (onUpdateJob) {
      onUpdateJob(updatedJob);
    }
    saveDocument('jobs', updatedJob);

    setActiveReceipt({
      job: updatedJob,
      payment: newPayment
    });
    setReceiptPdfMode('VIEW');
    setSaveToast(`Receipt ${newPayment.id} Issued & Cleared Successfully!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Edit and Delete payment installment states and handlers
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPaymentItem, setEditingPaymentItem] = useState<{ payment: JobPayment; job: Job } | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Mobile Money' | 'Check'>('Cash');
  const [editPaymentDate, setEditPaymentDate] = useState<string>('');
  const [editPaymentNote, setEditPaymentNote] = useState<string>('');
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{ payment: JobPayment; job: Job } | null>(null);

  const handleOpenEditPaymentModal = (item: { payment: JobPayment; job: Job }) => {
    setEditingPaymentItem(item);
    setEditPaymentAmount(item.payment.amount);
    setEditPaymentMethod(item.payment.method as any);
    setEditPaymentDate(item.payment.date || new Date().toISOString().split('T')[0]);
    setEditPaymentNote(item.payment.note || '');
    setEditPaymentError(null);
    setShowEditPaymentModal(true);
  };

  const handleUpdatePaymentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingPaymentItem) return;

    if (editPaymentAmount <= 0) {
      setEditPaymentError('Payment amount must be greater than 0');
      return;
    }

    const updatedPayment: JobPayment = {
      ...editingPaymentItem.payment,
      amount: editPaymentAmount,
      method: editPaymentMethod as any,
      date: editPaymentDate,
      note: editPaymentNote
    };

    if (onUpdateJobPayment) {
      onUpdateJobPayment(editingPaymentItem.job.id, updatedPayment);
    }
    if (onUpdateJob) {
      const currentJob = jobs.find(j => j.id === editingPaymentItem.job.id) || editingPaymentItem.job;
      const updatedPayments = currentJob.payments.map(p => p.id === editingPaymentItem.payment.id ? updatedPayment : p);
      onUpdateJob({ ...currentJob, payments: updatedPayments });
    }

    if (activeReceipt && activeReceipt.payment.id === updatedPayment.id) {
      setActiveReceipt(prev => prev ? { ...prev, payment: updatedPayment } : null);
    }

    setShowEditPaymentModal(false);
    setEditingPaymentItem(null);
    setEditPaymentError(null);
    setSaveToast(`Payment installment #${updatedPayment.id} updated successfully!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleConfirmDeletePayment = () => {
    if (!paymentToDelete) return;
    const { payment, job } = paymentToDelete;

    if (onDeleteJobPayment) {
      onDeleteJobPayment(job.id, payment.id);
    }
    if (onUpdateJob) {
      const currentJob = jobs.find(j => j.id === job.id) || job;
      const updatedPayments = currentJob.payments.filter(p => p.id !== payment.id);
      onUpdateJob({ ...currentJob, payments: updatedPayments });
    }

    if (activeReceipt && activeReceipt.payment.id === payment.id) {
      setActiveReceipt(null);
    }

    setPaymentToDelete(null);
    setSaveToast(`Payment installment #${payment.id} deleted successfully.`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Sync to outer invoice / receipt creation request (e.g. from Jobs tracker)
  useEffect(() => {
    if (invoiceJobId) {
      setSelectedJobId(invoiceJobId);
      const job = jobs.find(j => j.id === invoiceJobId);
      if (job) {
        if (initialSubTab === 'RECEIPT') {
          setSubTab('RECEIPT');
          if (job.payments.length > 0) {
            setActiveReceipt({ job, payment: job.payments[job.payments.length - 1] });
            setReceiptPdfMode('VIEW');
          } else {
            handleGenerateFullPaymentReceipt(job);
          }
        } else {
          setSubTab('INVOICE');
          setActiveInvoice(job);
          setInvoicePdfMode('VIEW');
        }
      } else if (initialSubTab) {
        setSubTab(initialSubTab);
      }
      if (onClearInvoiceJobId) {
        onClearInvoiceJobId();
      }
    } else if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [invoiceJobId, jobs, initialSubTab, onClearInvoiceJobId]);

  // Sync Invoice local editable states when an activeInvoice is selected/opened
  useEffect(() => {
    if (activeInvoice && !editingSavedInvoiceId) {
      if (invoiceTemplate === 'SWEDS_WOOD') {
        setInvoiceCompany("Sweds Wood Enterprise");
        setInvoiceCompanyContact("2 Sweds free Avenue");
        setInvoiceTerms("");
        setInvoiceBankInstructions("");
        setInvoiceCustomerMessage("Please examine all dimensions on delivery. Thank you for choosing Sweds Wood Enterprise!");
      } else {
        setInvoiceCompany("SWEDS WOOD ENTERPRISE");
        setInvoiceCompanyContact("Corporate Carpentry, Woodwork, Timber Logistics & Design.\nFreetown Workshop & Site Installations.\nSierra Leone Office: 2 Sweds free Avenue, Sussex Freetown Sierra Leone.\nContact: info@swedwoodwork.com | +232 76 112 3344");
        setInvoiceTerms("Payment Clear / Standard Log");
        setInvoiceBankInstructions(`Standard bank wires are accepted at Sierra Leone Commercial Bank (SLCB) Freetown.\nSwift Address: SLCBSLFRXXX • Account: 003-09415-2831\nPlease specify invoice reference: INV-${activeInvoice.id.slice(4).toUpperCase()}`);
        setInvoiceCustomerMessage("");
      }
      setInvoiceNo(`INV-${activeInvoice.id.slice(4).toUpperCase()}`);
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setInvoiceCustomerName(activeInvoice.customerName);
      
      const cust = customers.find(c => c.id === activeInvoice.customerId);
      setInvoiceCustomerCompany(cust?.company || "");
      setInvoiceCustomerPhone(cust?.phone || "");
      setInvoiceCustomerEmail(cust?.email || "");
      setInvoiceCustomerAddress(cust?.address || "");
      
      setInvoiceProjectTitle(activeInvoice.title);
      setInvoiceProjectDescription(activeInvoice.description || 'Custom hand-crafted carpentry order.');
      setInvoiceTimeline(`${activeInvoice.startDate} to ${activeInvoice.dueDate}`);
      setInvoiceProjectQty(activeInvoice.quantity || 1);

      if (activeInvoice.items && activeInvoice.items.length > 0) {
        setCustomInvoiceItems(activeInvoice.items.map((it, idx) => {
          const q = it.quantity || 1;
          const uCost = it.unitCost || 0;
          return {
            id: it.id || `item-${idx + 1}`,
            description: it.description,
            unitRate: String(q),
            amount: it.totalCost || (q * uCost),
            quantity: q,
            unitPrice: uCost
          };
        }));
        setInvoiceCommissionAmount(0);
      } else {
        setInvoiceCommissionAmount(activeInvoice.quoteAmount || 0);
        if (customInvoiceItems.length === 0) {
          setCustomInvoiceItems([]);
        }
      }
      
      setInvoicePreparedBy("");
    }
  }, [activeInvoice, editingSavedInvoiceId, customers, currentUser, invoiceTemplate]);

  // Sync Receipt local editable states when an activeReceipt is selected/opened
  useEffect(() => {
    if (activeReceipt) {
      setReceiptCompany("SWEDS WOOD ENTERPRISE");
      setReceiptCompanySub("2 Sweds free Avenue, Sussex Freetown Sierra Leone • Official Commission Receipt");
      setReceiptNo(`REC-${activeReceipt.payment.id.toUpperCase()}`);
      setReceiptDate(activeReceipt.payment.date);
      setReceiptCustomer(activeReceipt.job.customerName);
      setReceiptMethod(activeReceipt.payment.method);
      setReceiptProject(activeReceipt.job.title);
      setReceiptAmount(activeReceipt.payment.amount);
      setReceiptAcknowledge(`We hereby acknowledge receipt of the payment value. This clearance constitutes official receipt of funds towards the specified bespoke carpentry or fine timber woodwork commission order.`);
      setReceiptReceivedBy(currentUser?.name || 'Cashier');
    }
  }, [activeReceipt, currentUser]);

  // Filter jobs based on search term
  const filteredJobs = jobs.filter(j => {
    const cust = customers.find(c => c.id === j.customerId);
    const searchString = `${j.title} ${j.customerName} ${cust?.company || ''} ${j.id}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0] || null;
  const selectedCustomer = selectedJob ? customers.find(c => c.id === selectedJob.customerId) : null;

  // Automatically keep activeInvoice in sync with selectedJob and jobs state updates
  useEffect(() => {
    if (selectedJob) {
      setActiveInvoice(selectedJob);
    }
  }, [selectedJobId, selectedJob]);

  // Automatically keep saved invoices in sync with jobs & customer updates
  useEffect(() => {
    setSavedInvoices(prev => {
      let updated = false;
      const next = prev.map(inv => {
        const matchingJob = jobs.find(j => j.id === inv.jobId);
        if (!matchingJob) return inv;
        const cust = customers.find(c => c.id === matchingJob.customerId);

        const newCustomerName = matchingJob.customerName;
        const newPhone = cust?.phone || inv.customerPhone;
        const newEmail = cust?.email || inv.customerEmail;
        const newAddress = cust?.address || inv.customerAddress;

        if (
          inv.customerName !== newCustomerName ||
          (newPhone && inv.customerPhone !== newPhone) ||
          (newEmail && inv.customerEmail !== newEmail) ||
          (newAddress && inv.customerAddress !== newAddress)
        ) {
          updated = true;
          return {
            ...inv,
            customerName: newCustomerName,
            customerPhone: newPhone || inv.customerPhone,
            customerEmail: newEmail || inv.customerEmail,
            customerAddress: newAddress || inv.customerAddress,
            lastUpdated: new Date().toISOString()
          };
        }
        return inv;
      });
      return updated ? next : prev;
    });
  }, [jobs, customers]);

  // Add a custom line item inside the invoice preview with Total = Qty * Price
  const handleAddCustomItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newCustomItemDesc.trim()) return;
    const qty = Math.max(1, parseFloat(String(newCustomItemQty)) || 1);
    const price = Math.max(0, parseFloat(String(newCustomItemUnitPrice)) || 0);
    const totalAmount = qty * price;

    const newItem: CustomInvoiceItem = {
      id: `line-${Date.now()}`,
      description: newCustomItemDesc,
      quantity: qty,
      unitPrice: price,
      amount: totalAmount,
      unitRate: `${qty}`
    };
    setCustomInvoiceItems(prev => [...prev, newItem]);
    setNewCustomItemDesc("");
    setNewCustomItemQty(1);
    setNewCustomItemUnitPrice(0);
  };

  const handleUpdateCustomItem = (id: string, field: 'description' | 'quantity' | 'unitPrice' | 'amount', value: string | number) => {
    setCustomInvoiceItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const currentQty = item.quantity !== undefined ? item.quantity : (parseFloat(item.unitRate) || 1);
      const currentPrice = item.unitPrice !== undefined ? item.unitPrice : item.amount;
      
      if (field === 'description') {
        return { ...item, description: String(value) };
      } else if (field === 'quantity') {
        const valStr = String(value);
        if (valStr === '') {
          return { ...item, quantity: 0, unitRate: '0', amount: 0 };
        }
        const newQty = Math.max(0, parseFloat(valStr) || 0);
        const newAmount = newQty * currentPrice;
        return { ...item, quantity: newQty, unitRate: String(newQty), amount: newAmount };
      } else if (field === 'unitPrice') {
        const valStr = String(value);
        if (valStr === '') {
          return { ...item, unitPrice: 0, amount: 0 };
        }
        const newPrice = Math.max(0, parseFloat(valStr) || 0);
        const newAmount = currentQty * newPrice;
        return { ...item, unitPrice: newPrice, amount: newAmount };
      } else if (field === 'amount') {
        const valStr = String(value);
        if (valStr === '') {
          return { ...item, amount: 0, unitPrice: 0 };
        }
        const newAmount = Math.max(0, parseFloat(valStr) || 0);
        const q = currentQty || 1;
        const newPrice = q > 0 ? newAmount / q : newAmount;
        return { ...item, amount: newAmount, unitPrice: newPrice };
      }
      return item;
    }));
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomInvoiceItems(prev => prev.filter(item => item.id !== id));
  };

  const handleLoadScannedSample = () => {
    setInvoiceTemplate('SWEDS_WOOD');
    setInvoiceNo("042");
    setInvoiceDate("7/13/2026");
    setInvoiceTerms("");
    setInvoiceCustomerName("Mr Kabba( P )");
    setInvoiceCustomerCompany("");
    setInvoiceCustomerPhone("");
    setInvoiceCustomerEmail("0");
    setInvoiceCustomerAddress("POTTY NEW ROAD");
    setInvoiceProjectTitle("Commission Woodwork Suite");
    setInvoiceProjectDescription("Three bespoke living & dining items as per contract specification.");
    setInvoiceTimeline("7/13/2026");
    setInvoiceCommissionAmount(0);
    setCustomInvoiceItems([
      { id: 'line-scanned-1', description: 'Kitchen drawers complete as per specification', quantity: 1, unitPrice: 65000, amount: 65000, unitRate: '1' },
      { id: 'line-scanned-2', description: 'Dinning room shelves complete as specified', quantity: 1, unitPrice: 25000, amount: 25000, unitRate: '1' },
      { id: 'line-scanned-3', description: 'Dinning table with 4chairs complete', quantity: 1, unitPrice: 12500, amount: 12500, unitRate: '1' }
    ]);
    setInvoiceCustomerMessage("");
  };

  // Live calculation of Invoice Totals
  const getCalculatedTotals = () => {
    // base commission amount
    const projQty = Math.max(0, parseFloat(String(invoiceProjectQty)) || 1);
    const baseComm = (Number(invoiceCommissionAmount) || 0) * projQty;
    // sum of extra custom items added (Total = Qty * Price)
    const baseCustom = customInvoiceItems.reduce((sum, item) => {
      const qty = item.quantity !== undefined ? item.quantity : (parseFloat(item.unitRate) || 1);
      const price = item.unitPrice !== undefined ? item.unitPrice : item.amount;
      return sum + (qty * price);
    }, 0);
    let subtotal = baseComm + baseCustom;
    if (subtotal === 0 && activeInvoice?.quoteAmount && activeInvoice.quoteAmount > 0) {
      subtotal = activeInvoice.quoteAmount;
    }
    
    const discountAmount = 0;
    const taxableAmount = subtotal;
    const taxAmount = (taxableAmount * taxPercent) / 100;
    const finalTotal = taxableAmount + taxAmount;
    
    const totalPaid = activeInvoice ? activeInvoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    const outstanding = Math.max(0, finalTotal - totalPaid);

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      finalTotal,
      totalPaid,
      outstanding
    };
  };

  const totals = getCalculatedTotals();

  const handlePrint = () => {
    window.print();
  };

  // ==========================================
  // INVOICE RECORD CRUD HANDLERS
  // ==========================================
  const handleSaveInvoiceRecord = (statusOverride?: SavedInvoice['status']) => {
    const currentStatus = statusOverride || invoiceStatus || 'Issued';
    const projQty = Math.max(0, parseFloat(String(invoiceProjectQty)) || 1);
    const unitPrice = invoiceCommissionAmount !== undefined ? invoiceCommissionAmount : (activeInvoice ? activeInvoice.quoteAmount : 0);

    let itemsToSave: SavedInvoiceItem[] = [];

    if (customInvoiceItems.length > 0) {
      itemsToSave = customInvoiceItems.map(item => {
        const qty = item.quantity !== undefined ? item.quantity : (parseFloat(item.unitRate) || 1);
        const price = item.unitPrice !== undefined ? item.unitPrice : item.amount;
        return {
          id: item.id,
          description: item.description,
          unitRate: String(qty),
          amount: qty * price,
          quantity: qty,
          unitPrice: price
        };
      });
      const projTitle = invoiceProjectTitle || (activeInvoice ? activeInvoice.title : 'Custom Woodwork Order');
      if (unitPrice > 0 && !customInvoiceItems.some(i => i.description.includes(projTitle))) {
        itemsToSave.unshift({
          id: 'proj-main',
          description: projTitle,
          unitRate: String(projQty),
          amount: projQty * unitPrice,
          quantity: projQty,
          unitPrice: unitPrice
        });
      }
    } else {
      itemsToSave = [{
        id: '1',
        description: invoiceProjectTitle || (activeInvoice ? activeInvoice.title : 'Custom Woodwork Order'),
        unitRate: String(projQty),
        amount: projQty * unitPrice,
        quantity: projQty,
        unitPrice: unitPrice
      }];
    }

    const subtotal = itemsToSave.reduce((sum, item) => sum + item.amount, 0);
    const recordId = editingSavedInvoiceId || `inv-${Date.now()}`;
    const targetJobId = activeInvoice ? activeInvoice.id : 'job-custom';

    const newRecord: SavedInvoice = {
      id: recordId,
      jobId: targetJobId,
      invoiceNo: invoiceNo || `INV-${Date.now().toString().slice(-4)}`,
      date: invoiceDate || new Date().toISOString().split('T')[0],
      terms: invoiceTerms || 'COD / Standard',
      customerName: invoiceCustomerName || (activeInvoice ? activeInvoice.customerName : 'Custom Customer'),
      customerAddress: invoiceCustomerAddress || '',
      customerPhone: invoiceCustomerPhone || '',
      customerEmail: invoiceCustomerEmail || '',
      customerMessage: invoiceCustomerMessage || 'Please examine all dimensions on delivery. Thank you for choosing Sweds Wood Enterprise!',
      preparedBy: invoicePreparedBy || currentUser?.name || 'Managing Director',
      template: invoiceTemplate,
      status: currentStatus,
      logoUrl: invoiceLogoUrl,
      items: itemsToSave,
      subtotal: subtotal,
      createdAt: editingSavedInvoiceId 
        ? (savedInvoices.find(s => s.id === editingSavedInvoiceId)?.createdAt || new Date().toISOString()) 
        : new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    setSavedInvoices(prev => {
      const idx = prev.findIndex(s => s.id === recordId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newRecord;
        return copy;
      }
      return [newRecord, ...prev];
    });

    saveDocument('savedInvoices', newRecord);

    if (activeInvoice && onUpdateJob) {
      onUpdateJob({
        ...activeInvoice,
        title: invoiceProjectTitle || activeInvoice.title,
        description: invoiceProjectDescription || activeInvoice.description,
        quoteAmount: invoiceCommissionAmount !== undefined ? invoiceCommissionAmount : activeInvoice.quoteAmount,
        customerName: invoiceCustomerName || activeInvoice.customerName
      });
    }

    setEditingSavedInvoiceId(recordId);
    setSaveToast(`Invoice #${newRecord.invoiceNo} saved & synced to job!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleImportJobMaterials = () => {
    if (!activeInvoice || !activeInvoice.materialsUsed || activeInvoice.materialsUsed.length === 0) {
      setSaveToast("No job materials found to import");
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }
    const importedItems: CustomInvoiceItem[] = activeInvoice.materialsUsed.map(m => ({
      id: `mat-${m.id}-${Date.now()}`,
      description: `Allocated Lumber / Material: ${m.name}`,
      quantity: m.quantity,
      unitRate: String(m.quantity),
      unitPrice: m.unitCost || 0,
      amount: m.totalCost || (m.quantity * (m.unitCost || 0))
    }));
    setCustomInvoiceItems(prev => [...prev, ...importedItems]);
    setSaveToast(`Imported ${importedItems.length} job materials to invoice line items!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleCreateNewBlankInvoice = () => {
    const blankJob: Job = {
      id: `job-custom-${Date.now()}`,
      customerId: 'c-custom',
      customerName: 'New Client',
      title: 'Bespoke Carpentry & Furniture Commission',
      description: 'Custom woodwork order and installation',
      assignedEmployees: [],
      status: 'In Progress',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      quoteAmount: 0,
      materialsUsed: [],
      laborCost: 0,
      otherCosts: 0,
      payments: []
    };
    
    setActiveInvoice(blankJob);
    setInvoiceNo(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceTerms("COD / Payment Clear");
    setInvoiceCustomerName("");
    setInvoiceCustomerAddress("");
    setInvoiceCustomerPhone("");
    setInvoiceCustomerEmail("");
    setInvoiceCustomerMessage("Please examine all dimensions on delivery. Thank you for choosing Sweds Wood Enterprise!");
    setInvoicePreparedBy(currentUser?.name || 'Managing Director');
    setInvoiceCommissionAmount(0);
    setCustomInvoiceItems([
      { id: '1', description: 'Handcrafted Mahogany Dining Table with Carved Finish', unitRate: '1 Set', amount: 15000 },
      { id: '2', description: 'Delivery & Site Installation Fee (Freetown Workshop)', unitRate: 'Flat', amount: 1200 }
    ]);
    setEditingSavedInvoiceId(null);
    setInvoiceStatus('Draft');
    setInvoiceLogoUrl('/logo.svg');
    setSubTab('INVOICE');
    setInvoicePdfMode('EDIT');
  };

  const handleInvoiceLogoFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setInvoiceLogoUrl(event.target.result as string);
          setSaveToast('Invoice logo updated from image upload!');
          setTimeout(() => setSaveToast(null), 2500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadSavedInvoice = (saved: SavedInvoice) => {
    const job: Job = jobs.find(j => j.id === saved.jobId) || {
      id: saved.jobId,
      customerId: 'c-custom',
      customerName: saved.customerName,
      title: saved.items[0]?.description || 'Custom Woodwork Order',
      description: saved.customerMessage,
      assignedEmployees: [],
      status: 'In Progress',
      startDate: saved.date,
      dueDate: saved.date,
      quoteAmount: saved.subtotal,
      materialsUsed: [],
      laborCost: 0,
      otherCosts: 0,
      payments: []
    };

    setEditingSavedInvoiceId(saved.id);
    setActiveInvoice(job);
    setInvoiceNo(saved.invoiceNo);
    setInvoiceDate(saved.date);
    setInvoiceTerms(saved.terms);
    setInvoiceCustomerName(saved.customerName);
    setInvoiceCustomerAddress(saved.customerAddress);
    setInvoiceCustomerPhone(saved.customerPhone);
    setInvoiceCustomerEmail(saved.customerEmail);
    setInvoiceCustomerMessage(saved.customerMessage);
    setInvoicePreparedBy(saved.preparedBy);
    setInvoiceTemplate(saved.template);
    setInvoiceLogoUrl(saved.logoUrl || '/logo.svg');
    setCustomInvoiceItems(saved.items || []);
    setInvoiceCommissionAmount(0);
    setInvoiceProjectQty(1);
    setInvoiceProjectTitle(saved.items[0]?.description || 'Custom Woodwork Order');
    setInvoiceStatus(saved.status);
    setSubTab('INVOICE');
    setInvoicePdfMode('VIEW');
  };

  const handleDownloadSavedInvoicePdf = async (inv: SavedInvoice) => {
    const job: Job = jobs.find(j => j.id === inv.jobId) || {
      id: inv.jobId,
      customerId: 'c-custom',
      customerName: inv.customerName,
      title: inv.items[0]?.description || 'Custom Woodwork Order',
      description: inv.customerMessage,
      assignedEmployees: [],
      status: 'In Progress',
      startDate: inv.date,
      dueDate: inv.date,
      quoteAmount: inv.subtotal,
      materialsUsed: [],
      laborCost: 0,
      otherCosts: 0,
      payments: []
    };
    const logoDataUrl = await getLogoDataUrl(inv.logoUrl || '/logo.svg');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    const customer = customers.find(c => c.id === job.customerId) || {
      id: 'c-custom',
      name: inv.customerName,
      phone: inv.customerPhone,
      email: inv.customerEmail,
      address: inv.customerAddress,
      company: '',
      notes: '',
      registrationDate: inv.date
    };
    buildInvoicePdfContent(
      doc,
      job,
      customer,
      inv.template || 'SWEDS_WOOD',
      currentUser,
      inv.items,
      inv.invoiceNo,
      inv.date,
      inv.customerName,
      inv.customerAddress,
      inv.customerPhone,
      inv.customerEmail,
      inv.customerMessage,
      inv.items[0]?.description || 'Custom Woodwork Order',
      inv.customerMessage,
      0,
      1,
      logoDataUrl
    );
    const cleanName = (inv.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Invoice_${inv.invoiceNo || '042'}_${cleanName}.pdf`);
  };

  const handleDeleteSavedInvoice = (id: string) => {
    setSavedInvoices(prev => {
      const filtered = prev.filter(inv => inv.id !== id);
      try {
        localStorage.setItem('swedswood_saved_invoices', JSON.stringify(filtered));
      } catch (e) {}
      return filtered;
    });
    deleteDocument('savedInvoices', id);
    if (editingSavedInvoiceId === id) {
      setEditingSavedInvoiceId(null);
    }
    setDeleteConfirmInvoiceId(null);
    setSaveToast('Invoice deleted from database.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleUpdateInvoiceStatus = (id: string, newStatus: SavedInvoice['status']) => {
    const inv = savedInvoices.find(s => s.id === id);
    if (inv) {
      const updated = { ...inv, status: newStatus, lastUpdated: new Date().toISOString() };
      saveDocument('savedInvoices', updated);
    }
    setSavedInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus, lastUpdated: new Date().toISOString() } : inv));
    if (editingSavedInvoiceId === id) {
      setInvoiceStatus(newStatus);
    }
    setSaveToast(`Invoice status updated to ${newStatus}`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleDownloadSinglePdf = async () => {
    if (!activeInvoice) return;
    const logoDataUrl = await getLogoDataUrl(invoiceLogoUrl);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    const customer = customers.find(c => c.id === activeInvoice.customerId);
    buildInvoicePdfContent(
      doc,
      activeInvoice,
      customer,
      invoiceTemplate,
      currentUser,
      customInvoiceItems,
      invoiceNo,
      invoiceDate,
      invoiceCustomerName,
      invoiceCustomerAddress,
      invoiceCustomerPhone,
      invoiceCustomerEmail,
      invoiceCustomerMessage,
      invoiceProjectTitle,
      invoiceProjectDescription,
      invoiceCommissionAmount,
      invoiceProjectQty,
      logoDataUrl
    );
    const cleanName = (invoiceCustomerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Invoice_${invoiceNo || '042'}_${cleanName}.pdf`);
  };

  const handleDownloadSingleReceiptPdf = async () => {
    if (!activeReceipt) return;
    const logoDataUrl = await getLogoDataUrl(invoiceLogoUrl);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    const customer = customers.find(c => c.id === activeReceipt.job.customerId);
    buildReceiptPdfContent(
      doc,
      activeReceipt.job,
      activeReceipt.payment,
      customer,
      customInvoiceItems,
      receiptNo,
      receiptDate,
      receiptCustomer,
      receiptMethod,
      receiptProject,
      receiptAmount,
      receiptAcknowledge,
      receiptCompany,
      receiptCompanySub,
      logoDataUrl
    );
    const cleanCust = (receiptCustomer || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Receipt_${receiptNo || activeReceipt.payment.id}_${cleanCust}.pdf`);
  };

  const handleBulkPdfExport = async () => {
    if (selectedBulkJobIds.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const zip = new JSZip();
      const selectedJobs = jobs.filter(job => selectedBulkJobIds.includes(job.id));
      const logoDataUrl = await getLogoDataUrl(invoiceLogoUrl);
      
      let count = 0;
      for (const job of selectedJobs) {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const customer = customers.find(c => c.id === job.customerId);
        
        buildInvoicePdfContent(
          doc,
          job,
          customer,
          bulkTemplate,
          currentUser,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          logoDataUrl
        );
        
        const pdfArrayBuffer = doc.output('arraybuffer');
        
        const cleanCustomerName = job.customerName.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanJobTitle = job.title.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Invoice_INV-${job.id.slice(4).toUpperCase()}_${cleanCustomerName}_${cleanJobTitle}.pdf`;
        
        zip.file(filename, pdfArrayBuffer);
        
        count++;
        setExportProgress(Math.round((count / selectedJobs.length) * 100));
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SwedsWood_Bulk_Invoices_${bulkTemplate === 'SWEDS_WOOD' ? 'PaperStyle' : 'Modern'}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsBulkModalOpen(false);
      setSelectedBulkJobIds([]);
    } catch (error) {
      console.error("Bulk export failed:", error);
      alert("Something went wrong during bulk PDF export. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Print styles override (Ensures print-area prints all pages cleanly on white paper with crisp dark text) */}
      <style>{`
        @media print {
          /* Hide non-print elements completely from document flow */
          aside,
          nav,
          header:not(.print-header),
          footer:not(.print-footer),
          .no-print,
          .print\\:hidden,
          *[class*="print:hidden"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          html, body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #root, #root > div, main {
            display: block !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          /* Ensure modal backdrop wrapper does not create blank space or overlays */
          div[class*="fixed"][class*="inset-0"] {
            position: static !important;
            display: block !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
          }

          #print-area {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          #print-area input,
          #print-area textarea,
          #print-area select {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            outline: none !important;
            color: #000000 !important;
            font-weight: bold !important;
            appearance: none !important;
            -webkit-appearance: none !important;
            resize: none !important;
            width: auto !important;
            max-width: 100% !important;
          }

          .print-only,
          .print-only-inline {
            display: inline !important;
            visibility: visible !important;
          }
          .print-only-block {
            display: block !important;
            visibility: visible !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Section Header with SubTab buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-wood-100 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <img src={invoiceLogoUrl || '/logo.svg'} alt="Swedswood Enterprise Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-xl font-display font-black text-wood-900 tracking-tight flex items-center gap-2">
              Swedswood Enterprise Billing Desk
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage, update, save, print and delete official invoices and clearance receipts in high-fidelity PDF layouts.
            </p>
          </div>
        </div>

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {saveToast && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 border border-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{saveToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sub-tab Switcher: Invoices vs Saved Invoices vs Receipts & Bulk Export */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setSubTab('INVOICE')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                subTab === 'INVOICE' 
                  ? 'bg-white text-wood-950 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Invoice Workspace</span>
            </button>

            <button
              onClick={() => setSubTab('SAVED_INVOICES')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                subTab === 'SAVED_INVOICES' 
                  ? 'bg-white text-wood-950 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <FolderArchive className="w-4 h-4 text-blue-600" />
              <span>Saved Invoices</span>
              {savedInvoices.length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full ml-0.5">
                  {savedInvoices.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab('RECEIPT')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                subTab === 'RECEIPT' 
                  ? 'bg-white text-emerald-950 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Receipt Desk</span>
            </button>

            <button
              onClick={() => setSubTab('AUDIT_LOG')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                subTab === 'AUDIT_LOG' 
                  ? 'bg-white text-purple-950 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Payment Audit Log</span>
              {(paymentAuditLogs || []).length > 0 && (
                <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-black rounded-full ml-0.5">
                  {(paymentAuditLogs || []).length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedBulkJobIds(jobs.map(j => j.id));
              setBulkTemplate(invoiceTemplate);
              setIsBulkModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-wood-950 hover:bg-wood-900 text-white rounded-xl text-xs font-black uppercase transition shadow-xs cursor-pointer"
          >
            <FolderArchive className="w-4 h-4 text-amber-500" />
            <span>Bulk PDF Export</span>
          </button>
        </div>
      </div>

      {/* INTELLISENSE AUTO-SUGGEST SEARCH BAR */}
      <div className="bg-gradient-to-r from-wood-950 via-slate-900 to-wood-900 p-4 sm:p-5 rounded-2xl shadow-md border border-amber-500/30 text-white relative no-print space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse text-amber-400" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black font-display uppercase tracking-wider text-amber-400 flex items-center gap-2">
                IntelliSense Billing & Clearance Search Engine
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                Type any invoice #, clearance receipt #, client name, woodwork line item, or payment reference for auto-complete suggestions.
              </p>
            </div>
          </div>

          {/* Quick stats pill */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 shrink-0 self-start md:self-auto">
            <span className="text-amber-400 font-mono font-black">{savedInvoices.length}</span> Saved Invoices • 
            <span className="text-emerald-400 font-mono font-black">{totalReceiptsCount}</span> Clearance Receipts • 
            <span className="text-blue-400 font-mono font-black">{jobs.length}</span> Active Orders
          </div>
        </div>

        {/* Smart Search Input with Floating Auto-Suggest Dropdown */}
        <div className="relative z-30" ref={intelliSenseRef}>
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-amber-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice # (e.g. INV-2026-004), receipt # (e.g. REC-JOB-2026-001), client (e.g. Shalomville), item (e.g. Teak), or amount..."
              value={intelliQuery}
              onChange={(e) => {
                const val = e.target.value;
                setIntelliQuery(val);
                setSavedInvoiceSearch(val);
                setSearchTerm(val);
                setShowIntelliDropdown(true);
                setFocusedIntelliIndex(0);
              }}
              onFocus={() => setShowIntelliDropdown(true)}
              onKeyDown={handleIntelliKeyDown}
              className="w-full pl-12 pr-28 py-3 text-xs sm:text-sm bg-slate-900/90 text-white placeholder-slate-400 border-2 border-amber-500/40 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/20 font-medium transition-all shadow-inner"
            />
            
            {intelliQuery && (
              <button
                onClick={() => {
                  setIntelliQuery('');
                  setSavedInvoiceSearch('');
                  setSearchTerm('');
                  setShowIntelliDropdown(false);
                }}
                className="absolute right-20 p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Clear Search Query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="absolute right-3 px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-extrabold uppercase font-mono border border-amber-500/30 shrink-0">
              IntelliSense
            </div>
          </div>

          {/* IntelliSense Auto-Suggest Floating Dropdown */}
          <AnimatePresence>
            {showIntelliDropdown && intelliQuery.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute left-0 right-0 top-full mt-2 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-amber-500/30 overflow-hidden z-50 divide-y divide-slate-800/80 max-h-[420px] overflow-y-auto"
              >
                {intelliSuggestions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs space-y-1">
                    <Search className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-bold text-slate-300">No matching billing or receipt records for "{intelliQuery}"</p>
                    <p className="text-[11px] text-slate-500">
                      Try searching by client name (e.g. Shalomville), invoice number (e.g. INV-2026-004), or wood item (e.g. Mahogany).
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-slate-950/80 text-[10px] font-black uppercase tracking-wider text-amber-400 flex justify-between items-center">
                      <span>IntelliSense Suggestions ({intelliSuggestions.length} matches found)</span>
                      <span className="text-slate-400 font-normal hidden sm:inline">Use ↑↓ arrows to navigate, Enter to select</span>
                    </div>
                    
                    <div className="divide-y divide-slate-800/60">
                      {intelliSuggestions.map((item, idx) => {
                        const isFocused = idx === focusedIntelliIndex;
                        return (
                          <button
                            key={`${item.type}-${item.id}-${idx}`}
                            onClick={() => handleSelectIntelliSuggestion(item)}
                            onMouseEnter={() => setFocusedIntelliIndex(idx)}
                            className={`w-full text-left px-4 py-3 transition flex items-center justify-between gap-3 cursor-pointer ${
                              isFocused ? 'bg-amber-500/20 text-white border-l-4 border-amber-400' : 'hover:bg-slate-800/60 text-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 font-mono mt-0.5 ${item.badgeColor}`}>
                                {item.badgeText}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate text-slate-100">
                                  {highlightMatch(item.title, intelliQuery)}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                  <span>{highlightMatch(item.subtitle, intelliQuery)}</span>
                                  {item.details && (
                                    <span className="text-slate-500 font-mono text-[10px]">• {highlightMatch(item.details, intelliQuery)}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 text-amber-400 text-xs font-bold">
                              <span className="hidden sm:inline text-[10px] text-slate-400 font-normal">Load Record</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick IntelliSense Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-amber-400/80 font-black uppercase tracking-wider mr-1">Suggested Searches:</span>
          {[
            { label: 'INV-2026-004', query: 'INV-2026-004' },
            { label: 'REC-JOB-2026-004', query: 'REC-JOB-2026-004' },
            { label: 'Shalomville', query: 'Shalomville' },
            { label: 'Sierra Leone Teak', query: 'Teak' },
            { label: 'Red Mahogany', query: 'Mahogany' },
            { label: 'Bank Transfer', query: 'Bank Transfer' },
            { label: 'Paid Invoices', query: 'Paid' },
            { label: 'Issued Invoices', query: 'Issued' },
          ].map(chip => (
            <button
              key={chip.label}
              onClick={() => {
                setIntelliQuery(chip.query);
                setSavedInvoiceSearch(chip.query);
                setSearchTerm(chip.query);
                setShowIntelliDropdown(true);
              }}
              className="px-2.5 py-1 text-[10px] font-bold bg-slate-900/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 rounded-lg border border-white/10 hover:border-amber-500/40 transition cursor-pointer flex items-center gap-1"
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
         SAVED INVOICES DIRECTORY & MANAGER TAB
         ========================================== */}
      {subTab === 'SAVED_INVOICES' && (
        <div className="space-y-6 no-print">
          {/* Metric Cards Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Total Saved Invoices</span>
                <p className="text-2xl font-black text-wood-950 mt-1 font-mono">{savedInvoices.length}</p>
              </div>
              <div className="p-3 bg-wood-50 text-wood-700 rounded-xl">
                <FolderArchive className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Outstanding Unpaid</span>
                <p className="text-2xl font-black text-amber-600 mt-1 font-mono">
                  Le {savedInvoices.filter(i => i.status === 'Issued' || i.status === 'Overdue' || i.status === 'Draft').reduce((s, i) => s + i.subtotal, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Total Cleared Revenue</span>
                <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  Le {savedInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.subtotal, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Active Draft Invoices</span>
                <p className="text-2xl font-black text-blue-600 mt-1 font-mono">
                  {savedInvoices.filter(i => i.status === 'Draft').length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Tag className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Directory Filter & Search Control Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search invoice #, customer, line item..."
                  value={savedInvoiceSearch}
                  onChange={(e) => setSavedInvoiceSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-hidden focus:bg-white font-medium"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                {(['ALL', 'Draft', 'Issued', 'Paid', 'Overdue', 'Cancelled'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setSavedInvoiceStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                      savedInvoiceStatusFilter === st
                        ? 'bg-white text-wood-950 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateNewBlankInvoice}
              className="px-4 py-2 bg-wood-950 hover:bg-wood-900 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Create Blank Custom Invoice</span>
            </button>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            {savedInvoices.filter(inv => {
              const query = savedInvoiceSearch.toLowerCase();
              const matchesSearch = !query || 
                inv.invoiceNo.toLowerCase().includes(query) ||
                inv.customerName.toLowerCase().includes(query) ||
                inv.customerPhone.toLowerCase().includes(query) ||
                inv.items.some(it => it.description.toLowerCase().includes(query));
              const matchesStatus = savedInvoiceStatusFilter === 'ALL' || inv.status === savedInvoiceStatusFilter;
              return matchesSearch && matchesStatus;
            }).length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FolderArchive className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="text-sm font-bold text-gray-800">No Saved Invoices Found</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Save invoices from the Invoice Workspace or click below to draft a brand new invoice from scratch.
                </p>
                <button
                  onClick={handleCreateNewBlankInvoice}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-wood-950 text-white rounded-xl text-xs font-bold hover:bg-wood-900 transition"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Create New Invoice Now</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase font-black tracking-wider text-gray-400">
                    <tr>
                      <th className="py-3.5 px-4">Invoice # & Date</th>
                      <th className="py-3.5 px-4">Customer Details</th>
                      <th className="py-3.5 px-4">Line Items Summary</th>
                      <th className="py-3.5 px-4 text-right">Subtotal Amount</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {savedInvoices.filter(inv => {
                      const query = savedInvoiceSearch.toLowerCase();
                      const matchesSearch = !query || 
                        inv.invoiceNo.toLowerCase().includes(query) ||
                        inv.customerName.toLowerCase().includes(query) ||
                        inv.customerPhone.toLowerCase().includes(query) ||
                        inv.items.some(it => it.description.toLowerCase().includes(query));
                      const matchesStatus = savedInvoiceStatusFilter === 'ALL' || inv.status === savedInvoiceStatusFilter;
                      return matchesSearch && matchesStatus;
                    }).map(inv => {
                      const statusColors = {
                        Draft: 'bg-blue-50 text-blue-700 border-blue-200',
                        Issued: 'bg-amber-50 text-amber-700 border-amber-200',
                        Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        Overdue: 'bg-red-50 text-red-700 border-red-200',
                        Cancelled: 'bg-gray-100 text-gray-600 border-gray-200'
                      };

                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-black text-gray-900 text-sm">{inv.invoiceNo}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{inv.date} • {inv.terms}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-800">{inv.customerName}</div>
                            {inv.customerPhone && <div className="text-[10px] text-gray-400">{inv.customerPhone}</div>}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="truncate font-medium text-gray-700">
                              {inv.items.map(i => i.description).join(', ')}
                            </div>
                            <div className="text-[10px] text-gray-400">{inv.items.length} item(s) • Prepared by {inv.preparedBy}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-mono font-black text-gray-900 text-sm">SLL {inv.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <select
                              value={inv.status}
                              onChange={(e) => handleUpdateInvoiceStatus(inv.id, e.target.value as SavedInvoice['status'])}
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border cursor-pointer ${statusColors[inv.status] || statusColors.Draft}`}
                            >
                              <option value="Draft">Draft</option>
                              <option value="Issued">Issued</option>
                              <option value="Paid">Paid</option>
                              <option value="Overdue">Overdue</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleLoadSavedInvoice(inv)}
                                className="p-1.5 bg-gray-100 hover:bg-wood-950 hover:text-white text-gray-700 rounded-lg transition cursor-pointer"
                                title="View / Edit Invoice"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  handleLoadSavedInvoice(inv);
                                  setTimeout(() => window.print(), 200);
                                }}
                                className="p-1.5 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 rounded-lg transition cursor-pointer"
                                title="Print Invoice"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDownloadSavedInvoicePdf(inv)}
                                className="p-1.5 bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-700 rounded-lg transition cursor-pointer"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmInvoiceId(inv.id)}
                                className="p-1.5 bg-gray-100 hover:bg-red-600 hover:text-white text-gray-700 rounded-lg transition cursor-pointer"
                                title="Delete Invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirmInvoiceId && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl w-fit">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Confirm Invoice Deletion</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Are you sure you want to delete this saved invoice? This action will permanently remove it from your system database.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDeleteConfirmInvoiceId(null)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteSavedInvoice(deleteConfirmInvoiceId)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                  >
                    Yes, Delete Record
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
         PAYMENT INSTALLMENT HISTORY AUDIT LOG TAB
         ========================================== */}
      {subTab === 'AUDIT_LOG' && (
        <div className="space-y-6 no-print">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 rounded-2xl border border-purple-500/30 text-white shadow-lg space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3 text-purple-400" /> Read-Only Audit History
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tamper-Evident Logs
                  </span>
                </div>
                <h3 className="text-xl font-display font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-purple-400" />
                  Installment Payment Modification Audit Log
                </h3>
                <p className="text-xs text-purple-200/80 max-w-2xl mt-1 leading-relaxed">
                  A transparent, read-only audit log recording every creation, update, and removal of customer installment payments across all custom woodwork orders.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 bg-purple-900/40 p-3 rounded-xl border border-purple-500/30">
                <ShieldCheck className="w-8 h-8 text-purple-400" />
                <div>
                  <span className="text-[10px] text-purple-300 uppercase font-bold block">Security Status</span>
                  <span className="text-xs font-black text-white font-mono">VERIFIED IMMUTABLE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Total Audit Records</span>
                <p className="text-2xl font-black text-wood-950 mt-1 font-mono">{(paymentAuditLogs || []).length}</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Created Payments</span>
                <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  {(paymentAuditLogs || []).filter(l => l.action === 'CREATED').length}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <PlusCircle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Modified / Updated</span>
                <p className="text-2xl font-black text-amber-600 mt-1 font-mono">
                  {(paymentAuditLogs || []).filter(l => l.action === 'UPDATED').length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Edit2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Removed / Deleted</span>
                <p className="text-2xl font-black text-red-600 mt-1 font-mono">
                  {(paymentAuditLogs || []).filter(l => l.action === 'DELETED').length}
                </p>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search order, customer, payment ID, or modifier..."
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-purple-500 focus:bg-white"
                />
                {auditSearchTerm && (
                  <button onClick={() => setAuditSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] uppercase text-gray-400">Action:</span>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value as any)}
                    className="bg-transparent font-bold text-xs outline-none cursor-pointer text-gray-800"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="CREATED">Created Only</option>
                    <option value="UPDATED">Updated Only</option>
                    <option value="DELETED">Deleted Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] uppercase text-gray-400">Order:</span>
                  <select
                    value={auditJobFilter}
                    onChange={(e) => setAuditJobFilter(e.target.value)}
                    className="bg-transparent font-bold text-xs outline-none cursor-pointer text-gray-800 max-w-[160px] truncate"
                  >
                    <option value="ALL">All Orders</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>

                {(auditSearchTerm || auditActionFilter !== 'ALL' || auditJobFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setAuditSearchTerm('');
                      setAuditActionFilter('ALL');
                      setAuditJobFilter('ALL');
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  Immutable Audit Records
                </h4>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Read-Only • Sorted Newest First
              </span>
            </div>

            {(() => {
              const filteredLogs = (paymentAuditLogs || []).filter(log => {
                const matchesSearch = 
                  !auditSearchTerm ||
                  log.jobTitle.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                  log.customerName.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                  log.paymentId.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                  log.modifiedBy.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                  (log.note && log.note.toLowerCase().includes(auditSearchTerm.toLowerCase()));

                const matchesAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;
                const matchesJob = auditJobFilter === 'ALL' || log.jobId === auditJobFilter;

                return matchesSearch && matchesAction && matchesJob;
              });

              if (filteredLogs.length === 0) {
                return (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-gray-800">No Payment Audit Logs Match Your Filters</p>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      Try clearing search queries or action filters. Payment changes are automatically recorded whenever installment payments are created, updated, or removed.
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Order / Customer</th>
                        <th className="py-3 px-4">Payment Delta & Details</th>
                        <th className="py-3 px-4">Modified By</th>
                        <th className="py-3 px-4 text-right">Log Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {filteredLogs.map((log) => {
                        const formattedDate = new Date(log.timestamp).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <tr key={log.id} className="hover:bg-purple-50/20 transition-colors">
                            {/* Date & Time */}
                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              <div className="font-mono font-bold text-gray-800 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span>{formattedDate}</span>
                              </div>
                              <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                                Log ID: {log.id}
                              </span>
                            </td>

                            {/* Action Badge */}
                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              {log.action === 'CREATED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-extrabold text-[10px] uppercase">
                                  <PlusCircle className="w-3 h-3 text-emerald-600" /> CREATED
                                </span>
                              )}
                              {log.action === 'UPDATED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-extrabold text-[10px] uppercase">
                                  <Edit2 className="w-3 h-3 text-amber-600" /> MODIFIED
                                </span>
                              )}
                              {log.action === 'DELETED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded-md font-extrabold text-[10px] uppercase">
                                  <Trash2 className="w-3 h-3 text-red-600" /> REMOVED
                                </span>
                              )}
                            </td>

                            {/* Order / Customer */}
                            <td className="py-3.5 px-4 align-top max-w-[220px]">
                              <p className="font-extrabold text-wood-950 truncate" title={log.jobTitle}>
                                {log.jobTitle}
                              </p>
                              <p className="text-[11px] text-gray-500 font-medium truncate">
                                {log.customerName}
                              </p>
                              <span className="inline-block mt-1 text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {log.paymentId}
                              </span>
                            </td>

                            {/* Payment Delta & Details */}
                            <td className="py-3.5 px-4 align-top">
                              {log.action === 'CREATED' && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-emerald-700 text-sm">
                                      {formatCurrency(log.amount, 0)}
                                    </span>
                                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded uppercase">
                                      {log.method}
                                    </span>
                                    <span className="text-[11px] font-mono text-gray-500">
                                      ({log.date})
                                    </span>
                                  </div>
                                  {log.note && (
                                    <p className="text-[11px] text-gray-600 italic">
                                      &quot;{log.note}&quot;
                                    </p>
                                  )}
                                </div>
                              )}

                              {log.action === 'UPDATED' && (
                                <div className="space-y-1">
                                  {log.previousAmount !== undefined && log.previousAmount !== log.amount ? (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <span className="text-[11px] font-bold text-gray-400 uppercase">Amount:</span>
                                      <span className="line-through font-mono text-red-500 font-bold">{formatCurrency(log.previousAmount, 0)}</span>
                                      <span className="text-gray-400">&rarr;</span>
                                      <span className="font-mono font-black text-emerald-700">{formatCurrency(log.amount, 0)}</span>
                                    </div>
                                  ) : (
                                    <div className="font-mono font-bold text-gray-800 text-xs">
                                      Amount: {formatCurrency(log.amount, 0)}
                                    </div>
                                  )}

                                  {log.previousMethod && log.previousMethod !== log.method && (
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-bold text-gray-400 uppercase text-[10px]">Method:</span>
                                      <span className="line-through text-red-400">{log.previousMethod}</span>
                                      <span className="text-gray-400">&rarr;</span>
                                      <span className="font-bold text-emerald-700">{log.method}</span>
                                    </div>
                                  )}

                                  {log.previousDate && log.previousDate !== log.date && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                                      <span className="font-bold text-gray-400 uppercase text-[10px]">Date:</span>
                                      <span className="line-through text-gray-400">{log.previousDate}</span>
                                      <span className="text-gray-400">&rarr;</span>
                                      <span className="font-bold text-gray-800">{log.date}</span>
                                    </div>
                                  )}

                                  {log.note && (
                                    <p className="text-[11px] text-gray-600 italic">
                                      &quot;{log.note}&quot;
                                    </p>
                                  )}
                                </div>
                              )}

                              {log.action === 'DELETED' && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-red-600 line-through text-xs">
                                      {formatCurrency(log.amount, 0)}
                                    </span>
                                    <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[10px] font-extrabold rounded uppercase">
                                      {log.method}
                                    </span>
                                    <span className="text-[11px] font-mono text-gray-400">
                                      ({log.date})
                                    </span>
                                  </div>
                                  {log.note && (
                                    <p className="text-[11px] text-red-600/80 italic">
                                      Removed: &quot;{log.note}&quot;
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Modified By */}
                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              <span className="font-bold text-gray-800 block">
                                {log.modifiedBy}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium block">
                                Authorized User
                              </span>
                            </td>

                            {/* Log Verification */}
                            <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-200 uppercase">
                                <Lock className="w-3 h-3 text-purple-500" /> Read-Only
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==========================================
         INVOICE WORKSPACE & RECEIPT DESK
         ========================================== */}
      {(subTab === 'INVOICE' || subTab === 'RECEIPT') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        
        {/* Left Column: Commission Orders Selector */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-wood-100 shadow-xs flex flex-col h-[650px] overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block mb-2">
              Select Woodwork Commission Order
            </span>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search order or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 focus:border-wood-300 focus:bg-white rounded-xl outline-hidden font-medium text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs font-medium">
                No orders match your query.
              </div>
            ) : (
              filteredJobs.map(job => {
                const isActive = selectedJobId === job.id;
                const totalPaid = job.payments.reduce((sum, p) => sum + p.amount, 0);
                const outstanding = job.quoteAmount - totalPaid;

                return (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedJobId(job.id);
                    }}
                    className={`w-full text-left p-4 hover:bg-wood-50/10 transition flex flex-col gap-1.5 ${
                      isActive ? 'bg-wood-50/50 border-r-4 border-wood-600 font-bold' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 w-full">
                      <h4 className="text-xs font-bold text-gray-800 truncate max-w-[160px]">{job.title}</h4>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                        outstanding <= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {outstanding <= 0 ? 'Cleared' : 'Due'}
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-gray-400 font-bold">Client: {job.customerName}</p>
                    
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-gray-400">
                      <span>Price: {formatCurrency(job.quoteAmount, 0)}</span>
                      <span className="font-sans text-gray-500 font-bold">Paid: {formatCurrency(totalPaid, 0)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Work Desk for Selected Order */}
        <div className="lg:col-span-2 space-y-6">
          {selectedJob ? (
            <div className="space-y-6">
              
              {/* Order Info Profile Card */}
              <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 items-center">
                    <div className="p-2.5 bg-wood-950 text-white rounded-xl">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[8px] font-black uppercase text-wood-600 tracking-widest">Active Production Commission</span>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">{selectedJob.title}</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Order ID: {selectedJob.id}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[8px] font-bold uppercase text-gray-400">Quote Valuation</span>
                    <p className="text-base font-bold text-wood-900 font-mono">{formatCurrency(selectedJob.quoteAmount, 0)}</p>
                  </div>
                </div>

                {/* Profile Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xs">
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 font-extrabold uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-wood-600" /> Client Information
                    </span>
                    <p className="font-bold text-gray-800">{selectedJob.customerName}</p>
                    {selectedCustomer?.company && (
                      <p className="text-[11px] font-semibold text-wood-700 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {selectedCustomer.company}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 font-medium">Deliver Address: {selectedCustomer?.address || 'N/A'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 font-extrabold uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-wood-600" /> Timeline Status
                    </span>
                    <p className="text-[11px] text-gray-600">Issued On: <strong className="font-mono text-gray-800">{selectedJob.startDate}</strong></p>
                    <p className="text-[11px] text-gray-600">Expected Delivery: <strong className="font-mono text-gray-800">{selectedJob.dueDate}</strong></p>
                    <p className="text-[11px] text-gray-600">Workshop State: <strong className="uppercase text-wood-800">{selectedJob.status}</strong></p>
                  </div>
                </div>
              </div>

              {/* Conditional Panels depending on INVOICE or RECEIPT Sub-tab */}
              {subTab === 'INVOICE' ? (
                /* INVOICE SPACE PANEL */
                <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-wood-600" /> Invoice Document Workspace
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Synced to Job
                      </span>
                      <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 font-bold uppercase px-2 py-0.5 rounded-md">
                        Drafting Mode
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Set applicable sales tax values. Once configured, you can generate, print, or save the beautiful custom invoice in an official PDF layout.
                  </p>

                  <div className="pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5 text-wood-600" /> GST / Sales Tax (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-xs font-bold text-gray-700"
                      />
                    </div>
                  </div>

                  {/* Invoice Header Logo Customizer */}
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                        Official Company Logo (Invoices & Receipts)
                      </span>
                      {invoiceLogoUrl !== '/logo.svg' && (
                        <button
                          type="button"
                          onClick={() => setInvoiceLogoUrl('/logo.svg')}
                          className="text-[10px] text-amber-700 underline hover:text-amber-900 font-bold cursor-pointer"
                        >
                          Reset to Sun Logo
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-white border border-amber-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <img src={invoiceLogoUrl || '/logo.svg'} alt="Invoice Logo Preview" className="w-full h-full object-contain" />
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <label className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs shrink-0">
                            <Upload className="w-3 h-3" />
                            <span>Upload Image</span>
                            <input type="file" accept="image/*" onChange={handleInvoiceLogoFileUpload} className="hidden" />
                          </label>
                          
                          <input
                            type="text"
                            value={invoiceLogoUrl}
                            onChange={(e) => setInvoiceLogoUrl(e.target.value)}
                            placeholder="/logo.svg or data:image..."
                            className="w-full px-2 py-1 text-xs bg-white border border-amber-200 rounded-lg outline-hidden font-mono text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setActiveInvoice(selectedJob);
                        setActiveDocSource('TEMPLATE');
                        setInvoicePdfMode('VIEW');
                      }}
                      className="w-full py-3 px-4 bg-wood-950 hover:bg-wood-900 text-white font-black rounded-xl text-xs uppercase flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Generate & Open PDF Invoice Desk</span>
                    </button>
                  </div>

                  {/* Dedicated Upload External Invoice Document Box */}
                  {(() => {
                    const existingUploadedInvoice = uploadedDocs.find(d => d.jobId === selectedJob.id && d.docType === 'INVOICE');
                    return (
                      <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-amber-400" />
                            <span className="font-display font-black text-xs uppercase tracking-wider text-amber-200">
                              Upload Custom Invoice Scan (Printout)
                            </span>
                          </div>
                          {existingUploadedInvoice && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold text-[10px] rounded-md uppercase">
                              Scan Ready
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300 leading-snug">
                          Already have a scanned paper invoice or physical file? Upload image/PDF to preview and print directly for <strong className="text-white">{selectedJob.customerName}</strong>.
                        </p>

                        {existingUploadedInvoice ? (
                          <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {existingUploadedInvoice.fileType === 'image' ? (
                                <img src={existingUploadedInvoice.fileDataUrl} alt="Uploaded Invoice Scan" className="w-10 h-10 object-cover rounded border border-slate-600 shrink-0" />
                              ) : (
                                <div className="w-10 h-10 bg-amber-900/60 text-amber-300 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                  PDF
                                </div>
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-xs font-bold text-white truncate">{existingUploadedInvoice.fileName}</p>
                                <p className="text-[10px] text-slate-400">{existingUploadedInvoice.fileSize} &bull; Uploaded {existingUploadedInvoice.uploadedAt}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setActiveInvoice(selectedJob);
                                  setActiveDocSource('UPLOADED');
                                }}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview & Print</span>
                              </button>
                              <button
                                onClick={() => handlePrintUploadedDoc(existingUploadedInvoice)}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-[11px] uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                                title="Instant 1-Click Print"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveUploadedDoc(existingUploadedInvoice.id)}
                                className="p-1.5 text-slate-400 hover:text-red-400 transition cursor-pointer"
                                title="Remove Scan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-700 hover:border-amber-500/80 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 cursor-pointer transition text-center group">
                            <Upload className="w-5 h-5 text-amber-400 group-hover:scale-110 transition mb-1" />
                            <span className="text-xs font-bold text-slate-200">Click or Drag & Drop Custom Invoice File</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, WEBP, or PDF scans</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleUploadInvoiceOrReceipt(e, 'INVOICE', selectedJob.id)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* RECEIPT SPACE PANEL */
                <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" /> Logged Payments & Full Clearance Receipt Desk
                    </h4>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 font-bold uppercase px-2 py-0.5 rounded-md">
                      {selectedJob.payments.length} Payments Cleared
                    </span>
                  </div>

                  {/* Dedicated Upload External Receipt Document Box */}
                  {(() => {
                    const existingUploadedReceipt = uploadedDocs.find(d => d.jobId === selectedJob.id && d.docType === 'RECEIPT');
                    return (
                      <div className="p-4 bg-emerald-950 text-white rounded-xl border border-emerald-800 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-emerald-300" />
                            <span className="font-display font-black text-xs uppercase tracking-wider text-emerald-200">
                              Upload Custom Receipt Scan (Printout)
                            </span>
                          </div>
                          {existingUploadedReceipt && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold text-[10px] rounded-md uppercase">
                              Receipt Ready
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-emerald-100/80 leading-snug">
                          Upload an official signed paper receipt or external clearance voucher (PNG, JPG, or PDF) to print directly for client <strong className="text-white">{selectedJob.customerName}</strong>.
                        </p>

                        {existingUploadedReceipt ? (
                          <div className="bg-emerald-900/80 p-3 rounded-lg border border-emerald-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {existingUploadedReceipt.fileType === 'image' ? (
                                <img src={existingUploadedReceipt.fileDataUrl} alt="Uploaded Receipt Scan" className="w-10 h-10 object-cover rounded border border-emerald-600 shrink-0" />
                              ) : (
                                <div className="w-10 h-10 bg-emerald-950 text-emerald-300 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                  PDF
                                </div>
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-xs font-bold text-white truncate">{existingUploadedReceipt.fileName}</p>
                                <p className="text-[10px] text-emerald-300/70">{existingUploadedReceipt.fileSize} &bull; Uploaded {existingUploadedReceipt.uploadedAt}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  if (selectedJob.payments.length > 0) {
                                    setActiveReceipt({ job: selectedJob, payment: selectedJob.payments[0] });
                                  } else {
                                    handleGenerateFullPaymentReceipt(selectedJob);
                                  }
                                  setActiveDocSource('UPLOADED');
                                }}
                                className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-[11px] uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview & Print</span>
                              </button>
                              <button
                                onClick={() => handlePrintUploadedDoc(existingUploadedReceipt)}
                                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                                title="Instant 1-Click Print"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveUploadedDoc(existingUploadedReceipt.id)}
                                className="p-1.5 text-emerald-300 hover:text-red-300 transition cursor-pointer"
                                title="Remove Scan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-emerald-700 hover:border-emerald-400 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/70 cursor-pointer transition text-center group">
                            <Upload className="w-5 h-5 text-emerald-300 group-hover:scale-110 transition mb-1" />
                            <span className="text-xs font-bold text-emerald-100">Click or Drag & Drop Custom Receipt File</span>
                            <span className="text-[10px] text-emerald-300/70 mt-0.5">Supports PNG, JPG, WEBP, or PDF scans</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleUploadInvoiceOrReceipt(e, 'RECEIPT', selectedJob.id)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })()}

                  {/* Quick Issue Custom Payment Receipt Form */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-emerald-600" /> Issue Custom Payment Receipt
                      </h5>
                      <span className="text-[10px] text-emerald-800 font-bold font-mono">
                        Outstanding Balance: {formatCurrency(Math.max(0, selectedJob.quoteAmount - selectedJob.payments.reduce((s, p) => s + p.amount, 0)), 0)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1">Amount (Le)</label>
                        <input
                          type="number"
                          min={1}
                          value={customReceiptAmount || ''}
                          onChange={(e) => setCustomReceiptAmount(Number(e.target.value))}
                          placeholder="e.g. 2500"
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-gray-800 outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1">Payment Method</label>
                        <select
                          value={customReceiptMethod}
                          onChange={(e) => setCustomReceiptMethod(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-gray-800 outline-none focus:border-emerald-500"
                        >
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="Mobile Money">Mobile Money</option>
                          <option value="Check">Check</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1">Receipt Note / Purpose</label>
                        <input
                          type="text"
                          placeholder="e.g. Deposit / Part Payment"
                          value={customReceiptNote}
                          onChange={(e) => setCustomReceiptNote(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-gray-800 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleIssueCustomReceipt(selectedJob, customReceiptAmount, customReceiptMethod, customReceiptNote);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4 text-emerald-200" />
                      <span>Issue & Open PDF Receipt ({formatCurrency(customReceiptAmount, 0)})</span>
                    </button>
                  </div>

                  {/* 100% Full Payment Clearance Action Box */}
                  <div className="p-4 bg-emerald-950 text-white rounded-xl border border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-display font-black text-xs uppercase tracking-wider text-emerald-200">
                          Full Payment Clearance Receipt
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-100/80 leading-snug">
                        Generate & print an official 100% payment clearance receipt for client <strong className="text-white">{selectedJob.customerName}</strong>.
                      </p>
                    </div>

                    <button
                      onClick={() => handleGenerateFullPaymentReceipt(selectedJob)}
                      className="shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs uppercase rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Issue 100% Full Payment Receipt</span>
                    </button>
                  </div>

                  {selectedJob.payments.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center text-xs text-gray-400 font-bold leading-relaxed">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      No individual payment installments logged yet for this woodwork order.<br />
                      <span className="text-[11px] font-normal text-gray-500 mt-1 block">
                        You can click "Issue 100% Full Payment Receipt" above to generate a full contract clearance receipt directly for this client.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                        Individual Installment Receipts:
                      </h5>
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                        {selectedJob.payments.map((p, index) => (
                          <div key={p.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-gray-50/80 transition">
                            <div className="space-y-1">
                              <p className="font-bold text-gray-800">Payment Order #{index + 1} - <span className="font-mono text-[10px] text-gray-400">{p.id}</span></p>
                              <p className="text-gray-400 font-semibold">Cleared Date: <span className="font-mono">{p.date}</span> &bull; Mode: <strong className="text-wood-700">{p.method}</strong></p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-emerald-700 mr-1">{formatCurrency(p.amount, 0)}</span>
                              <button
                                onClick={() => {
                                  setActiveReceipt({ job: selectedJob, payment: p });
                                  setReceiptPdfMode('VIEW');
                                }}
                                className="px-3 py-1.5 text-[10px] font-black uppercase text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition shadow-2xs cursor-pointer"
                                title="Open PDF Receipt"
                              >
                                Open PDF Receipt
                              </button>
                              {!isAuditor && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPaymentModal({ payment: p, job: selectedJob })}
                                  className="p-1.5 text-gray-500 hover:text-wood-800 hover:bg-wood-100/70 rounded-lg transition cursor-pointer border border-gray-200"
                                  title="Edit Payment Record"
                                  aria-label="Edit Payment Record"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!isAuditor && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentToDelete({ payment: p, job: selectedJob })}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer border border-gray-200"
                                  title="Delete Payment Record"
                                  aria-label="Delete Payment Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Order-Specific Installment Payment Modification Audit Trail */}
                  {(() => {
                    const jobLogs = (paymentAuditLogs || []).filter(l => l.jobId === selectedJob.id);
                    if (jobLogs.length === 0) return null;

                    return (
                      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                            Order Payment Audit Trail ({jobLogs.length} Records)
                          </h5>
                          <button
                            onClick={() => setSubTab('AUDIT_LOG')}
                            className="text-[10px] text-purple-700 hover:text-purple-900 font-extrabold uppercase underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open Full Audit Log</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="divide-y divide-purple-100 bg-white border border-purple-100 rounded-lg overflow-hidden">
                          {jobLogs.slice(0, 5).map(log => (
                            <div key={log.id} className="p-3 text-xs flex items-center justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  {log.action === 'CREATED' && (
                                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded uppercase">
                                      Created
                                    </span>
                                  )}
                                  {log.action === 'UPDATED' && (
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded uppercase">
                                      Modified
                                    </span>
                                  )}
                                  {log.action === 'DELETED' && (
                                    <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[9px] font-extrabold rounded uppercase">
                                      Removed
                                    </span>
                                  )}
                                  <span className="font-mono text-[10px] text-gray-500">
                                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-gray-800 font-medium text-[11px]">
                                  {log.action === 'CREATED' && `Added payment ${formatCurrency(log.amount, 0)} (${log.method})`}
                                  {log.action === 'UPDATED' && `Updated payment ${log.paymentId}: ${log.previousAmount !== undefined && log.previousAmount !== log.amount ? `${formatCurrency(log.previousAmount, 0)} → ${formatCurrency(log.amount, 0)}` : formatCurrency(log.amount, 0)}`}
                                  {log.action === 'DELETED' && `Removed payment ${log.paymentId} of ${formatCurrency(log.amount, 0)} (${log.method})`}
                                </p>
                              </div>
                              <span className="text-[10px] text-gray-500 font-bold shrink-0">
                                By {log.modifiedBy}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-wood-100 shadow-xs">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-sm">Please select a woodwork commission order on the left sidebar.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ==========================================
         PDF WORKSPACE MODAL: FULL INVOICE VIEW/EDIT
         ========================================== */}
      <AnimatePresence>
        {activeInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
            <div className="bg-slate-100 text-slate-800 rounded-2xl w-full max-w-4xl p-6 my-8 shadow-2xl relative print:my-0 print:shadow-none print:rounded-none print:bg-white print:p-0" id="print-area">
              
              {/* TOP WORKSPACE TOOLBAR (Hides on standard print) */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-200/60 no-print">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-wood-950 text-white rounded-lg">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-sm text-gray-900">PDF Invoice Workspace</h3>
                    <p className="text-[10px] text-gray-500">Draft, edit, and print official tax dossiers.</p>
                  </div>
                </div>

                {/* PDF VIEW / INTERACTIVE EDIT SWITCH */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-gray-200 p-0.5 rounded-lg border border-gray-300">
                    <button
                      onClick={() => setInvoicePdfMode('VIEW')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        invoicePdfMode === 'VIEW' 
                          ? 'bg-white text-wood-950 shadow-2xs' 
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>A4 PDF View</span>
                    </button>
                    <button
                      onClick={() => setInvoicePdfMode('EDIT')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        invoicePdfMode === 'EDIT' 
                          ? 'bg-white text-wood-950 shadow-2xs' 
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Content</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Status:</span>
                    <select
                      value={invoiceStatus}
                      onChange={(e) => {
                        const val = e.target.value as SavedInvoice['status'];
                        setInvoiceStatus(val);
                        if (editingSavedInvoiceId) {
                          handleUpdateInvoiceStatus(editingSavedInvoiceId, val);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-black rounded-lg border border-gray-300 bg-white text-gray-800 outline-hidden cursor-pointer"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Issued">Issued</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleSaveInvoiceRecord()}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Save or update this invoice in the local database"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingSavedInvoiceId ? 'Update Saved Invoice' : 'Save Invoice Record'}</span>
                  </button>

                  <button
                    onClick={handleDownloadSinglePdf}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF File</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-wood-950 hover:bg-wood-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Page</span>
                  </button>

                  <button
                    onClick={() => setActiveInvoice(null)}
                    className="px-3.5 py-2 border border-gray-300 text-gray-600 bg-white rounded-xl text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
                  >
                    Close Workspace
                  </button>
                </div>
              </div>

              {/* THE FLOATING PAPER (styled to look like an A4 page with high-contrast) */}
              {activeDocSource === 'UPLOADED' ? (
                <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 space-y-6">
                  {(() => {
                    const currentDoc = uploadedDocs.find(d => d.jobId === activeInvoice.id && d.docType === 'INVOICE');
                    if (currentDoc) {
                      return (
                        <div className="space-y-4">
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 no-print">
                            <div className="flex items-center gap-2">
                              <FileCheck className="w-5 h-5 text-amber-700" />
                              <div>
                                <h4 className="text-xs font-bold text-amber-950">
                                  Uploaded Invoice Scan: {currentDoc.fileName}
                                </h4>
                                <p className="text-[10px] text-amber-800">
                                  Size: {currentDoc.fileSize} &bull; Uploaded: {currentDoc.uploadedAt}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs">
                                <Upload className="w-3.5 h-3.5 text-amber-300" />
                                <span>Replace Document</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleUploadInvoiceOrReceipt(e, 'INVOICE', activeInvoice.id)}
                                  className="hidden"
                                />
                              </label>
                              <button
                                onClick={() => handlePrintUploadedDoc(currentDoc)}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Custom Document</span>
                              </button>
                              <button
                                onClick={() => handleRemoveUploadedDoc(currentDoc.id)}
                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>

                          {currentDoc.fileType === 'image' ? (
                            <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-xl border border-gray-200">
                              <img
                                src={currentDoc.fileDataUrl}
                                alt={`Uploaded Invoice Scan - ${currentDoc.fileName}`}
                                className="max-w-full max-h-[850px] object-contain rounded shadow-md print:shadow-none print:max-h-none print:w-full"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-[750px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
                              <iframe
                                src={currentDoc.fileDataUrl}
                                title="Uploaded Invoice PDF Scan Preview"
                                className="w-full h-full border-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-12 border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-2xl text-center space-y-4">
                          <Upload className="w-12 h-12 text-amber-600 mx-auto" />
                          <h3 className="text-sm font-black text-amber-950 uppercase">No Custom Invoice Document Uploaded Yet</h3>
                          <p className="text-xs text-amber-800/80 max-w-md mx-auto leading-relaxed">
                            Upload an existing paper invoice scan, PDF bill, or custom document to preview & print directly for client <strong className="text-amber-950">{activeInvoice.customerName}</strong>.
                          </p>
                          <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-black uppercase rounded-xl cursor-pointer transition shadow-md">
                            <Upload className="w-4 h-4 text-amber-300" />
                            <span>Upload Custom Invoice Scan (Image/PDF)</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleUploadInvoiceOrReceipt(e, 'INVOICE', activeInvoice.id)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      );
                    }
                  })()}
                </div>
              ) : (
              <div className={`p-8 sm:p-12 border border-gray-200 rounded-xl shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none ${invoiceTemplate === 'SWEDS_WOOD' ? 'sweds-paper-invoice bg-white' : 'bg-white'}`}>
                
                {invoiceTemplate === 'SWEDS_WOOD' ? (
                  /* ==========================================
                     SWEDS WOOD ENTERPRISE OFFICIAL PAPER PATTERN
                     ========================================== */
                  <div className="space-y-6 text-[#1e3a8a] font-sans antialiased">
                    {/* Logo Header Banner */}
                    <div className="flex flex-col md:flex-row md:items-stretch justify-between gap-6 pb-4 border-b-2 border-gray-300">
                      <div className="flex flex-col justify-between">
                        {/* Company Logo and Name */}
                        <div className="flex items-center gap-3">
                          <div className="relative group shrink-0">
                            <img src={invoiceLogoUrl || '/logo.svg'} alt="Swedswood Enterprise Official Logo" className="w-14 h-14 object-contain shrink-0" />
                            {invoicePdfMode === 'EDIT' && (
                              <label className="absolute -bottom-1 -right-1 bg-wood-950 text-white p-1 rounded-full text-[9px] cursor-pointer shadow-md hover:bg-amber-600 transition no-print" title="Click to replace logo image">
                                <Upload className="w-3 h-3 text-amber-400" />
                                <input type="file" accept="image/*" onChange={handleInvoiceLogoFileUpload} className="hidden" />
                              </label>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <h1 className="font-sans font-black text-2xl tracking-tight text-[#0f52ba] flex items-center gap-1.5 uppercase">
                              Sweds Wood Enterprise
                            </h1>
                            <div className="w-full h-[3px] bg-[#0f52ba] mt-0.5" />
                          </div>
                        </div>

                        {/* Small Metadata Table */}
                        <div className="mt-4 w-72 border border-gray-400 bg-white text-xs text-[#1e3a8a] rounded-xs shadow-xs overflow-hidden">
                          <table className="w-full border-collapse">
                            <tbody>
                              <tr className="border-b border-gray-300">
                                <td className="p-1.5 font-bold bg-[#e0f2fe] border-r border-gray-300 w-28 uppercase text-[10px]">Invoice No.</td>
                                <td className="p-1.5 font-mono font-bold text-gray-800">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="hidden print:inline font-mono font-bold">{invoiceNo}</span>
                                      <input
                                        type="text"
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                        className="w-full bg-amber-50 border border-amber-200 rounded px-1 text-xs outline-hidden font-bold print:hidden"
                                      />
                                    </>
                                  ) : (
                                    invoiceNo
                                  )}
                                </td>
                              </tr>
                              <tr className="border-b border-gray-300">
                                <td className="p-1.5 font-bold bg-[#e0f2fe] border-r border-gray-300 uppercase text-[10px]">Address</td>
                                <td className="p-1.5 text-gray-700 font-semibold">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="hidden print:inline font-semibold text-gray-700">{invoiceCompanyContact}</span>
                                      <input
                                        type="text"
                                        value={invoiceCompanyContact}
                                        onChange={(e) => setInvoiceCompanyContact(e.target.value)}
                                        className="w-full bg-amber-50 border border-amber-200 rounded px-1 text-xs outline-hidden print:hidden"
                                      />
                                    </>
                                  ) : (
                                    invoiceCompanyContact
                                  )}
                                </td>
                              </tr>
                              <tr className="border-b border-gray-300">
                                <td className="p-1.5 font-bold bg-[#e0f2fe] border-r border-gray-300 uppercase text-[10px]">Date</td>
                                <td className="p-1.5 font-mono text-gray-800">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="hidden print:inline font-mono">{invoiceDate}</span>
                                      <input
                                        type="text"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                        className="w-full bg-amber-50 border border-amber-200 rounded px-1 text-xs outline-hidden print:hidden"
                                      />
                                    </>
                                  ) : (
                                    invoiceDate
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td className="p-1.5 font-bold bg-[#e0f2fe] border-r border-gray-300 uppercase text-[10px]">Terms (days)</td>
                                <td className="p-1.5 text-gray-700 font-mono">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="hidden print:inline font-mono">{invoiceTerms}</span>
                                      <input
                                        type="text"
                                        value={invoiceTerms}
                                        onChange={(e) => setInvoiceTerms(e.target.value)}
                                        className="w-full bg-amber-50 border border-amber-200 rounded px-1 text-xs outline-hidden print:hidden"
                                      />
                                    </>
                                  ) : (
                                    invoiceTerms
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Blue INVOICE Badge */}
                      <div className="flex flex-col justify-start md:items-end">
                        <div className="bg-[#38bdf8] text-white py-4 px-12 rounded-xs border-2 border-[#0f52ba] text-center font-sans font-black text-3xl tracking-widest uppercase shadow-md md:w-64">
                          INVOICE
                        </div>
                      </div>
                    </div>

                    {/* "Invoice to:" Customer Information Box */}
                    <div className="space-y-1">
                      <span className="font-sans font-black text-xs uppercase text-[#0f52ba]">Invoice to:</span>
                      <div className="border border-gray-400 bg-white rounded-xs p-4 space-y-2 text-xs">
                        <div className="bg-[#e0f2fe] px-2 py-1 border-b border-gray-300 font-bold uppercase text-[10px] text-[#0f52ba] tracking-wider">
                          Customer Information
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-500 w-16 uppercase text-[9px]">Name:</span>
                            {invoicePdfMode === 'EDIT' ? (
                              <>
                                <span className="hidden print:inline font-bold text-gray-800">{invoiceCustomerName}</span>
                                <input
                                  type="text"
                                  value={invoiceCustomerName}
                                  onChange={(e) => setInvoiceCustomerName(e.target.value)}
                                  className="flex-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-xs outline-hidden font-bold text-gray-800 print:hidden"
                                />
                              </>
                            ) : (
                              <span className="font-bold text-gray-900">{invoiceCustomerName}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-500 w-16 uppercase text-[9px]">Mobile:</span>
                            {invoicePdfMode === 'EDIT' ? (
                              <>
                                <span className="hidden print:inline font-mono font-semibold">{invoiceCustomerPhone}</span>
                                <input
                                  type="text"
                                  value={invoiceCustomerPhone}
                                  onChange={(e) => setInvoiceCustomerPhone(e.target.value)}
                                  className="flex-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-xs outline-hidden font-mono print:hidden"
                                />
                              </>
                            ) : (
                              <span className="font-mono text-gray-800 font-semibold">{invoiceCustomerPhone || ''}</span>
                            )}
                          </div>

                          <div className="flex items-start gap-1.5 md:col-span-1">
                            <span className="font-bold text-gray-500 w-16 uppercase text-[9px] pt-0.5">Address:</span>
                            {invoicePdfMode === 'EDIT' ? (
                              <>
                                <span className="hidden print:inline font-semibold text-gray-700">{invoiceCustomerAddress}</span>
                                <input
                                  type="text"
                                  value={invoiceCustomerAddress}
                                  onChange={(e) => setInvoiceCustomerAddress(e.target.value)}
                                  className="flex-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-xs outline-hidden text-gray-700 font-semibold print:hidden"
                                />
                              </>
                            ) : (
                              <span className="text-gray-700 font-bold">{invoiceCustomerAddress}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-500 w-16 uppercase text-[9px]">Email:</span>
                            {invoicePdfMode === 'EDIT' ? (
                              <>
                                <span className="hidden print:inline font-semibold text-gray-600">{invoiceCustomerEmail}</span>
                                <input
                                  type="text"
                                  value={invoiceCustomerEmail}
                                  onChange={(e) => setInvoiceCustomerEmail(e.target.value)}
                                  className="flex-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-xs outline-hidden text-gray-600 print:hidden"
                                />
                              </>
                            ) : (
                              <span className="text-gray-600 font-semibold">{invoiceCustomerEmail}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ledger Style Items Table */}
                    <div className="overflow-hidden border border-gray-400 bg-white rounded-xs">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-gray-400 text-black font-black uppercase text-[10px] tracking-wider">
                            <th className="py-2 px-3 border-r border-gray-400 text-left w-7/12 font-black text-black">Description</th>
                            <th className="py-2 px-3 border-r border-gray-400 text-center w-1/12 font-black text-black bg-slate-200">Qty</th>
                            <th className="py-2 px-3 border-r border-gray-400 text-right w-2/12 font-black text-black">Price</th>
                            <th className="py-2 px-3 text-right w-2/12 font-black text-black">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {/* Main Flat Commission (if > 0) */}
                          {Number(invoiceCommissionAmount) > 0 && (
                            <tr className="min-h-[36px]">
                              <td className="py-2 px-3 border-r border-gray-400 font-semibold text-gray-800">
                                {invoicePdfMode === 'EDIT' ? (
                                  <>
                                    <div className="hidden print:block space-y-0.5">
                                      <p className="font-bold text-gray-800">{invoiceProjectTitle}</p>
                                      <p className="text-[10px] text-gray-500 font-normal italic">{invoiceProjectDescription}</p>
                                    </div>
                                    <div className="space-y-1 print:hidden">
                                      <input
                                        type="text"
                                        value={invoiceProjectTitle}
                                        onChange={(e) => setInvoiceProjectTitle(e.target.value)}
                                        className="w-full font-bold text-gray-800 border border-blue-300 rounded px-1.5 py-0.5 text-xs bg-white"
                                        placeholder="Project Title"
                                      />
                                      <input
                                        type="text"
                                        value={invoiceProjectDescription}
                                        onChange={(e) => setInvoiceProjectDescription(e.target.value)}
                                        className="w-full text-[10px] text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 bg-white"
                                        placeholder="Project Details"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-bold text-gray-800">{invoiceProjectTitle}</p>
                                    <span className="block text-[10px] text-gray-400 font-normal italic">{invoiceProjectDescription}</span>
                                  </>
                                )}
                              </td>
                              <td className="py-2 px-3 border-r border-gray-400 text-center font-mono font-bold">
                                {invoicePdfMode === 'EDIT' ? (
                                  <>
                                    <span className="qty-data inline-block font-mono font-black text-black bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded text-xs !text-black !font-black print:!text-black print:!font-black shadow-2xs">
                                      {invoiceProjectQty || 1}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={invoiceProjectQty === 0 ? '' : invoiceProjectQty}
                                      onChange={(e) => setInvoiceProjectQty(e.target.value === '' ? '' : e.target.value)}
                                      className="w-14 text-center font-mono font-black text-xs border border-slate-400 rounded px-1 py-0.5 bg-white text-black print:hidden font-bold"
                                    />
                                  </>
                                ) : (
                                  <span className="qty-data inline-block font-mono font-black text-black bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded text-xs !text-black !font-black print:!text-black print:!font-black shadow-2xs">
                                    {invoiceProjectQty || 1}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 border-r border-gray-400 text-right font-mono font-bold text-black">
                                {invoicePdfMode === 'EDIT' ? (
                                  <>
                                    <span className="hidden print:inline font-mono font-bold text-black">
                                      SLL {invoiceCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={invoiceCommissionAmount}
                                      onChange={(e) => setInvoiceCommissionAmount(Number(e.target.value))}
                                      className="w-24 text-right border border-blue-300 rounded px-1.5 py-0.5 font-bold font-mono text-xs bg-white text-black print:hidden"
                                    />
                                  </>
                                ) : (
                                  `SLL ${invoiceCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black text-black">
                                SLL {((Number(invoiceCommissionAmount) || 0) * (parseFloat(String(invoiceProjectQty)) || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}

                          {/* Custom Invoice Items */}
                          {customInvoiceItems.map((item) => {
                            const qty = item.quantity !== undefined ? item.quantity : (parseFloat(item.unitRate) || 1);
                            const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.amount;
                            const totalAmount = qty * unitPrice;

                            return (
                              <tr key={item.id} className="min-h-[36px]">
                                <td className="py-2 px-3 border-r border-gray-400 font-semibold text-gray-800 flex items-center justify-between gap-2">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="hidden print:inline font-semibold text-gray-800">{item.description}</span>
                                      <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'description', e.target.value)}
                                        className="w-full text-xs font-semibold text-gray-800 border border-blue-300 rounded px-1.5 py-0.5 bg-white print:hidden"
                                        placeholder="Item Description"
                                      />
                                    </>
                                  ) : (
                                    <span>{item.description}</span>
                                  )}
                                  {invoicePdfMode === 'EDIT' && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCustomItem(item.id)}
                                      className="text-red-500 hover:text-red-700 no-print cursor-pointer shrink-0"
                                      title="Remove item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                                <td className="py-2 px-3 border-r border-gray-400 text-center font-mono font-bold">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="qty-data inline-block font-mono font-black text-black bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded text-xs !text-black !font-black print:!text-black print:!font-black shadow-2xs">
                                        {qty}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.quantity === 0 ? '' : (item.quantity ?? qty)}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'quantity', e.target.value)}
                                        className="w-14 text-center font-mono font-black text-xs border border-slate-400 rounded px-1 py-0.5 bg-white text-black print:hidden font-bold"
                                      />
                                    </>
                                  ) : (
                                    <span className="qty-data inline-block font-mono font-black text-black bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded text-xs !text-black !font-black print:!text-black print:!font-black shadow-2xs">
                                      {qty}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 border-r border-gray-400 text-right font-mono font-bold text-black">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="hidden print:inline font-mono font-bold text-black">
                                        SLL {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={unitPrice}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'unitPrice', e.target.value)}
                                        className="w-24 text-right font-mono font-bold text-xs border border-blue-300 rounded px-1 py-0.5 bg-white text-black print:hidden"
                                      />
                                    </>
                                  ) : (
                                    `SLL ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-black text-black">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="hidden print:inline font-mono font-black text-black">
                                        SLL {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={totalAmount}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'amount', e.target.value)}
                                        className="w-28 text-right font-mono font-black text-xs border border-blue-300 rounded px-1 py-0.5 bg-white text-black print:hidden"
                                      />
                                    </>
                                  ) : (
                                    `SLL ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Empty Ledger Padding Rows to replicate the paper pad style perfectly! */}
                          {Array.from({ length: Math.max(1, 3 - (Number(invoiceCommissionAmount) > 0 ? 1 : 0) - customInvoiceItems.length) }).map((_, idx) => (
                            <tr key={`empty-${idx}`} className="h-8">
                              <td className="border-r border-gray-400"></td>
                              <td className="border-r border-gray-400"></td>
                              <td className="border-r border-gray-400"></td>
                              <td></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-gray-600 bg-slate-100 font-black text-xs">
                          <tr className="border-b border-gray-400 bg-slate-100">
                            <td colSpan={3} className="py-2.5 px-3 text-right font-black uppercase text-xs border-r border-gray-400 text-slate-900">
                              Total Invoice Amount:
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-slate-950 bg-slate-200">
                              SLL {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                          {totals.totalPaid > 0 && (
                            <>
                              <tr className="border-b border-gray-400 text-emerald-800 bg-emerald-50/60">
                                <td colSpan={3} className="py-1.5 px-3 text-right font-bold uppercase text-[11px] border-r border-gray-400">
                                  Payments / Deposits Cleared:
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono font-bold text-xs">
                                  - SLL {totals.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                              <tr className="bg-slate-100 font-black">
                                <td colSpan={3} className="py-2 px-3 text-right font-black uppercase text-xs border-r border-gray-400 text-slate-900">
                                  Net Balance Due:
                                </td>
                                <td className={`py-2 px-3 text-right font-mono font-black text-sm ${totals.outstanding > 0 ? 'text-amber-900 bg-amber-50' : 'text-emerald-900 bg-emerald-50'}`}>
                                  {totals.outstanding > 0 ? `SLL ${totals.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'PAID IN FULL'}
                                </td>
                              </tr>
                            </>
                          )}
                        </tfoot>
                      </table>
                    </div>

                    {/* Inline interface to add custom items in paper style inside EDIT mode */}
                    {invoicePdfMode === 'EDIT' && (
                      <form onSubmit={handleAddCustomItem} className="mt-4 p-3.5 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-wrap items-end gap-3 no-print">
                        <div className="flex-1 min-w-[200px] space-y-1">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">New Item Description</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Premium Brass Hinges & Hardware upgrades"
                            value={newCustomItemDesc}
                            onChange={(e) => setNewCustomItemDesc(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-hidden font-medium"
                          />
                        </div>

                        <div className="w-20 space-y-1">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">Qty</label>
                          <input
                            type="number"
                            min={1}
                            step="any"
                            required
                            value={newCustomItemQty}
                            onChange={(e) => setNewCustomItemQty(e.target.value === '' ? '' : e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-hidden font-mono font-bold text-center"
                          />
                        </div>

                        <div className="w-28 space-y-1">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">Unit Price (SLL)</label>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            required
                            value={newCustomItemUnitPrice}
                            onChange={(e) => setNewCustomItemUnitPrice(e.target.value === '' ? '' : e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-hidden font-mono font-bold text-right"
                          />
                        </div>

                        <div className="w-28 space-y-1 text-right">
                          <label className="text-[9px] text-gray-400 font-bold uppercase block">Total (Qty × Price)</label>
                          <div className="px-2 py-1 text-xs bg-blue-50 text-blue-900 border border-blue-200 rounded-lg font-mono font-black truncate">
                            SLL {((Number(newCustomItemQty) || 0) * (Number(newCustomItemUnitPrice) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-[#0f52ba] hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </button>
                      </form>
                    )}

                    {/* Footer Summary Blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
                      {/* Customer Message on the left */}
                      <div className="md:col-span-7 flex flex-col justify-stretch">
                        <span className="text-[10px] uppercase font-black text-gray-400 block mb-1">Customer Message</span>
                        <div className="border border-gray-400 bg-white rounded-xs p-3 min-h-[64px] flex-1 text-xs">
                          {invoicePdfMode === 'EDIT' ? (
                            <textarea
                              rows={2}
                              value={invoiceCustomerMessage}
                              onChange={(e) => setInvoiceCustomerMessage(e.target.value)}
                              placeholder="e.g. Thank you for your woodwork order!"
                              className="w-full text-xs text-gray-700 bg-amber-50 border border-amber-200 rounded p-1.5 outline-hidden"
                            />
                          ) : (
                            <p className="text-gray-700 italic leading-normal whitespace-pre-line font-medium">
                              {invoiceCustomerMessage || "Please examine all dimensions on delivery. Thank you for choosing Sweds Wood Enterprise!"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Subtotal block on the right */}
                      <div className="md:col-span-5 flex flex-col justify-end">
                        <div className="border-2 border-slate-900 bg-white rounded-xs overflow-hidden shadow-xs">
                          <div className="bg-slate-900 text-white flex justify-between items-center px-4 py-3 print:bg-white print:text-black print:border-b print:border-slate-900">
                            <span className="font-sans font-black text-xs uppercase tracking-wider">Total Invoice Amount</span>
                            <span className="font-mono font-black text-sm">
                              SLL {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {totals.totalPaid > 0 && (
                            <div className="bg-white px-4 py-2 border-t border-gray-300 text-xs flex justify-between items-center text-emerald-800 font-semibold">
                              <span>Payments Cleared:</span>
                              <span className="font-mono font-bold">- SLL {totals.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="bg-slate-50 px-4 py-2 border-t border-gray-400 text-xs flex justify-between items-center font-black text-slate-900">
                            <span>Balance Due:</span>
                            <span className={`font-mono font-black ${totals.outstanding > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                              {totals.outstanding > 0 ? `SLL ${totals.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'PAID IN FULL'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ==========================================
                     MODERN DIGITAL TEMPLATE PATTERN
                     ========================================== */
                  <>
                    {/* Letterhead Header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b-2 border-wood-950">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="relative group shrink-0">
                            <img src={invoiceLogoUrl || '/logo.svg'} alt="Company Logo" className="w-10 h-10 object-contain shrink-0" />
                            {invoicePdfMode === 'EDIT' && (
                              <label className="absolute -bottom-1 -right-1 bg-wood-950 text-white p-1 rounded-full text-[9px] cursor-pointer shadow-md hover:bg-amber-600 transition no-print" title="Click to replace logo image">
                                <Upload className="w-3 h-3 text-amber-400" />
                                <input type="file" accept="image/*" onChange={handleInvoiceLogoFileUpload} className="hidden" />
                              </label>
                            )}
                          </div>
                          {invoicePdfMode === 'EDIT' ? (
                            <>
                              <span className="hidden print:inline font-display font-black text-lg uppercase tracking-wider text-wood-900">{invoiceCompany}</span>
                              <input
                                type="text"
                                value={invoiceCompany}
                                onChange={(e) => setInvoiceCompany(e.target.value)}
                                className="font-display font-black text-lg uppercase tracking-wider text-wood-900 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 outline-hidden print:hidden"
                              />
                            </>
                          ) : (
                            <span className="font-display font-black text-lg uppercase tracking-wider text-wood-900">
                              {invoiceCompany}
                            </span>
                          )}
                        </div>

                        {invoicePdfMode === 'EDIT' ? (
                          <>
                            <p className="hidden print:block text-xs text-gray-500 leading-relaxed font-semibold whitespace-pre-line">{invoiceCompanyContact}</p>
                            <textarea
                              rows={4}
                              value={invoiceCompanyContact}
                              onChange={(e) => setInvoiceCompanyContact(e.target.value)}
                              className="text-xs text-gray-600 leading-relaxed font-semibold bg-amber-50/50 border border-amber-200 rounded p-1.5 outline-hidden w-full print:hidden"
                            />
                          </>
                        ) : (
                          <p className="text-xs text-gray-500 leading-relaxed font-semibold whitespace-pre-line">
                            {invoiceCompanyContact}
                          </p>
                        )}
                      </div>

                      <div className="md:text-right space-y-2">
                        <h2 className="text-xl font-black uppercase text-wood-950 tracking-wider font-display">COMMERCIAL INVOICE</h2>
                        <div className="text-xs text-gray-500 font-semibold space-y-1 md:inline-block md:text-right">
                          <div className="flex md:justify-end items-center gap-1">
                            <span>Invoice No:</span>
                            {invoicePdfMode === 'EDIT' ? (
                              <>
                                <span className="hidden print:inline font-mono text-gray-800 font-bold">{invoiceNo}</span>
                                <input
                                  type="text"
                                  value={invoiceNo}
                                  onChange={(e) => setInvoiceNo(e.target.value)}
                                  className="font-mono text-gray-800 font-bold bg-amber-50/50 border border-amber-200 rounded px-1 py-0.5 text-[11px] w-28 text-right print:hidden"
                                />
                              </>
                            ) : (
                              <span className="font-mono text-gray-800 font-bold">{invoiceNo}</span>
                            )}
                          </div>

                          <div className="flex md:justify-end items-center gap-1">
                            <span>Date:</span>
                            {invoicePdfMode === 'EDIT' ? (
                              <>
                                <span className="hidden print:inline font-mono text-gray-800">{invoiceDate}</span>
                                <input
                                  type="date"
                                  value={invoiceDate}
                                  onChange={(e) => setInvoiceDate(e.target.value)}
                                  className="font-mono text-gray-800 bg-amber-50/50 border border-amber-200 rounded px-1 py-0.5 text-[11px] w-28 text-right print:hidden"
                                />
                              </>
                            ) : (
                              <span className="font-mono text-gray-800">{invoiceDate}</span>
                            )}
                          </div>

                          <div className="flex md:justify-end items-center gap-1">
                            <span>Terms:</span>
                            {invoicePdfMode === 'EDIT' ? (
                              <>
                                <span className="hidden print:inline text-gray-800 font-bold">{invoiceTerms}</span>
                                <input
                                  type="text"
                                  value={invoiceTerms}
                                  onChange={(e) => setInvoiceTerms(e.target.value)}
                                  className="text-gray-800 bg-amber-50/50 border border-amber-200 rounded px-1 py-0.5 text-[11px] w-48 text-right print:hidden"
                                />
                              </>
                            ) : (
                              <span className="text-gray-800 font-bold">{invoiceTerms}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Billing Addresses profiles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 text-xs border-b border-gray-100">
                      <div className="space-y-1 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                        <span className="font-bold text-wood-950 uppercase tracking-wider block mb-1.5">CLIENT DEPOSITOR:</span>
                        {invoicePdfMode === 'EDIT' ? (
                          <>
                            <div className="hidden print:block space-y-0.5">
                              <p className="text-sm font-black text-gray-800">{invoiceCustomerName}</p>
                              {invoiceCustomerCompany && (
                                <p className="font-bold text-wood-800">{invoiceCustomerCompany}</p>
                              )}
                              <p className="text-gray-500 font-semibold mt-1">Phone: {invoiceCustomerPhone || 'N/A'}</p>
                              <p className="text-gray-500 font-semibold">Email: {invoiceCustomerEmail || 'N/A'}</p>
                              <p className="text-gray-500 leading-tight font-semibold mt-1">Delivery: {invoiceCustomerAddress || 'N/A'}</p>
                            </div>
                            <div className="space-y-1 print:hidden">
                              <input
                                type="text"
                                value={invoiceCustomerName}
                                onChange={(e) => setInvoiceCustomerName(e.target.value)}
                                className="text-xs font-black text-gray-800 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 w-full"
                                placeholder="Client Name"
                              />
                              <input
                                type="text"
                                value={invoiceCustomerCompany}
                                onChange={(e) => setInvoiceCustomerCompany(e.target.value)}
                                className="text-xs font-bold text-wood-700 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 w-full"
                                placeholder="Client Company"
                              />
                              <input
                                type="text"
                                value={invoiceCustomerPhone}
                                onChange={(e) => setInvoiceCustomerPhone(e.target.value)}
                                className="text-xs text-gray-600 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 w-full"
                                placeholder="Phone Number"
                              />
                              <input
                                type="text"
                                value={invoiceCustomerEmail}
                                onChange={(e) => setInvoiceCustomerEmail(e.target.value)}
                                className="text-xs text-gray-600 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 w-full"
                                placeholder="Email address"
                              />
                              <input
                                type="text"
                                value={invoiceCustomerAddress}
                                onChange={(e) => setInvoiceCustomerAddress(e.target.value)}
                                className="text-xs text-gray-600 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 w-full"
                                placeholder="Delivery Address"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-black text-gray-800">{invoiceCustomerName}</p>
                            {invoiceCustomerCompany && (
                              <p className="font-bold text-wood-800">{invoiceCustomerCompany}</p>
                            )}
                            <p className="text-gray-500 font-semibold mt-1">Phone: {invoiceCustomerPhone || 'N/A'}</p>
                            <p className="text-gray-500 font-semibold">Email: {invoiceCustomerEmail || 'N/A'}</p>
                            <p className="text-gray-500 leading-tight font-semibold mt-1">Delivery: {invoiceCustomerAddress || 'N/A'}</p>
                          </>
                        )}
                      </div>

                      <div className="space-y-1 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                        <span className="font-bold text-wood-950 uppercase tracking-wider block mb-1.5">PROJECT / DESIGN FOCUS:</span>
                        {invoicePdfMode === 'EDIT' ? (
                          <>
                            <div className="hidden print:block space-y-0.5">
                              <p className="text-sm font-black text-gray-800">{invoiceProjectTitle}</p>
                              <p className="text-gray-500 leading-relaxed font-semibold">{invoiceProjectDescription}</p>
                              <p className="text-gray-500 font-semibold mt-2">Workshop Timeline: <strong className="text-gray-800">{invoiceTimeline}</strong></p>
                            </div>
                            <div className="space-y-1 print:hidden">
                              <input
                                type="text"
                                value={invoiceProjectTitle}
                                onChange={(e) => setInvoiceProjectTitle(e.target.value)}
                                className="text-xs font-black text-gray-800 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 w-full"
                              />
                              <textarea
                                rows={2}
                                value={invoiceProjectDescription}
                                onChange={(e) => setInvoiceProjectDescription(e.target.value)}
                                className="text-xs text-gray-600 bg-amber-50/50 border border-amber-200 rounded p-1.5 w-full"
                              />
                              <input
                                type="text"
                                value={invoiceTimeline}
                                onChange={(e) => setInvoiceTimeline(e.target.value)}
                                className="text-xs font-semibold text-gray-700 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 w-full"
                                placeholder="Timeline"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-black text-gray-800">{invoiceProjectTitle}</p>
                            <p className="text-gray-500 leading-relaxed font-semibold">{invoiceProjectDescription}</p>
                            <p className="text-gray-500 font-semibold mt-2">Workshop Timeline: <strong className="text-gray-800">{invoiceTimeline}</strong></p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Interactive/Editable Table Line Items */}
                    <div className="py-2">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-300 text-wood-950 font-bold uppercase bg-gray-50 text-[10px] tracking-wider">
                            <th className="py-2.5 px-3">Itemized Production Scope & Timber Milling</th>
                            <th className="py-2.5 px-3 text-right">Unit Rate / Price Breakdown</th>
                            <th className="py-2.5 px-3 text-right">Total Cleared Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Number(invoiceCommissionAmount) > 0 && (
                            <tr>
                              <td className="py-3 px-3">
                                <p className="font-bold text-gray-800">Bespoke Workshop Commission Fee</p>
                                <span className="text-[10px] text-gray-400 font-semibold">Fine assembly, wood joinery, sanding, and hand polished finish.</span>
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-gray-600 font-bold">
                                {invoicePdfMode === 'EDIT' ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={invoiceProjectQty === 0 ? '' : invoiceProjectQty}
                                      onChange={(e) => setInvoiceProjectQty(e.target.value === '' ? '' : e.target.value)}
                                      className="w-12 text-center font-mono font-bold text-xs border border-amber-300 rounded px-1 py-0.5 bg-white"
                                    />
                                    <span className="text-gray-400">×</span>
                                    <input
                                      type="number"
                                      value={invoiceCommissionAmount}
                                      onChange={(e) => setInvoiceCommissionAmount(Number(e.target.value))}
                                      className="w-24 text-right bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 font-bold outline-hidden font-mono text-xs"
                                    />
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 justify-end">
                                    <span className="qty-data inline-block bg-slate-100 text-black border border-slate-300 font-black px-2 py-0.5 rounded text-xs !text-black !font-black print:!text-black print:!font-black shadow-2xs">
                                      {invoiceProjectQty || 1} Set(s)
                                    </span>
                                    <span className="text-gray-600 font-bold">× {formatCurrency(invoiceCommissionAmount, 0)}</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-gray-800">
                                {formatCurrency((Number(invoiceCommissionAmount) || 0) * (parseFloat(String(invoiceProjectQty)) || 1), 0)}
                              </td>
                            </tr>
                          )}

                          {/* Render extra custom added line items */}
                          {customInvoiceItems.map((item) => {
                            const qty = item.quantity !== undefined ? item.quantity : (parseFloat(item.unitRate) || 1);
                            const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.amount;
                            const totalAmount = qty * unitPrice;

                            return (
                              <tr key={item.id} className="bg-amber-50/10">
                                <td className="py-2.5 px-3 font-semibold text-gray-800">
                                  <div className="flex items-center justify-between gap-2">
                                    {invoicePdfMode === 'EDIT' ? (
                                      <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'description', e.target.value)}
                                        className="w-full text-xs font-semibold text-gray-800 border border-amber-300 rounded px-1.5 py-0.5 bg-white"
                                        placeholder="Item Description"
                                      />
                                    ) : (
                                      <span>{item.description}</span>
                                    )}
                                    {invoicePdfMode === 'EDIT' && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCustomItem(item.id)}
                                        className="text-red-500 hover:text-red-700 no-print shrink-0 cursor-pointer"
                                        title="Remove item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-600">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.quantity === 0 ? '' : (item.quantity ?? qty)}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'quantity', e.target.value)}
                                        className="w-12 text-center font-mono font-bold text-xs border border-amber-300 rounded px-1 py-0.5 bg-white"
                                      />
                                      <span className="text-gray-400">×</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={unitPrice === 0 ? '' : unitPrice}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'unitPrice', e.target.value)}
                                        className="w-20 text-right font-mono font-bold text-xs border border-amber-300 rounded px-1 py-0.5 bg-white"
                                      />
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 justify-end">
                                      <span className="qty-data inline-block bg-slate-100 text-black border border-slate-300 font-black px-2 py-0.5 rounded text-xs !text-black !font-black print:!text-black print:!font-black shadow-2xs">
                                        Qty: {qty}
                                      </span>
                                      <span className="text-gray-600 font-bold">× {formatCurrency(unitPrice, 0)}</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <input
                                      type="number"
                                      min="0"
                                      value={totalAmount}
                                      onChange={(e) => handleUpdateCustomItem(item.id, 'amount', e.target.value)}
                                      className="w-24 text-right font-mono font-black text-xs border border-amber-300 rounded px-1 py-0.5 bg-white"
                                    />
                                  ) : (
                                    formatCurrency(totalAmount, 0)
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t-2 border-wood-950 bg-stone-100 font-black text-xs">
                          <tr className="border-b border-gray-300">
                            <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs text-wood-950">
                              Total Invoice Amount:
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-wood-950 bg-stone-200">
                              {formatCurrency(totals.finalTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>

                      {/* Inline interface to add a new custom invoice line item (only visible in EDIT mode) */}
                      {invoicePdfMode === 'EDIT' && (
                        <form onSubmit={handleAddCustomItem} className="mt-4 p-3.5 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-wrap items-end gap-3 no-print">
                          <div className="flex-1 min-w-[200px] space-y-1">
                            <label className="text-[9px] text-gray-400 font-bold uppercase block">New Item Description</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Premium Brass Hinges & Hardware upgrades"
                              value={newCustomItemDesc}
                              onChange={(e) => setNewCustomItemDesc(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-hidden font-medium"
                            />
                          </div>

                          <div className="w-20 space-y-1">
                            <label className="text-[9px] text-gray-400 font-bold uppercase block">Qty</label>
                            <input
                              type="number"
                              min={1}
                              step="any"
                              required
                              value={newCustomItemQty}
                              onChange={(e) => setNewCustomItemQty(e.target.value === '' ? '' : e.target.value)}
                              className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-hidden font-mono font-bold text-center"
                            />
                          </div>

                          <div className="w-28 space-y-1">
                            <label className="text-[9px] text-gray-400 font-bold uppercase block">Unit Price (Le)</label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              required
                              value={newCustomItemUnitPrice}
                              onChange={(e) => setNewCustomItemUnitPrice(e.target.value === '' ? '' : e.target.value)}
                              className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-hidden font-mono font-bold text-right"
                            />
                          </div>

                          <div className="w-28 space-y-1 text-right">
                            <label className="text-[9px] text-gray-400 font-bold uppercase block">Total (Qty × Price)</label>
                            <div className="px-2 py-1 text-xs bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-mono font-black truncate">
                              Le {((Number(newCustomItemQty) || 0) * (Number(newCustomItemUnitPrice) || 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="px-3.5 py-1.5 bg-wood-700 hover:bg-wood-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Item</span>
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Calculations Summary block */}
                    <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start gap-6 text-xs">
                      <div className="max-w-md text-gray-400 font-semibold leading-relaxed whitespace-pre-line">
                        <h5 className="font-extrabold text-wood-950 uppercase tracking-widest text-[9px] mb-1.5">SWEDS WOOD ENTERPRISE CLEARANCE INSTRUCTIONS:</h5>
                        {invoicePdfMode === 'EDIT' ? (
                          <textarea
                            rows={3}
                            value={invoiceBankInstructions}
                            onChange={(e) => setInvoiceBankInstructions(e.target.value)}
                            className="w-full p-2 text-xs bg-amber-50/50 border border-amber-200 rounded outline-hidden text-gray-700"
                          />
                        ) : (
                          <p>{invoiceBankInstructions}</p>
                        )}
                      </div>

                      <div className="w-full md:w-64 space-y-2 text-xs font-semibold text-gray-500">
                        <div className="flex justify-between">
                          <span>Invoice Subtotal:</span>
                          <span className="font-mono text-gray-800 font-bold">{formatCurrency(totals.subtotal)}</span>
                        </div>

                        <div className="flex justify-between">
                          <span>Taxable Value (Net):</span>
                          <span className="font-mono text-gray-800 font-semibold">{formatCurrency(totals.taxableAmount)}</span>
                        </div>

                        <div className="flex justify-between text-gray-700">
                          <span className="text-[10px] uppercase font-bold">GST Sales Tax ({taxPercent}%):</span>
                          <span className="font-mono font-bold">+{formatCurrency(totals.taxAmount)}</span>
                        </div>

                        <div className="border-t-2 border-wood-950 pt-2 flex justify-between text-gray-800">
                          <span className="font-black text-sm uppercase tracking-wider text-wood-950">Grand Total Invoice:</span>
                          <span className="font-mono font-black text-sm text-wood-950">{formatCurrency(totals.finalTotal)}</span>
                        </div>

                        {totals.totalPaid > 0 && (
                          <>
                            <div className="flex justify-between text-emerald-800 font-semibold">
                              <span>Payments Cleared:</span>
                              <span className="font-mono font-bold">-{formatCurrency(totals.totalPaid)}</span>
                            </div>

                            <div className="border-t border-gray-200 pt-1 flex justify-between font-black text-xs">
                              <span className="uppercase text-wood-950">Balance Due:</span>
                              <span className={`font-mono font-black ${totals.outstanding > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                                {totals.outstanding > 0 ? formatCurrency(totals.outstanding) : 'PAID IN FULL'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

              </div>
              )}

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
         PDF WORKSPACE MODAL: FULL RECEIPT VIEW/EDIT
         ========================================== */}
      <AnimatePresence>
        {activeReceipt && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
            <div className="bg-slate-100 text-slate-800 rounded-2xl w-full max-w-2xl p-6 my-8 shadow-2xl relative print:my-0 print:shadow-none print:rounded-none print:bg-white print:p-0" id="print-area">
              
              {/* TOP WORKSPACE TOOLBAR (Hides on standard print) */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-200/60 no-print">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-900 text-white rounded-lg">
                    <Receipt className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-sm text-gray-900">PDF Receipt Workspace</h3>
                    <p className="text-[10px] text-gray-500">Manage and edit payment clearance receipts.</p>
                  </div>
                </div>

                {/* PDF VIEW / INTERACTIVE EDIT SWITCH */}
                <div className="flex flex-wrap items-center gap-3">

                  <div className="flex bg-gray-200 p-0.5 rounded-lg border border-gray-300">
                    <button
                      onClick={() => setReceiptPdfMode('VIEW')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        receiptPdfMode === 'VIEW' 
                          ? 'bg-white text-emerald-950 shadow-2xs' 
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>PDF View</span>
                    </button>
                    <button
                      onClick={() => setReceiptPdfMode('EDIT')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        receiptPdfMode === 'EDIT' 
                          ? 'bg-white text-emerald-950 shadow-2xs' 
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Content</span>
                    </button>
                  </div>

                  <button
                    onClick={handleDownloadSingleReceiptPdf}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                    title="Generate and download high-resolution PDF receipt file"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print/Save PDF</span>
                  </button>

                  <button
                    onClick={() => setActiveReceipt(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 bg-white rounded-xl text-xs font-bold hover:bg-gray-50 transition"
                  >
                    Close Workspace
                  </button>
                </div>
              </div>

              {/* THE FLOATING PAPER RECEIPT */}
              {activeDocSource === 'UPLOADED' ? (
                <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 space-y-6">
                  {(() => {
                    const currentDoc = uploadedDocs.find(d => d.jobId === activeReceipt.job.id && d.docType === 'RECEIPT');
                    if (currentDoc) {
                      return (
                        <div className="space-y-4">
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 no-print">
                            <div className="flex items-center gap-2">
                              <FileCheck className="w-5 h-5 text-emerald-700" />
                              <div>
                                <h4 className="text-xs font-bold text-emerald-950">
                                  Uploaded Receipt Scan: {currentDoc.fileName}
                                </h4>
                                <p className="text-[10px] text-emerald-800">
                                  Size: {currentDoc.fileSize} &bull; Uploaded: {currentDoc.uploadedAt}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs">
                                <Upload className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Replace Scan</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleUploadInvoiceOrReceipt(e, 'RECEIPT', activeReceipt.job.id)}
                                  className="hidden"
                                />
                              </label>
                              <button
                                onClick={() => handlePrintUploadedDoc(currentDoc)}
                                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Custom Document</span>
                              </button>
                              <button
                                onClick={() => handleRemoveUploadedDoc(currentDoc.id)}
                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>

                          {currentDoc.fileType === 'image' ? (
                            <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-xl border border-gray-200">
                              <img
                                src={currentDoc.fileDataUrl}
                                alt={`Uploaded Receipt Scan - ${currentDoc.fileName}`}
                                className="max-w-full max-h-[850px] object-contain rounded shadow-md print:shadow-none print:max-h-none print:w-full"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-[750px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
                              <iframe
                                src={currentDoc.fileDataUrl}
                                title="Uploaded Receipt PDF Scan Preview"
                                className="w-full h-full border-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-12 border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-2xl text-center space-y-4">
                          <Upload className="w-12 h-12 text-emerald-600 mx-auto" />
                          <h3 className="text-sm font-black text-emerald-950 uppercase">No Custom Receipt Document Uploaded Yet</h3>
                          <p className="text-xs text-emerald-800/80 max-w-md mx-auto leading-relaxed">
                            Upload an official signed paper receipt, bank deposit voucher, or clearance file to preview & print directly for client <strong className="text-emerald-950">{activeReceipt.job.customerName}</strong>.
                          </p>
                          <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black uppercase rounded-xl cursor-pointer transition shadow-md">
                            <Upload className="w-4 h-4 text-emerald-300" />
                            <span>Upload Custom Receipt Scan (Image/PDF)</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleUploadInvoiceOrReceipt(e, 'RECEIPT', activeReceipt.job.id)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      );
                    }
                  })()}
                </div>
              ) : (
              <div className="bg-white p-8 sm:p-10 border border-gray-200 rounded-xl shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none">
                
                {/* Letterhead Header */}
                <div className="flex flex-col items-center text-center pb-6 border-b border-gray-200 space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <div className="relative group shrink-0">
                      <img
                        src={invoiceLogoUrl || '/logo.svg'}
                        alt="Swedswood Enterprise Official Logo"
                        className="w-14 h-14 object-contain shrink-0"
                      />
                      <label
                        className="absolute -bottom-1 -right-1 bg-emerald-950 text-white p-1 rounded-full text-[9px] cursor-pointer shadow-md hover:bg-emerald-600 transition no-print"
                        title="Click to replace company logo image for both Invoices & Receipts"
                      >
                        <Upload className="w-3 h-3 text-emerald-300" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleInvoiceLogoFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex flex-col text-left sm:text-center">
                      {receiptPdfMode === 'EDIT' ? (
                        <input
                          type="text"
                          value={receiptCompany}
                          onChange={(e) => setReceiptCompany(e.target.value)}
                          className="font-display font-black text-lg uppercase tracking-wider text-emerald-950 bg-amber-50/50 border border-amber-200 rounded px-2 py-0.5 text-center"
                        />
                      ) : (
                        <span className="font-display font-black text-lg uppercase tracking-wider text-emerald-950">
                          {receiptCompany}
                        </span>
                      )}
                      <div className="w-full h-[2.5px] bg-emerald-800 my-0.5" />
                    </div>
                  </div>

                  <h2 className="text-sm font-black text-gray-700 font-display uppercase tracking-wider">OFFICIAL CLEARANCE RECEIPT</h2>
                  
                  {receiptPdfMode === 'EDIT' ? (
                    <input
                      type="text"
                      value={receiptCompanySub}
                      onChange={(e) => setReceiptCompanySub(e.target.value)}
                      className="text-[10px] text-gray-500 bg-amber-50/50 border border-amber-200 rounded px-2 py-0.5 w-full text-center"
                    />
                  ) : (
                    <p className="text-[10px] text-gray-400 font-semibold">{receiptCompanySub}</p>
                  )}
                </div>

                {/* Receipt Details Box */}
                <div className="my-6 p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 space-y-4 text-xs font-semibold text-gray-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Receipt Reference</span>
                      {receiptPdfMode === 'EDIT' ? (
                        <input
                          type="text"
                          value={receiptNo}
                          onChange={(e) => setReceiptNo(e.target.value)}
                          className="font-mono text-xs text-gray-800 font-bold bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5"
                        />
                      ) : (
                        <span className="font-mono text-sm text-gray-800 font-bold">{receiptNo}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Date Cleared</span>
                      {receiptPdfMode === 'EDIT' ? (
                        <input
                          type="text"
                          value={receiptDate}
                          onChange={(e) => setReceiptDate(e.target.value)}
                          className="font-mono text-xs text-gray-800 font-bold bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 text-right"
                        />
                      ) : (
                        <span className="font-mono text-sm text-gray-800 font-bold">{receiptDate}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Received From (Client)</span>
                      {receiptPdfMode === 'EDIT' ? (
                        <input
                          type="text"
                          value={receiptCustomer}
                          onChange={(e) => setReceiptCustomer(e.target.value)}
                          className="text-xs font-black text-gray-800 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 w-full"
                        />
                      ) : (
                        <span className="text-gray-800 text-xs font-black">{receiptCustomer}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Payment Method</span>
                      {receiptPdfMode === 'EDIT' ? (
                        <input
                          type="text"
                          value={receiptMethod}
                          onChange={(e) => setReceiptMethod(e.target.value)}
                          className="text-xs text-emerald-800 font-extrabold bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 text-right"
                        />
                      ) : (
                        <span className="text-emerald-800 text-xs uppercase font-extrabold">{receiptMethod}</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-emerald-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Bespoke Carpentry Project</span>
                      {receiptPdfMode === 'EDIT' ? (
                        <input
                          type="text"
                          value={receiptProject}
                          onChange={(e) => setReceiptProject(e.target.value)}
                          className="text-xs font-bold text-gray-800 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 w-full"
                        />
                      ) : (
                        <span className="text-gray-800 text-xs font-bold leading-relaxed">{receiptProject}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold block">Cleared Value</span>
                      {receiptPdfMode === 'EDIT' ? (
                        <input
                          type="number"
                          value={receiptAmount}
                          onChange={(e) => setReceiptAmount(Number(e.target.value))}
                          className="text-right bg-amber-50/50 border border-amber-200 rounded px-2 py-0.5 text-sm font-bold font-mono text-emerald-800"
                        />
                      ) : (
                        <span className="text-sm font-black font-mono text-emerald-800 block mt-1">
                          {formatCurrency(receiptAmount, 0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Itemized Order Line Items Cleared on Receipt */}
                  {activeReceipt && (
                    <div className="border-t border-dashed border-emerald-200 pt-3 space-y-2">
                      <span className="text-[9px] text-emerald-900 uppercase font-black tracking-wider block">
                        Itemized Production Scope Cleared:
                      </span>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-emerald-200 text-emerald-950 font-bold uppercase text-[9px] bg-emerald-100/50">
                            <th className="py-1.5 px-2">Item Description</th>
                            <th className="py-1.5 px-2 text-center">Qty</th>
                            <th className="py-1.5 px-2 text-right">Unit Rate</th>
                            <th className="py-1.5 px-2 text-right">Total Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100/60">
                          {(() => {
                            let rItems: { id: string; desc: string; qty: number; unitPrice: number; total: number }[] = [];
                            if (customInvoiceItems && customInvoiceItems.length > 0 && activeInvoice?.id === activeReceipt.job.id) {
                              rItems = customInvoiceItems.map(it => {
                                const q = it.quantity !== undefined ? it.quantity : (parseFloat(it.unitRate) || 1);
                                const p = it.unitPrice !== undefined ? it.unitPrice : it.amount;
                                return {
                                  id: it.id,
                                  desc: it.description,
                                  qty: q,
                                  unitPrice: p,
                                  total: q * p
                                };
                              });
                            } else if (activeReceipt.job.items && activeReceipt.job.items.length > 0) {
                              rItems = activeReceipt.job.items.map((it, idx) => ({
                                id: it.id || `ritem-${idx}`,
                                desc: it.description,
                                qty: it.quantity || 1,
                                unitPrice: it.unitCost,
                                total: it.totalCost || ((it.quantity || 1) * it.unitCost)
                              }));
                            }
                            if (rItems.length === 0) {
                              rItems = [{
                                id: 'main-1',
                                desc: receiptProject || activeReceipt.job.title,
                                qty: 1,
                                unitPrice: receiptAmount || activeReceipt.job.quoteAmount,
                                total: receiptAmount || activeReceipt.job.quoteAmount
                              }];
                            }
                            return rItems.map((item) => (
                              <tr key={item.id} className="text-[11px]">
                                <td className="py-1.5 px-2 font-semibold text-gray-800">{item.desc}</td>
                                <td className="py-1.5 px-2 text-center font-mono font-bold text-black">{item.qty}</td>
                                <td className="py-1.5 px-2 text-right font-mono text-black">{formatCurrency(item.unitPrice, 0)}</td>
                                <td className="py-1.5 px-2 text-right font-mono font-bold text-black">{formatCurrency(item.total, 0)}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* All Captured Payments Ledger for This Woodwork Commission */}
                  {activeReceipt && activeReceipt.job.payments && activeReceipt.job.payments.length > 0 && (
                    <div className="border-t border-dashed border-emerald-200 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-emerald-950 uppercase font-black tracking-wider block">
                          Captured Payment Records:
                        </span>
                        <span className="text-[10px] text-emerald-800 font-bold font-mono">
                          {activeReceipt.job.payments.length} Payments Captured
                        </span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-emerald-200 text-emerald-950 font-bold uppercase text-[9px] bg-emerald-100/50">
                            <th className="py-1.5 px-2">#</th>
                            <th className="py-1.5 px-2">Payment ID</th>
                            <th className="py-1.5 px-2">Date</th>
                            <th className="py-1.5 px-2">Method</th>
                            <th className="py-1.5 px-2">Purpose / Note</th>
                            <th className="py-1.5 px-2 text-right">Amount (Le)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100/60">
                          {activeReceipt.job.payments.map((pay, idx) => (
                            <tr key={pay.id} className="text-[11px]">
                              <td className="py-1.5 px-2 font-mono text-gray-500 font-bold">{idx + 1}</td>
                              <td className="py-1.5 px-2 font-mono font-bold text-gray-700">{pay.id}</td>
                              <td className="py-1.5 px-2 font-mono text-gray-600">{pay.date}</td>
                              <td className="py-1.5 px-2 font-semibold text-wood-800">{pay.method}</td>
                              <td className="py-1.5 px-2 text-gray-600">{pay.note || 'Installment Payment'}</td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800">
                                {formatCurrency(pay.amount, 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Financial Settlement Breakdown & Outstanding Balance Status */}
                  {activeReceipt && (() => {
                    const totalContract = activeReceipt.job.quoteAmount;
                    const totalPaidCaptured = activeReceipt.job.payments.reduce((s, p) => s + p.amount, 0);
                    const balanceRemaining = Math.max(0, totalContract - totalPaidCaptured);

                    return (
                      <div className="border-t border-emerald-200 pt-3 bg-emerald-50/40 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-600">Total Contract Value:</span>
                          <span className="font-mono font-bold text-gray-900">{formatCurrency(totalContract, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-emerald-800">Total Payments Captured to Date:</span>
                          <span className="font-mono font-bold text-emerald-800">{formatCurrency(totalPaidCaptured, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1.5 border-t border-emerald-200">
                          <span className="font-black uppercase text-emerald-950 text-[11px] tracking-wide">
                            {balanceRemaining > 0 ? 'Remaining Balance Due:' : 'Account Balance Status:'}
                          </span>
                          <span className={`font-mono font-black text-sm ${balanceRemaining > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                            {balanceRemaining > 0 ? formatCurrency(balanceRemaining, 0) : 'Le 0.00 (Fully Settled)'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Acknowledgment block */}
                <div className="text-xs text-gray-500 leading-relaxed space-y-2 font-semibold">
                  {receiptPdfMode === 'EDIT' ? (
                    <textarea
                      rows={3}
                      value={receiptAcknowledge}
                      onChange={(e) => setReceiptAcknowledge(e.target.value)}
                      className="w-full text-xs text-gray-600 leading-relaxed bg-amber-50/50 border border-amber-200 rounded p-1.5 outline-hidden"
                    />
                  ) : (
                    <p>{receiptAcknowledge}</p>
                  )}
                  
                  <p className="text-[11px] text-gray-400 italic">
                    All customized SWEDS WOOD ENTERPRISE timber, carving, hardware assembly, and polishing commissions are subject to official delivery clearance terms.
                  </p>
                </div>

              </div>
              )}

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
         BULK PDF EXPORT HUB MODAL
         ========================================== */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-print">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white text-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                    <FolderArchive className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-black text-sm text-gray-900 uppercase tracking-wider">Bulk PDF Export Hub</h3>
                    <p className="text-[10px] text-gray-500 font-bold">Download multiple commission invoices as a single zipped archive.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                
                {/* Search & Style Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Search bar inside modal */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Search Orders/Clients</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search standard orders..."
                        value={bulkSearchTerm}
                        onChange={(e) => setBulkSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 focus:border-wood-300 focus:bg-white rounded-xl outline-hidden font-medium text-gray-800"
                      />
                    </div>
                  </div>

                  {/* Template selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">PDF Template Style</label>
                    <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setBulkTemplate('SWEDS_WOOD')}
                        className="flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg bg-white text-wood-950 shadow-2xs border border-wood-200"
                      >
                        Official Sweds Wood Invoice Format
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bulk Select Options Row */}
                <div className="flex items-center justify-between text-xs bg-wood-50/50 p-3 rounded-xl border border-wood-100">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-wood-900 font-mono">{selectedBulkJobIds.length}</span>
                    <span className="text-gray-500 font-semibold">of {jobs.length} invoices selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBulkJobIds(jobs.map(j => j.id))}
                      className="px-2 py-1 bg-white hover:bg-gray-50 text-[10px] text-wood-900 border border-gray-200 rounded-lg font-bold transition uppercase"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBulkJobIds([])}
                      className="px-2 py-1 bg-white hover:bg-gray-50 text-[10px] text-red-700 border border-gray-200 rounded-lg font-bold transition uppercase"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Checklist Container */}
                <div className="border border-gray-150 rounded-2xl overflow-hidden max-h-[250px] overflow-y-auto divide-y divide-gray-100 bg-slate-50/35">
                  {jobs.filter(j => {
                    const searchStr = `${j.title} ${j.customerName} ${j.id}`.toLowerCase();
                    return searchStr.includes(bulkSearchTerm.toLowerCase());
                  }).length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs font-bold">
                      No matching commission orders.
                    </div>
                  ) : (
                    jobs
                      .filter(j => {
                        const searchStr = `${j.title} ${j.customerName} ${j.id}`.toLowerCase();
                        return searchStr.includes(bulkSearchTerm.toLowerCase());
                      })
                      .map(job => {
                        const isChecked = selectedBulkJobIds.includes(job.id);
                        return (
                          <div 
                            key={job.id} 
                            onClick={() => {
                              if (isChecked) {
                                setSelectedBulkJobIds(selectedBulkJobIds.filter(id => id !== job.id));
                              } else {
                                setSelectedBulkJobIds([...selectedBulkJobIds, job.id]);
                              }
                            }}
                            className="p-3 hover:bg-wood-50/10 transition flex items-center justify-between cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <button type="button" className="text-wood-800 transition">
                                {isChecked ? (
                                  <CheckSquare className="w-5 h-5 text-wood-900 fill-wood-50" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-300" />
                                )}
                              </button>
                              <div>
                                <h5 className="font-bold text-gray-800 leading-tight">{job.title}</h5>
                                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                  Client: {job.customerName} &bull; <span className="font-mono">{job.startDate}</span>
                                </p>
                              </div>
                            </div>

                            <div className="text-right font-mono font-bold text-gray-700">
                              {formatCurrency(job.quoteAmount, 0)}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

              </div>

              {/* Progress/Spinner overlay for compiling/generating ZIP */}
              {isExporting && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-10 space-y-4">
                  <div className="w-12 h-12 border-4 border-wood-950 border-t-amber-500 rounded-full animate-spin" />
                  <div className="text-center">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Generating PDF Dossiers...</h4>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">Compressing documents & packing ZIP archive.</p>
                  </div>
                  <div className="w-full max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                    <div 
                      className="bg-wood-950 h-full transition-all duration-150" 
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-black text-wood-950">{exportProgress}% Completed</span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 bg-white rounded-xl text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkPdfExport}
                  disabled={selectedBulkJobIds.length === 0 || isExporting}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                    selectedBulkJobIds.length === 0
                      ? 'bg-gray-150 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
                      : 'bg-wood-950 hover:bg-wood-900 text-white'
                  }`}
                >
                  <FileDown className="w-4 h-4 text-amber-500" />
                  <span>Export Zipped Archive ({selectedBulkJobIds.length})</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}

        {/* MODAL: Edit Existing Payment Installment */}
        {showEditPaymentModal && editingPaymentItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>Edit Payment Installment</span>
                  </h3>
                  <p className="text-xs text-wood-200">Update payment details for {editingPaymentItem.job.title}</p>
                </div>
                <button 
                  onClick={() => setShowEditPaymentModal(false)}
                  className="text-wood-300 hover:text-white font-bold p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePaymentSubmit} className="p-6 space-y-4">
                {editPaymentError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{editPaymentError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Payment Amount (Le) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    value={editPaymentAmount}
                    onChange={(e) => {
                      setEditPaymentAmount(Number(e.target.value));
                      setEditPaymentError(null);
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-emerald-800 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cleared Method *</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer / wire</option>
                    <option value="Check">Check Clearance</option>
                    <option value="Mobile Money">Mobile Money (Momo)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={editPaymentDate}
                    onChange={(e) => setEditPaymentDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Reference / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Initial deposit / Milestone clear"
                    value={editPaymentNote}
                    onChange={(e) => setEditPaymentNote(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm text-gray-700"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditPaymentModal(false);
                      setEditPaymentError(null);
                    }}
                    className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="py-2.5 px-5 rounded-xl bg-wood-800 hover:bg-wood-900 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Save Payment Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL: Delete Payment Installment Confirmation */}
        {paymentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-red-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-red-900 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-300" />
                  <h3 className="font-display font-bold text-base">Delete Installment Payment</h3>
                </div>
                <button
                  onClick={() => setPaymentToDelete(null)}
                  className="text-red-300 hover:text-white font-bold p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete payment installment{' '}
                  <strong className="font-mono text-red-950 font-bold">#{paymentToDelete.payment.id}</strong>?
                </p>

                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs space-y-1.5 font-medium text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount:</span>
                    <span className="font-mono font-bold text-red-900">{formatCurrency(paymentToDelete.payment.amount, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method:</span>
                    <span className="font-bold text-gray-800">{paymentToDelete.payment.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-mono">{paymentToDelete.payment.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order / Client:</span>
                    <span className="font-semibold text-gray-800 truncate max-w-[200px]">{paymentToDelete.job.customerName}</span>
                  </div>
                  {paymentToDelete.payment.note && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Note:</span>
                      <span className="text-gray-600 truncate max-w-[200px]">{paymentToDelete.payment.note}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-500 italic">
                  This will remove the payment record from this order and register an audit log entry for accounting transparency.
                </p>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setPaymentToDelete(null)}
                    className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeletePayment}
                    className="py-2.5 px-5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm & Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}


// ==========================================
// PROGRAMMATIC HIGH-FIDELITY PDF GENERATOR
// ==========================================
export { buildInvoicePdfContent, buildReceiptPdfContent } from "../utils/pdfGenerator";
