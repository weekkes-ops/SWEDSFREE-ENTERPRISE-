import { useState, FormEvent } from 'react';
import { Customer, Job, Employee } from '../types';
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
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerManagerProps {
  customers: Customer[];
  jobs: Job[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'registrationDate'>) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  showRegisterModalOnLoad?: boolean;
  onCloseRegisterModal?: () => void;
  currentUser?: Employee | null;
}

export default function CustomerManager({
  customers,
  jobs,
  onAddCustomer,
  onUpdateCustomer,
  showRegisterModalOnLoad = false,
  onCloseRegisterModal,
  currentUser
}: CustomerManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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

  // Handle auto-triggering modal from dashboard action shortcuts
  useState(() => {
    if (showRegisterModalOnLoad) {
      setShowRegisterModal(true);
    }
  });

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

  const handleCloseModal = () => {
    setShowRegisterModal(false);
    if (onCloseRegisterModal) onCloseRegisterModal();
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const searchString = `${c.name} ${c.company || ''} ${c.email} ${c.phone}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Get active selected customer's jobs
  const customerJobs = selectedCustomer ? jobs.filter(j => j.customerId === selectedCustomer.id) : [];
  
  // Calculate selected customer's business metrics
  const totalSpend = customerJobs.reduce((sum, job) => sum + job.quoteAmount, 0);
  const totalPaid = customerJobs.reduce((sum, job) => {
    const paid = job.payments.reduce((pSum, p) => pSum + p.amount, 0);
    return sum + paid;
  }, 0);
  const outstandingAmount = totalSpend - totalPaid;

  return (
    <div className="space-y-6">
      
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Client Directory & Registration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Register and manage residential and corporate furniture clients for Swedsfree woodwork commissions.
          </p>
        </div>
        
        {!isAuditor ? (
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs self-start sm:self-auto"
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
        <div className="lg:col-span-1 bg-white rounded-2xl border border-wood-100 shadow-xs flex flex-col h-[650px] overflow-hidden">
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
              <div className="text-center py-12 text-gray-400 text-sm">
                No customers found.
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isActive = selectedCustomer?.id === c.id;
                const cJobs = jobs.filter(j => j.customerId === c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`w-full text-left p-4 hover:bg-wood-50/20 transition flex items-start gap-3 ${isActive ? 'bg-wood-50/50 border-r-4 border-wood-600' : ''}`}
                  >
                    <div className="p-2.5 bg-wood-100 text-wood-700 rounded-xl">
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
                        <span>{cJobs.length} active logs</span>
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
                    <div className="w-14 h-14 bg-wood-900 rounded-2xl text-white flex items-center justify-center font-display font-bold text-xl shadow-md shadow-wood-950/20">
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

                  <div className="flex items-center gap-2">
                    {!isAuditor && (
                      <button
                        onClick={() => handleOpenEditModal(selectedCustomer)}
                        className="px-2.5 py-1.5 text-xs font-black uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-xl transition"
                      >
                        Edit Profile
                      </button>
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

              {/* Financial Account Dossier Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Total Booked Volume</span>
                  <p className="text-2xl font-bold font-mono text-wood-900 mt-1">
                    ${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">{customerJobs.length} custom commission(s)</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase text-emerald-600">Total Payments Cleared</span>
                  <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                    ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">Paid in Full</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase text-amber-600">Outstanding Invoices</span>
                  <p className="text-2xl font-bold font-mono text-amber-700 mt-1">
                    ${outstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">Awaiting delivery / setup</p>
                </div>
              </div>

              {/* Jobs History Listing */}
              <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-wood-600" />
                  Woodwork Commission History
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
                                ${job.quoteAmount.toLocaleString()}
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
                  className="text-wood-300 hover:text-white font-bold text-xl"
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
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Corporate Company (Optional)</label>
                    <input
                      type="text"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold font-mono text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Site / Delivery Address *</label>
                  <input
                    type="text"
                    required
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Dossier Notes & Requests (Optional)</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditModal(false)}
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

      {/* MODAL: Register New Customer */}
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
                  <h3 className="font-display font-bold text-lg">Register Swedsfree Client</h3>
                  <p className="text-xs text-wood-200">Submit name and site details for commission agreements.</p>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="text-wood-300 hover:text-white font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ama Serwaa"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Company Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Elite Residences"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+233 24 111 2222"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold font-mono text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="ama.serwaa@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Site / Delivery Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Plot 42, Airport Residential, Accra"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Dossier Notes & Requests (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Specify aesthetic tastes, preferred wood, grain constraints, or timeline notes."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={handleCloseModal}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs"
                  >
                    Register client
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
