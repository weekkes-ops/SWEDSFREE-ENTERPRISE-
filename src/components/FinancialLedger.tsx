import { useState, FormEvent } from 'react';
import { FinancialTransaction, FinancialCategory, formatCurrency, Employee } from '../types';
import { printDocument } from '../utils/printHelper';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowDownRight, 
  ArrowUpRight, 
  PieChart as PieIcon, 
  BarChart as BarIcon,
  ShieldAlert,
  Edit2,
  Trash2,
  Receipt,
  Printer,
  Download,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

interface FinancialLedgerProps {
  transactions: FinancialTransaction[];
  onAddTransaction: (transaction: Omit<FinancialTransaction, 'id'>) => void;
  onUpdateTransaction?: (transaction: FinancialTransaction) => void;
  onDeleteTransaction?: (id: string) => void;
  currentUser?: Employee | null;
  onTriggerReceipt?: (jobId?: string) => void;
}

export default function FinancialLedger({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  currentUser,
  onTriggerReceipt
}: FinancialLedgerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInlineForm, setShowInlineForm] = useState(true);
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'ANALYTICS'>('LEDGER');

  // Filter & Print states
  const [ledgerFilterType, setLedgerFilterType] = useState<'ALL' | 'INCOME' | 'EXPENDITURE'>('ALL');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [voucherTransaction, setVoucherTransaction] = useState<FinancialTransaction | null>(null);

  // Form states - Add Transaction
  const [type, setType] = useState<'INCOME' | 'EXPENDITURE'>('INCOME');
  const [category, setCategory] = useState<FinancialCategory>('wood');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [amount, setAmount] = useState(1500);
  const [date, setDate] = useState('2026-07-20');
  const [description, setDescription] = useState('');

  // Form states - Edit Transaction
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [editType, setEditType] = useState<'INCOME' | 'EXPENDITURE'>('INCOME');
  const [editCategory, setEditCategory] = useState<FinancialCategory>('wood');
  const [editQuantity, setEditQuantity] = useState<number | ''>('');
  const [editUnitCost, setEditUnitCost] = useState<number | ''>('');
  const [editAmount, setEditAmount] = useState(1500);
  const [editDate, setEditDate] = useState('2026-07-20');
  const [editDescription, setEditDescription] = useState('');

  const handleTypeChange = (newType: 'INCOME' | 'EXPENDITURE') => {
    setType(newType);
    if (newType === 'INCOME') {
      setCategory('wood');
    } else {
      setCategory('Tools and generator');
    }
  };

  const handleEditTypeChange = (newType: 'INCOME' | 'EXPENDITURE') => {
    setEditType(newType);
    if (newType === 'INCOME') {
      setEditCategory('wood');
    } else {
      setEditCategory('Tools and generator');
    }
  };

  const handleStartEdit = (t: FinancialTransaction) => {
    setEditingTransaction(t);
    setEditType(t.type);
    setEditCategory(t.category);
    setEditQuantity(t.quantity !== undefined ? t.quantity : '');
    setEditUnitCost(t.unitCost !== undefined ? t.unitCost : '');
    setEditAmount(t.amount);
    setEditDate(t.date);
    setEditDescription(t.description);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    onAddTransaction({
      type,
      category,
      amount,
      date,
      description,
      quantity: typeof quantity === 'number' && quantity > 0 ? quantity : undefined,
      unitCost: typeof unitCost === 'number' && unitCost > 0 ? unitCost : undefined
    });

    // Reset Form
    setDescription('');
    setAmount(1000);
    setQuantity('');
    setUnitCost('');
    setShowAddModal(false);
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !editDescription.trim() || editAmount <= 0) return;

    if (onUpdateTransaction) {
      onUpdateTransaction({
        ...editingTransaction,
        type: editType,
        category: editCategory,
        amount: editAmount,
        date: editDate,
        description: editDescription,
        quantity: typeof editQuantity === 'number' && editQuantity > 0 ? editQuantity : undefined,
        unitCost: typeof editUnitCost === 'number' && editUnitCost > 0 ? editUnitCost : undefined
      });
    }

    setEditingTransaction(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this transaction record?")) {
      if (onDeleteTransaction) {
        onDeleteTransaction(id);
      }
    }
  };

  // Filtered transactions for ledger table & print
  const filteredTransactions = [...transactions]
    .reverse()
    .filter(t => {
      if (ledgerFilterType !== 'ALL' && t.type !== ledgerFilterType) return false;
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        const matchDate = (t.date || '').toLowerCase().includes(q);
        const matchRef = (t.referenceId || '').toLowerCase().includes(q);
        if (!matchDesc && !matchCat && !matchDate && !matchRef) return false;
      }
      return true;
    });

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenditure = transactions
    .filter(t => t.type === 'EXPENDITURE')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenditure;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const filteredIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpenditure = filteredTransactions
    .filter(t => t.type === 'EXPENDITURE')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredNet = filteredIncome - filteredExpenditure;

  const handlePrintLedger = () => {
    if (activeTab !== 'LEDGER') {
      setActiveTab('LEDGER');
      setTimeout(() => {
        printDocument('financial-ledger');
      }, 150);
    } else {
      printDocument('financial-ledger');
    }
  };

  const handlePrintVoucher = (tx: FinancialTransaction) => {
    setVoucherTransaction(tx);
    setTimeout(() => {
      printDocument('financial-voucher');
    }, 180);
  };

  const handleExportCSV = () => {
    const headers = ['Clearance Date', 'Transaction ID', 'Reference ID', 'Flow Type', 'Category', 'Description', 'Quantity', 'Unit Cost (Le)', 'Cleared Amount (Le)'];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.id,
      t.referenceId || '-',
      t.type,
      t.category,
      (t.description || '').replace(/"/g, '""'),
      t.quantity ?? '-',
      t.unitCost ?? '-',
      `${t.type === 'INCOME' ? '+' : '-'}${t.amount}`
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SWEDS_FINANCIAL_LEDGER_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart 1: Group Income & Expenditures by Month
  // Let's extract Month/Year (e.g. "Jun 2026", "Jul 2026")
  const monthlyDataMap: { [key: string]: { name: string; Income: number; Expense: number } } = {};
  transactions.forEach(t => {
    const d = new Date(t.date);
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (!monthlyDataMap[label]) {
      monthlyDataMap[label] = { name: label, Income: 0, Expense: 0 };
    }
    if (t.type === 'INCOME') {
      monthlyDataMap[label].Income += t.amount;
    } else {
      monthlyDataMap[label].Expense += t.amount;
    }
  });

  const monthlyChartData = Object.values(monthlyDataMap).sort((a, b) => {
    const dateA = new Date(a.name);
    const dateB = new Date(b.name);
    return dateA.getTime() - dateB.getTime();
  });

  // Chart 2: Expense category breakdown for Pie Chart
  const expenseBreakdownMap: { [key: string]: number } = {};
  transactions
    .filter(t => t.type === 'EXPENDITURE')
    .forEach(t => {
      expenseBreakdownMap[t.category] = (expenseBreakdownMap[t.category] || 0) + t.amount;
    });

  const pieColors = ['#9e4618', '#7e3214', '#dda46a', '#be5f21', '#3f150b', '#5e2210', '#ebcca3'];
  const expenseChartData = Object.entries(expenseBreakdownMap).map(([cat, val], idx) => ({
    name: cat,
    value: val,
    color: pieColors[idx % pieColors.length]
  }));

  return (
    <div id="financial-ledger-print-area" className="space-y-6 print:space-y-4 print:p-0">
      
      {/* Official Print-Only Statement Header */}
      <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">
              SWEDSFREE ENTERPRISE — OFFICIAL FINANCIAL LEDGER STATEMENT
            </h1>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              17F New England Ville, Freetown, Sierra Leone • Tel: +232 78 466480 / +232 76 442590
            </p>
            <p className="text-[11px] font-mono font-bold text-gray-800 mt-0.5">
              Official Bank Account: UBA Bank • BBAN: 540810160001602
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <p className="font-bold text-gray-900">
              Printed: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-gray-600">
              Filter: {ledgerFilterType === 'ALL' ? 'All Transactions' : ledgerFilterType} ({filteredTransactions.length} records)
            </p>
            {currentUser && (
              <p className="text-gray-600">
                Operator: {currentUser.name} ({currentUser.role})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Income & Expenditure Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit the woodwork workshop capital ledger, review cost allocations, and check net profitability metrics.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintLedger}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="Print Official Financial Ledger Statement"
          >
            <Printer className="w-4 h-4" />
            <span>Print Ledger</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Export Financial Ledger to CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {!isAuditor ? (
            <>
              <button 
                onClick={() => setShowInlineForm(prev => !prev)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-50 text-wood-900 border border-wood-200 hover:bg-wood-100 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 text-wood-700" />
                <span>{showInlineForm ? 'Hide Cash Form' : 'Record Cash Transaction'}</span>
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Cash Transaction</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold font-mono">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Auditor (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Analytics KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Total Inflow / Revenue</span>
            <h3 className="text-xl font-bold font-mono text-emerald-700 mt-1">
              +{formatCurrency(totalIncome)}
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Cleared customer payments</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Total Outflow / Cost</span>
            <h3 className="text-xl font-bold font-mono text-red-600 mt-1">
              -{formatCurrency(totalExpenditure)}
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Raw wood, workshop & overheads</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-600 border border-red-100">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Net Profit / Earnings</span>
            <h3 className={`text-xl font-bold font-mono mt-1 ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {netProfit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netProfit))}
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Swedsfree retained profit</p>
          </div>
          <div className="p-3 bg-wood-50 rounded-xl text-wood-700 border border-wood-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Workshop Net Margin</span>
            <h3 className="text-xl font-bold font-mono text-wood-800 mt-1">
              {margin.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Gross profit ratio</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 print:hidden">
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'LEDGER' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Workshop Cash Ledger
        </button>
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'ANALYTICS' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Analytics Visualizers
        </button>
      </div>

      {activeTab === 'LEDGER' ? (
        <div className="space-y-6">
          {/* Cash Transaction Entry Form Panel */}
          {!isAuditor && (
            <div className="bg-white rounded-2xl border border-wood-100 shadow-xs overflow-hidden print:hidden">
              <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-wood-100 text-wood-700 rounded-xl">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-gray-900 text-sm">
                      Cash Transaction Form
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Record cash income or expenditure with dedicated Quantity & Unit Cost calculations
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInlineForm(prev => !prev)}
                  className="text-xs font-bold text-wood-700 hover:text-wood-900 px-3 py-1.5 bg-wood-50 hover:bg-wood-100 rounded-xl border border-wood-200 transition cursor-pointer"
                >
                  {showInlineForm ? 'Hide Form' : 'Show Form'}
                </button>
              </div>

              {showInlineForm && (
                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 bg-white">
                  {/* Flow Type selector buttons */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Cash Flow Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleTypeChange('INCOME')}
                        className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${type === 'INCOME' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                      >
                        Cash Inflow (Income)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTypeChange('EXPENDITURE')}
                        className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${type === 'EXPENDITURE' ? 'bg-red-50 text-red-800 border-red-300 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                      >
                        Cash Outflow (Expense)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Cost Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as FinancialCategory)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                      >
                        {type === 'INCOME' ? (
                          <>
                            <option value="wood">wood</option>
                            <option value="sofa">sofa</option>
                            <option value="Chair">Chair</option>
                            <option value="Bed">Bed</option>
                            <option value="Wood Construction">Wood Construction</option>
                            <option value="others">others</option>
                          </>
                        ) : (
                          <>
                            <option value="Tools and generator">Tools and generator</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Transportation">Transportation</option>
                            <option value="Material Purchase">Material Purchase</option>
                            <option value="Tools and Maintenance">Tools and Maintenance</option>
                            <option value="Cast">Cast</option>
                            <option value="others">others</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Clearance Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold font-mono text-gray-700 bg-white"
                      />
                    </div>
                  </div>

                  {/* DEDICATED QUANTITY & UNIT COST SECTION */}
                  <div className="p-4 bg-wood-50/60 rounded-xl border border-wood-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-wood-900 uppercase tracking-wider">
                          Quantity & Unit Cost Section
                        </span>
                        <span className="text-[10px] bg-wood-200/70 text-wood-900 font-bold px-1.5 py-0.5 rounded-sm">
                          Auto-Calculation
                        </span>
                      </div>
                      {typeof quantity === 'number' && quantity > 0 && typeof unitCost === 'number' && unitCost > 0 ? (
                        <span className="text-xs text-emerald-800 font-extrabold font-mono bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200 self-start sm:self-auto">
                          {quantity} × Le {Number(unitCost).toLocaleString()} = Le {(Number(quantity) * Number(unitCost)).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-600 uppercase">Quantity (Units / Items)</label>
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          placeholder="e.g. 10"
                          value={quantity}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setQuantity(val);
                            if (typeof val === 'number' && val > 0 && typeof unitCost === 'number' && unitCost > 0) {
                              setAmount(Math.round(val * unitCost * 100) / 100);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-800 font-mono bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-600 uppercase">Unit Cost / Rate (Le)</label>
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          placeholder="e.g. 45000"
                          value={unitCost}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setUnitCost(val);
                            if (typeof val === 'number' && val > 0 && typeof quantity === 'number' && quantity > 0) {
                              setAmount(Math.round(quantity * val * 100) / 100);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-800 font-mono bg-white"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                      Specifying quantity & unit cost automatically computes the Total Cleared Amount below.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Total Amount (Le) *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-bold text-gray-900 font-mono bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Memo / Description *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Timber purchase restock receipt #104"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setDescription('');
                        setQuantity('');
                        setUnitCost('');
                        setAmount(1000);
                      }}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-bold transition cursor-pointer"
                    >
                      Clear
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Post Cash Transaction</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Ledger List */}
          <div className="bg-white rounded-2xl border border-wood-100 shadow-xs overflow-hidden print:border-gray-300 print:rounded-none print:shadow-none">
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:bg-white print:border-b-2 print:border-gray-800 print:px-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-gray-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-wood-600 print:hidden" />
                  General Cash Ledger
                </h3>
                <span className="text-xs text-gray-500 font-semibold bg-gray-100 px-2.5 py-0.5 rounded-md border border-gray-200">
                  {filteredTransactions.length} record(s)
                </span>
              </div>

              {/* Filter, Search & Print Toolbar */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search description, category, date..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white focus:border-wood-400 outline-hidden w-52 sm:w-60"
                  />
                </div>

                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-[11px] font-bold">
                  {(['ALL', 'INCOME', 'EXPENDITURE'] as const).map(ft => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setLedgerFilterType(ft)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        ledgerFilterType === ft
                          ? 'bg-wood-900 text-white shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {ft === 'ALL' ? 'All' : ft === 'INCOME' ? 'Inflow' : 'Outflow'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handlePrintLedger}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-wood-800 hover:bg-wood-950 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  title="Print General Cash Ledger Table"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ledger</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold print:bg-gray-100 print:text-gray-900 print:border-gray-300">
                    <th className="py-3 px-4">Clearance Date</th>
                    <th className="py-3 px-4">Transaction Details</th>
                    <th className="py-3 px-4">Cost Category</th>
                    <th className="py-3 px-4 text-center">Inflow / Outflow</th>
                    <th className="py-3 px-4 text-center">Quantity & Unit Cost</th>
                    <th className="py-3 px-4 text-right">Cleared Amount</th>
                    <th className="py-3 px-4 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-100 text-sm print:divide-gray-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-gray-400 font-medium">
                      No financial transactions match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => {
                    const isInc = t.type === 'INCOME';
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-500 whitespace-nowrap print:text-gray-900">{t.date}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-800 print:text-gray-900">
                          {t.description}
                          {t.referenceId && (
                            <span className="block text-[10px] font-semibold text-wood-600 uppercase print:text-gray-600">Ref: {t.referenceId}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-gray-500 print:text-gray-800">{t.category}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 text-[10px] font-bold rounded-md border uppercase ${isInc ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {isInc ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs whitespace-nowrap">
                          {t.quantity ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                                {t.quantity} <span className="text-[10px] font-sans text-gray-500 font-normal">units</span>
                              </span>
                              {t.unitCost ? (
                                <span className="block text-[10px] text-gray-500 font-medium">
                                  @ {formatCurrency(t.unitCost)}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${isInc ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isInc ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap print:hidden">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePrintVoucher(t)}
                              className="px-2 py-1 text-[10px] font-extrabold uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="Print Single Cash Transaction Voucher"
                            >
                              <Printer className="w-3 h-3 text-wood-700" />
                              <span>Print</span>
                            </button>
                            {!isAuditor && (
                              <>
                                {(isInc || t.referenceId) && onTriggerReceipt && (
                                  <button
                                    onClick={() => onTriggerReceipt(t.referenceId)}
                                    className="px-2 py-1 text-[10px] font-extrabold uppercase text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                                    title="Open Receipt Desk"
                                  >
                                    <Receipt className="w-3 h-3 text-emerald-600" />
                                    <span>Receipt</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleStartEdit(t)}
                                  className="p-1 text-slate-400 hover:text-wood-700 rounded-lg hover:bg-slate-100 transition"
                                  title="Edit Transaction"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(t.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50/50 transition"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredTransactions.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-mono text-xs font-bold print:bg-gray-100 print:border-gray-800">
                    <td colSpan={3} className="py-3 px-4 text-gray-800 uppercase font-sans">
                      Ledger Summary Totals ({filteredTransactions.length} Entries)
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-700">
                      In: +{formatCurrency(filteredIncome)}
                    </td>
                    <td className="py-3 px-4 text-center text-red-700">
                      Out: -{formatCurrency(filteredExpenditure)}
                    </td>
                    <td className={`py-3 px-4 text-right text-sm font-black ${filteredNet >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                      Net: {filteredNet >= 0 ? '+' : '-'}{formatCurrency(Math.abs(filteredNet))}
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Official Print-Only Verification Signature Footer */}
          <div className="hidden print:grid grid-cols-3 gap-8 pt-10 px-4 pb-4 border-t border-gray-300 mt-6 text-xs">
            <div>
              <p className="font-bold text-gray-700 uppercase">Prepared By (Finance / Admin):</p>
              <div className="border-b border-gray-800 h-8 mt-4"></div>
              <p className="text-[10px] text-gray-500 mt-1">Name, Signature & Date</p>
            </div>
            <div>
              <p className="font-bold text-gray-700 uppercase">Verified By (Internal Auditor):</p>
              <div className="border-b border-gray-800 h-8 mt-4"></div>
              <p className="text-[10px] text-gray-500 mt-1">Audit Stamp, Signature & Date</p>
            </div>
            <div>
              <p className="font-bold text-gray-700 uppercase">Approved By (Managing Director):</p>
              <div className="border-b border-gray-800 h-8 mt-4"></div>
              <p className="text-[10px] text-gray-500 mt-1">SWEDSFREE ENTERPRISE Authorization</p>
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* Charts / Analytics Tab */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Revenue vs Expenses Grouped Bar Chart */}
          <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
            <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
              <BarIcon className="w-4 h-4 text-wood-600" />
              Monthly Inflow vs Outflow Balance
            </h3>
            
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 500 }} stroke="#9ca3af" />
                  <YAxis tickFormatter={(val) => `Le ${val / 1000}k`} tick={{ fontSize: 10, fontWeight: 500 }} stroke="#9ca3af" />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} labelStyle={{ fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                  <Bar dataKey="Income" fill="#be5f21" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenditures Pie Chart breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-wood-100 shadow-xs space-y-4">
            <h3 className="font-display font-bold text-gray-900 flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-wood-600" />
              Workshop Expenditure Cost Allocation
            </h3>

            <div className="h-72 flex flex-col sm:flex-row items-center justify-center gap-4">
              {expenseChartData.length === 0 ? (
                <p className="text-xs text-gray-400 font-medium">No expenses logged yet for breakdown.</p>
              ) : (
                <>
                  <div className="flex-1 w-full h-full max-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {expenseChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Custom legend */}
                  <div className="flex flex-col gap-2 shrink-0 text-xs text-gray-600 font-medium max-w-[180px] overflow-y-auto max-h-[200px] pr-2">
                    {expenseChartData.map((e, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="w-3 h-3 rounded-md shrink-0 mt-0.5" style={{ backgroundColor: e.color }} />
                        <span className="truncate">{e.name}: <strong className="font-mono">{formatCurrency(e.value)}</strong></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {/* MODAL: Record custom income / expenditure */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Add Manual Cash Transaction</h3>
                  <p className="text-xs text-wood-200">Log standard workshop expenses, utility dispatches, or scraps sales.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-wood-300 hover:text-white font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                
                {/* Flow Type selector buttons */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Cash Flow Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('INCOME')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${type === 'INCOME' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      Cash Inflow (Income)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('EXPENDITURE')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${type === 'EXPENDITURE' ? 'bg-red-50 text-red-800 border-red-300 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      Cash Outflow (Expense)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as FinancialCategory)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      {type === 'INCOME' ? (
                        <>
                          <option value="wood">wood</option>
                          <option value="sofa">sofa</option>
                          <option value="Chair">Chair</option>
                          <option value="Bed">Bed</option>
                          <option value="Wood Construction">Wood Construction</option>
                          <option value="others">others</option>
                        </>
                      ) : (
                        <>
                          <option value="Tools and generator">Tools and generator</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Transportation">Transportation</option>
                          <option value="Material Purchase">Material Purchase</option>
                          <option value="Tools and Maintenance">Tools and Maintenance</option>
                          <option value="Cast">Cast</option>
                          <option value="others">others</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Transaction Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold font-mono text-gray-700"
                    />
                  </div>
                </div>

                <div className="p-3 bg-wood-50/60 rounded-xl border border-wood-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-wood-900 uppercase tracking-wider">
                      Quantity & Unit Cost Section
                    </span>
                    {quantity && unitCost ? (
                      <span className="text-[10px] text-emerald-700 font-bold font-mono">
                        {quantity} × Le {Number(unitCost).toLocaleString()} = Le {(Number(quantity) * Number(unitCost)).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase">Quantity (Units / Items)</label>
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        placeholder="e.g. 5"
                        value={quantity}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setQuantity(val);
                          if (typeof val === 'number' && val > 0 && typeof unitCost === 'number' && unitCost > 0) {
                            setAmount(Math.round(val * unitCost * 100) / 100);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase">Unit Cost / Rate (Le)</label>
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        placeholder="e.g. 300"
                        value={unitCost}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setUnitCost(val);
                          if (typeof val === 'number' && val > 0 && typeof quantity === 'number' && quantity > 0) {
                            setAmount(Math.round(quantity * val * 100) / 100);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    Entering quantity & unit rate auto-calculates Total Amount below (or enter/adjust total amount manually).
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Total Amount (Le) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Memo / Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cleared electricity electric saw utility bill"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs"
                  >
                    Post Transaction
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Edit Cash Transaction</h3>
                  <p className="text-xs text-wood-200">Modify the record properties inside the ledger.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="text-wood-300 hover:text-white font-bold text-xl"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                
                {/* Flow Type selector buttons */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Cash Flow Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditTypeChange('INCOME')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${editType === 'INCOME' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      Cash Inflow (Income)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditTypeChange('EXPENDITURE')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${editType === 'EXPENDITURE' ? 'bg-red-50 text-red-800 border-red-300 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      Cash Outflow (Expense)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as FinancialCategory)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      {editType === 'INCOME' ? (
                        <>
                          <option value="wood">wood</option>
                          <option value="sofa">sofa</option>
                          <option value="Chair">Chair</option>
                          <option value="Bed">Bed</option>
                          <option value="Wood Construction">Wood Construction</option>
                          <option value="others">others</option>
                        </>
                      ) : (
                        <>
                          <option value="Tools and generator">Tools and generator</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Transportation">Transportation</option>
                          <option value="Material Purchase">Material Purchase</option>
                          <option value="Tools and Maintenance">Tools and Maintenance</option>
                          <option value="Cast">Cast</option>
                          <option value="others">others</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Transaction Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold font-mono text-gray-700"
                    />
                  </div>
                </div>

                <div className="p-3 bg-wood-50/60 rounded-xl border border-wood-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-wood-900 uppercase tracking-wider">
                      Quantity & Unit Cost Section
                    </span>
                    {editQuantity && editUnitCost ? (
                      <span className="text-[10px] text-emerald-700 font-bold font-mono">
                        {editQuantity} × Le {Number(editUnitCost).toLocaleString()} = Le {(Number(editQuantity) * Number(editUnitCost)).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase">Quantity (Units / Items)</label>
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        placeholder="e.g. 5"
                        value={editQuantity}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setEditQuantity(val);
                          if (typeof val === 'number' && val > 0 && typeof editUnitCost === 'number' && editUnitCost > 0) {
                            setEditAmount(Math.round(val * editUnitCost * 100) / 100);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase">Unit Cost / Rate (Le)</label>
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        placeholder="e.g. 300"
                        value={editUnitCost}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setEditUnitCost(val);
                          if (typeof val === 'number' && val > 0 && typeof editQuantity === 'number' && editQuantity > 0) {
                            setEditAmount(Math.round(editQuantity * val * 100) / 100);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    Entering quantity & unit rate auto-calculates Total Amount below (or enter/adjust total amount manually).
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Total Amount (Le) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Memo / Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cleared electricity electric saw utility bill"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                  />
                </div>

                {editingTransaction.referenceId && (
                  <p className="text-[10px] text-gray-400 font-semibold italic">
                    Note: This is linked to system reference ID: {editingTransaction.referenceId}
                  </p>
                )}

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingTransaction(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Single Cash Transaction Printable Voucher Modal */}
        {voucherTransaction && (
          <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div
              id="financial-voucher-print-area"
              className="bg-white rounded-2xl border border-wood-200 shadow-2xl w-full max-w-xl overflow-hidden print:border-0 print:shadow-none print:rounded-none"
            >
              {/* Top Action Bar (Hidden in Print) */}
              <div className="bg-wood-950 px-5 py-3.5 text-white flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span className="font-display font-bold text-sm">Cash Transaction Voucher Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printDocument('financial-voucher')}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Voucher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherTransaction(null)}
                    className="p-1 text-wood-300 hover:text-white rounded-lg transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Voucher Body */}
              <div className="p-6 sm:p-8 space-y-6 text-gray-900">
                <div className="border-b-2 border-gray-900 pb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">
                      SWEDSFREE ENTERPRISE
                    </h2>
                    <p className="text-xs font-semibold text-gray-600">
                      17F New England Ville, Freetown, Sierra Leone
                    </p>
                    <p className="text-[11px] font-mono text-gray-600">
                      Tel: +232 78 466480 / +232 76 442590 • UBA Bank BBAN: 540810160001602
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase border ${
                      voucherTransaction.type === 'INCOME'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-red-50 text-red-800 border-red-300'
                    }`}>
                      {voucherTransaction.type === 'INCOME' ? 'CASH INFLOW VOUCHER' : 'CASH EXPENDITURE VOUCHER'}
                    </span>
                    <p className="text-xs font-mono font-bold text-gray-700 mt-1">
                      Voucher ID: {voucherTransaction.id.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Clearance Date</span>
                    <span className="font-mono font-bold text-gray-900 text-sm">{voucherTransaction.date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Cost Category</span>
                    <span className="font-bold text-gray-900 text-sm uppercase">{voucherTransaction.category}</span>
                  </div>
                  {voucherTransaction.referenceId && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">System Reference ID</span>
                      <span className="font-mono font-bold text-wood-800">{voucherTransaction.referenceId}</span>
                    </div>
                  )}
                  {voucherTransaction.quantity && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">Quantity & Unit Cost</span>
                      <span className="font-mono font-bold text-gray-900">
                        {voucherTransaction.quantity} units {voucherTransaction.unitCost ? `@ ${formatCurrency(voucherTransaction.unitCost)}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Transaction Description / Purpose</span>
                  <div className="p-4 rounded-xl border border-gray-200 bg-white font-semibold text-sm text-gray-900">
                    {voucherTransaction.description}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Total Cleared Amount
                  </span>
                  <span className="text-xl font-mono font-black">
                    {voucherTransaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(voucherTransaction.amount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-xs">
                  <div>
                    <p className="font-bold text-gray-600 uppercase">Prepared / Dispatched By:</p>
                    <div className="border-b border-gray-800 h-8 mt-4"></div>
                    <p className="text-[10px] text-gray-500 mt-1">Signature & Date</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-600 uppercase">Authorized / Received By:</p>
                    <div className="border-b border-gray-800 h-8 mt-4"></div>
                    <p className="text-[10px] text-gray-500 mt-1">Signature & Official Stamp</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
