import React, { useState, useEffect } from 'react';
import { Customer, Job, Employee, SavedInvoice, SavedInvoiceItem, formatCurrency } from '../types';
import { saveDocument, deleteDocument, subscribeToCollection } from '../lib/firestoreService';
import { INITIAL_SAVED_INVOICES } from '../data';
import { buildProformaInvoicePdfContent, ProformaPdfItem, getLogoDataUrl } from '../utils/pdfGenerator';
import { jsPDF } from 'jspdf';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Share2, 
  Save, 
  Plus, 
  Trash2, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Percent, 
  DollarSign, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Copy, 
  Check, 
  Eye, 
  Edit3, 
  Briefcase,
  AlertCircle,
  RefreshCw,
  Award,
  Layers,
  Image as ImageIcon,
  Upload,
  Loader2,
  Search,
  Filter,
  FolderOpen,
  X,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmailDispatchModal from './EmailDispatchModal';

interface ProformaInvoiceDeskProps {
  customers: Customer[];
  jobs: Job[];
  currentUser: Employee | null;
  initialCustomerId?: string | null;
  initialJobId?: string | null;
  initialProformaRecord?: SavedInvoice | null;
  onClearInitialParams?: () => void;
  onSaveInvoiceRecord?: (invoice: SavedInvoice) => void;
  onDeleteInvoiceRecord?: (id: string) => void;
  onCreateJob?: (job: Omit<Job, 'id' | 'materialsUsed' | 'payments'>) => void;
  onSwitchToSavedInvoices?: () => void;
  onGoBack?: () => void;
}

interface WoodworkPreset {
  title: string;
  species: string;
  dimensions: string;
  qty: number;
  rate: number;
}

const WOODWORK_PRESETS: WoodworkPreset[] = [
  {
    title: 'Executive Mahogany Conference Table (10-Seater)',
    species: 'Kiln-Dried African Mahogany • Mortise & Tenon Joinery',
    dimensions: '3200mm (L) x 1200mm (W) x 760mm (H)',
    qty: 1,
    rate: 18500000
  },
  {
    title: 'Solid Teak Double Front Entrance Door & Frame',
    species: 'Burma Teak Hardwood • Hand-Carved Diamond Panels • Weather-Sealed',
    dimensions: '2100mm (H) x 1800mm (W) x 50mm (Thick)',
    qty: 1,
    rate: 14200000
  },
  {
    title: 'Bespoke Fitted Kitchen Cabinetry Suite',
    species: 'Kiln-Dried Iroko Framework • Moisture-Resistant Marine Ply Interior',
    dimensions: 'Linear 6.5m Upper & Lower Modules with Soft-Close Hardware',
    qty: 1,
    rate: 28500000
  },
  {
    title: 'Orthopedic King Bedstead & Floating Headboard',
    species: 'Solid Rosewood / Sapele Hardwood • Reinforced Center Spine',
    dimensions: '2000mm (L) x 1900mm (W) with 2 Matching Nightstands',
    qty: 1,
    rate: 11800000
  },
  {
    title: 'Handcrafted Hardwood Dining Suite (Table + 8 Chairs)',
    species: 'Seasoned African Padauk • Ergonomic Slat Back Chairs • Natural Oil',
    dimensions: '2400mm x 1050mm Table with 8 Hand-Carved Dining Chairs',
    qty: 1,
    rate: 16800000
  },
  {
    title: 'Executive Credenza & Architectural Living Room Sideboard',
    species: 'Solid Cedar & Teak Accents • Dovetail Drawer Construction',
    dimensions: '2200mm (W) x 500mm (D) x 850mm (H) with Brass Hardware',
    qty: 1,
    rate: 9400000
  }
];

export default function ProformaInvoiceDesk({
  customers,
  jobs,
  currentUser,
  initialCustomerId,
  initialJobId,
  initialProformaRecord,
  onClearInitialParams,
  onSaveInvoiceRecord,
  onDeleteInvoiceRecord,
  onCreateJob,
  onSwitchToSavedInvoices,
  onGoBack
}: ProformaInvoiceDeskProps) {
  // Mode: Editor vs Preview vs Manage & Archive
  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW' | 'MANAGE'>('PREVIEW');
  const [editingProformaId, setEditingProformaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Draft' | 'Issued' | 'Accepted' | 'Expired' | 'Paid' | 'Cancelled'>('ALL');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isConvertingJob, setIsConvertingJob] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Archive & Database Persistence State
  const [allSavedInvoices, setAllSavedInvoices] = useState<SavedInvoice[]>(() => {
    try {
      const raw = localStorage.getItem('swedswood_saved_invoices');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return INITIAL_SAVED_INVOICES;
  });

  // Client Selection State
  const [clientType, setClientType] = useState<'EXISTING' | 'PROSPECT'>('EXISTING');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || (customers[0]?.id || '')
  );

  // Prospect / Custom Client Details
  const [prospectName, setProspectName] = useState('');
  const [prospectCompany, setProspectCompany] = useState('');
  const [prospectPhone, setProspectPhone] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [prospectAddress, setProspectAddress] = useState('Freetown, Sierra Leone');
  const [linkedJobId, setLinkedJobId] = useState<string | null>(initialJobId || null);

  // Proforma Header Metadata
  const [proformaNo, setProformaNo] = useState(() => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PRO-${year}-${rand}`;
  });

  // Official System Logo
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem('swedswood_proforma_logo_url') || '/logo.svg';
  });
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newUrl = event.target.result as string;
          setLogoUrl(newUrl);
          localStorage.setItem('swedswood_proforma_logo_url', newUrl);
          setSaveToast('Proforma invoice logo updated!');
          setTimeout(() => setSaveToast(null), 2500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    setLogoUrl('/logo.svg');
    localStorage.removeItem('swedswood_proforma_logo_url');
    setSaveToast('Reset to default system logo');
    setTimeout(() => setSaveToast(null), 2000);
  };

  const [issueDate, setIssueDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [validityDays, setValidityDays] = useState<number>(30);
  const [leadTime, setLeadTime] = useState('2 - 3 Weeks from deposit confirmation');
  const [paymentTerms, setPaymentTerms] = useState(
    '50% Advance Deposit on approval, 50% Balance upon Delivery & Site Inspection'
  );
  const [depositPercent, setDepositPercent] = useState<number>(50);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);

  // Project & Scope
  const [projectTitle, setProjectTitle] = useState('Custom Bespoke Architectural Woodwork');
  const [projectDescription, setProjectDescription] = useState(
    'Kiln-dried hardwood joinery, structural mortise-and-tenon construction, and hand-rubbed protective finishing.'
  );
  const [notes, setNotes] = useState(
    '1. Moisture Content Guarantee: All timber is kiln-dried to <12% moisture content to prevent warping.\n2. Structural Guarantee: 5-year warranty on all structural timber joinery.\n3. Site Preparation: Final dimensions confirmed on site prior to timber breakdown.\n4. Price Validity: This proforma quotation remains fixed for the validity period indicated.'
  );

  // Line items
  const [items, setItems] = useState<SavedInvoiceItem[]>([
    {
      id: 'p-item-1',
      description: 'Solid Teak Double Front Entrance Door & Matching Frame',
      woodSpecies: 'Burma Teak Hardwood • Weather-Sealed • Custom Brass Hinges',
      dimensions: '2100mm (H) x 1800mm (W) x 50mm (Thick)',
      quantity: 1,
      unitPrice: 14200000,
      total: 14200000
    },
    {
      id: 'p-item-2',
      description: 'Handcrafted Executive Conference Table (10-Seater)',
      woodSpecies: 'Kiln-Dried African Mahogany • Mortise & Tenon Joinery',
      dimensions: '3200mm (L) x 1200mm (W) x 760mm (H)',
      quantity: 1,
      unitPrice: 18500000,
      total: 18500000
    }
  ]);

  // Helper: Automatically prepare Proforma Invoice using Customer Details & History
  const autoPrepareForCustomer = (cust: Customer, specificJobId?: string | null) => {
    setClientType('EXISTING');
    setSelectedCustomerId(cust.id);

    // Look up any existing jobs or commissions for this client
    const clientJobs = jobs.filter(j => j.customerId === cust.id);
    const targetJob = specificJobId 
      ? jobs.find(j => j.id === specificJobId) 
      : (clientJobs.length > 0 ? clientJobs[clientJobs.length - 1] : null);

    if (targetJob) {
      setLinkedJobId(targetJob.id);
      setProjectTitle(targetJob.title);
      setProjectDescription(
        targetJob.description || 
        `Custom joinery commission for ${cust.name} per architectural specifications at ${cust.address || 'Freetown, Sierra Leone'}.`
      );

      if (targetJob.items && targetJob.items.length > 0) {
        setItems(
          targetJob.items.map((it, idx) => ({
            id: `job-item-${Date.now()}-${idx}`,
            description: it.description || targetJob.title,
            unitRate: String(it.quantity || 1),
            amount: it.totalCost || (it.quantity * it.unitCost),
            woodSpecies: 'Kiln-Dried Sierra Leone Hardwood (<12% Moisture)',
            dimensions: 'Architectural joinery specifications',
            quantity: it.quantity || 1,
            unitPrice: it.unitCost || (it.totalCost / (it.quantity || 1)),
            total: it.totalCost || (it.quantity * it.unitCost)
          }))
        );
      } else {
        setItems([
          {
            id: `job-item-main-${Date.now()}`,
            description: targetJob.title,
            unitRate: '1',
            amount: targetJob.quoteAmount,
            woodSpecies: 'Kiln-Dried Hardwood • Hand-Rubbed Protective Finish',
            dimensions: 'Site measured specifications per inspection',
            quantity: 1,
            unitPrice: targetJob.quoteAmount,
            total: targetJob.quoteAmount
          }
        ]);
      }

      setNotes(
        `1. Moisture Content Guarantee: All timber is kiln-dried to <12% moisture content to prevent warping.\n2. Structural Guarantee: 5-year warranty on all structural timber joinery.\n3. Site Delivery & Inspection: Final delivery directly to ${cust.address || 'client premise'}.\n4. Client Contact on Site: ${cust.name} (${cust.phone}).`
      );

      setSaveToast(`⚡ Proforma prepared for ${cust.name} using commission "${targetJob.title}"!`);
      setTimeout(() => setSaveToast(null), 3500);
    } else {
      // Customer has no jobs yet: auto-prepare custom proforma tailored to their profile & site address
      setLinkedJobId(null);
      const title = cust.company 
        ? `${cust.company} — Architectural Joinery & Fit-Out` 
        : `Bespoke Solid Hardwood Joinery Suite for ${cust.name}`;
      setProjectTitle(title);
      setProjectDescription(
        cust.notes 
          ? `Client Requirements: ${cust.notes}\nSite Delivery & Installation: ${cust.address || 'Freetown, Sierra Leone'}`
          : `Kiln-dried hardwood joinery, structural mortise-and-tenon construction, site delivery to ${cust.address || 'Freetown, Sierra Leone'}, and architectural fitting.`
      );

      setItems([
        {
          id: `p-item-auto-${Date.now()}-1`,
          description: cust.company 
            ? `Commercial Joinery & Executive Fit-Out Suite (${cust.company})`
            : `Handcrafted Architectural Hardwood Suite for ${cust.name}`,
          woodSpecies: 'Kiln-Dried African Mahogany & Burma Teak (<12% Moisture)',
          dimensions: 'Site-verified measurements per preliminary inspection',
          quantity: 1,
          unitPrice: 15500000,
          total: 15500000
        },
        {
          id: `p-item-auto-${Date.now()}-2`,
          description: `Site Delivery, Fitting & Protective Marine Polyurethane Finish`,
          woodSpecies: 'Weather-Resistant Protective Treatment & Anti-Fungal Seal',
          dimensions: `Direct delivery and installation at ${cust.address || 'Client Site'}`,
          quantity: 1,
          unitPrice: 2800000,
          total: 2800000
        }
      ]);

      setNotes(
        `1. Moisture Content Guarantee: All timber is kiln-dried to <12% moisture content to prevent warping.\n2. Structural Guarantee: 5-year warranty on all structural timber joinery.\n3. Site Delivery & Inspection: Direct delivery to ${cust.address || 'Freetown, Sierra Leone'}.\n4. Authorized Client Contact: ${cust.name} (${cust.phone}).`
      );

      setSaveToast(`⚡ Proforma prepared using ${cust.name}'s profile & site details!`);
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  // Sync if initialCustomerId or initialJobId provided
  useEffect(() => {
    if (initialCustomerId) {
      const cust = customers.find(c => c.id === initialCustomerId);
      if (cust) {
        autoPrepareForCustomer(cust, initialJobId);
      }
      if (onClearInitialParams) {
        onClearInitialParams();
      }
    } else if (initialJobId) {
      const foundJob = jobs.find(j => j.id === initialJobId);
      if (foundJob && foundJob.customerId) {
        const cust = customers.find(c => c.id === foundJob.customerId);
        if (cust) {
          autoPrepareForCustomer(cust, initialJobId);
        }
      }
      if (onClearInitialParams) {
        onClearInitialParams();
      }
    }
  }, [initialCustomerId, initialJobId, customers, jobs]);

  // Real-time Firestore synchronization for all saved invoices
  useEffect(() => {
    const unsub = subscribeToCollection<SavedInvoice>('savedInvoices', (items) => {
      if (items && items.length > 0) {
        setAllSavedInvoices(items);
        try {
          localStorage.setItem('swedswood_saved_invoices', JSON.stringify(items));
        } catch (e) {}
      }
    });
    return () => unsub();
  }, []);

  // Admin & Authorization Privileges
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.name === 'Mr Paul Bindi' || currentUser?.id === 'emp-01';
  const isManager = currentUser?.role === 'Manager';
  const canManage = isAdmin || isManager;

  // Proforma Invoices subset
  const proformaRecords = allSavedInvoices.filter(
    (inv) => inv.template === 'PROFORMA' || inv.docType === 'PROFORMA' || inv.invoiceNo.startsWith('PRO-')
  );

  // Filtered Proformas for Manage & Archive Mode
  const filteredProformas = proformaRecords.filter((inv) => {
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;
    const matchesSearch =
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.customerCompany || '').toLowerCase().includes(q) ||
      (inv.customerPhone || '').toLowerCase().includes(q) ||
      (inv.projectTitle || '').toLowerCase().includes(q) ||
      (inv.items || []).some((it) => it.description.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  // Handler: Start New Proforma
  const handleStartNewProforma = () => {
    setEditingProformaId(null);
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setProformaNo(`PRO-${year}-${rand}`);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setValidityDays(30);
    setLeadTime('2 - 3 Weeks from deposit confirmation');
    setPaymentTerms('50% Advance Deposit on approval, 50% Balance upon Delivery & Site Inspection');
    setDepositPercent(50);
    setDiscountPercent(0);
    setTaxPercent(0);
    setProjectTitle('Custom Bespoke Architectural Woodwork');
    setProjectDescription('Kiln-dried hardwood joinery, structural mortise-and-tenon construction, and hand-rubbed protective finishing.');
    setNotes('1. Moisture Content Guarantee: All timber is kiln-dried to <12% moisture content to prevent warping.\n2. Structural Guarantee: 5-year warranty on all structural timber joinery.\n3. Site Preparation: Final dimensions confirmed on site prior to timber breakdown.\n4. Price Validity: This proforma quotation remains fixed for the validity period indicated.');
    setClientType('EXISTING');
    if (customers[0]?.id) setSelectedCustomerId(customers[0].id);
    setProspectName('');
    setProspectCompany('');
    setProspectPhone('');
    setProspectEmail('');
    setProspectAddress('Freetown, Sierra Leone');
    setItems([
      {
        id: 'p-item-1',
        description: 'Solid Teak Double Front Entrance Door & Matching Frame',
        woodSpecies: 'Burma Teak Hardwood • Weather-Sealed • Custom Brass Hinges',
        dimensions: '2100mm (H) x 1800mm (W) x 50mm (Thick)',
        quantity: 1,
        unitPrice: 14200000,
        total: 14200000
      }
    ]);
    setViewMode('EDIT');
    setSaveToast('Ready to draft new Proforma quotation!');
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Handler: Edit an Existing Proforma
  const handleEditSavedProforma = (record: SavedInvoice) => {
    setEditingProformaId(record.id);
    setProformaNo(record.invoiceNo);
    setIssueDate(record.date || new Date().toISOString().split('T')[0]);
    if (record.validityDays) setValidityDays(record.validityDays);
    if (record.leadTime) setLeadTime(record.leadTime);
    if (record.paymentTerms || record.terms) setPaymentTerms(record.paymentTerms || record.terms || '');
    if (record.depositPercent !== undefined) setDepositPercent(record.depositPercent);
    if (record.discountPercent !== undefined) setDiscountPercent(record.discountPercent);
    if (record.taxPercent !== undefined) setTaxPercent(record.taxPercent);
    if (record.projectTitle) setProjectTitle(record.projectTitle);
    if (record.projectDescription || record.customerMessage) {
      setProjectDescription(record.projectDescription || record.customerMessage || '');
    }
    if (record.notes) setNotes(record.notes);
    if (record.logoUrl) setLogoUrl(record.logoUrl);

    // Match existing customer if present
    const matched = customers.find(
      (c) => c.id === record.customerId || c.name.toLowerCase() === record.customerName.toLowerCase()
    );
    if (matched) {
      setClientType('EXISTING');
      setSelectedCustomerId(matched.id);
    } else {
      setClientType('PROSPECT');
      setProspectName(record.customerName || '');
      setProspectCompany(record.customerCompany || '');
      setProspectPhone(record.customerPhone || '');
      setProspectEmail(record.customerEmail || '');
      setProspectAddress(record.customerAddress || 'Freetown, Sierra Leone');
    }

    if (record.items && record.items.length > 0) {
      setItems(
        record.items.map((it, idx) => ({
          id: it.id || `p-item-${idx + 1}`,
          description: it.description,
          woodSpecies: it.woodSpecies || 'Kiln-Dried Hardwood',
          dimensions: it.dimensions || 'Bespoke workshop specs',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || it.amount || 0,
          total: it.total || it.amount || (it.quantity || 1) * (it.unitPrice || 0)
        }))
      );
    }

    setViewMode('EDIT');
    setSaveToast(`Loaded Proforma ${record.invoiceNo} into Form Editor.`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Handler: Cancel Edit
  const handleCancelEdit = () => {
    setEditingProformaId(null);
    handleStartNewProforma();
  };

  // Handler: Preview a Saved Proforma
  const handlePreviewSavedProforma = (record: SavedInvoice) => {
    handleEditSavedProforma(record);
    setViewMode('PREVIEW');
  };

  // Handler: Delete Proforma
  const handleDeleteProforma = async (id: string) => {
    try {
      await deleteDocument('savedInvoices', id);
    } catch (e) {
      console.warn('Firestore delete notice:', e);
    }

    setAllSavedInvoices((prev) => {
      const filtered = prev.filter((inv) => inv.id !== id);
      try {
        localStorage.setItem('swedswood_saved_invoices', JSON.stringify(filtered));
      } catch (e) {}
      return filtered;
    });

    if (onDeleteInvoiceRecord) {
      onDeleteInvoiceRecord(id);
    }

    if (editingProformaId === id) {
      setEditingProformaId(null);
      handleStartNewProforma();
    }

    setDeleteConfirmId(null);
    setSaveToast('Proforma invoice removed from archive.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Handler: Quick Update Proforma Status
  const handleUpdateProformaStatus = async (id: string, newStatus: SavedInvoice['status']) => {
    const target = allSavedInvoices.find((s) => s.id === id);
    if (!target) return;
    const updated: SavedInvoice = {
      ...target,
      status: newStatus,
      lastUpdated: new Date().toISOString()
    };
    try {
      await saveDocument('savedInvoices', updated);
    } catch (e) {}

    setAllSavedInvoices((prev) => {
      const mapped = prev.map((inv) => (inv.id === id ? updated : inv));
      try {
        localStorage.setItem('swedswood_saved_invoices', JSON.stringify(mapped));
      } catch (e) {}
      return mapped;
    });

    setSaveToast(`Status updated to "${newStatus}" for ${target.invoiceNo}`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Handler: Direct PDF download for any proforma from archive list
  const handleDownloadSingleProformaPdf = async (inv: SavedInvoice) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const logoDataUrl = await getLogoDataUrl(inv.logoUrl || '/logo.svg');
      const pdfItems: ProformaPdfItem[] = (inv.items || []).map((it, idx) => ({
        index: idx + 1,
        description: it.description,
        woodSpecies: it.woodSpecies,
        dimensions: it.dimensions,
        quantity: it.quantity || 1,
        price: it.unitPrice || 0,
        total: it.total || it.amount || (it.quantity || 1) * (it.unitPrice || 0)
      }));

      buildProformaInvoicePdfContent(doc, {
        proformaNo: inv.invoiceNo,
        date: new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        validUntil: inv.validUntil || '',
        leadTime: inv.leadTime || '2 - 3 Weeks from deposit confirmation',
        paymentTerms: inv.paymentTerms || '50% Advance Deposit on approval, 50% Balance upon Delivery & Site Inspection',
        customerName: inv.customerName,
        customerCompany: inv.customerCompany,
        customerPhone: inv.customerPhone,
        customerEmail: inv.customerEmail,
        customerAddress: inv.customerAddress,
        projectTitle: inv.projectTitle || inv.items[0]?.description || 'Custom Bespoke Architectural Woodwork',
        projectDescription: inv.projectDescription || inv.customerMessage || '',
        items: pdfItems,
        subtotal: inv.subtotal,
        discountPercent: inv.discountPercent || 0,
        taxPercent: inv.taxPercent || 0,
        depositPercent: inv.depositPercent !== undefined ? inv.depositPercent : 50,
        bankDetails:
          'Sierra Leone Commercial Bank (SLCB) • A/C: 003001099234 • SWIFT: SLCBSLFR\nRokel Commercial Bank • A/C: 0140293849\nOrange Money Merchant: #882910 (SWEDS WOOD)\nAfricell Money: #449201',
        notes: inv.notes || '',
        preparedBy: inv.preparedBy || (currentUser ? `${currentUser.name} (${currentUser.role})` : 'Mr Paul Bindi (Admin)'),
        logoDataUrl
      });

      const cleanCust = (inv.customerName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Proforma_Invoice_${inv.invoiceNo}_${cleanCust}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  // Sync if initialProformaRecord provided
  useEffect(() => {
    if (initialProformaRecord) {
      handleEditSavedProforma(initialProformaRecord);
    }
  }, [initialProformaRecord]);

  // Compute Active Customer Profile
  const activeCustomer: {
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    address?: string;
  } = clientType === 'EXISTING'
    ? (() => {
        const found = customers.find(c => c.id === selectedCustomerId);
        return {
          name: found?.name || 'Valued Client',
          company: found?.company || 'Commercial Organization',
          phone: found?.phone || '+232 76 000 000',
          email: found?.email || '',
          address: found?.address || 'Freetown, Sierra Leone'
        };
      })()
    : {
        name: prospectName || 'Valued Client',
        company: prospectCompany || '',
        phone: prospectPhone || '',
        email: prospectEmail || '',
        address: prospectAddress || 'Freetown, Sierra Leone'
      };

  // Calculate validity date string
  const validUntilDate = (() => {
    try {
      const d = new Date(issueDate);
      d.setDate(d.getDate() + validityDays);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  })();

  // Financial calculations
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountAmount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = taxPercent > 0 ? (afterDiscount * taxPercent) / 100 : 0;
  const totalAmount = afterDiscount + taxAmount;
  const advanceDeposit = (totalAmount * depositPercent) / 100;
  const balanceDueOnDelivery = totalAmount - advanceDeposit;

  // Item Management Handlers
  const handleAddItem = () => {
    const newItem: SavedInvoiceItem = {
      id: `item-${Date.now()}`,
      description: 'Custom Woodwork Unit',
      unitRate: '1',
      amount: 2500000,
      woodSpecies: 'Kiln-Dried Hardwood',
      dimensions: 'Custom site dimensions',
      quantity: 1,
      unitPrice: 2500000,
      total: 2500000
    };
    setItems([...items, newItem]);
  };

  const handleAddPreset = (preset: WoodworkPreset) => {
    const newItem: SavedInvoiceItem = {
      id: `preset-${Date.now()}-${Math.random()}`,
      description: preset.title,
      unitRate: String(preset.qty),
      amount: preset.qty * preset.rate,
      woodSpecies: preset.species,
      dimensions: preset.dimensions,
      quantity: preset.qty,
      unitPrice: preset.rate,
      total: preset.qty * preset.rate
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof SavedInvoiceItem, value: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(value) : item.quantity;
          const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
          updated.total = (qty || 0) * (price || 0);
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert('A proforma invoice requires at least one woodwork line item.');
      return;
    }
    setItems(items.filter(i => i.id !== id));
  };

  const handleRegenerateRef = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setProformaNo(`PRO-${year}-${rand}`);
  };

  // PDF Export
  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfItems: ProformaPdfItem[] = items.map((it, idx) => ({
        index: idx + 1,
        description: it.description,
        woodSpecies: it.woodSpecies,
        dimensions: it.dimensions,
        quantity: it.quantity,
        price: it.unitPrice,
        total: it.total
      }));

      // Rasterize system logo to PNG Data URL for high-fidelity vector/canvas embedding
      const logoDataUrl = await getLogoDataUrl(logoUrl || '/logo.svg');

      buildProformaInvoicePdfContent(doc, {
        proformaNo,
        date: new Date(issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        validUntil: validUntilDate,
        leadTime,
        paymentTerms,
        customerName: activeCustomer.name,
        customerCompany: activeCustomer.company,
        customerPhone: activeCustomer.phone,
        customerEmail: activeCustomer.email,
        customerAddress: activeCustomer.address,
        projectTitle,
        projectDescription,
        items: pdfItems,
        subtotal,
        discountPercent,
        taxPercent,
        depositPercent,
        bankDetails:
          'Sierra Leone Commercial Bank (SLCB) • A/C: 003001099234 • SWIFT: SLCBSLFR\nRokel Commercial Bank • A/C: 0140293849\nOrange Money Merchant: #882910 (SWEDS WOOD)\nAfricell Money: #449201',
        notes,
        preparedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Master Joiner / Commercial Director',
        logoDataUrl
      });

      const cleanCust = activeCustomer.name.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Proforma_Invoice_${proformaNo}_${cleanCust}.pdf`);
    } catch (err) {
      console.error('Error generating Proforma PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Print Proforma
  const handlePrint = () => {
    window.print();
  };

  // Save / Update Record
  const handleSaveRecord = async () => {
    const isEditing = Boolean(editingProformaId);
    const existing = isEditing ? allSavedInvoices.find((s) => s.id === editingProformaId) : null;

    const record: SavedInvoice = {
      id: editingProformaId || `proforma-${Date.now()}`,
      jobId: linkedJobId || existing?.jobId || 'job-proforma',
      invoiceNo: proformaNo,
      docType: 'PROFORMA',
      terms: paymentTerms,
      customerMessage: projectDescription,
      preparedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : (existing?.preparedBy || 'Mr Paul Bindi (Admin)'),
      customerId: clientType === 'EXISTING' ? selectedCustomerId : (existing?.customerId || `prospect-${Date.now()}`),
      customerName: activeCustomer.name,
      customerCompany: activeCustomer.company,
      customerPhone: activeCustomer.phone,
      customerEmail: activeCustomer.email,
      customerAddress: activeCustomer.address,
      projectTitle,
      projectDescription,
      items,
      subtotal,
      discountPercent,
      taxPercent,
      date: issueDate,
      validityDays,
      validUntil: validUntilDate,
      leadTime,
      paymentTerms,
      depositPercent,
      template: 'PROFORMA',
      status: existing?.status || 'Issued',
      logoUrl: logoUrl || '/logo.svg',
      notes,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    try {
      await saveDocument('savedInvoices', record);
    } catch (e) {
      console.warn('Firestore proforma save notice:', e);
    }

    setAllSavedInvoices((prev) => {
      const filtered = prev.filter((inv: SavedInvoice) => inv.id !== record.id);
      const updated = [record, ...filtered];
      try {
        localStorage.setItem('swedswood_saved_invoices', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (onSaveInvoiceRecord) {
      onSaveInvoiceRecord(record);
    }

    setSaveToast(
      isEditing
        ? `Proforma ${proformaNo} successfully updated in archive!`
        : `Proforma ${proformaNo} successfully saved to archive!`
    );
    setTimeout(() => setSaveToast(null), 3000);
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    const text = 
`*SWEDS WOOD — PROFORMA INVOICE QUOTATION*
📋 *Ref No:* ${proformaNo}
📅 *Issue Date:* ${issueDate}
⏳ *Validity:* ${validityDays} Days (Valid until ${validUntilDate})
👤 *Client:* ${activeCustomer.name} ${activeCustomer.company ? `(${activeCustomer.company})` : ''}

*Scope of Work:* ${projectTitle}
${items.map((it, idx) => `• ${idx + 1}. ${it.description} (${it.woodSpecies || 'Hardwood'}) — Qty: ${it.quantity} @ ${formatCurrency(it.unitPrice)} = ${formatCurrency(it.total)}`).join('\n')}

💰 *Total Value:* ${formatCurrency(totalAmount)}
⭐ *50% Advance Deposit Required:* ${formatCurrency(advanceDeposit)}
⏱️ *Estimated Lead Time:* ${leadTime}
📜 *Payment Terms:* ${paymentTerms}

*Workshop Bank Clearance:*
Sierra Leone Commercial Bank (SLCB)
A/C: 003001099234 | SWEDS WOOD LTD
Orange Money Merchant: #882910

_For questions or deposit confirmation, please contact Sweds Wood Workshop (+232 76 442590)._`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = (activeCustomer.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      navigator.clipboard.writeText(text);
      setCopiedNotification('Quotation summary copied to clipboard! Paste into WhatsApp.');
      setTimeout(() => setCopiedNotification(null), 3500);
    }
  };

  // Email Dispatch Modal state
  const [emailModalData, setEmailModalData] = useState<{
    isOpen: boolean;
    docNumber: string;
    docDate: string;
    customerName: string;
    customerCompany?: string;
    customerEmail?: string;
    customerPhone?: string;
    projectTitle: string;
    totalAmount: number;
    items?: Array<{ description: string; quantity?: number; amount: number }>;
    downloadPdfFn?: () => void;
  }>({
    isOpen: false,
    docNumber: '',
    docDate: '',
    customerName: '',
    projectTitle: '',
    totalAmount: 0
  });

  const handleOpenActiveEmailModal = () => {
    setEmailModalData({
      isOpen: true,
      docNumber: proformaNo,
      docDate: issueDate,
      customerName: activeCustomer.name,
      customerCompany: activeCustomer.company,
      customerEmail: activeCustomer.email,
      customerPhone: activeCustomer.phone,
      projectTitle,
      totalAmount,
      items: items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        amount: i.total || (i.quantity || 1) * (i.unitPrice || 0)
      })),
      downloadPdfFn: handleDownloadPdf
    });
  };

  const handleOpenSavedEmailModal = (inv: SavedInvoice) => {
    setEmailModalData({
      isOpen: true,
      docNumber: inv.invoiceNo,
      docDate: inv.date,
      customerName: inv.customerName,
      customerCompany: inv.customerCompany,
      customerEmail: inv.customerEmail,
      customerPhone: inv.customerPhone,
      projectTitle: inv.projectTitle || inv.items[0]?.description || 'Custom Bespoke Woodwork',
      totalAmount: inv.subtotal,
      items: (inv.items || []).map(i => ({
        description: i.description,
        quantity: i.quantity,
        amount: i.amount || i.total || 0
      })),
      downloadPdfFn: () => handleDownloadSingleProformaPdf(inv)
    });
  };

  // 1-Click Convert to Live Job
  const handleConvertToLiveJob = () => {
    if (!onCreateJob) {
      alert('Job creation handler is not available.');
      return;
    }

    // Determine or create customer ID
    const custId = clientType === 'EXISTING' ? selectedCustomerId : `cust-prospect-${Date.now()}`;
    const newJob: Omit<Job, 'id' | 'materialsUsed' | 'payments'> = {
      title: projectTitle,
      description: `${projectDescription}\n\n[Converted from Proforma ${proformaNo}]\nLead Time: ${leadTime}\nTerms: ${paymentTerms}`,
      customerId: custId,
      customerName: activeCustomer.name,
      assignedEmployees: currentUser?.id ? [currentUser.id] : [],
      status: 'In Progress',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 21); // 3 weeks
        return d.toISOString().split('T')[0];
      })(),
      quoteAmount: totalAmount,
      laborCost: 0,
      otherCosts: 0,
      items: items.map((it, idx) => ({
        id: `job-item-${idx}-${Date.now()}`,
        description: `${it.description} (${it.woodSpecies || 'Hardwood'})`,
        quantity: it.quantity || 1,
        unitCost: it.unitPrice || 0,
        totalCost: it.total || 0
      }))
    };

    onCreateJob(newJob);
    setIsConvertingJob(false);
    setSaveToast(`Proforma ${proformaNo} converted to Live Production Job! Check Jobs Desk.`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-emerald-950 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-2xl border border-emerald-500/40 flex items-center gap-3"
          >
            <div className="p-1 bg-emerald-500 text-black rounded-lg">
              <Check className="w-4 h-4" />
            </div>
            <span>{saveToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header & Control Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-wood-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-amber-500/30 shadow-xl no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Modern Luxury
              </span>
              <span className="text-amber-400/80 text-xs font-mono font-bold tracking-widest uppercase">
                Official Commercial Quotation
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-800 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1">
                <Phone className="w-3 h-3 text-amber-400" />
                <span>Contact: +232 76 442590</span>
              </span>
              {isAdmin && (
                <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                  Admin: Mr Paul Bindi
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {onGoBack && (
                <button
                  onClick={onGoBack}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition flex items-center gap-1.5 text-xs font-black shadow-xs cursor-pointer active:scale-95 shrink-0"
                  title="Go back to previous page"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden sm:inline">Go Back</span>
                </button>
              )}
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                <FileSpreadsheet className="w-7 h-7 text-amber-400" />
                <span>Proforma Invoice Desk</span>
                {editingProformaId && (
                  <span className="text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg">
                    Editing {proformaNo}
                  </span>
                )}
              </h2>
            </div>
            <p className="text-xs text-amber-200/80 max-w-2xl leading-relaxed">
              Generate exquisite, itemized woodworking proforma invoices for prospective and registered clients. Complete with timber species specifications, 50% advance deposit terms, 5-year joinery warranty, and formal master craftsman clearance seals.
            </p>
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-slate-900 p-1 rounded-xl border border-amber-500/30 flex items-center">
              <button
                onClick={() => setViewMode('EDIT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'EDIT'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Form Editor</span>
              </button>
              <button
                onClick={() => setViewMode('PREVIEW')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'PREVIEW'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>A4 Live Preview</span>
              </button>
              <button
                onClick={() => setViewMode('MANAGE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'MANAGE'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Manage & Archive</span>
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  viewMode === 'MANAGE' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-gray-300'
                }`}>
                  {proformaRecords.length}
                </span>
              </button>
            </div>

            {/* Start New Proforma Button */}
            <button
              onClick={handleStartNewProforma}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Start a fresh new Proforma Invoice"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ New Proforma</span>
            </button>

            {/* Save / Update Record */}
            <button
              onClick={handleSaveRecord}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                editingProformaId
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title={editingProformaId ? 'Update this existing Proforma record' : 'Save to database archive'}
            >
              <Save className={`w-4 h-4 ${editingProformaId ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>{editingProformaId ? 'Update Record' : 'Save Record'}</span>
            </button>

            {editingProformaId && (
              <button
                onClick={handleCancelEdit}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                title="Cancel editing and create a new proforma instead"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
              title="Download print-ready PDF with System Logo"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Share quotation via WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleOpenActiveEmailModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
              title="Send Proforma to client via Email (swedswoodinfo@gmail.com)"
            >
              <Mail className="w-4 h-4" />
              <span>Email Client</span>
            </button>

            {onCreateJob && (
              <button
                onClick={() => setIsConvertingJob(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="Convert this accepted quote into an active Workshop Job"
              >
                <Award className="w-4 h-4 text-slate-950" />
                <span>Convert to Job</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Edit Alert Banner */}
        {editingProformaId && (
          <div className="mt-3 p-3 bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Administrator Editing Mode:</strong> Currently updating Proforma{' '}
                <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded">
                  {proformaNo}
                </span>{' '}
                for <span className="font-bold text-white">{activeCustomer.name}</span>.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSaveRecord}
                className="px-2.5 py-1 bg-amber-400 text-slate-950 rounded-lg text-xs font-black hover:bg-amber-300 transition cursor-pointer"
              >
                Update Now
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-2.5 py-1 bg-slate-800 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Exit Edit
              </button>
            </div>
          </div>
        )}

        {copiedNotification && (
          <div className="mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{copiedNotification}</span>
          </div>
        )}
      </div>

      {/* Form Editor Mode */}
      {viewMode === 'EDIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
          {/* Left Column: Client & Logistics */}
          <div className="space-y-6 lg:col-span-1">
            {/* Client Picker */}
            <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-xs font-black uppercase text-wood-950 tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <span>1. Client Information</span>
                </span>
                <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    onClick={() => setClientType('EXISTING')}
                    className={`px-2 py-1 rounded-md transition ${
                      clientType === 'EXISTING' ? 'bg-white text-wood-950 shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    Registered
                  </button>
                  <button
                    onClick={() => setClientType('PROSPECT')}
                    className={`px-2 py-1 rounded-md transition ${
                      clientType === 'PROSPECT' ? 'bg-white text-wood-950 shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    Walk-in Prospect
                  </button>
                </div>
              </div>

              {clientType === 'EXISTING' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 block">Select Registered Client</label>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-200/70 border border-amber-300 px-2 py-0.5 rounded-full">
                      Auto-prepares Proforma
                    </span>
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedCustomerId(newId);
                      const found = customers.find(c => c.id === newId);
                      if (found) {
                        autoPrepareForCustomer(found);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-600 font-medium text-gray-800 outline-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''} • {c.phone}
                      </option>
                    ))}
                  </select>

                  {/* Client card summary */}
                  <div className="p-3 bg-wood-50/50 rounded-xl border border-wood-200 text-xs space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-wood-950 text-sm">{activeCustomer.name}</p>
                        {activeCustomer.company && (
                          <p className="text-gray-600 flex items-center gap-1.5 text-[11px] font-semibold">
                            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{activeCustomer.company}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 shrink-0">
                        Client Active
                      </span>
                    </div>

                    {activeCustomer.phone && (
                      <p className="text-gray-600 flex items-center gap-1.5 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{activeCustomer.phone}</span>
                      </p>
                    )}
                    {activeCustomer.email && (
                      <p className="text-gray-600 flex items-center gap-1.5 text-[11px]">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{activeCustomer.email}</span>
                      </p>
                    )}
                    {activeCustomer.address && (
                      <p className="text-gray-600 flex items-center gap-1.5 text-[11px]">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>Delivery / Site: {activeCustomer.address}</span>
                      </p>
                    )}

                    {/* Linked Commissions Pill Selector */}
                    {(() => {
                      const custJobs = jobs.filter(j => j.customerId === selectedCustomerId);
                      if (custJobs.length > 0) {
                        return (
                          <div className="mt-2 pt-2 border-t border-wood-200">
                            <p className="text-[10px] font-bold text-wood-800 uppercase tracking-wider mb-1">
                              Client Commissions ({custJobs.length}):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {custJobs.map(cj => (
                                <button
                                  key={cj.id}
                                  type="button"
                                  onClick={() => {
                                    const cust = customers.find(c => c.id === selectedCustomerId);
                                    if (cust) autoPrepareForCustomer(cust, cj.id);
                                  }}
                                  className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition text-left cursor-pointer ${
                                    linkedJobId === cj.id 
                                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-xs' 
                                      : 'bg-white text-gray-700 hover:bg-wood-100 border-gray-200'
                                  }`}
                                  title="Click to auto-prepare proforma from this commission"
                                >
                                  {cj.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Auto Prepare Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const found = customers.find(c => c.id === selectedCustomerId);
                        if (found) autoPrepareForCustomer(found);
                      }}
                      className="w-full mt-2.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-amber-500 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                      <span>⚡ Auto-Prepare Proforma For This Client</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                      Prospect / Client Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Alie Conteh"
                      value={prospectName}
                      onChange={(e) => setProspectName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 font-medium text-gray-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                      Company / Organization (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lumley Bay Residence"
                      value={prospectCompany}
                      onChange={(e) => setProspectCompany(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 font-medium text-gray-800 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="+232 76 123 456"
                        value={prospectPhone}
                        onChange={(e) => setProspectPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 font-medium text-gray-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="client@gmail.com"
                        value={prospectEmail}
                        onChange={(e) => setProspectEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 font-medium text-gray-800 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                      Site / Delivery Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 24 Wilkinson Road, Freetown"
                      value={prospectAddress}
                      onChange={(e) => setProspectAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 font-medium text-gray-800 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* System Logo & Branding Controls */}
            <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <span className="text-xs font-black uppercase text-wood-950 tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>Proforma System Logo</span>
                </span>
                {logoUrl !== '/logo.svg' && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                  >
                    Reset to Default Logo
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white p-1.5 shadow-sm border border-amber-500/40 flex items-center justify-center shrink-0">
                  <img
                    src={logoUrl || '/logo.svg'}
                    alt="System Logo Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800">Swedswood Official Crest</p>
                  <p className="text-[11px] text-gray-500">Appears on the Proforma header, watermark, and PDF download.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="px-2.5 py-1 bg-wood-950 hover:bg-wood-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs shrink-0">
                      <Upload className="w-3 h-3 text-amber-400" />
                      <span>Change Logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Proforma Quotation Terms */}
            <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
              <span className="text-xs font-black uppercase text-wood-950 tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>2. Quotation Validity & Terms</span>
              </span>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-extrabold uppercase text-gray-400">
                      Proforma Reference No
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateRef}
                      className="text-[10px] text-amber-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>New Ref</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={proformaNo}
                    onChange={(e) => setProformaNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 text-wood-950 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 text-gray-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                      Quotation Validity
                    </label>
                    <select
                      value={validityDays}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 font-medium text-gray-800 outline-none"
                    >
                      <option value={15}>15 Days</option>
                      <option value={30}>30 Days (Standard)</option>
                      <option value={45}>45 Days</option>
                      <option value={60}>60 Days</option>
                      <option value={90}>90 Days</option>
                    </select>
                  </div>
                </div>

                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/70 text-[11px] font-medium text-amber-950 flex items-center justify-between">
                  <span className="font-bold">Valid Until:</span>
                  <span className="font-mono font-black text-amber-900">{validUntilDate}</span>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                    Production Lead Time
                  </label>
                  <input
                    type="text"
                    value={leadTime}
                    onChange={(e) => setLeadTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 font-medium text-gray-800 outline-none"
                    placeholder="e.g. 2 - 3 Weeks from deposit"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                    Advance Deposit Required (%)
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[30, 40, 50, 60].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDepositPercent(pct)}
                        className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          depositPercent === pct
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                    Commercial Payment Terms
                  </label>
                  <textarea
                    rows={2}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 text-gray-800 outline-none resize-none font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center & Right: Itemized Schedule & Presets */}
          <div className="space-y-6 lg:col-span-2">
            {/* Quick Presets Bar */}
            <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 rounded-2xl border border-amber-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Quick Woodwork Presets (Click to Add)</span>
                </span>
                <span className="text-[10px] font-bold text-amber-800">
                  Custom handcrafted joinery
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WOODWORK_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPreset(preset)}
                    className="px-2.5 py-1.5 bg-white hover:bg-amber-100/70 border border-amber-300 rounded-xl text-xs font-bold text-amber-950 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3 h-3 text-amber-700" />
                    <span>{preset.title.split('(')[0].trim()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scope & Title */}
            <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                  Commission Scope Title
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 text-wood-950 outline-none"
                  placeholder="e.g. Master Bedroom Joinery & Executive Dining Suite"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                  Craftsmanship Scope Description
                </label>
                <input
                  type="text"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 text-gray-700 outline-none"
                  placeholder="Summary of architectural joinery, finishes, and on-site fitting."
                />
              </div>
            </div>

            {/* Itemized Line Items Table */}
            <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-xs font-black uppercase text-wood-950 tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>3. Itemized Craftsmanship Schedule</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-wood-950 hover:bg-wood-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200 space-y-2.5 transition hover:border-amber-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-wood-900 text-amber-300 text-[10px] font-black rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                          className="font-bold text-xs text-wood-950 bg-white border border-gray-200 rounded-lg px-2.5 py-1 focus:border-amber-500 outline-none w-64 sm:w-80"
                          placeholder="Woodwork Item Description"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[9px] font-extrabold uppercase text-gray-400 block mb-0.5">
                          Timber Species & Finish
                        </label>
                        <input
                          type="text"
                          value={item.woodSpecies || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'woodSpecies', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:border-amber-500 outline-none"
                          placeholder="e.g. Kiln-Dried Teak • Polyurethane Satin"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-extrabold uppercase text-gray-400 block mb-0.5">
                          Dimensions & Specifications
                        </label>
                        <input
                          type="text"
                          value={item.dimensions || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'dimensions', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:border-amber-500 outline-none"
                          placeholder="e.g. 2400mm x 1000mm x 760mm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                      <div>
                        <label className="text-[9px] font-extrabold uppercase text-gray-400 block mb-0.5">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                          className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white border border-gray-200 rounded-lg focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-extrabold uppercase text-gray-400 block mb-0.5">
                          Unit Rate (SLL)
                        </label>
                        <input
                          type="number"
                          step={50000}
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white border border-gray-200 rounded-lg focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-extrabold uppercase text-gray-400 block mb-0.5">
                          Line Total (SLL)
                        </label>
                        <div className="px-2.5 py-1 text-xs font-mono font-black text-wood-950 bg-amber-50/50 border border-amber-200 rounded-lg">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Calculation Summary */}
              <div className="p-4 bg-slate-950 text-white rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span>Craftsmanship Subtotal:</span>
                  <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-800 text-xs">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                      Trade Discount (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-full px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg font-mono text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                      Sales Tax / GST (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="w-full px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg font-mono text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-black uppercase text-amber-400">Total Quotation Value:</span>
                  <span className="text-lg font-mono font-black text-amber-300">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                <div className="p-3 bg-gradient-to-r from-amber-500/20 to-amber-600/10 rounded-xl border border-amber-500/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-300 block">
                      Required Advance Deposit ({depositPercent}%)
                    </span>
                    <span className="text-xs text-gray-300">Due upon quotation acceptance</span>
                  </div>
                  <span className="text-base font-mono font-black text-white">
                    {formatCurrency(advanceDeposit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes & Guarantees */}
            <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-3">
              <span className="text-xs font-black uppercase text-wood-950 tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>4. Craftsmanship Warranty & Timber Moisture Guarantees</span>
              </span>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 text-gray-800 outline-none resize-none font-medium leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* A4 Executive Preview Mode (Interactive Document Display) */}
      {viewMode === 'PREVIEW' && (
        <div className="flex flex-col items-center">
          {/* A4 Document Container */}
          <div
            id="proforma-print-area"
            className="w-full max-w-[850px] bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-12 border border-amber-900/20 relative overflow-hidden"
            style={{ minHeight: '1100px' }}
          >
            {/* Watermark Crest in Center Background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
              <img 
                src={logoUrl || '/logo.svg'} 
                alt="Watermark Logo" 
                className="w-96 h-96 object-contain grayscale"
              />
            </div>

            {/* Top Border Gold/Navy Accent Stripe */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-wood-950 via-amber-500 to-wood-900" />

            {/* Header: Company & Proforma Badge */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-6 mb-8">
              {/* Left: Sweds Wood Branding */}
              <div className="space-y-2">
                <div className="flex items-center gap-3.5">
                  <div className="relative group w-16 h-16 rounded-xl bg-white p-1.5 shadow-md border border-amber-500/40 flex items-center justify-center shrink-0">
                    <img 
                      src={logoUrl || '/logo.svg'} 
                      alt="SWEDSFREE Woodwork Enterprise Official Logo" 
                      className="w-full h-full object-contain"
                    />
                    <label 
                      className="absolute -bottom-1 -right-1 bg-wood-950 text-white p-1 rounded-full text-[9px] cursor-pointer shadow-md hover:bg-amber-600 transition no-print" 
                      title="Change Proforma Logo"
                    >
                      <Upload className="w-2.5 h-2.5" />
                      <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-wood-950">
                      SWEDS WOOD
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                      Bespoke Joinery & Architectural Furniture
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-gray-600 leading-relaxed font-medium">
                  <p className="font-semibold text-slate-800">2 Swed Free Avenue, Sussex</p>
                  <p>Tel: +232 76 442590 • Email: swedswoodinfo@gmail.com</p>
                </div>
              </div>

              {/* Right: Proforma Invoice Badge */}
              <div className="text-right space-y-1 self-end sm:self-auto">
                <div className="inline-block bg-wood-950 text-white px-4 py-1.5 rounded-lg border border-amber-500/40 shadow-xs">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                    PROFORMA INVOICE
                  </span>
                </div>
                <p className="text-lg font-mono font-black text-wood-950 pt-1">{proformaNo}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Issue Date: <span className="text-slate-900 font-mono">{issueDate}</span>
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-md text-[10px] font-black text-amber-950">
                  <Clock className="w-3 h-3 text-amber-700" />
                  <span>VALID FOR {validityDays} DAYS (UNTIL {validUntilDate.toUpperCase()})</span>
                </div>
              </div>
            </div>

            {/* Official Notice Banner */}
            <div className="mb-6 p-2.5 bg-slate-100 border-l-4 border-amber-500 text-[10px] text-slate-700 font-semibold tracking-wide uppercase flex items-center justify-between">
              <span>Official Commercial Quotation • Subject to Material Availability & Deposit Confirmation</span>
              <span className="font-mono text-slate-900 font-bold">TIMBER: KILN DRIED &lt;12%</span>
            </div>

            {/* Client & Production Logistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-xs">
              {/* Billed Client */}
              <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-wood-900 block border-b border-gray-200 pb-1">
                  Client / Customer Details
                </span>
                <p className="text-sm font-bold text-slate-900">{activeCustomer.name}</p>
                {activeCustomer.company && (
                  <p className="text-gray-700 font-medium">{activeCustomer.company}</p>
                )}
                {activeCustomer.phone && (
                  <p className="text-gray-600 font-mono">{activeCustomer.phone}</p>
                )}
                {activeCustomer.email && (
                  <p className="text-gray-600">{activeCustomer.email}</p>
                )}
                {activeCustomer.address && (
                  <p className="text-gray-600 leading-snug">{activeCustomer.address}</p>
                )}
              </div>

              {/* Commission Logistics */}
              <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-wood-900 block border-b border-gray-200 pb-1">
                  Commission Logistics & Terms
                </span>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-medium">Commission:</span>
                  <span className="font-bold text-slate-900 text-right">{projectTitle}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-medium">Workshop Lead Time:</span>
                  <span className="font-bold text-slate-900 font-mono">{leadTime}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-medium">Payment Schedule:</span>
                  <span className="font-bold text-amber-900 text-right">{depositPercent}% Advance / Balance On Site</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-medium">Structural Warranty:</span>
                  <span className="font-bold text-emerald-800">5-Year Joinery Guarantee</span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="mb-8 overflow-hidden rounded-xl border border-slate-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-wood-950 text-white text-[10px] uppercase font-black tracking-wider">
                    <th className="py-3 px-3 w-10 text-center text-amber-400">#</th>
                    <th className="py-3 px-4">Item & Craftsmanship Specification</th>
                    <th className="py-3 px-3 text-center w-14">Qty</th>
                    <th className="py-3 px-4 text-right w-32">Unit Rate (SLL)</th>
                    <th className="py-3 px-4 text-right w-36">Total (SLL)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="py-3 px-3 text-center font-bold text-gray-500 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 space-y-0.5">
                        <p className="font-bold text-slate-900">{item.description}</p>
                        {item.woodSpecies && (
                          <p className="text-[10px] text-amber-900 font-semibold flex items-center gap-1">
                            <span>🪵 {item.woodSpecies}</span>
                          </p>
                        )}
                        {item.dimensions && (
                          <p className="text-[10px] text-gray-500 font-mono">
                            Specs: {item.dimensions}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Deposit Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 items-start">
              {/* Payment & Banking Instructions */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block border-b border-gray-200 pb-1">
                  Workshop Settlement Accounts
                </span>
                <div className="space-y-1 text-[11px] text-gray-700 font-medium">
                  <p className="font-bold text-slate-900">Sierra Leone Commercial Bank (SLCB)</p>
                  <p className="font-mono text-gray-600">A/C: 003001099234 • SWIFT: SLCBSLFR</p>
                  <p className="font-bold text-slate-900 pt-1">Rokel Commercial Bank</p>
                  <p className="font-mono text-gray-600">A/C: 0140293849</p>
                  <p className="font-bold text-slate-900 pt-1">Mobile Money Merchant Numbers</p>
                  <p className="font-mono text-gray-600">Orange Money: #882910 • Africell Money: #449201</p>
                </div>
              </div>

              {/* Totals & Advance Deposit */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Craftsmanship Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700">
                    <span>Trade Discount ({discountPercent}%):</span>
                    <span className="font-mono font-bold">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                {taxPercent > 0 && (
                  <div className="flex justify-between py-1 text-gray-600">
                    <span>Sales Tax / GST ({taxPercent}%):</span>
                    <span className="font-mono font-bold text-slate-900">+{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black">
                  <span className="text-slate-950 uppercase">Total Estimated Value:</span>
                  <span className="font-mono text-slate-950 text-base">{formatCurrency(totalAmount)}</span>
                </div>

                {/* 50% Deposit Banner */}
                <div className="p-3.5 bg-amber-50 border-2 border-amber-500 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-950">
                      {depositPercent}% Advance Deposit Required:
                    </span>
                    <span className="text-base font-mono font-black text-amber-900">
                      {formatCurrency(advanceDeposit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-amber-800 font-semibold pt-1 border-t border-amber-200">
                    <span>Balance on Delivery & Inspection:</span>
                    <span className="font-mono font-bold">{formatCurrency(balanceDueOnDelivery)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Guarantees */}
            <div className="mb-10 p-4 bg-gray-50/50 rounded-xl border border-gray-200 text-[10px] text-gray-700 space-y-1.5 leading-relaxed">
              <span className="font-black uppercase tracking-wider text-slate-900 block">
                Standard Commercial & Workshop Terms:
              </span>
              <p>• <strong>Deposit Requirement:</strong> Workshop timber procurement and cutting lists initiate strictly upon verification of the {depositPercent}% advance deposit.</p>
              <p>• <strong>5-Year Structural Guarantee:</strong> Sweds Wood warrants all solid timber joints and craftsmanship against defects for 5 years.</p>
              <p>• <strong>Client Acceptance:</strong> Signature below confirms authorization to proceed under these terms.</p>
            </div>

            {/* Dual Signature Blocks */}
            <div className="grid grid-cols-2 gap-12 pt-6 border-t border-gray-300">
              {/* Workshop Director Signature */}
              <div className="space-y-8">
                <div className="h-12 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="font-serif italic text-base text-wood-950 tracking-wider">
                    {currentUser?.name || 'Master Joiner / Commercial Director'}
                  </span>
                </div>
                <div className="text-center text-[10px] space-y-0.5">
                  <p className="font-black uppercase text-slate-900">Authorized Master Craftsman</p>
                  <p className="text-gray-500">Sweds Wood Workshop Management</p>
                </div>
              </div>

              {/* Client Acceptance Signature */}
              <div className="space-y-8">
                <div className="h-12 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[11px] text-gray-400 italic">Signature & Date</span>
                </div>
                <div className="text-center text-[10px] space-y-0.5">
                  <p className="font-black uppercase text-slate-900">Client Quotation Acceptance</p>
                  <p className="text-gray-500">{activeCustomer.name}</p>
                </div>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="mt-12 text-center text-[9px] text-gray-400 font-mono tracking-wider uppercase border-t border-gray-100 pt-3">
              Sweds Wood Ltd • 2 Swed Free Avenue, Sussex • Tel: +232 76 442590 • Proforma Ref: {proformaNo}
            </div>
          </div>
        </div>
      )}

      {/* Management & Archive Mode */}
      {viewMode === 'MANAGE' && (
        <div className="space-y-6 no-print">
          {/* Admin Identity & Capabilities Banner */}
          <div className="bg-gradient-to-r from-wood-950 via-slate-900 to-amber-950 text-white p-6 rounded-2xl border border-amber-500/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl shadow-md">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black rounded-full uppercase tracking-wider">
                    Authorized Administrator Control
                  </span>
                  <span className="text-amber-400 text-xs font-mono font-bold">
                    Official System Contact: +232 76 442590
                  </span>
                </div>
                <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Proforma Quotation Management Console</span>
                </h3>
                <p className="text-xs text-amber-200/80 max-w-xl">
                  {currentUser?.name || 'Mr Paul Bindi'} (Administrator) has full clearance to create, edit, re-quote, issue, and convert woodwork proforma invoices.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleStartNewProforma}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create New Proforma</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-wood-100 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Total Proformas</span>
                <Layers className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-mono font-black text-wood-950">{proformaRecords.length}</p>
              <p className="text-[10px] text-gray-400 mt-1">Archived quotations in system</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-wood-100 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Total Pipeline Value</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-mono font-black text-emerald-700">
                {formatCurrency(proformaRecords.reduce((sum, p) => sum + (p.subtotal || 0), 0))}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">Combined commercial quotations</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-wood-100 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Accepted / Converted</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-mono font-black text-blue-800">
                {proformaRecords.filter(p => p.status === 'Accepted' || p.status === 'Paid').length}
              </p>
              <p className="text-[10px] text-blue-600 font-medium mt-1">
                {formatCurrency(proformaRecords.filter(p => p.status === 'Accepted' || p.status === 'Paid').reduce((sum, p) => sum + (p.subtotal || 0), 0))}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-wood-100 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Pending / Open</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-mono font-black text-amber-700">
                {proformaRecords.filter(p => p.status === 'Issued' || p.status === 'Draft').length}
              </p>
              <p className="text-[10px] text-amber-600 font-medium mt-1">Awaiting client deposit confirmation</p>
            </div>
          </div>

          {/* Search, Filter & List Section */}
          <div className="bg-white rounded-2xl border border-wood-100 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Proforma #, client name, phone, or scope..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none font-medium text-gray-800"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'Issued', 'Accepted', 'Draft', 'Expired', 'Paid', 'Cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      statusFilter === st
                        ? 'bg-wood-950 text-amber-400 shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* List / Cards */}
            {filteredProformas.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">No Proforma Invoices Found</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try adjusting your search query or status filter.'
                    : 'Get started by creating your first official woodworking proforma invoice quotation.'}
                </p>
                <button
                  onClick={handleStartNewProforma}
                  className="mt-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Proforma</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProformas.map((inv) => (
                  <div
                    key={inv.id}
                    className={`p-4 sm:p-5 hover:bg-amber-50/40 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      editingProformaId === inv.id ? 'bg-amber-50/70 border-l-4 border-amber-500' : ''
                    }`}
                  >
                    {/* Left: Metadata & Client */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-sm text-wood-950 bg-wood-50 px-2.5 py-0.5 rounded-md border border-wood-200">
                          {inv.invoiceNo}
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{inv.date}</span>
                        </span>
                        {inv.validUntil && (
                          <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                            Valid until {inv.validUntil}
                          </span>
                        )}
                        {/* Status selector */}
                        <select
                          value={inv.status}
                          onChange={(e) => handleUpdateProformaStatus(inv.id, e.target.value as SavedInvoice['status'])}
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border cursor-pointer outline-none ${
                            inv.status === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : inv.status === 'Issued'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : inv.status === 'Paid'
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : inv.status === 'Draft'
                              ? 'bg-gray-100 text-gray-800 border-gray-300'
                              : 'bg-red-100 text-red-800 border-red-300'
                          }`}
                          title="Click to update quotation status"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Issued">Issued</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Paid">Paid</option>
                          <option value="Expired">Expired</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-amber-600" />
                          <span>{inv.customerName}</span>
                          {inv.customerCompany && (
                            <span className="text-xs text-gray-500 font-normal">({inv.customerCompany})</span>
                          )}
                        </p>
                        {inv.customerPhone && (
                          <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{inv.customerPhone}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-700 font-medium line-clamp-1">
                        <strong>Project:</strong> {inv.projectTitle || inv.items[0]?.description || 'Custom Joinery Order'}
                      </p>

                      {/* Items Preview */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(inv.items || []).slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200"
                          >
                            {item.quantity}x {item.description.slice(0, 30)}...
                          </span>
                        ))}
                        {(inv.items || []).length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-md font-bold">
                            +{(inv.items || []).length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Financials */}
                    <div className="text-left lg:text-right space-y-0.5 border-t lg:border-t-0 pt-2 lg:pt-0">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Total Quotation Value
                      </span>
                      <span className="text-lg font-mono font-black text-emerald-800 block">
                        {formatCurrency(inv.subtotal)}
                      </span>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                        50% Advance: {formatCurrency(Math.round(inv.subtotal * (inv.depositPercent !== undefined ? inv.depositPercent / 100 : 0.5)))}
                      </span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 lg:pt-0">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditSavedProforma(inv)}
                        className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-400 text-amber-950 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs"
                        title="Edit this Proforma in Form Editor"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Preview Button */}
                      <button
                        onClick={() => handlePreviewSavedProforma(inv)}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-wood-950 hover:text-white text-gray-700 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                        title="View A4 Live Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {/* Download PDF Button */}
                      <button
                        onClick={() => handleDownloadSingleProformaPdf(inv)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-xl transition cursor-pointer"
                        title="Download official PDF with system logo"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* WhatsApp Share Button */}
                      <button
                        onClick={() => {
                          handlePreviewSavedProforma(inv);
                          setTimeout(() => handleShareWhatsApp(), 100);
                        }}
                        className="p-2 bg-emerald-100 hover:bg-emerald-500 hover:text-white text-emerald-900 rounded-xl transition cursor-pointer"
                        title="Share via WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {/* Email Proforma to Client */}
                      <button
                        onClick={() => handleOpenSavedEmailModal(inv)}
                        className="p-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl transition cursor-pointer"
                        title="Send Proforma to client via Email (swedswoodinfo@gmail.com)"
                      >
                        <Mail className="w-4 h-4" />
                      </button>

                      {/* Delete Button (Admin / Manager) */}
                      {canManage && (
                        <button
                          onClick={() => setDeleteConfirmId(inv.id)}
                          className="p-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-xl transition cursor-pointer"
                          title="Delete Proforma permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Proforma Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-red-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 text-red-700 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Delete Proforma Invoice?</h3>
                  <p className="text-xs text-gray-500">This action will remove the record from both local cache and Firestore database.</p>
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Are you sure you want to delete this proforma quotation? This cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProforma(deleteConfirmId)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Record</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Convert to Job Confirmation Modal */}
      <AnimatePresence>
        {isConvertingJob && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-amber-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-wood-950">Convert to Active Workshop Job</h3>
                  <p className="text-xs text-gray-500">Client approved proforma {proformaNo}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-xs text-gray-700">
                <p><strong>Client:</strong> {activeCustomer.name}</p>
                <p><strong>Project:</strong> {projectTitle}</p>
                <p><strong>Total Value:</strong> {formatCurrency(totalAmount)}</p>
                <p><strong>Advance Deposit:</strong> {formatCurrency(advanceDeposit)}</p>
                <p><strong>Line Items:</strong> {items.length} woodwork components</p>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                This will automatically create a new live Job in the workshop production pipeline with status <strong>"In Progress"</strong> and high priority.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsConvertingJob(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvertToLiveJob}
                  className="px-4 py-2 bg-wood-950 hover:bg-wood-900 text-amber-400 rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Create Live Job</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Dispatch Modal for Proforma Invoice */}
      <EmailDispatchModal
        isOpen={emailModalData.isOpen}
        onClose={() => setEmailModalData(prev => ({ ...prev, isOpen: false }))}
        docType="PROFORMA"
        docNumber={emailModalData.docNumber}
        docDate={emailModalData.docDate}
        customerName={emailModalData.customerName}
        customerCompany={emailModalData.customerCompany}
        customerEmail={emailModalData.customerEmail}
        customerPhone={emailModalData.customerPhone}
        projectTitle={emailModalData.projectTitle}
        totalAmount={emailModalData.totalAmount}
        items={emailModalData.items}
        onDownloadPdf={emailModalData.downloadPdfFn}
      />
    </div>
  );
}
