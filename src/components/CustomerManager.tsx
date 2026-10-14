import { useState, useEffect, FormEvent } from 'react';
import { Customer, Job, Employee, JobPayment, formatCurrency } from '../types';
import { printDocument } from '../utils/printHelper';
import { jsPDF } from 'jspdf';
import { buildInvoicePdfContent, buildReceiptPdfContent, getLogoDataUrl } from '../utils/pdfGenerator';
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
  Download, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  X, 
  Check, 
  AlertCircle, 
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerManagerProps {
  customers: Customer[];
  jobs: Job[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'registrationDate'>) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (id: string) => void;
  onRecordPayment?: (jobId: string, payment: Omit<JobPayment, 'id'>) => void;
  onUpdateJobPayment?: (jobId: string, payment: JobPayment) => void;
  onDeleteJobPayment?: (jobId: string, paymentId: string) => void;
  onAddJob?: (job: Omit<Job, 'id' | 'materialsUsed' | 'payments'> & { id?: string }) => void;
  onUpdateJob?: (job: Job) => void;
  showRegisterModalOnLoad?: boolean;
  onCloseRegisterModal?: () => void;
  currentUser?: Employee | null;
  onTriggerProforma?: (customerId: string, jobId?: string) => void;
  onTriggerInvoice?: (jobId?: string, customerId?: string) => void;
  onTriggerReceipt?: (jobId?: string, customerId?: string) => void;
}

export default function CustomerManager({
  customers,
  jobs,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onRecordPayment,
  onUpdateJobPayment,
  onDeleteJobPayment,
  onAddJob,
  onUpdateJob,
  showRegisterModalOnLoad = false,
  onCloseRegisterModal,
  currentUser,
  onTriggerProforma,
  onTriggerInvoice,
  onTriggerReceipt
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

  // Receipt & Invoice Modal states
  const [viewReceiptPayment, setViewReceiptPayment] = useState<{ payment: JobPayment; job: Job } | null>(null);
  const [viewInvoiceJob, setViewInvoiceJob] = useState<{ job: Job; customer: Customer } | null>(null);

  // Quick Commission Modal to issue invoice when customer has no orders yet
  const [showQuickCommissionModal, setShowQuickCommissionModal] = useState(false);
  const [quickCommId, setQuickCommId] = useState('');
  const [quickCommIdError, setQuickCommIdError] = useState<string | null>(null);
  const [quickCommTitle, setQuickCommTitle] = useState('');
  const [quickCommQuote, setQuickCommQuote] = useState<number | ''>(5000);
  const [quickCommDueDate, setQuickCommDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [quickCommDesc, setQuickCommDesc] = useState('');

  // PDF Download Handler for Invoices
  const handleDownloadInvoicePdf = async (job: Job, customer: Customer) => {
    try {
      const logoDataUrl = await getLogoDataUrl('/logo.svg');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      buildInvoicePdfContent(
        doc,
        job,
        customer,
        'SWEDS_WOOD',
        currentUser || null,
        undefined,
        `INV-${job.id.slice(4).toUpperCase()}`,
        new Date().toISOString().split('T')[0],
        customer.name,
        customer.address,
        customer.phone,
        customer.email,
        'Please examine all dimensions on delivery. Thank you for choosing Sweds Wood Enterprise!',
        job.title,
        job.description,
        job.quoteAmount,
        job.quantity || 1,
        logoDataUrl
      );
      const cleanName = (customer.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Invoice_${job.id}_${cleanName}.pdf`);
    } catch (err) {
      console.error('Failed to generate invoice PDF:', err);
    }
  };

  // PDF Download Handler for Receipts
  const handleDownloadReceiptPdf = async (payment: JobPayment, job: Job, customer?: Customer) => {
    try {
      const logoDataUrl = await getLogoDataUrl('/logo.svg');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      buildReceiptPdfContent(
        doc,
        job,
        payment,
        customer || selectedCustomer || undefined,
        undefined,
        `REC-${payment.id.toUpperCase()}`,
        payment.date,
        customer?.name || selectedCustomer?.name || job.customerName,
        payment.method,
        job.title,
        payment.amount,
        undefined,
        undefined,
        undefined,
        logoDataUrl
      );
      const cleanName = (customer?.name || selectedCustomer?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Receipt_${payment.id}_${cleanName}.pdf`);
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
    }
  };

  const handleCreateQuickCommissionSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !quickCommTitle.trim() || !quickCommQuote || quickCommQuote <= 0) return;

    const assignedCommId = quickCommId.trim() || `COMM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    if (jobs && jobs.some(j => j.id.trim().toLowerCase() === assignedCommId.toLowerCase())) {
      setQuickCommIdError(`Comm ID "${assignedCommId}" already exists. Please choose a unique ID.`);
      return;
    }

    const newJob: Omit<Job, 'id' | 'materialsUsed' | 'payments'> & { id?: string } = {
      id: assignedCommId,
      title: quickCommTitle.trim(),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      description: quickCommDesc.trim() || 'Custom hand-crafted fine carpentry order',
      quantity: 1,
      assignedEmployees: [],
      status: 'Quote',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: quickCommDueDate,
      quoteAmount: Number(quickCommQuote),
      laborCost: 0,
      otherCosts: 0
    };

    if (onAddJob) {
      onAddJob(newJob);
    }

    const createdJobMock: Job = {
      ...newJob,
      id: assignedCommId,
      materialsUsed: [],
      payments: []
    };

    setShowQuickCommissionModal(false);
    setQuickCommId('');
    setQuickCommIdError(null);
    setQuickCommTitle('');
    setQuickCommQuote(5000);
    setQuickCommDesc('');

    // Immediately open the invoice for this newly created job
    setViewInvoiceJob({
      job: createdJobMock,
      customer: selectedCustomer
    });
  };

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
  useEffect(() => {
    if (!selectedCustomer && customers.length > 0) {
      setSelectedCustomer(customers[0]);
    }
  }, [selectedCustomer, customers]);

  // Handle auto-triggering modal from dashboard action shortcuts
  useEffect(() => {
    if (showRegisterModalOnLoad) {
      setShowRegisterModal(true);
    }
  }, [showRegisterModalOnLoad]);

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

  // Edit and Delete payment states
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPaymentItem, setEditingPaymentItem] = useState<{ payment: JobPayment; job: Job } | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Mobile Money'>('Cash');
  const [editPaymentDate, setEditPaymentDate] = useState<string>('');
  const [editPaymentNote, setEditPaymentNote] = useState<string>('');
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{ payment: JobPayment; job: Job } | null>(null);

  const handleOpenEditPaymentModal = (item: { payment: JobPayment; job: Job }) => {
    setEditingPaymentItem(item);
    setEditPaymentAmount(item.payment.amount);
    setEditPaymentMethod(item.payment.method);
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
      method: editPaymentMethod,
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

    setShowEditPaymentModal(false);
    setEditingPaymentItem(null);
    setEditPaymentError(null);
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
    setPaymentToDelete(null);
  };

  // Sorting states for Customers Directory and Payment Installments
  const [customerSortField, setCustomerSortField] = useState<'name' | 'company' | 'status' | 'date'>('name');
  const [customerSortDirection, setCustomerSortDirection] = useState<'asc' | 'desc'>('asc');

  const [installmentSortField, setInstallmentSortField] = useState<'date' | 'jobTitle' | 'note' | 'method' | 'amount'>('date');
  const [installmentSortDirection, setInstallmentSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleCustomerSort = (field: 'name' | 'company' | 'status' | 'date') => {
    if (customerSortField === field) {
      setCustomerSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCustomerSortField(field);
      setCustomerSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const handleInstallmentSort = (field: 'date' | 'jobTitle' | 'note' | 'method' | 'amount') => {
    if (installmentSortField === field) {
      setInstallmentSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setInstallmentSortField(field);
      setInstallmentSortDirection(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const searchString = `${c.name} ${c.company || ''} ${c.email} ${c.phone}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let valA: any = a.name;
    let valB: any = b.name;

    if (customerSortField === 'company') {
      valA = a.company || '';
      valB = b.company || '';
    } else if (customerSortField === 'date') {
      valA = a.registrationDate || '';
      valB = b.registrationDate || '';
    } else if (customerSortField === 'status') {
      const aJobs = jobs.filter(j => j.customerId === a.id).length;
      const bJobs = jobs.filter(j => j.customerId === b.id).length;
      valA = aJobs;
      valB = bJobs;
    }

    if (typeof valA === 'string') {
      const comp = (valA || '').localeCompare(valB || '');
      return customerSortDirection === 'asc' ? comp : -comp;
    }

    if (valA < valB) return customerSortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return customerSortDirection === 'asc' ? 1 : -1;
    return 0;
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

  const sortedInstallments = [...allCustomerInstallments].sort((a, b) => {
    let valA: any = a.payment.date;
    let valB: any = b.payment.date;

    if (installmentSortField === 'jobTitle') {
      valA = a.job.title;
      valB = b.job.title;
    } else if (installmentSortField === 'note') {
      valA = a.payment.note || '';
      valB = b.payment.note || '';
    } else if (installmentSortField === 'method') {
      valA = a.payment.method;
      valB = b.payment.method;
    } else if (installmentSortField === 'amount') {
      valA = a.payment.amount;
      valB = b.payment.amount;
    }

    if (typeof valA === 'string') {
      const comp = (valA || '').localeCompare(valB || '');
      return installmentSortDirection === 'asc' ? comp : -comp;
    }

    if (valA < valB) return installmentSortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return installmentSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Clients/Customers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Register clients/customers, track commission schedules, and record payment installments with full persistence.
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

          {/* Directory Column Header Sorting Bar */}
          <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase select-none">
            <button 
              onClick={() => handleCustomerSort('name')} 
              className="flex items-center gap-1 hover:text-wood-800 transition cursor-pointer"
              title="Click to sort by Client Name"
            >
              <span>Name</span>
              {customerSortField === 'name' ? (
                customerSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
              ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleCustomerSort('status')} 
                className="flex items-center gap-1 hover:text-wood-800 transition cursor-pointer"
                title="Click to sort by Commissions Status"
              >
                <span>Status</span>
                {customerSortField === 'status' ? (
                  customerSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
              </button>
              <button 
                onClick={() => handleCustomerSort('date')} 
                className="flex items-center gap-1 hover:text-wood-800 transition cursor-pointer"
                title="Click to sort by Registration Date"
              >
                <span>Reg Date</span>
                {customerSortField === 'date' ? (
                  customerSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {sortedCustomers.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-400 text-sm">
                No clients found in directory. Click "Register New Customer" to create one.
              </div>
            ) : (
              sortedCustomers.map(c => {
                const isActive = selectedCustomer?.id === c.id;
                const cJobs = jobs.filter(j => j.customerId === c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`w-full text-left p-4 hover:bg-wood-50/20 transition flex items-start justify-between gap-3 cursor-pointer ${isActive ? 'bg-wood-50/50 border-r-4 border-wood-600' : ''}`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
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
                        <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-gray-400 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-600">{cJobs.length} commission(s)</span>
                            <span>&bull;</span>
                            <span className="font-mono">Reg: {c.registrationDate}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(c);
                                if (cJobs.length > 0) {
                                  setViewInvoiceJob({ job: cJobs[0], customer: c });
                                } else {
                                  setShowQuickCommissionModal(true);
                                }
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-md transition flex items-center gap-0.5 shadow-2xs cursor-pointer"
                              title={`View / Print Invoice for ${c.name}`}
                            >
                              <FileText className="w-2.5 h-2.5 text-blue-700" />
                              <span>INV</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(c);
                                const cPayments = cJobs.flatMap(j => (j.payments || []).map(p => ({ payment: p, job: j })));
                                if (cPayments.length > 0) {
                                  setViewReceiptPayment({ payment: cPayments[0].payment, job: cPayments[0].job });
                                } else if (cJobs.length > 0) {
                                  handleOpenInstallmentModal();
                                } else {
                                  setShowQuickCommissionModal(true);
                                }
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-md transition flex items-center gap-0.5 shadow-2xs cursor-pointer"
                              title={`View / Print Receipt for ${c.name}`}
                            >
                              <Receipt className="w-2.5 h-2.5 text-emerald-700" />
                              <span>REC</span>
                            </button>
                            {onTriggerProforma && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCustomer(c);
                                  onTriggerProforma(c.id);
                                }}
                                className="px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400 rounded-md transition flex items-center gap-0.5 shadow-2xs cursor-pointer"
                                title={`Create Proforma Invoice for ${c.name}`}
                              >
                                <FileSpreadsheet className="w-2.5 h-2.5 text-amber-900" />
                                <span>PRO</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!isAuditor && onDeleteCustomer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete client "${c.name}"?`)) {
                            onDeleteCustomer(c.id);
                            if (selectedCustomer?.id === c.id) {
                              setSelectedCustomer(customers.find(item => item.id !== c.id) || null);
                            }
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                        title="Delete Client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
                    <button
                      onClick={() => {
                        if (customerJobs.length > 0) {
                          setViewInvoiceJob({ job: customerJobs[0], customer: selectedCustomer });
                        } else {
                          setShowQuickCommissionModal(true);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-black uppercase text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="View / Print official Commercial Invoice for this customer"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-700" />
                      <span>Customer Invoice</span>
                    </button>
                    <button
                      onClick={() => {
                        if (allCustomerInstallments.length > 0) {
                          setViewReceiptPayment({ payment: allCustomerInstallments[0].payment, job: allCustomerInstallments[0].job });
                        } else if (customerJobs.length > 0) {
                          handleOpenInstallmentModal();
                        } else {
                          setShowQuickCommissionModal(true);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-black uppercase text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="View / Print official Payment Receipt for this customer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Customer Receipts</span>
                    </button>
                    {onTriggerProforma && (
                      <button
                        onClick={() => onTriggerProforma(selectedCustomer.id)}
                        className="px-3 py-1.5 text-xs font-black uppercase text-amber-950 bg-amber-300 hover:bg-amber-400 border border-amber-400 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        title="Generate a modern stunning Proforma Invoice for this client"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-900" />
                        <span>Proforma Invoice</span>
                      </button>
                    )}
                    {!isAuditor && (
                      <button
                        onClick={() => handleOpenEditModal(selectedCustomer)}
                        className="px-2.5 py-1.5 text-xs font-black uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-xl transition cursor-pointer"
                      >
                        Edit Profile
                      </button>
                    )}
                    {!isAuditor && onDeleteCustomer && (
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-gray-700 font-medium truncate">{selectedCustomer.email}</p>
                      {selectedCustomer.email && (
                        <a
                          href={`mailto:${selectedCustomer.email}?cc=swedswoodinfo@gmail.com&subject=Swedswood%20Enterprise%20Notice`}
                          className="text-blue-600 hover:text-blue-800 p-0.5"
                          title="Compose email with CC to swedswoodinfo@gmail.com"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
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

              {/* DEDICATED CUSTOMER COMMERCIAL INVOICES SECTION */}
              <div className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-display font-bold text-gray-900 text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Customer Commercial Invoices
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full font-mono">
                        {customerJobs.length} {customerJobs.length === 1 ? 'Invoice' : 'Invoices'}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Commercial tax invoices, billing valuation, print-ready documents and PDF exports for {selectedCustomer.name}.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isAuditor && (
                      <button
                        onClick={() => setShowQuickCommissionModal(true)}
                        className="px-3.5 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Issue New Invoice</span>
                      </button>
                    )}
                  </div>
                </div>

                {customerJobs.length === 0 ? (
                  <div className="text-center py-8 bg-blue-50/30 rounded-xl border border-dashed border-blue-200 space-y-3">
                    <FileText className="w-8 h-8 text-blue-300 mx-auto" />
                    <p className="text-xs font-semibold text-gray-600">
                      No commercial invoices issued for {selectedCustomer.name} yet.
                    </p>
                    <p className="text-[11px] text-gray-400 max-w-md mx-auto">
                      Create an official woodwork commission order to generate and issue their commercial invoice.
                    </p>
                    {!isAuditor && (
                      <button
                        onClick={() => setShowQuickCommissionModal(true)}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Job & Issue Invoice</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-y border-gray-100 select-none">
                          <th className="py-2.5 px-3">Invoice #</th>
                          <th className="py-2.5 px-3">Commission / Scope</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">Invoice Valuation</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Document Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {customerJobs.map(job => {
                          const paid = (job.payments || []).reduce((sum, p) => sum + p.amount, 0);
                          const isCleared = paid >= job.quoteAmount;
                          const invNo = `INV-${job.id.slice(4).toUpperCase()}`;

                          return (
                            <tr key={job.id} className="hover:bg-blue-50/20 transition">
                              <td className="py-3 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                                {invNo}
                              </td>
                              <td className="py-3 px-3">
                                <p className="font-bold text-gray-900">{job.title}</p>
                                <p className="text-[10px] text-gray-500 truncate max-w-[220px]">{job.description || 'Bespoke fine woodwork'}</p>
                              </td>
                              <td className="py-3 px-3 font-mono text-gray-600 whitespace-nowrap">
                                {job.dueDate}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-gray-900 text-right whitespace-nowrap">
                                {formatCurrency(job.quoteAmount)}
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] border ${
                                  isCleared 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : paid > 0 
                                      ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {isCleared ? 'CLEARED' : paid > 0 ? 'PART-PAID' : 'DUE / UNPAID'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setViewInvoiceJob({ job, customer: selectedCustomer })}
                                    className="px-2.5 py-1 text-[11px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                    title="View / Print Commercial Invoice"
                                  >
                                    <FileText className="w-3 h-3 text-blue-700" />
                                    <span>View / Print</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadInvoicePdf(job, selectedCustomer)}
                                    className="p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-100/70 border border-blue-200 rounded-lg transition cursor-pointer"
                                    title="Download Official Invoice PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  {onTriggerInvoice && (
                                    <button
                                      onClick={() => onTriggerInvoice(job.id, selectedCustomer.id)}
                                      className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-lg transition cursor-pointer"
                                      title="Open in Full Invoices & Receipts Desk"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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
                        <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-y border-gray-100 select-none">
                          <th 
                            onClick={() => handleInstallmentSort('date')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-gray-100/80 transition"
                            title="Click to sort by payment date"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Date</span>
                              {installmentSortField === 'date' ? (
                                installmentSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                              ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                            </div>
                          </th>
                          <th 
                            onClick={() => handleInstallmentSort('jobTitle')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-gray-100/80 transition"
                            title="Click to sort by commission job title"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Commission / Job</span>
                              {installmentSortField === 'jobTitle' ? (
                                installmentSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                              ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                            </div>
                          </th>
                          <th 
                            onClick={() => handleInstallmentSort('note')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-gray-100/80 transition"
                            title="Click to sort by milestone note"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Milestone / Note</span>
                              {installmentSortField === 'note' ? (
                                installmentSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                              ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                            </div>
                          </th>
                          <th 
                            onClick={() => handleInstallmentSort('method')}
                            className="py-2.5 px-3 cursor-pointer hover:bg-gray-100/80 transition"
                            title="Click to sort by payment method"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Method</span>
                              {installmentSortField === 'method' ? (
                                installmentSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                              ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                            </div>
                          </th>
                          <th 
                            onClick={() => handleInstallmentSort('amount')}
                            className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-100/80 transition"
                            title="Click to sort by amount paid"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Amount Paid</span>
                              {installmentSortField === 'amount' ? (
                                installmentSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                              ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                            </div>
                          </th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedInstallments.map(({ payment, job }) => (
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
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setViewReceiptPayment({ payment, job })}
                                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                  title="View Receipt"
                                >
                                  <Receipt className="w-3 h-3 text-emerald-600" />
                                  <span>Receipt</span>
                                </button>
                                <button
                                  onClick={() => handleDownloadReceiptPdf(payment, job, selectedCustomer || undefined)}
                                  className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200 rounded-lg transition cursor-pointer"
                                  title="Download Receipt PDF"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditPaymentModal({ payment, job })}
                                  className="p-1 text-gray-400 hover:text-wood-700 hover:bg-wood-50 rounded transition cursor-pointer"
                                  title="Edit Payment Record"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteJobPayment && (
                                  <button
                                    onClick={() => setPaymentToDelete({ payment, job })}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                    title="Delete Payment Record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
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
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-wood-600" />
                    Woodwork Commissions List
                  </h3>
                  {onTriggerProforma && (
                    <button
                      onClick={() => onTriggerProforma(selectedCustomer.id)}
                      className="px-2.5 py-1 text-[10px] font-black uppercase text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                      title={`Draft a new Proforma quotation for ${selectedCustomer.name}`}
                    >
                      <Plus className="w-3 h-3 text-amber-900" />
                      <span>New Proforma</span>
                    </button>
                  )}
                </div>

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

                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <p className="text-xs text-gray-400 font-semibold uppercase">Financials</p>
                              <p className="text-sm font-mono font-bold text-gray-800">
                                {formatCurrency(job.quoteAmount)}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md border ${isFullyPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                              {isFullyPaid ? 'CLEARED' : 'PART PAID'}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <button
                                onClick={() => setViewInvoiceJob({ job, customer: selectedCustomer })}
                                className="px-2.5 py-1 text-[11px] font-black uppercase text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                                title={`View / Print Commercial Invoice for ${job.title}`}
                              >
                                <FileText className="w-3 h-3 text-blue-700" />
                                <span>Invoice</span>
                              </button>
                              <button
                                onClick={() => handleDownloadInvoicePdf(job, selectedCustomer)}
                                className="p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-50 border border-blue-200 rounded-lg transition shadow-2xs cursor-pointer shrink-0"
                                title={`Download Invoice PDF for ${job.title}`}
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (job.payments && job.payments.length > 0) {
                                    setViewReceiptPayment({ payment: job.payments[job.payments.length - 1], job });
                                  } else {
                                    handleOpenInstallmentModal();
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-black uppercase text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                                title={`View / Print Payment Receipt for ${job.title}`}
                              >
                                <Receipt className="w-3 h-3 text-emerald-700" />
                                <span>Receipt</span>
                              </button>
                              {onTriggerProforma && (
                                <button
                                  onClick={() => onTriggerProforma(selectedCustomer.id, job.id)}
                                  className="px-2.5 py-1 text-[11px] font-black uppercase text-amber-950 bg-amber-300 hover:bg-amber-400 border border-amber-500 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                                  title={`Create / View Proforma Invoice for ${job.title}`}
                                >
                                  <FileSpreadsheet className="w-3 h-3 text-amber-950" />
                                  <span>Proforma</span>
                                </button>
                              )}
                              {onTriggerInvoice && (
                                <button
                                  onClick={() => onTriggerInvoice(job.id, selectedCustomer.id)}
                                  className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-lg transition shadow-2xs cursor-pointer shrink-0"
                                  title="Open in Invoices & Receipts Desk"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
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
              id="receipt-print-area"
              className="bg-white rounded-2xl border border-wood-100 shadow-2xl w-full max-w-md overflow-hidden print:!block print:!overflow-visible print:!w-full print:!max-w-none print:!my-0 print:!p-0 print:!shadow-none print:!rounded-none print:!bg-white"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between no-print">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  <h3 className="font-display font-bold text-lg">Official Payment Receipt</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printDocument('receipt')}
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
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">2 Swed Free Avenue, Sussex</p>
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

                <div className="text-center text-[10px] text-gray-400 font-semibold pt-2">
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
                    <label className="text-xs font-bold text-gray-500 uppercase">Company / Institution / Private</label>
                    <input
                      type="text"
                      placeholder="Company, Institution, or Private"
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
                    <option value="Cheque">Check Clearance</option>
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
                    <span className="text-gray-500">Order:</span>
                    <span className="font-semibold text-gray-800 truncate max-w-[200px]">{paymentToDelete.job.title}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 italic">
                  This will remove the payment record and adjust the customer balance and order payments accordingly.
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
                    <label className="text-xs font-bold text-gray-500 uppercase">Company / Institution / Private</label>
                    <input
                      type="text"
                      placeholder="Company, Institution, or Private"
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

      {/* MODAL: Official Payment Clearance Receipt */}
      <AnimatePresence>
        {viewReceiptPayment && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl overflow-hidden my-6"
            >
              {/* Modal Toolbar (hidden during print) */}
              <div className="bg-emerald-950 p-4 text-white flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-display font-bold text-sm">Official Payment Clearance Receipt</h3>
                    <p className="text-[10px] text-emerald-300">Swedswood Enterprise Commission Payment Voucher</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printDocument('receipt')}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Print Official Receipt (A4 Format)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={() => handleDownloadReceiptPdf(viewReceiptPayment.payment, viewReceiptPayment.job, selectedCustomer || undefined)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Download Official Receipt PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  {onTriggerReceipt && (
                    <button
                      onClick={() => {
                        const jId = viewReceiptPayment.job.id;
                        const cId = selectedCustomer?.id;
                        setViewReceiptPayment(null);
                        onTriggerReceipt(jId, cId);
                      }}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                      title="Open in full Invoices & Receipts desk"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Receipt Desk</span>
                    </button>
                  )}
                  <button
                    onClick={() => setViewReceiptPayment(null)}
                    className="p-1.5 text-emerald-300 hover:text-white rounded-lg transition cursor-pointer"
                    title="Close Receipt Modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* The Printed Paper Receipt Container */}
              <div id="receipt-print-area" className="p-8 bg-white text-slate-900 space-y-6">
                {/* Header Letterhead */}
                <div className="flex flex-col items-center text-center pb-5 border-b-2 border-emerald-900 space-y-1.5">
                  <div className="flex items-center justify-center gap-2.5">
                    <img src="/logo.svg" alt="Swedswood Logo" className="w-12 h-12 object-contain" />
                    <div>
                      <h2 className="text-xl font-display font-black tracking-wide text-slate-900">SWEDS WOOD ENTERPRISE</h2>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">FINE WOODWORK & TIMBER ARCHITECTURE</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    2 Swed Free Avenue, Sussex • Freetown, Sierra Leone • Tel: +232 76 442590 • Email: swedswoodinfo@gmail.com
                  </p>
                  <div className="pt-1">
                    <span className="px-3 py-0.5 bg-emerald-950 text-white rounded-full font-black text-[10px] uppercase tracking-wider">
                      OFFICIAL COMMISSION PAYMENT CLEARANCE RECEIPT
                    </span>
                  </div>
                </div>

                {/* Receipt Metadata Grid */}
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Receipt Number</span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      REC-{viewReceiptPayment.payment.id.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Date Cleared</span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {viewReceiptPayment.payment.date}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Client / Customer</span>
                    <span className="text-xs font-bold text-slate-900 block">
                      {selectedCustomer?.name || viewReceiptPayment.job.customerName}
                    </span>
                    {selectedCustomer?.company && (
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        {selectedCustomer.company}
                      </span>
                    )}
                    {selectedCustomer?.phone && (
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {selectedCustomer.phone}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Payment Mode</span>
                    <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-black text-[10px] uppercase mt-0.5">
                      {viewReceiptPayment.payment.method}
                    </span>
                  </div>
                </div>

                {/* Job & Amount Details */}
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">Commission / Project</span>
                        <h4 className="text-sm font-bold text-slate-900">{viewReceiptPayment.job.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                        Job: #{viewReceiptPayment.job.id}
                      </span>
                    </div>
                    {viewReceiptPayment.payment.note && (
                      <div className="pt-1 text-xs text-slate-600 italic">
                        <span className="font-semibold text-slate-700 not-italic">Milestone Note: </span>
                        &quot;{viewReceiptPayment.payment.note}&quot;
                      </div>
                    )}
                  </div>

                  {/* Cleared Amount Box */}
                  <div className="p-4 bg-emerald-900 text-white rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">
                        Amount Received & Cleared
                      </span>
                      <span className="text-2xl font-black font-mono">
                        {formatCurrency(viewReceiptPayment.payment.amount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-lg">
                        FUNDS CLEARED
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contract Accounting Breakdown */}
                {(() => {
                  const targetJob = jobs.find(j => j.id === viewReceiptPayment.job.id) || viewReceiptPayment.job;
                  const totalPaidJob = targetJob.payments.reduce((s, p) => s + p.amount, 0);
                  const bal = Math.max(0, targetJob.quoteAmount - totalPaidJob);
                  return (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium text-slate-700">
                      <div className="flex justify-between">
                        <span>Total Commission Agreed Valuation:</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(targetJob.quoteAmount)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-800">
                        <span>Cumulative Installments Cleared to Date:</span>
                        <span className="font-mono font-bold">{formatCurrency(totalPaidJob)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold">
                        <span className="text-slate-900">Remaining Balance Due:</span>
                        <span className={`font-mono ${bal <= 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                          {bal <= 0 ? 'Le 0.00 (Fully Settled)' : formatCurrency(bal)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Seal & Authorization Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-emerald-800 flex items-center justify-center text-center p-1 font-mono text-[8px] font-black uppercase text-emerald-800 leading-tight">
                      SWEDS WOOD<br />OFFICIAL<br />SEAL
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Authorized Officer</p>
                      <p className="font-bold text-slate-800">{currentUser?.name || 'Mr Paul Bindi'}</p>
                      <p className="text-[9px] text-slate-500">Managing Director / Cashier</p>
                    </div>
                  </div>
                  <div className="text-right text-[9px] text-slate-400">
                    <p>Computer-generated receipt</p>
                    <p className="font-mono font-bold text-slate-600">Swedswood Enterprise</p>
                    <p>Sierra Leone (SLL)</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Official Commercial Invoice */}
      <AnimatePresence>
        {viewInvoiceJob && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl overflow-hidden my-6"
            >
              {/* Modal Toolbar (hidden during print) */}
              <div className="bg-slate-900 p-4 text-white flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-display font-bold text-sm">Official Commercial Invoice</h3>
                    <p className="text-[10px] text-slate-300">Swedswood Enterprise Woodwork Invoice</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printDocument('invoice')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Print Commercial Invoice (A4 Format)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Invoice</span>
                  </button>
                  <button
                    onClick={() => handleDownloadInvoicePdf(viewInvoiceJob.job, viewInvoiceJob.customer)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Download Commercial Invoice PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  {onTriggerInvoice && (
                    <button
                      onClick={() => {
                        const jId = viewInvoiceJob.job.id;
                        const cId = viewInvoiceJob.customer.id;
                        setViewInvoiceJob(null);
                        onTriggerInvoice(jId, cId);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                      title="Open in full Invoices & Receipts desk"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Invoice Desk</span>
                    </button>
                  )}
                  <button
                    onClick={() => setViewInvoiceJob(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                    title="Close Invoice Modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* The Printed Paper Invoice Container */}
              <div id="invoice-print-area" className="p-8 bg-white text-slate-900 space-y-6">
                {/* Header Letterhead */}
                <div className="flex flex-col items-center text-center pb-5 border-b-2 border-slate-900 space-y-1.5">
                  <div className="flex items-center justify-center gap-2.5">
                    <img src="/logo.svg" alt="Swedswood Logo" className="w-12 h-12 object-contain" />
                    <div>
                      <h2 className="text-xl font-display font-black tracking-wide text-slate-900">SWEDS WOOD ENTERPRISE</h2>
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">FINE WOODWORK & TIMBER ARCHITECTURE</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    2 Swed Free Avenue, Sussex • Freetown, Sierra Leone • Tel: +232 76 442590 • Email: swedswoodinfo@gmail.com
                  </p>
                  <div className="pt-1">
                    <span className="px-3 py-0.5 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-wider">
                      OFFICIAL COMMERCIAL INVOICE
                    </span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Invoice Number</span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      INV-{viewInvoiceJob.job.id.slice(4).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Date Issued</span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {new Date().toISOString().split('T')[0]}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Billed To (Client)</span>
                    <span className="text-xs font-bold text-slate-900 block">{viewInvoiceJob.customer.name}</span>
                    {viewInvoiceJob.customer.company && (
                      <span className="text-[10px] text-slate-600 font-semibold block">{viewInvoiceJob.customer.company}</span>
                    )}
                    {viewInvoiceJob.customer.phone && (
                      <span className="text-[10px] text-slate-500 font-mono block">{viewInvoiceJob.customer.phone}</span>
                    )}
                    {viewInvoiceJob.customer.address && (
                      <span className="text-[10px] text-slate-500 block">{viewInvoiceJob.customer.address}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Terms & Due Date</span>
                    <span className="text-slate-700 text-xs font-semibold block">COD / Standard Log</span>
                    <span className="text-[10px] font-mono text-slate-500 block">Due: {viewInvoiceJob.job.dueDate}</span>
                  </div>
                </div>

                {/* Scope & Line Item */}
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
                        <tr>
                          <th className="py-2.5 px-3">Item Description & Scope</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Amount (Le)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{viewInvoiceJob.job.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{viewInvoiceJob.job.description || 'Bespoke fine woodwork commission & custom craftsmanship'}</p>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">1 Set</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(viewInvoiceJob.job.quoteAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Total Box */}
                  <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                        Total Invoice Valuation
                      </span>
                      <span className="text-2xl font-black font-mono">
                        {formatCurrency(viewInvoiceJob.job.quoteAmount)}
                      </span>
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      <p>Currency: Sierra Leone Leone (Le)</p>
                      <p className="text-amber-300 font-bold">Standard Enterprise Rate</p>
                    </div>
                  </div>
                </div>

                {/* Banking & Instructions */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                  <p className="font-bold">Banking Coordinates & Wire Instructions:</p>
                  <p className="text-[11px] text-slate-700 font-mono">
                    Bank: UBA Bank • B-BAN: 540810160001602 • SWIFT: UNAFSLFRXXX • Account: Sweds Wood Enterprise
                  </p>
                </div>

                {/* Footer Authorization */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-slate-900 flex items-center justify-center text-center p-1 font-mono text-[8px] font-black uppercase text-slate-900 leading-tight">
                      SWEDS WOOD<br />OFFICIAL<br />STAMP
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Authorized Signatory</p>
                      <p className="font-bold text-slate-800">{currentUser?.name || 'Mr Paul Bindi'}</p>
                      <p className="text-[9px] text-slate-500">Managing Director</p>
                    </div>
                  </div>
                  <div className="text-right text-[9px] text-slate-400">
                    <p>Swedswood Enterprise</p>
                    <p>2 Swed Free Avenue, Sussex</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Quick Create Commission & Issue Invoice */}
      <AnimatePresence>
        {showQuickCommissionModal && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-blue-100 shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/40">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base">Issue Commercial Invoice</h3>
                    <p className="text-xs text-slate-300">Create commission order & generate invoice for {selectedCustomer.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowQuickCommissionModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateQuickCommissionSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Client Name</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedCustomer.name}${selectedCustomer.company ? ` (${selectedCustomer.company})` : ''}`}
                    className="w-full px-3 py-2 text-xs bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-700 cursor-not-allowed"
                  />
                </div>

                {/* MANUAL COMM ID INPUT */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-950 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      <span>Comm ID (Manual Input) *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const year = new Date().getFullYear();
                        const nextNum = ((jobs?.length || 0) + 1).toString().padStart(3, '0');
                        setQuickCommId(`COMM-${year}-${nextNum}`);
                        setQuickCommIdError(null);
                      }}
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs hover:bg-blue-100 transition cursor-pointer"
                    >
                      Auto-Fill Comm ID
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COMM-2026-001 or COMM-104"
                    value={quickCommId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickCommId(val);
                      if (val.trim() && jobs && jobs.some(j => j.id.trim().toLowerCase() === val.trim().toLowerCase())) {
                        setQuickCommIdError(`Comm ID "${val.trim()}" is already assigned to another job.`);
                      } else {
                        setQuickCommIdError(null);
                      }
                    }}
                    className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl outline-none font-mono font-bold tracking-wide transition ${
                      quickCommIdError 
                        ? 'border-red-400 bg-red-50/40 text-red-900' 
                        : 'border-blue-200 text-blue-950 focus:border-blue-500'
                    }`}
                  />
                  {quickCommIdError ? (
                    <p className="text-[10px] text-red-600 font-semibold">{quickCommIdError}</p>
                  ) : (
                    <p className="text-[10px] text-blue-700/80">Manual Commission Reference ID for invoicing and woodwork tracking.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase block">Commission Title / Scope *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Bedroom Teak Wardrobes / Bespoke Dining Set"
                    value={quickCommTitle}
                    onChange={(e) => setQuickCommTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-blue-500 outline-none font-semibold text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase block">Invoice Valuation (Le) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      step="any"
                      placeholder="e.g. 15000"
                      value={quickCommQuote}
                      onChange={(e) => setQuickCommQuote(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-blue-500 outline-none font-mono font-bold text-blue-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase block">Due / Delivery Date</label>
                    <input
                      type="date"
                      required
                      value={quickCommDueDate}
                      onChange={(e) => setQuickCommDueDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-blue-500 outline-none font-medium text-gray-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase block">Project Scope Description</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Fine hardwood joinery, sanded and polished complete with custom architectural fittings."
                    value={quickCommDesc}
                    onChange={(e) => setQuickCommDesc(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-gray-700"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowQuickCommissionModal(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Create & Open Commercial Invoice</span>
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
