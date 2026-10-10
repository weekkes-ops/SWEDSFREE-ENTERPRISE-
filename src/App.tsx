import React, { useState, useEffect, useRef } from 'react';

import { 
  LayoutDashboard, 
  Package, 
  UserCheck, 
  Users, 
  Wrench, 
  DollarSign, 
  FileBarChart, 
  Database, 
  Menu, 
  X,
  Sparkles,
  Hammer,
  Camera,
  Receipt,
  Wifi,
  WifiOff,
  Download,
  Upload,
  HardDrive,
  Settings,
  BookOpen,
  FileSpreadsheet,
  Clock,
  RotateCcw,
  ArrowLeft,
  FileCheck,
  UploadCloud
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

// Childs components
import DashboardOverview from './components/DashboardOverview';
import InventoryManager from './components/InventoryManager';
import CustomerManager from './components/CustomerManager';
import EmployeeManager from './components/EmployeeManager';
import JobManager from './components/JobManager';
import FinancialLedger from './components/FinancialLedger';
import ReportGenerator from './components/ReportGenerator';
import OfficialDocumentsManager from './components/OfficialDocumentsManager';
import DailyWorkManager from './components/DailyWorkManager';
import InvoiceReceiptManager from './components/InvoiceReceiptManager';
import ProformaInvoiceDesk from './components/ProformaInvoiceDesk';
import SettingsManager from './components/SettingsManager';
import UserManualModal from './components/UserManualModal';
import LoginScreen from './components/LoginScreen';
import { LogOut } from 'lucide-react';
import { downloadUserManualPdf } from './utils/userManualPdf';

// Seed data & types
import { INITIAL_OFFICIAL_DOCUMENTS } from './initialDocuments';
import { 
  subscribeToCollection, 
  saveDocument, 
  deleteDocument, 
  saveBatchDocuments, 
  deleteBatchDocuments, 
  clearEntireCollection,
  fetchCollectionFromFirestore 
} from './lib/firestoreService';

const LIVE_ADMIN_EMPLOYEE: Employee = {
  id: 'emp-01',
  name: 'Mr Paul Bindi',
  role: 'Admin',
  phone: '+232 76 442590',
  email: 'paul.bindi@swedsfree.com',
  status: 'Active',
  hireDate: new Date().toISOString().split('T')[0],
  password: 'admin'
};
import { 
  InventoryItem, 
  InventoryTransaction, 
  Customer, 
  Employee, 
  Job, 
  FinancialTransaction, 
  EmployeeStatus, 
  JobStatus, 
  JobMaterial, 
  JobPayment, 
  FinancialCategory,
  DailyWorkLog,
  RegistrationRequest,
  EmployeeRole,
  WarningLetter,
  SavedInvoice,
  PaymentAuditLogEntry,
  OfficialDocument
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [tabHistory, setTabHistory] = useState<string[]>(['dashboard']);
  const isBackNavigatingRef = useRef<boolean>(false);
  const prevTabRef = useRef<string>(activeTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [quickActionTrigger, setQuickActionTrigger] = useState<string | null>(null);
  const [invoiceJobId, setInvoiceJobId] = useState<string | null>(null);
  const [invoiceInitialSubTab, setInvoiceInitialSubTab] = useState<'INVOICE' | 'PROFORMA' | 'SAVED_INVOICES' | 'RECEIPT'>('INVOICE');
  const [proformaCustomerId, setProformaCustomerId] = useState<string | null>(null);
  const [proformaJobId, setProformaJobId] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Track tab history for universal Go Back navigation across all users
  useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      if (!isBackNavigatingRef.current) {
        setTabHistory(prev => {
          if (prev[prev.length - 1] === activeTab) return prev;
          const next = [...prev, activeTab];
          return next.slice(-30);
        });
      } else {
        isBackNavigatingRef.current = false;
      }
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  const handleGoBack = () => {
    if (tabHistory.length > 1) {
      isBackNavigatingRef.current = true;
      const nextHistory = [...tabHistory];
      nextHistory.pop(); // remove current active tab
      const targetTab = nextHistory[nextHistory.length - 1];
      setTabHistory(nextHistory);
      setActiveTab(targetTab);
    } else if (activeTab !== 'dashboard') {
      isBackNavigatingRef.current = true;
      setTabHistory(['dashboard']);
      setActiveTab('dashboard');
    } else {
      if (window.history.length > 1) {
        window.history.back();
      }
    }
  };

  const getTabDisplayName = (tabId: string): string => {
    switch (tabId) {
      case 'dashboard': return 'Workshop Hub';
      case 'inventory': return 'Inventory';
      case 'customers': return 'Clients/Customers';
      case 'employees': return 'Employees';
      case 'invoices': return 'Invoices & Receipts';
      case 'proforma': return 'PROFORMA INVOICE';
      case 'jobs': return 'Job lists';
      case 'daily-work': return 'Daily Logs';
      case 'finance': return 'Financial Ledger';
      case 'reports': return 'Audit Reports';
      case 'documents': return 'Official Documents';
      case 'settings': return 'Settings';
      default: return tabId;
    }
  };

  const canGoBack = tabHistory.length > 1 || activeTab !== 'dashboard';
  const previousTabId = tabHistory.length > 1 
    ? tabHistory[tabHistory.length - 2] 
    : (activeTab !== 'dashboard' ? 'dashboard' : null);
  const previousTabLabel = previousTabId ? getTabDisplayName(previousTabId) : null;

  const handleTriggerInvoice = (jobId: string) => {
    setInvoiceJobId(jobId);
    setInvoiceInitialSubTab('INVOICE');
    setActiveTab('invoices');
  };

  const handleTriggerProforma = (customerId?: string, jobId?: string) => {
    let targetCustomerId = customerId;
    if (jobId) {
      setInvoiceJobId(jobId);
      setProformaJobId(jobId);
      if (!targetCustomerId) {
        const foundJob = jobs.find(j => j.id === jobId);
        if (foundJob) {
          targetCustomerId = foundJob.customerId;
        }
      }
    } else {
      setProformaJobId(null);
    }
    setProformaCustomerId(targetCustomerId || null);
    setInvoiceInitialSubTab('PROFORMA');
    setActiveTab('proforma');
  };

  const handleTriggerReceipt = (jobId?: string) => {
    if (jobId) {
      setInvoiceJobId(jobId);
    }
    setInvoiceInitialSubTab('RECEIPT');
    setActiveTab('invoices');
  };

  // Offline network  for production infastrature status & file backup ref
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>(navigator.onLine ? 'synced' : 'offline');
  const [syncBannerMessage, setSyncBannerMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('swedsfree_last_online_sync') || new Date().toLocaleTimeString();
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performAutoOnlineSync = async () => {
    setSyncStatus('syncing');
    setSyncBannerMessage('Internet connection active! Synchronizing all local records with online Firestore database...');
    
    try {
      if (inventory.length > 0) await saveBatchDocuments('inventory', inventory);
      if (customers.length > 0) await saveBatchDocuments('customers', customers);
      if (employees.length > 0) await saveBatchDocuments('employees', employees);
      if (jobs.length > 0) await saveBatchDocuments('jobs', jobs);
      if (inventoryTransactions.length > 0) await saveBatchDocuments('inventoryTransactions', inventoryTransactions);
      if (financialTransactions.length > 0) await saveBatchDocuments('financialTransactions', financialTransactions);
      if (dailyWorkLogs.length > 0) await saveBatchDocuments('dailyWorkLogs', dailyWorkLogs);
      if (registrationRequests.length > 0) await saveBatchDocuments('registrationRequests', registrationRequests);
      if (warningLetters.length > 0) await saveBatchDocuments('warningLetters', warningLetters);

      const rawInvs = localStorage.getItem('swedswood_saved_invoices');
      if (rawInvs) {
        try {
          const invs = JSON.parse(rawInvs);
          if (Array.isArray(invs) && invs.length > 0) {
            await saveBatchDocuments('savedInvoices', invs);
          }
        } catch {}
      }

      const nowStr = new Date().toLocaleTimeString();
      setSyncStatus('synced');
      setLastSyncTime(nowStr);
      localStorage.setItem('swedsfree_last_online_sync', nowStr);
      setSyncBannerMessage('✓ Online database automatically updated and synchronized with all local offline records!');
      setTimeout(() => setSyncBannerMessage(null), 6000);
    } catch (err) {
      console.error('Error auto syncing with online database:', err);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performAutoOnlineSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      setSyncBannerMessage('Working Offline: System is saving all data locally. Online database will update automatically when internet reconnects.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline Data Export (JSON)
  const handleExportBackup = () => {
    if (!currentUser) {
      alert("Active Account Required: You must be logged in with an active user account to backup system data.");
      return;
    }

    if (currentUser.status !== 'Active') {
      alert(`Active Account Required: Your account status is currently '${currentUser.status}'. Only active account holders can perform data backups.`);
      return;
    }

    const localSavedInvoices = localStorage.getItem('swedswood_saved_invoices');
    const savedInvoices = localSavedInvoices ? JSON.parse(localSavedInvoices) : [];

    const backupData = {
      appName: 'Sweds Wood Enterprise',
      exportDate: new Date().toISOString(),
      exportedBy: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        status: currentUser.status
      },
      inventory,
      customers,
      employees,
      jobs,
      inventoryTransactions,
      financialTransactions,
      dailyWorkLogs,
      registrationRequests,
      warningLetters,
      savedInvoices,
      paymentAuditLogs,
      officialDocuments
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SwedsWood_Data_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Offline Data Import (JSON) -> Saves directly to Firestore Online Database
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      alert("Active Account Required: You must be logged in with an active user account to restore system data.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (currentUser.status !== 'Active') {
      alert(`Active Account Required: Your account status is currently '${currentUser.status}'. Only active account holders can restore system backups.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setSyncStatus('syncing');
        setSyncBannerMessage('Importing backup file & uploading all records to online Firestore database...');
        const data = JSON.parse(event.target?.result as string);

        // Disable automatic demo re-seeding so backup file is treated as ground truth
        localStorage.setItem('swedsfree_seed_disabled', 'true');

        const collectionsToProcess = [
          { key: 'inventory', localKey: 'swedsfree_inventory', data: data.inventory, setter: setInventory },
          { key: 'customers', localKey: 'swedsfree_customers', data: data.customers, setter: setCustomers },
          { key: 'employees', localKey: 'swedsfree_employees', data: data.employees, setter: setEmployees },
          { key: 'jobs', localKey: 'swedsfree_jobs', data: data.jobs, setter: setJobs },
          { key: 'inventoryTransactions', localKey: 'swedsfree_inv_transactions', data: data.inventoryTransactions, setter: setInventoryTransactions },
          { key: 'financialTransactions', localKey: 'swedsfree_fin_transactions', data: data.financialTransactions, setter: setFinancialTransactions },
          { key: 'dailyWorkLogs', localKey: 'swedsfree_daily_work_logs', data: data.dailyWorkLogs, setter: setDailyWorkLogs },
          { key: 'registrationRequests', localKey: 'swedsfree_registration_requests', data: data.registrationRequests, setter: setRegistrationRequests },
          { key: 'warningLetters', localKey: 'swedsfree_warning_letters', data: data.warningLetters, setter: setWarningLetters },
          { key: 'paymentAuditLogs', localKey: 'swedsfree_payment_audit_logs', data: data.paymentAuditLogs, setter: setPaymentAuditLogs },
          { key: 'officialDocuments', localKey: 'swedsfree_official_documents', data: data.officialDocuments, setter: setOfficialDocuments },
          { key: 'savedInvoices', localKey: 'swedswood_saved_invoices', data: data.savedInvoices, setter: null },
        ];

        for (const col of collectionsToProcess) {
          if (Array.isArray(col.data)) {
            if (col.setter) col.setter(col.data);
            localStorage.setItem(col.localKey, JSON.stringify(col.data));
            await clearEntireCollection(col.key);
            if (col.data.length > 0) {
              await saveBatchDocuments(col.key, col.data);
            }
          }
        }

        const nowStr = new Date().toLocaleTimeString();
        setSyncStatus('synced');
        setLastSyncTime(nowStr);
        localStorage.setItem('swedsfree_last_online_sync', nowStr);
        setSyncBannerMessage('✓ Backup imported and saved to online Firestore database successfully!');
        alert('Data backup imported successfully! All records saved to online Firestore database.');
        setTimeout(() => setSyncBannerMessage(null), 6000);
      } catch (err) {
        console.error('Failed to parse or save backup file to online database:', err);
        setSyncStatus('error');
        alert('Failed to parse or save backup file to online database. Please verify the JSON file.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Strictly identify legacy mock/demo record IDs (short fixed numbers or keywords) vs authentic user records
  const isDemoId = (id?: string, key?: string): boolean => {
    if (!id) return false;
    // Always preserve live Administrator Paul Bindi
    if ((key === 'swedsfree_employees' || key === 'employees') && id === 'emp-01') return false;
    // Any short legacy mock ID (e.g., cust-1, cust-01, cust-201, inv-1, inv-101, emp-02, emp-2, job-301, fin-601, itrans-501)
    if (/^(cust|job|inv|emp|fin|log|warn|reg|itrans|doc)-(\d{1,5})$/i.test(id)) return true;
    // Any explicit demo/mock/dummy/seed flags in ID
    if (/demo|sample|mock|dummy|seed/i.test(id)) return true;
    return false;
  };

  // Helper to load stored data from local cache with fallback and strict live filter
  const getStoredData = <T extends { id?: string }>(key: string, fallback: T[] = []): T[] => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(item => !item || !item.id || !isDemoId(item.id, key));
          if (key === 'swedsfree_employees') {
            if (!cleaned.some(e => (e as any).id === 'emp-01')) {
              return [LIVE_ADMIN_EMPLOYEE as unknown as T, ...cleaned];
            }
          }
          return cleaned;
        }
      }
      if (key === 'swedsfree_employees') return [LIVE_ADMIN_EMPLOYEE] as unknown as T[];
    } catch (e) {
      console.error(`Error loading stored data for ${key}:`, e);
    }
    return fallback;
  };

  // Core workshop state modules

  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    try {
      const localUser = localStorage.getItem('swedsfree_current_user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        if (parsed && (parsed.id === 'emp-01' || parsed.name === 'Mr Paul Bindi')) {
          parsed.phone = '+232 76 442590';
        }
        return parsed;
      }
      return LIVE_ADMIN_EMPLOYEE;
    } catch {
      return LIVE_ADMIN_EMPLOYEE;
    }
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => getStoredData('swedsfree_inventory', []));
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredData('swedsfree_customers', []));
  const [employees, setEmployees] = useState<Employee[]>(() => getStoredData('swedsfree_employees', [LIVE_ADMIN_EMPLOYEE]));
  const [jobs, setJobs] = useState<Job[]>(() => getStoredData('swedsfree_jobs', []));
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>(() => getStoredData('swedsfree_inv_transactions', []));
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>(() => getStoredData('swedsfree_fin_transactions', []));
  const [dailyWorkLogs, setDailyWorkLogs] = useState<DailyWorkLog[]>(() => getStoredData('swedsfree_daily_work_logs', []));
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>(() => getStoredData('swedsfree_registration_requests', []));
  const [warningLetters, setWarningLetters] = useState<WarningLetter[]>(() => getStoredData('swedsfree_warning_letters', []));
  const [paymentAuditLogs, setPaymentAuditLogs] = useState<PaymentAuditLogEntry[]>(() => getStoredData('swedsfree_payment_audit_logs', []));
  const [officialDocuments, setOfficialDocuments] = useState<OfficialDocument[]>(() => getStoredData('swedsfree_official_documents', []));

  // 1-minute inactivity timeout configuration (60,000ms = 1 minute)
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);
  const [inactivityRemainingSeconds, setInactivityRemainingSeconds] = useState<number>(15);
  const lastActivityRef = useRef<number>(Date.now());
  const [sessionKey, setSessionKey] = useState<number>(() => Date.now());

  // Function to end current session cleanly and start a brand new session
  const handleStartNewSession = (noticeMessage?: string) => {
    setCurrentUser(null);
    localStorage.removeItem('swedsfree_current_user');

    try {
      sessionStorage.clear();
    } catch {}

    setShowInactivityWarning(false);
    setMobileMenuOpen(false);
    setQuickActionTrigger(null);
    setInvoiceJobId(null);
    setProformaCustomerId(null);
    setProformaJobId(null);
    setIsManualModalOpen(false);
    setActiveTab('dashboard');

    setSessionKey(Date.now());
    lastActivityRef.current = Date.now();

    if (noticeMessage) {
      setInactivityNotice(noticeMessage);
    } else {
      setInactivityNotice('New session started. Please sign in with your credentials.');
    }
  };

  // Clear all data function for live production
  const handleClearAllSystemDataForGoLive = async (silent: boolean = false) => {
    if (!silent && !window.confirm('CRITICAL GO-LIVE ACTION: Are you sure you want to clear ALL system data (inventory, customers, jobs, financial ledger, transactions, invoices, and daily logs) to start completely fresh for live production? This action cannot be undone.')) {
      return;
    }

    localStorage.setItem('swedsfree_seed_disabled', 'true');

    try {
      await clearEntireCollection('inventory');
      await clearEntireCollection('customers');
      await clearEntireCollection('jobs');
      await clearEntireCollection('inventoryTransactions');
      await clearEntireCollection('financialTransactions');
      await clearEntireCollection('dailyWorkLogs');
      await clearEntireCollection('registrationRequests');
      await clearEntireCollection('warningLetters');
      await clearEntireCollection('officialDocuments');
      await clearEntireCollection('employees');

      await saveDocument('employees', LIVE_ADMIN_EMPLOYEE);
    } catch (err) {
      console.error('Error during Firestore data purge:', err);
    }

    setInventory([]);
    setCustomers([]);
    setEmployees([LIVE_ADMIN_EMPLOYEE]);
    setJobs([]);
    setInventoryTransactions([]);
    setFinancialTransactions([]);
    setDailyWorkLogs([]);
    setRegistrationRequests([]);
    setWarningLetters([]);
    setOfficialDocuments([]);

    localStorage.setItem('swedsfree_inventory', JSON.stringify([]));
    localStorage.setItem('swedsfree_customers', JSON.stringify([]));
    localStorage.setItem('swedsfree_employees', JSON.stringify([LIVE_ADMIN_EMPLOYEE]));
    localStorage.setItem('swedsfree_jobs', JSON.stringify([]));
    localStorage.setItem('swedsfree_inv_transactions', JSON.stringify([]));
    localStorage.setItem('swedsfree_fin_transactions', JSON.stringify([]));
    localStorage.setItem('swedsfree_daily_work_logs', JSON.stringify([]));
    localStorage.setItem('swedsfree_registration_requests', JSON.stringify([]));
    localStorage.setItem('swedsfree_warning_letters', JSON.stringify([]));
    localStorage.setItem('swedsfree_official_documents', JSON.stringify([]));
    localStorage.setItem('swedswood_saved_invoices', JSON.stringify([]));

    setActiveTab('dashboard');

    if (!silent) {
      alert('SUCCESS: All system data has been completely cleared from Firestore database and local storage. The system is now 100% clean and ready for live production use!');
    }
  };

  // Restore all records from Firestore into local state
  const handleRestoreAllDataTillToday = async () => {
    try {
      setSyncStatus('syncing');

      // Query Firestore directly for server documents
      const inv = await fetchCollectionFromFirestore<InventoryItem>('inventory');
      const cust = await fetchCollectionFromFirestore<Customer>('customers');
      const emp = await fetchCollectionFromFirestore<Employee>('employees');
      const jbs = await fetchCollectionFromFirestore<Job>('jobs');
      const invTx = await fetchCollectionFromFirestore<InventoryTransaction>('inventoryTransactions');
      const finTx = await fetchCollectionFromFirestore<FinancialTransaction>('financialTransactions');
      const wLogs = await fetchCollectionFromFirestore<DailyWorkLog>('dailyWorkLogs');
      const reqs = await fetchCollectionFromFirestore<RegistrationRequest>('registrationRequests');
      const warns = await fetchCollectionFromFirestore<WarningLetter>('warningLetters');
      const invs = await fetchCollectionFromFirestore<SavedInvoice>('savedInvoices');
      const docs = await fetchCollectionFromFirestore<OfficialDocument>('officialDocuments');

      const finalInv = inv;
      const finalCust = cust;
      const finalEmp = emp.length > 0 ? emp : [LIVE_ADMIN_EMPLOYEE];
      const finalJobs = jbs;
      const finalInvTx = invTx;
      const finalFinTx = finTx;
      const finalWLogs = wLogs;
      const finalReqs = reqs;
      const finalWarns = warns;
      const finalInvs = invs;
      const finalDocs = docs;

      setInventory(finalInv);
      setCustomers(finalCust);
      setEmployees(finalEmp);
      setJobs(finalJobs);
      setInventoryTransactions(finalInvTx);
      setFinancialTransactions(finalFinTx);
      setDailyWorkLogs(finalWLogs);
      setRegistrationRequests(finalReqs);
      setWarningLetters(finalWarns);
      setOfficialDocuments(finalDocs);

      localStorage.setItem('swedsfree_inventory', JSON.stringify(finalInv));
      localStorage.setItem('swedsfree_customers', JSON.stringify(finalCust));
      localStorage.setItem('swedsfree_employees', JSON.stringify(finalEmp));
      localStorage.setItem('swedsfree_jobs', JSON.stringify(finalJobs));
      localStorage.setItem('swedsfree_inv_transactions', JSON.stringify(finalInvTx));
      localStorage.setItem('swedsfree_fin_transactions', JSON.stringify(finalFinTx));
      localStorage.setItem('swedsfree_daily_work_logs', JSON.stringify(finalWLogs));
      localStorage.setItem('swedsfree_registration_requests', JSON.stringify(finalReqs));
      localStorage.setItem('swedsfree_warning_letters', JSON.stringify(finalWarns));
      localStorage.setItem('swedsfree_official_documents', JSON.stringify(finalDocs));
      localStorage.setItem('swedswood_saved_invoices', JSON.stringify(finalInvs));

      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncStatus('synced');

      alert(`SUCCESS: All system data up to today's date (${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}) has been completely restored from Cloud Firestore!`);
    } catch (err) {
      console.error('Error bringing data back from Firestore:', err);
      setSyncStatus('error');
      alert('Could not sync with Firestore database. Please verify internet connectivity.');
    }
  };

  // 1. Initial Load & Real-Time Sync from Firestore Database
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Generic helper to subscribe to a collection
    const syncCollection = <T extends { id: string }>(
      collectionName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      localKey: string
    ) => {
      const unsub = subscribeToCollection<T>(collectionName, (items) => {
        let finalItems = (items || []).filter(item => !item || !item.id || !isDemoId(item.id, collectionName));
        if (collectionName === 'employees') {
          if (!finalItems.some(e => (e as any).id === 'emp-01')) {
            finalItems = [LIVE_ADMIN_EMPLOYEE as unknown as T, ...finalItems];
          }
        }

        setter(finalItems);
        localStorage.setItem(localKey, JSON.stringify(finalItems));
      });
      unsubs.push(unsub);
    };

    syncCollection('inventory', setInventory, 'swedsfree_inventory');
    syncCollection('customers', setCustomers, 'swedsfree_customers');
    syncCollection('employees', setEmployees, 'swedsfree_employees');
    syncCollection('jobs', setJobs, 'swedsfree_jobs');
    syncCollection('inventoryTransactions', setInventoryTransactions, 'swedsfree_inv_transactions');
    syncCollection('financialTransactions', setFinancialTransactions, 'swedsfree_fin_transactions');
    syncCollection('dailyWorkLogs', setDailyWorkLogs, 'swedsfree_daily_work_logs');
    syncCollection('registrationRequests', setRegistrationRequests, 'swedsfree_registration_requests');
    syncCollection('warningLetters', setWarningLetters, 'swedsfree_warning_letters');
    syncCollection('paymentAuditLogs', setPaymentAuditLogs, 'swedsfree_payment_audit_logs');
    syncCollection('officialDocuments', setOfficialDocuments, 'swedsfree_official_documents');

    // Mark initialization complete without clearing data automatically
    if (localStorage.getItem('swedsfree_initial_purge_done') !== 'true') {
      localStorage.setItem('swedsfree_initial_purge_done', 'true');
    }

    // Purge legacy demo records from local cache to ensure strictly authentic user records exist
    try {
      const filterDemo = (key: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            let cleaned = parsed.filter(item => item && item.id && !isDemoId(item.id, key));
            if (key === 'swedsfree_employees' && !cleaned.some(e => e.id === 'emp-01')) {
              cleaned = [LIVE_ADMIN_EMPLOYEE, ...cleaned];
            }
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(key, JSON.stringify(cleaned));
              setter(cleaned);
            }
          }
        }
      };

      filterDemo('swedsfree_inventory', setInventory);
      filterDemo('swedsfree_customers', setCustomers);
      filterDemo('swedsfree_jobs', setJobs);
      filterDemo('swedsfree_employees', setEmployees);
      filterDemo('swedsfree_fin_transactions', setFinancialTransactions);
      filterDemo('swedsfree_daily_work_logs', setDailyWorkLogs);
      filterDemo('swedsfree_warning_letters', setWarningLetters);
      filterDemo('swedsfree_registration_requests', setRegistrationRequests);
      filterDemo('swedsfree_inv_transactions', setInventoryTransactions);
      filterDemo('swedsfree_payment_audit_logs', setPaymentAuditLogs);
      filterDemo('swedsfree_official_documents', setOfficialDocuments);
    } catch (e) {
      console.error('Error purging demo records from local cache:', e);
    }

    // Clean any legacy demo records from Firestore database collections in background
    const collectionsToClean = [
      'inventory', 'customers', 'employees', 'jobs', 
      'inventoryTransactions', 'financialTransactions', 
      'dailyWorkLogs', 'registrationRequests', 'warningLetters', 
      'paymentAuditLogs', 'officialDocuments'
    ];
    collectionsToClean.forEach(col => {
      fetchCollectionFromFirestore<{ id: string }>(col).then(items => {
        const demoDocs = (items || []).filter(item => isDemoId(item.id, col));
        demoDocs.forEach(d => {
          deleteDocument(col, d.id).catch(() => {});
        });
      }).catch(() => {});
    });

    // Completely remove any residual salary or overtime rates from cached employees and current user
    try {
      const rawEmps = localStorage.getItem('swedsfree_employees');
      if (rawEmps) {
        const parsedEmps = JSON.parse(rawEmps);
        if (Array.isArray(parsedEmps)) {
          let empModified = false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sanitizedEmps = parsedEmps.map((emp: any) => {
            if ('baseSalary' in emp || 'dailyRate' in emp) {
              empModified = true;
              const { baseSalary, dailyRate, ...rest } = emp;
              return rest;
            }
            return emp;
          });
          if (empModified) {
            localStorage.setItem('swedsfree_employees', JSON.stringify(sanitizedEmps));
            setEmployees(sanitizedEmps);
          }
        }
      }

      const rawUser = localStorage.getItem('swedsfree_current_user');
      if (rawUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedUser: any = JSON.parse(rawUser);
        if (parsedUser && ('baseSalary' in parsedUser || 'dailyRate' in parsedUser)) {
          const { baseSalary, dailyRate, ...rest } = parsedUser;
          localStorage.setItem('swedsfree_current_user', JSON.stringify(rest));
          setCurrentUser(rest as Employee);
        }
      }

      // Sanitize any financial ledger records having legacy 'Salary' or 'Employee Wages'
      const rawFin = localStorage.getItem('swedsfree_fin_transactions');
      if (rawFin) {
        const parsedFin = JSON.parse(rawFin);
        if (Array.isArray(parsedFin)) {
          let finModified = false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sanitizedFin = parsedFin.map((tx: any) => {
            if (tx.category === 'Salary' || tx.category === 'Employee Wages') {
              finModified = true;
              return { ...tx, category: 'Utilities', description: tx.description ? tx.description.replace(/salary|payroll|wage/gi, 'workshop utilities') : 'Workshop utility expense' };
            }
            return tx;
          });
          if (finModified) {
            localStorage.setItem('swedsfree_fin_transactions', JSON.stringify(sanitizedFin));
            setFinancialTransactions(sanitizedFin);
          }
        }
      }
    } catch (err) {
      console.error('Error sanitizing cached salary/wage data:', err);
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  // Sync current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('swedsfree_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('swedsfree_current_user');
    }
  }, [currentUser]);

  // 1-minute Inactivity Auto-Lock & Logout (60s inactivity threshold)
  useEffect(() => {
    if (!currentUser) {
      setShowInactivityWarning(false);
      return;
    }

    // Reset activity timestamp upon login or user state update
    lastActivityRef.current = Date.now();

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
      setShowInactivityWarning(prev => (prev ? false : prev));
    };

    // User interaction events: mouse, keys, touch, scroll, clicks
    const activityEvents: (keyof WindowEventMap)[] = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    let lastThrottledTime = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 500) {
        lastThrottledTime = now;
        recordActivity();
      }
    };

    activityEvents.forEach(evt => {
      window.addEventListener(evt, throttledHandler, { passive: true });
    });

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const TIMEOUT_MS = 60000; // 60 seconds = 1 minute
      const WARNING_MS = 45000; // 45 seconds (15-second grace countdown)

      if (elapsed >= TIMEOUT_MS) {
        // Automatically logout due to 1 minute of inactivity and start a new session
        handleStartNewSession('You were automatically signed out after 1 minute of inactivity. A fresh session has started.');
      } else if (elapsed >= WARNING_MS) {
        setShowInactivityWarning(true);
        const rem = Math.max(1, Math.ceil((TIMEOUT_MS - elapsed) / 1000));
        setInactivityRemainingSeconds(rem);
      } else {
        setShowInactivityWarning(false);
      }
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, throttledHandler);
      });
    };
  }, [currentUser]);

  // 2. Sync to localStorage
  useEffect(() => {
    localStorage.setItem('swedsfree_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('swedsfree_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('swedsfree_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('swedsfree_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('swedsfree_inv_transactions', JSON.stringify(inventoryTransactions));
  }, [inventoryTransactions]);

  useEffect(() => {
    localStorage.setItem('swedsfree_fin_transactions', JSON.stringify(financialTransactions));
  }, [financialTransactions]);

  useEffect(() => {
    localStorage.setItem('swedsfree_daily_work_logs', JSON.stringify(dailyWorkLogs));
  }, [dailyWorkLogs]);

  useEffect(() => {
    localStorage.setItem('swedsfree_registration_requests', JSON.stringify(registrationRequests));
  }, [registrationRequests]);

  useEffect(() => {
    localStorage.setItem('swedsfree_warning_letters', JSON.stringify(warningLetters));
  }, [warningLetters]);

  // PURGE SAMPLE GENERATED DATA ACTION
  const handleResetDatabase = async () => {
    await handleClearAllSystemDataForGoLive(false);
  };

  // ==========================================
  // OPERATIONAL STATE WORKFLOW MUTATORS
  // ==========================================

  // A. Inventory mutators
  const handleAddInventoryItem = (
    item: Omit<InventoryItem, 'id' | 'lastUpdated'>,
    stockMovements?: { stockIn: number; stockOut: number; purpose?: string }
  ) => {
    const itemId = `inv-${Date.now()}`;
    const dateStr = new Date().toISOString().split('T')[0];
    const newItem: InventoryItem = {
      ...item,
      id: itemId,
      lastUpdated: dateStr
    };
    setInventory(prev => [newItem, ...prev]);
    saveDocument('inventory', newItem);

    // If stock movements were explicitly provided from New Raw Material form:
    if (stockMovements) {
      if (stockMovements.stockIn > 0) {
        const inTx: InventoryTransaction = {
          id: `tx-inv-${Date.now()}-in`,
          itemId,
          itemName: newItem.name,
          type: 'STOCK_IN',
          quantity: stockMovements.stockIn,
          unitCost: newItem.unitCost,
          totalValue: stockMovements.stockIn * newItem.unitCost,
          date: dateStr,
          purpose: stockMovements.purpose || 'Initial Stock-In / Opening Balance'
        };
        setInventoryTransactions(prev => [inTx, ...prev]);
        saveDocument('inventoryTransactions', inTx);
      }
      if (stockMovements.stockOut > 0) {
        const outTx: InventoryTransaction = {
          id: `tx-inv-${Date.now()}-out`,
          itemId,
          itemName: newItem.name,
          type: 'STOCK_OUT',
          quantity: stockMovements.stockOut,
          unitCost: newItem.unitCost,
          totalValue: stockMovements.stockOut * newItem.unitCost,
          date: dateStr,
          purpose: 'Initial Stock-Out / Opening Issue'
        };
        setInventoryTransactions(prev => [outTx, ...prev]);
        saveDocument('inventoryTransactions', outTx);
      }
    } else if (newItem.currentStock > 0) {
      // Fallback if stockMovements was not specified
      const initialTx: InventoryTransaction = {
        id: `tx-inv-${Date.now()}`,
        itemId,
        itemName: newItem.name,
        type: 'STOCK_IN',
        quantity: newItem.currentStock,
        unitCost: newItem.unitCost,
        totalValue: newItem.currentStock * newItem.unitCost,
        date: dateStr,
        purpose: 'Initial Stock / Opening Balance'
      };
      setInventoryTransactions(prev => [initialTx, ...prev]);
      saveDocument('inventoryTransactions', initialTx);
    }
  };

  const handleLogTransaction = (tx: Omit<InventoryTransaction, 'id' | 'date'>) => {
    const transactionId = `tx-inv-${Date.now()}`;
    const dateStr = new Date().toISOString().split('T')[0];

    const newTx: InventoryTransaction = {
      ...tx,
      id: transactionId,
      date: dateStr
    };

    // 1. Update stock reserves
    setInventory(prev => prev.map(item => {
      if (item.id === tx.itemId) {
        const isStockIn = tx.type === 'INWARDS' || (tx.type as string) === 'STOCK_IN';
        const stockDiff = isStockIn ? tx.quantity : -tx.quantity;
        const updatedItem = {
          ...item,
          currentStock: Math.max(0, item.currentStock + stockDiff),
          lastUpdated: dateStr
        };
        saveDocument('inventory', updatedItem);
        return updatedItem;
      }
      return item;
    }));

    // 2. Append transaction log
    setInventoryTransactions(prev => [...prev, newTx]);
    saveDocument('inventoryTransactions', newTx);
  };

  // B. Customer mutators
  const handleAddCustomer = (customer: Omit<Customer, 'id' | 'registrationDate'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      registrationDate: new Date().toISOString().split('T')[0]
    };
    setCustomers(prev => [...prev, newCustomer]);
    saveDocument('customers', newCustomer);
  };

  // C. Employee mutators
  const handleAddEmployee = (employee: Omit<Employee, 'id' | 'hireDate'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: `emp-${Date.now()}`,
      hireDate: new Date().toISOString().split('T')[0]
    };
    setEmployees(prev => [...prev, newEmployee]);
    saveDocument('employees', newEmployee);
  };

  const handleUpdateEmployeeStatus = (id: string, status: EmployeeStatus) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const updated = { ...emp, status };
        saveDocument('employees', updated);
        return updated;
      }
      return emp;
    }));
  };

  // D. Job mutators
  const handleCreateJob = (job: Omit<Job, 'id' | 'materialsUsed' | 'payments'>) => {
    const newJob: Job = {
      ...job,
      id: `job-${Date.now()}`,
      materialsUsed: [],
      payments: []
    };
    setJobs(prev => [...prev, newJob]);
    saveDocument('jobs', newJob);
  };

  const handleDeleteJob = (jobId: string) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    setJobs(prev => {
      const filtered = prev.filter(job => job.id !== jobId);
      localStorage.setItem('swedsfree_jobs', JSON.stringify(filtered));
      return filtered;
    });
    deleteDocument('jobs', jobId);
  };

  const handleUpdateJobStatus = (id: string, status: JobStatus) => {
    setJobs(prev => prev.map(job => {
      if (job.id === id) {
        const updated = { ...job, status };
        saveDocument('jobs', updated);
        return updated;
      }
      return job;
    }));
  };

  // Log Material usage specifically for a woodwork commission
  const handleLogJobMaterial = (jobId: string, jobMaterial: JobMaterial) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const txId = `tx-inv-job-${Date.now()}`;

    // 1. Subtract from core inventory reserves
    setInventory(prev => prev.map(item => {
      if (item.id === jobMaterial.itemId) {
        const updatedItem = {
          ...item,
          currentStock: Math.max(0, item.currentStock - jobMaterial.quantity),
          lastUpdated: dateStr
        };
        saveDocument('inventory', updatedItem);
        return updatedItem;
      }
      return item;
    }));

    // 2. Append a Stock-Out inventory transaction log
    const invTx: InventoryTransaction = {
      id: txId,
      itemId: jobMaterial.itemId,
      itemName: jobMaterial.name,
      type: 'STOCK_OUT',
      quantity: jobMaterial.quantity,
      unitCost: jobMaterial.unitCost,
      totalValue: jobMaterial.totalCost,
      date: dateStr,
      purpose: `Woodwork consumed in Job ID: ${jobId}`,
      referenceId: jobId
    };
    setInventoryTransactions(prev => [...prev, invTx]);
    saveDocument('inventoryTransactions', invTx);

    // 3. Append to Job material consumption list
    setJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const updatedJob = {
          ...job,
          materialsUsed: [...job.materialsUsed, jobMaterial]
        };
        saveDocument('jobs', updatedJob);
        return updatedJob;
      }
      return job;
    }));
  };

  // Record Payment received from customer on custom woodwork job
  const handleRecordJobPayment = (jobId: string, payment: Omit<JobPayment, 'id'>) => {
    const paymentId = `pay-${Date.now()}`;
    const dateStr = new Date().toISOString().split('T')[0];

    const newPayment: JobPayment = {
      ...payment,
      id: paymentId
    };

    const targetJob = jobs.find(j => j.id === jobId);

    // 1. Log payment inside job object
    setJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const updatedJob = {
          ...job,
          payments: [...job.payments, newPayment]
        };
        saveDocument('jobs', updatedJob);
        return updatedJob;
      }
      return job;
    }));

    // 2. Add as income receipt in financials list
    const financialId = `fin-inc-job-${Date.now()}`;
    const finTx: FinancialTransaction = {
      id: financialId,
      type: 'INCOME',
      category: 'Job Payment',
      amount: payment.amount,
      date: dateStr,
      description: `Customer payment cleared (${payment.method}) for Job ID: ${jobId}`,
      referenceId: jobId
    };
    setFinancialTransactions(prev => [...prev, finTx]);
    saveDocument('financialTransactions', finTx);

    // 3. Log to Payment Audit Trail
    if (targetJob) {
      const auditEntry: PaymentAuditLogEntry = {
        id: `audit-pay-${Date.now()}`,
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        customerName: targetJob.customerName,
        paymentId: paymentId,
        action: 'CREATED',
        amount: payment.amount,
        method: payment.method,
        date: payment.date || dateStr,
        note: payment.note || '',
        modifiedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Admin',
        timestamp: new Date().toISOString()
      };
      setPaymentAuditLogs(prev => {
        const updated = [auditEntry, ...prev];
        localStorage.setItem('swedsfree_payment_audit_logs', JSON.stringify(updated));
        return updated;
      });
      saveDocument('paymentAuditLogs', auditEntry);
    }
  };

  // E. Manual financial ledger mutators
  const handleAddFinancialTransaction = (transaction: Omit<FinancialTransaction, 'id'>) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    const newTx: FinancialTransaction = {
      ...transaction,
      id: `fin-manual-${Date.now()}`
    };
    setFinancialTransactions(prev => {
      const updated = [...prev, newTx];
      localStorage.setItem('swedsfree_fin_transactions', JSON.stringify(updated));
      return updated;
    });
    saveDocument('financialTransactions', newTx);
  };

  const handleUpdateFinancialTransaction = (updatedTx: FinancialTransaction) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    setFinancialTransactions(prev => {
      const updated = prev.map(t => t.id === updatedTx.id ? updatedTx : t);
      localStorage.setItem('swedsfree_fin_transactions', JSON.stringify(updated));
      return updated;
    });
    saveDocument('financialTransactions', updatedTx);
  };

  const handleDeleteFinancialTransaction = (id: string) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    setFinancialTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('swedsfree_fin_transactions', JSON.stringify(updated));
      return updated;
    });
    deleteDocument('financialTransactions', id);
  };

  // F. Daily work upload mutators
  const handleAddDailyWorkLog = (log: Omit<DailyWorkLog, 'id'>) => {
    const newLog: DailyWorkLog = {
      ...log,
      id: `log-${Date.now()}`
    };
    setDailyWorkLogs(prev => [newLog, ...prev]);
    saveDocument('dailyWorkLogs', newLog);
  };

  // Record Warning Letter
  const handleAddWarningLetter = (warning: Omit<WarningLetter, 'id'>) => {
    const newWarning: WarningLetter = {
      ...warning,
      id: `warn-${Date.now()}`
    };
    setWarningLetters(prev => [newWarning, ...prev]);
    saveDocument('warningLetters', newWarning);
  };

  // G. Official documents mutators
  const handleAddOfficialDocument = (newDocData: Omit<OfficialDocument, 'id'>) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    const newDoc: OfficialDocument = {
      ...newDocData,
      id: `doc-${Date.now()}`
    };
    setOfficialDocuments(prev => {
      const updated = [newDoc, ...prev];
      localStorage.setItem('swedsfree_official_documents', JSON.stringify(updated));
      return updated;
    });
    saveDocument('officialDocuments', newDoc);
  };

  const handleUpdateOfficialDocument = (updatedDoc: OfficialDocument) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    setOfficialDocuments(prev => {
      const updated = prev.map(d => d.id === updatedDoc.id ? updatedDoc : d);
      localStorage.setItem('swedsfree_official_documents', JSON.stringify(updated));
      return updated;
    });
    saveDocument('officialDocuments', updatedDoc);
  };

  const handleDeleteOfficialDocument = (id: string) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    setOfficialDocuments(prev => {
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem('swedsfree_official_documents', JSON.stringify(updated));
      return updated;
    });
    deleteDocument('officialDocuments', id);
  };

  // Record Updators
  const handleUpdateInventoryItem = (updatedItem: InventoryItem) => {
    setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    saveDocument('inventory', updatedItem);
  };

  const handleDeleteInventoryItem = (id: string) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    setInventory(prev => {
      const filtered = prev.filter(item => item.id !== id);
      localStorage.setItem('swedsfree_inventory', JSON.stringify(filtered));
      return filtered;
    });
    deleteDocument('inventory', id);
  };

  const handleDeleteInventoryTransaction = (id: string) => {
    setInventoryTransactions(prev => prev.filter(tx => tx.id !== id));
    deleteDocument('inventoryTransactions', id);
  };

  const handleDeleteDailyWorkLog = (id: string) => {
    setDailyWorkLogs(prev => prev.filter(log => log.id !== id));
    deleteDocument('dailyWorkLogs', id);
  };

  const handleDeleteWarningLetter = (id: string) => {
    setWarningLetters(prev => prev.filter(warn => warn.id !== id));
    deleteDocument('warningLetters', id);
  };

  const handleDeleteRegistrationRequest = (id: string) => {
    setRegistrationRequests(prev => prev.filter(req => req.id !== id));
    deleteDocument('registrationRequests', id);
  };

  const handleDeleteJobMaterial = (jobId: string, itemId: string) => {
    setJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const updated = {
          ...job,
          materialsUsed: job.materialsUsed.filter(mat => mat.itemId !== itemId)
        };
        saveDocument('jobs', updated);
        return updated;
      }
      return job;
    }));
  };

  const handleUpdateJobPayment = (jobId: string, updatedPayment: JobPayment) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    const targetJob = jobs.find(j => j.id === jobId);
    const oldPayment = targetJob?.payments.find(p => p.id === updatedPayment.id);

    setJobs(prev => {
      const updatedJobs = prev.map(job => {
        if (job.id === jobId) {
          const updatedPayments = job.payments.map(pay => pay.id === updatedPayment.id ? updatedPayment : pay);
          const updated = {
            ...job,
            payments: updatedPayments
          };
          saveDocument('jobs', updated);
          return updated;
        }
        return job;
      });
      localStorage.setItem('swedsfree_jobs', JSON.stringify(updatedJobs));
      return updatedJobs;
    });

    // Log to Payment Audit Trail
    if (targetJob && oldPayment) {
      const auditEntry: PaymentAuditLogEntry = {
        id: `audit-pay-${Date.now()}`,
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        customerName: targetJob.customerName,
        paymentId: updatedPayment.id,
        action: 'UPDATED',
        amount: updatedPayment.amount,
        previousAmount: oldPayment.amount,
        method: updatedPayment.method,
        previousMethod: oldPayment.method,
        date: updatedPayment.date,
        previousDate: oldPayment.date,
        note: updatedPayment.note || '',
        previousNote: oldPayment.note || '',
        modifiedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Admin',
        timestamp: new Date().toISOString()
      };
      setPaymentAuditLogs(prev => {
        const updated = [auditEntry, ...prev];
        localStorage.setItem('swedsfree_payment_audit_logs', JSON.stringify(updated));
        return updated;
      });
      saveDocument('paymentAuditLogs', auditEntry);
    }
  };

  const handleDeleteJobPayment = (jobId: string, paymentId: string) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    const targetJob = jobs.find(j => j.id === jobId);
    const oldPayment = targetJob?.payments.find(p => p.id === paymentId);

    setJobs(prev => {
      const updatedJobs = prev.map(job => {
        if (job.id === jobId) {
          const updated = {
            ...job,
            payments: job.payments.filter(pay => pay.id !== paymentId)
          };
          saveDocument('jobs', updated);
          return updated;
        }
        return job;
      });
      localStorage.setItem('swedsfree_jobs', JSON.stringify(updatedJobs));
      return updatedJobs;
    });

    // Log to Payment Audit Trail
    if (targetJob && oldPayment) {
      const auditEntry: PaymentAuditLogEntry = {
        id: `audit-pay-${Date.now()}`,
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        customerName: targetJob.customerName,
        paymentId: paymentId,
        action: 'DELETED',
        amount: oldPayment.amount,
        method: oldPayment.method,
        date: oldPayment.date,
        note: oldPayment.note || '',
        modifiedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Admin',
        timestamp: new Date().toISOString()
      };
      setPaymentAuditLogs(prev => {
        const updated = [auditEntry, ...prev];
        localStorage.setItem('swedsfree_payment_audit_logs', JSON.stringify(updated));
        return updated;
      });
      saveDocument('paymentAuditLogs', auditEntry);
    }
  };

  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    saveDocument('customers', updatedCustomer);
    setJobs(prev => prev.map(j => {
      if (j.customerId === updatedCustomer.id) {
        const updatedJ = { ...j, customerName: updatedCustomer.name };
        saveDocument('jobs', updatedJ);
        return updatedJ;
      }
      return j;
    }));
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    saveDocument('employees', updatedEmployee);
  };

  const handleUpdateJob = (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    saveDocument('jobs', updatedJob);
  };

  const handleDeleteCustomer = (id: string) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    setCustomers(prev => {
      const filtered = prev.filter(c => c.id !== id);
      localStorage.setItem('swedsfree_customers', JSON.stringify(filtered));
      return filtered;
    });
    deleteDocument('customers', id);
  };

  const handleDeleteEmployee = (id: string) => {
    localStorage.setItem('swedsfree_seed_disabled', 'true');
    setEmployees(prev => {
      const filtered = prev.filter(emp => emp.id !== id);
      localStorage.setItem('swedsfree_employees', JSON.stringify(filtered));
      return filtered;
    });
    deleteDocument('employees', id);
  };

  // G. Registration request and approval handlers
  const handleRegisterRequest = (req: { name: string; email: string; phone: string; role: EmployeeRole; password?: string }) => {
    const newRequest: RegistrationRequest = {
      id: `req-${Date.now()}`,
      name: req.name,
      email: req.email,
      phone: req.phone,
      role: req.role,
      password: req.password,
      status: 'Pending',
      requestDate: new Date().toISOString().split('T')[0]
    };
    setRegistrationRequests(prev => [newRequest, ...prev]);
    saveDocument('registrationRequests', newRequest);
  };

  const handleApproveRequest = (requestId: string) => {
    const req = registrationRequests.find(r => r.id === requestId);
    if (!req) return;

    if (employees.some(emp => emp.email.toLowerCase() === req.email.toLowerCase())) {
      alert(`An artisan with email ${req.email} is already registered.`);
      return;
    }

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name: req.name,
      role: req.role,
      phone: req.phone,
      email: req.email,
      status: 'Active',
      hireDate: new Date().toISOString().split('T')[0],
      password: req.password || '1234'
    };

    setEmployees(prev => [newEmp, ...prev]);
    saveDocument('employees', newEmp);
    const updatedReq: RegistrationRequest = { ...req, status: 'Approved' };
    setRegistrationRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
    saveDocument('registrationRequests', updatedReq);
  };

  const handleRejectRequest = (requestId: string) => {
    const req = registrationRequests.find(r => r.id === requestId);
    if (req) {
      const updatedReq: RegistrationRequest = { ...req, status: 'Rejected' };
      setRegistrationRequests(prev => prev.map(r => r.id === requestId ? updatedReq : r));
      saveDocument('registrationRequests', updatedReq);
    }
  };

  // Handle auto shortcuts redirection
  const handleOpenQuickAction = (action: string) => {
    if (action === 'register-customer') {
      setActiveTab('customers');
      setQuickActionTrigger('register-customer');
    } else if (action === 'register-employee') {
      setActiveTab('employees');
      setQuickActionTrigger('register-employee');
    } else if (action === 'log-inwards') {
      setActiveTab('inventory');
      setQuickActionTrigger('log-inwards');
    } else if (action === 'create-job') {
      setActiveTab('jobs');
      setQuickActionTrigger('create-job');
    }
  };

  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';
  const isAuditor = currentUser?.role === 'Auditor';
  const isEmployee = !isAdmin && !isManager && !isAuditor;

  const showManagementTabs = isAdmin || isManager || isAuditor;

  // Navigation menu tabs metadata
  const navTabs = [
    { id: 'dashboard', label: 'Workshop Hub', icon: LayoutDashboard },
    { 
      id: 'documents', 
      label: 'Official Documents', 
      icon: FileCheck, 
      badge: officialDocuments.length > 0 ? `${officialDocuments.length}` : 'Upload' 
    },
    ...(showManagementTabs ? [
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'customers', label: 'Clients/Customers', icon: UserCheck },
      { id: 'employees', label: 'Employees', icon: Users },
      { id: 'invoices', label: 'Invoices & Receipts', icon: Receipt },
    ] : []),
    { id: 'proforma', label: 'PROFORMA INVOICE', icon: FileSpreadsheet, badge: 'Quote' },
    { id: 'jobs', label: 'Job lists', icon: Wrench },
    { id: 'daily-work', label: 'Daily Logs', icon: Camera },
    ...(showManagementTabs ? [
      { id: 'finance', label: 'Financial Ledger', icon: DollarSign },
      { id: 'reports', label: 'Audit Reports', icon: FileBarChart },
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'manual', label: 'User Manual (PDF)', icon: BookOpen },
  ];

  if (!currentUser) {
    return (
      <LoginScreen 
        employees={employees} 
        onLogin={(user) => {
          setCurrentUser(user);
          setInactivityNotice(null);
          lastActivityRef.current = Date.now();
          setActiveTab('dashboard');
        }} 
        onRegisterRequest={handleRegisterRequest}
        inactivityNotice={inactivityNotice}
        onClearInactivityNotice={() => setInactivityNotice(null)}
        onStartNewSession={() => handleStartNewSession('Fresh session initialized. Please authenticate to continue.')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row antialiased font-sans relative overflow-x-hidden print:bg-white print:text-black print:!overflow-visible print:!min-h-0 print:!h-auto print:!static print:!block">
      
      {/* 1-Minute Inactivity Security Warning Dialog */}
      {showInactivityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border-2 border-amber-500 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 bg-amber-100 border border-amber-300 rounded-2xl flex items-center justify-center mx-auto text-amber-600 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Inactivity Warning</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You have been inactive. For workshop data safety and audit log protection, your session will automatically log out in:
              </p>
              <div className="text-3xl font-black text-amber-600 font-mono py-1">
                {inactivityRemainingSeconds}s
              </div>
              <p className="text-[11px] text-slate-500">
                Click "Keep Working" or interact with the screen to stay logged in.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  lastActivityRef.current = Date.now();
                  setShowInactivityWarning(false);
                }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
              >
                Keep Working
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStartNewSession('Previous session ended. A fresh session has been started.');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start New Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none print:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-400/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/15 rounded-full blur-[120px]"></div>
      </div>

      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden bg-white/90 backdrop-blur-md text-slate-900 p-2.5 flex items-center justify-between border-b border-slate-200 sticky top-0 z-40 print:hidden relative z-10 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleGoBack}
            disabled={!canGoBack}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-black transition cursor-pointer ${
              canGoBack
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-400 active:scale-95 shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 opacity-40 cursor-not-allowed'
            }`}
            title={canGoBack ? `Go back to ${previousTabLabel || 'previous page'}` : 'On home / first page'}
            id="btn-mobile-go-back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span className="text-[11px] font-extrabold">Back</span>
          </button>
          <img src="/logo.svg" alt="Swedswood Enterprise Logo" className="w-6 h-6 object-contain" />
          <span className="font-display font-black text-xs uppercase tracking-wider text-amber-600 truncate">SWEDSWOOD</span>
        </div>
        
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Left-Hand Sidebar Panel */}
      <aside className={`w-64 bg-white text-slate-800 shrink-0 flex flex-col justify-between p-5 border-r border-slate-200 sticky top-0 h-screen z-40 transition-transform shadow-xs overflow-y-auto ${mobileMenuOpen ? 'translate-x-0 fixed inset-y-0 left-0 w-72' : 'max-md:-translate-x-full max-md:hidden'} print:hidden relative z-10`}>
        <div className="space-y-5">
          
          {/* Logo / Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 px-1">
              <div className="p-1.5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-600 shadow-xs">
                <img src="/logo.svg" alt="Swedswood Enterprise Logo" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h2 className="font-display font-black text-sm uppercase tracking-wider text-amber-600">SWEDSWOOD<span className="text-slate-900 ml-1">ENTERPRISE</span></h2>
                <p className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase">Invoice & Workshop System</p>
              </div>
            </div>

            {/* Mobile close menu */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-500 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Button for Uploading Official Documents (JPEG, PDF, PNG) */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Documents &amp; Vault</span>
              </span>
              <span className="text-[9px] font-mono font-bold bg-amber-200/80 text-amber-950 px-1.5 py-0.5 rounded">
                JPEG • PDF • PNG
              </span>
            </div>
            <button
              onClick={() => {
                setActiveTab('documents');
                setQuickActionTrigger('upload-doc');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              id="sidebar-upload-official-doc-btn"
              title="Upload official document scan (JPEG, PDF, PNG)"
            >
              <UploadCloud className="w-4 h-4" />
              <span>+ Upload Official Doc</span>
            </button>
          </div>

          {/* Nav Items List */}
          <nav className="space-y-1">
            {navTabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              const isProforma = tab.id === 'proforma';
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'manual') {
                      setIsManualModalOpen(true);
                      setMobileMenuOpen(false);
                      return;
                    }
                    if (tab.id === 'proforma') {
                      setInvoiceInitialSubTab('PROFORMA');
                    }
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                    setQuickActionTrigger(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tab.id === 'manual'
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30'
                      : isProforma
                        ? isActive
                          ? 'bg-amber-300 text-amber-950 border border-amber-500 shadow-xs font-black'
                          : 'bg-amber-50 hover:bg-amber-100/90 text-amber-950 border border-amber-300/90'
                        : isActive 
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-700 shadow-xs' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TabIcon className={`w-4 h-4 shrink-0 ${
                      tab.id === 'manual' 
                        ? 'text-amber-600' 
                        : isProforma
                          ? 'text-amber-900'
                          : isActive ? 'text-amber-600' : 'text-slate-500'
                    }`} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider shrink-0 ${
                      isProforma && isActive
                        ? 'bg-amber-950 text-amber-200'
                        : 'bg-amber-200 text-amber-950 border border-amber-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar - User Profile Card & Database Section */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          
          {/* User Profile Card */}
          {currentUser && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-center font-black text-amber-600">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">{currentUser.role}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                <span className="flex items-center gap-1 font-semibold text-slate-600">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Auto-Lock:
                </span>
                <span className="font-bold text-amber-700 font-mono text-[9px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  1 min inactive
                </span>
              </div>
              <button 
                onClick={() => {
                  handleStartNewSession('You have signed out of the workshop portal. A fresh new session is ready.');
                }}
                className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-[10px] font-black text-red-700 transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                id="btn-logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out & Start New Session</span>
              </button>
            </div>
          )}

          {(isAdmin || isManager || isAuditor) && (
            <div className="space-y-3 pt-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Database className="w-3.5 h-3.5 text-amber-600" />
                    <span>Offline Database</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    isOnline 
                      ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                  }`}>
                    {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className="leading-relaxed">All woodwork logs are secured in sandboxed cache. Backup & Restore are available in Settings.</p>
                
                {/* Link to Settings area for backup & restore */}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Settings className="w-3 h-3 text-amber-600" />
                    <span>Backup & Settings</span>
                  </button>
                </div>
              </div>

              <button 
                onClick={() => handleClearAllSystemDataForGoLive(false)}
                className="w-full text-center text-[11px] font-bold text-red-300 hover:text-white py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded-lg transition"
                id="btn-purge-database"
              >
                Clear System Data (Fresh Start)
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel Frame */}
      <main key={sessionKey} className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1300px] mx-auto w-full relative z-10 print:!p-0 print:!m-0 print:!max-w-none print:!w-full print:!overflow-visible print:!static print:!block print:!h-auto print:!min-h-0">
        
        {/* Offline & Online Auto-Sync Status Top Banner */}
        {syncBannerMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-lg print:hidden ${
              isOnline 
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-950/90 text-amber-300 border-amber-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-400 shrink-0" /> : <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />}
              <span>{syncBannerMessage}</span>
            </div>
            <button 
              onClick={() => setSyncBannerMessage(null)}
              className="text-white/60 hover:text-white px-1"
            >
              ×
            </button>
          </motion.div>
        )}

        <div className="mb-6 bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-lg print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Universal Go Back Button for All Users */}
            <button
              onClick={handleGoBack}
              disabled={!canGoBack}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md border ${
                canGoBack
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 border-amber-300 active:scale-95 shadow-amber-950/20'
                  : 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-50'
              }`}
              title={canGoBack ? `Go back to previous page: ${previousTabLabel}` : 'On home / first page'}
              id="btn-system-go-back"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Go Back</span>
              {canGoBack && previousTabLabel && (
                <span className="hidden sm:inline-block font-sans text-[10px] font-bold bg-slate-950/20 px-1.5 py-0.5 rounded text-slate-950">
                  to {previousTabLabel}
                </span>
              )}
            </button>

            <div className={`p-2 rounded-xl border ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 animate-pulse" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">
                  {isOnline ? 'System Online & Auto-Synced' : 'Offline Mode Active'}
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase ${
                  isOnline 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isOnline ? `Online DB Synced (${lastSyncTime})` : 'Offline (Saved Locally)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isOnline 
                  ? 'Changes automatically sync to the online database when connected to internet.'
                  : 'Working offline: All data is saved safely in local storage and will update the online database automatically when internet returns.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTriggerProforma()}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs border border-amber-500/50"
              title="Open PROFORMA INVOICE desk & quotation generator"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-950" />
              <span>PROFORMA INVOICE</span>
            </button>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="View and download complete User Operating Manual (PDF)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>User Manual (PDF)</span>
            </button>
            {isOnline && (
              <button
                onClick={performAutoOnlineSync}
                disabled={syncStatus === 'syncing'}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Sync offline records to online database"
              >
                <Wifi className={`w-3.5 h-3.5 text-emerald-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{syncStatus === 'syncing' ? 'Syncing DB...' : 'Sync Online DB'}</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('settings')}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Manage system settings and data backup/restore"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Settings & Backup</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeTab === 'dashboard' && (
              <DashboardOverview
                inventory={inventory}
                jobs={jobs}
                customers={customers}
                employees={employees}
                financialTransactions={financialTransactions}
                setActiveTab={setActiveTab}
                onOpenQuickAction={handleOpenQuickAction}
                currentUser={currentUser}
                registrationRequests={registrationRequests}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onTriggerProforma={handleTriggerProforma}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryManager
                inventory={inventory}
                transactions={inventoryTransactions}
                onAddInventoryItem={handleAddInventoryItem}
                onLogTransaction={handleLogTransaction}
                onUpdateInventoryItem={handleUpdateInventoryItem}
                onDeleteInventoryItem={handleDeleteInventoryItem}
                onDeleteTransaction={handleDeleteInventoryTransaction}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerManager
                customers={customers}
                jobs={jobs}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onRecordPayment={handleRecordJobPayment}
                onUpdateJobPayment={handleUpdateJobPayment}
                onDeleteJobPayment={handleDeleteJobPayment}
                onAddJob={handleCreateJob}
                onUpdateJob={handleUpdateJob}
                showRegisterModalOnLoad={quickActionTrigger === 'register-customer'}
                onCloseRegisterModal={() => setQuickActionTrigger(null)}
                currentUser={currentUser}
                onTriggerProforma={handleTriggerProforma}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeManager
                employees={employees}
                jobs={jobs}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onUpdateEmployeeStatus={handleUpdateEmployeeStatus}
                showRegisterModalOnLoad={quickActionTrigger === 'register-employee'}
                onCloseRegisterModal={() => setQuickActionTrigger(null)}
                currentUser={currentUser}
                registrationRequests={registrationRequests}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onDeleteRegistrationRequest={handleDeleteRegistrationRequest}
                warningLetters={warningLetters}
                onAddWarningLetter={handleAddWarningLetter}
                onDeleteWarningLetter={handleDeleteWarningLetter}
              />
            )}

            {activeTab === 'jobs' && (
              <JobManager
                jobs={jobs}
                customers={customers}
                employees={employees}
                inventory={inventory}
                onCreateJob={handleCreateJob}
                onUpdateJob={handleUpdateJob}
                onDeleteJob={handleDeleteJob}
                onDeleteJobMaterial={handleDeleteJobMaterial}
                onUpdateJobPayment={handleUpdateJobPayment}
                onDeleteJobPayment={handleDeleteJobPayment}
                onUpdateJobStatus={handleUpdateJobStatus}
                onLogJobMaterial={handleLogJobMaterial}
                onRecordJobPayment={handleRecordJobPayment}
                showCreateModalOnLoad={quickActionTrigger === 'create-job'}
                onCloseCreateModal={() => setQuickActionTrigger(null)}
                currentUser={currentUser}
                onTriggerInvoice={handleTriggerInvoice}
                onTriggerProforma={(jobId) => handleTriggerProforma(undefined, jobId)}
                onTriggerReceipt={handleTriggerReceipt}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoiceReceiptManager
                jobs={jobs}
                customers={customers}
                currentUser={currentUser}
                invoiceJobId={invoiceJobId}
                initialSubTab={invoiceInitialSubTab}
                proformaCustomerId={proformaCustomerId}
                proformaJobId={proformaJobId}
                onClearInvoiceJobId={() => {
                  setInvoiceJobId(null);
                  setProformaJobId(null);
                }}
                onClearProformaParams={() => {
                  setProformaCustomerId(null);
                  setProformaJobId(null);
                }}
                onUpdateJob={handleUpdateJob}
                onCreateJob={handleCreateJob}
                onUpdateJobPayment={handleUpdateJobPayment}
                onDeleteJobPayment={handleDeleteJobPayment}
                paymentAuditLogs={paymentAuditLogs}
                onGoBack={handleGoBack}
              />
            )}

            {activeTab === 'proforma' && (
              <div className="space-y-6">
                <ProformaInvoiceDesk
                  customers={customers}
                  jobs={jobs}
                  currentUser={currentUser}
                  initialCustomerId={proformaCustomerId}
                  initialJobId={proformaJobId || invoiceJobId}
                  onClearInitialParams={() => {
                    setProformaCustomerId(null);
                    setProformaJobId(null);
                  }}
                  onSaveInvoiceRecord={(savedRecord) => {
                    try {
                      const rawInvs = localStorage.getItem('swedswood_saved_invoices');
                      const currentInvs = rawInvs ? JSON.parse(rawInvs) : [];
                      const updated = [savedRecord, ...currentInvs.filter((inv: any) => inv.id !== savedRecord.id)];
                      localStorage.setItem('swedswood_saved_invoices', JSON.stringify(updated));
                      saveDocument('savedInvoices', savedRecord).catch(() => {});
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  onDeleteInvoiceRecord={(deletedId) => {
                    try {
                      const rawInvs = localStorage.getItem('swedswood_saved_invoices');
                      if (rawInvs) {
                        const currentInvs = JSON.parse(rawInvs);
                        const updated = currentInvs.filter((inv: any) => inv.id !== deletedId);
                        localStorage.setItem('swedswood_saved_invoices', JSON.stringify(updated));
                      }
                      deleteDocument('savedInvoices', deletedId).catch(() => {});
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  onCreateJob={(newJobData) => {
                    handleCreateJob(newJobData);
                    setActiveTab('jobs');
                  }}
                  onSwitchToSavedInvoices={() => {
                    setInvoiceInitialSubTab('SAVED_INVOICES');
                    setActiveTab('invoices');
                  }}
                  onGoBack={handleGoBack}
                />
              </div>
            )}

            {activeTab === 'daily-work' && (
              <DailyWorkManager
                employees={employees}
                jobs={jobs}
                workLogs={dailyWorkLogs}
                onAddWorkLog={handleAddDailyWorkLog}
                onDeleteWorkLog={handleDeleteDailyWorkLog}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'finance' && (
              <FinancialLedger
                transactions={financialTransactions}
                onAddTransaction={handleAddFinancialTransaction}
                onUpdateTransaction={handleUpdateFinancialTransaction}
                onDeleteTransaction={handleDeleteFinancialTransaction}
                currentUser={currentUser}
                onTriggerReceipt={handleTriggerReceipt}
              />
            )}

            {activeTab === 'reports' && (
              <ReportGenerator
                employees={employees}
                customers={customers}
                jobs={jobs}
                inventory={inventory}
                inventoryTransactions={inventoryTransactions}
                financialTransactions={financialTransactions}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'documents' && (
              <OfficialDocumentsManager
                documents={officialDocuments}
                customers={customers}
                jobs={jobs}
                currentUser={currentUser}
                initialOpenUploadModal={quickActionTrigger === 'upload-doc'}
                onAddDocument={handleAddOfficialDocument}
                onUpdateDocument={handleUpdateOfficialDocument}
                onDeleteDocument={handleDeleteOfficialDocument}
                onGoBack={handleGoBack}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsManager
                currentUser={currentUser}
                isOnline={isOnline}
                lastSyncTime={lastSyncTime}
                syncStatus={syncStatus}
                onPerformSync={performAutoOnlineSync}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onRestoreAllDataTillToday={handleRestoreAllDataTillToday}
                fileInputRef={fileInputRef}
                onClearData={handleClearAllSystemDataForGoLive}
                onOpenManual={() => setIsManualModalOpen(true)}
                recordCounts={{
                  inventory: inventory.length,
                  customers: customers.length,
                  employees: employees.length,
                  jobs: jobs.length,
                  financials: financialTransactions.length,
                  dailyLogs: dailyWorkLogs.length,
                  officialDocuments: officialDocuments.length,
                  savedInvoices: (() => {
                    try {
                      const raw = localStorage.getItem('swedswood_saved_invoices');
                      return raw ? JSON.parse(raw).length : 0;
                    } catch { return 0; }
                  })()
                }}
              />
            )}

            {activeTab === 'manual' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                      <BookOpen className="w-7 h-7 text-amber-600" />
                      <span>Official System Operating Manual</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Comprehensive 15-chapter operating manual covering architecture, offline dual-storage, woodwork commissions, invoicing, and financial management.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setIsManualModalOpen(true)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Open Interactive Reader</span>
                    </button>
                    <button
                      onClick={() => downloadUserManualPdf()}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Download PDF (15 Pages)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div 
                    onClick={() => setIsManualModalOpen(true)}
                    className="p-4 rounded-2xl bg-amber-50 border border-amber-200 hover:border-amber-400 transition cursor-pointer"
                  >
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs">1</span>
                      System Architecture
                    </h3>
                    <p className="text-xs text-slate-600 mt-2">
                      Dual-storage reliability with automatic Firestore synchronization and zero-loss offline caching.
                    </p>
                  </div>
                  <div 
                    onClick={() => setIsManualModalOpen(true)}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition cursor-pointer"
                  >
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs">2</span>
                      Workshop & Invoicing
                    </h3>
                    <p className="text-xs text-slate-600 mt-2">
                      Complete guides for inventory depletion, multi-stage job quotes, branded invoices, and receipts.
                    </p>
                  </div>
                  <div 
                    onClick={() => setIsManualModalOpen(true)}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition cursor-pointer"
                  >
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs">3</span>
                      Backup & Audit Trails
                    </h3>
                    <p className="text-xs text-slate-600 mt-2">
                      Financial reconciliation, tamper-evident payment audit logs, and complete disaster recovery.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Official System User Operating Manual Modal */}
      {isManualModalOpen && (
        <UserManualModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
        />
      )}

    </div>
  );
}
