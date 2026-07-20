import { useState, useEffect } from 'react';
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
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Child components
import DashboardOverview from './components/DashboardOverview';
import InventoryManager from './components/InventoryManager';
import CustomerManager from './components/CustomerManager';
import EmployeeManager from './components/EmployeeManager';
import JobManager from './components/JobManager';
import FinancialLedger from './components/FinancialLedger';
import ReportGenerator from './components/ReportGenerator';
import DailyWorkManager from './components/DailyWorkManager';
import LoginScreen from './components/LoginScreen';
import { LogOut } from 'lucide-react';

// Seed data & types
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
  EmployeeRole
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [quickActionTrigger, setQuickActionTrigger] = useState<string | null>(null);

  // Core workshop state modules
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([]);
  const [dailyWorkLogs, setDailyWorkLogs] = useState<DailyWorkLog[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);

  // 1. Initial Load from localStorage or Seeds
  useEffect(() => {
    const localInv = localStorage.getItem('swedsfree_inventory');
    const localCust = localStorage.getItem('swedsfree_customers');
    const localEmp = localStorage.getItem('swedsfree_employees');
    const localJobs = localStorage.getItem('swedsfree_jobs');
    const localInvTx = localStorage.getItem('swedsfree_inv_transactions');
    const localFinTx = localStorage.getItem('swedsfree_fin_transactions');
    const localWorkLogs = localStorage.getItem('swedsfree_daily_work_logs');

    if (localInv) setInventory(JSON.parse(localInv));
    else setInventory(INITIAL_INVENTORY);

    if (localCust) setCustomers(JSON.parse(localCust));
    else setCustomers(INITIAL_CUSTOMERS);

    if (localEmp) setEmployees(JSON.parse(localEmp));
    else setEmployees(INITIAL_EMPLOYEES);

    if (localJobs) setJobs(JSON.parse(localJobs));
    else setJobs(INITIAL_JOBS);

    if (localInvTx) setInventoryTransactions(JSON.parse(localInvTx));
    else setInventoryTransactions(INITIAL_INVENTORY_TRANSACTIONS);

    if (localFinTx) setFinancialTransactions(JSON.parse(localFinTx));
    else setFinancialTransactions(INITIAL_FINANCIALS);

    if (localWorkLogs) setDailyWorkLogs(JSON.parse(localWorkLogs));
    else setDailyWorkLogs(INITIAL_DAILY_WORK_LOGS);

    const localRequests = localStorage.getItem('swedsfree_registration_requests');
    if (localRequests) {
      setRegistrationRequests(JSON.parse(localRequests));
    } else {
      const seedRequests: RegistrationRequest[] = [
        {
          id: 'req-01',
          name: 'Sahr Mattia',
          email: 'sahr.mattia@swedsfree.com',
          phone: '+232 76 112 3344',
          role: 'Carpenter',
          password: '1234',
          status: 'Pending',
          requestDate: '2026-07-19',
        },
        {
          id: 'req-02',
          name: 'Aminata Tarawallie',
          email: 'aminata.t@swedsfree.com',
          phone: '+232 78 555 8888',
          role: 'Designer',
          password: '1234',
          status: 'Pending',
          requestDate: '2026-07-20',
        }
      ];
      setRegistrationRequests(seedRequests);
      localStorage.setItem('swedsfree_registration_requests', JSON.stringify(seedRequests));
    }

    const localUser = localStorage.getItem('swedsfree_current_user');
    if (localUser) {
      try {
        setCurrentUser(JSON.parse(localUser));
      } catch (e) {
        console.error(e);
      }
    }
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
    if (inventoryTransactions.length > 0) {
      localStorage.setItem('swedsfree_inv_transactions', JSON.stringify(inventoryTransactions));
    }
  }, [inventoryTransactions]);

  useEffect(() => {
    if (financialTransactions.length > 0) {
      localStorage.setItem('swedsfree_fin_transactions', JSON.stringify(financialTransactions));
    }
  }, [financialTransactions]);

  useEffect(() => {
    if (dailyWorkLogs.length > 0) {
      localStorage.setItem('swedsfree_daily_work_logs', JSON.stringify(dailyWorkLogs));
    }
  }, [dailyWorkLogs]);

  useEffect(() => {
    localStorage.setItem('swedsfree_registration_requests', JSON.stringify(registrationRequests));
  }, [registrationRequests]);

  // RESET DATABASE ACTION
  const handleResetDatabase = () => {
    if (window.confirm('Are you sure you want to reset all records back to Swedsfree Enterprise standard seeds? This will delete custom transactions.')) {
      localStorage.removeItem('swedsfree_inventory');
      localStorage.removeItem('swedsfree_customers');
      localStorage.removeItem('swedsfree_employees');
      localStorage.removeItem('swedsfree_jobs');
      localStorage.removeItem('swedsfree_inv_transactions');
      localStorage.removeItem('swedsfree_fin_transactions');
      localStorage.removeItem('swedsfree_daily_work_logs');
      localStorage.removeItem('swedsfree_registration_requests');

      setInventory(INITIAL_INVENTORY);
      setCustomers(INITIAL_CUSTOMERS);
      setEmployees(INITIAL_EMPLOYEES);
      setJobs(INITIAL_JOBS);
      setInventoryTransactions(INITIAL_INVENTORY_TRANSACTIONS);
      setFinancialTransactions(INITIAL_FINANCIALS);
      setDailyWorkLogs(INITIAL_DAILY_WORK_LOGS);
      setRegistrationRequests([
        {
          id: 'req-01',
          name: 'Sahr Mattia',
          email: 'sahr.mattia@swedsfree.com',
          phone: '+232 76 112 3344',
          role: 'Carpenter',
          password: '1234',
          status: 'Pending',
          requestDate: '2026-07-19',
        },
        {
          id: 'req-02',
          name: 'Aminata Tarawallie',
          email: 'aminata.t@swedsfree.com',
          phone: '+232 78 555 8888',
          role: 'Designer',
          password: '1234',
          status: 'Pending',
          requestDate: '2026-07-20',
        }
      ]);
      setActiveTab('dashboard');
    }
  };

  // ==========================================
  // OPERATIONAL STATE WORKFLOW MUTATORS
  // ==========================================

  // A. Inventory mutators
  const handleAddInventoryItem = (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: `inv-${Date.now()}`,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setInventory(prev => [newItem, ...prev]);
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
        return {
          ...item,
          currentStock: Math.max(0, item.currentStock + stockDiff),
          lastUpdated: dateStr
        };
      }
      return item;
    }));

    // 2. Append transaction log
    setInventoryTransactions(prev => [...prev, newTx]);

    // 3. Post to Financial Ledger as well
    const financialId = `fin-inv-${Date.now()}`;
    const isPurchase = tx.type === 'INWARDS';
    const newFinTx: FinancialTransaction = {
      id: financialId,
      type: isPurchase ? 'EXPENDITURE' : 'INCOME',
      category: isPurchase ? 'Material Purchase' : 'Scrap wood sale',
      amount: tx.totalValue,
      date: dateStr,
      description: `${tx.type} LOG: ${tx.quantity} ${tx.itemName} - Purpose: ${tx.purpose}`,
      referenceId: transactionId
    };
    setFinancialTransactions(prev => [...prev, newFinTx]);
  };

  // B. Customer mutators
  const handleAddCustomer = (customer: Omit<Customer, 'id' | 'registrationDate'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      registrationDate: new Date().toISOString().split('T')[0]
    };
    setCustomers(prev => [...prev, newCustomer]);
  };

  // C. Employee mutators
  const handleAddEmployee = (employee: Omit<Employee, 'id' | 'hireDate'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: `emp-${Date.now()}`,
      hireDate: new Date().toISOString().split('T')[0]
    };
    setEmployees(prev => [...prev, newEmployee]);
  };

  const handleUpdateEmployeeStatus = (id: string, status: EmployeeStatus) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) return { ...emp, status };
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
  };

  const handleUpdateJobStatus = (id: string, status: JobStatus) => {
    setJobs(prev => prev.map(job => {
      if (job.id === id) return { ...job, status };
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
        return {
          ...item,
          currentStock: Math.max(0, item.currentStock - jobMaterial.quantity),
          lastUpdated: dateStr
        };
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

    // 3. Append to Job material consumption list
    setJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          materialsUsed: [...job.materialsUsed, jobMaterial]
        };
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
        return {
          ...job,
          payments: [...job.payments, newPayment]
        };
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
  };

  // E. Manual financial ledger mutators
  const handleAddFinancialTransaction = (transaction: Omit<FinancialTransaction, 'id'>) => {
    const newTx: FinancialTransaction = {
      ...transaction,
      id: `fin-manual-${Date.now()}`
    };
    setFinancialTransactions(prev => [...prev, newTx]);
  };

  // F. Daily work upload mutators
  const handleAddDailyWorkLog = (log: Omit<DailyWorkLog, 'id'>) => {
    const newLog: DailyWorkLog = {
      ...log,
      id: `log-${Date.now()}`
    };
    setDailyWorkLogs(prev => [newLog, ...prev]);
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
    setRegistrationRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'Approved' } : r));
  };

  const handleRejectRequest = (requestId: string) => {
    setRegistrationRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'Rejected' } : r));
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
      { id: 'inventory', label: 'Raw Inventory', icon: Package },
      { id: 'customers', label: 'Clients Directory', icon: UserCheck },
      { id: 'employees', label: 'Artisans Registry', icon: Users },
    ] : []),
    { id: 'jobs', label: 'Woodwork Jobs', icon: Wrench },
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
      <div className="md:hidden bg-slate-900/60 backdrop-blur-md text-white p-4 flex items-center justify-between border-b border-white/10 sticky top-0 z-40 print:hidden relative z-10">
        <div className="flex items-center gap-2">
          <Hammer className="w-5 h-5 text-amber-500 animate-spin-slow" />
          <span className="font-display font-black text-sm uppercase tracking-wider text-amber-500">SWEDSFREE<span className="text-white ml-1">ENT.</span></span>
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
              <div className="p-2 bg-white/5 rounded-xl border border-white/10 text-white shadow-md shadow-slate-950/50">
                <Hammer className="w-5 h-5 text-amber-500 animate-spin-slow" />
              </div>
              <div>
                <h2 className="font-display font-black text-base uppercase tracking-wider text-amber-500">SWEDSFREE<span className="text-white ml-1">ENT.</span></h2>
                <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Woodwork Management</p>
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
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[10px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Database className="w-3.5 h-3.5 text-amber-500" />
                  <span>Offline Database</span>
                </div>
                <p className="leading-relaxed">All woodwork logs are secured in sandboxed LocalStorage cache.</p>
              </div>

              {isAdmin && (
                <button 
                  onClick={handleResetDatabase}
                  className="w-full text-center text-[10px] font-bold text-red-400 hover:text-red-300 py-1 border border-dashed border-red-500/20 hover:border-red-500/50 rounded-lg transition"
                >
                  Reset Database seeds
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel Frame */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1300px] mx-auto w-full relative z-10 print:p-0">
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
                currentUser={currentUser}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerManager
                customers={customers}
                jobs={jobs}
                onAddCustomer={handleAddCustomer}
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
                onUpdateEmployeeStatus={handleUpdateEmployeeStatus}
                showRegisterModalOnLoad={quickActionTrigger === 'register-employee'}
                onCloseRegisterModal={() => setQuickActionTrigger(null)}
                currentUser={currentUser}
                registrationRequests={registrationRequests}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
              />
            )}

            {activeTab === 'jobs' && (
              <JobManager
                jobs={jobs}
                customers={customers}
                employees={employees}
                inventory={inventory}
                onCreateJob={handleCreateJob}
                onUpdateJobStatus={handleUpdateJobStatus}
                onLogJobMaterial={handleLogJobMaterial}
                onRecordJobPayment={handleRecordJobPayment}
                showCreateModalOnLoad={quickActionTrigger === 'create-job'}
                onCloseCreateModal={() => setQuickActionTrigger(null)}
                currentUser={currentUser}
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
                currentUser={currentUser}
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
