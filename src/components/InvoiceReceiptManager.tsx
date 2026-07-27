import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Job, Customer, Employee, formatCurrency, JobPayment, FinancialCategory, SavedInvoice, SavedInvoiceItem } from '../types';
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
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

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

interface InvoiceReceiptManagerProps {
  jobs: Job[];
  customers: Customer[];
  currentUser: Employee | null;
  invoiceJobId?: string | null;
  initialSubTab?: 'INVOICE' | 'SAVED_INVOICES' | 'RECEIPT';
  onClearInvoiceJobId?: () => void;
  onUpdateJob?: (updatedJob: Job) => void;
}

export default function InvoiceReceiptManager({
  jobs,
  customers,
  currentUser,
  invoiceJobId,
  initialSubTab = 'INVOICE',
  onClearInvoiceJobId,
  onUpdateJob
}: InvoiceReceiptManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id || null);
  
  // Top level tabs: Invoice Workspace vs Saved Invoices Directory vs Receipt Workspace
  const [subTab, setSubTab] = useState<'INVOICE' | 'SAVED_INVOICES' | 'RECEIPT'>('INVOICE');

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
  const [invoiceCompany, setInvoiceCompany] = useState("SWED WOOD WORK");
  const [invoiceCompanyContact, setInvoiceCompanyContact] = useState("Corporate Carpentry, Woodwork, Timber Logistics & Design.\nFreetown Workshop & Site Installations.\nSierra Leone Office: Wilkinson Road, Freetown.\nContact: info@swedwoodwork.com | +232 76 112 3344");
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
  const [receiptCompany, setReceiptCompany] = useState("SWED WOOD WORK");
  const [receiptCompanySub, setReceiptCompanySub] = useState("Wilkinson Road, Freetown, Sierra Leone • Official Commission Receipt");
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
    if (activeInvoice) {
      if (invoiceTemplate === 'SWEDS_WOOD') {
        setInvoiceCompany("Sweds Wood Enterprise");
        setInvoiceCompanyContact("2 Sweds free Avenue");
        setInvoiceTerms("");
        setInvoiceBankInstructions("");
        setInvoiceCustomerMessage("Please examine all dimensions on delivery. Thank you for choosing Sweds Wood Enterprise!");
      } else {
        setInvoiceCompany("SWED WOOD WORK");
        setInvoiceCompanyContact("Corporate Carpentry, Woodwork, Timber Logistics & Design.\nFreetown Workshop & Site Installations.\nSierra Leone Office: Wilkinson Road, Freetown.\nContact: info@swedwoodwork.com | +232 76 112 3344");
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

      setInvoiceCommissionAmount(activeInvoice.quoteAmount);
      setCustomInvoiceItems([]);
      
      setInvoicePreparedBy("");
    }
  }, [activeInvoice, customers, currentUser, invoiceTemplate]);

  // Sync Receipt local editable states when an activeReceipt is selected/opened
  useEffect(() => {
    if (activeReceipt) {
      setReceiptCompany("SWED WOOD WORK");
      setReceiptCompanySub("Wilkinson Road, Freetown, Sierra Leone • Official Commission Receipt");
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
    const subtotal = baseComm + baseCustom;
    
    const discountAmount = 0;
    const taxableAmount = subtotal;
    const taxAmount = (taxableAmount * taxPercent) / 100;
    const finalTotal = taxableAmount + taxAmount;
    
    const totalPaid = activeInvoice ? activeInvoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    const outstanding = finalTotal - totalPaid;

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
    setCustomInvoiceItems(saved.items);
    setEditingSavedInvoiceId(saved.id);
    setInvoiceStatus(saved.status);
    setSubTab('INVOICE');
    setInvoicePdfMode('VIEW');
  };

  const handleDeleteSavedInvoice = (id: string) => {
    setSavedInvoices(prev => prev.filter(inv => inv.id !== id));
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

  const handleDownloadSinglePdf = () => {
    if (!activeInvoice) return;
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
      invoiceProjectQty
    );
    const cleanName = (invoiceCustomerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Invoice_${invoiceNo || '042'}_${cleanName}.pdf`);
  };

  const handleBulkPdfExport = async () => {
    if (selectedBulkJobIds.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const zip = new JSZip();
      const selectedJobs = jobs.filter(job => selectedBulkJobIds.includes(job.id));
      
      let count = 0;
      for (const job of selectedJobs) {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const customer = customers.find(c => c.id === job.customerId);
        
        buildInvoicePdfContent(doc, job, customer, bulkTemplate, currentUser);
        
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
      
      {/* Print styles override (Only prints print-area with white font) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
            color: #ffffff !important;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #020617 !important;
            color: #ffffff !important;
            padding: 1cm !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-area input,
          #print-area textarea,
          #print-area select,
          #print-area p,
          #print-area span,
          #print-area h1, #print-area h2, #print-area h3, #print-area h4, #print-area h5,
          #print-area td, #print-area th, #print-area div {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            outline: none !important;
            color: #ffffff !important;
            font-weight: inherit !important;
            font-size: inherit !important;
            appearance: none !important;
            -webkit-appearance: none !important;
            resize: none !important;
          }
          .no-print {
            display: none !important;
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
                            <div className="font-mono font-black text-gray-900 text-sm">Le {inv.subtotal.toLocaleString()}</div>
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
                                  setTimeout(() => window.print(), 100);
                                }}
                                className="p-1.5 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 rounded-lg transition cursor-pointer"
                                title="Print Invoice"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  handleLoadSavedInvoice(inv);
                                  setTimeout(() => handleDownloadSinglePdf(), 100);
                                }}
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
                        Generate & print an official 100% payment clearance receipt for client <strong className="text-white">{selectedJob.customerName}</strong> including 300x300 digital signature & official stamp.
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

                            <div className="flex items-center gap-3">
                              <span className="font-bold font-mono text-emerald-700">{formatCurrency(p.amount, 0)}</span>
                              <button
                                onClick={() => {
                                  setActiveReceipt({ job: selectedJob, payment: p });
                                  setReceiptPdfMode('VIEW');
                                }}
                                className="px-3 py-1.5 text-[10px] font-black uppercase text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition shadow-2xs"
                              >
                                Open PDF Receipt
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                          <tr className="bg-[#38bdf8] border-b border-gray-400 text-white font-black uppercase text-[10px] tracking-wider">
                            <th className="py-2 px-3 border-r border-gray-400 text-left w-7/12 font-black text-white">Description</th>
                            <th className="py-2 px-3 border-r border-gray-400 text-center w-1/12 font-black text-white bg-[#0f52ba]">Qty</th>
                            <th className="py-2 px-3 border-r border-gray-400 text-right w-2/12 font-black text-white">Price</th>
                            <th className="py-2 px-3 text-right w-2/12 font-black text-white">Total</th>
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
                                    <span className="qty-data inline-block font-mono font-black text-white bg-[#0f52ba] px-2.5 py-0.5 rounded text-xs !text-white !font-black print:!text-white print:!font-black shadow-2xs">
                                      {invoiceProjectQty || 1}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={invoiceProjectQty === 0 ? '' : invoiceProjectQty}
                                      onChange={(e) => setInvoiceProjectQty(e.target.value === '' ? '' : e.target.value)}
                                      className="w-14 text-center font-mono font-black text-xs border border-blue-400 rounded px-1 py-0.5 bg-[#0f52ba] text-white print:hidden font-bold"
                                    />
                                  </>
                                ) : (
                                  <span className="qty-data inline-block font-mono font-black text-white bg-[#0f52ba] px-2.5 py-0.5 rounded text-xs !text-white !font-black print:!text-white print:!font-black shadow-2xs">
                                    {invoiceProjectQty || 1}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 border-r border-gray-400 text-right font-mono font-bold text-gray-700">
                                {invoicePdfMode === 'EDIT' ? (
                                  <>
                                    <span className="hidden print:inline font-mono font-bold text-gray-700">
                                      SLL {invoiceCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={invoiceCommissionAmount}
                                      onChange={(e) => setInvoiceCommissionAmount(Number(e.target.value))}
                                      className="w-24 text-right border border-blue-300 rounded px-1.5 py-0.5 font-bold font-mono text-xs bg-white print:hidden"
                                    />
                                  </>
                                ) : (
                                  `SLL ${invoiceCommissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black text-gray-800">
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
                                      <span className="qty-data inline-block font-mono font-black text-white bg-[#0f52ba] px-2.5 py-0.5 rounded text-xs !text-white !font-black print:!text-white print:!font-black shadow-2xs">
                                        {qty}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.quantity === 0 ? '' : (item.quantity ?? qty)}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'quantity', e.target.value)}
                                        className="w-14 text-center font-mono font-black text-xs border border-blue-400 rounded px-1 py-0.5 bg-[#0f52ba] text-white print:hidden font-bold"
                                      />
                                    </>
                                  ) : (
                                    <span className="qty-data inline-block font-mono font-black text-white bg-[#0f52ba] px-2.5 py-0.5 rounded text-xs !text-white !font-black print:!text-white print:!font-black shadow-2xs">
                                      {qty}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 border-r border-gray-400 text-right font-mono font-bold text-gray-700">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="hidden print:inline font-mono font-bold text-gray-700">
                                        SLL {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={unitPrice}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'unitPrice', e.target.value)}
                                        className="w-24 text-right font-mono font-bold text-xs border border-blue-300 rounded px-1 py-0.5 bg-white print:hidden"
                                      />
                                    </>
                                  ) : (
                                    `SLL ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-black text-gray-800">
                                  {invoicePdfMode === 'EDIT' ? (
                                    <>
                                      <span className="hidden print:inline font-mono font-black text-gray-800">
                                        SLL {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={totalAmount}
                                        onChange={(e) => handleUpdateCustomItem(item.id, 'amount', e.target.value)}
                                        className="w-28 text-right font-mono font-black text-xs border border-blue-300 rounded px-1 py-0.5 bg-white print:hidden"
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
                          {Array.from({ length: Math.max(1, 10 - (Number(invoiceCommissionAmount) > 0 ? 1 : 0) - customInvoiceItems.length) }).map((_, idx) => (
                            <tr key={`empty-${idx}`} className="h-8">
                              <td className="border-r border-gray-400"></td>
                              <td className="border-r border-gray-400"></td>
                              <td className="border-r border-gray-400"></td>
                              <td></td>
                            </tr>
                          ))}
                        </tbody>
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
                        <div className="border border-gray-400 bg-white rounded-xs overflow-hidden shadow-xs">
                          <div className="bg-slate-900 text-white flex justify-between items-center px-4 py-3 border-b border-gray-400">
                            <span className="font-sans font-black text-xs uppercase tracking-wider">Subtotal</span>
                            <span className="font-mono font-black text-sm">
                              SLL {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {totals.totalPaid > 0 && (
                            <div className="p-2.5 space-y-1.5 text-[11px] font-semibold text-[#1e3a8a] bg-[#e0f2fe]/40">
                              <div className="flex justify-between text-gray-500">
                                <span>Total Amount:</span>
                                <span className="font-mono">SLL {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-emerald-800 font-bold">
                                <span>Less Paid Deposits:</span>
                                <span className="font-mono">-SLL {totals.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="border-t border-dashed border-gray-300 pt-1 flex justify-between text-red-700 font-black">
                                <span>Balance Due:</span>
                                <span className="font-mono">SLL {totals.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Signatures and Official Stamp (Horizontal Line & Compact User-Uploaded Images) */}
                    <div className="mt-8 pt-5 border-t border-gray-200 flex flex-row items-end justify-between gap-4 sm:gap-8">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-gray-700 font-bold text-[10px] sm:text-xs uppercase tracking-wider">
                            Authorized Signatory:
                          </p>
                          <label className="text-[10px] text-blue-800 font-extrabold hover:underline cursor-pointer flex items-center gap-1 no-print shrink-0 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition">
                            <Upload className="w-3 h-3 text-blue-700" />
                            <span>Upload Signature</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload300(e, 'signature')}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {showSignature && (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed border-blue-300 rounded-lg p-1 bg-blue-50/20 flex items-center justify-center relative group">
                            <img
                              src={signatureImageUrl}
                              alt="Authorized Signature"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <p className="text-red-800 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider">
                            Official Stamp / Seal:
                          </p>
                          <label className="text-[10px] text-red-800 font-extrabold hover:underline cursor-pointer flex items-center gap-1 no-print shrink-0 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition">
                            <Upload className="w-3 h-3 text-red-700" />
                            <span>Upload Stamp</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload300(e, 'stamp')}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {showStamp && (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed border-red-300 rounded-lg p-1 bg-red-50/30 flex items-center justify-center relative group ml-auto">
                            <img
                              src={stampImageUrl}
                              alt="Official Stamp"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
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
                                    <span className="qty-data inline-block bg-wood-950 text-white font-black px-2 py-0.5 rounded text-xs !text-white !font-black print:!text-white print:!font-black shadow-2xs">
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
                                      <span className="qty-data inline-block bg-wood-950 text-white font-black px-2 py-0.5 rounded text-xs !text-white !font-black print:!text-white print:!font-black shadow-2xs">
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
                        <h5 className="font-extrabold text-wood-950 uppercase tracking-widest text-[9px] mb-1.5">SWED WOOD WORK CLEARANCE INSTRUCTIONS:</h5>
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

                        <div className="border-t border-gray-200 pt-2 flex justify-between text-gray-800">
                          <span className="font-black text-sm uppercase tracking-wider text-wood-950">Grand Total Invoice:</span>
                          <span className="font-mono font-black text-sm text-wood-950">{formatCurrency(totals.finalTotal)}</span>
                        </div>

                        <div className="flex justify-between text-emerald-800 bg-emerald-50/30 px-2 py-1 rounded-lg">
                          <span className="text-[9px] uppercase font-bold">Less Paid Deposits:</span>
                          <span className="font-mono font-bold">-{formatCurrency(totals.totalPaid)}</span>
                        </div>

                        <div className="border-t-2 border-dashed border-gray-300 pt-2 flex justify-between text-red-700">
                          <span className="font-bold text-xs uppercase">Net Balance Due:</span>
                          <span className="font-mono font-bold text-xs">{formatCurrency(totals.outstanding)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom official Signatures & Stamp block (Horizontal Line & Compact User-Uploaded Images) */}
                    <div className="mt-8 pt-5 border-t border-gray-200 flex flex-row items-end justify-between gap-4 sm:gap-8">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-gray-700 font-bold text-[10px] sm:text-xs uppercase tracking-wider">
                            Authorized Signatory:
                          </p>
                          <label className="text-[10px] text-wood-800 font-extrabold hover:underline cursor-pointer flex items-center gap-1 no-print shrink-0 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition">
                            <Upload className="w-3 h-3 text-wood-800" />
                            <span>Upload Signature</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload300(e, 'signature')}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {showSignature && (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed border-gray-300 rounded-lg p-1 bg-white flex items-center justify-center relative group">
                            <img
                              src={signatureImageUrl}
                              alt="Authorized Signature"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <p className="text-red-800 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider">
                            Official Stamp / Seal:
                          </p>
                          <label className="text-[10px] text-red-800 font-extrabold hover:underline cursor-pointer flex items-center gap-1 no-print shrink-0 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition">
                            <Upload className="w-3 h-3 text-red-700" />
                            <span>Upload Stamp</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload300(e, 'stamp')}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {showStamp && (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed border-red-300 rounded-lg p-1 bg-red-50/20 flex items-center justify-center relative group ml-auto">
                            <img
                              src={stampImageUrl}
                              alt="Official Stamp"
                              className="w-full h-full object-contain"
                            />
                          </div>
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
                    All customized SWED WOOD WORK timber, carving, hardware assembly, and polishing commissions are subject to official delivery clearance terms.
                  </p>
                </div>

                {/* Bottom Signatures & Official Stamp (Horizontal Line & Compact User-Uploaded Images) */}
                <div className="mt-8 pt-5 border-t border-gray-200 flex flex-row items-end justify-between gap-4 sm:gap-8">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-emerald-950 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider">
                        Received By (Authorized Signatory):
                      </p>
                      <label className="text-[10px] text-emerald-800 font-extrabold hover:underline cursor-pointer flex items-center gap-1 no-print shrink-0 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition">
                        <Upload className="w-3 h-3 text-emerald-800" />
                        <span>Upload Signature</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload300(e, 'signature')}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {receiptPdfMode === 'EDIT' && (
                      <input
                        type="text"
                        value={receiptReceivedBy}
                        onChange={(e) => setReceiptReceivedBy(e.target.value)}
                        className="font-serif italic text-emerald-900 border-b border-gray-300 bg-amber-50/50 rounded px-2 py-0.5 text-xs w-full mb-1"
                        placeholder="Cashier / Signatory Name"
                      />
                    )}
                    {showSignature && (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed border-emerald-300 rounded-lg p-1 bg-emerald-50/30 flex items-center justify-center relative group">
                        <img
                          src={signatureImageUrl}
                          alt="Authorized Signature"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <p className="text-[9px] text-gray-500 font-bold uppercase">{receiptReceivedBy || 'Authorized Cashier Signature'}</p>
                  </div>

                  <div className="space-y-1.5 flex-1 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <p className="text-red-800 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider">
                        Official Clearance Stamp / Seal:
                      </p>
                      <label className="text-[10px] text-red-800 font-extrabold hover:underline cursor-pointer flex items-center gap-1 no-print shrink-0 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition">
                        <Upload className="w-3 h-3 text-red-700" />
                        <span>Upload Stamp</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload300(e, 'stamp')}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {showStamp && (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed border-red-300 rounded-lg p-1 bg-red-50/30 flex items-center justify-center relative group ml-auto">
                        <img
                          src={stampImageUrl}
                          alt="Official Stamp"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
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
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// PROGRAMMATIC HIGH-FIDELITY PDF GENERATOR
// ==========================================
export function buildInvoicePdfContent(
  doc: any, // Use jsPDF instance
  job: Job,
  customer: Customer | undefined,
  template: 'SWEDS_WOOD' | 'MODERN',
  currentUser: Employee | null,
  customItems?: CustomInvoiceItem[],
  invoiceNoOverride?: string,
  dateOverride?: string,
  customerNameOverride?: string,
  addressOverride?: string,
  phoneOverride?: string,
  emailOverride?: string,
  customerMessageOverride?: string,
  projectTitleOverride?: string,
  projectDescriptionOverride?: string,
  commissionAmountOverride?: number,
  projectQtyOverride?: number | string
) {
  const isSwedsWood = template === 'SWEDS_WOOD';
  const projectTitle = projectTitleOverride || job.title;
  const projectDescription = projectDescriptionOverride || job.description;
  const commissionAmount = commissionAmountOverride !== undefined ? commissionAmountOverride : job.quoteAmount;
  
  if (isSwedsWood) {
    // SWEDS WOOD ENTERPRISE OFFICIAL PAPER STYLE
    doc.setDrawColor(219, 234, 254);
    doc.setLineWidth(0.3);
    doc.rect(10, 10, 190, 277, 'S');

    // Terracotta Sunburst Logo Disc vector
    const logoX = 25;
    const logoY = 27;
    doc.setFillColor(155, 55, 31);
    doc.circle(logoX, logoY, 9, 'F');

    // White sunburst rays inside disc
    doc.setLineWidth(0.6);
    doc.setDrawColor(255, 255, 255);
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      const startX = logoX + Math.cos(rad) * 3.5;
      const startY = logoY + Math.sin(rad) * 3.5;
      const endX = logoX + Math.cos(rad) * 7;
      const endY = logoY + Math.sin(rad) * 7;
      doc.line(startX, startY, endX, endY);
    }

    doc.setFillColor(255, 255, 255);
    doc.circle(logoX, logoY, 2.5, 'F');

    // Company Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 82, 186);
    doc.text("SWEDS WOOD ENTERPRISE", 40, 27);
    
    doc.setFillColor(15, 82, 186);
    doc.rect(40, 30, 75, 1.2, 'F');
    
    // Invoice Badge Box
    doc.setFillColor(56, 189, 248);
    doc.setDrawColor(15, 82, 186);
    doc.setLineWidth(0.6);
    doc.rect(135, 18, 60, 16, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", 135 + 30, 18 + 10.5, { align: 'center' });

    // Metadata Small Table
    const tableX = 15;
    const tableY = 44;
    const col1Width = 30;
    const col2Width = 65;
    const rowHeight = 6.5;
    
    const invNoStr = invoiceNoOverride || `042`;
    const invDateStr = dateOverride || job.startDate;

    const metaData = [
      { label: "Invoice No.", val: invNoStr },
      { label: "Address", val: "2 Sweds free Avenue" },
      { label: "Date", val: invDateStr },
      { label: "Terms (days)", val: "COD / Standard" }
    ];
    
    doc.setLineWidth(0.2);
    doc.setDrawColor(156, 163, 175);
    
    for (let i = 0; i < 4; i++) {
      const currentY = tableY + i * rowHeight;
      doc.setFillColor(224, 242, 254);
      doc.rect(tableX, currentY, col1Width, rowHeight, 'FD');
      
      doc.setFillColor(255, 255, 255);
      doc.rect(tableX + col1Width, currentY, col2Width, rowHeight, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 82, 186);
      doc.text(metaData[i].label, tableX + 3, currentY + 4.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      doc.text(metaData[i].val, tableX + col1Width + 3, currentY + 4.5);
    }

    // Customer Information Box
    const custY = 76;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 82, 186);
    doc.text("Invoice to:", 15, custY);
    
    const boxY = custY + 2;
    const boxHeight = 22;
    doc.setLineWidth(0.2);
    doc.setDrawColor(156, 163, 175);
    doc.setFillColor(255, 255, 255);
    doc.rect(15, boxY, 180, boxHeight, 'FD');
    
    doc.setFillColor(224, 242, 254);
    doc.rect(15, boxY, 180, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 82, 186);
    doc.text("CUSTOMER INFORMATION", 18, boxY + 3.5);
    
    const cName = customerNameOverride || job.customerName;
    const cPhone = phoneOverride !== undefined ? phoneOverride : (customer?.phone || "");
    const cAddr = addressOverride || customer?.address || "";
    const cEmail = emailOverride !== undefined ? emailOverride : (customer?.email || "");

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("NAME:", 18, boxY + 10);
    doc.setTextColor(17, 24, 39);
    doc.text(cName, 32, boxY + 10);
    
    doc.setTextColor(75, 85, 99);
    doc.text("MOBILE:", 115, boxY + 10);
    doc.setTextColor(17, 24, 39);
    doc.text(cPhone, 130, boxY + 10);
    
    doc.setTextColor(75, 85, 99);
    doc.text("ADDRESS:", 18, boxY + 16);
    doc.setTextColor(17, 24, 39);
    doc.text(cAddr, 32, boxY + 16);
    
    doc.setTextColor(75, 85, 99);
    doc.text("EMAIL:", 115, boxY + 16);
    doc.setTextColor(17, 24, 39);
    doc.text(cEmail, 130, boxY + 16);

    // Ledger Table
    const ledY = 105;
    const ledCol1 = 110;
    const ledCol2 = 15;
    const ledCol3 = 25;
    const ledCol4 = 30;
    
    doc.setFillColor(56, 189, 248);
    doc.rect(15, ledY, 180, 8, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Description", 15 + 4, ledY + 5.5);
    doc.text("Qty", 15 + ledCol1 + 4, ledY + 5.5, { align: 'center' });
    doc.text("Price", 15 + ledCol1 + ledCol2 + ledCol3 - 4, ledY + 5.5, { align: 'right' });
    doc.text("Total", 15 + ledCol1 + ledCol2 + ledCol3 + ledCol4 - 4, ledY + 5.5, { align: 'right' });
    
    const tableBottomY = 195;
    const tableRowHeight = 8;
    const totalRowsCount = 10;
    
    // Items rendering
    let itemsToRender: { desc: string; qty: string; price: number; total: number }[] = [];
    if (customItems && customItems.length > 0) {
      itemsToRender = customItems.map(item => {
        const qtyNum = item.quantity !== undefined ? item.quantity : (parseFloat(item.unitRate) || 1);
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.amount;
        const lineTotal = qtyNum * unitPrice;
        return {
          desc: item.description,
          qty: String(qtyNum),
          price: unitPrice,
          total: lineTotal
        };
      });
      if (commissionAmount > 0 && !customItems.some(i => i.description.includes(projectTitle))) {
        const projQtyNum = parseFloat(String(projectQtyOverride)) || 1;
        itemsToRender.unshift({
          desc: projectTitle,
          qty: String(projQtyNum),
          price: commissionAmount,
          total: commissionAmount * projQtyNum
        });
      }
    } else {
      const projQtyNum = parseFloat(String(projectQtyOverride)) || 1;
      itemsToRender = [{
        desc: projectTitle,
        qty: String(projQtyNum),
        price: commissionAmount,
        total: commissionAmount * projQtyNum
      }];
    }

    let subtotalVal = 0;
    itemsToRender.forEach((it, idx) => {
      subtotalVal += it.total;
      const currentY = ledY + 8 + idx * tableRowHeight;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      doc.text(it.desc, 19, currentY + 5.5);
      
      // Draw solid blue badge box for Qty data
      doc.setFillColor(15, 82, 186); // #0f52ba
      doc.roundedRect(15 + ledCol1 + 2, currentY + 1.2, ledCol2 - 4, 5.5, 1, 1, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255); // Solid Bold White
      doc.text(it.qty, 15 + ledCol1 + (ledCol2 / 2), currentY + 5.2, { align: 'center' });
      
      doc.setFont('helvetica', 'bold');
      const pStr = `SLL ${it.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      const tStr = `SLL ${it.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      doc.text(pStr, 15 + ledCol1 + ledCol2 + ledCol3 - 4, currentY + 5.5, { align: 'right' });
      doc.text(tStr, 15 + ledCol1 + ledCol2 + ledCol3 + ledCol4 - 4, currentY + 5.5, { align: 'right' });
    });
    
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.15);
    for (let r = 0; r <= totalRowsCount; r++) {
      const currentY = ledY + 8 + r * tableRowHeight;
      doc.line(15, currentY, 195, currentY);
    }
    
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.2);
    doc.line(15, ledY, 15, tableBottomY);
    doc.line(15 + ledCol1, ledY, 15 + ledCol1, tableBottomY);
    doc.line(15 + ledCol1 + ledCol2, ledY, 15 + ledCol1 + ledCol2, tableBottomY);
    doc.line(15 + ledCol1 + ledCol2 + ledCol3, ledY, 15 + ledCol1 + ledCol2 + ledCol3, tableBottomY);
    doc.line(195, ledY, 195, tableBottomY);

    // Footer Totals Section
    const totY = 202;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(156, 163, 175);
    doc.text("Customer Message", 15, totY);
    
    doc.setDrawColor(156, 163, 175);
    doc.setFillColor(255, 255, 255);
    doc.rect(15, totY + 2, 100, 20, 'FD');
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    const msgText = customerMessageOverride !== undefined ? customerMessageOverride : "Please examine all dimensions on delivery. Thank you for choosing Sweds Wood Enterprise!";
    const messageLines = doc.splitTextToSize(msgText, 94);
    doc.text(messageLines, 18, totY + 7);
    
    const totalPaid = job.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = subtotalVal - totalPaid;
    
    doc.setFillColor(17, 24, 39);
    doc.rect(122, totY + 2, 73, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Subtotal", 125, totY + 6.5);
    const subtotalStr = `SLL ${subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    doc.text(subtotalStr, 191, totY + 6.5, { align: 'right' });
    
    if (totalPaid > 0) {
      doc.setDrawColor(156, 163, 175);
      doc.setFillColor(248, 250, 252);
      doc.rect(122, totY + 9, 73, 13, 'FD');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text("Total Quoted Amount:", 125, totY + 13.5);
      doc.text(subtotalStr, 191, totY + 13.5, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text("Less Paid Deposits:", 125, totY + 17);
      const paidStr = `- SLL ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      doc.text(paidStr, 191, totY + 17, { align: 'right' });
      
      doc.setDrawColor(209, 213, 219);
      doc.line(122, totY + 18.5, 195, totY + 18.5);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text("Balance Due:", 125, totY + 21);
      const balanceStr = `SLL ${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      doc.text(balanceStr, 191, totY + 21, { align: 'right' });
    }

    // Signatures and Stamp
    const sigY = 238;
    const sigImg = localStorage.getItem('swedswood_signature_300') || DEFAULT_300X300_SIGNATURE;
    const stampImg = localStorage.getItem('swedswood_stamp_300') || DEFAULT_300X300_STAMP;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 82, 186);
    doc.text("Authorized Signature:", 20, sigY);

    try {
      doc.addImage(sigImg, 'PNG', 20, sigY + 2, 28, 28);
    } catch (err) {
      doc.setLineWidth(0.3);
      doc.setDrawColor(156, 163, 175);
      doc.line(20, sigY + 22, 80, sigY + 22);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text("Official Stamp / Seal:", 120, sigY);

    try {
      doc.addImage(stampImg, 'PNG', 120, sigY + 2, 28, 28);
    } catch (err) {
      doc.setLineWidth(0.3);
      doc.setDrawColor(185, 28, 28);
      doc.line(120, sigY + 22, 180, sigY + 22);
    }
    
  } else {
    // MODERN DIGITAL PROFESSIONAL TEMPLATE
    doc.setDrawColor(245, 245, 244);
    doc.setLineWidth(0.3);
    doc.rect(10, 10, 190, 277, 'S');

    // Header
    doc.setFillColor(69, 26, 3);
    doc.rect(15, 15, 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("W", 18.5, 21.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(69, 26, 3);
    doc.text("SWED WOOD WORK", 28, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text("Corporate Carpentry, Woodwork, Timber Logistics & Design.", 28, 24);

    doc.setFontSize(6.5);
    const contactText = "Freetown Workshop & Site Installations.\nSierra Leone Office: Wilkinson Road, Freetown.\nContact: info@swedwoodwork.com | +232 76 112 3344";
    doc.text(contactText, 15, 30);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(69, 26, 3);
    doc.text("COMMERCIAL INVOICE", 195, 20, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    
    const modernInvNo = invoiceNoOverride || `INV-${job.id.slice(4).toUpperCase()}`;
    const modernInvDate = dateOverride || job.startDate;
    const modernCustName = customerNameOverride || job.customerName;
    const modernCustPhone = phoneOverride !== undefined ? phoneOverride : (customer?.phone || "N/A");
    const modernCustEmail = emailOverride !== undefined ? emailOverride : (customer?.email || "N/A");
    const modernCustAddr = addressOverride || customer?.address || "N/A";

    doc.text(`Invoice No: ${modernInvNo}`, 195, 26, { align: 'right' });
    doc.text(`Date: ${modernInvDate}`, 195, 31, { align: 'right' });
    doc.text(`Terms: Payment Clear / Standard Log`, 195, 36, { align: 'right' });

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.4);
    doc.line(15, 46, 195, 46);

    // Side-by-side containers
    const blockWidth = 87;
    const blockHeight = 28;
    
    // Client
    doc.setFillColor(245, 245, 244);
    doc.rect(15, 51, blockWidth, blockHeight, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(15, 51, blockWidth, blockHeight, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(69, 26, 3);
    doc.text("CLIENT DEPOSITOR:", 18, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text(modernCustName, 18, 62);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    doc.text(`Phone: ${modernCustPhone}`, 18, 67);
    doc.text(`Email: ${modernCustEmail}`, 18, 71);
    doc.text(`Delivery: ${modernCustAddr}`, 18, 75);

    // Project Details
    doc.setFillColor(245, 245, 244);
    doc.rect(108, 51, blockWidth, blockHeight, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(108, 51, blockWidth, blockHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(69, 26, 3);
    doc.text("PROJECT / DESIGN FOCUS:", 111, 56);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text(projectTitle, 111, 62);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    const splitProjDesc = doc.splitTextToSize(projectDescription || "Custom hand-crafted carpentry order.", blockWidth - 8);
    doc.text(splitProjDesc, 111, 67);
    doc.text(`Workshop Timeline: ${job.startDate} to ${job.dueDate}`, 111, 75);

    // Items Table
    const tableY = 86;
    doc.setFillColor(69, 26, 3);
    doc.rect(15, tableY, 180, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Itemized Production Scope & Timber Milling", 19, tableY + 5.5);
    doc.text("Unit Rate / Size", 130, tableY + 5.5);
    doc.text("Cleared Value", 191, tableY + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    doc.text(projectTitle, 19, tableY + 14);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text("Fine assembly, wood joinery, sanding, and hand polished finish.", 19, tableY + 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    doc.text("Flat commission", 130, tableY + 14);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    const quotePriceStr = `Le ${commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
    doc.text(quotePriceStr, 191, tableY + 14, { align: 'right' });

    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.line(15, tableY + 8, 195, tableY + 8);
    doc.line(15, tableY + 23, 195, tableY + 23);
    doc.line(15, tableY, 15, tableY + 105);
    doc.line(195, tableY, 195, tableY + 105);
    doc.line(15, tableY + 105, 195, tableY + 105);

    // Totals Section
    const botY = 198;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(69, 26, 3);
    doc.text("Payment Instructions & Bank Log:", 15, botY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);
    const bankInstructionsText = `Standard bank wires are accepted at Sierra Leone Commercial Bank (SLCB) Freetown.\nSwift Address: SLCBSLFRXXX • Account: 003-09415-2831\nPlease specify invoice reference: INV-${job.id.slice(4).toUpperCase()}`;
    doc.text(bankInstructionsText, 15, botY + 4.5);

    const totalPaid = job.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = job.quoteAmount - totalPaid;

    const calcX = 125;
    const calcWidth = 70;
    
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(245, 245, 244);
    doc.rect(calcX, botY, calcWidth, 24, 'FD');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Total Value:", calcX + 3, botY + 5.5);
    doc.text(quotePriceStr, calcX + calcWidth - 3, botY + 5.5, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text("Paid Deposits:", calcX + 3, botY + 11.5);
    const paidStrVal = `- Le ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
    doc.text(paidStrVal, calcX + calcWidth - 3, botY + 11.5, { align: 'right' });
    
    doc.line(calcX, botY + 14.5, calcX + calcWidth, botY + 14.5);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text("Outstanding:", calcX + 3, botY + 20);
    const outStrVal = `Le ${outstanding.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
    doc.text(outStrVal, calcX + calcWidth - 3, botY + 20, { align: 'right' });

    // Signatures and Official Stamp
    const sigY = 238;
    const sigImg = localStorage.getItem('swedswood_signature_300') || DEFAULT_300X300_SIGNATURE;
    const stampImg = localStorage.getItem('swedswood_stamp_300') || DEFAULT_300X300_STAMP;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(69, 26, 3);
    doc.text("Authorized Signature:", 20, sigY);

    try {
      doc.addImage(sigImg, 'PNG', 20, sigY + 2, 28, 28);
    } catch (err) {
      doc.setLineWidth(0.3);
      doc.setDrawColor(156, 163, 175);
      doc.line(20, sigY + 22, 80, sigY + 22);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text("Official Clearance Seal:", 120, sigY);

    try {
      doc.addImage(stampImg, 'PNG', 120, sigY + 2, 28, 28);
    } catch (err) {
      doc.setLineWidth(0.3);
      doc.setDrawColor(185, 28, 28);
      doc.line(120, sigY + 22, 180, sigY + 22);
    }
  }
}
