import { useState, useEffect, FormEvent } from 'react';
import { Job, Customer, Employee, formatCurrency, JobPayment, FinancialCategory } from '../types';
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
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceReceiptManagerProps {
  jobs: Job[];
  customers: Customer[];
  currentUser: Employee | null;
  invoiceJobId?: string | null;
  onClearInvoiceJobId?: () => void;
}

export default function InvoiceReceiptManager({
  jobs,
  customers,
  currentUser,
  invoiceJobId,
  onClearInvoiceJobId
}: InvoiceReceiptManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id || null);
  
  // Top level tabs: Invoice Workspace vs Receipt Workspace
  const [subTab, setSubTab] = useState<'INVOICE' | 'RECEIPT'>('INVOICE');

  // Custom states for Invoice customization prior to print
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(15); // Sierra Leone GST is 15%
  
  // Active documents being viewed in "PDF Form"
  const [activeInvoice, setActiveInvoice] = useState<Job | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<{ job: Job; payment: JobPayment } | null>(null);

  // PDF Preview Modes: 'VIEW' (A4 mockup) or 'EDIT' (Interactive inputs)
  const [invoicePdfMode, setInvoicePdfMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [receiptPdfMode, setReceiptPdfMode] = useState<'VIEW' | 'EDIT'>('VIEW');

  // ==========================================
  // INLINE EDITABLE STATES - INVOICE PDF
  // ==========================================
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
  interface CustomInvoiceItem {
    id: string;
    description: string;
    unitRate: string;
    amount: number;
  }
  const [customInvoiceItems, setCustomInvoiceItems] = useState<CustomInvoiceItem[]>([]);
  const [newCustomItemDesc, setNewCustomItemDesc] = useState("");
  const [newCustomItemRate, setNewCustomItemRate] = useState("Flat fee");
  const [newCustomItemAmount, setNewCustomItemAmount] = useState(0);

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

  // Sync to outer invoice creation request (e.g. from Jobs tracker)
  useEffect(() => {
    if (invoiceJobId) {
      setSubTab('INVOICE');
      setSelectedJobId(invoiceJobId);
      const job = jobs.find(j => j.id === invoiceJobId);
      if (job) {
        setActiveInvoice(job);
        setInvoicePdfMode('VIEW');
      }
      if (onClearInvoiceJobId) {
        onClearInvoiceJobId();
      }
    }
  }, [invoiceJobId, jobs, onClearInvoiceJobId]);

  // Sync Invoice local editable states when an activeInvoice is selected/opened
  useEffect(() => {
    if (activeInvoice) {
      setInvoiceCompany("SWED WOOD WORK");
      setInvoiceCompanyContact("Corporate Carpentry, Woodwork, Timber Logistics & Design.\nFreetown Workshop & Site Installations.\nSierra Leone Office: Wilkinson Road, Freetown.\nContact: info@swedwoodwork.com | +232 76 112 3344");
      setInvoiceNo(`INV-${activeInvoice.id.slice(4).toUpperCase()}`);
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setInvoiceTerms("Payment Clear / Standard Log");
      setInvoiceCustomerName(activeInvoice.customerName);
      
      const cust = customers.find(c => c.id === activeInvoice.customerId);
      setInvoiceCustomerCompany(cust?.company || "");
      setInvoiceCustomerPhone(cust?.phone || "");
      setInvoiceCustomerEmail(cust?.email || "");
      setInvoiceCustomerAddress(cust?.address || "");
      
      setInvoiceProjectTitle(activeInvoice.title);
      setInvoiceProjectDescription(activeInvoice.description || 'Custom hand-crafted carpentry order.');
      setInvoiceTimeline(`${activeInvoice.startDate} to ${activeInvoice.dueDate}`);
      setInvoiceCommissionAmount(activeInvoice.quoteAmount);
      
      setInvoiceBankInstructions(`Standard bank wires are accepted at Sierra Leone Commercial Bank (SLCB) Freetown.\nSwift Address: SLCBSLFRXXX • Account: 003-09415-2831\nPlease specify invoice reference: INV-${activeInvoice.id.slice(4).toUpperCase()}`);
      setInvoicePreparedBy(currentUser?.name || 'Managing Director');
      setCustomInvoiceItems([]); // Reset custom line items
    }
  }, [activeInvoice, customers, currentUser]);

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

  // Add a custom line item inside the invoice preview
  const handleAddCustomItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newCustomItemDesc.trim() || newCustomItemAmount < 0) return;
    const newItem: CustomInvoiceItem = {
      id: `line-${Date.now()}`,
      description: newCustomItemDesc,
      unitRate: newCustomItemRate,
      amount: newCustomItemAmount
    };
    setCustomInvoiceItems(prev => [...prev, newItem]);
    setNewCustomItemDesc("");
    setNewCustomItemRate("Flat fee");
    setNewCustomItemAmount(0);
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomInvoiceItems(prev => prev.filter(item => item.id !== id));
  };

  // Live calculation of Invoice Totals
  const getCalculatedTotals = () => {
    // base commission amount
    const baseComm = Number(invoiceCommissionAmount) || 0;
    // sum of extra custom items added
    const baseCustom = customInvoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const subtotal = baseComm + baseCustom;
    
    const discountAmount = (subtotal * discountPercent) / 100;
    const taxableAmount = subtotal - discountAmount;
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

  return (
    <div className="space-y-6">
      
      {/* Print styles override (Only prints print-area) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 1.5cm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Section Header with SubTab buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-wood-100 shadow-xs no-print">
        <div>
          <h1 className="text-xl font-display font-black text-wood-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-wood-600" />
            SWED WOOD WORK Billing Desk
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Generate, customize, edit, and print official invoices and clearance receipts in high-fidelity PDF layouts.
          </p>
        </div>

        {/* Sub-tab Switcher: Invoices vs Receipts */}
        <div className="flex bg-gray-100 p-1 rounded-xl self-start md:self-auto border border-gray-200">
          <button
            onClick={() => setSubTab('INVOICE')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'INVOICE' 
                ? 'bg-white text-wood-950 shadow-xs' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Invoice Workspace</span>
          </button>
          <button
            onClick={() => setSubTab('RECEIPT')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'RECEIPT' 
                ? 'bg-white text-emerald-950 shadow-xs' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Receipt Desk</span>
          </button>
        </div>
      </div>

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
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-wood-600" /> Invoice Document Workspace
                    </h4>
                    <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 font-bold uppercase px-2 py-0.5 rounded-md">
                      Drafting Mode
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Set discounts and applicable sales tax values. Once configured, you can generate, print, or save the beautiful custom invoice in an official PDF layout.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-wood-600" /> Apply Promo Discount (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-xs font-bold text-gray-700"
                      />
                    </div>

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

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setActiveInvoice(selectedJob);
                        setInvoicePdfMode('VIEW');
                      }}
                      className="w-full py-3 px-4 bg-wood-950 hover:bg-wood-900 text-white font-black rounded-xl text-xs uppercase flex items-center justify-center gap-2 transition shadow-md"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Generate & Open PDF Invoice Desk</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* RECEIPT SPACE PANEL */
                <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" /> Logged Payments Receipt Desk
                    </h4>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 font-bold uppercase px-2 py-0.5 rounded-md">
                      {selectedJob.payments.length} Payments Cleared
                    </span>
                  </div>

                  {selectedJob.payments.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center text-xs text-gray-400 font-bold leading-relaxed">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      No payment receipts cleared yet for this woodwork order.<br />
                      <span className="text-[11px] font-normal text-gray-400 mt-1">Please log payments in the Jobs Tracker tab first to clear client balances.</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {selectedJob.payments.map((p, index) => (
                        <div key={p.id} className="py-3.5 flex items-center justify-between text-xs">
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
                <div className="flex items-center gap-3">
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

                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-wood-950 hover:bg-wood-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print/Save PDF</span>
                  </button>

                  <button
                    onClick={() => setActiveInvoice(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 bg-white rounded-xl text-xs font-bold hover:bg-gray-50 transition"
                  >
                    Close Workspace
                  </button>
                </div>
              </div>

              {/* THE FLOATING PAPER (styled to look like an A4 page with high-contrast) */}
              <div className="bg-white p-8 sm:p-12 border border-gray-200 rounded-xl shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none">
                
                {/* Letterhead Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b-2 border-wood-950">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-wood-950 text-white rounded-lg">
                        <Wrench className="w-4 h-4" />
                      </span>
                      {invoicePdfMode === 'EDIT' ? (
                        <input
                          type="text"
                          value={invoiceCompany}
                          onChange={(e) => setInvoiceCompany(e.target.value)}
                          className="font-display font-black text-lg uppercase tracking-wider text-wood-900 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 outline-hidden"
                        />
                      ) : (
                        <span className="font-display font-black text-lg uppercase tracking-wider text-wood-900">
                          {invoiceCompany}
                        </span>
                      )}
                    </div>

                    {invoicePdfMode === 'EDIT' ? (
                      <textarea
                        rows={4}
                        value={invoiceCompanyContact}
                        onChange={(e) => setInvoiceCompanyContact(e.target.value)}
                        className="text-xs text-gray-600 leading-relaxed font-semibold bg-amber-50/50 border border-amber-200 rounded p-1.5 outline-hidden w-full"
                      />
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
                          <input
                            type="text"
                            value={invoiceNo}
                            onChange={(e) => setInvoiceNo(e.target.value)}
                            className="font-mono text-gray-800 font-bold bg-amber-50/50 border border-amber-200 rounded px-1 py-0.5 text-[11px] w-28 text-right"
                          />
                        ) : (
                          <span className="font-mono text-gray-800 font-bold">{invoiceNo}</span>
                        )}
                      </div>

                      <div className="flex md:justify-end items-center gap-1">
                        <span>Date:</span>
                        {invoicePdfMode === 'EDIT' ? (
                          <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="font-mono text-gray-800 bg-amber-50/50 border border-amber-200 rounded px-1 py-0.5 text-[11px] w-28 text-right"
                          />
                        ) : (
                          <span className="font-mono text-gray-800">{invoiceDate}</span>
                        )}
                      </div>

                      <div className="flex md:justify-end items-center gap-1">
                        <span>Terms:</span>
                        {invoicePdfMode === 'EDIT' ? (
                          <input
                            type="text"
                            value={invoiceTerms}
                            onChange={(e) => setInvoiceTerms(e.target.value)}
                            className="text-gray-800 bg-amber-50/50 border border-amber-200 rounded px-1 py-0.5 text-[11px] w-48 text-right"
                          />
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
                      <div className="space-y-1">
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
                      <div className="space-y-1">
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
                        <th className="py-2.5 px-3 text-right">Unit Rate / Unit Size</th>
                        <th className="py-2.5 px-3 text-right">Cleared Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-800">Bespoke Workshop Commission Fee</p>
                          <span className="text-[10px] text-gray-400 font-semibold">Fine assembly, wood joinery, sanding, and hand polished finish.</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-600">Flat commission</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-800">
                          {invoicePdfMode === 'EDIT' ? (
                            <input
                              type="number"
                              value={invoiceCommissionAmount}
                              onChange={(e) => setInvoiceCommissionAmount(Number(e.target.value))}
                              className="w-28 text-right bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 font-bold outline-hidden font-mono text-xs"
                            />
                          ) : (
                            formatCurrency(invoiceCommissionAmount, 0)
                          )}
                        </td>
                      </tr>

                      {/* Consumed standard materials */}
                      {activeInvoice.materialsUsed.map((m, idx) => (
                        <tr key={idx} className="bg-gray-50/30">
                          <td className="py-2.5 px-3">
                            <span className="font-bold">Allocated Lumber: {m.name}</span>
                            <span className="block text-[9px] text-gray-400 font-semibold">Consumed in construction logs.</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-500">{m.quantity} Units</td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-400">Included in Quote</td>
                        </tr>
                      ))}

                      {/* Render extra custom added line items */}
                      {customInvoiceItems.map((item) => (
                        <tr key={item.id} className="bg-amber-50/10">
                          <td className="py-2.5 px-3 font-semibold text-gray-800 flex items-center justify-between">
                            <span>{item.description}</span>
                            {invoicePdfMode === 'EDIT' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomItem(item.id)}
                                className="text-red-500 hover:text-red-700 ml-2 no-print"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-500">{item.unitRate}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                            {formatCurrency(item.amount, 0)}
                          </td>
                        </tr>
                      ))}
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

                      <div className="w-28 space-y-1">
                        <label className="text-[9px] text-gray-400 font-bold uppercase block">Billing Type</label>
                        <input
                          type="text"
                          placeholder="e.g. 2 Units, Flat fee"
                          value={newCustomItemRate}
                          onChange={(e) => setNewCustomItemRate(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-hidden font-medium"
                        />
                      </div>

                      <div className="w-28 space-y-1">
                        <label className="text-[9px] text-gray-400 font-bold uppercase block">Rate Amount (Le)</label>
                        <input
                          type="number"
                          value={newCustomItemAmount}
                          onChange={(e) => setNewCustomItemAmount(Number(e.target.value))}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-hidden font-mono font-bold"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-wood-700 hover:bg-wood-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
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

                    <div className="flex justify-between items-center text-amber-800 bg-amber-50/40 px-2 py-1 rounded-lg">
                      <span className="flex items-center gap-0.5 text-[10px] uppercase font-bold">Discount ({discountPercent}%):</span>
                      <span className="font-mono font-bold">-{formatCurrency(totals.discountAmount)}</span>
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

                {/* Bottom official Signatures line */}
                <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-8 text-center text-[10px] font-bold text-gray-400 uppercase">
                  <div className="space-y-4">
                    <p>PREPARED BY (SWED WOOD WORK REPRESENTATIVE):</p>
                    <div className="h-10 flex items-center justify-center">
                      {invoicePdfMode === 'EDIT' ? (
                        <input
                          type="text"
                          value={invoicePreparedBy}
                          onChange={(e) => setInvoicePreparedBy(e.target.value)}
                          className="font-serif italic text-gray-700 border-b border-gray-300 bg-amber-50/50 rounded px-2 py-0.5 text-center text-xs"
                        />
                      ) : (
                        <span className="font-serif italic text-gray-600 border-b border-gray-300 px-8 py-1 text-xs">
                          {invoicePreparedBy}
                        </span>
                      )}
                    </div>
                    <p className="text-[8px] text-gray-400 font-normal">Workshop Authorization Stamp</p>
                  </div>

                  <div className="space-y-4">
                    <p>CLIENT ACCEPTANCE STAMP & SIGNATURE:</p>
                    <div className="h-10 flex items-center justify-center">
                      <div className="w-36 border-b border-gray-300" />
                    </div>
                    <p className="text-[8px] text-gray-400 font-normal">Approved & Agreed Delivery Terms</p>
                  </div>
                </div>

              </div>

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
                <div className="flex items-center gap-3">
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
              <div className="bg-white p-8 sm:p-10 border border-gray-200 rounded-xl shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none">
                
                {/* Letterhead Header */}
                <div className="flex flex-col items-center text-center pb-6 border-b border-gray-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-900 text-white rounded-xl">
                      <Receipt className="w-4 h-4" />
                    </span>
                    {receiptPdfMode === 'EDIT' ? (
                      <input
                        type="text"
                        value={receiptCompany}
                        onChange={(e) => setReceiptCompany(e.target.value)}
                        className="font-display font-black text-base uppercase tracking-wider text-emerald-950 bg-amber-50/50 border border-amber-200 rounded px-2 py-0.5 text-center"
                      />
                    ) : (
                      <span className="font-display font-black text-base uppercase tracking-wider text-emerald-950">
                        {receiptCompany}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-black text-gray-800 font-display uppercase tracking-wider">OFFICIAL CLEARANCE RECEIPT</h2>
                  
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

                {/* Bottom Signatures stamp */}
                <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-6 text-center text-[10px] font-bold text-gray-400 uppercase">
                  <div>
                    <p>RECEIVED BY (AUTHORIZED SIGNATORY):</p>
                    <div className="h-10 flex items-center justify-center mt-3">
                      {receiptPdfMode === 'EDIT' ? (
                        <input
                          type="text"
                          value={receiptReceivedBy}
                          onChange={(e) => setReceiptReceivedBy(e.target.value)}
                          className="font-serif italic text-emerald-800 border-b border-gray-300 bg-amber-50/50 rounded px-2 py-0.5 text-center text-xs"
                        />
                      ) : (
                        <span className="font-serif italic text-emerald-800 border-b border-gray-300 px-6 py-1 text-sm">
                          {receiptReceivedBy}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[9px] text-gray-400">Cashier Signature</p>
                  </div>

                  <div>
                    <p>CUSTOMER COPY CLEARANCE:</p>
                    <div className="h-10 flex items-center justify-center mt-3">
                      <div className="w-36 border-b border-gray-300" />
                    </div>
                    <p className="mt-2 text-[9px] text-gray-400">Signature on Delivery</p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
