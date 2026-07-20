import { useState, FormEvent } from 'react';
import { Employee, EmployeeRole, EmployeeStatus, Job, RegistrationRequest } from '../types';
import { 
  Plus, 
  Search, 
  UserCheck, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Briefcase, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Wrench,
  WrenchIcon,
  ShieldAlert,
  UserPlus,
  Check,
  X,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeManagerProps {
  employees: Employee[];
  jobs: Job[];
  onAddEmployee: (employee: Omit<Employee, 'id' | 'hireDate'>) => void;
  onUpdateEmployeeStatus: (id: string, status: EmployeeStatus) => void;
  showRegisterModalOnLoad?: boolean;
  onCloseRegisterModal?: () => void;
  currentUser?: Employee | null;
  registrationRequests?: RegistrationRequest[];
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
}

export default function EmployeeManager({
  employees,
  jobs,
  onAddEmployee,
  onUpdateEmployeeStatus,
  showRegisterModalOnLoad = false,
  onCloseRegisterModal,
  currentUser,
  registrationRequests = [],
  onApproveRequest,
  onRejectRequest
}: EmployeeManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(employees[0] || null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [subTab, setSubTab] = useState<'employees' | 'requests'>('employees');
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    registrationRequests.length > 0 ? registrationRequests[0].id : ''
  );
  const selectedReq = registrationRequests.find(r => r.id === selectedRequestId);

  // Form states - Register Employee
  const [name, setName] = useState('');
  const [role, setRole] = useState<EmployeeRole>('Carpenter');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [baseSalary, setBaseSalary] = useState(3500);
  const [dailyRate, setDailyRate] = useState(120);

  // Handle auto-triggering modal
  useState(() => {
    if (showRegisterModalOnLoad) {
      setShowRegisterModal(true);
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) return;

    onAddEmployee({
      name,
      role,
      phone,
      email,
      status: 'Active',
      baseSalary,
      dailyRate
    });

    // Reset Form
    setName('');
    setRole('Carpenter');
    setPhone('');
    setEmail('');
    setBaseSalary(3500);
    setDailyRate(120);

    setShowRegisterModal(false);
    if (onCloseRegisterModal) onCloseRegisterModal();
  };

  const handleCloseModal = () => {
    setShowRegisterModal(false);
    if (onCloseRegisterModal) onCloseRegisterModal();
  };

  // Filter employees
  const filteredEmployees = employees.filter(e => {
    const searchString = `${e.name} ${e.role} ${e.email}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Calculate worker's assignments
  const employeeJobs = selectedEmployee ? jobs.filter(j => j.assignedEmployees.includes(selectedEmployee.id)) : [];
  const activeAssignments = employeeJobs.filter(j => j.status !== 'Completed' && j.status !== 'Delivered');

  return (
    <div className="space-y-6">
      
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Artisans & Woodworkers Registry
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Register and manage Swedsfree craftsmen, designers, and polishing specialists.
          </p>
        </div>
        
        {!isAuditor ? (
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Employee</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold font-mono">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>Auditor (Read-Only)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Hand: Worker list & Requests queue */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-wood-100 shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Sub-tabs toggle */}
          <div className="grid grid-cols-2 border-b border-gray-100 bg-gray-50/50">
            <button
              onClick={() => {
                setSubTab('employees');
                if (employees.length > 0) {
                  setSelectedEmployee(employees[0]);
                }
              }}
              className={`py-3 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${subTab === 'employees' ? 'border-wood-600 text-wood-900 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <Users className="w-4 h-4" />
              <span>Active Staff ({employees.length})</span>
            </button>
            <button
              onClick={() => {
                setSubTab('requests');
                setSelectedEmployee(null);
                if (registrationRequests.length > 0 && !selectedRequestId) {
                  setSelectedRequestId(registrationRequests[0].id);
                }
              }}
              className={`py-3 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 relative ${subTab === 'requests' ? 'border-wood-600 text-wood-900 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Pending Requests</span>
              {registrationRequests.filter(r => r.status === 'Pending').length > 0 && (
                <span className="absolute right-2 top-2 h-4 w-4 rounded-full bg-amber-500 text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                  {registrationRequests.filter(r => r.status === 'Pending').length}
                </span>
              )}
            </button>
          </div>

          {subTab === 'employees' ? (
            <>
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search staff & specialists..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 focus:border-wood-300 focus:bg-white rounded-xl outline-hidden font-medium text-gray-800 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {filteredEmployees.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No employees found.
                  </div>
                ) : (
                  filteredEmployees.map(e => {
                    const isActive = selectedEmployee?.id === e.id;
                    const activeJobsCount = jobs.filter(j => j.assignedEmployees.includes(e.id) && j.status !== 'Completed' && j.status !== 'Delivered').length;
                    
                    return (
                      <button
                        key={e.id}
                        onClick={() => {
                          setSelectedEmployee(e);
                          setSelectedRequestId('');
                        }}
                        className={`w-full text-left p-4 hover:bg-wood-50/20 transition flex items-start justify-between gap-3 ${isActive ? 'bg-wood-50/50 border-r-4 border-wood-600' : ''}`}
                      >
                        <div className="flex gap-3 min-w-0">
                          <div className="p-2.5 bg-wood-100 text-wood-700 rounded-xl font-display font-bold text-xs whitespace-nowrap">
                            {e.role.substring(0, 4).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-800 truncate">{e.name}</h4>
                            <p className="text-[11px] text-gray-400 font-bold">{e.role}</p>
                          </div>
                        </div>

                        <div className="text-right whitespace-nowrap">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${e.status === 'Active' ? 'bg-emerald-500' : e.status === 'On Leave' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                          <p className="text-[10px] text-gray-400 mt-1 font-semibold">{activeJobsCount} active jobs</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {registrationRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No registration requests found.
                </div>
              ) : (
                registrationRequests.map(req => {
                  const isActive = selectedRequestId === req.id;
                  
                  return (
                    <button
                      key={req.id}
                      onClick={() => {
                        setSelectedRequestId(req.id);
                        setSelectedEmployee(null);
                      }}
                      className={`w-full text-left p-4 hover:bg-wood-50/20 transition flex items-start justify-between gap-3 ${isActive ? 'bg-wood-50/50 border-r-4 border-wood-600' : ''}`}
                    >
                      <div className="flex gap-3 min-w-0">
                        <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl font-display font-bold text-xs whitespace-nowrap">
                          REQ
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-800 truncate">{req.name}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{req.role}</p>
                        </div>
                      </div>

                      <div className="text-right whitespace-nowrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          req.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                          req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`} />
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold">{req.status}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Hand: Worker dossier & Wage specifications */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEmployee ? (
            <div className="space-y-6">
              
              {/* Detailed Card */}
              <div className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-wood-900 rounded-2xl text-white flex items-center justify-center font-display font-bold text-xl shadow-md shadow-wood-950/20">
                      {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display text-gray-900">{selectedEmployee.name}</h3>
                      <p className="text-xs font-semibold text-wood-600 uppercase tracking-wide mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Swedsfree {selectedEmployee.role} specialist
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-bold uppercase">Status:</span>
                    <select
                      value={selectedEmployee.status}
                      disabled={isAuditor}
                      onChange={(e) => onUpdateEmployeeStatus(selectedEmployee.id, e.target.value as EmployeeStatus)}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border outline-hidden bg-white ${isAuditor ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${selectedEmployee.status === 'Active' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : selectedEmployee.status === 'On Leave' ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-gray-800 bg-gray-50 border-gray-200'}`}
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Worker specifications contact info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-y border-gray-50 text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3 text-wood-600" /> Phone number
                    </span>
                    <p className="font-mono text-gray-700 font-semibold">{selectedEmployee.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Mail className="w-3 h-3 text-wood-600" /> Email address
                    </span>
                    <p className="text-gray-700 font-medium truncate">{selectedEmployee.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-wood-600" /> Hire Date
                    </span>
                    <p className="text-gray-700 font-mono text-xs font-semibold">{selectedEmployee.hireDate}</p>
                  </div>
                </div>

                {/* Compensation Package card */}
                <div className="bg-wood-50/50 p-5 rounded-2xl border border-wood-100">
                  <h4 className="text-xs font-bold uppercase text-wood-800 mb-3 tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Wage & Compensation Settings
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-wood-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Monthly Base Salary</span>
                        <p className="text-lg font-bold font-mono text-gray-800 mt-1">
                          ${selectedEmployee.baseSalary.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-[10px] bg-wood-50 text-wood-700 font-extrabold px-2 py-1 rounded">FIXED</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-wood-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Daily Overtime Rate</span>
                        <p className="text-lg font-bold font-mono text-gray-800 mt-1">
                          ${selectedEmployee.dailyRate.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-[10px] bg-wood-50 text-wood-700 font-extrabold px-2 py-1 rounded">WAGE/DAY</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignments / Project portfolio */}
              <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
                <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-wood-600" />
                  Assigned Swedsfree Commissions
                </h3>

                {employeeJobs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    This woodworker is not currently assigned to any active jobs.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {employeeJobs.map(job => (
                      <div key={job.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-800">{job.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Customer: {job.customerName}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed border-gray-100 text-[10px] font-semibold text-wood-700 uppercase">
                          <span>{job.status}</span>
                          <span className="font-mono text-gray-500">{job.dueDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : selectedReq ? (
            <div className="space-y-6">
              {/* Registration Request Dossier */}
              <div className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-600 flex items-center justify-center font-display font-bold text-xl shadow-xs">
                      {selectedReq.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold font-display text-gray-900">{selectedReq.name}</h3>
                        <span className="text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-200/50 px-2 py-0.5 rounded-full">🇸🇱 Sierra Leonean</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                        Requested Workshop Access: <span className="text-wood-600 font-extrabold">{selectedReq.role}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-bold uppercase">Status:</span>
                    <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                      selectedReq.status === 'Pending' ? 'text-amber-800 bg-amber-50 border-amber-200' :
                      selectedReq.status === 'Approved' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' :
                      'text-red-800 bg-red-50 border-red-200'
                    }`}>
                      {selectedReq.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-b border-gray-100 py-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3 text-wood-600" /> Phone number
                    </span>
                    <p className="font-mono text-gray-700 font-semibold">{selectedReq.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Mail className="w-3 h-3 text-wood-600" /> Email address
                    </span>
                    <p className="text-gray-700 font-medium truncate">{selectedReq.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-wood-600" /> Submitted on
                    </span>
                    <p className="text-gray-700 font-mono text-xs font-semibold">{selectedReq.requestDate}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-wood-600" /> Security password PIN
                    </span>
                    <p className="text-gray-700 font-mono text-xs font-semibold">•••••• (Provided by candidate)</p>
                  </div>
                </div>

                {/* Payroll estimations based on role */}
                <div className="bg-wood-50/50 p-5 rounded-2xl border border-wood-100">
                  <h4 className="text-xs font-bold uppercase text-wood-800 mb-3 tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Estimated Payroll Configuration
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-wood-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Base Monthly Salary</span>
                        <p className="text-lg font-bold font-mono text-gray-800 mt-1">
                          ${(
                            selectedReq.role === 'Admin' ? 9500 :
                            selectedReq.role === 'Manager' ? 8000 :
                            selectedReq.role === 'Auditor' ? 6500 :
                            selectedReq.role === 'Designer' ? 6000 :
                            selectedReq.role === 'Carpenter' ? 5200 :
                            selectedReq.role === 'Carver' ? 4800 :
                            selectedReq.role === 'Sander' ? 3200 :
                            selectedReq.role === 'Polisher' ? 3800 : 3500
                          ).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-[10px] bg-wood-50 text-wood-700 font-extrabold px-2 py-1 rounded">PROPOSED</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-wood-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Daily Overtime Rate</span>
                        <p className="text-lg font-bold font-mono text-gray-800 mt-1">
                          ${(
                            selectedReq.role === 'Admin' ? 350 :
                            selectedReq.role === 'Manager' ? 280 :
                            selectedReq.role === 'Auditor' ? 220 :
                            selectedReq.role === 'Designer' ? 200 :
                            selectedReq.role === 'Carpenter' ? 190 :
                            selectedReq.role === 'Carver' ? 175 :
                            selectedReq.role === 'Sander' ? 110 :
                            selectedReq.role === 'Polisher' ? 130 : 120
                          ).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-[10px] bg-wood-50 text-wood-700 font-extrabold px-2 py-1 rounded">PROPOSED</span>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="pt-2">
                  {selectedReq.status === 'Pending' ? (
                    <div className="space-y-3">
                      {!isAuditor ? (
                        <div className="flex gap-3">
                          <button
                            onClick={() => onApproveRequest && onApproveRequest(selectedReq.id)}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve Profile & Onboard to Registry</span>
                          </button>
                          <button
                            onClick={() => onRejectRequest && onRejectRequest(selectedReq.id)}
                            className="px-6 py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject Request</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>As an Auditor, registration request actions are read-only.</span>
                        </div>
                      )}
                    </div>
                  ) : selectedReq.status === 'Approved' ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-800 leading-relaxed">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Onboarded Successfully!</p>
                        <p className="mt-1">
                          This candidate has been added to the Swedsfree Artisans Registry as a {selectedReq.role}. They can now sign in using their selected profile credentials.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-800 leading-relaxed">
                      <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Request Rejected</p>
                        <p className="mt-1">
                          This candidate registration request has been marked as Rejected and denied system access.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-wood-100 text-gray-400">
              Please register or select an artisan from the ledger.
            </div>
          )}
        </div>

      </div>

      {/* MODAL: Register New Employee */}
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
                  <h3 className="font-display font-bold text-lg">Add Swedsfree Craftsman</h3>
                  <p className="text-xs text-wood-200">Submit employee specifications, roles, and compensation agreements.</p>
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
                    <label className="text-xs font-bold text-gray-500 uppercase">Artisan Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Yao Mensah"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Specialist Role *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as EmployeeRole)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      <option value="Carpenter">Carpenter (Joints & Framing)</option>
                      <option value="Carver">Carver (Ornamental Reliefs)</option>
                      <option value="Designer">Designer (Blueprints & CAD)</option>
                      <option value="Sander">Sander (Sanding & Softness)</option>
                      <option value="Polisher">Polisher (Lacquers & French Polish)</option>
                      <option value="Manager">Manager (Operations & Estimates)</option>
                      <option value="Apprentice">Apprentice (General Assistant)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+233 24 333 4444"
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
                      placeholder="yao@swedsfree.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Monthly Base Salary ($) *</label>
                    <input
                      type="number"
                      required
                      min={500}
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Daily Rate Overtime ($) *</label>
                    <input
                      type="number"
                      required
                      min={20}
                      value={dailyRate}
                      onChange={(e) => setDailyRate(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>
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
                    Register employee
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
