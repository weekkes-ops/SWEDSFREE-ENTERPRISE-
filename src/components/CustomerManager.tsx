import { useState, FormEvent } from 'react';
import { Customer, Job, Employee, JobPayment, formatCurrency } from '../types';
import { 
  Plus, 
  Search, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Calendar, 
  Wrench, 
  DollarSign,
  ShieldAlert,
  Trash2,
  CreditCard,
  Receipt,
  Printer,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Percent,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerManagerProps {
  customers: Customer[];
  jobs: Job[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'registrationDate'>) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (id: string) => void;
  onRecordPayment?: (jobId: string, payment: Omit<JobPayment, 'id'>) => void;
  onAddJob?: (job: Omit<Job, 'id' | 'materialsUsed' | 'payments'>) => void;
  onUpdateJob?: (job: Job) => void;
  showRegisterModalOnLoad?: boolean;
  onCloseRegisterModal?: () => void;
  currentUser?: Employee | null;
}

export default function CustomerManager({
  customers,
  jobs,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onRecordPayment,
  onAddJob,
  onUpdateJob,
  showRegisterModalOnLoad = false,
  onCloseRegisterModal,
  currentUser
}: CustomerManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Installment Payment Modal state
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [installmentJobId, setInstallmentJobId] = useState<string>('');
  const [installmentAmount, setInstallmentAmount] = useState<number | ''>('');
  const [installmentMethod, setInstallmentMethod] = useState<'Cash' | 'Bank Transfer' | 'Check' | 'Mobile Money'>('Bank Transfer');
  const [installmentDate, setInstallmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [installmentNote, setInstallmentNote] = useState<string>('');
  
  // Quick Commission Creation within Installment Modal if client has no job
  const [createQuickJob, setCreateQuickJob] = useState(false);
  const [quickJobTitle, setQuickJobTitle] = useState('');
  const [quickJobQuote, setQuickJobQuote] = useState<number | ''>('');

  // Receipt Modal state
  const [viewReceiptPayment, setViewReceiptPayment] = useState<{ payment: JobPayment; job: Job } | null>(null);

  // Form states - Register Customer
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Form states - Edit Customer
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Auto-select first customer if selectedCustomer is missing or deleted
  if (!selectedCustomer && customers.length > 0) {
    setSelectedCustomer(customers[0]);
  }

  // Handle auto-triggering modal from dashboard action shortcuts
  useState(() => {
    if (showRegisterModalOnLoad) {
      setShowRegisterModal(true);
    }
  });

  const handleCloseModal = () => {
    setShowRegisterModal(false);
    if (onCloseRegisterModal) onCloseRegisterModal();
  };

  const handleOpenEditModal = (cust: Customer) => {
    setEditName(cust.name);
    setEditCompany(cust.company || '');
    setEditPhone(cust.phone);
    setEditEmail(cust.email);
    setEditAddress(cust.address);
    setEditNotes(cust.notes || '');
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !editName.trim()) return;

    const updated: Customer = {
      ...selectedCustomer,
      name: editName,
      company: editCompany ? editCompany : undefined,
      phone: editPhone,
      email: editEmail,
      address: editAddress,
      notes: editNotes ? editNotes : undefined
    };

    if (onUpdateCustomer) {
      onUpdateCustomer(updated);
    }
    setSelectedCustomer(updated);
    setShowEditModal(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) return;

    onAddCustomer({
      name,
      company: company ? company : undefined,
      phone,
      email,
      address,
      notes: notes ? notes : undefined
    });

    // Reset Form
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    
    setShowRegisterModal(false);
    if (onCloseRegisterModal) onCloseRegisterModal();
  };

  const handleOpenInstallmentModal = () => {
    if (!selectedCustomer) return;
    const cJobs = jobs.filter(j => j.customerId === selectedCustomer.id);
    if (cJobs.length > 0) {
      setInstallmentJobId(cJobs[0].id);
      setCreateQuickJob(false);
    } else {
      setCreateQuickJob(true);
      setInstallmentJobId('');
    }
    setInstallmentAmount('');
    setInstallmentNote('30% Initial Deposit');
    setInstallmentDate(new Date().toISOString().split('T')[0]);
    setInstallmentMethod('Bank Transfer');
    setQuickJobTitle('');
    setQuickJobQuote('');
    setShowInstallmentModal(true);
  };

  const handleRecordInstallmentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !installmentAmount || Number(installmentAmount) <= 0) return;

    let targetJobId = installmentJobId;

    // If user is creating a quick commission deposit
    if (createQuickJob || !targetJobId) {
      if (!quickJobTitle.trim() || !quickJobQuote || Number(quickJobQuote) <= 0) {
        alert('Please specify the commission title and total quote amount.');
        return;
      }
      
      const newJobId = `job-${Date.now()}`;
      const newJob: Job = {
        id: newJobId,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        title: quickJobTitle,
        description: `Bespoke commission for ${selectedCustomer.name}`,
        assignedEmployees: currentUser?.id ? [currentUser.id] : [],
        status: 'Quote',
        startDate: installmentDate,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quoteAmount: Number(quickJobQuote),
        materialsUsed: [],
        laborCost: 0,
        otherCosts: 0,
        payments: []
      };

      if (onAddJob) {
        onAddJob(newJob);
      }
      targetJobId = newJobId;
    }

    if (onRecordPayment) {
      onRecordPayment(targetJobId, {
        amount: Number(installmentAmount),
        date: installmentDate,
        method: installmentMethod,
        note: installmentNote.trim() || 'Payment Installment'
      });
    }

    setShowInstallmentModal(false);
    setInstallmentAmount('');
    setInstallmentNote('');
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const searchString = `${c.name} ${c.company || ''} ${c.email} ${c.phone}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Get active selected customer's jobs
  const customerJobs = selectedCustomer ? jobs.filter(j => j.customerId === selectedCustomer.id) : [];
  
  // Calculate selected customer's business & installment metrics
  const totalSpend = customerJobs.reduce((sum, job) => sum + job.quoteAmount, 0);
  const totalPaid = customerJobs.reduce((sum, job) => {
    const paid = job.payments.reduce((pSum, p) => pSum + p.amount, 0);
    return sum + paid;
  }, 0);
  const outstandingAmount = Math.max(0, totalSpend - totalPaid);
  const percentPaid = totalSpend > 0 ? Math.min(100, Math.round((totalPaid / totalSpend) * 100)) : 0;

  // Flatten all payment installments for this customer across all jobs
  const allCustomerInstallments: { payment: JobPayment; job: Job }[] = [];
  customerJobs.forEach(job => {
    job.payments.forEach(payment => {
      allCustomerInstallments.push({ payment, job });
    });
  });
  // Sort by newest date first
  allCustomerInstallments.sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime());

  return (
    <div className="space-y-6">
      
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Client Directory & Installments
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Register clients, track commission schedules, and record payment installments with full persistence.
          </p>
        </div>
        
        {!isAuditor ? (
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Customer</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold font-mono">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>Auditor (Read-Only)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Hand: Search and Customer List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-wood-100 shadow-xs flex flex-col h-[750px] overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 focus:border-wood-300 focus:bg-white rounded-xl outline-hidden font-medium text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-400 text-sm">
                No clients found in directory. Click "Register New Customer" to create one.
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isActive = selectedCustomer?.id === c.id;
                const cJobs = jobs.filter(j => j.customerId === c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`w-full text-left p-4 hover:bg-wood-50/20 transition flex items-start gap-3 cursor-pointer ${isActive ? 'bg-wood-50/50 border-r-4 border-wood-600' : ''}`}
                  >
                    <div className="p-2.5 bg-wood-100 text-wood-700 rounded-xl shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-gray-800 truncate">{c.name}</h4>
                      {c.company && (
                        <p className="text-[11px] text-gray-400 font-semibold flex items-center gap-1 truncate mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {c.company}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-medium">
                        <span>{cJobs.length} commission(s)</span>
                        <span>&bull;</span>
                        <span className="font-mono">Reg: {c.registrationDate}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Hand: Detailed Customer Dossier & Work history */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCustomer ? (
            <div className="space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-wood-900 rounded-2xl text-white flex items-center justify-center font-display font-bold text-xl shadow-md shadow-wood-950/20 shrink-0">
                      {selectedCustomer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display text-gray-900">{selectedCustomer.name}</h3>
                      {selectedCustomer.company && (
                        <p className="text-xs font-semibold text-wood-600 uppercase tracking-wide mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {selectedCustomer.company}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isAuditor && (
                      <button
                        onClick={() => handleOpenEditModal(selectedCustomer)}
                        className="px-2.5 py-1.5 text-xs font-black uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-xl transition cursor-pointer"
                      >
                        Edit Profile
                      </button>
                    )}
                    {currentUser?.role === 'Admin' && onDeleteCustomer && (
                      confirmDeleteId === selectedCustomer.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-xl">
                          <span className="text-[10px] font-bold text-red-700 uppercase px-1">Confirm?</span>
                          <button
                            onClick={() => {
                              onDeleteCustomer(selectedCustomer.id);
                              setConfirmDeleteId(null);
                              setSelectedCustomer(customers.find(c => c.id !== selectedCustomer.id) || null);
                            }}
                            className="px-2 py-1 text-[10px] font-black uppercase text-white bg-red-600 hover:bg-red-700 rounded-lg transition cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(selectedCustomer.id)}
                          className="px-2.5 py-1.5 text-xs font-black uppercase text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition flex items-center gap-1 cursor-pointer"
                          title="Delete this client permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Client</span>
                        </button>
                      )
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Registered: <strong className="font-mono text-gray-600">{selectedCustomer.registrationDate}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Contact grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-y border-gray-50 text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3 text-wood-600" /> Phone number
                    </span>
                    <p className="font-mono text-gray-700 font-semibold">{selectedCustomer.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Mail className="w-3 h-3 text-wood-600" /> Email address
                    </span>
                    <p className="text-gray-700 font-medium truncate">{selectedCustomer.email}</p>
                  </div>
                  <div className="space-y-1 md:col-span-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-wood-600" /> Site Address
                    </span>
                    <p className="text-gray-700 font-medium text-xs leading-tight">{selectedCustomer.address}</p>
                  </div>
                </div>

                {selectedCustomer.notes && (
                  <div className="p-3 bg-wood-50/50 rounded-xl border border-wood-100 text-xs text-wood-900">
                    <p className="font-bold mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-wood-700" />
                      Client Profile & Crafts Notes:
                    </p>
                    <p className="leading-relaxed text-gray-600">{selectedCustomer.notes}</p>
                  </div>
                )}
              </div>

              {/* Financial & Payment Installments Metrics Banner */}
              <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Client Financial Statement & Installment Status</span>
                  <span className="text-xs font-mono font-bold text-wood-700 bg-wood-50 border border-wood-200 px-2.5 py-1 rounded-lg">
                    {percentPaid}% Contract Cleared
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Total Contract Value</span>
                    <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">
                      {formatCurrency(totalSpend)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{customerJobs.length} custom commission(s)</p>
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase">Installments Cleared</span>
                    <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                      {formatCurrency(totalPaid)}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {allCustomerInstallments.length} installment payment(s)
                    </p>
                  </div>
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <span className="text-[10px] text-amber-800 font-bold uppercase">Outstanding Balance</span>
                    <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
                      {formatCurrency(outstandingAmount)}
                    </p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-1">Remaining payment due</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-gray-500">Installment Settlement Progress</span>
                    <span className="text-wood-800 font-mono">{formatCurrency(totalPaid)} / {formatCurrency(totalSpend)}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-gray-200">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* DEDICATED CLIENT PAYMENT INSTALLMENTS SECTION */}
              <div className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-display font-bold text-gray-900 text-base flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-wood-600" />
                      Client Payment Installment History
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Record deposit installments, milestone part-payments, and issue clearance receipts.
                    </p>
                  </div>

                  {!isAuditor && (
                    <button
                      onClick={handleOpenInstallmentModal}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Record Installment Payment</span>
                    </button>
                  )}
                </div>

                {allCustomerInstallments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 space-y-3">
                    <Receipt className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-xs font-semibold text-gray-500">
                      No payment installments logged for {selectedCustomer.name} yet.
                    </p>
                    {!isAuditor && (
                      <button
                        onClick={handleOpenInstallmentModal}
                        className="px-3 py-1.5 bg-wood-600 hover:bg-wood-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Record First Installment
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-y border-gray-100">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Commission / Job</th>
                          <th className="py-2.5 px-3">Milestone / Note</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3 text-right">Amount Paid</th>
                          <th className="py-2.5 px-3 text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allCustomerInstallments.map(({ payment, job }) => (
                          <tr key={payment.id} className="hover:bg-wood-50/30 transition">
                            <td className="py-3 px-3 font-mono font-semibold text-gray-700 whitespace-nowrap">
                              {payment.date}
                            </td>
                            <td className="py-3 px-3 font-bold text-gray-900 max-w-[180px] truncate">
                              {job.title}
                            </td>
                            <td className="py-3 px-3 text-gray-600 font-medium">
                              {payment.note || 'Part Payment Installment'}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-bold text-[10px]">
                                {payment.method}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-700 text-right whitespace-nowrap">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <button
                                onClick={() => setViewReceiptPayment({ payment, job })}
                                className="px-2.5 py-1 text-[11px] font-bold text-wood-700 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-lg flex items-center gap-1 mx-auto transition cursor-pointer"
                              >
                                <Receipt className="w-3 h-3 text-wood-600" />
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Jobs History Listing */}
              <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-wood-600" />
                  Woodwork Commissions List
                </h3>

                {customerJobs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No active or completed commissions logged for this client yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {customerJobs.map(job => {
                      const paid = job.payments.reduce((sum, p) => sum + p.amount, 0);
                      const isFullyPaid = paid >= job.quoteAmount;
                      
                      return (
                        <div key={job.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-800">{job.title}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="font-mono">Due: {job.dueDate}</span>
                              <span>&bull;</span>
                              <span className="font-semibold text-wood-700 uppercase text-[10px]">{job.status}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="text-xs text-gray-400 font-semibold uppercase">Financials</p>
                              <p className="text-sm font-mono font-bold text-gray-800">
                                {formatCurrency(job.quoteAmount)}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md border ${isFullyPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                              {isFullyPaid ? 'CLEARED' : 'PART PAID'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-wood-100 text-gray-400">
              Please register or select a customer from the catalog.
            </div>
          )}
        </div>

      </div>

      {/* MODAL: Record Client Payment Installment */}
      <AnimatePresence>
        {showInstallmentModal && selectedCustomer && (
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
                    <CreditCard className="w-5 h-5 text-amber-400" />
                    Record Client Installment
                  </h3>
                  <p className="text-xs text-wood-200 mt-0.5">Log a deposit or part-payment for {selectedCustomer.name}</p>
                </div>
                <button 
                  onClick={() => setShowInstallmentModal(false)}
                  className="text-wood-300 hover:text-white font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleRecordInstallmentSubmit} className="p-6 space-y-4">
                
                {/* Job Selection or Quick Job Creation */}
                {customerJobs.length > 0 && !createQuickJob ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-500 uppercase">Select Commission / Job *</label>
                      <button
                        type="button"
                        onClick={() => setCreateQuickJob(true)}
                        className="text-[11px] text-wood-700 font-bold hover:underline cursor-pointer"
                      >
                        + New Commission
                      </button>
                    </div>
                    <select
                      value={installmentJobId}
                      onChange={(e) => setInstallmentJobId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-500 outline-hidden font-medium text-gray-800"
                    >
                      {customerJobs.map(job => {
                        const paid = job.payments.reduce((s, p) => s + p.amount, 0);
                        const bal = Math.max(0, job.quoteAmount - paid);
                        return (
                          <option key={job.id} value={job.id}>
                            {job.title} — Quote: {formatCurrency(job.quoteAmount)} (Bal: {formatCurrency(bal)})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 uppercase">New Commission Details</span>
                      {customerJobs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCreateQuickJob(false);
                            if (customerJobs[0]) setInstallmentJobId(customerJobs[0].id);
                          }}
                          className="text-[11px] text-amber-800 underline font-bold cursor-pointer"
                        >
                          Select Existing Job
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600">Commission / Furniture Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Executive Mahogany Office Table"
                        value={quickJobTitle}
                        onChange={(e) => setQuickJobTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg outline-hidden font-medium text-gray-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600">Total Contract Quote Amount (Le) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Total price quoted to client"
                        value={quickJobQuote}
                        onChange={(e) => setQuickJobQuote(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg outline-hidden font-mono font-bold text-gray-800"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Installment Amount (Le) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 5000000"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-500 outline-hidden font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={installmentDate}
                      onChange={(e) => setInstallmentDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-500 outline-hidden font-mono text-gray-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Payment Method *</label>
                  <select
                    value={installmentMethod}
                    onChange={(e) => setInstallmentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-500 outline-hidden font-medium text-gray-800"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Orange Money / Mobile Money</option>
                    <option value="Check">Check / Cheque</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Milestone / Installment Note</label>
                  <input
                    type="text"
                    placeholder="e.g., 30% Initial Deposit, Part Payment 2, Final Balance"
                    value={installmentNote}
                    onChange={(e) => setInstallmentNote(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-500 outline-hidden font-medium text-gray-800"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['30% Initial Deposit', '40% Frame Assembly', '30% Final Clearance', '50% Part Payment'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setInstallmentNote(tag)}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-[10px] font-semibold transition cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInstallmentModal(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Record Payment Installment
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: View Installment Receipt */}
      <AnimatePresence>
        {viewReceiptPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between no-print">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  <h3 className="font-display font-bold text-lg">Official Payment Receipt</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="p-1.5 bg-wood-800 hover:bg-wood-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Print Receipt"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button 
                    onClick={() => setViewReceiptPayment(null)}
                    className="text-wood-300 hover:text-white font-bold text-xl cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 bg-white font-sans text-gray-800">
                
                {/* Header */}
                <div className="text-center border-b pb-4 border-gray-200">
                  <img src="/logo.svg" alt="Company Logo" className="w-12 h-12 object-contain mx-auto mb-2" />
                  <h2 className="font-display font-black text-xl text-wood-950 uppercase tracking-tight">Swedswood Enterprise</h2>
                  <p className="text-[11px] text-gray-500 font-semibold">Custom Hardwood Carpentry & Bespoke Furniture</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">Plot 42 Wilkinson Road, Freetown, Sierra Leone</p>
                  <div className="mt-3 inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black uppercase tracking-wider">
                    Official Payment Installment Receipt
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b pb-2 border-gray-100">
                    <span className="text-gray-400 font-bold uppercase">Receipt Ref #:</span>
                    <span className="font-mono font-bold text-gray-800">{viewReceiptPayment.payment.id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-gray-100">
                    <span className="text-gray-400 font-bold uppercase">Payment Date:</span>
                    <span className="font-mono font-bold text-gray-800">{viewReceiptPayment.payment.date}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-gray-100">
                    <span className="text-gray-400 font-bold uppercase">Client Name:</span>
                    <span className="font-bold text-gray-900">{selectedCustomer?.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-gray-100">
                    <span className="text-gray-400 font-bold uppercase">Commission Title:</span>
                    <span className="font-bold text-gray-900">{viewReceiptPayment.job.title}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-gray-100">
                    <span className="text-gray-400 font-bold uppercase">Milestone / Phase:</span>
                    <span className="font-bold text-wood-800">{viewReceiptPayment.payment.note || 'Part Payment Installment'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-gray-100">
                    <span className="text-gray-400 font-bold uppercase">Payment Method:</span>
                    <span className="font-bold text-gray-800">{viewReceiptPayment.payment.method}</span>
                  </div>
                </div>

                {/* Amount cleared card */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                  <span className="text-[10px] text-emerald-700 font-black uppercase tracking-wider">Amount Paid in Installment</span>
                  <p className="text-2xl font-black font-mono text-emerald-800">
                    {formatCurrency(viewReceiptPayment.payment.amount)}
                  </p>
                </div>

                {/* Balance breakdown */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-gray-500">
                    <span>Total Contract Quote:</span>
                    <span>{formatCurrency(viewReceiptPayment.job.quoteAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Total Payments Received:</span>
                    <span>{formatCurrency(viewReceiptPayment.job.payments.reduce((s, p) => s + p.amount, 0))}</span>
                  </div>
                  <div className="flex justify-between text-amber-800 font-bold border-t border-gray-200 pt-1.5">
                    <span>Remaining Balance Due:</span>
                    <span>{formatCurrency(Math.max(0, viewReceiptPayment.job.quoteAmount - viewReceiptPayment.job.payments.reduce((s, p) => s + p.amount, 0)))}</span>
                  </div>
                </div>

                {/* Footer Signature */}
                <div className="pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400 space-y-1">
                  <p className="font-semibold text-gray-600">Prepared by: {currentUser?.name || 'Managing Director'}</p>
                  <p>Thank you for choosing Swedswood Enterprise!</p>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit Customer Details */}
      <AnimatePresence>
        {showEditModal && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Edit Client Details</h3>
                  <p className="text-xs text-wood-200">Modify properties, company, and contact settings.</p>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-wood-300 hover:text-white font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Client Name *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Company / Organization</label>
                    <input
                      type="text"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-mono font-medium text-gray-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Site Address *</label>
                  <input
                    type="text"
                    required
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Notes / Preferences</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Register Customer */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Register New Client</h3>
                  <p className="text-xs text-wood-200">Record customer contact, company and site information.</p>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="text-wood-300 hover:text-white font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ama Serwaa"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Company / Organization</label>
                    <input
                      type="text"
                      placeholder="Optional company name"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+232 76 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-mono font-medium text-gray-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="client@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Site Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Street name, neighborhood, city"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Notes / Preferences</label>
                  <textarea
                    rows={3}
                    placeholder="E.g., Prefers dark mahogany stain, high-gloss polyurethane finish."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-wood-300 outline-hidden font-medium text-gray-800"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Save & Register
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
