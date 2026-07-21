import { useState } from 'react';
import { Job, Customer, Employee, formatCurrency, JobPayment } from '../types';
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
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceReceiptManagerProps {
  jobs: Job[];
  customers: Customer[];
  currentUser: Employee | null;
}

export default function InvoiceReceiptManager({
  jobs,
  customers,
  currentUser
}: InvoiceReceiptManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id || null);
  
  // Custom states for Invoice customization prior to print
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(15); // Default Sierra Leone GST is 15%
  const [activeInvoice, setActiveInvoice] = useState<Job | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<{ job: Job; payment: JobPayment } | null>(null);

  // Filter jobs
  const filteredJobs = jobs.filter(j => {
    const cust = customers.find(c => c.id === j.customerId);
    const searchString = `${j.title} ${j.customerName} ${cust?.company || ''} ${j.id}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0] || null;
  const selectedCustomer = selectedJob ? customers.find(c => c.id === selectedJob.customerId) : null;

  // Invoice calculations
  const calculateInvoiceDetails = (job: Job) => {
    const base = job.quoteAmount;
    const discountAmount = (base * discountPercent) / 100;
    const taxableAmount = base - discountAmount;
    const taxAmount = (taxableAmount * taxPercent) / 100;
    const finalTotal = taxableAmount + taxAmount;
    const totalPaid = job.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = finalTotal - totalPaid;

    return {
      base,
      discountAmount,
      taxableAmount,
      taxAmount,
      finalTotal,
      totalPaid,
      outstanding
    };
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Print styles to guarantee pixel-perfect invoice and receipt outputs */}
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
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs no-print">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-wood-600" />
            Invoice & Receipt Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and print stunning professional invoices, tax clearances, and payment receipts for clients.
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>GST System Ready (15% SL)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        
        {/* Left column: Job commissions selector */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-wood-100 shadow-xs flex flex-col h-[650px] overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search job or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 focus:border-wood-300 focus:bg-white rounded-xl outline-hidden font-medium text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No woodwork jobs found.
              </div>
            ) : (
              filteredJobs.map(job => {
                const isActive = selectedJobId === job.id;
                const paid = job.payments.reduce((sum, p) => sum + p.amount, 0);
                const outstanding = job.quoteAmount - paid;

                return (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setDiscountPercent(0);
                    }}
                    className={`w-full text-left p-4 hover:bg-wood-50/20 transition flex flex-col gap-1 ${isActive ? 'bg-wood-50/50 border-r-4 border-wood-600' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-2 w-full">
                      <h4 className="text-xs font-bold text-gray-800 truncate max-w-[150px]">{job.title}</h4>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${outstanding <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {outstanding <= 0 ? 'Cleared' : 'Due'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold">Client: {job.customerName}</p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400 font-mono">
                      <span>Val: {formatCurrency(job.quoteAmount, 0)}</span>
                      <span className="font-sans text-gray-500 font-semibold">Le Paid: {formatCurrency(paid, 0)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Interactive Invoice Config & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {selectedJob ? (
            <div className="space-y-6">
              
              {/* Client and Commission Info header */}
              <div className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3.5 items-center">
                    <div className="p-3 bg-wood-950 text-white rounded-xl">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-wood-600 tracking-wider">Active Commission Log</span>
                      <h3 className="text-base font-bold text-gray-900 leading-tight">{selectedJob.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">ID: <span className="font-mono">{selectedJob.id}</span></p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase text-gray-400">Total Quoted Commission</span>
                    <p className="text-lg font-bold text-wood-900 font-mono">{formatCurrency(selectedJob.quoteAmount, 0)}</p>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-wood-600" /> Client Profile
                    </span>
                    <p className="text-sm font-bold text-gray-800">{selectedJob.customerName}</p>
                    {selectedCustomer?.company && (
                      <p className="text-xs text-wood-600 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {selectedCustomer.company}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 font-medium">{selectedCustomer?.phone || 'No phone'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-wood-600" /> Logistics Details
                    </span>
                    <p className="text-xs text-gray-600">Start Date: <strong className="font-mono text-gray-800">{selectedJob.startDate}</strong></p>
                    <p className="text-xs text-gray-600">Completion Date: <strong className="font-mono text-gray-800">{selectedJob.dueDate}</strong></p>
                    <p className="text-xs text-gray-600">Status: <strong className="uppercase text-wood-800">{selectedJob.status}</strong></p>
                  </div>
                </div>
              </div>

              {/* Invoice pre-print customizer */}
              <div className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-wood-600" /> Customise Invoice Parameters
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Before rendering the printable invoice, you can apply custom discounts or specify tax regulations (like GST). These will calculate automatically.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Percent className="w-3 h-3 text-wood-600" /> Client Discount (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                      <FileCheck className="w-3 h-3 text-wood-600" /> GST / Sales Tax (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700"
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setActiveInvoice(selectedJob);
                      setActiveReceipt(null);
                    }}
                    className="flex-1 py-3 px-4 bg-wood-950 hover:bg-wood-900 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Generate & Preview Invoice</span>
                  </button>
                </div>
              </div>

              {/* Receipts Log of selected Job */}
              <div className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" /> Logged Payments (Receipt Center)
                  </h4>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">{selectedJob.payments.length} Payments recorded</span>
                </div>

                {selectedJob.payments.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-400 font-medium">
                    No payment receipts logged yet. Record a payment on the "Woodwork Jobs" tab.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {selectedJob.payments.map((p, index) => (
                      <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-800">Payment #{index + 1} - <span className="font-mono text-[10px] text-gray-400">{p.id}</span></p>
                          <p className="text-gray-400 font-medium">Date: <span className="font-mono">{p.date}</span> &bull; Via: <strong className="text-wood-800">{p.method}</strong></p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold font-mono text-emerald-700">{formatCurrency(p.amount, 0)}</span>
                          <button
                            onClick={() => {
                              setActiveReceipt({ job: selectedJob, payment: p });
                              setActiveInvoice(null);
                            }}
                            className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                          >
                            Print Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-wood-100 shadow-xs">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-sm">Please select a woodwork job commission to manage invoices and receipts.</p>
            </div>
          )}
        </div>
      </div>

      {/* RENDER PANE: Full-Screen / Print Preview for Invoice */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white text-slate-800 rounded-2xl w-full max-w-4xl p-8 my-8 shadow-2xl relative print:my-0 print:shadow-none print:rounded-none" id="print-area">
            
            {/* Control buttons overlay (Hidden on Print) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 no-print">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-wood-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-wood-900 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
              <button
                onClick={() => setActiveInvoice(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 bg-gray-50 rounded-xl text-xs font-bold hover:bg-gray-100 transition"
              >
                Close Preview
              </button>
            </div>

            {/* Letterhead Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b-2 border-wood-900">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-wood-950 text-white rounded-lg">
                    <Wrench className="w-5 h-5" />
                  </span>
                  <span className="font-display font-black text-lg uppercase tracking-wider text-wood-900">SWEDSFREE<span className="text-gray-500 ml-0.5">ENTERPRISE</span></span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  Corporate Carpentry, Woodwork, Timber Logistics & Design.<br />
                  Freetown Workshop & Site Installations.<br />
                  Sierra Leone Office: Wilkinson Road, Freetown.<br />
                  Contact: info@swedsfree.com | +232 76 112 3344
                </p>
              </div>

              <div className="md:text-right space-y-1.5">
                <h2 className="text-2xl font-black uppercase text-wood-900 tracking-wide font-display">TAX INVOICE</h2>
                <div className="text-xs text-gray-500 font-semibold space-y-1">
                  <p>Invoice No: <span className="font-mono text-gray-800 font-bold">INV-{activeInvoice.id.slice(4).toUpperCase()}</span></p>
                  <p>Date Generated: <span className="font-mono text-gray-800">{new Date().toISOString().split('T')[0]}</span></p>
                  <p>Terms: <span className="font-mono text-gray-800 font-bold">Payment Clear / Standard Log</span></p>
                </div>
              </div>
            </div>

            {/* Client Profile and Project Scope Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 text-xs">
              <div className="space-y-1 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <span className="font-bold text-wood-900 uppercase tracking-wider block mb-1">INVOICE CLIENT:</span>
                <p className="text-sm font-black text-gray-800">{activeInvoice.customerName}</p>
                {selectedCustomer?.company && (
                  <p className="font-semibold text-wood-700">{selectedCustomer.company}</p>
                )}
                <p className="text-gray-500 font-semibold mt-1">Phone: {selectedCustomer?.phone}</p>
                <p className="text-gray-500 font-semibold">Email: {selectedCustomer?.email}</p>
                <p className="text-gray-500 leading-tight font-semibold mt-1">Delivery: {selectedCustomer?.address}</p>
              </div>

              <div className="space-y-1 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <span className="font-bold text-wood-900 uppercase tracking-wider block mb-1">COMMISSION SPECIFICATION:</span>
                <p className="text-sm font-black text-gray-800">{activeInvoice.title}</p>
                <p className="text-gray-500 leading-relaxed font-semibold">{activeInvoice.description || 'Custom hand-crafted carpentry order.'}</p>
                <p className="text-gray-500 font-semibold mt-2">Allocated Workshop Timeline: <strong className="text-gray-800">{activeInvoice.startDate}</strong> to <strong className="text-gray-800">{activeInvoice.dueDate}</strong></p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-wood-900 font-bold uppercase tracking-wider bg-gray-50">
                    <th className="py-3 px-3">Itemized Production Scope</th>
                    <th className="py-3 px-3 text-right">Unit Rate / Allocation</th>
                    <th className="py-3 px-3 text-right">Clearing Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-4 px-3 font-semibold">
                      Custom Timber Milling & Carpenter Carpentry Work<br />
                      <span className="text-[10px] text-gray-400 font-normal">Sourcing, assembly, sanding, and fine master woodwork polishing.</span>
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-gray-600">Flat commission</td>
                    <td className="py-4 px-3 text-right font-mono font-bold text-gray-800">
                      {formatCurrency(activeInvoice.quoteAmount, 0)}
                    </td>
                  </tr>

                  {/* Consumed materials, if logged */}
                  {activeInvoice.materialsUsed.map((m, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3">
                        Workshop Consumable: <span className="font-semibold">{m.name}</span><br />
                        <span className="text-[10px] text-gray-400 font-normal">Allocated materials for furniture manufacture.</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">{m.quantity} Units</td>
                      <td className="py-3 px-3 text-right font-mono text-gray-500">Included in Quote</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial summaries */}
            <div className="mt-6 border-t-2 border-gray-100 pt-6 flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="max-w-md text-xs text-gray-400 font-semibold leading-relaxed">
                <h5 className="font-bold text-wood-900 uppercase mb-1">SWEDSFREE BANK CLEARANCE INSTRUCTIONS:</h5>
                <p>Standard bank wires are accepted at Sierra Leone Commercial Bank (SLCB) Freetown.</p>
                <p>Swift Address: SLCBSLFRXXX &bull; Account: 003-09415-2831</p>
                <p>Please specify invoice reference: <span className="font-mono text-gray-700 font-bold">INV-{activeInvoice.id.slice(4).toUpperCase()}</span></p>
              </div>

              <div className="w-full md:w-80 text-xs font-semibold text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Commission Base Quote:</span>
                  <span className="font-mono text-gray-800">{formatCurrency(calculateInvoiceDetails(activeInvoice).base, 0)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Applied Discount ({discountPercent}%):</span>
                    <span className="font-mono">- {formatCurrency(calculateInvoiceDetails(activeInvoice).discountAmount, 0)}</span>
                  </div>
                )}
                {taxPercent > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Sierra Leone GST ({taxPercent}%):</span>
                    <span className="font-mono">+ {formatCurrency(calculateInvoiceDetails(activeInvoice).taxAmount, 0)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-black text-wood-950">
                  <span>Final Total Balance Due:</span>
                  <span className="font-mono text-lg">{formatCurrency(calculateInvoiceDetails(activeInvoice).finalTotal, 0)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Amount Cleared / Paid:</span>
                  <span className="font-mono">{formatCurrency(calculateInvoiceDetails(activeInvoice).totalPaid, 0)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-gray-300 pt-2 text-xs text-amber-700 font-black uppercase">
                  <span>Outstanding Invoice Balance:</span>
                  <span className="font-mono text-sm">{formatCurrency(Math.max(0, calculateInvoiceDetails(activeInvoice).outstanding), 0)}</span>
                </div>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-4">
                <p className="text-gray-400 font-bold uppercase tracking-wider">PREPARED BY (SWEDSFREE WORKSHOP):</p>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif italic text-gray-500 border-b border-gray-300 px-8 py-1">{currentUser?.name || 'Managing Director'}</span>
                </div>
                <p className="text-gray-400">Workshop Supervisor Stamp</p>
              </div>

              <div className="space-y-4">
                <p className="text-gray-400 font-bold uppercase tracking-wider">CLIENT SATISFACTION SIGN-OFF:</p>
                <div className="h-10 flex items-center justify-center">
                  <div className="w-48 border-b border-gray-300" />
                </div>
                <p className="text-gray-400">Authorized Signature & Date</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENDER PANE: Full-Screen / Print Preview for Receipt */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white text-slate-800 rounded-2xl w-full max-w-2xl p-8 my-8 shadow-2xl relative print:my-0 print:shadow-none print:rounded-none" id="print-area">
            
            {/* Control buttons overlay (Hidden on Print) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 no-print">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-800 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 bg-gray-50 rounded-xl text-xs font-bold hover:bg-gray-100 transition"
              >
                Close Preview
              </button>
            </div>

            {/* Letterhead Header */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-gray-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-900 text-white rounded-xl">
                  <Receipt className="w-5 h-5" />
                </span>
                <span className="font-display font-black text-base uppercase tracking-wider text-emerald-950">SWEDSFREE ENTERPRISE</span>
              </div>
              <h2 className="text-xl font-black text-gray-800 font-display uppercase tracking-wider">PAYMENT RECEIPT</h2>
              <p className="text-[10px] text-gray-400 font-semibold">
                Wilkinson Road, Freetown, Sierra Leone &bull; Official Commission Receipt
              </p>
            </div>

            {/* Receipt Details Box */}
            <div className="my-6 p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 space-y-4 text-xs font-semibold text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Receipt Number</span>
                  <span className="font-mono text-sm text-gray-800 font-bold">REC-{activeReceipt.payment.id.toUpperCase()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Date Cleared</span>
                  <span className="font-mono text-sm text-gray-800 font-bold">{activeReceipt.payment.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Received From (Client)</span>
                  <span className="text-gray-800 text-sm font-black">{activeReceipt.job.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Cleared Method</span>
                  <span className="text-emerald-800 text-xs uppercase font-extrabold">{activeReceipt.payment.method}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-emerald-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Woodwork Commission</span>
                  <span className="text-gray-800 text-xs font-bold leading-relaxed">{activeReceipt.job.title}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Receipt Value</span>
                  <span className="text-lg font-bold font-mono text-emerald-800 block mt-1">{formatCurrency(activeReceipt.payment.amount, 0)}</span>
                </div>
              </div>
            </div>

            {/* Acknowledgment declaration */}
            <div className="text-xs text-gray-500 leading-relaxed space-y-2 font-semibold">
              <p>
                We hereby acknowledge receipt of the payment value of <strong className="text-gray-800">{formatCurrency(activeReceipt.payment.amount, 0)}</strong>. This clearance constitutes payment towards the specified hand-crafted woodwork commission order.
              </p>
              <p className="text-[11px] text-gray-400 italic">
                All customized Swedsfree Enterprise timber, carving, hardware assembly, and polishing commissions are subject to official delivery clearance terms.
              </p>
            </div>

            {/* Official Stamps */}
            <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-6 text-center text-[10px] font-bold text-gray-400 uppercase">
              <div>
                <p>RECEIVED BY (SWEDSFREE REPRESENTATIVE):</p>
                <div className="h-10 flex items-center justify-center mt-3">
                  <span className="font-serif italic text-emerald-800 border-b border-gray-300 px-6 py-1 text-sm">{currentUser?.name || 'Cashier'}</span>
                </div>
                <p className="mt-2 text-[9px] text-gray-400">Authorized Signature</p>
              </div>

              <div>
                <p>CUSTOMER COPY CLEARANCE:</p>
                <div className="h-10 flex items-center justify-center mt-3">
                  <div className="w-36 border-b border-gray-300" />
                </div>
                <p className="mt-2 text-[9px] text-gray-400">Signature on Receipt</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
