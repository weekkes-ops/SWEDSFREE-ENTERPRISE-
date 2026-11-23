import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Copy,
  Check,
  Printer,
  Wand2,
  Users,
  UserCheck,
  X
} from 'lucide-react';
import { Employee, EmployeeRole } from '../types';
import { printDocument } from '../utils/printHelper';

export function getRoleDefaultPassword(role: EmployeeRole): string {
  switch (role) {
    case 'Admin':
      return 'admin';
    case 'Manager':
      return 'manager';
    case 'Auditor':
      return 'audit';
    default:
      return '1234';
  }
}

export function getEffectivePassword(emp: Employee): string {
  return emp.password && emp.password.length > 0 ? emp.password : getRoleDefaultPassword(emp.role);
}

export function isUsingDefaultPassword(emp: Employee): boolean {
  const effective = getEffectivePassword(emp);
  const roleDefault = getRoleDefaultPassword(emp.role);
  return !emp.password || effective === roleDefault;
}

function getStrengthInfo(pw: string): { label: string; score: number; barColor: string; textColor: string } {
  if (!pw) return { label: 'Empty', score: 0, barColor: 'bg-slate-200', textColor: 'text-slate-400' };
  let score = 0;
  if (pw.length >= 4) score += 1;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (pw.length < 4) return { label: 'Too Short (Min 4)', score: 1, barColor: 'bg-red-500', textColor: 'text-red-600' };
  if (score <= 1) return { label: 'Basic PIN', score: 2, barColor: 'bg-amber-500', textColor: 'text-amber-700' };
  if (score === 2 || score === 3) return { label: 'Good Password', score: 3, barColor: 'bg-sky-500', textColor: 'text-sky-700' };
  return { label: 'Strong Password', score: 4, barColor: 'bg-emerald-500', textColor: 'text-emerald-700' };
}

function generateSecurePin(length: number = 6): string {
  const digits = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return result;
}

function generateStrongPassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface PasswordManagerProps {
  employees: Employee[];
  currentUser: Employee | null;
  onUpdateEmployee: (updatedEmployee: Employee) => void;
  embedded?: boolean;
  onOpenFullView?: () => void;
}

export default function PasswordManager({
  employees,
  currentUser,
  onUpdateEmployee,
  embedded = false,
  onOpenFullView
}: PasswordManagerProps) {
  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';
  const isAuditor = currentUser?.role === 'Auditor';
  const canManageStaffPasswords = isAdmin || isManager;

  // Self-service password change state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [selfError, setSelfError] = useState<string | null>(null);
  const [selfSuccess, setSelfSuccess] = useState<string | null>(null);

  // Staff vault filter & UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [policyFilter, setPolicyFilter] = useState<'ALL' | 'DEFAULT' | 'CUSTOM' | 'ACTIVE'>('ALL');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);
  const [staffBannerMsg, setStaffBannerMsg] = useState<string | null>(null);

  // Modal for updating an employee's password
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [modalConfirmPassword, setModalConfirmPassword] = useState('');
  const [showModalPw, setShowModalPw] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);

  const activeUserRecord =
    (currentUser && employees.find((e) => e.id === currentUser.id)) || currentUser;

  const canManageTarget = (target: Employee): boolean => {
    if (isAdmin) return true;
    if (isManager) return target.role !== 'Admin';
    return false;
  };

  const handleSelfPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError(null);
    setSelfSuccess(null);

    if (!activeUserRecord) {
      setSelfError('No signed-in user session detected.');
      return;
    }

    const expectedCurrent = getEffectivePassword(activeUserRecord);
    if (currentPasswordInput !== expectedCurrent) {
      setSelfError('Your current password or PIN is incorrect.');
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      setSelfError('New password or PIN must be at least 4 characters long.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setSelfError('New password and confirmation do not match.');
      return;
    }

    if (newPasswordInput === expectedCurrent) {
      setSelfError('Please choose a new password different from your current password.');
      return;
    }

    const updated: Employee = {
      ...activeUserRecord,
      password: newPasswordInput,
      passwordUpdatedAt: new Date().toISOString(),
      passwordUpdatedBy: `${activeUserRecord.name} (Self-Service)`
    };

    onUpdateEmployee(updated);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setSelfSuccess('Your password has been updated and synced to Cloud Firestore.');
    setTimeout(() => setSelfSuccess(null), 6000);
  };

  const handleOpenStaffPasswordModal = (emp: Employee) => {
    if (!canManageTarget(emp)) return;
    setEditingEmployee(emp);
    setModalPassword('');
    setModalConfirmPassword('');
    setShowModalPw(true);
    setModalError(null);
  };

  const handleSaveStaffPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !currentUser) return;
    setModalError(null);

    if (modalPassword.trim().length < 4) {
      setModalError('Password or PIN must be at least 4 characters.');
      return;
    }

    if (modalPassword !== modalConfirmPassword) {
      setModalError('Passwords do not match.');
      return;
    }

    const updated: Employee = {
      ...editingEmployee,
      password: modalPassword,
      passwordUpdatedAt: new Date().toISOString(),
      passwordUpdatedBy: `${currentUser.name} (${currentUser.role})`
    };

    onUpdateEmployee(updated);
    setStaffBannerMsg(`Updated login password for ${editingEmployee.name} (${editingEmployee.role}).`);
    setEditingEmployee(null);
    setTimeout(() => setStaffBannerMsg(null), 5000);
  };

  const handleResetToDefault = (emp: Employee) => {
    if (!currentUser || !canManageTarget(emp)) return;
    const defaultPin = getRoleDefaultPassword(emp.role);
    const updated: Employee = {
      ...emp,
      password: defaultPin,
      passwordUpdatedAt: new Date().toISOString(),
      passwordUpdatedBy: `${currentUser.name} (Reset to Role Default)`
    };
    onUpdateEmployee(updated);
    setConfirmResetId(null);
    setStaffBannerMsg(`Reset ${emp.name}'s password to role default PIN.`);
    setTimeout(() => setStaffBannerMsg(null), 5000);
  };

  const handleCopyCredential = (emp: Employee) => {
    if (!canManageTarget(emp)) return;
    const pw = getEffectivePassword(emp);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pw).then(() => {
        setCopiedId(emp.id);
        setTimeout(() => setCopiedId((prev) => (prev === emp.id ? null : prev)), 2000);
      }).catch(() => {});
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = `${emp.name} ${emp.role} ${emp.email} ${emp.phone}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (policyFilter === 'DEFAULT') return isUsingDefaultPassword(emp);
    if (policyFilter === 'CUSTOM') return !isUsingDefaultPassword(emp);
    if (policyFilter === 'ACTIVE') return emp.status === 'Active';
    return true;
  });

  const totalAccounts = employees.length;
  const customPasswordCount = employees.filter((e) => !isUsingDefaultPassword(e)).length;
  const defaultPinCount = employees.filter((e) => isUsingDefaultPassword(e)).length;
  const activeAccountCount = employees.filter((e) => e.status === 'Active').length;
  const selfStrength = getStrengthInfo(newPasswordInput);
  const modalStrength = getStrengthInfo(modalPassword);

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 max-w-6xl mx-auto pb-12'}>
      {/* Standalone Page Header */}
      {!embedded && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                Access &amp; Credential Security
              </span>
              {isAuditor && (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                  Auditor Read-Only Mode
                </span>
              )}
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight uppercase">
              Password Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Manage your workshop account password and, for authorized administrators and managers, oversee staff login PINs with real-time Cloud Firestore synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => printDocument('passwords')}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Credential Audit</span>
            </button>
          </div>
        </div>
      )}

      {/* MY ACCOUNT PASSWORD SECTION (All Signed-In Users) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200">
              <KeyRound className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-lg text-slate-900 uppercase tracking-tight">
                  {embedded ? 'Password Manager — My Account Security' : 'My Account Password'}
                </h2>
                {activeUserRecord && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      isUsingDefaultPassword(activeUserRecord)
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isUsingDefaultPassword(activeUserRecord) ? 'Using Default PIN' : 'Custom Password Active'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your personal login password or PIN for <strong className="text-slate-700">{activeUserRecord?.name || 'Active User'}</strong> ({activeUserRecord?.role || 'Staff'}).
              </p>
            </div>
          </div>

          {embedded && onOpenFullView && (
            <button
              type="button"
              onClick={onOpenFullView}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Open Full Password Vault</span>
            </button>
          )}
        </div>

        {activeUserRecord && isUsingDefaultPassword(activeUserRecord) && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Security Recommendation: Default Role PIN Detected</p>
              <p className="text-amber-800 mt-0.5">
                Your account currently uses the initial default role password. Set a personal PIN or password below to secure workshop access.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSelfPasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Current Password / PIN *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  required
                  value={currentPasswordInput}
                  onChange={(e) => {
                    setCurrentPasswordInput(e.target.value);
                    setSelfError(null);
                  }}
                  placeholder="Enter current PIN..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showCurrentPw ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  New Password / PIN *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const pin = generateSecurePin(6);
                    setNewPasswordInput(pin);
                    setConfirmPasswordInput(pin);
                    setShowNewPw(true);
                    setShowConfirmPw(true);
                    setSelfError(null);
                  }}
                  className="text-[10px] font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Generate 6-Digit PIN</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  value={newPasswordInput}
                  onChange={(e) => {
                    setNewPasswordInput(e.target.value);
                    setSelfError(null);
                  }}
                  placeholder="Min 4 characters..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showNewPw ? 'Hide password' : 'Show password'}
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPasswordInput && (
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 rounded-full ${
                          selfStrength.score >= step ? selfStrength.barColor : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold ${selfStrength.textColor}`}>{selfStrength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => {
                    setConfirmPasswordInput(e.target.value);
                    setSelfError(null);
                  }}
                  placeholder="Re-enter new PIN..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showConfirmPw ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPasswordInput && (
                <p
                  className={`text-[10px] font-bold ${
                    confirmPasswordInput === newPasswordInput ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {confirmPasswordInput === newPasswordInput ? '✓ Passwords match' : '✕ Passwords do not match'}
                </p>
              )}
            </div>
          </div>

          {selfError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{selfError}</span>
            </div>
          )}

          {selfSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{selfSuccess}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-slate-500">
              {activeUserRecord?.passwordUpdatedAt
                ? `Last updated: ${new Date(activeUserRecord.passwordUpdatedAt).toLocaleString()}${
                    activeUserRecord.passwordUpdatedBy ? ` by ${activeUserRecord.passwordUpdatedBy}` : ''
                  }`
                : 'Changes are saved immediately to local storage and synced with Cloud Firestore.'}
            </p>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Update My Password</span>
            </button>
          </div>
        </form>
      </div>

      {/* STAFF PASSWORD VAULT (Admin / Manager full management; Auditor read-only hygiene view) */}
      {(canManageStaffPasswords || isAuditor) && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-display font-black text-lg text-slate-900 uppercase tracking-tight">
                  Staff Credential &amp; PIN Directory
                </h2>
                <p className="text-xs text-slate-500">
                  {isAuditor
                    ? 'Read-only credential hygiene overview (passwords remain masked for Auditor accounts).'
                    : 'Manage, update, or reset staff access credentials across all registered workshop accounts.'}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black uppercase w-fit">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>{isAdmin ? 'Admin Full Vault' : isManager ? 'Manager Vault' : 'Auditor Read-Only'}</span>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Staff Accounts</p>
              <p className="text-xl font-black text-slate-900 mt-1">{totalAccounts}</p>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-800 uppercase">Custom Passwords</p>
              <p className="text-xl font-black text-emerald-700 mt-1">{customPasswordCount}</p>
            </div>
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
              <p className="text-[10px] font-bold text-amber-800 uppercase">Using Default PIN</p>
              <p className="text-xl font-black text-amber-700 mt-1">{defaultPinCount}</p>
            </div>
            <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200">
              <p className="text-[10px] font-bold text-blue-800 uppercase">Active Status</p>
              <p className="text-xl font-black text-blue-700 mt-1">{activeAccountCount}</p>
            </div>
          </div>

          {staffBannerMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{staffBannerMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setStaffBannerMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search & Policy Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by staff name, role, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'ALL', label: `All (${employees.length})` },
                  { id: 'DEFAULT', label: `Default PIN (${defaultPinCount})` },
                  { id: 'CUSTOM', label: `Custom (${customPasswordCount})` },
                  { id: 'ACTIVE', label: `Active (${activeAccountCount})` }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPolicyFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                    policyFilter === f.id
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Credentials Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-3">Role &amp; Status</th>
                  <th className="py-3 px-3">Policy Status</th>
                  {!isAuditor && <th className="py-3 px-3">Password / PIN</th>}
                  <th className="py-3 px-3">Last Updated</th>
                  {!isAuditor && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={isAuditor ? 4 : 6} className="py-10 text-center text-slate-400">
                      No matching staff accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const usesDefault = isUsingDefaultPassword(emp);
                    const allowed = canManageTarget(emp);
                    const isRevealed = !!revealedIds[emp.id];
                    const effectivePw = getEffectivePassword(emp);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center font-black text-amber-700 text-xs shrink-0">
                              {emp.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                {currentUser?.id === emp.id && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black uppercase">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{emp.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 block">{emp.role}</span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                emp.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : emp.status === 'On Leave'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {emp.status}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                              usesDefault
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {usesDefault ? (
                              <>
                                <Unlock className="w-3 h-3 text-amber-600" />
                                <span>Default PIN</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-emerald-600" />
                                <span>Custom Set</span>
                              </>
                            )}
                          </span>
                        </td>

                        {!isAuditor && (
                          <td className="py-3 px-3">
                            {allowed ? (
                              <div className="flex items-center gap-1.5">
                                <code className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 min-w-[84px] text-center">
                                  {isRevealed ? effectivePw : '••••••••'}
                                </code>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedIds((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))
                                  }
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title={isRevealed ? 'Hide password' : 'Reveal password'}
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCredential(emp)}
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                  title="Copy password to clipboard"
                                >
                                  {copiedId === emp.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500">
                                <Lock className="w-3 h-3" />
                                Admin Protected
                              </span>
                            )}
                          </td>
                        )}

                        <td className="py-3 px-3 text-[11px] text-slate-500">
                          {emp.passwordUpdatedAt ? (
                            <div>
                              <p className="font-mono font-semibold text-slate-700">
                                {new Date(emp.passwordUpdatedAt).toLocaleDateString()}
                              </p>
                              {emp.passwordUpdatedBy && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                  {emp.passwordUpdatedBy}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Initial setup</span>
                          )}
                        </td>

                        {!isAuditor && (
                          <td className="py-3 px-4 text-right">
                            {allowed ? (
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenStaffPasswordModal(emp)}
                                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                                >
                                  Set Password
                                </button>

                                {confirmResetId === emp.id ? (
                                  <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-1 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() => handleResetToDefault(emp)}
                                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-black cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmResetId(null)}
                                      className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmResetId(emp.id)}
                                    disabled={usesDefault}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer disabled:cursor-not-allowed"
                                    title="Reset to default role PIN"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Reset</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold">Protected</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NON-ADMIN / ARTISAN INFO CARD */}
      {!canManageStaffPasswords && !isAuditor && (
        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
          <UserCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-900">Personal Account Credential Access</p>
            <p className="mt-0.5 leading-relaxed">
              You can update and manage your own account password above at any time. If you forget your password, please contact an active Workshop Administrator or Manager to reset your PIN.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: SET / CHANGE STAFF PASSWORD */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-amber-50 p-5 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-600 text-white rounded-xl">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Set Password for {editingEmployee.name}
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    {editingEmployee.role} &bull; {editingEmployee.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffPassword} className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const pin = generateSecurePin(6);
                    setModalPassword(pin);
                    setModalConfirmPassword(pin);
                    setShowModalPw(true);
                    setModalError(null);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Generate 6-Digit PIN</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pw = generateStrongPassword(10);
                    setModalPassword(pw);
                    setModalConfirmPassword(pw);
                    setShowModalPw(true);
                    setModalError(null);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Generate Strong Password</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">New Password / PIN *</label>
                <div className="relative">
                  <input
                    type={showModalPw ? 'text' : 'password'}
                    required
                    value={modalPassword}
                    onChange={(e) => {
                      setModalPassword(e.target.value);
                      setModalError(null);
                    }}
                    placeholder="Minimum 4 characters..."
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showModalPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {modalPassword && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full ${
                            modalStrength.score >= step ? modalStrength.barColor : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold ${modalStrength.textColor}`}>{modalStrength.label}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Confirm Password / PIN *</label>
                <input
                  type={showModalPw ? 'text' : 'password'}
                  required
                  value={modalConfirmPassword}
                  onChange={(e) => {
                    setModalConfirmPassword(e.target.value);
                    setModalError(null);
                  }}
                  placeholder="Re-enter password..."
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl"
                />
              </div>

              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Save &amp; Sync Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          PRINT AREA: CREDENTIAL HYGIENE AUDIT (NO PLAINTEXT PASSWORDS)
         ========================================== */}
      {!embedded && (
        <div id="passwords-print-area" className="hidden bg-white text-black p-6 space-y-6">
          <div className="print-header">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Swedswood Logo" className="w-12 h-12 object-contain" />
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">SWEDS WOOD ENTERPRISE</h1>
                <p className="text-xs text-gray-600">
                  2 Swed Free Avenue, Sussex &bull; Account Security &amp; Password Policy Audit
                </p>
              </div>
            </div>
            <div className="text-right text-xs font-mono">
              <p className="font-bold">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              <p>Operator: {currentUser?.name || 'System'} ({currentUser?.role || 'Staff'})</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs border border-slate-300 rounded-xl p-3">
            <div><strong>Total Accounts:</strong> {totalAccounts}</div>
            <div><strong>Custom Passwords:</strong> {customPasswordCount}</div>
            <div><strong>Default PINs:</strong> {defaultPinCount}</div>
            <div><strong>Active Accounts:</strong> {activeAccountCount}</div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 uppercase text-[10px]">
                <th className="py-2 px-2">Staff Name</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Email</th>
                <th className="py-2 px-2">Account Status</th>
                <th className="py-2 px-2">Credential Policy</th>
                <th className="py-2 px-2">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td className="py-1.5 px-2 font-bold">{emp.name}</td>
                  <td className="py-1.5 px-2">{emp.role}</td>
                  <td className="py-1.5 px-2">{emp.email}</td>
                  <td className="py-1.5 px-2">{emp.status}</td>
                  <td className="py-1.5 px-2 font-bold">
                    {isUsingDefaultPassword(emp) ? 'Default Role PIN' : 'Custom Password Set'}
                  </td>
                  <td className="py-1.5 px-2 font-mono">
                    {emp.passwordUpdatedAt ? new Date(emp.passwordUpdatedAt).toLocaleDateString() : 'Initial Setup'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-system-footer flex items-center justify-between text-[10px]">
            <span>SWEDS WOOD ENTERPRISE &bull; Confidential Security Policy Report (Plaintext Passwords Redacted)</span>
            <span>2 Swed Free Avenue, Sussex &bull; swedswoodinfo@gmail.com</span>
          </div>
        </div>
      )}
    </div>
  );
}
