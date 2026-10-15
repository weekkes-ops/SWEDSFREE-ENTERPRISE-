import { useState, useEffect, FormEvent } from 'react';
import { Employee, EmployeeRole, EmployeeStatus, Job, RegistrationRequest, WarningLetter, formatCurrency } from '../types';
import { 
  Plus, 
  Search, 
  UserCheck, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Briefcase, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Wrench,
  WrenchIcon,
  ShieldAlert,
  UserPlus,
  Check,
  X,
  Users,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  KeyRound,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Sparkles,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeManagerProps {
  employees: Employee[];
  jobs: Job[];
  onAddEmployee: (employee: Omit<Employee, 'id' | 'hireDate'>) => void;
  onUpdateEmployee?: (employee: Employee) => void;
  onDeleteEmployee?: (id: string) => void;
  onUpdateEmployeeStatus: (id: string, status: EmployeeStatus) => void;
  onResetPassword?: (employeeId: string, newPassword: string) => void;
  showRegisterModalOnLoad?: boolean;
  onCloseRegisterModal?: () => void;
  initialOpenPasswordsTab?: boolean;
  currentUser?: Employee | null;
  registrationRequests?: RegistrationRequest[];
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
  onDeleteRegistrationRequest?: (id: string) => void;
  warningLetters?: WarningLetter[];
  onAddWarningLetter?: (warning: Omit<WarningLetter, 'id'>) => void;
  onDeleteWarningLetter?: (id: string) => void;
}

export default function EmployeeManager({
  employees,
  jobs,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onUpdateEmployeeStatus,
  onResetPassword,
  showRegisterModalOnLoad = false,
  onCloseRegisterModal,
  initialOpenPasswordsTab = false,
  currentUser,
  registrationRequests = [],
  onApproveRequest,
  onRejectRequest,
  onDeleteRegistrationRequest,
  warningLetters = [],
  onAddWarningLetter,
  onDeleteWarningLetter
}: EmployeeManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const isAdmin = currentUser?.role === 'Admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(employees[0] || null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [subTab, setSubTab] = useState<'employees' | 'requests' | 'passwords'>('employees');
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    registrationRequests.length > 0 ? registrationRequests[0].id : ''
  );
  const selectedReq = registrationRequests.find(r => r.id === selectedRequestId);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Password Management States (Admin Feature)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmployee, setResetEmployee] = useState<Employee | null>(null);
  const [resetMethod, setResetMethod] = useState<'default' | 'numeric' | 'alphanumeric' | 'custom'>('numeric');
  const [customPassword, setCustomPassword] = useState('');
  const [showCustomPassword, setShowCustomPassword] = useState(true);
  const [generatedPin, setGeneratedPin] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [generatedAlpha, setGeneratedAlpha] = useState(() => 'Swed#' + Math.floor(100 + Math.random() * 900));
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [passwordSearchTerm, setPasswordSearchTerm] = useState('');
  const [passwordRoleFilter, setPasswordRoleFilter] = useState('ALL');
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [resetSuccessData, setResetSuccessData] = useState<{
    name: string;
    email: string;
    role: string;
    password: string;
  } | null>(null);

  // Form states - Register Employee
  const [name, setName] = useState('');
  const [role, setRole] = useState<EmployeeRole>('Carpenter');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('1234');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Form states - Edit Employee
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<EmployeeRole>('Carpenter');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Form states - Warning Letter
  const [warnType, setWarnType] = useState('First Written Warning');
  const [warnReason, setWarnReason] = useState('');
  const [warnSeverity, setWarnSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [warnIssuer, setWarnIssuer] = useState(currentUser?.name || 'Mohamed Kamara');
  const [warnDate, setWarnDate] = useState(new Date().toISOString().split('T')[0]);

  // Handle auto-triggering modal or tab
  useEffect(() => {
    if (showRegisterModalOnLoad) {
      setShowRegisterModal(true);
    }
  }, [showRegisterModalOnLoad]);

  useEffect(() => {
    if (initialOpenPasswordsTab) {
      setSubTab('passwords');
    }
  }, [initialOpenPasswordsTab]);

  const getEffectivePassword = (emp: Employee) => {
    if (emp.password && emp.password.trim() !== '') {
      return emp.password;
    }
    if (emp.role === 'Admin') return 'admin';
    if (emp.role === 'Manager') return 'manager';
    if (emp.role === 'Auditor') return 'audit';
    return '1234';
  };

  const getDefaultRolePassword = (r: EmployeeRole) => {
    if (r === 'Admin') return 'admin';
    if (r === 'Manager') return 'manager';
    if (r === 'Auditor') return 'audit';
    return '1234';
  };

  const handleOpenResetModal = (emp: Employee) => {
    setResetEmployee(emp);
    setResetMethod('numeric');
    setCustomPassword('');
    setGeneratedPin(Math.floor(100000 + Math.random() * 900000).toString());
    setGeneratedAlpha('Swed#' + Math.floor(100 + Math.random() * 900));
    setResetSuccessData(null);
    setShowResetModal(true);
  };

  const handleConfirmPasswordReset = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!resetEmployee) return;

    let targetPassword = '';
    if (resetMethod === 'default') {
      targetPassword = getDefaultRolePassword(resetEmployee.role);
    } else if (resetMethod === 'numeric') {
      targetPassword = generatedPin;
    } else if (resetMethod === 'alphanumeric') {
      targetPassword = generatedAlpha;
    } else {
      targetPassword = customPassword.trim();
      if (!targetPassword) {
        alert('Please enter a custom password or PIN.');
        return;
      }
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (onResetPassword) {
      onResetPassword(resetEmployee.id, targetPassword);
    } else if (onUpdateEmployee) {
      onUpdateEmployee({
        ...resetEmployee,
        password: targetPassword,
        lastPasswordReset: nowStr
      });
    }

    if (selectedEmployee?.id === resetEmployee.id) {
      setSelectedEmployee(prev => prev ? {
        ...prev,
        password: targetPassword,
        lastPasswordReset: nowStr
      } : null);
    }

    setResetSuccessData({
      name: resetEmployee.name,
      email: resetEmployee.email,
      role: resetEmployee.role,
      password: targetPassword
    });
  };

  const handleCopyCredentials = (emp: Employee) => {
    const pass = getEffectivePassword(emp);
    const msg = `Swedsfree Workshop Portal Access:\nArtisan: ${emp.name} (${emp.role})\nUsername / Email: ${emp.email}\nSecurity Password / PIN: ${pass}\nStatus: ${emp.status}\nWorkshop Hub: Freetown, Sierra Leone`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg).catch(() => {});
    }
    setCopyToast(`Credentials for ${emp.name} copied to clipboard!`);
    setTimeout(() => setCopyToast(null), 3000);
  };

  const handleTogglePasswordVisibility = (empId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [empId]: !prev[empId]
    }));
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditName(emp.name);
    setEditRole(emp.role);
    setEditPhone(emp.phone);
    setEditEmail(emp.email);
    setEditPassword(getEffectivePassword(emp));
    setShowEditPassword(false);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !editName.trim()) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const isPasswordChanged = editPassword.trim() !== '' && editPassword.trim() !== getEffectivePassword(selectedEmployee);

    const updated: Employee = {
      ...selectedEmployee,
      name: editName,
      role: editRole,
      phone: editPhone,
      email: editEmail,
      password: editPassword.trim() ? editPassword.trim() : selectedEmployee.password,
      lastPasswordReset: isPasswordChanged ? nowStr : selectedEmployee.lastPasswordReset
    };

    if (onUpdateEmployee) {
      onUpdateEmployee(updated);
    }
    setSelectedEmployee(updated);
    setShowEditModal(false);
  };

  const handleWarningSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !warnReason.trim()) return;

    if (onAddWarningLetter) {
      onAddWarningLetter({
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        date: warnDate,
        type: warnType,
        reason: warnReason,
        severity: warnSeverity,
        issuedBy: warnIssuer
      });
    }

    setWarnReason('');
    setWarnType('First Written Warning');
    setWarnSeverity('Medium');
    setShowWarningModal(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) return;

    const finalPass = password.trim() ? password.trim() : getDefaultRolePassword(role);

    onAddEmployee({
      name,
      role,
      phone,
      email,
      status: 'Active',
      password: finalPass
    });

    // Reset Form
    setName('');
    setRole('Carpenter');
    setPhone('');
    setEmail('');
    setPassword('1234');
    setShowRegPassword(false);

    setShowRegisterModal(false);
    if (onCloseRegisterModal) onCloseRegisterModal();
  };

  const handleCloseModal = () => {
    setShowRegisterModal(false);
    if (onCloseRegisterModal) onCloseRegisterModal();
  };

  // Sorting states for Staff Directory
  const [empSortField, setEmpSortField] = useState<'name' | 'role' | 'status' | 'date'>('name');
  const [empSortDirection, setEmpSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleEmpSort = (field: 'name' | 'role' | 'status' | 'date') => {
    if (empSortField === field) {
      setEmpSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setEmpSortField(field);
      setEmpSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(e => {
    const searchString = `${e.name} ${e.role} ${e.email}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let valA: any = a.name;
    let valB: any = b.name;

    if (empSortField === 'role') {
      valA = a.role;
      valB = b.role;
    } else if (empSortField === 'status') {
      valA = a.status;
      valB = b.status;
    } else if (empSortField === 'date') {
      valA = a.hireDate || '';
      valB = b.hireDate || '';
    }

    if (typeof valA === 'string') {
      const comp = (valA || '').localeCompare(valB || '');
      return empSortDirection === 'asc' ? comp : -comp;
    }

    if (valA < valB) return empSortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return empSortDirection === 'asc' ? 1 : -1;
    return 0;
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
            Employees Registry
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Register and manage Swedsfree craftsmen, designers, and polishing specialists.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setSubTab('passwords')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                subTab === 'passwords'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/10'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
              title="Admin Password Management Console"
            >
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Manage All Passwords</span>
              <span className="ml-1 px-1.5 py-0.5 bg-amber-200/80 text-amber-950 rounded text-[10px] font-mono font-black">
                {employees.length}
              </span>
            </button>
          )}

          {!isAuditor ? (
            <button 
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer"
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
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => {
            setSubTab('employees');
            if (employees.length > 0 && !selectedEmployee) {
              setSelectedEmployee(employees[0]);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            subTab === 'employees'
              ? 'bg-wood-900 text-white shadow-xs'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Staff Directory ({employees.length})</span>
        </button>

        <button
          onClick={() => {
            setSubTab('requests');
            setSelectedEmployee(null);
            if (registrationRequests.length > 0 && !selectedRequestId) {
              setSelectedRequestId(registrationRequests[0].id);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer relative ${
            subTab === 'requests'
              ? 'bg-wood-900 text-white shadow-xs'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Pending Access Requests</span>
          {registrationRequests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-black text-white">
              {registrationRequests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>

        {isAdmin && (
          <button
            onClick={() => setSubTab('passwords')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'passwords'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-900/10'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Admin Passwords Console</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-950 text-[10px] font-mono font-black">
              {employees.length}
            </span>
          </button>
        )}
      </div>

      {subTab === 'passwords' ? (
        <div className="bg-white rounded-2xl border border-wood-100 shadow-xs p-6 space-y-6">
          {/* Header & KPI Summary */}
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 p-6 rounded-2xl text-white border border-amber-500/20 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Administrator Security Hub</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Credentials
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight uppercase">
                  Staff Passwords &amp; Access Control Console
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl mt-1">
                  Manage security access codes, inspect active PINs, generate cryptographically secure codes, and instantly reset passwords for all registered workshop personnel.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-xs">
                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-center">
                  <p className="text-lg font-black text-white">{employees.length}</p>
                  <p className="text-[10px] font-semibold text-slate-300 uppercase">Total Accounts</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-center">
                  <p className="text-lg font-black text-emerald-400">{employees.filter(e => e.status === 'Active').length}</p>
                  <p className="text-[10px] font-semibold text-slate-300 uppercase">Active</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-center">
                  <p className="text-lg font-black text-amber-400">{employees.filter(e => !!e.password).length}</p>
                  <p className="text-[10px] font-semibold text-slate-300 uppercase">Custom PINs</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-center">
                  <p className="text-lg font-black text-sky-400">{employees.filter(e => !e.password).length}</p>
                  <p className="text-[10px] font-semibold text-slate-300 uppercase">Default PINs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, role, phone..."
                  value={passwordSearchTerm}
                  onChange={(e) => setPasswordSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 focus:border-amber-400 focus:bg-white rounded-xl outline-hidden font-medium text-gray-800 placeholder-gray-400"
                />
              </div>

              {/* Role filter */}
              <select
                value={passwordRoleFilter}
                onChange={(e) => setPasswordRoleFilter(e.target.value)}
                className="py-2 px-3 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 outline-hidden text-gray-700 cursor-pointer"
              >
                <option value="ALL">All Roles ({employees.length})</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Auditor">Auditor</option>
                <option value="Carpenter">Carpenter</option>
                <option value="Carver">Carver</option>
                <option value="Designer">Designer</option>
                <option value="Sander">Sander</option>
                <option value="Polisher">Polisher</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Welder">Welder</option>
                <option value="Driver">Driver</option>
                <option value="Security">Security</option>
                <option value="Marketer">Marketer</option>
                <option value="Contractor">Contractor</option>
                <option value="Apprentice">Apprentice</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAllPasswords(!showAllPasswords)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title={showAllPasswords ? "Mask all passwords" : "Reveal all passwords"}
              >
                {showAllPasswords ? <EyeOff className="w-3.5 h-3.5 text-slate-600" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
                <span>{showAllPasswords ? "Mask Passwords" : "Show All Passwords"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Artisan with PIN</span>
              </button>
            </div>
          </div>

          {/* Master Table of Credentials */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Access Password / PIN</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Last Reset</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {employees
                  .filter(e => {
                    const matchesSearch = `${e.name} ${e.role} ${e.email} ${e.phone}`.toLowerCase().includes(passwordSearchTerm.toLowerCase());
                    const matchesRole = passwordRoleFilter === 'ALL' || e.role === passwordRoleFilter;
                    return matchesSearch && matchesRole;
                  })
                  .map(emp => {
                    const isVisible = showAllPasswords || visiblePasswords[emp.id];
                    const effectivePass = getEffectivePassword(emp);
                    const isCustom = !!emp.password;

                    return (
                      <tr key={emp.id} className="hover:bg-amber-50/20 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-wood-900 text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{emp.name}</p>
                              <p className="text-[11px] text-gray-400 font-mono">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            emp.role === 'Admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            emp.role === 'Manager' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            emp.role === 'Auditor' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                            'bg-wood-100 text-wood-800 border border-wood-200'
                          }`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.status === 'Active' ? 'bg-emerald-50 text-emerald-800' :
                            emp.status === 'On Leave' ? 'bg-amber-50 text-amber-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : emp.status === 'On Leave' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                            <span>{emp.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 tracking-wider text-sm bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              {isVisible ? effectivePass : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTogglePasswordVisibility(emp.id)}
                              className="p-1 text-gray-400 hover:text-gray-700 rounded transition cursor-pointer"
                              title={isVisible ? "Hide Password" : "Show Password"}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                            isCustom ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isCustom ? 'Custom PIN' : 'Role Default'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-[10px] text-gray-500 font-mono">
                          {emp.lastPasswordReset || 'Initial Setup'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenResetModal(emp)}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title="Reset Password for this user"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Reset Password</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(emp)}
                              className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition border border-gray-200 cursor-pointer"
                              title="Copy Credentials"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(emp)}
                              className="p-1.5 text-gray-500 hover:text-wood-700 hover:bg-wood-50 rounded-lg transition border border-gray-200 cursor-pointer"
                              title="Edit User Details"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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

              {/* Staff Directory Column Header Sorting Bar */}
              <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase select-none">
                <button 
                  onClick={() => handleEmpSort('name')} 
                  className="flex items-center gap-1 hover:text-wood-800 transition cursor-pointer"
                  title="Click to sort by Employee Name"
                >
                  <span>Name</span>
                  {empSortField === 'name' ? (
                    empSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                  ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                </button>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleEmpSort('role')} 
                    className="flex items-center gap-1 hover:text-wood-800 transition cursor-pointer"
                    title="Click to sort by Role"
                  >
                    <span>Role</span>
                    {empSortField === 'role' ? (
                      empSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                    ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                  </button>
                  <button 
                    onClick={() => handleEmpSort('status')} 
                    className="flex items-center gap-1 hover:text-wood-800 transition cursor-pointer"
                    title="Click to sort by Status"
                  >
                    <span>Status</span>
                    {empSortField === 'status' ? (
                      empSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                    ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {sortedEmployees.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No employees found.
                  </div>
                ) : (
                  sortedEmployees.map(e => {
                    const isActive = selectedEmployee?.id === e.id;
                    const activeJobsCount = jobs.filter(j => j.assignedEmployees.includes(e.id) && j.status !== 'Completed' && j.status !== 'Delivered').length;
                    
                    return (
                      <div
                        key={e.id}
                        onClick={() => {
                          setSelectedEmployee(e);
                          setSelectedRequestId('');
                        }}
                        className={`w-full text-left p-4 hover:bg-wood-50/20 transition flex items-start justify-between gap-3 cursor-pointer ${isActive ? 'bg-wood-50/50 border-r-4 border-wood-600' : ''}`}
                      >
                        <div className="flex gap-3 min-w-0 flex-1">
                          <div className="p-2.5 bg-wood-100 text-wood-700 rounded-xl font-display font-bold text-xs whitespace-nowrap shrink-0">
                            {e.role.substring(0, 4).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-gray-800 truncate">{e.name}</h4>
                            <p className="text-[11px] text-gray-400 font-bold">{e.role}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right whitespace-nowrap">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${e.status === 'Active' ? 'bg-emerald-500' : e.status === 'On Leave' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                            <p className="text-[10px] text-gray-400 mt-1 font-semibold">{activeJobsCount} active jobs</p>
                          </div>
                          {!isAuditor && onDeleteEmployee && (
                            <button
                              onClick={(evt) => {
                                evt.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete worker "${e.name}"?`)) {
                                  onDeleteEmployee(e.id);
                                  if (selectedEmployee?.id === e.id) {
                                    setSelectedEmployee(employees.find(item => item.id !== e.id) || null);
                                  }
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Worker"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
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
                    <div
                      key={req.id}
                      onClick={() => {
                        setSelectedRequestId(req.id);
                        setSelectedEmployee(null);
                      }}
                      className={`w-full text-left p-4 hover:bg-wood-50/20 transition flex items-start justify-between gap-3 cursor-pointer ${isActive ? 'bg-wood-50/50 border-r-4 border-wood-600' : ''}`}
                    >
                      <div className="flex gap-3 min-w-0 flex-1">
                        <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl font-display font-bold text-xs whitespace-nowrap shrink-0">
                          REQ
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-gray-800 truncate">{req.name}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{req.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                            req.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-red-100 text-red-800'
                          }`} />
                          <p className="text-[10px] text-gray-400 mt-1 font-semibold">{req.status}</p>
                        </div>
                        {!isAuditor && onDeleteRegistrationRequest && (
                          <button
                            onClick={(evt) => {
                              evt.stopPropagation();
                              if (window.confirm(`Delete registration request for "${req.name}"?`)) {
                                onDeleteRegistrationRequest(req.id);
                                if (selectedRequestId === req.id) {
                                  setSelectedRequestId('');
                                }
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
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
                        SWED {selectedEmployee.role} specialist
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isAuditor && (
                      <button
                        onClick={() => handleOpenEditModal(selectedEmployee)}
                        className="px-2.5 py-1.5 text-xs font-black uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-xl transition cursor-pointer"
                      >
                        Edit Details
                      </button>
                    )}
                    {!isAuditor && onDeleteEmployee && (
                      confirmDeleteId === selectedEmployee.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-xl">
                          <span className="text-[10px] font-bold text-red-700 uppercase px-1">Confirm?</span>
                          <button
                            onClick={() => {
                              onDeleteEmployee(selectedEmployee.id);
                              setConfirmDeleteId(null);
                              setSelectedEmployee(employees.find(emp => emp.id !== selectedEmployee.id) || null);
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
                          onClick={() => setConfirmDeleteId(selectedEmployee.id)}
                          className="px-2.5 py-1.5 text-xs font-black uppercase text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition flex items-center gap-1 cursor-pointer"
                          title="Delete this worker permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Worker</span>
                        </button>
                      )
                    )}
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

                {/* Account Security & Password Credentials Card (Admin Feature) */}
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-900 font-black uppercase tracking-wider flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                        <span>Security Password / Access PIN</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        selectedEmployee.password ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {selectedEmployee.password ? 'Custom Security PIN' : 'Default Role PIN'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-sm font-black text-gray-800 tracking-wider">
                        {isAdmin
                          ? (visiblePasswords[selectedEmployee.id] ? getEffectivePassword(selectedEmployee) : '••••••••')
                          : '••••••••'}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleTogglePasswordVisibility(selectedEmployee.id)}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded transition cursor-pointer"
                          title={visiblePasswords[selectedEmployee.id] ? "Hide Password" : "Show Password"}
                        >
                          {visiblePasswords[selectedEmployee.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {selectedEmployee.lastPasswordReset && (
                        <span className="text-[10px] text-gray-500 font-sans ml-2">
                          (Reset: {selectedEmployee.lastPasswordReset})
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenResetModal(selectedEmployee)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        title="Reset this worker's password"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset Password</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(selectedEmployee)}
                        className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-amber-200 text-amber-900 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                        title="Copy credentials to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5 text-amber-600" />
                        <span>Copy</span>
                      </button>
                    </div>
                  )}
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

              {/* Warning Letters Log section */}
              <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Warning Letters & Compliance Log
                  </h3>
                  {!isAuditor && (
                    <button
                      onClick={() => setShowWarningModal(true)}
                      className="px-2.5 py-1 text-[10px] font-black uppercase text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition"
                    >
                      Record Warning Letter
                    </button>
                  )}
                </div>

                {warningLetters.filter(w => w.employeeId === selectedEmployee.id).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    This employee has a clean compliance record. No warning letters logged.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {warningLetters.filter(w => w.employeeId === selectedEmployee.id).map(warn => (
                      <div key={warn.id} className="p-4 rounded-xl border border-red-100/50 bg-red-50/20 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-red-900">{warn.type}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            warn.severity === 'High' ? 'bg-red-200 text-red-800' :
                            warn.severity === 'Medium' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {warn.severity} Severity
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed font-medium mb-2">{warn.reason}</p>
                        <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-400 font-semibold border-t border-red-100/30 pt-1.5 mt-1.5 font-mono">
                          <span>Issued by: <strong className="text-gray-600">{warn.issuedBy}</strong></span>
                          <div className="flex items-center gap-2">
                            <span>{warn.date}</span>
                            {!isAuditor && onDeleteWarningLetter && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete this warning letter issued on ${warn.date}?`)) {
                                    onDeleteWarningLetter(warn.id);
                                  }
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                                title="Delete Warning Letter"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
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
      )}

      {/* MODAL: Edit Employee Details */}
      <AnimatePresence>
        {showEditModal && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Edit Artisan Details</h3>
                  <p className="text-xs text-wood-200">Modify artisan details, role, and contact information.</p>
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
                    <label className="text-xs font-bold text-gray-500 uppercase">Artisan Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Specialist Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as EmployeeRole)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      <option value="Carpenter">Carpenter (Joints & Framing)</option>
                      <option value="Carver">Carver (Ornamental Reliefs)</option>
                      <option value="Designer">Designer (Blueprints & CAD)</option>
                      <option value="Sander">Sander (Sanding & Softness)</option>
                      <option value="Polisher">Polisher (Lacquers & French Polish)</option>
                      <option value="Supervisor">Supervisor (Workshop & Production)</option>
                      <option value="Welder">Welder (Metalwork & Framing)</option>
                      <option value="Driver">Driver (Logistics & Deliveries)</option>
                      <option value="Security">Security (Facility & Assets)</option>
                      <option value="Marketer">Marketer (Sales & Marketing)</option>
                      <option value="Contractor">Contractor (Subcontractor & Specialist)</option>
                      <option value="Manager">Manager (Operations & Estimates)</option>
                      <option value="Apprentice">Apprentice (General Assistant)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold font-mono text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="space-y-1 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>Security Password / Access PIN</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const pin = Math.floor(100000 + Math.random() * 900000).toString();
                          setEditPassword(pin);
                          setShowEditPassword(true);
                        }}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-amber-200"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Generate Random PIN</span>
                      </button>
                    </div>
                    <div className="relative mt-1">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Enter access code or PIN..."
                        className="w-full pl-3 pr-10 py-2 border border-amber-200 rounded-xl focus:border-amber-400 outline-hidden text-sm font-mono font-bold text-gray-800 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        title={showEditPassword ? "Hide password" : "Show password"}
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-700/80 mt-1">
                      Changing this updates the artisan's login credentials immediately across all devices.
                    </p>
                  </div>
                )}

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
                    Save Details
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Record warning letter */}
      <AnimatePresence>
        {showWarningModal && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-red-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-red-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Record Warning Letter</h3>
                  <p className="text-xs text-red-200">Record a formal warning for {selectedEmployee.name}.</p>
                </div>
                <button 
                  onClick={() => setShowWarningModal(false)}
                  className="text-red-200 hover:text-white font-bold text-xl"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleWarningSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Warning Type</label>
                  <select
                    value={warnType}
                    onChange={(e) => setWarnType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-red-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                  >
                    <option value="First Written Warning">First Written Warning</option>
                    <option value="Second Written Warning">Second Written Warning</option>
                    <option value="Final Written Warning">Final Written Warning</option>
                    <option value="Suspension Notice">Suspension Notice</option>
                    <option value="Verbal warning logged">Verbal Warning Logged</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Date of Issue</label>
                    <input
                      type="date"
                      required
                      value={warnDate}
                      onChange={(e) => setWarnDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-red-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Severity Level</label>
                    <select
                      value={warnSeverity}
                      onChange={(e) => setWarnSeverity(e.target.value as 'Low' | 'Medium' | 'High')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-red-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High (Immediate Action)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Issuer Name</label>
                  <input
                    type="text"
                    required
                    value={warnIssuer}
                    onChange={(e) => setWarnIssuer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-red-300 outline-hidden text-sm font-semibold text-gray-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Reason & Details</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide specific details of the warning letter reason, e.g. unexcused absence, damage to materials, safety violation..."
                    value={warnReason}
                    onChange={(e) => setWarnReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-red-300 outline-hidden text-sm font-medium resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowWarningModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-red-800 hover:bg-red-900 text-white text-sm font-bold transition shadow-xs"
                  >
                    Record Warning Letter
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <p className="text-xs text-wood-200">Submit employee specifications, roles, and workshop details.</p>
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
                      <option value="Supervisor">Supervisor (Workshop & Production)</option>
                      <option value="Welder">Welder (Metalwork & Framing)</option>
                      <option value="Driver">Driver (Logistics & Deliveries)</option>
                      <option value="Security">Security (Facility & Assets)</option>
                      <option value="Marketer">Marketer (Sales & Marketing)</option>
                      <option value="Contractor">Contractor (Subcontractor & Specialist)</option>
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
                      placeholder="+232 76 333 444"
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

                <div className="space-y-1 bg-wood-50/60 p-3.5 rounded-xl border border-wood-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-wood-900 uppercase flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-wood-600" />
                      <span>Initial Access Password / PIN *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pin = Math.floor(100000 + Math.random() * 900000).toString();
                        setPassword(pin);
                        setShowRegPassword(true);
                      }}
                      className="text-[10px] font-bold text-wood-700 hover:text-wood-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-wood-200"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate PIN</span>
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. 1234 or custom PIN..."
                      className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-mono font-bold text-gray-800 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      title={showRegPassword ? "Hide password" : "Show password"}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Standard default is 1234. Admin can reset this anytime after registration.
                  </p>
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

      {/* MODAL: Admin Password Reset */}
      <AnimatePresence>
        {showResetModal && resetEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-amber-200 shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30 text-amber-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg">Reset Password / Access PIN</h3>
                    <p className="text-xs text-amber-200/80">Admin credential override &amp; PIN re-issuance</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="text-amber-300 hover:text-white font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {resetSuccessData ? (
                /* Success View */
                <div className="p-6 space-y-5">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-emerald-900 text-sm">Password Successfully Reset!</h4>
                      <p className="text-xs text-emerald-800">
                        The new access code is active immediately in Firestore and local storage.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Artisan Name:</span>
                      <span className="font-bold text-slate-800">{resetSuccessData.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Username / Email:</span>
                      <span className="font-bold text-slate-800">{resetSuccessData.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Specialist Role:</span>
                      <span className="font-bold text-amber-800">{resetSuccessData.role}</span>
                    </div>
                    <div className="flex justify-between py-1.5 items-center">
                      <span className="text-slate-500">New Password / PIN:</span>
                      <span className="text-base font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-md tracking-wider">
                        {resetSuccessData.password}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `Swedsfree Workshop Portal Access:\nArtisan: ${resetSuccessData.name} (${resetSuccessData.role})\nUsername / Email: ${resetSuccessData.email}\nNew Security Password / PIN: ${resetSuccessData.password}\nPortal Link: https://swedsfree.com`;
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(msg).catch(() => {});
                        }
                        setCopyToast(`Credentials for ${resetSuccessData.name} copied to clipboard!`);
                        setTimeout(() => setCopyToast(null), 3000);
                      }}
                      className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Handover Message</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="px-5 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Done &amp; Close
                    </button>
                  </div>
                </div>
              ) : (
                /* Form View */
                <form onSubmit={handleConfirmPasswordReset} className="p-6 space-y-5">
                  {/* Target Employee Info */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-wood-900 text-white font-bold flex items-center justify-center text-sm">
                        {resetEmployee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{resetEmployee.name}</p>
                        <p className="text-[11px] text-gray-500 font-mono">{resetEmployee.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-wood-100 text-wood-800">
                        {resetEmployee.role}
                      </span>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Current: {getEffectivePassword(resetEmployee)}
                      </p>
                    </div>
                  </div>

                  {/* Reset Options */}
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">
                      Choose Reset Strategy *
                    </label>

                    {/* Option 1: Numeric PIN */}
                    <label className={`block p-3.5 rounded-xl border transition cursor-pointer ${
                      resetMethod === 'numeric'
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="resetMethod"
                            checked={resetMethod === 'numeric'}
                            onChange={() => setResetMethod('numeric')}
                            className="text-amber-600 focus:ring-amber-500 mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-gray-900 block">Generate 6-Digit Numeric PIN</span>
                            <span className="text-[11px] text-gray-500">Quick, easy to enter on mobile workshop phones</span>
                          </div>
                        </div>
                        {resetMethod === 'numeric' && (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="px-2.5 py-1 bg-white border border-amber-300 rounded font-black text-amber-900 text-sm tracking-widest">
                              {generatedPin}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setGeneratedPin(Math.floor(100000 + Math.random() * 900000).toString());
                              }}
                              className="p-1 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
                              title="Re-generate PIN"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Option 2: Strong Alphanumeric Password */}
                    <label className={`block p-3.5 rounded-xl border transition cursor-pointer ${
                      resetMethod === 'alphanumeric'
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="resetMethod"
                            checked={resetMethod === 'alphanumeric'}
                            onChange={() => setResetMethod('alphanumeric')}
                            className="text-amber-600 focus:ring-amber-500 mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-gray-900 block">Generate Strong Password</span>
                            <span className="text-[11px] text-gray-500">High security with letters, digits, and symbols</span>
                          </div>
                        </div>
                        {resetMethod === 'alphanumeric' && (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="px-2.5 py-1 bg-white border border-amber-300 rounded font-black text-amber-900 text-sm tracking-wider">
                              {generatedAlpha}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setGeneratedAlpha('Swed#' + Math.floor(100 + Math.random() * 900));
                              }}
                              className="p-1 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
                              title="Re-generate Password"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Option 3: Role Default Password */}
                    <label className={`block p-3.5 rounded-xl border transition cursor-pointer ${
                      resetMethod === 'default'
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="resetMethod"
                            checked={resetMethod === 'default'}
                            onChange={() => setResetMethod('default')}
                            className="text-amber-600 focus:ring-amber-500 mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-gray-900 block">Standard Role Default Password</span>
                            <span className="text-[11px] text-gray-500">
                              Reset to factory default code: <code className="font-bold text-amber-800">{getDefaultRolePassword(resetEmployee.role)}</code>
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* Option 4: Custom Password */}
                    <label className={`block p-3.5 rounded-xl border transition cursor-pointer ${
                      resetMethod === 'custom'
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="resetMethod"
                            checked={resetMethod === 'custom'}
                            onChange={() => setResetMethod('custom')}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-gray-900 block">Enter Custom Password / PIN</span>
                            <span className="text-[11px] text-gray-500">Type any specific password chosen by user or admin</span>
                          </div>
                        </div>

                        {resetMethod === 'custom' && (
                          <div className="pt-2 relative">
                            <input
                              type={showCustomPassword ? "text" : "password"}
                              required
                              placeholder="Type new password or PIN..."
                              value={customPassword}
                              onChange={(e) => setCustomPassword(e.target.value)}
                              className="w-full pl-3 pr-10 py-2 border border-amber-300 rounded-xl focus:border-amber-500 outline-hidden font-mono text-sm text-gray-900 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCustomPassword(!showCustomPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer pt-2"
                              title={showCustomPassword ? "Hide password" : "Show password"}
                            >
                              {showCustomPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="flex-1 py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Confirm &amp; Reset Password</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Copy Toast Notification */}
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{copyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
