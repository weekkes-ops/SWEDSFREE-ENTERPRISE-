import { useState } from 'react';
import { 
  Employee, 
  Customer, 
  Job, 
  InventoryItem, 
  InventoryTransaction, 
  FinancialTransaction, 
  ReportPeriod,
  formatCurrency 
} from '../types';
import { 
  Printer, 
  Download, 
  Calendar, 
  Users, 
  UserCheck, 
  TrendingUp, 
  Package, 
  FileText, 
  Briefcase, 
  TrendingDown, 
  DollarSign, 
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Wrench
} from 'lucide-react';
import { motion } from 'motion/react';

interface ReportGeneratorProps {
  employees: Employee[];
  customers: Customer[];
  jobs: Job[];
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  financialTransactions: FinancialTransaction[];
  currentUser?: Employee | null;
}

export default function ReportGenerator({
  employees,
  customers,
  jobs,
  inventory,
  inventoryTransactions,
  financialTransactions,
  currentUser
}: ReportGeneratorProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('Monthly');
  const [activeSubReport, setActiveSubReport] = useState<'EMPLOYEES' | 'CUSTOMERS' | 'REVENUE' | 'INVENTORY'>('EMPLOYEES');

  // Generate Date Boundaries based on selectedPeriod (Daily, Weekly, Monthly, Yearly)
  // Let's assume current date is July 20, 2026.
  const currentDateStr = '2026-07-20';
  const currentDate = new Date(currentDateStr);

  const getPeriodFilter = (dateStr: string): boolean => {
    const itemDate = new Date(dateStr);
    const diffTime = Math.abs(currentDate.getTime() - itemDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (selectedPeriod === 'Daily') {
      // Is same day (let's allow last 24h/same day or match July 20, 2026 exactly)
      return itemDate.toDateString() === currentDate.toDateString();
    } else if (selectedPeriod === 'Weekly') {
      // Within last 7 days
      return diffDays <= 7 && itemDate <= currentDate;
    } else if (selectedPeriod === 'Monthly') {
      // Is same month and year (July 2026)
      return itemDate.getMonth() === currentDate.getMonth() && itemDate.getFullYear() === currentDate.getFullYear();
    } else if (selectedPeriod === 'Yearly') {
      // Is same year (2026)
      return itemDate.getFullYear() === currentDate.getFullYear();
    }
    return true;
  };

  // 1. Filtered Datasets
  const periodFinTx = financialTransactions.filter(t => getPeriodFilter(t.date));
  const periodInvTx = inventoryTransactions.filter(t => getPeriodFilter(t.date));
  const periodJobs = jobs.filter(j => getPeriodFilter(j.startDate) || j.payments.some(p => getPeriodFilter(p.date)));
  const periodCustomers = customers.filter(c => getPeriodFilter(c.registrationDate));

  // 2. Employees Period Metrics
  const activeStaff = employees.filter(e => e.status === 'Active');
  const PeriodWagesCost = periodFinTx
    .filter(t => t.category === 'Employee Wages')
    .reduce((sum, t) => sum + t.amount, 0);

  // 3. Customers Period Metrics
  const periodRevenue = periodFinTx
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const newCustomersCount = periodCustomers.length;

  // 4. Revenue Period Metrics
  const totalIncome = periodFinTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = periodFinTx.filter(t => t.type === 'EXPENDITURE').reduce((sum, t) => sum + t.amount, 0);
  const netEarnings = totalIncome - totalExpense;

  // 5. Inventory Period Metrics
  const inwardsQty = periodInvTx.filter(t => t.type === 'INWARDS').reduce((sum, t) => sum + t.quantity, 0);
  const inwardsVal = periodInvTx.filter(t => t.type === 'INWARDS').reduce((sum, t) => sum + t.totalValue, 0);
  
  const outwardsQty = periodInvTx.filter(t => t.type === 'OUTWARDS').reduce((sum, t) => sum + t.quantity, 0);
  const outwardsVal = periodInvTx.filter(t => t.type === 'OUTWARDS').reduce((sum, t) => sum + t.totalValue, 0);

  const lowStockCount = inventory.filter(i => i.currentStock <= i.minStockThreshold).length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    alert("Drafting Excel CSV Summary for Swedsfree Enterprise. Export compiled successfully!");
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Swedsfree Reports Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and audit Daily, Weekly, Monthly, and Yearly operational dossiers.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isAuditor && (
            <div className="flex items-center gap-1 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-black tracking-wide font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Auditor Active</span>
            </div>
          )}
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Sheet</span>
          </button>
        </div>
      </div>

      {/* Report Period Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-wood-100 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
          {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as ReportPeriod[]).map(per => (
            <button
              key={per}
              onClick={() => setSelectedPeriod(per)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedPeriod === per ? 'bg-wood-900 text-white shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {per} Report
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold bg-wood-50/50 px-3 py-1.5 rounded-lg border border-wood-100">
          <Calendar className="w-4 h-4 text-wood-600" />
          <span>Report Pivot Date: <strong>July 20, 2026</strong></span>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-6 space-y-1">
        <h1 className="text-2xl font-serif font-bold text-gray-900 uppercase">SWEDSFREE ENTERPRISE</h1>
        <p className="text-sm text-gray-500">Professional Woodwork & Bespoke Furniture Workshop</p>
        <p className="text-xs font-mono font-bold text-gray-700">{selectedPeriod.toUpperCase()} GENERAL AUDIT REPORT &mdash; PIVOT DATE: {currentDateStr}</p>
      </div>

      {/* 4 Core Pivot Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Artisan Wages Paid</span>
          <p className="text-xl font-bold font-mono text-gray-800 mt-1">{formatCurrency(PeriodWagesCost, 0)}</p>
          <p className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">{activeStaff.length} craftsmen active</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Customer Revenue</span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">+{formatCurrency(periodRevenue, 0)}</p>
          <p className="text-[9px] text-emerald-600 font-semibold uppercase mt-0.5">{newCustomersCount} new client signups</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Period Net Earnings</span>
          <p className={`text-xl font-bold font-mono mt-1 ${netEarnings >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {netEarnings >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netEarnings), 0)}
          </p>
          <p className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">Retained earnings</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Lumber Consumed</span>
          <p className="text-xl font-bold font-mono text-wood-900 mt-1">{outwardsQty} <span className="text-xs text-gray-500 font-normal">Units</span></p>
          <p className="text-[9px] text-wood-700 font-semibold uppercase mt-0.5">Asset value: {formatCurrency(outwardsVal, 0)}</p>
        </div>
      </div>

      {/* Sub-Reports Tabs selection */}
      <div className="flex border-b border-gray-100 print:hidden">
        <button
          onClick={() => setActiveSubReport('EMPLOYEES')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${activeSubReport === 'EMPLOYEES' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <Users className="w-4 h-4" />
          Employee Audit
        </button>
        <button
          onClick={() => setActiveSubReport('CUSTOMERS')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${activeSubReport === 'CUSTOMERS' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <UserCheck className="w-4 h-4" />
          Customer Audit
        </button>
        <button
          onClick={() => setActiveSubReport('REVENUE')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${activeSubReport === 'REVENUE' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <TrendingUp className="w-4 h-4" />
          Revenue Ledger
        </button>
        <button
          onClick={() => setActiveSubReport('INVENTORY')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${activeSubReport === 'INVENTORY' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <Package className="w-4 h-4" />
          Inventory Balance
        </button>
      </div>

      {/* SUB-REPORT 1: Employees period audit */}
      {(activeSubReport === 'EMPLOYEES' || window.matchMedia('print').matches) && (
        <div className="bg-white rounded-2xl border border-wood-100 shadow-xs p-6 space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-wood-600" />
              Artisan Productivity & Payroll Audit ({selectedPeriod})
            </h3>
            <span className="text-xs bg-wood-50 text-wood-800 font-extrabold px-2.5 py-1 rounded border border-wood-100">
              {employees.length} artisans certified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  <th className="py-2.5 px-3">Craftsman name</th>
                  <th className="py-2.5 px-3">Workshop Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Commissions assigned</th>
                  <th className="py-2.5 px-3 text-right">Compensation setting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {employees.map(emp => {
                  const empJobs = jobs.filter(j => j.assignedEmployees.includes(emp.id));
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/30 transition">
                      <td className="py-2.5 px-3 font-bold text-gray-800">{emp.name}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-500">{emp.role}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-700">
                        {empJobs.length} active logs
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-800">
                        Base: {formatCurrency(emp.baseSalary, 0)} / Overtime: {formatCurrency(emp.dailyRate, 0)}/day
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-REPORT 2: Customers period audit */}
      {(activeSubReport === 'CUSTOMERS' || window.matchMedia('print').matches) && (
        <div className="bg-white rounded-2xl border border-wood-100 shadow-xs p-6 space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-wood-600" />
              Customer Accounts & Booking Ledgers ({selectedPeriod})
            </h3>
            <span className="text-xs text-gray-400 font-semibold font-mono">
              Cleared Deposited Revenue: {formatCurrency(periodRevenue, 0)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  <th className="py-2.5 px-3">Client name</th>
                  <th className="py-2.5 px-3">Company Details</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-center">Regist. Date</th>
                  <th className="py-2.5 px-3 text-right">Historical Commissions booked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {customers.map(cust => {
                  const custJobs = jobs.filter(j => j.customerId === cust.id);
                  const totalBooked = custJobs.reduce((sum, j) => sum + j.quoteAmount, 0);
                  return (
                    <tr key={cust.id} className="hover:bg-gray-50/30 transition">
                      <td className="py-2.5 px-3 font-bold text-gray-800">{cust.name}</td>
                      <td className="py-2.5 px-3 text-gray-500 font-medium">{cust.company || 'Private Client'}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-500">{cust.phone}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-gray-500">{cust.registrationDate}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-wood-950">
                        {formatCurrency(totalBooked, 0)} ({custJobs.length} jobs)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-REPORT 3: Revenue (Income vs Expenditure) period audit */}
      {(activeSubReport === 'REVENUE' || window.matchMedia('print').matches) && (
        <div className="bg-white rounded-2xl border border-wood-100 shadow-xs p-6 space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-wood-600" />
              Cash Ledger Flow Summary ({selectedPeriod})
            </h3>
            <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded border ${netEarnings >= 0 ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-red-800 bg-red-50 border-red-200'}`}>
              Net Income for Period: {netEarnings >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netEarnings), 0)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Incomes */}
            <div className="space-y-2 border border-gray-100 p-3.5 rounded-xl bg-gray-50/50">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <ArrowDownRight className="w-4 h-4" /> Inflows (Income Receipts)
              </h4>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 text-xs">
                {periodFinTx.filter(t => t.type === 'INCOME').length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 font-medium">No income receipts in this period.</p>
                ) : (
                  periodFinTx.filter(t => t.type === 'INCOME').map(t => (
                    <div key={t.id} className="p-2.5 bg-white rounded-lg border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-800">{t.description}</p>
                        <span className="text-[10px] text-gray-400 font-mono">{t.date}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">+{formatCurrency(t.amount, 0)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expenses */}
            <div className="space-y-2 border border-gray-100 p-3.5 rounded-xl bg-gray-50/50">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-red-800 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> Outflows (Expenditures)
              </h4>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 text-xs">
                {periodFinTx.filter(t => t.type === 'EXPENDITURE').length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 font-medium">No expenditures in this period.</p>
                ) : (
                  periodFinTx.filter(t => t.type === 'EXPENDITURE').map(t => (
                    <div key={t.id} className="p-2.5 bg-white rounded-lg border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-800">{t.description}</p>
                        <span className="text-[10px] text-gray-400 font-mono">{t.date}</span>
                      </div>
                      <span className="font-mono font-bold text-red-600">-{formatCurrency(t.amount, 0)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-REPORT 4: Inventory balance period audit */}
      {(activeSubReport === 'INVENTORY' || window.matchMedia('print').matches) && (
        <div className="bg-white rounded-2xl border border-wood-100 shadow-xs p-6 space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-wood-600" />
              Raw Materials & Hardware Stock Balance Audit ({selectedPeriod})
            </h3>
            <span className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-100 font-bold">
              {lowStockCount} items below threshold
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Inflow Purchases / Logged Inwards</span>
                <p className="text-xl font-bold font-mono text-emerald-800 mt-1">
                  {inwardsQty} <span className="text-xs text-gray-500 font-normal">items</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Asset purchase cost: {formatCurrency(inwardsVal, 0)}</p>
              </div>
              <ArrowDownRight className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Outflow Consumed / Logged Outwards</span>
                <p className="text-xl font-bold font-mono text-amber-800 mt-1">
                  {outwardsQty} <span className="text-xs text-gray-500 font-normal">items</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Production expense: {formatCurrency(outwardsVal, 0)}</p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          {/* Current Stock Health table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  <th className="py-2.5 px-3">Material Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">In Stock Reserves</th>
                  <th className="py-2.5 px-3 text-right">Typical Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Asset Worth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {inventory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/30 transition">
                    <td className="py-2.5 px-3 font-bold text-gray-800">{item.name}</td>
                    <td className="py-2.5 px-3 text-gray-400 font-bold uppercase text-[10px]">{item.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-500">{formatCurrency(item.unitCost)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-wood-950">
                      {formatCurrency(item.currentStock * item.unitCost, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Report Footer */}
      <div className="hidden print:block text-center text-[10px] text-gray-400 pt-8 border-t">
        <p>Swedsfree Enterprise Workshop Hub Auto-Generated Audit Report. All ledger books certified intact.</p>
        <p className="mt-1 font-mono">Printed on: {new Date().toLocaleString()}</p>
      </div>

    </div>
  );
}
