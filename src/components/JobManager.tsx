import { useState, FormEvent } from 'react';
import { Job, JobStatus, Customer, Employee, InventoryItem, JobMaterial, JobPayment, formatCurrency } from '../types';
import { 
  Plus, 
  Search, 
  Wrench, 
  Calendar, 
  DollarSign, 
  User, 
  Users, 
  Package, 
  CheckCircle2, 
  PlusCircle, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  CreditCard,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface JobManagerProps {
  jobs: Job[];
  customers: Customer[];
  employees: Employee[];
  inventory: InventoryItem[];
  onCreateJob: (job: Omit<Job, 'id' | 'materialsUsed' | 'payments'>) => void;
  onUpdateJob?: (updatedJob: Job) => void;
  onUpdateJobStatus: (id: string, status: JobStatus) => void;
  onLogJobMaterial: (jobId: string, material: JobMaterial) => void;
  onRecordJobPayment: (jobId: string, payment: Omit<JobPayment, 'id'>) => void;
  showCreateModalOnLoad?: boolean;
  onCloseCreateModal?: () => void;
  currentUser?: Employee | null;
  onTriggerInvoice?: (jobId: string) => void;
}

export default function JobManager({
  jobs,
  customers,
  employees,
  inventory,
  onCreateJob,
  onUpdateJob,
  onUpdateJobStatus,
  onLogJobMaterial,
  onRecordJobPayment,
  showCreateModalOnLoad = false,
  onCloseCreateModal,
  currentUser,
  onTriggerInvoice
}: JobManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'All'>('All');
  const [selectedJob, setSelectedJob] = useState<Job | null>(jobs[0] || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);

  // Form states - Create Job
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [description, setDescription] = useState('');
  const [assignedStaff, setAssignedStaff] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('2026-07-20');
  const [dueDate, setDueDate] = useState('2026-08-20');
  const [quoteAmount, setQuoteAmount] = useState(5000);
  const [laborCost, setLaborCost] = useState(1000);
  const [otherCosts, setOtherCosts] = useState(200);

  // Form states - Edit Job
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editJobCustomerId, setEditJobCustomerId] = useState('');
  const [editJobDescription, setEditJobDescription] = useState('');
  const [editJobAssignedStaff, setEditJobAssignedStaff] = useState<string[]>([]);
  const [editJobStartDate, setEditJobStartDate] = useState('');
  const [editJobDueDate, setEditJobDueDate] = useState('');
  const [editJobQuoteAmount, setEditJobQuoteAmount] = useState(5000);
  const [editJobLaborCost, setEditJobLaborCost] = useState(1000);
  const [editJobOtherCosts, setEditJobOtherCosts] = useState(200);

  // Form states - Log Material
  const [materialItemId, setMaterialItemId] = useState(inventory[0]?.id || '');
  const [materialQty, setMaterialQty] = useState(10);

  // Form states - Record Payment
  const [paymentAmount, setPaymentAmount] = useState(2500);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Check' | 'Mobile Money'>('Bank Transfer');

  // Handle auto modal trigger
  useState(() => {
    if (showCreateModalOnLoad) {
      setShowCreateModal(true);
    }
  });

  const handleOpenEditModal = (job: Job) => {
    setEditJobTitle(job.title);
    setEditJobCustomerId(job.customerId);
    setEditJobDescription(job.description);
    setEditJobAssignedStaff(job.assignedEmployees);
    setEditJobStartDate(job.startDate);
    setEditJobDueDate(job.dueDate);
    setEditJobQuoteAmount(job.quoteAmount);
    setEditJobLaborCost(job.laborCost);
    setEditJobOtherCosts(job.otherCosts);
    setShowEditJobModal(true);
  };

  const handleEditJobSubmit = (e: FormEvent) => {
    e.preventDefault();
    const activeSelectedJob = jobs.find(j => j.id === selectedJob?.id) || selectedJob;
    if (!activeSelectedJob || !editJobTitle.trim() || !editJobCustomerId) return;

    const customer = customers.find(c => c.id === editJobCustomerId);
    if (!customer) return;

    const updated: Job = {
      ...activeSelectedJob,
      title: editJobTitle,
      customerId: editJobCustomerId,
      customerName: customer.name,
      description: editJobDescription,
      assignedEmployees: editJobAssignedStaff,
      startDate: editJobStartDate,
      dueDate: editJobDueDate,
      quoteAmount: editJobQuoteAmount,
      laborCost: editJobLaborCost,
      otherCosts: editJobOtherCosts
    };

    if (onUpdateJob) {
      onUpdateJob(updated);
    }
    setSelectedJob(updated);
    setShowEditJobModal(false);
  };

  const handleCreateJobSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerId) return;

    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    onCreateJob({
      customerId,
      customerName: customer.name,
      title,
      description,
      assignedEmployees: assignedStaff,
      status: 'Quote',
      startDate,
      dueDate,
      quoteAmount,
      laborCost,
      otherCosts
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setAssignedStaff([]);
    setQuoteAmount(5000);
    setLaborCost(1000);
    setOtherCosts(200);
    
    setShowCreateModal(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const handleLogMaterialSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !materialItemId) return;

    const item = inventory.find(i => i.id === materialItemId);
    if (!item) return;

    if (item.currentStock < materialQty) {
      alert(`Insufficient Inventory! Only ${item.currentStock} ${item.unit} available for ${item.name}.`);
      return;
    }

    onLogJobMaterial(selectedJob.id, {
      itemId: materialItemId,
      name: item.name,
      quantity: materialQty,
      unitCost: item.unitCost,
      totalCost: materialQty * item.unitCost
    });

    setShowMaterialModal(false);
    // Refresh selectedJob context manually to reflect the added material
    const updatedJob = jobs.find(j => j.id === selectedJob.id);
    if (updatedJob) setSelectedJob(updatedJob);
  };

  const handleRecordPaymentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    const paid = selectedJob.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = selectedJob.quoteAmount - paid;

    if (paymentAmount > remaining) {
      alert(`Overpayment warning: Remaining outstanding is only ${formatCurrency(remaining)}. Adjusting payment amount to match exactly.`);
      onRecordJobPayment(selectedJob.id, {
        amount: remaining,
        date: new Date().toISOString().split('T')[0],
        method: paymentMethod
      });
    } else {
      onRecordJobPayment(selectedJob.id, {
        amount: paymentAmount,
        date: new Date().toISOString().split('T')[0],
        method: paymentMethod
      });
    }

    setShowPaymentModal(false);
    // Refresh context
    const updatedJob = jobs.find(j => j.id === selectedJob.id);
    if (updatedJob) setSelectedJob(updatedJob);
  };

  const toggleStaffAssignment = (staffId: string) => {
    if (assignedStaff.includes(staffId)) {
      setAssignedStaff(assignedStaff.filter(id => id !== staffId));
    } else {
      setAssignedStaff([...assignedStaff, staffId]);
    }
  };

  // Filters logic
  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(searchTerm.toLowerCase()) || j.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeSelectedJob = jobs.find(j => j.id === selectedJob?.id) || selectedJob;

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Commissions & Carpentry Jobs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Initiate woodwork commissions, allocate artisan hours, update completion pipelines, and log materials consumed.
          </p>
        </div>
        
        {!isAuditor ? (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Woodwork Job</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold font-mono">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>Auditor (Read-Only)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Search & Filterable Job Cards */}
        <div className="lg:col-span-1 flex flex-col h-[650px] bg-white rounded-2xl border border-wood-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
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

            {/* Status Select filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'All')}
              className="w-full px-3 py-2 text-xs font-bold border border-gray-100 rounded-xl bg-gray-50 text-gray-600 focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Quote">Quote / Price estimate</option>
              <option value="In Progress">In Progress (Cutting / Assembly)</option>
              <option value="Ready for Sander">Ready for Sander</option>
              <option value="Ready for Polishing">Ready for Polishing</option>
              <option value="Completed">Completed Work</option>
              <option value="Delivered">Delivered & Set up</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No woodwork jobs logged under this status.
              </div>
            ) : (
              filteredJobs.map(job => {
                const isActive = activeSelectedJob?.id === job.id;
                const paid = job.payments.reduce((sum, p) => sum + p.amount, 0);
                const completePercent = Math.round((paid / job.quoteAmount) * 100);

                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`w-full text-left p-4 hover:bg-wood-50/20 transition flex flex-col gap-2 ${isActive ? 'bg-wood-50/50 border-r-4 border-wood-600' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-1 w-full">
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-2 pr-2">{job.title}</h4>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border whitespace-nowrap uppercase ${job.status === 'Completed' || job.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        {job.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 font-bold">Client: {job.customerName}</p>
                    
                    <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400 font-semibold w-full font-mono">
                      <span>Val: {formatCurrency(job.quoteAmount, 0)}</span>
                      <span>Paid: {completePercent}%</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed Production & Material Consumables dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {activeSelectedJob ? (
            <div className="space-y-6">
              
              {/* Pipeline Status Stepper Header */}
              <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-gray-900 font-display">{activeSelectedJob.title}</h2>
                      {!isAuditor && (
                        <button
                          onClick={() => handleOpenEditModal(activeSelectedJob)}
                          className="px-2 py-0.5 text-[10px] font-black uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-md transition"
                        >
                          Edit
                        </button>
                      )}
                      {onTriggerInvoice && (
                        <button
                          onClick={() => onTriggerInvoice(activeSelectedJob.id)}
                          className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition flex items-center gap-1 shadow-xs"
                        >
                          <FileText className="w-3 h-3 text-amber-700" />
                          <span>Create Invoice</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Comm ID: {activeSelectedJob.id} &bull; Client: {activeSelectedJob.customerName}</p>
                  </div>

                  {/* Status Progression Trigger */}
                  {activeSelectedJob.status !== 'Delivered' && !isAuditor && (
                    <button
                      onClick={() => {
                        const statuses: JobStatus[] = ['Quote', 'In Progress', 'Ready for Sander', 'Ready for Polishing', 'Completed', 'Delivered'];
                        const currentIndex = statuses.indexOf(activeSelectedJob.status);
                        if (currentIndex < statuses.length - 1) {
                          onUpdateJobStatus(activeSelectedJob.id, statuses[currentIndex + 1]);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-wood-100 hover:bg-wood-200 border border-wood-200 text-wood-900 rounded-xl text-xs font-extrabold transition shadow-xs"
                    >
                      <span>Advance to: {
                        activeSelectedJob.status === 'Quote' ? 'In Progress' :
                        activeSelectedJob.status === 'In Progress' ? 'Ready for Sander' :
                        activeSelectedJob.status === 'Ready for Sander' ? 'Ready for Polishing' :
                        activeSelectedJob.status === 'Ready for Polishing' ? 'Completed' : 'Delivered'
                      }</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Stepper Dots/labels */}
                <div className="grid grid-cols-6 gap-1 pt-3 border-t border-gray-50 text-[9px] font-extrabold text-center uppercase tracking-wide">
                  {(['Quote', 'In Progress', 'Ready for Sander', 'Ready for Polishing', 'Completed', 'Delivered'] as JobStatus[]).map((st, idx) => {
                    const statuses = ['Quote', 'In Progress', 'Ready for Sander', 'Ready for Polishing', 'Completed', 'Delivered'];
                    const activeIdx = statuses.indexOf(activeSelectedJob.status);
                    const isDone = idx <= activeIdx;
                    return (
                      <div key={st} className="space-y-1.5">
                        <div className={`h-1.5 rounded-full ${isDone ? 'bg-wood-600' : 'bg-gray-200'}`} />
                        <span className={isDone ? 'text-wood-900' : 'text-gray-300'}>{st.replace('Ready for ', '')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Commission Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Timeline</span>
                    <span className="text-xs font-semibold text-gray-700 font-mono block mt-1">{activeSelectedJob.startDate}</span>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase mt-0.5">to</span>
                    <span className="text-xs font-extrabold text-wood-800 font-mono block">{activeSelectedJob.dueDate}</span>
                  </div>
                  <Calendar className="w-6 h-6 text-wood-500 bg-wood-50 p-1 rounded border border-wood-100" />
                </div>

                <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Assigned Artisans</span>
                    <div className="flex flex-col gap-1 mt-1.5">
                      {activeSelectedJob.assignedEmployees.map(empId => {
                        const emp = employees.find(e => e.id === empId);
                        if (!emp) return null;
                        return (
                          <span key={empId} className="text-xs font-semibold text-gray-700">
                            &bull; {emp.name} ({emp.role})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <Users className="w-6 h-6 text-blue-500 bg-blue-50 p-1 rounded border border-blue-100" />
                </div>

                {/* Payments Overview Card */}
                <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Payments Clearing</span>
                    {!isAuditor && (
                      <button 
                        onClick={() => setShowPaymentModal(true)}
                        className="text-[10px] text-emerald-700 font-extrabold hover:underline"
                      >
                        Receive Payment
                      </button>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-lg font-bold font-mono text-gray-800">
                      {formatCurrency(activeSelectedJob.payments.reduce((sum, p) => sum + p.amount, 0), 0)} 
                      <span className="text-xs text-gray-400 font-sans font-normal"> / {formatCurrency(activeSelectedJob.quoteAmount, 0)}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                      Outstanding: <strong className="font-mono text-gray-600">
                        {formatCurrency(activeSelectedJob.quoteAmount - activeSelectedJob.payments.reduce((sum, p) => sum + p.amount, 0), 0)}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Consumer Materials Card - Live subtraction & tracking */}
              <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-wood-600" />
                    Consumed Wood, Hardware & Finishes
                  </h3>
                  {!isAuditor && (
                    <button
                      onClick={() => setShowMaterialModal(true)}
                      className="flex items-center gap-1 text-[10px] font-bold text-wood-700 bg-wood-50 px-2.5 py-1.5 rounded-lg border border-wood-200 hover:bg-wood-100 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log material used</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] border-b border-gray-100">
                        <th className="py-2.5 px-3">Raw Material</th>
                        <th className="py-2.5 px-3 text-right">Quantity Consumed</th>
                        <th className="py-2.5 px-3 text-right">Unit cost</th>
                        <th className="py-2.5 px-3 text-right">Total Material Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                      {activeSelectedJob.materialsUsed.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-gray-400 font-medium">
                            No wood, hardware, or polish sheets logged to this commission yet.
                          </td>
                        </tr>
                      ) : (
                        activeSelectedJob.materialsUsed.map((mat, i) => (
                          <tr key={`${mat.itemId}-${i}`}>
                            <td className="py-2 px-3 font-bold text-gray-800">{mat.name}</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">{mat.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(mat.unitCost)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-800">
                              {formatCurrency(mat.totalCost)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {activeSelectedJob.materialsUsed.length > 0 && (
                      <tfoot>
                        <tr className="bg-wood-50/50 font-bold border-t border-gray-100 text-gray-800">
                          <td colSpan={3} className="py-2.5 px-3 uppercase text-[10px]">Accumulated Materials Expense:</td>
                          <td className="py-2.5 px-3 text-right font-mono text-sm">
                            {formatCurrency(activeSelectedJob.materialsUsed.reduce((sum, m) => sum + m.totalCost, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Payments History Ledger Card */}
              <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-3">
                <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Cleared Invoices Ledger
                </h3>

                {activeSelectedJob.payments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 bg-gray-50/50 rounded-xl">
                    No payment logs recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeSelectedJob.payments.map((p, i) => (
                      <div key={p.id} className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-gray-500">{p.date}</span>
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="font-bold text-gray-800">{p.method} Clear</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-800">+{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-wood-100 text-gray-400">
              Please register or select a woodwork commission from the sidebar.
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: Create Custom Woodwork Job */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-xl overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Initiate Woodwork Job</h3>
                  <p className="text-xs text-wood-200">Register customized carpentry specifications and quote agreements.</p>
                </div>
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    if (onCloseCreateModal) onCloseCreateModal();
                  }}
                  className="text-wood-300 hover:text-white font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateJobSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Job / Commission Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10-Seat Mahogany Dining Table"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Select Client *</label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Custom Carpentry Specifications *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Specify dimensions, wood types, finishes, joints, or carvings required."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium resize-none"
                  />
                </div>

                {/* Team assignments checklists */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Assign Swedsfree Specialists</label>
                  <div className="grid grid-cols-2 gap-2 max-h-[110px] overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50">
                    {employees.filter(e => e.status === 'Active').map(emp => {
                      const isChecked = assignedStaff.includes(emp.id);
                      return (
                        <label key={emp.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStaffAssignment(emp.id)}
                            className="rounded border-gray-300 text-wood-600 focus:ring-wood-500 w-3.5 h-3.5"
                          />
                          <span className="truncate text-gray-700">{emp.name} ({emp.role})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold font-mono text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Estimated Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold font-mono text-gray-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Quote Amount (Le)</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Est. Labor Cost (Le)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={laborCost}
                      onChange={(e) => setLaborCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Est. Overhead (Le)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={otherCosts}
                      onChange={(e) => setOtherCosts(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowCreateModal(false);
                      if (onCloseCreateModal) onCloseCreateModal();
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs"
                  >
                    Save Job & Quote
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Log Consumed Raw Material to Active Job */}
      <AnimatePresence>
        {showMaterialModal && activeSelectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Log Consumed Materials</h3>
                  <p className="text-xs text-wood-200">Log wood or hardware taken from reserves to this commission.</p>
                </div>
                <button 
                  onClick={() => setShowMaterialModal(false)}
                  className="text-wood-300 hover:text-white font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleLogMaterialSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select Material *</label>
                  <select
                    value={materialItemId}
                    onChange={(e) => setMaterialItemId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                  >
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} (In stock: {i.currentStock} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Quantity Consumed *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={materialQty}
                    onChange={(e) => setMaterialQty(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowMaterialModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs"
                  >
                    Deduct & log material
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Receive Customer payment */}
      <AnimatePresence>
        {showPaymentModal && activeSelectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-emerald-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Receive Cleared Invoice Payment</h3>
                  <p className="text-xs text-emerald-200">Receive cash, checks, or transfers for outstanding invoices.</p>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="text-emerald-300 hover:text-white font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Payment Amount (Le) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cleared Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer / wire</option>
                    <option value="Cash">Cash</option>
                    <option value="Check">Check Clearance</option>
                    <option value="Mobile Money">Mobile Money (Momo)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition shadow-xs"
                  >
                    Clear Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit Job Details */}
      <AnimatePresence>
        {showEditJobModal && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Modify Woodwork Job</h3>
                  <p className="text-xs text-wood-200">Update specs, allocated artisans, dates, and pricing parameters.</p>
                </div>
                <button 
                  onClick={() => setShowEditJobModal(false)}
                  className="text-wood-300 hover:text-white font-bold text-xl"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleEditJobSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Commission Title *</label>
                  <input
                    type="text"
                    required
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Furniture Client *</label>
                    <select
                      value={editJobCustomerId}
                      onChange={(e) => setEditJobCustomerId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-bold text-gray-700 bg-white"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Description / Aesthetic Tastes</label>
                    <input
                      type="text"
                      value={editJobDescription}
                      onChange={(e) => setEditJobDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Allocate Swedsfree Artisans *</label>
                  <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-100">
                    {employees.filter(emp => emp.status === 'Active').map(emp => {
                      const isChecked = editJobAssignedStaff.includes(emp.id);
                      return (
                        <label key={emp.id} className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditJobAssignedStaff(prev => prev.filter(id => id !== emp.id));
                              } else {
                                setEditJobAssignedStaff(prev => [...prev, emp.id]);
                              }
                            }}
                            className="rounded text-wood-600 focus:ring-wood-500"
                          />
                          <span>{emp.name} ({emp.role})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Commencement Date</label>
                    <input
                      type="date"
                      required
                      value={editJobStartDate}
                      onChange={(e) => setEditJobStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Completion Due Date</label>
                    <input
                      type="date"
                      required
                      value={editJobDueDate}
                      onChange={(e) => setEditJobDueDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Client Quote ($)</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={editJobQuoteAmount}
                      onChange={(e) => setEditJobQuoteAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-bold font-mono text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Labor Budget ($)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editJobLaborCost}
                      onChange={(e) => setEditJobLaborCost(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-bold font-mono text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Other Overheads ($)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editJobOtherCosts}
                      onChange={(e) => setEditJobOtherCosts(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-bold font-mono text-gray-700"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditJobModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs"
                  >
                    Save Changes
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
