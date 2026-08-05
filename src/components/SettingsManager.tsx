import React from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Download, 
  Upload, 
  Database, 
  Wifi, 
  WifiOff, 
  Trash2, 
  User, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Lock,
  RefreshCw,
  Package,
  UserCheck,
  Wrench,
  Receipt,
  DollarSign,
  Users
} from 'lucide-react';
import { Employee } from '../types';

interface SettingsManagerProps {
  currentUser: Employee | null;
  isOnline: boolean;
  lastSyncTime: string;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  onPerformSync: () => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRestoreAllDataTillToday: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClearData: (silent?: boolean) => void;
  recordCounts: {
    inventory: number;
    customers: number;
    employees: number;
    jobs: number;
    financials: number;
    dailyLogs: number;
    savedInvoices: number;
  };
}

export default function SettingsManager({
  currentUser,
  isOnline,
  lastSyncTime,
  syncStatus,
  onPerformSync,
  onExportBackup,
  onImportBackup,
  onRestoreAllDataTillToday,
  fileInputRef,
  onClearData,
  recordCounts
}: SettingsManagerProps) {
  const isActiveUser = currentUser?.status === 'Active';
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Hidden File Input for Data Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImportBackup}
        accept=".json"
        className="hidden"
      />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-wood-950 to-slate-900 p-6 sm:p-8 rounded-3xl border border-white/10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Settings className="w-48 h-48 text-amber-500" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                System Settings & Security
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Zero Data Loss Active
              </span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight uppercase">
              System Settings & Data Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1">
              Configure system preferences, perform offline data backups, manage system updates, and monitor database synchronization.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-lg">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-xs font-black text-white">{currentUser?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{currentUser?.role} • Status: <span className={isActiveUser ? 'text-emerald-400' : 'text-amber-400'}>{currentUser?.status}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Data Backup & Restore Hub */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* EXCLUSIVE BACKUP & RESTORE SECTION */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 relative overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-700 rounded-2xl border border-amber-500/20">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display font-black text-lg text-slate-900 uppercase tracking-tight">
                    Data Backup & Recovery Hub
                  </h2>
                  <p className="text-xs text-slate-500">
                    Exclusively available in Settings for active account holders.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black uppercase">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Restricted Access</span>
              </div>
            </div>

            {/* Account Requirement Warning / Status Banner */}
            {!isActiveUser ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-bold">Active Account Required for Data Backup</p>
                  <p className="text-amber-700 mt-0.5">
                    Your current account status is <strong>{currentUser?.status || 'Inactive'}</strong>. You must possess an active user account to download data backups or restore JSON archives.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <p className="font-bold">Active Account Authenticated ({currentUser?.name})</p>
                  <p className="text-emerald-700 mt-0.5">
                    You are authorized to perform complete system backups and restore previously saved JSON data archives. All system updates preserve your stored records safely.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons for Backup & Restore */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Backup Card */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between hover:border-amber-300 transition">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                    <Download className="w-4 h-4 text-amber-600" />
                    <span>Backup System Data</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Download an offline JSON snapshot of all jobs, inventory, client ledgers, financial transactions, invoices, and employee records.
                  </p>
                </div>

                <button
                  onClick={onExportBackup}
                  disabled={!isActiveUser}
                  className="w-full py-3 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download (.JSON)</span>
                </button>
              </div>

              {/* Restore Card */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between hover:border-sky-300 transition">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                    <Upload className="w-4 h-4 text-sky-600" />
                    <span>Restore JSON File</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload a previously exported Swedswood JSON backup file to instantly recover or update all database collections.
                  </p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isActiveUser}
                  className="w-full py-3 px-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Restore File (.JSON)</span>
                </button>
              </div>

              {/* Bring Back All Cloud Data Card */}
              <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 space-y-4 flex flex-col justify-between hover:border-emerald-300 transition">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-sm">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Bring Back Cloud Data</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Fetch and restore all records till today's date from Cloud Firestore into local view and database state.
                  </p>
                </div>

                <button
                  onClick={onRestoreAllDataTillToday}
                  disabled={!isActiveUser}
                  className="w-full py-3 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Restore Till Today</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium italic text-center pt-2">
              * Note: Backup & Restore actions are strictly managed inside Settings to prevent accidental data overwrites from main navigation menus.
            </p>
          </div>

          {/* ZERO DATA LOSS & SYSTEM UPDATE PROTECTION INFORMATION */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-700 rounded-2xl border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-slate-900 uppercase tracking-tight">
                  System Updates & Zero Data Loss Guarantee
                </h3>
                <p className="text-xs text-slate-500">
                  How Swedswood Enterprise protects your workshop records across software updates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Dual Local & Cloud Storage</span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Every transaction, job, customer, and invoice is immediately persisted to local storage cache AND synced in real-time with Google Cloud Firestore database.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  <span>Update Persistence Protocol</span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  System version updates and browser refreshes never clear your existing business records. The database sync re-establishes state automatically on boot.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Database & System Metrics */}
        <div className="space-y-6">
          
          {/* Database Connection & Online Sync Status */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm uppercase">
                <Database className="w-4 h-4 text-amber-600" />
                <span>Database Sync Status</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-amber-600" />}
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Firestore DB Connection:</span>
                <span className={`font-bold ${isOnline ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isOnline ? 'Connected (Cloud Firestore)' : 'Offline Local Cache'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Last Cloud Sync:</span>
                <span className="font-mono font-bold text-slate-800">{lastSyncTime || 'N/A'}</span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-medium">Sync State:</span>
                <span className="font-bold uppercase text-slate-800">{syncStatus}</span>
              </div>

              {isOnline && (
                <button
                  onClick={onPerformSync}
                  disabled={syncStatus === 'syncing'}
                  className="w-full mt-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Wifi className={`w-3.5 h-3.5 text-emerald-600 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>{syncStatus === 'syncing' ? 'Syncing with Firestore...' : 'Sync Cloud Database Now'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Current System Record Summary */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              Stored Record Inventory
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <Package className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-black text-slate-900">{recordCounts.inventory}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Inventory Items</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="font-black text-slate-900">{recordCounts.customers}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Clients</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <Wrench className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <p className="font-black text-slate-900">{recordCounts.jobs}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Active Jobs</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-black text-slate-900">{recordCounts.savedInvoices}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Saved Invoices</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <p className="font-black text-slate-900">{recordCounts.financials}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Ledger Items</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-700 shrink-0" />
                <div>
                  <p className="font-black text-slate-900">{recordCounts.employees}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Staff Accounts</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Purge Danger Zone */}
          {isAdminOrManager && (
            <div className="bg-red-50/50 p-5 rounded-3xl border border-red-200/80 space-y-3">
              <div className="flex items-center gap-2 text-red-900 font-black text-xs uppercase tracking-wider">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>System Fresh Start</span>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                Clear system database records to initialize a completely clean slate for new workshop deployments.
              </p>
              <button
                onClick={() => onClearData(false)}
                className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold text-xs transition cursor-pointer shadow-2xs"
              >
                Clear System Data (Fresh Start)
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
