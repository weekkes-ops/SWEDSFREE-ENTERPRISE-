import { useState, FormEvent } from 'react';
import { FinancialTransaction, FinancialCategory, formatCurrency, Employee } from '../types';
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
  Trash2
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
}

export default function FinancialLedger({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  currentUser
}: FinancialLedgerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'ANALYTICS'>('LEDGER');

  // Form states - Add Transaction
  const [type, setType] = useState<'INCOME' | 'EXPENDITURE'>('INCOME');
  const [category, setCategory] = useState<FinancialCategory>('Job Payment');
  const [amount, setAmount] = useState(1500);
  const [date, setDate] = useState('2026-07-20');
  const [description, setDescription] = useState('');

  // Form states - Edit Transaction
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [editType, setEditType] = useState<'INCOME' | 'EXPENDITURE'>('INCOME');
  const [editCategory, setEditCategory] = useState<FinancialCategory>('Job Payment');
  const [editAmount, setEditAmount] = useState(1500);
  const [editDate, setEditDate] = useState('2026-07-20');
  const [editDescription, setEditDescription] = useState('');

  const handleTypeChange = (newType: 'INCOME' | 'EXPENDITURE') => {
    setType(newType);
    if (newType === 'INCOME') {
      setCategory('Job Payment');
    } else {
      setCategory('Material Purchase');
    }
  };

  const handleEditTypeChange = (newType: 'INCOME' | 'EXPENDITURE') => {
    setEditType(newType);
    if (newType === 'INCOME') {
      setEditCategory('Job Payment');
    } else {
      setEditCategory('Material Purchase');
    }
  };

  const handleStartEdit = (t: FinancialTransaction) => {
    setEditingTransaction(t);
    setEditType(t.type);
    setEditCategory(t.category);
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
      description
    });

    // Reset Form
    setDescription('');
    setAmount(1000);
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
        description: editDescription
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

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenditure = transactions
    .filter(t => t.type === 'EXPENDITURE')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenditure;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

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
    <div className="space-y-6">
      
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Income & Expenditure Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit the woodwork workshop capital ledger, review cost allocations, and check net profitability metrics.
          </p>
        </div>
        
        {!isAuditor ? (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Cash Transaction</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold font-mono">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>Auditor (Read-Only)</span>
          </div>
        )}
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
            <p className="text-[10px] text-gray-400 mt-0.5">Wages, raw wood & overheads</p>
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
      <div className="flex border-b border-gray-100">
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
        /* Ledger List */
        <div className="bg-white rounded-2xl border border-wood-100 shadow-xs overflow-hidden">
          <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-800 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-wood-600" />
              General Cash Ledger
            </h3>
            <span className="text-xs text-gray-400 font-semibold">
              Showing {transactions.length} record(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  <th className="py-3 px-4">Clearance Date</th>
                  <th className="py-3 px-4">Transaction Details</th>
                  <th className="py-3 px-4">Cost Category</th>
                  <th className="py-3 px-4 text-center">Inflow / Outflow</th>
                  <th className="py-3 px-4 text-right">Cleared Amount</th>
                  {!isAuditor && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {[...transactions].reverse().map(t => {
                  const isInc = t.type === 'INCOME';
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500 whitespace-nowrap">{t.date}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        {t.description}
                        {t.referenceId && (
                          <span className="block text-[10px] font-semibold text-wood-600 uppercase">Ref: {t.referenceId}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-gray-500">{t.category}</td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 text-[10px] font-bold rounded-md border uppercase ${isInc ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          {isInc ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {t.type}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${isInc ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isInc ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      {!isAuditor && (
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
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
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                      className={`py-2 text-xs font-bold rounded-xl border transition ${type === 'INCOME' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                    >
                      Inwards (Income)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('EXPENDITURE')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${type === 'EXPENDITURE' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                    >
                      Outwards (Expense)
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
                          <option value="Job Payment">Job Payment</option>
                          <option value="Custom Commission">Custom Commission</option>
                          <option value="Scrap wood sale">Scrap wood sale</option>
                          <option value="Other">Other Miscellaneous</option>
                        </>
                      ) : (
                        <>
                          <option value="Material Purchase">Material Purchase</option>
                          <option value="Employee Wages">Employee Wages</option>
                          <option value="Rent">Rent</option>
                          <option value="Tools & Maintenance">Tools & Maintenance</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Overhead">Overhead</option>
                          <option value="Other">Other Expenses</option>
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Amount (Le) *</label>
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
                      className={`py-2 text-xs font-bold rounded-xl border transition ${editType === 'INCOME' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                    >
                      Inwards (Income)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditTypeChange('EXPENDITURE')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${editType === 'EXPENDITURE' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                    >
                      Outwards (Expense)
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
                          <option value="Job Payment">Job Payment</option>
                          <option value="Custom Commission">Custom Commission</option>
                          <option value="Scrap wood sale">Scrap wood sale</option>
                          <option value="Other">Other Miscellaneous</option>
                        </>
                      ) : (
                        <>
                          <option value="Material Purchase">Material Purchase</option>
                          <option value="Employee Wages">Employee Wages</option>
                          <option value="Rent">Rent</option>
                          <option value="Tools & Maintenance">Tools & Maintenance</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Overhead">Overhead</option>
                          <option value="Other">Other Expenses</option>
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Amount (Le) *</label>
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
      </AnimatePresence>

    </div>
  );
}
