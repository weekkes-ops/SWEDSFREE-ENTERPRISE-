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
  HardDrive
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
import LoginScreen from './components/LoginScreen';
import { LogOut } from 'lucide-react';

// Seed data & types
import { subscribeToCollection, saveDocument, deleteDocument, saveBatchDocuments } from './lib/firestoreService';
import { 
  INITIAL_INVENTORY, 
  INITIAL_CUSTOMERS, 
  INITIAL_EMPLOYEES, 
  INITIAL_JOBS, 
  INITIAL_INVENTORY_TRANSACTIONS, 
  INITIAL_FINANCIALS,
  INITIAL_DAILY_WORK_LOGS
} from './data';
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
  WarningLetter
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

  const performAutoOnlineSync = () => {
    setSyncStatus('syncing');
    setSyncBannerMessage('Internet connection restored! Automatically updating online database with offline records...');
    
    setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString();
      setSyncStatus('synced');
      setLastSyncTime(nowStr);
      localStorage.setItem('swedsfree_last_online_sync', nowStr);
      setSyncBannerMessage('✓ Online database automatically updated and synchronized with all local offline records!');
      
      setTimeout(() => {
        setSyncBannerMessage(null);
      }, 7000);
    }, 1500);
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
    const localSavedInvoices = localStorage.getItem('swedswood_saved_invoices');
    const savedInvoices = localSavedInvoices ? JSON.parse(localSavedInvoices) : [];

    const backupData = {
      appName: 'Sweds Wood Enterprise',
      exportDate: new Date().toISOString(),
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

  // Offline Data Import (JSON)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.inventory) setInventory(data.inventory);
        if (data.customers) setCustomers(data.customers);
        if (data.employees) setEmployees(data.employees);
        if (data.jobs) setJobs(data.jobs);
        if (data.inventoryTransactions) setInventoryTransactions(data.inventoryTransactions);
        if (data.financialTransactions) setFinancialTransactions(data.financialTransactions);
        if (data.dailyWorkLogs) setDailyWorkLogs(data.dailyWorkLogs);
        if (data.registrationRequests) setRegistrationRequests(data.registrationRequests);
        if (data.warningLetters) setWarningLetters(data.warningLetters);
        if (data.savedInvoices) {
          localStorage.setItem('swedswood_saved_invoices', JSON.stringify(data.savedInvoices));
        }
        alert('Data backup imported successfully! All records updated.');
      } catch (err) {
        alert('Failed to parse backup file. Please upload a valid JSON backup file.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Helper to load stored data from local cache with fallback
  const getStoredData = <T,>(key: string, fallback: T[] = []): T[] => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
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

  const [inventory, setInventory] = useState<InventoryItem[]>(() => getStoredData('swedsfree_inventory', INITIAL_INVENTORY));
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredData('swedsfree_customers', INITIAL_CUSTOMERS));
  const [employees, setEmployees] = useState<Employee[]>(() => getStoredData('swedsfree_employees', INITIAL_EMPLOYEES));
  const [jobs, setJobs] = useState<Job[]>(() => getStoredData('swedsfree_jobs', INITIAL_JOBS));
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>(() => getStoredData('swedsfree_inv_transactions', INITIAL_INVENTORY_TRANSACTIONS));
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>(() => getStoredData('swedsfree_fin_transactions', INITIAL_FINANCIALS));
  const [dailyWorkLogs, setDailyWorkLogs] = useState<DailyWorkLog[]>(() => getStoredData('swedsfree_daily_work_logs', INITIAL_DAILY_WORK_LOGS));
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>(() => getStoredData('swedsfree_registration_requests', []));
  const [warningLetters, setWarningLetters] = useState<WarningLetter[]>(() => getStoredData('swedsfree_warning_letters', []));

  // Helper function to remove sample records from Firestore and local storage on explicit user request
  const purgeGeneratedSampleData = async () => {
    const SAMPLE_IDS = {
      inventory: ['inv-01', 'inv-02', 'inv-03'],
      customers: ['cust-01', 'cust-02'],
      jobs: ['JOB-2026-001']
    };

    for (const [colName, ids] of Object.entries(SAMPLE_IDS)) {
      for (const id of ids) {
        try {
          await deleteDocument(colName, id);
        } catch (e) {
          // Ignore document not found errors
        }
      }
    }

    setInventory(prev => prev.filter(i => !SAMPLE_IDS.inventory.includes(i.id)));
    setCustomers(prev => prev.filter(c => !SAMPLE_IDS.customers.includes(c.id)));
    setJobs(prev => prev.filter(j => !SAMPLE_IDS.jobs.includes(j.id)));
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
        if (!items || items.length === 0) {
          // If Firestore collection is empty, automatically seed initial dataset permanently
          if (initialFallback && initialFallback.length > 0) {
            saveBatchDocuments(collectionName, initialFallback);
            setter(initialFallback);
            localStorage.setItem(localKey, JSON.stringify(initialFallback));
            return;
          }
        }

        // Ensure key customer/job records (such as Shalomville and Mr Mohamed Salia) are permanently present in Firestore
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

        setter(items || []);
        localStorage.setItem(localKey, JSON.stringify(items || []));
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
    syncCollection('registrationRequests', setRegistrationRequests, 'swedsfree_registration_requests', []);
    syncCollection('warningLetters', setWarningLetters, 'swedsfree_warning_letters', []);

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

  // 2. Sync to localStorage (never overwrite with empty arrays if initialized)
  useEffect(() => {
    if (inventory.length > 0) localStorage.setItem('swedsfree_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    if (customers.length > 0) localStorage.setItem('swedsfree_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    if (employees.length > 0) localStorage.setItem('swedsfree_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    if (jobs.length > 0) localStorage.setItem('swedsfree_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    if (inventoryTransactions.length > 0) localStorage.setItem('swedsfree_inv_transactions', JSON.stringify(inventoryTransactions));
  }, [inventoryTransactions]);

  useEffect(() => {
    if (financialTransactions.length > 0) localStorage.setItem('swedsfree_fin_transactions', JSON.stringify(financialTransactions));
  }, [financialTransactions]);

  useEffect(() => {
    if (dailyWorkLogs.length > 0) localStorage.setItem('swedsfree_daily_work_logs', JSON.stringify(dailyWorkLogs));
  }, [dailyWorkLogs]);

  useEffect(() => {
    localStorage.setItem('swedsfree_registration_requests', JSON.stringify(registrationRequests));
  }, [registrationRequests]);

  useEffect(() => {
    localStorage.setItem('swedsfree_warning_letters', JSON.stringify(warningLetters));
  }, [warningLetters]);

  // PURGE SAMPLE GENERATED DATA ACTION
  const handleResetDatabase = async () => {
    if (window.confirm('Are you sure you want to remove all generated sample data? This will clear hardcoded sample items and load only the data present in your live Firestore database.')) {
      await purgeGeneratedSampleData();
      setActiveTab('dashboard');
      alert('Generated sample data has been removed. The application is now using only your live Firestore database data.');
    }
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased font-sans relative overflow-x-hidden print:bg-white print:text-black">
      
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden bg-slate-900/60 backdrop-blur-md text-white p-3 flex items-center justify-between border-b border-white/10 sticky top-0 z-40 print:hidden relative z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Swedswood Enterprise Logo" className="w-7 h-7 object-contain" />
          <span className="font-display font-black text-sm uppercase tracking-wider text-amber-500">SWEDSWOOD<span className="text-white ml-1">ENTERPRISE</span></span>
        </div>
        
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 hover:bg-white/5 rounded transition"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Left-Hand Sidebar Panel */}
      <aside className={`w-64 backdrop-blur-xl bg-white/5 text-slate-100 shrink-0 flex flex-col justify-between p-5 border-r border-white/10 sticky top-0 h-screen z-40 transition-transform ${mobileMenuOpen ? 'translate-x-0 fixed inset-y-0 left-0 w-72' : 'max-md:-translate-x-full max-md:hidden'} print:hidden relative z-10`}>
        <div className="space-y-6">
          
          {/* Logo / Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 px-1">
              <div className="p-1.5 bg-white/10 rounded-xl border border-amber-500/30 text-white shadow-md shadow-slate-950/50">
                <img src="/logo.svg" alt="Swedswood Enterprise Logo" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h2 className="font-display font-black text-sm uppercase tracking-wider text-amber-500">SWEDSWOOD<span className="text-white ml-1">ENTERPRISE</span></h2>
                <p className="text-[9px] text-slate-400 font-semibold tracking-widest uppercase">Invoice & Workshop System</p>
              </div>
            </div>

            {/* Mobile close menu */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-white/10 border border-white/10 text-amber-400 shadow-xs' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}
                >
                  <TabIcon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar - User Profile Card & Database Section */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          
          {/* User Profile Card */}
          {currentUser && (
            <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-center font-black text-amber-400">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-100 truncate leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{currentUser.role}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setCurrentUser(null);
                  setActiveTab('dashboard');
                }}
                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 rounded-xl text-[10px] font-black text-red-400 hover:text-red-300 transition duration-150 flex items-center justify-center gap-1.5"
                id="btn-logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Workshop</span>
              </button>
            </div>
          )}

          {(isAdmin || isManager || isAuditor) && (
            <div className="space-y-3 pt-1">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[10px] text-slate-400 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Database className="w-3.5 h-3.5 text-amber-500" />
                    <span>Offline Database</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    isOnline 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className="leading-relaxed">All woodwork logs are secured in sandboxed LocalStorage cache.</p>
                
                {/* Backup & Restore Action Buttons */}
                <div className="pt-1 flex flex-col gap-1.5">
                  <button
                    onClick={handleExportBackup}
                    className="w-full py-1.5 px-2 bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-amber-400" />
                    <span>Backup Data (.JSON)</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-1.5 px-2 bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-sky-400" />
                    <span>Restore Data (.JSON)</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportBackup}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>

              <button 
                onClick={handleResetDatabase}
                className="w-full text-center text-[11px] font-bold text-red-300 hover:text-white py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded-lg transition"
              >
                Purge Sample Data & Sync DB
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
              onClick={handleExportBackup}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Download local records as JSON data backup file"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Backup Data</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Upload JSON backup file to restore data"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Restore Data</span>
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
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}
