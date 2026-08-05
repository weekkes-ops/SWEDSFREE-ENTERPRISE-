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
  Settings
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
import DailyWorkManager from './components/DailyWorkManager';
import InvoiceReceiptManager from './components/InvoiceReceiptManager';
import SettingsManager from './components/SettingsManager';
import LoginScreen from './components/LoginScreen';
import { LogOut } from 'lucide-react';

// Seed data & types
import { 
  subscribeToCollection, 
  saveDocument, 
  deleteDocument, 
  saveBatchDocuments, 
  deleteBatchDocuments, 
  clearEntireCollection,
  fetchCollectionFromFirestore 
} from './lib/firestoreService';
import { 
  INITIAL_INVENTORY, 
  INITIAL_CUSTOMERS, 
  INITIAL_EMPLOYEES, 
  INITIAL_JOBS, 
  INITIAL_INVENTORY_TRANSACTIONS, 
  INITIAL_FINANCIALS,
  INITIAL_DAILY_WORK_LOGS,
  INITIAL_REGISTRATION_REQUESTS,
  INITIAL_WARNING_LETTERS,
  INITIAL_SAVED_INVOICES
} from './data';

const LIVE_ADMIN_EMPLOYEE: Employee = {
  id: 'emp-01',
  name: 'Mr Paul Bindi',
  role: 'Admin',
  phone: '+232 76 111 2222',
  email: 'paul.bindi@swedsfree.com',
  status: 'Active',
  baseSalary: 9500,
  dailyRate: 350,
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
  SavedInvoice
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [quickActionTrigger, setQuickActionTrigger] = useState<string | null>(null);
  const [invoiceJobId, setInvoiceJobId] = useState<string | null>(null);
  const [invoiceInitialSubTab, setInvoiceInitialSubTab] = useState<'INVOICE' | 'SAVED_INVOICES' | 'RECEIPT'>('INVOICE');

  const handleTriggerInvoice = (jobId: string) => {
    setInvoiceJobId(jobId);
    setInvoiceInitialSubTab('INVOICE');
    setActiveTab('invoices');
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
      savedInvoices
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

  // Helper to load stored data from local cache with fallback
  const getStoredData = <T,>(key: string, fallback: T[] = []): T[] => {
    try {
      const seedDisabled = localStorage.getItem('swedsfree_seed_disabled') === 'true';
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          if (seedDisabled) return parsed;
          if (parsed.length > 0) return parsed;
        }
      }
      if (seedDisabled) {
        if (key === 'swedsfree_employees') return [LIVE_ADMIN_EMPLOYEE] as unknown as T[];
        return [];
      }
    } catch (e) {
      console.error(`Error loading stored data for ${key}:`, e);
    }
    return fallback;
  };

  // Core workshop state modules

  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    try {
      const localUser = localStorage.getItem('swedsfree_current_user');
      return localUser ? JSON.parse(localUser) : null;
    } catch {
      return null;
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

    localStorage.setItem('swedsfree_inventory', JSON.stringify([]));
    localStorage.setItem('swedsfree_customers', JSON.stringify([]));
    localStorage.setItem('swedsfree_employees', JSON.stringify([LIVE_ADMIN_EMPLOYEE]));
    localStorage.setItem('swedsfree_jobs', JSON.stringify([]));
    localStorage.setItem('swedsfree_inv_transactions', JSON.stringify([]));
    localStorage.setItem('swedsfree_fin_transactions', JSON.stringify([]));
    localStorage.setItem('swedsfree_daily_work_logs', JSON.stringify([]));
    localStorage.setItem('swedsfree_registration_requests', JSON.stringify([]));
    localStorage.setItem('swedsfree_warning_letters', JSON.stringify([]));
    localStorage.setItem('swedswood_saved_invoices', JSON.stringify([]));

    setActiveTab('dashboard');

    if (!silent) {
      alert('SUCCESS: All system data has been completely cleared from Firestore database and local storage. The system is now 100% clean and ready for live production use!');
    }
  };

  // Restore all records dated up to today (August 5, 2026) from Firestore
  const handleRestoreAllDataTillToday = async () => {
    try {
      setSyncStatus('syncing');
      localStorage.removeItem('swedsfree_seed_disabled');

      // Save complete initial records dated up to today to Firestore
      await saveBatchDocuments('inventory', INITIAL_INVENTORY);
      await saveBatchDocuments('customers', INITIAL_CUSTOMERS);
      await saveBatchDocuments('employees', INITIAL_EMPLOYEES);
      await saveBatchDocuments('jobs', INITIAL_JOBS);
      await saveBatchDocuments('inventoryTransactions', INITIAL_INVENTORY_TRANSACTIONS);
      await saveBatchDocuments('financialTransactions', INITIAL_FINANCIALS);
      await saveBatchDocuments('dailyWorkLogs', INITIAL_DAILY_WORK_LOGS);
      await saveBatchDocuments('registrationRequests', INITIAL_REGISTRATION_REQUESTS);
      await saveBatchDocuments('warningLetters', INITIAL_WARNING_LETTERS);
      await saveBatchDocuments('savedInvoices', INITIAL_SAVED_INVOICES);

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

      const finalInv = inv.length > 0 ? inv : INITIAL_INVENTORY;
      const finalCust = cust.length > 0 ? cust : INITIAL_CUSTOMERS;
      const finalEmp = emp.length > 0 ? emp : INITIAL_EMPLOYEES;
      const finalJobs = jbs.length > 0 ? jbs : INITIAL_JOBS;
      const finalInvTx = invTx.length > 0 ? invTx : INITIAL_INVENTORY_TRANSACTIONS;
      const finalFinTx = finTx.length > 0 ? finTx : INITIAL_FINANCIALS;
      const finalWLogs = wLogs.length > 0 ? wLogs : INITIAL_DAILY_WORK_LOGS;
      const finalReqs = reqs.length > 0 ? reqs : INITIAL_REGISTRATION_REQUESTS;
      const finalWarns = warns.length > 0 ? warns : INITIAL_WARNING_LETTERS;
      const finalInvs = invs.length > 0 ? invs : INITIAL_SAVED_INVOICES;

      setInventory(finalInv);
      setCustomers(finalCust);
      setEmployees(finalEmp);
      setJobs(finalJobs);
      setInventoryTransactions(finalInvTx);
      setFinancialTransactions(finalFinTx);
      setDailyWorkLogs(finalWLogs);
      setRegistrationRequests(finalReqs);
      setWarningLetters(finalWarns);

      localStorage.setItem('swedsfree_inventory', JSON.stringify(finalInv));
      localStorage.setItem('swedsfree_customers', JSON.stringify(finalCust));
      localStorage.setItem('swedsfree_employees', JSON.stringify(finalEmp));
      localStorage.setItem('swedsfree_jobs', JSON.stringify(finalJobs));
      localStorage.setItem('swedsfree_inv_transactions', JSON.stringify(finalInvTx));
      localStorage.setItem('swedsfree_fin_transactions', JSON.stringify(finalFinTx));
      localStorage.setItem('swedsfree_daily_work_logs', JSON.stringify(finalWLogs));
      localStorage.setItem('swedsfree_registration_requests', JSON.stringify(finalReqs));
      localStorage.setItem('swedsfree_warning_letters', JSON.stringify(finalWarns));
      localStorage.setItem('swedswood_saved_invoices', JSON.stringify(finalInvs));

      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncStatus('synced');

      alert("SUCCESS: All system data up to today's date (August 5, 2026) has been completely restored from Cloud Firestore!");
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
      localKey: string,
      initialFallback: T[] = []
    ) => {
      const unsub = subscribeToCollection<T>(collectionName, (items) => {
        const seedDisabled = localStorage.getItem('swedsfree_seed_disabled') === 'true';

        if (!seedDisabled) {
          if (!items || items.length === 0) {
            if (initialFallback && initialFallback.length > 0) {
              saveBatchDocuments(collectionName, initialFallback);
              setter(initialFallback);
              localStorage.setItem(localKey, JSON.stringify(initialFallback));
              return;
            }
          }

          if (initialFallback && initialFallback.length > 0) {
            const existingIds = new Set((items || []).map(i => i.id));
            const missingItems = initialFallback.filter(fb => !existingIds.has(fb.id));
            if (missingItems.length > 0) {
              saveBatchDocuments(collectionName, missingItems);
              const combined = [...(items || []), ...missingItems];
              setter(combined);
              localStorage.setItem(localKey, JSON.stringify(combined));
              return;
            }
          }
        }

        let finalItems = items || [];
        if (seedDisabled && collectionName === 'employees' && finalItems.length === 0) {
          finalItems = [LIVE_ADMIN_EMPLOYEE] as unknown as T[];
        }

        setter(finalItems);
        localStorage.setItem(localKey, JSON.stringify(finalItems));
      });
      unsubs.push(unsub);
    };

    syncCollection('inventory', setInventory, 'swedsfree_inventory', INITIAL_INVENTORY);
    syncCollection('customers', setCustomers, 'swedsfree_customers', INITIAL_CUSTOMERS);
    syncCollection('employees', setEmployees, 'swedsfree_employees', INITIAL_EMPLOYEES);
    syncCollection('jobs', setJobs, 'swedsfree_jobs', INITIAL_JOBS);
    syncCollection('inventoryTransactions', setInventoryTransactions, 'swedsfree_inv_transactions', INITIAL_INVENTORY_TRANSACTIONS);
    syncCollection('financialTransactions', setFinancialTransactions, 'swedsfree_fin_transactions', INITIAL_FINANCIALS);
    syncCollection('dailyWorkLogs', setDailyWorkLogs, 'swedsfree_daily_work_logs', INITIAL_DAILY_WORK_LOGS);
    syncCollection('registrationRequests', setRegistrationRequests, 'swedsfree_registration_requests', INITIAL_REGISTRATION_REQUESTS);
    syncCollection('warningLetters', setWarningLetters, 'swedsfree_warning_letters', INITIAL_WARNING_LETTERS);

    // Mark initialization complete without clearing data automatically
    if (localStorage.getItem('swedsfree_initial_purge_done') !== 'true') {
      localStorage.setItem('swedsfree_initial_purge_done', 'true');
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
  const handleAddInventoryItem = (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const itemId = `inv-${Date.now()}`;
    const dateStr = new Date().toISOString().split('T')[0];
    const newItem: InventoryItem = {
      ...item,
      id: itemId,
      lastUpdated: dateStr
    };
    setInventory(prev => [newItem, ...prev]);
    saveDocument('inventory', newItem);

    // Log inwards transaction & financial expenditure if initial stock > 0
    if (item.currentStock > 0) {
      const txId = `tx-inv-init-${Date.now()}`;
      const totalValue = item.currentStock * item.unitCost;
      const initTx: InventoryTransaction = {
        id: txId,
        itemId: itemId,
        itemName: item.name,
        type: 'INWARDS',
        quantity: item.currentStock,
        unitCost: item.unitCost,
        totalValue: totalValue,
        date: dateStr,
        purpose: 'Initial Stock Registration'
      };
      setInventoryTransactions(prev => [...prev, initTx]);
      saveDocument('inventoryTransactions', initTx);

      const finId = `fin-inv-init-${Date.now()}`;
      const finTx: FinancialTransaction = {
        id: finId,
        type: 'EXPENDITURE',
        category: 'Material Purchase',
        amount: totalValue,
        date: dateStr,
        description: `Initial Stock Registration: ${item.currentStock} units of ${item.name}`,
        referenceId: txId
      };
      setFinancialTransactions(prev => [...prev, finTx]);
      saveDocument('financialTransactions', finTx);
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
        const stockDiff = tx.type === 'INWARDS' ? tx.quantity : -tx.quantity;
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

    // 3. Post to Financial Ledger correctly (avoiding treating internal consumption as scrap sales income)
    const financialId = `fin-inv-${Date.now()}`;
    const isPurchase = tx.type === 'INWARDS';
    
    let finType: 'INCOME' | 'EXPENDITURE';
    let finCategory: FinancialCategory;
    let finDescription = `${tx.type} LOG: ${tx.quantity} ${tx.itemName}`;
    
    if (isPurchase) {
      finType = 'EXPENDITURE';
      finCategory = 'Material Purchase';
      finDescription += ` - Supplier Restock: ${tx.purpose}`;
    } else {
      // Check if it is a scrap sale or similar revenue generator
      const isSale = tx.purpose.toLowerCase().includes('sale') || 
                     tx.purpose.toLowerCase().includes('sold') || 
                     tx.purpose.toLowerCase().includes('customer') ||
                     tx.purpose.toLowerCase().includes('revenue');
      if (isSale) {
        finType = 'INCOME';
        finCategory = 'Scrap wood sale';
        finDescription += ` - Sale: ${tx.purpose}`;
      } else {
        // It's internal consumption, workshop dispatch, damage, or waste
        finType = 'EXPENDITURE';
        finCategory = 'Material Purchase';
        finDescription += ` - Workshop Dispatch / Waste: ${tx.purpose}`;
      }
    }

    const newFinTx: FinancialTransaction = {
      id: financialId,
      type: finType,
      category: finCategory,
      amount: tx.totalValue,
      date: dateStr,
      description: finDescription,
      referenceId: transactionId
    };
    setFinancialTransactions(prev => [...prev, newFinTx]);
    saveDocument('financialTransactions', newFinTx);
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
    setJobs(prev => prev.filter(job => job.id !== jobId));
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

    // 2. Append an Outwards inventory transaction log
    const invTx: InventoryTransaction = {
      id: txId,
      itemId: jobMaterial.itemId,
      itemName: jobMaterial.name,
      type: 'OUTWARDS',
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

    // 4. Log as raw material expenditure in financial ledger
    const financialId = `fin-exp-job-${Date.now()}`;
    const finTx: FinancialTransaction = {
      id: financialId,
      type: 'EXPENDITURE',
      category: 'Material Purchase',
      amount: jobMaterial.totalCost,
      date: dateStr,
      description: `Consumed ${jobMaterial.quantity} units of ${jobMaterial.name} on Job ID: ${jobId}`,
      referenceId: jobId
    };
    setFinancialTransactions(prev => [...prev, finTx]);
    saveDocument('financialTransactions', finTx);
  };

  // Record Payment received from customer on custom woodwork job
  const handleRecordJobPayment = (jobId: string, payment: Omit<JobPayment, 'id'>) => {
    const paymentId = `pay-${Date.now()}`;
    const dateStr = new Date().toISOString().split('T')[0];

    const newPayment: JobPayment = {
      ...payment,
      id: paymentId
    };

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
  };

  // E. Manual financial ledger mutators
  const handleAddFinancialTransaction = (transaction: Omit<FinancialTransaction, 'id'>) => {
    const newTx: FinancialTransaction = {
      ...transaction,
      id: `fin-manual-${Date.now()}`
    };
    setFinancialTransactions(prev => [...prev, newTx]);
    saveDocument('financialTransactions', newTx);
  };

  const handleUpdateFinancialTransaction = (updatedTx: FinancialTransaction) => {
    setFinancialTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    saveDocument('financialTransactions', updatedTx);
  };

  const handleDeleteFinancialTransaction = (id: string) => {
    setFinancialTransactions(prev => prev.filter(t => t.id !== id));
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

  // Record Updators
  const handleUpdateInventoryItem = (updatedItem: InventoryItem) => {
    const originalItem = inventory.find(item => item.id === updatedItem.id);
    
    setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    saveDocument('inventory', updatedItem);

    // Log adjustment if stock level changed
    if (originalItem && originalItem.currentStock !== updatedItem.currentStock) {
      const stockDiff = updatedItem.currentStock - originalItem.currentStock;
      const absDiff = Math.abs(stockDiff);
      const isUp = stockDiff > 0;
      
      const txId = `tx-inv-adj-${Date.now()}`;
      const dateStr = new Date().toISOString().split('T')[0];
      const totalValue = absDiff * updatedItem.unitCost;

      const adjTx: InventoryTransaction = {
        id: txId,
        itemId: updatedItem.id,
        itemName: updatedItem.name,
        type: isUp ? 'INWARDS' : 'OUTWARDS',
        quantity: absDiff,
        unitCost: updatedItem.unitCost,
        totalValue: totalValue,
        date: dateStr,
        purpose: `Manual Stock Adjustment (${originalItem.currentStock} -> ${updatedItem.currentStock})`
      };
      setInventoryTransactions(prev => [...prev, adjTx]);
      saveDocument('inventoryTransactions', adjTx);

      // Post the adjustment to the financial ledger as EXPENDITURE/Loss
      const finId = `fin-inv-adj-${Date.now()}`;
      const finTx: FinancialTransaction = {
        id: finId,
        type: 'EXPENDITURE',
        category: 'Material Purchase',
        amount: totalValue,
        date: dateStr,
        description: `Manual Stock Adjustment: ${originalItem.currentStock} -> ${updatedItem.currentStock} units of ${updatedItem.name}`,
        referenceId: txId
      };
      setFinancialTransactions(prev => [...prev, finTx]);
      saveDocument('financialTransactions', finTx);
    }
  };

  const handleDeleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
    deleteDocument('inventory', id);
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
    setCustomers(prev => prev.filter(c => c.id !== id));
    deleteDocument('customers', id);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
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

    let baseSalary = 3500;
    let dailyRate = 120;
    if (req.role === 'Admin') { baseSalary = 9500; dailyRate = 350; }
    else if (req.role === 'Manager') { baseSalary = 8000; dailyRate = 280; }
    else if (req.role === 'Auditor') { baseSalary = 6500; dailyRate = 220; }
    else if (req.role === 'Designer') { baseSalary = 6000; dailyRate = 200; }
    else if (req.role === 'Carpenter') { baseSalary = 5200; dailyRate = 190; }
    else if (req.role === 'Carver') { baseSalary = 4800; dailyRate = 175; }
    else if (req.role === 'Sander') { baseSalary = 3200; dailyRate = 110; }
    else if (req.role === 'Polisher') { baseSalary = 3800; dailyRate = 130; }

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name: req.name,
      role: req.role,
      phone: req.phone,
      email: req.email,
      status: 'Active',
      baseSalary,
      dailyRate,
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
    ...(showManagementTabs ? [
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'customers', label: 'Clients/Customers', icon: UserCheck },
      { id: 'employees', label: 'Employees', icon: Users },
      { id: 'invoices', label: 'Invoices & Receipts', icon: Receipt },
    ] : []),
    { id: 'jobs', label: 'Job lists', icon: Wrench },
    { id: 'daily-work', label: 'Daily Logs', icon: Camera },
    ...(showManagementTabs ? [
      { id: 'finance', label: 'Financial Ledger', icon: DollarSign },
      { id: 'reports', label: 'Audit Reports', icon: FileBarChart },
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (!currentUser) {
    return (
      <LoginScreen 
        employees={employees} 
        onLogin={(user) => {
          setCurrentUser(user);
          setActiveTab('dashboard');
        }} 
        onRegisterRequest={handleRegisterRequest}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row antialiased font-sans relative overflow-x-hidden print:bg-white print:text-black">
      
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-400/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/15 rounded-full blur-[120px]"></div>
      </div>

      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden bg-white/90 backdrop-blur-md text-slate-900 p-3 flex items-center justify-between border-b border-slate-200 sticky top-0 z-40 print:hidden relative z-10 shadow-xs">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Swedswood Enterprise Logo" className="w-7 h-7 object-contain" />
          <span className="font-display font-black text-sm uppercase tracking-wider text-amber-600">SWEDSWOOD<span className="text-slate-900 ml-1">ENTERPRISE</span></span>
        </div>
        
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 hover:bg-slate-100 rounded transition"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Left-Hand Sidebar Panel */}
      <aside className={`w-64 bg-white text-slate-800 shrink-0 flex flex-col justify-between p-5 border-r border-slate-200 sticky top-0 h-screen z-40 transition-transform shadow-xs ${mobileMenuOpen ? 'translate-x-0 fixed inset-y-0 left-0 w-72' : 'max-md:-translate-x-full max-md:hidden'} print:hidden relative z-10`}>
        <div className="space-y-6">
          
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

          {/* Nav Items List */}
          <nav className="space-y-1">
            {navTabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                    setQuickActionTrigger(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-amber-500/10 border border-amber-500/30 text-amber-700 shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <TabIcon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
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
              <button 
                onClick={() => {
                  setCurrentUser(null);
                  setActiveTab('dashboard');
                }}
                className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-[10px] font-black text-red-700 transition duration-150 flex items-center justify-center gap-1.5"
                id="btn-logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Workshop</span>
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
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1300px] mx-auto w-full relative z-10 print:p-0">
        
        {/* Offline & Online Auto-Sync Status Top Banner */}
        {syncBannerMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-lg ${
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
          <div className="flex items-center gap-3">
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
                onAddJob={handleCreateJob}
                onUpdateJob={handleUpdateJob}
                showRegisterModalOnLoad={quickActionTrigger === 'register-customer'}
                onCloseRegisterModal={() => setQuickActionTrigger(null)}
                currentUser={currentUser}
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
                warningLetters={warningLetters}
                onAddWarningLetter={handleAddWarningLetter}
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
                onUpdateJobStatus={handleUpdateJobStatus}
                onLogJobMaterial={handleLogJobMaterial}
                onRecordJobPayment={handleRecordJobPayment}
                showCreateModalOnLoad={quickActionTrigger === 'create-job'}
                onCloseCreateModal={() => setQuickActionTrigger(null)}
                currentUser={currentUser}
                onTriggerInvoice={handleTriggerInvoice}
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
                onClearInvoiceJobId={() => setInvoiceJobId(null)}
                onUpdateJob={handleUpdateJob}
              />
            )}

            {activeTab === 'daily-work' && (
              <DailyWorkManager
                employees={employees}
                jobs={jobs}
                workLogs={dailyWorkLogs}
                onAddWorkLog={handleAddDailyWorkLog}
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
                recordCounts={{
                  inventory: inventory.length,
                  customers: customers.length,
                  employees: employees.length,
                  jobs: jobs.length,
                  financials: financialTransactions.length,
                  dailyLogs: dailyWorkLogs.length,
                  savedInvoices: (() => {
                    try {
                      const raw = localStorage.getItem('swedswood_saved_invoices');
                      return raw ? JSON.parse(raw).length : 0;
                    } catch { return 0; }
                  })()
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}
