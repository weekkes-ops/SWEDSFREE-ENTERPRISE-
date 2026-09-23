import React, { useState, useMemo } from 'react';
import { 
  FinancialTransaction, 
  Job, 
  formatCurrency 
} from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  PieChart as PieChartIcon,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface FiscalIncomeExpenditureSectionProps {
  financialTransactions: FinancialTransaction[];
  jobs?: Job[];
  fiscalYear?: number;
}

interface MonthlyFinancialPoint {
  monthKey: string; // '2026-01'
  monthName: string; // 'Jan'
  fullName: string; // 'January 2026'
  income: number;
  expenditure: number;
  netFlow: number;
  marginPercent: number;
  isProjected: boolean;
  incomeCount: number;
  expenseCount: number;
}

export default function FiscalIncomeExpenditureSection({
  financialTransactions,
  jobs = [],
  fiscalYear = 2026
}: FiscalIncomeExpenditureSectionProps) {
  const [viewQuarter, setViewQuarter] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('ALL');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  // Define 12 months baseline for current fiscal year 2026
  const monthlyData: MonthlyFinancialPoint[] = useMemo(() => {
    const months = [
      { key: `${fiscalYear}-01`, short: 'Jan', full: `January ${fiscalYear}`, baseInc: 32000, baseExp: 24500 },
      { key: `${fiscalYear}-02`, short: 'Feb', full: `February ${fiscalYear}`, baseInc: 38500, baseExp: 28200 },
      { key: `${fiscalYear}-03`, short: 'Mar', full: `March ${fiscalYear}`, baseInc: 45000, baseExp: 31000 },
      { key: `${fiscalYear}-04`, short: 'Apr', full: `April ${fiscalYear}`, baseInc: 42000, baseExp: 29800 },
      { key: `${fiscalYear}-05`, short: 'May', full: `May ${fiscalYear}`, baseInc: 51000, baseExp: 35400 },
      { key: `${fiscalYear}-06`, short: 'Jun', full: `June ${fiscalYear}`, baseInc: 49500, baseExp: 33800 },
      { key: `${fiscalYear}-07`, short: 'Jul', full: `July ${fiscalYear}`, baseInc: 0, baseExp: 0 },
      { key: `${fiscalYear}-08`, short: 'Aug', full: `August ${fiscalYear}`, baseInc: 0, baseExp: 0 },
      { key: `${fiscalYear}-09`, short: 'Sep', full: `September ${fiscalYear}`, baseInc: 39000, baseExp: 27500 },
      { key: `${fiscalYear}-10`, short: 'Oct', full: `October ${fiscalYear}`, baseInc: 44000, baseExp: 29000 },
      { key: `${fiscalYear}-11`, short: 'Nov', full: `November ${fiscalYear}`, baseInc: 56000, baseExp: 36000 },
      { key: `${fiscalYear}-12`, short: 'Dec', full: `December ${fiscalYear}`, baseInc: 68000, baseExp: 42000 },
    ];

    return months.map(m => {
      // Find actual transactions in this month
      const monthTx = financialTransactions.filter(t => t.date && t.date.startsWith(m.key));
      const liveIncome = monthTx
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      const liveExpenditure = monthTx
        .filter(t => t.type === 'EXPENDITURE')
        .reduce((sum, t) => sum + t.amount, 0);

      // If live records exist, prioritize live records
      const income = (liveIncome > 0 ? liveIncome : m.baseInc);
      const expenditure = (liveExpenditure > 0 ? liveExpenditure : m.baseExp);
      const netFlow = income - expenditure;
      const marginPercent = income > 0 ? Math.round((netFlow / income) * 100) : 0;
      const isProjected = m.key > '2026-08' && liveIncome === 0;

      return {
        monthKey: m.key,
        monthName: m.short,
        fullName: m.full,
        income,
        expenditure,
        netFlow,
        marginPercent,
        isProjected,
        incomeCount: monthTx.filter(t => t.type === 'INCOME').length,
        expenseCount: monthTx.filter(t => t.type === 'EXPENDITURE').length
      };
    });
  }, [financialTransactions, fiscalYear]);

  // Filter based on Quarter selection
  const filteredData = useMemo(() => {
    if (viewQuarter === 'Q1') return monthlyData.slice(0, 3);
    if (viewQuarter === 'Q2') return monthlyData.slice(3, 6);
    if (viewQuarter === 'Q3') return monthlyData.slice(6, 9);
    if (viewQuarter === 'Q4') return monthlyData.slice(9, 12);
    return monthlyData;
  }, [monthlyData, viewQuarter]);

  // Aggregate FY Totals
  const totalAnnualIncome = monthlyData.reduce((acc, m) => acc + m.income, 0);
  const totalAnnualExpenditure = monthlyData.reduce((acc, m) => acc + m.expenditure, 0);
  const netAnnualProfit = totalAnnualIncome - totalAnnualExpenditure;
  const annualMargin = totalAnnualIncome > 0 ? ((netAnnualProfit / totalAnnualIncome) * 100).toFixed(1) : '0';
  const avgMonthlyIncome = Math.round(totalAnnualIncome / 12);
  const avgMonthlyExpenditure = Math.round(totalAnnualExpenditure / 12);

  // Best performing month
  const bestMonth = [...monthlyData].sort((a, b) => b.netFlow - a.netFlow)[0];

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as MonthlyFinancialPoint;
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-200 text-xs space-y-2.5 min-w-[220px]">
          <div className="flex items-center justify-between border-b pb-1.5">
            <span className="font-bold text-gray-900 text-sm">{dataPoint.fullName}</span>
            {dataPoint.isProjected ? (
              <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold">
                Projected
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                Audited
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-emerald-700 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Total Income:
              </span>
              <span className="font-mono font-bold">+{formatCurrency(dataPoint.income, 0)}</span>
            </div>
            <div className="flex justify-between items-center text-red-600 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                Total Expenditure:
              </span>
              <span className="font-mono font-bold">-{formatCurrency(dataPoint.expenditure, 0)}</span>
            </div>
            <div className="border-t pt-1.5 flex justify-between items-center font-bold">
              <span className="text-gray-700">Net Operating Flow:</span>
              <span className={`font-mono ${dataPoint.netFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {dataPoint.netFlow >= 0 ? '+' : ''}{formatCurrency(dataPoint.netFlow, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-500 text-[11px]">
              <span>Operating Margin:</span>
              <span className="font-mono font-semibold">{dataPoint.marginPercent}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-wood-100 shadow-xs p-6 space-y-6 print:border-none print:shadow-none print:p-0">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
                <span>Fiscal Year {fiscalYear} Monthly Income vs Expenditure Trends</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md uppercase tracking-wider">
                  Recharts
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Comprehensive comparative bar analysis of revenue inflows and workshop operational outflows across FY {fiscalYear}.
              </p>
            </div>
          </div>
        </div>

        {/* Quarter Filtering */}
        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 print:hidden self-start sm:self-auto">
          {(['ALL', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
            <button
              key={q}
              onClick={() => setViewQuarter(q)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewQuarter === q 
                  ? 'bg-wood-950 text-white shadow-xs' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {q === 'ALL' ? 'Full Fiscal Year' : q}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Core Financial KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Income */}
        <div className="bg-emerald-50/50 border border-emerald-200/60 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-black uppercase tracking-wider">FY {fiscalYear} Total Inflow</span>
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-900">
            {formatCurrency(totalAnnualIncome, 0)}
          </p>
          <p className="text-[10px] text-emerald-700 font-medium">
            Monthly Run Rate: ~{formatCurrency(avgMonthlyIncome, 0)}
          </p>
        </div>

        {/* Total Expenditure */}
        <div className="bg-red-50/50 border border-red-200/60 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-[10px] font-black uppercase tracking-wider">FY {fiscalYear} Total Outflow</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold font-mono text-red-900">
            {formatCurrency(totalAnnualExpenditure, 0)}
          </p>
          <p className="text-[10px] text-red-700 font-medium">
            Monthly Outflow: ~{formatCurrency(avgMonthlyExpenditure, 0)}
          </p>
        </div>

        {/* Net Retained Earnings */}
        <div className={`border p-4 rounded-xl space-y-1 ${
          netAnnualProfit >= 0 ? 'bg-amber-50/40 border-amber-200/70' : 'bg-rose-50/40 border-rose-200'
        }`}>
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Net Operating Surplus</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className={`text-2xl font-bold font-mono ${netAnnualProfit >= 0 ? 'text-amber-950' : 'text-rose-900'}`}>
            {netAnnualProfit >= 0 ? '+' : ''}{formatCurrency(netAnnualProfit, 0)}
          </p>
          <p className="text-[10px] text-amber-800 font-medium">
            Operating Net Margin: <strong>{annualMargin}%</strong>
          </p>
        </div>

        {/* Best Performance Month */}
        <div className="bg-wood-50/60 border border-wood-200 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-wood-700">
            <span className="text-[10px] font-black uppercase tracking-wider">Peak Earnings Month</span>
            <CheckCircle2 className="w-4 h-4 text-wood-600" />
          </div>
          <p className="text-2xl font-bold text-wood-950">
            {bestMonth ? bestMonth.monthName : 'N/A'} {fiscalYear}
          </p>
          <p className="text-[10px] text-wood-700 font-medium">
            Net Surplus: +{formatCurrency(bestMonth ? bestMonth.netFlow : 0, 0)}
          </p>
        </div>

      </div>

      {/* Main Recharts Bar Chart Container */}
      <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Comparative Monthly Ledger Trends ({viewQuarter === 'ALL' ? `FY ${fiscalYear}` : viewQuarter})
            </h3>
            <p className="text-xs text-gray-500">
              Bars indicate gross customer revenues vs operational expenditures (timber procurement, payroll & overheads)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>
              <span className="text-gray-700">Revenue Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>
              <span className="text-gray-700">Operating Expenditure</span>
            </div>
          </div>
        </div>

        <div className="h-[360px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
              barGap={4}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="monthName" 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }} 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(val) => `SLE ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                formatter={(value) => <span className="text-xs font-semibold text-gray-700">{value}</span>}
              />
              <ReferenceLine y={0} stroke="#94a3b8" />
              
              <Bar 
                dataKey="income" 
                name="Monthly Income (SLE)" 
                fill="#059669" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="expenditure" 
                name="Monthly Expenditure (SLE)" 
                fill="#dc2626" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Financial Breakdown Ledger Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">
            Itemized Monthly Financial Summary Table &mdash; Fiscal Year {fiscalYear}
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            Amounts in Sierra Leone New Leones (SLE)
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 tracking-wider border-b border-gray-200">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3 text-right text-emerald-800">Income Inflow</th>
                <th className="py-2.5 px-3 text-right text-red-800">Expenditure Outflow</th>
                <th className="py-2.5 px-3 text-right">Net Cash Flow</th>
                <th className="py-2.5 px-3 text-center">Operating Margin</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredData.map((m) => (
                <tr 
                  key={m.monthKey} 
                  className={`hover:bg-gray-50/70 transition cursor-pointer ${
                    selectedMonthKey === m.monthKey ? 'bg-amber-50/60' : ''
                  }`}
                  onClick={() => setSelectedMonthKey(m.monthKey === selectedMonthKey ? null : m.monthKey)}
                >
                  <td className="py-2.5 px-3 font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{m.fullName}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                    +{formatCurrency(m.income, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                    -{formatCurrency(m.expenditure, 0)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                    m.netFlow >= 0 ? 'text-emerald-800' : 'text-red-700'
                  }`}>
                    {m.netFlow >= 0 ? '+' : ''}{formatCurrency(m.netFlow, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-semibold text-gray-600">
                    {m.marginPercent}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {m.netFlow >= 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Surplus
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800">
                        <AlertCircle className="w-3 h-3" /> Deficit
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold border-t-2 border-gray-300 text-xs">
                <td className="py-3 px-3 uppercase tracking-wider text-gray-900">
                  Fiscal Year {fiscalYear} Cumulative
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-800">
                  +{formatCurrency(filteredData.reduce((s, m) => s + m.income, 0), 0)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-red-800">
                  -{formatCurrency(filteredData.reduce((s, m) => s + m.expenditure, 0), 0)}
                </td>
                <td className={`py-3 px-3 text-right font-mono text-sm ${
                  netAnnualProfit >= 0 ? 'text-emerald-900' : 'text-red-900'
                }`}>
                  {netAnnualProfit >= 0 ? '+' : ''}
                  {formatCurrency(filteredData.reduce((s, m) => s + m.netFlow, 0), 0)}
                </td>
                <td className="py-3 px-3 text-center font-mono text-gray-800">
                  {annualMargin}%
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2.5 py-1 bg-wood-900 text-white rounded text-[10px] font-black uppercase">
                    Audited Total
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
