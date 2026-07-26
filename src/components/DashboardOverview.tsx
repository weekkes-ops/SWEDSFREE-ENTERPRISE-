import { InventoryItem, Job, Customer, Employee, formatCurrency, RegistrationRequest } from '../types';
import { 
  Wrench, 
  Users, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  FolderKanban, 
  TrendingUp, 
  UserCheck,
  UserPlus,
  Check,
  X,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardOverviewProps {
  inventory: InventoryItem[];
  jobs: Job[];
  customers: Customer[];
  employees: Employee[];
  setActiveTab: (tab: string) => void;
  onOpenQuickAction: (action: string) => void;
  currentUser?: Employee | null;
  registrationRequests?: RegistrationRequest[];
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
}

export default function DashboardOverview({
  inventory,
  jobs,
  customers,
  employees,
  setActiveTab,
  onOpenQuickAction,
  currentUser,
  registrationRequests = [],
  onApproveRequest,
  onRejectRequest
}: DashboardOverviewProps) {
  
  const isManager = !currentUser || currentUser.role === 'Manager';

  // Calculate analytics
  const activeJobs = isManager 
    ? jobs.filter(j => j.status !== 'Completed' && j.status !== 'Delivered')
    : jobs.filter(j => j.status !== 'Completed' && j.status !== 'Delivered' && j.assignedEmployees.includes(currentUser.id));

  const completedJobsCount = isManager
    ? jobs.filter(j => j.status === 'Completed' || j.status === 'Delivered').length
    : jobs.filter(j => (j.status === 'Completed' || j.status === 'Delivered') && j.assignedEmployees.includes(currentUser.id)).length;
  
  const totalRevenue = jobs.reduce((sum, job) => {
    const jobPayments = job.payments.reduce((pSum, p) => pSum + p.amount, 0);
    return sum + jobPayments;
  }, 0);

  const totalOutstanding = jobs.reduce((sum, job) => {
    const paid = job.payments.reduce((pSum, p) => pSum + p.amount, 0);
    return sum + (job.quoteAmount - paid);
  }, 0);

  const totalInventoryValue = inventory.reduce((sum, item) => {
    return sum + (item.currentStock * item.unitCost);
  }, 0);

  const lowStockItems = inventory.filter(item => item.currentStock <= item.minStockThreshold);
  const activeEmployees = employees.filter(e => e.status === 'Active');

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const handleExportMetricsCSV = () => {
    const data = [
      ["Metric", "Value", "Context"],
      ["Total Active Jobs", activeJobs.length, "Unfinished commissions"],
      ["Completed Projects", completedJobsCount, "Finished or delivered commissions"],
      ["Total Revenue", formatCurrency(totalRevenue), "Total payments received"],
      ["Outstanding Balance", formatCurrency(totalOutstanding), "Unpaid quote amounts"],
      ["Total Inventory Value", formatCurrency(totalInventoryValue), "Sum of current stock * unit cost"],
      ["Low Stock Alerts", lowStockItems.length, "Materials at or below threshold"],
      ["Active Workforce Count", activeEmployees.length, "Artisans registry count"],
      ["Registered Customers", customers.length, "Clients directory count"]
    ];

    const csvContent = "\uFEFF" + data.map(row => row.map(val => {
      const stringified = String(val).replace(/"/g, '""');
      return `"${stringified}"`;
    }).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SWED_WORKSHOP_METRICS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-wood-900 tracking-tight">
            {isManager ? 'SWED Woodwork Workshop Hub' : `SWED Hub: Welcome, ${currentUser?.name}!`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isManager 
              ? 'Real-time operations, inventory reserves, and financial metrics for SWED WOOD WORK MANAGEMENT SYSTEM.'
              : `You are authenticated as an artisan (${currentUser?.role}). Log your work and view assigned commissions.`
            }
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportMetricsCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-wood-950 hover:bg-wood-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span>Export Metrics CSV</span>
          </button>
          <div className="flex items-center gap-2 bg-wood-50 px-4 py-2 rounded-xl border border-wood-200">
            <Clock className="w-4 h-4 text-wood-600 animate-pulse" />
            <span className="font-mono text-xs font-semibold text-wood-800">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Registration Requests Alert Banner */}
      {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && registrationRequests.filter(r => r.status === 'Pending').length > 0 && (
        <motion.div 
          variants={itemVariants}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-3.5 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 -translate-y-1/3 translate-x-1/3 w-32 h-32 bg-amber-500/5 rounded-full pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl">
                <UserPlus className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Pending Registration Requests 
                  <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {registrationRequests.filter(r => r.status === 'Pending').length} Request(s)
                  </span>
                </h3>
                <p className="text-xs text-gray-500">
                  New woodwork apprentices or workshop artisans have requested access. An Admin or Manager must approve them before they can log in.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('employees')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition"
            >
              Manage Registration Queue
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1.5 relative z-10">
            {registrationRequests.filter(r => r.status === 'Pending').map(req => (
              <div 
                key={req.id}
                className="bg-white/80 backdrop-blur-md p-3.5 rounded-xl border border-amber-200/50 flex items-center justify-between gap-3 text-xs shadow-xs hover:border-amber-300 transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 truncate">{req.name}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">
                      {req.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>📞 {req.phone}</span>
                    <span>✉️ {req.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onApproveRequest && onApproveRequest(req.id)}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg transition"
                    title="Approve registration"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRejectRequest && onRejectRequest(req.id)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition"
                    title="Reject registration"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isManager ? (
          <>
            {/* Total Payments Collected */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payments Collected</span>
                <h3 className="text-2xl font-bold font-mono text-wood-900">
                  {formatCurrency(totalRevenue)}
                </h3>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Outstanding: {formatCurrency(totalOutstanding, 0)}</span>
                </div>
              </div>
              <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                <DollarSign className="w-6 h-6" />
              </div>
            </motion.div>

            {/* Active Commissions */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Commissions</span>
                <h3 className="text-2xl font-bold font-mono text-wood-900">
                  {activeJobs.length} <span className="text-sm font-sans text-gray-400 font-normal">Jobs</span>
                </h3>
                <div className="flex items-center gap-1 text-xs text-wood-600 font-medium">
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>{completedJobsCount} completed projects</span>
                </div>
              </div>
              <div className="p-3.5 bg-wood-50 rounded-xl text-wood-600 border border-wood-100">
                <Wrench className="w-6 h-6" />
              </div>
            </motion.div>

            {/* Stock Value */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Inventory Value</span>
                <h3 className="text-2xl font-bold font-mono text-wood-900">
                  {formatCurrency(totalInventoryValue)}
                </h3>
                <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{lowStockItems.length} low stock alerts</span>
                </div>
              </div>
              <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                <Package className="w-6 h-6" />
              </div>
            </motion.div>

            {/* Master Artisans */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Artisans</span>
                <h3 className="text-2xl font-bold font-mono text-wood-900">
                  {activeEmployees.length} <span className="text-sm font-sans text-gray-400 font-normal">Staff</span>
                </h3>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>All roles registered</span>
                </div>
              </div>
              <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                <Users className="w-6 h-6" />
              </div>
            </motion.div>
          </>
        ) : (
          <>
            {/* Monthly Wage Card */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">My Base Salary</span>
                <h3 className="text-2xl font-bold font-mono text-wood-900">
                  {formatCurrency(currentUser?.baseSalary || 0)}
                </h3>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Daily rate: {formatCurrency(currentUser?.dailyRate || 0)}</span>
                </div>
              </div>
              <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                <DollarSign className="w-6 h-6" />
              </div>
            </motion.div>

            {/* Assigned Commissions */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">My Assigned Jobs</span>
                <h3 className="text-2xl font-bold font-mono text-wood-900">
                  {activeJobs.length} <span className="text-sm font-sans text-gray-400 font-normal">Active</span>
                </h3>
                <div className="flex items-center gap-1 text-xs text-wood-600 font-medium">
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>{completedJobsCount} completed jobs</span>
                </div>
              </div>
              <div className="p-3.5 bg-wood-50 rounded-xl text-wood-600 border border-wood-100">
                <Wrench className="w-6 h-6" />
              </div>
            </motion.div>

            {/* Submissions stats */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Work Logs Filed</span>
                <h3 className="text-2xl font-bold font-mono text-wood-900">
                  Active
                </h3>
                <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Always upload at end-of-day</span>
                </div>
              </div>
              <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                <Package className="w-6 h-6" />
              </div>
            </motion.div>

            {/* Status Card */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="bg-white p-6 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Registry Status</span>
                <h3 className="text-2xl font-bold font-mono text-wood-900">
                  {currentUser?.status}
                </h3>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Role: {currentUser?.role}</span>
                </div>
              </div>
              <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                <Users className="w-6 h-6" />
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Main Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Critical Alerts & Shortcuts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Actions Shortcuts */}
          <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
            <h3 className="font-display font-bold text-gray-900">Quick Workshop Actions</h3>
            <div className="grid grid-cols-1 gap-2">
              {isManager ? (
                <>
                  <button 
                    onClick={() => onOpenQuickAction('register-customer')}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-wood-50 hover:border-wood-200 transition text-sm font-medium text-gray-700"
                  >
                    <span>Register Customer</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => onOpenQuickAction('register-employee')}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-wood-50 hover:border-wood-200 transition text-sm font-medium text-gray-700"
                  >
                    <span>Register Employee</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => setActiveTab('daily-work')}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-wood-50 hover:border-wood-200 transition text-sm font-medium text-gray-700"
                  >
                    <span>Submit Daily Work Log</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => onOpenQuickAction('log-inwards')}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-wood-50 hover:border-wood-200 transition text-sm font-medium text-gray-700"
                  >
                    <span>Log Inwards Inventory</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('jobs');
                      onOpenQuickAction('create-job');
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-wood-600 hover:bg-wood-700 transition text-sm font-medium text-white shadow-xs"
                  >
                    <span>Initiate Job</span>
                    <Wrench className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setActiveTab('daily-work')}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-wood-50 hover:border-wood-200 transition text-sm font-medium text-gray-700 font-bold"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                      Upload Daily Work Log
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => setActiveTab('jobs')}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-wood-50 hover:border-wood-200 transition text-sm font-medium text-gray-700"
                  >
                    <span>View My Assigned Jobs</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </button>
                </>
              )}
            </div>
          </motion.div>

          {/* Low Stock Watchlist or Artisan guidelines */}
          {!isManager ? (
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
              <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                Artisan Operational Code
              </h3>
              <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
                <p className="font-bold text-gray-800">Please adhere to the daily workshop reporting rules:</p>
                <ul className="list-disc list-inside space-y-2 pl-1 text-gray-500 font-medium">
                  <li>Record clock-in and clock-out times accurately.</li>
                  <li>Upload clear photo proofs of finished workpieces or raw assemblies.</li>
                  <li>Log precise material usage against your active jobs.</li>
                  <li>Leave detailed progress descriptions for sanders and polishers.</li>
                </ul>
              </div>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Low Stock Alerts
                </h3>
                <span className="bg-amber-50 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                  {lowStockItems.length} critical
                </span>
              </div>

              {lowStockItems.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4 bg-gray-50 rounded-xl">
                  All raw materials and hardware are optimally stocked.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-semibold">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-red-600">
                          {item.currentStock} {item.unit}
                        </p>
                        <p className="text-[10px] text-gray-400">Min: {item.minStockThreshold}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button 
                onClick={() => setActiveTab('inventory')}
                className="w-full text-center text-xs font-semibold text-wood-600 hover:text-wood-700 hover:underline"
              >
                Manage Inventory Stock &rarr;
              </button>
            </motion.div>
          )}
        </div>

        {/* Right Columns - Job & Commission Progress board */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-900">Active Commissions & Job Pipelines</h3>
              <button 
                onClick={() => setActiveTab('jobs')}
                className="text-xs font-semibold text-wood-600 hover:text-wood-700 hover:underline"
              >
                View All Jobs
              </button>
            </div>

            <div className="space-y-3">
              {activeJobs.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <p className="text-sm text-gray-500">No active woodwork commissions registered.</p>
                  <button 
                    onClick={() => {
                      setActiveTab('jobs');
                      onOpenQuickAction('create-job');
                    }}
                    className="text-xs text-wood-600 font-semibold underline mt-1"
                  >
                    Initiate one now
                  </button>
                </div>
              ) : (
                activeJobs.slice(0, 3).map(job => {
                  const paid = job.payments.reduce((sum, p) => sum + p.amount, 0);
                  const completionPercentage = Math.round((paid / job.quoteAmount) * 100);
                  
                  // Status badge style mapper
                  const getStatusStyle = (status: string) => {
                    switch (status) {
                      case 'Quote': return 'bg-gray-100 text-gray-700 border-gray-200';
                      case 'In Progress': return 'bg-amber-50 text-amber-700 border-amber-200';
                      case 'Ready for Sander': return 'bg-blue-50 text-blue-700 border-blue-200';
                      case 'Ready for Polishing': return 'bg-purple-50 text-purple-700 border-purple-200';
                      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      default: return 'bg-green-100 text-green-800 border-green-200';
                    }
                  };

                  return (
                    <div key={job.id} className="p-4 rounded-xl border border-wood-100 hover:bg-wood-50/30 transition">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-gray-800">{job.title}</h4>
                          <p className="text-xs text-gray-400">Client: {job.customerName}</p>
                        </div>
                        <span className={`text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full border ${getStatusStyle(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 py-2 text-xs border-y border-gray-50 font-medium">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Due Date</span>
                          <span className="text-gray-700 font-mono text-xs">{job.dueDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Quote Price</span>
                          <span className="text-wood-800 font-mono text-xs font-bold">{formatCurrency(job.quoteAmount, 0)}</span>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Financial Progress</span>
                          <span className="text-emerald-700 font-mono text-xs font-bold">
                            {formatCurrency(paid, 0)} paid ({completionPercentage}%)
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span>Craftsmen Assigned</span>
                          <span>Material Logged: {job.materialsUsed.length} item(s)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {job.assignedEmployees.map(empId => {
                            const emp = employees.find(e => e.id === empId);
                            if (!emp) return null;
                            return (
                              <span key={empId} className="bg-wood-100 text-wood-900 text-[10px] px-2 py-0.5 rounded font-medium border border-wood-200/50">
                                {emp.name} ({emp.role})
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Quick Inventory Stock Overview */}
          {isManager && (
            <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
              <h3 className="font-display font-bold text-gray-900">Raw Wood Stock Health</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inventory.slice(0, 4).map(item => {
                  const stockRatio = Math.min(100, Math.round((item.currentStock / 500) * 100)); // normalized to 500 BF/Sheets max scale
                  const isLow = item.currentStock <= item.minStockThreshold;
                  
                  return (
                    <div key={item.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{item.category}</p>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isLow ? 'bg-red-100 text-red-800' : 'bg-wood-100 text-wood-800'}`}>
                          {item.currentStock} {item.unit}
                        </span>
                      </div>
                      {/* Linear visual level */}
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${stockRatio}%` }}
                          className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-wood-500'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
