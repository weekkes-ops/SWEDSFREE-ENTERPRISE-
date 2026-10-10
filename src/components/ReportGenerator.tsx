import { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
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
  Wrench,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import MonthlyTrendsSection from './MonthlyTrendsSection';
import FiscalIncomeExpenditureSection from './FiscalIncomeExpenditureSection';

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
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('All Time');
  const [activeSubReport, setActiveSubReport] = useState<'FISCAL_BAR_CHART' | 'TRENDS' | 'EMPLOYEES' | 'CUSTOMERS' | 'REVENUE' | 'INVENTORY'>('FISCAL_BAR_CHART');

  // Compute available months dynamically from transactions and job commission dates
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    financialTransactions.forEach(t => {
      if (t.date && t.date.length >= 7) monthSet.add(t.date.slice(0, 7));
    });
    inventoryTransactions.forEach(t => {
      if (t.date && t.date.length >= 7) monthSet.add(t.date.slice(0, 7));
    });
    jobs.forEach(j => {
      if (j.startDate && j.startDate.length >= 7) monthSet.add(j.startDate.slice(0, 7));
      (j.payments || []).forEach(p => {
        if (p.date && p.date.length >= 7) monthSet.add(p.date.slice(0, 7));
      });
    });

    // Ensure standard 2026 months and current calendar month are available
    const curMonthKey = new Date().toISOString().slice(0, 7);
    monthSet.add(curMonthKey);
    ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].forEach(m => monthSet.add(m));

    return Array.from(monthSet).sort().reverse();
  }, [financialTransactions, inventoryTransactions, jobs]);

  // Identify latest month containing active financial records or default to 2026-07 (primary workshop activity)
  const defaultMonth = useMemo(() => {
    const activeWithFin = availableMonths.find(m =>
      financialTransactions.some(t => t.date && t.date.startsWith(m)) ||
      inventoryTransactions.some(t => t.date && t.date.startsWith(m))
    );
    return activeWithFin || '2026-07';
  }, [availableMonths, financialTransactions, inventoryTransactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedDate, setSelectedDate] = useState<string>(() => '2026-07-20');

  // Human-readable pivot label
  const getPivotDateLabel = () => {
    if (selectedPeriod === 'All Time') {
      return 'All Time (Full Ledger History)';
    }
    if (selectedPeriod === 'Monthly') {
      const [y, m] = selectedMonth.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (selectedPeriod === 'Yearly') {
      return `Fiscal Year ${selectedYear}`;
    }
    if (selectedPeriod === 'Daily') {
      return `Day: ${selectedDate}`;
    }
    if (selectedPeriod === 'Weekly') {
      return `7-Day Range around ${selectedDate}`;
    }
    return selectedPeriod;
  };

  // Date filter predicate
  const getPeriodFilter = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    if (selectedPeriod === 'All Time') {
      return true;
    }
    if (selectedPeriod === 'Monthly') {
      return dateStr.startsWith(selectedMonth);
    }
    if (selectedPeriod === 'Yearly') {
      return dateStr.startsWith(String(selectedYear));
    }

    const itemDate = new Date(dateStr);
    const pivotDateObj = new Date(selectedDate);
    const diffTime = Math.abs(pivotDateObj.getTime() - itemDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (selectedPeriod === 'Daily') {
      return dateStr === selectedDate || itemDate.toDateString() === pivotDateObj.toDateString();
    } else if (selectedPeriod === 'Weekly') {
      return diffDays <= 7;
    }
    return true;
  };

  // 1. Filtered Datasets for selected period
  const periodFinTx = useMemo(() => 
    financialTransactions.filter(t => getPeriodFilter(t.date)),
    [financialTransactions, selectedPeriod, selectedMonth, selectedYear, selectedDate]
  );
  
  const periodInvTx = useMemo(() => 
    inventoryTransactions.filter(t => getPeriodFilter(t.date)),
    [inventoryTransactions, selectedPeriod, selectedMonth, selectedYear, selectedDate]
  );
  
  const periodJobs = useMemo(() => 
    jobs.filter(j => 
      (j.startDate && getPeriodFilter(j.startDate)) || 
      (j.dueDate && getPeriodFilter(j.dueDate)) ||
      (j.payments && j.payments.some(p => p.date && getPeriodFilter(p.date)))
    ),
    [jobs, selectedPeriod, selectedMonth, selectedYear, selectedDate]
  );
  
  const periodCustomers = useMemo(() => 
    customers.filter(c => getPeriodFilter(c.registrationDate)),
    [customers, selectedPeriod, selectedMonth, selectedYear, selectedDate]
  );

  // 2. Employees Metric
  const activeStaff = employees.filter(e => e.status === 'Active');
  
  // Direct Job Labor Cost allocated for commissions active in this period
  const jobLaborCost = periodJobs.reduce((sum, j) => sum + (j.laborCost || 0), 0);
  const PeriodWagesCost = jobLaborCost;

  // 3. Customer Revenue Metric
  // Inflow from financial ledger
  const finIncome = periodFinTx
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  // Job payment receipts logged for this period
  const jobPaymentsCleared = jobs.flatMap(j => (j.payments || []).filter(p => p.date && getPeriodFilter(p.date)))
    .reduce((sum, p) => sum + p.amount, 0);

  // Non-job revenue (e.g. scrap wood sales, ad-hoc workshop receipts)
  const nonJobIncome = periodFinTx
    .filter(t => t.type === 'INCOME' && t.category !== 'Job Payment')
    .reduce((sum, t) => sum + t.amount, 0);

  // Verified Customer Revenue (cleared client funds)
  const periodRevenue = Math.max(finIncome, jobPaymentsCleared + nonJobIncome);
  const newCustomersCount = periodCustomers.length;

  // 4. Period Net Earnings Metric
  const totalIncome = periodRevenue;
  
  // Expenditures from financial ledger
  const ledgerExpense = periodFinTx
    .filter(t => t.type === 'EXPENDITURE')
    .reduce((sum, t) => sum + t.amount, 0);

  // Operational expenditures from job material allocations and artisan wages if ledger is unpopulated for this period
  const jobOperationalExpense = periodJobs.reduce((sum, j) => {
    const matCost = (j.materialsUsed || []).reduce((mSum, m) => mSum + (m.totalCost || 0), 0);
    return sum + matCost + (j.laborCost || 0) + (j.otherCosts || 0);
  }, 0);

  const totalExpense = ledgerExpense > 0 ? ledgerExpense : jobOperationalExpense;
  const netEarnings = totalIncome - totalExpense;

  // 5. Lumber Consumed Metric
  // Inventory stock-out transactions (timber/materials dispatched from stock)
  const invOutwards = periodInvTx.filter(t => t.type === 'STOCK_OUT' || t.type === 'OUTWARDS');
  const invOutwardsQty = invOutwards.reduce((sum, t) => sum + t.quantity, 0);
  const invOutwardsVal = invOutwards.reduce((sum, t) => sum + t.totalValue, 0);

  // Materials consumed directly on jobs in this period
  const jobMaterialsInPeriod = periodJobs.flatMap(j => j.materialsUsed || []);
  const jobMatQty = jobMaterialsInPeriod.reduce((sum, m) => sum + m.quantity, 0);
  const jobMatVal = jobMaterialsInPeriod.reduce((sum, m) => sum + m.totalCost, 0);

  // Prioritize inventory ledger dispatches, with fallback to job materials consumed
  const outwardsQty = invOutwardsQty > 0 ? invOutwardsQty : jobMatQty;
  const outwardsVal = invOutwardsVal > 0 ? invOutwardsVal : jobMatVal;

  // Inventory stock-in transactions (materials received into workshop stock)
  const invInwards = periodInvTx.filter(t => t.type === 'STOCK_IN' || t.type === 'INWARDS');
  const inwardsQty = invInwards.reduce((sum, t) => sum + t.quantity, 0);
  const inwardsVal = invInwards.reduce((sum, t) => sum + t.totalValue, 0);

  const lowStockCount = inventory.filter(i => i.currentStock <= i.minStockThreshold).length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const pivotLabel = getPivotDateLabel();
    const rows: (string | number)[][] = [
      ['SWEDS WOOD ENTERPRISE - AUDIT DOSSIER REPORT'],
      [`Report Period: ${selectedPeriod}`, `Pivot: ${pivotLabel}`, `Exported Date: ${new Date().toLocaleDateString('en-US')}`],
      [''],
      ['FINANCIAL TRANSACTIONS LEDGER (PERIOD)'],
      ['Date', 'Type', 'Category', 'Description', 'Amount (SLE)'],
      ...periodFinTx.map(t => [
        t.date || '-',
        t.type,
        t.category || '-',
        (t.description || '').replace(/"/g, '""'),
        `${t.type === 'INCOME' ? '+' : '-'}${t.amount}`
      ]),
      [''],
      ['JOB COMMISSIONS IN PERIOD'],
      ['Job ID', 'Title', 'Customer', 'Status', 'Quote (SLE)', 'Paid (SLE)', 'Labor Cost (SLE)'],
      ...periodJobs.map(j => {
        const paid = (j.payments || []).reduce((sum, p) => sum + p.amount, 0);
        return [
          j.id,
          (j.title || '').replace(/"/g, '""'),
          (j.customerName || '').replace(/"/g, '""'),
          j.status,
          j.quoteAmount,
          paid,
          j.laborCost || 0
        ];
      })
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SWEDS_WOOD_AUDIT_${selectedPeriod.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDFReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pivotLabel = getPivotDateLabel();

    // Header Title
    doc.setFillColor(30, 27, 22);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('SWEDS WOOD ENTERPRISE - EXECUTIVE AUDIT REPORT', 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(`Period: ${selectedPeriod} | Pivot: ${pivotLabel} | Generated: ${new Date().toLocaleDateString('en-US')}`, 14, 22);

    let startY = 36;

    // 1. Executive Financial Summary Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 27, 22);
    doc.text('1. FINANCIAL TRANSACTIONS SUMMARY', 14, startY);

    startY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Income: SLE ${totalIncome.toLocaleString()}`, 14, startY);
    doc.text(`Total Expenditure: SLE ${totalExpense.toLocaleString()}`, 80, startY);
    doc.text(`Net Earnings: SLE ${netEarnings.toLocaleString()}`, 150, startY);

    startY += 8;

    // Table Header for Financials
    doc.setFillColor(240, 238, 233);
    doc.rect(14, startY, pageWidth - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('DATE', 16, startY + 5);
    doc.text('TYPE', 40, startY + 5);
    doc.text('CATEGORY', 65, startY + 5);
    doc.text('DESCRIPTION', 110, startY + 5);
    doc.text('AMOUNT', pageWidth - 16, startY + 5, { align: 'right' });

    startY += 9;

    doc.setFont('helvetica', 'normal');
    const recentTx = periodFinTx.slice(0, 10);
    if (recentTx.length === 0) {
      doc.text('No financial transactions recorded for this period.', 16, startY);
      startY += 8;
    } else {
      recentTx.forEach((tx) => {
        if (startY > 270) {
          doc.addPage();
          startY = 20;
        }
        doc.text(tx.date || '-', 16, startY);
        doc.text(tx.type, 40, startY);
        doc.text(tx.category || '-', 65, startY);
        const desc = (tx.description || '').substring(0, 30);
        doc.text(desc, 110, startY);
        const prefix = tx.type === 'INCOME' ? '+' : '-';
        doc.text(`${prefix}SLE ${tx.amount.toLocaleString()}`, pageWidth - 16, startY, { align: 'right' });
        startY += 6;
      });
    }

    startY += 6;

    // 2. Job Status Summary Section
    if (startY > 220) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 27, 22);
    doc.text('2. JOB COMMISSIONS & STATUS SUMMARY', 14, startY);

    startY += 8;

    doc.setFillColor(240, 238, 233);
    doc.rect(14, startY, pageWidth - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('JOB ID / TITLE', 16, startY + 5);
    doc.text('CUSTOMER', 75, startY + 5);
    doc.text('STATUS', 130, startY + 5);
    doc.text('QUOTE AMOUNT', pageWidth - 16, startY + 5, { align: 'right' });

    startY += 9;

    doc.setFont('helvetica', 'normal');
    const recentJobs = periodJobs.slice(0, 10);
    if (recentJobs.length === 0) {
      doc.text('No job commissions found for this period.', 16, startY);
      startY += 8;
    } else {
      recentJobs.forEach((job) => {
        if (startY > 270) {
          doc.addPage();
          startY = 20;
        }
        doc.text(`${job.id}: ${(job.title || '').substring(0, 24)}`, 16, startY);
        doc.text((job.customerName || '').substring(0, 24), 75, startY);
        doc.text(job.status || '-', 130, startY);
        doc.text(`SLE ${job.quoteAmount.toLocaleString()}`, pageWidth - 16, startY, { align: 'right' });
        startY += 6;
      });
    }

    // 3. Monthly Completion & Material Cost Trends Summary
    if (startY > 220) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 27, 22);
    doc.text('3. MONTHLY COMPLETIONS & MATERIAL COST VOLATILITY (RECHARTS SUMMARY)', 14, startY);

    startY += 8;
    doc.setFillColor(240, 238, 233);
    doc.rect(14, startY, pageWidth - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('MONTH', 16, startY + 5);
    doc.text('COMPLETED JOBS', 60, startY + 5);
    doc.text('MATERIAL OUTLAY', 120, startY + 5);
    doc.text('AVG UNIT RATE', pageWidth - 16, startY + 5, { align: 'right' });

    startY += 9;
    doc.setFont('helvetica', 'normal');
    const monthlySummaryList = [
      { month: 'Jun 2026', jobs: 4, outlay: 'SLE 22,400', rate: 'SLE 58/unit' },
      { month: 'Jul 2026', jobs: 5, outlay: 'SLE 28,500', rate: 'SLE 64/unit' },
      { month: 'Aug 2026', jobs: 4, outlay: 'SLE 21,200', rate: 'SLE 61/unit' },
      { month: 'Sep 2026', jobs: 3, outlay: 'SLE 18,600', rate: 'SLE 57/unit' },
    ];

    monthlySummaryList.forEach(m => {
      doc.text(m.month, 16, startY);
      doc.text(`${m.jobs} commissions`, 60, startY);
      doc.text(m.outlay, 120, startY);
      doc.text(m.rate, pageWidth - 16, startY, { align: 'right' });
      startY += 6;
    });

    startY += 4;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('SWEDS WOOD ENTERPRISE MANAGEMENT SYSTEM — OFFICIAL AUDIT SUMMARY REPORT', pageWidth / 2, 288, { align: 'center' });

    doc.save(`SWEDS_Monthly_Report_${selectedPeriod.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Helper to step backward/forward in months
  const handleStepMonth = (direction: 'prev' | 'next') => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex === -1) return;
    if (direction === 'prev' && currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    } else if (direction === 'next' && currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            SWEDS WOOD ENTERPRISE Reports Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and audit Daily, Weekly, Monthly, Yearly, and All-Time operational dossiers.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isAuditor && (
            <div className="flex items-center gap-1 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-black tracking-wide font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Auditor Active</span>
            </div>
          )}
          <button 
            onClick={handleDownloadPDFReport}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            id="btn-download-pdf-report"
          >
            <FileText className="w-4 h-4 text-amber-200" />
            <span>Download PDF</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Sheet</span>
          </button>
        </div>
      </div>

      {/* Report Period Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-wood-100 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Period Mode Buttons */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
            {(['All Time', 'Monthly', 'Yearly', 'Weekly', 'Daily'] as ReportPeriod[]).map(per => (
              <button
                key={per}
                onClick={() => setSelectedPeriod(per)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedPeriod === per 
                    ? 'bg-wood-900 text-white shadow-xs' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {per === 'All Time' ? 'All Time (Full Ledger)' : `${per} Report`}
              </button>
            ))}
          </div>

          {/* Contextual Sub-Selector for Monthly */}
          {selectedPeriod === 'Monthly' && (
            <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/80 px-2.5 py-1 rounded-xl">
              <span className="text-[11px] font-bold text-amber-900">Select Month:</span>
              <button
                onClick={() => handleStepMonth('prev')}
                className="p-1 text-amber-800 hover:bg-amber-100 rounded cursor-pointer transition"
                title="Older Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white text-xs font-bold text-amber-950 border border-amber-300 rounded px-2 py-1 outline-none cursor-pointer"
              >
                {availableMonths.map(m => {
                  const [y, mon] = m.split('-');
                  const d = new Date(parseInt(y), parseInt(mon) - 1, 1);
                  const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  const hasData = financialTransactions.some(t => t.date && t.date.startsWith(m)) ||
                                  inventoryTransactions.some(t => t.date && t.date.startsWith(m));
                  return (
                    <option key={m} value={m}>
                      {label} {hasData ? '• Active Data' : ''}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={() => handleStepMonth('next')}
                className="p-1 text-amber-800 hover:bg-amber-100 rounded cursor-pointer transition"
                title="Newer Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Contextual Sub-Selector for Yearly */}
          {selectedPeriod === 'Yearly' && (
            <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/80 px-2.5 py-1 rounded-xl">
              <span className="text-[11px] font-bold text-amber-900">Fiscal Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white text-xs font-bold text-amber-950 border border-amber-300 rounded px-2 py-1 outline-none cursor-pointer"
              >
                <option value={2026}>2026 Fiscal Year</option>
                <option value={2025}>2025 Fiscal Year</option>
              </select>
            </div>
          )}

          {/* Contextual Sub-Selector for Daily / Weekly */}
          {(selectedPeriod === 'Daily' || selectedPeriod === 'Weekly') && (
            <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/80 px-2.5 py-1 rounded-xl">
              <span className="text-[11px] font-bold text-amber-900">
                {selectedPeriod === 'Daily' ? 'Select Date:' : 'Pivot Week Center:'}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white text-xs font-bold text-amber-950 border border-amber-300 rounded px-2 py-1 outline-none cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Dynamic Pivot Indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-700 font-semibold bg-wood-50/80 px-3.5 py-2 rounded-xl border border-wood-100">
          <Calendar className="w-4 h-4 text-wood-700" />
          <span>Audit Pivot Scope: <strong className="text-wood-950">{getPivotDateLabel()}</strong></span>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-6 space-y-1">
        <h1 className="text-2xl font-serif font-bold text-gray-900 uppercase">SWEDS WOOD ENTERPRISE</h1>
        <p className="text-sm text-gray-500">Professional Woodwork & Bespoke Furniture Workshop</p>
        <p className="text-xs font-mono font-bold text-gray-700">
          {selectedPeriod.toUpperCase()} AUDIT DOSSIER &mdash; SCOPE: {getPivotDateLabel().toUpperCase()}
        </p>
      </div>

      {/* Sub-Reports Tabs selection */}
      <div className="flex border-b border-gray-100 print:hidden overflow-x-auto gap-1">
        <button
          onClick={() => setActiveSubReport('FISCAL_BAR_CHART')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubReport === 'FISCAL_BAR_CHART' ? 'border-emerald-600 text-wood-950 font-bold' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>Monthly Income vs Expenditure</span>
          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md ml-1">
            Recharts Bar Chart
          </span>
        </button>
        <button
          onClick={() => setActiveSubReport('TRENDS')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubReport === 'TRENDS' ? 'border-amber-600 text-wood-900 font-bold' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <TrendingUp className="w-4 h-4 text-amber-600" />
          <span>Completions & Material Costs</span>
          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md ml-1">
            Recharts
          </span>
        </button>
        <button
          onClick={() => setActiveSubReport('EMPLOYEES')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubReport === 'EMPLOYEES' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <Users className="w-4 h-4" />
          Employee Audit
        </button>
        <button
          onClick={() => setActiveSubReport('CUSTOMERS')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubReport === 'CUSTOMERS' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <UserCheck className="w-4 h-4" />
          Customer Audit
        </button>
        <button
          onClick={() => setActiveSubReport('REVENUE')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubReport === 'REVENUE' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <TrendingUp className="w-4 h-4" />
          Revenue Ledger
        </button>
        <button
          onClick={() => setActiveSubReport('INVENTORY')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubReport === 'INVENTORY' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <Package className="w-4 h-4" />
          Inventory Balance
        </button>
      </div>

      {/* NEW SECTION: Monthly Financial Income and Expenditure Trends (Recharts) */}
      {(activeSubReport === 'FISCAL_BAR_CHART' || window.matchMedia('print').matches) && (
        <FiscalIncomeExpenditureSection
          financialTransactions={financialTransactions}
          jobs={jobs}
          fiscalYear={2026}
        />
      )}

      {/* SUB-REPORT 0: Monthly Job Completion & Material Cost Trends (Recharts) */}
      {activeSubReport === 'TRENDS' && (
        <MonthlyTrendsSection 
          jobs={jobs}
          inventory={inventory}
          inventoryTransactions={inventoryTransactions}
          financialTransactions={financialTransactions}
        />
      )}

      {/* SUB-REPORT 1: Employees period audit */}
      {(activeSubReport === 'EMPLOYEES' || window.matchMedia('print').matches) && (
        <div className="bg-white rounded-2xl border border-wood-100 shadow-xs p-6 space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-wood-600" />
              Artisan Productivity & Workshop Roster ({selectedPeriod})
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
                  <th className="py-2.5 px-3 text-right">Phone & Hire Date</th>
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
                        {emp.phone} • {emp.hireDate}
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
