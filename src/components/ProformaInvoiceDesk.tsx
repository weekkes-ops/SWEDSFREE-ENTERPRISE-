import React, { useState, useEffect } from 'react';
import { Customer, Job, Employee, SavedInvoice, SavedInvoiceItem, formatCurrency } from '../types';
import { saveDocument } from '../lib/firestoreService';
import { buildProformaInvoicePdfContent, ProformaPdfItem } from '../utils/pdfGenerator';
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
  ShieldCheck, 
  Copy, 
  Check, 
  Eye, 
  Edit3, 
  Briefcase,
  AlertCircle,
  RefreshCw,
  Award,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProformaInvoiceDeskProps {
  customers: Customer[];
  jobs: Job[];
  currentUser: Employee | null;
  initialCustomerId?: string | null;
  initialJobId?: string | null;
  onClearInitialParams?: () => void;
  onSaveInvoiceRecord?: (invoice: SavedInvoice) => void;
  onCreateJob?: (job: Omit<Job, 'id' | 'materialsUsed' | 'payments'>) => void;
  onSwitchToSavedInvoices?: () => void;
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
  onClearInitialParams,
  onSaveInvoiceRecord,
  onCreateJob,
  onSwitchToSavedInvoices
}: ProformaInvoiceDeskProps) {
  // Mode: Editor vs Preview
  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('PREVIEW');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isConvertingJob, setIsConvertingJob] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

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

  // Sync if initialCustomerId or initialJobId provided
  useEffect(() => {
    if (initialCustomerId) {
      setClientType('EXISTING');
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  useEffect(() => {
    if (initialJobId) {
      setLinkedJobId(initialJobId);
      const foundJob = jobs.find(j => j.id === initialJobId);
      if (foundJob) {
        setProjectTitle(foundJob.title);
        setProjectDescription(foundJob.description || 'Bespoke woodwork commission.');
        if (foundJob.customerId) {
          setClientType('EXISTING');
          setSelectedCustomerId(foundJob.customerId);
        }
        // Build items from job items or single quote
        if (foundJob.items && foundJob.items.length > 0) {
          setItems(
            foundJob.items.map((it, idx) => ({
              id: `job-item-${idx}`,
              description: it.description || foundJob.title,
              unitRate: String(it.quantity || 1),
              amount: it.totalCost || (it.quantity * it.unitCost),
              woodSpecies: 'Kiln-Dried Hardwood',
              dimensions: 'Bespoke workshop specs',
              quantity: it.quantity || 1,
              unitPrice: it.unitCost || (it.totalCost / (it.quantity || 1)),
              total: it.totalCost || (it.quantity * it.unitCost)
            }))
          );
        } else {
          setItems([
            {
              id: 'job-item-main',
              description: foundJob.title,
              unitRate: '1',
              amount: foundJob.quoteAmount,
              woodSpecies: 'Kiln-Dried Hardwood & Custom Finish',
              dimensions: 'Site measured specifications',
              quantity: 1,
              unitPrice: foundJob.quoteAmount,
              total: foundJob.quoteAmount
            }
          ]);
        }
      }
    }
  }, [initialJobId, jobs]);

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
  const handleDownloadPdf = () => {
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
      preparedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Master Joiner / Commercial Director'
    });

    const cleanCust = activeCustomer.name.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Proforma_Invoice_${proformaNo}_${cleanCust}.pdf`);
  };

  // Print Proforma
  const handlePrint = () => {
    window.print();
  };

  // Save Record
  const handleSaveRecord = () => {
    const record: SavedInvoice = {
      id: `proforma-${Date.now()}`,
      jobId: linkedJobId || 'job-proforma',
      invoiceNo: proformaNo,
      docType: 'PROFORMA',
      terms: paymentTerms,
      customerMessage: projectDescription,
      preparedBy: currentUser?.name || 'Master Joiner / Commercial Director',
      customerId: clientType === 'EXISTING' ? selectedCustomerId : `prospect-${Date.now()}`,
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
      status: 'Issued',
      notes,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    saveDocument('savedInvoices', record);

    // Also update localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('swedswood_saved_invoices') || '[]');
      const filtered = existing.filter((inv: SavedInvoice) => inv.id !== record.id);
      localStorage.setItem('swedswood_saved_invoices', JSON.stringify([record, ...filtered]));
    } catch (e) {
      console.error(e);
    }

    if (onSaveInvoiceRecord) {
      onSaveInvoiceRecord(record);
    }

    setSaveToast(`Proforma Invoice ${proformaNo} successfully saved!`);
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

_For questions or deposit confirmation, please contact Sweds Wood Workshop (+232 76 123 456)._`;

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
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Modern Luxury
              </span>
              <span className="text-amber-400/80 text-xs font-mono font-bold tracking-widest uppercase">
                Official Commercial Quotation
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <FileSpreadsheet className="w-7 h-7 text-amber-400" />
              <span>Proforma Invoice Desk</span>
            </h2>
            <p className="text-xs text-amber-200/80 max-w-2xl leading-relaxed">
              Generate exquisite, itemized woodworking proforma invoices for prospective and registered clients. Complete with timber species specifications, 50% advance deposit terms, 5-year joinery warranty, and formal master craftsman clearance seals.
            </p>
          </div>

          {/* Quick Actions */}
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
            </div>

            <button
              onClick={handleSaveRecord}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Save to database archive"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Save Record</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
              title="Download print-ready PDF"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Proforma</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Share quotation via WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            {onCreateJob && (
              <button
                onClick={() => setIsConvertingJob(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="Convert this accepted quote into an active Workshop Job"
              >
                <Award className="w-4 h-4 text-slate-950" />
                <span>Convert to Active Job</span>
              </button>
            )}
          </div>
        </div>

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
                  <label className="text-xs font-bold text-gray-700 block">Select Registered Client</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-600 font-medium text-gray-800 outline-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''} • {c.phone}
                      </option>
                    ))}
                  </select>

                  {/* Client card summary */}
                  <div className="p-3 bg-wood-50/50 rounded-xl border border-wood-200 text-xs space-y-1">
                    <p className="font-bold text-wood-950">{activeCustomer.name}</p>
                    {activeCustomer.company && (
                      <p className="text-gray-600 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        <span>{activeCustomer.company}</span>
                      </p>
                    )}
                    {activeCustomer.phone && (
                      <p className="text-gray-600 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{activeCustomer.phone}</span>
                      </p>
                    )}
                    {activeCustomer.address && (
                      <p className="text-gray-600 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{activeCustomer.address}</span>
                      </p>
                    )}
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
            {/* Watermark Crest Seal in Center Background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <div className="w-[500px] h-[500px] rounded-full border-[20px] border-wood-950 flex items-center justify-center text-center p-10">
                <span className="text-6xl font-serif font-black tracking-widest text-wood-950">
                  SWEDS WOOD
                </span>
              </div>
            </div>

            {/* Top Border Gold/Navy Accent Stripe */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-wood-950 via-amber-500 to-wood-900" />

            {/* Header: Company & Proforma Badge */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-6 mb-8">
              {/* Left: Sweds Wood Branding */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-wood-950 text-amber-400 flex items-center justify-center font-serif text-2xl font-black shadow-md border border-amber-500/40">
                    SW
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
                  <p>Workshop: 42 Timber Yard Industrial Layout, Off Bai Bureh Road</p>
                  <p>Freetown, Sierra Leone • Tel: +232 76 123 456 / +232 88 654 321</p>
                  <p>Web: www.swedswood.com • Email: workshop@swedswood.com</p>
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
              Sweds Wood Ltd • Premium Sierra Leonean Architectural Joinery • Proforma Ref: {proformaNo}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
