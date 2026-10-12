import { useState, useEffect, useMemo, FormEvent } from 'react';
import { InventoryItem, InventoryTransaction, WoodCategory, WoodUnit, formatCurrency, Employee, Job } from '../types';
import { 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter, 
  AlertTriangle, 
  History, 
  Flame, 
  Trash2,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Clock,
  FileText,
  UserCheck,
  Download,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  transactions: InventoryTransaction[];
  jobs?: Job[];
  onAddInventoryItem: (
    item: Omit<InventoryItem, 'id' | 'lastUpdated'>,
    stockMovements?: { initialStock?: number; stockIn: number; stockOut: number; purpose?: string; date?: string; time?: string }
  ) => void;
  onLogTransaction: (transaction: Omit<InventoryTransaction, 'id' | 'date'> & { date?: string }) => void;
  onUpdateInventoryItem?: (item: InventoryItem) => void;
  onDeleteInventoryItem?: (id: string) => void;
  onDeleteTransaction?: (id: string) => void;
  currentUser?: Employee | null;
}

export default function InventoryManager({
  inventory,
  transactions,
  jobs = [],
  onAddInventoryItem,
  onLogTransaction,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  onDeleteTransaction,
  currentUser
}: InventoryManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const operatorLabel = currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Admin';

  // Live Real-Time Clock for stock movement entry stamping
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const liveDateStr = liveNow.toISOString().split('T')[0];
  const liveTimeStr = liveNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WoodCategory | 'All'>('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LOGS'>('STOCK');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');

  // Audit Trail filters
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState<'ALL' | 'STOCK_IN' | 'STOCK_OUT' | 'INITIAL'>('ALL');
  const [auditDateFilter, setAuditDateFilter] = useState('');

  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states - New Item with Stock Movement (Stock, Stock-In, Stock-Out, Balance, Date, Time, Purpose)
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<WoodCategory>('Lumber');
  const [newItemUnit, setNewItemUnit] = useState<WoodUnit>('Board Feet');
  const [newItemInitialStock, setNewItemInitialStock] = useState(50);
  const [newItemStockIn, setNewItemStockIn] = useState(0);
  const [newItemStockOut, setNewItemStockOut] = useState(0);
  const [newItemUnitCost, setNewItemUnitCost] = useState(0);
  const [newItemDate, setNewItemDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newItemPurpose, setNewItemPurpose] = useState('Opening Stock Receipt / Supplier Inward');

  // Form states - Edit Item
  const [editItemName, setEditItemName] = useState('');
  const [editItemCategory, setEditItemCategory] = useState<WoodCategory>('Lumber');
  const [editItemUnit, setEditItemUnit] = useState<WoodUnit>('Board Feet');
  const [editItemInitialStock, setEditItemInitialStock] = useState(50);
  const [editItemStockIn, setEditItemStockIn] = useState(0);
  const [editItemStockOut, setEditItemStockOut] = useState(0);
  const [editItemPurpose, setEditItemPurpose] = useState('Physical Stock Audit & Balance Verification');

  // Helper to compute Stock, Stock-In, Stock-Out, and Balance for tracking stock movement
  const getItemStockMovement = (item: InventoryItem) => {
    const itemTx = transactions.filter(t => t.itemId === item.id);
    const txIn = itemTx
      .filter(t => t.type === 'STOCK_IN' || t.type === 'INWARDS')
      .reduce((sum, t) => sum + t.quantity, 0);
    const txOut = itemTx
      .filter(t => t.type === 'STOCK_OUT' || t.type === 'OUTWARDS')
      .reduce((sum, t) => sum + t.quantity, 0);

    const stockIn = Math.max(0, (item.stockIn || 0) + txIn);
    const stockOut = Math.max(0, (item.stockOut || 0) + txOut);
    const stock = item.initialStock !== undefined
      ? item.initialStock
      : (stockIn > 0 ? stockIn : (item.currentStock + stockOut));
    const balance = item.currentStock;

    // Find latest transaction for this item to display real-time entry info
    const sortedItemTx = [...itemTx].sort((a, b) => {
      const tA = a.timestamp || `${a.date}T${a.time || '00:00:00'}`;
      const tB = b.timestamp || `${b.date}T${b.time || '00:00:00'}`;
      return tB.localeCompare(tA);
    });
    const latestTx = sortedItemTx[0];

    return {
      stock,
      stockIn,
      stockOut,
      balance,
      lastDate: latestTx?.date || item.lastUpdated || liveDateStr,
      lastTime: latestTx?.time || item.lastUpdatedTime || 'Recorded',
      lastPurpose: latestTx?.purpose || item.lastMovementPurpose || 'Opening Stock Balance',
      lastRecordedBy: latestTx?.recordedBy || item.lastModifiedBy || 'System Admin'
    };
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    const movement = getItemStockMovement(item);
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemCategory(item.category);
    setEditItemUnit(item.unit);
    setEditItemInitialStock(movement.stock);
    setEditItemStockIn(movement.stockIn);
    setEditItemStockOut(movement.stockOut);
    setEditItemPurpose(item.lastMovementPurpose || 'Physical Stock Audit & Balance Adjustment');
    setShowEditItemModal(true);
  };

  const handleSubmitEditItem = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemName.trim() || !editItemPurpose.trim()) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const isoStr = now.toISOString();

    const itemTx = transactions.filter(t => t.itemId === editingItem.id);
    const txIn = itemTx
      .filter(t => t.type === 'STOCK_IN' || t.type === 'INWARDS')
      .reduce((sum, t) => sum + t.quantity, 0);
    const txOut = itemTx
      .filter(t => t.type === 'STOCK_OUT' || t.type === 'OUTWARDS')
      .reduce((sum, t) => sum + t.quantity, 0);

    const safeStock = Math.max(0, editItemInitialStock);
    const safeStockIn = Math.max(0, editItemStockIn);
    const safeStockOut = Math.max(0, editItemStockOut);
    const previousBalance = editingItem.currentStock;
    const calculatedBalance = Math.max(0, safeStock + safeStockIn - safeStockOut);
    const diff = calculatedBalance - previousBalance;

    if (onUpdateInventoryItem) {
      onUpdateInventoryItem({
        ...editingItem,
        name: editItemName,
        category: editItemCategory,
        unit: editItemUnit,
        initialStock: safeStock,
        stockIn: safeStockIn - txIn,
        stockOut: safeStockOut - txOut,
        currentStock: calculatedBalance,
        lastUpdated: dateStr,
        lastUpdatedTime: timeStr,
        lastUpdatedTimestamp: isoStr,
        lastMovementPurpose: editItemPurpose.trim(),
        lastModifiedBy: operatorLabel
      });
    }

    // Always log an audit trail entry when stock is modified via Edit Material Record
    if (diff !== 0 || safeStock !== (editingItem.initialStock ?? 0)) {
      onLogTransaction({
        itemId: editingItem.id,
        itemName: editItemName,
        category: editItemCategory,
        unit: editItemUnit,
        type: diff > 0 ? 'STOCK_IN' : diff < 0 ? 'STOCK_OUT' : 'ADJUSTMENT',
        quantity: Math.abs(diff),
        previousBalance,
        newBalance: calculatedBalance,
        unitCost: editingItem.unitCost || 0,
        totalValue: Math.abs(diff) * (editingItem.unitCost || 0),
        date: dateStr,
        time: timeStr,
        timestamp: isoStr,
        purpose: editItemPurpose.trim(),
        recordedBy: operatorLabel
      });
    }

    setShowEditItemModal(false);
    setEditingItem(null);
  };

  // Form states - Log Transaction
  const [logItemId, setLogItemId] = useState(inventory[0]?.id || '');
  const [logType, setLogType] = useState<'STOCK_IN' | 'STOCK_OUT'>('STOCK_IN');
  const [logQuantity, setLogQuantity] = useState(10);
  const [logUnitCost, setLogUnitCost] = useState(0);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logPurpose, setLogPurpose] = useState('');
  const [logReferenceId, setLogReferenceId] = useState('');

  // Handle selected item changed in Log Transaction Modal to auto-fill unit cost
  const handleLogItemChange = (itemId: string) => {
    setLogItemId(itemId);
    const item = inventory.find(i => i.id === itemId);
    if (item) {
      setLogUnitCost(item.unitCost || 0);
    }
  };

  const handleOpenLogModal = (type: 'STOCK_IN' | 'STOCK_OUT', itemId?: string) => {
    setLogType(type);
    const targetId = itemId || inventory[0]?.id || '';
    setLogItemId(targetId);
    const item = inventory.find(i => i.id === targetId);
    if (item) {
      setLogUnitCost(item.unitCost || 0);
    }
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogQuantity(type === 'STOCK_IN' ? 20 : 5);
    setLogPurpose(type === 'STOCK_IN' ? 'Supplier Timber / Material Delivery Restock' : 'Issued to Workshop Production Floor');
    setLogReferenceId('');
    setShowLogModal(true);
  };

  const handleSubmitNewItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPurpose.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const safeInitialStock = Math.max(0, newItemInitialStock);
    const safeStockIn = Math.max(0, newItemStockIn);
    const totalAvailable = safeInitialStock + safeStockIn;
    const safeStockOut = Math.min(totalAvailable, Math.max(0, newItemStockOut));
    const calculatedBalance = Math.max(0, totalAvailable - safeStockOut);

    onAddInventoryItem({
      name: newItemName.trim(),
      category: newItemCategory,
      unit: newItemUnit,
      initialStock: safeInitialStock,
      currentStock: calculatedBalance,
      minStockThreshold: 5,
      unitCost: Math.max(0, newItemUnitCost),
      lastUpdatedTime: timeStr,
      lastUpdatedTimestamp: now.toISOString(),
      lastMovementPurpose: newItemPurpose.trim(),
      lastModifiedBy: operatorLabel
    }, {
      initialStock: safeInitialStock,
      stockIn: safeStockIn,
      stockOut: safeStockOut,
      purpose: newItemPurpose.trim(),
      date: newItemDate || liveDateStr,
      time: timeStr
    });

    // Reset Form
    setNewItemName('');
    setNewItemInitialStock(50);
    setNewItemStockIn(0);
    setNewItemStockOut(0);
    setNewItemUnitCost(0);
    setNewItemDate(new Date().toISOString().split('T')[0]);
    setNewItemPurpose('Opening Stock Receipt / Supplier Inward');
    setShowNewItemModal(false);
  };

  const handleSubmitLogTransaction = (e: FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === logItemId);
    if (!item || !logPurpose.trim()) return;

    if (logType === 'STOCK_OUT' && item.currentStock < logQuantity) {
      alert(`Insufficient Stock! Current balance for ${item.name} is ${item.currentStock} ${item.unit}. Cannot stock out ${logQuantity} ${item.unit}.`);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const prevBal = item.currentStock;
    const nextBal = logType === 'STOCK_IN'
      ? prevBal + logQuantity
      : Math.max(0, prevBal - logQuantity);

    onLogTransaction({
      itemId: logItemId,
      itemName: item.name,
      category: item.category,
      unit: item.unit,
      type: logType,
      quantity: logQuantity,
      previousBalance: prevBal,
      newBalance: nextBal,
      unitCost: logUnitCost,
      totalValue: logQuantity * logUnitCost,
      date: logDate || liveDateStr,
      time: timeStr,
      timestamp: now.toISOString(),
      purpose: logPurpose.trim(),
      recordedBy: operatorLabel,
      referenceId: logReferenceId || undefined
    });

    setShowLogModal(false);
  };

  // Unify all transactions + any job material allocations into a single comprehensive Audit Trail
  const unifiedAuditTrail = useMemo(() => {
    const list: InventoryTransaction[] = [...transactions];
    const existingJobRefs = new Set(
      transactions.filter(t => t.referenceId).map(t => `${t.referenceId}-${t.itemId}-${t.quantity}`)
    );

    jobs.forEach(job => {
      (job.materialsUsed || []).forEach((mat, idx) => {
        const key = `${job.id}-${mat.itemId}-${mat.quantity}`;
        if (!existingJobRefs.has(key)) {
          const matchedInv = inventory.find(i => i.id === mat.itemId);
          list.push({
            id: `audit-job-${job.id}-${idx}`,
            itemId: mat.itemId,
            itemName: mat.name,
            category: matchedInv?.category,
            unit: matchedInv?.unit,
            type: 'STOCK_OUT',
            quantity: mat.quantity,
            unitCost: mat.unitCost,
            totalValue: mat.totalCost,
            date: mat.date || job.startDate || liveDateStr,
            time: mat.time || '09:00:00 AM',
            timestamp: mat.timestamp || `${mat.date || job.startDate || liveDateStr}T09:00:00.000Z`,
            purpose: mat.purpose || `Issued to Workshop Job: ${job.title} (Client: ${job.customerName})`,
            recordedBy: mat.recordedBy || 'Workshop Supervisor',
            referenceId: job.id
          });
        }
      });
    });

    return list;
  }, [transactions, jobs, inventory, liveDateStr]);

  // Summary KPI values across all inventory
  const totalStockUnits = inventory.reduce((sum, item) => sum + getItemStockMovement(item).stock, 0);
  const totalStockInUnits = inventory.reduce((sum, item) => sum + getItemStockMovement(item).stockIn, 0);
  const totalStockOutUnits = inventory.reduce((sum, item) => sum + getItemStockMovement(item).stockOut, 0);
  const totalBalanceUnits = inventory.reduce((sum, item) => sum + item.currentStock, 0);

  // Sorting states
  type StockSortField = 'name' | 'category' | 'currentStock' | 'stockIn' | 'stockOut' | 'balance' | 'unitCost' | 'minStockThreshold' | 'status' | 'date';
  const [stockSortField, setStockSortField] = useState<StockSortField>('name');
  const [stockSortDirection, setStockSortDirection] = useState<'asc' | 'desc'>('asc');

  type TxSortField = 'date' | 'itemName' | 'type' | 'quantity' | 'unitCost' | 'totalValue';
  const [txSortField, setTxSortField] = useState<TxSortField>('date');
  const [txSortDirection, setTxSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleStockSort = (field: StockSortField) => {
    if (stockSortField === field) {
      setStockSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setStockSortField(field);
      setStockSortDirection(field === 'date' || field === 'currentStock' || field === 'stockIn' || field === 'stockOut' || field === 'balance' || field === 'unitCost' ? 'desc' : 'asc');
    }
  };

  const handleTxSort = (field: TxSortField) => {
    if (txSortField === field) {
      setTxSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTxSortField(field);
      setTxSortDirection(field === 'date' || field === 'quantity' || field === 'totalValue' ? 'desc' : 'asc');
    }
  };

  // Filter & Sort logic
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || item.currentStock <= 5;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let valA: any = a[stockSortField as keyof InventoryItem];
    let valB: any = b[stockSortField as keyof InventoryItem];

    if (stockSortField === 'currentStock') {
      valA = getItemStockMovement(a).stock;
      valB = getItemStockMovement(b).stock;
    } else if (stockSortField === 'stockIn') {
      valA = getItemStockMovement(a).stockIn;
      valB = getItemStockMovement(b).stockIn;
    } else if (stockSortField === 'stockOut') {
      valA = getItemStockMovement(a).stockOut;
      valB = getItemStockMovement(b).stockOut;
    } else if (stockSortField === 'balance') {
      valA = a.currentStock;
      valB = b.currentStock;
    } else if (stockSortField === 'status') {
      const getStatusRank = (item: InventoryItem) => {
        if (item.currentStock < 5) return 3;
        if (item.currentStock <= item.minStockThreshold) return 2;
        return 1;
      };
      valA = getStatusRank(a);
      valB = getStatusRank(b);
    } else if (stockSortField === 'date') {
      valA = a.lastUpdatedTimestamp || a.lastUpdated || '';
      valB = b.lastUpdatedTimestamp || b.lastUpdated || '';
    }

    if (typeof valA === 'string') {
      const comp = (valA || '').localeCompare(valB || '');
      return stockSortDirection === 'asc' ? comp : -comp;
    }

    if (valA < valB) return stockSortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return stockSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredAuditTransactions = useMemo(() => {
    return unifiedAuditTrail.filter(tx => {
      const q = auditSearchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        (tx.itemName || '').toLowerCase().includes(q) ||
        (tx.purpose || '').toLowerCase().includes(q) ||
        (tx.recordedBy || '').toLowerCase().includes(q) ||
        (tx.id || '').toLowerCase().includes(q) ||
        (tx.referenceId || '').toLowerCase().includes(q);

      const isIn = tx.type === 'STOCK_IN' || tx.type === 'INWARDS';
      const isOut = tx.type === 'STOCK_OUT' || tx.type === 'OUTWARDS';
      const isInit = tx.type === 'INITIAL' || tx.type === 'ADJUSTMENT';

      const matchesType =
        auditTypeFilter === 'ALL' ||
        (auditTypeFilter === 'STOCK_IN' && isIn) ||
        (auditTypeFilter === 'STOCK_OUT' && isOut) ||
        (auditTypeFilter === 'INITIAL' && isInit);

      const matchesDate = !auditDateFilter || tx.date === auditDateFilter;

      return matchesSearch && matchesType && matchesDate;
    });
  }, [unifiedAuditTrail, auditSearchTerm, auditTypeFilter, auditDateFilter]);

  const sortedTransactions = useMemo(() => {
    return [...filteredAuditTransactions].sort((a, b) => {
      if (txSortField === 'date') {
        const timeA = a.timestamp || `${a.date}T${a.time || '00:00:00'}`;
        const timeB = b.timestamp || `${b.date}T${b.time || '00:00:00'}`;
        const comp = timeA.localeCompare(timeB);
        return txSortDirection === 'asc' ? comp : -comp;
      }

      const valA: any = a[txSortField as keyof InventoryTransaction];
      const valB: any = b[txSortField as keyof InventoryTransaction];

      if (typeof valA === 'string') {
        const comp = (valA || '').localeCompare(valB || '');
        return txSortDirection === 'asc' ? comp : -comp;
      }

      if (valA < valB) return txSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return txSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAuditTransactions, txSortField, txSortDirection]);

  const handleExportAuditCSV = () => {
    const rows = [
      ['SWEDSWOOD ENTERPRISE - REAL-TIME STOCK MOVEMENT AUDIT TRAIL'],
      [`Exported Date: ${liveDateStr}`, `Exported Real-Time: ${liveTimeStr}`, `Exported By: ${operatorLabel}`],
      [''],
      ['Audit ID', 'Date', 'Real-Time of Entry', 'Material Name', 'Movement Type', 'Quantity', 'Unit', 'Prev Balance', 'New Balance', 'Unit Cost (Le)', 'Total Value (Le)', 'Description / Purpose of Movement', 'Reference / Job ID', 'Recorded By (Operator)'],
      ...sortedTransactions.map(tx => [
        tx.id,
        tx.date || '-',
        tx.time || (tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'Recorded'),
        tx.itemName,
        tx.type,
        tx.quantity,
        tx.unit || 'Units',
        tx.previousBalance !== undefined ? tx.previousBalance : '-',
        tx.newBalance !== undefined ? tx.newBalance : '-',
        tx.unitCost || 0,
        tx.totalValue || 0,
        tx.purpose || 'Workshop Stock Movement',
        tx.referenceId || '-',
        tx.recordedBy || 'System Admin'
      ])
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SWEDSWOOD_STOCK_AUDIT_TRAIL_${liveDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedLogItem = inventory.find(i => i.id === logItemId);

  // Reusable Real-Time Audit Trail Ledger Component
  const renderAuditTrailSection = () => (
    <div className="bg-white rounded-2xl border border-wood-100 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="font-display font-bold text-base text-white">
              Real-Time Stock Movement Audit Trail
            </h3>
            <span className="text-[10px] font-mono font-bold text-emerald-300">
              Live Clock: {liveDateStr} &bull; {liveTimeStr}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Every stock movement (Stock-In, Stock-Out, Opening Stock, and Adjustments) is stamped with exact date, real-time of entry, operator identity, balance impact, and movement purpose.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportAuditCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Audit Trail (CSV)</span>
          </button>
        </div>
      </div>

      {/* Audit Trail Filter Bar */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit trail by material, purpose/description, operator, or job ref..."
            value={auditSearchTerm}
            onChange={(e) => setAuditSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 focus:border-wood-400 rounded-xl outline-hidden font-medium text-gray-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {(['ALL', 'STOCK_IN', 'STOCK_OUT', 'INITIAL'] as const).map(typeOpt => (
              <button
                key={typeOpt}
                type="button"
                onClick={() => setAuditTypeFilter(typeOpt)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                  auditTypeFilter === typeOpt
                    ? 'bg-wood-700 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {typeOpt === 'ALL'
                  ? 'All Movements'
                  : typeOpt === 'STOCK_IN'
                    ? 'Stock-In (+)'
                    : typeOpt === 'STOCK_OUT'
                      ? 'Stock-Out (-)'
                      : 'Opening / Adjust'}
              </button>
            ))}
          </div>

          <input
            type="date"
            value={auditDateFilter}
            onChange={(e) => setAuditDateFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 outline-hidden"
            title="Filter audit trail by movement date"
          />
          {auditDateFilter && (
            <button
              type="button"
              onClick={() => setAuditDateFilter('')}
              className="text-xs font-bold text-rose-600 hover:underline px-1 cursor-pointer"
            >
              Clear Date
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500 font-bold select-none">
              <th
                onClick={() => handleTxSort('date')}
                className="py-3.5 px-4 cursor-pointer hover:bg-gray-100/80 transition"
                title="Click to sort by Date & Real-Time of Entry"
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-wood-700" />
                  <span>Date &amp; Real-Time of Entry</span>
                  {txSortField === 'date' ? (
                    txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                  ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                </div>
              </th>
              <th
                onClick={() => handleTxSort('itemName')}
                className="py-3.5 px-4 cursor-pointer hover:bg-gray-100/80 transition"
              >
                <div className="flex items-center gap-1.5">
                  <span>Stock Item</span>
                  {txSortField === 'itemName' ? (
                    txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                  ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                </div>
              </th>
              <th
                onClick={() => handleTxSort('type')}
                className="py-3.5 px-4 text-center cursor-pointer hover:bg-gray-100/80 transition"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Movement</span>
                  {txSortField === 'type' ? (
                    txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                  ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                </div>
              </th>
              <th
                onClick={() => handleTxSort('quantity')}
                className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Qty Moved</span>
                  {txSortField === 'quantity' ? (
                    txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                  ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                </div>
              </th>
              <th className="py-3.5 px-4 text-center">Balance Audit (Before &rarr; After)</th>
              <th className="py-3.5 px-4">Description / Purpose of Stock Movement</th>
              <th className="py-3.5 px-4">Audit Operator (Recorded By)</th>
              <th
                onClick={() => handleTxSort('totalValue')}
                className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Value</span>
                  {txSortField === 'totalValue' ? (
                    txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                  ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                </div>
              </th>
              {!isAuditor && onDeleteTransaction && <th className="py-3.5 px-4 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  No stock movement audit records match your filter. Use &ldquo;Log Stock-In (+)&rdquo; or &ldquo;Log Stock-Out (-)&rdquo; to record movements with real-time timestamps.
                </td>
              </tr>
            ) : (
              sortedTransactions.map(tx => {
                const isStockIn = tx.type === 'STOCK_IN' || tx.type === 'INWARDS';
                const isInitial = tx.type === 'INITIAL';
                const isAdjust = tx.type === 'ADJUSTMENT';
                const displayTime = tx.time || (tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'Real-Time Logged');
                const matchedItem = inventory.find(i => i.id === tx.itemId);
                const unitLabel = tx.unit || matchedItem?.unit || 'units';

                return (
                  <tr key={tx.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-gray-900 text-xs">{tx.date}</div>
                      <div className="font-mono text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{displayTime}</span>
                      </div>
                      <div className="text-[9px] font-mono text-gray-400 mt-0.5">Audit Ref: {tx.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900">{tx.itemName}</p>
                      <p className="text-[10px] text-gray-500">
                        {tx.category || matchedItem?.category || 'Material'} &middot; ID: {tx.itemId}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 font-extrabold text-[11px] uppercase ${
                        isInitial
                          ? 'text-blue-700'
                          : isAdjust
                            ? 'text-purple-700'
                            : isStockIn
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                      }`}>
                        {isStockIn || isInitial ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        {isInitial
                          ? 'OPENING STOCK'
                          : isAdjust
                            ? 'ADJUSTMENT'
                            : isStockIn
                              ? 'STOCK-IN (+)'
                              : 'STOCK-OUT (-)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold font-mono whitespace-nowrap">
                      <span className={isStockIn || isInitial ? 'text-emerald-700' : 'text-amber-700'}>
                        {isStockIn || isInitial ? '+' : '-'}{tx.quantity}
                      </span>{' '}
                      <span className="text-[10px] font-sans font-normal text-gray-400">{unitLabel}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs whitespace-nowrap">
                      {tx.previousBalance !== undefined && tx.newBalance !== undefined ? (
                        <span className="text-gray-700">
                          <span className="text-gray-500">{tx.previousBalance}</span>
                          <span className="mx-1.5 text-gray-400">&rarr;</span>
                          <strong className="text-gray-900">{tx.newBalance}</strong>
                          <span className="text-[10px] text-gray-400 ml-1">{unitLabel}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[11px]">Verified in Ledger</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-800 max-w-xs">
                      <p className="font-semibold text-gray-900 leading-snug">
                        {tx.purpose || 'Standard Workshop Stock Movement'}
                      </p>
                      {tx.referenceId && (
                        <p className="text-[10px] text-wood-700 font-mono font-bold mt-0.5">
                          Linked Ref / Job: {tx.referenceId}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                        <UserCheck className="w-3.5 h-3.5 text-wood-600 shrink-0" />
                        <span>{tx.recordedBy || 'System Admin'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-800 whitespace-nowrap">
                      {formatCurrency(tx.totalValue || 0)}
                    </td>
                    {!isAuditor && onDeleteTransaction && (
                      <td className="py-3 px-4 text-center">
                        {!tx.id.startsWith('audit-job-') && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete inventory audit record for "${tx.itemName}"?`)) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Delete Transaction Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
              Inventory &amp; Real-Time Stock Audit
            </h1>
            <span className="text-xs font-mono font-semibold text-emerald-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Real-Time Entry Clock: {liveDateStr} &bull; {liveTimeStr}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Track Stock, Stock-In, Stock-Out, and Balance with real-time entry timestamps, movement descriptions, and full operator audit trail.
          </p>
        </div>
        
        {!isAuditor ? (
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleOpenLogModal('STOCK_IN')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Log Stock-In (+)</span>
            </button>
            <button 
              onClick={() => handleOpenLogModal('STOCK_OUT')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
              <span>Log Stock-Out (-)</span>
            </button>
            <button 
              onClick={() => {
                setNewItemDate(new Date().toISOString().split('T')[0]);
                setShowNewItemModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Raw Material</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold font-mono">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>Auditor (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Stock Movement KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Stock</span>
            <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              {totalStockUnits.toLocaleString()} <span className="text-xs font-sans text-gray-400 font-normal">units</span>
            </p>
            <p className="text-[10px] text-gray-400">Opening / base stock</p>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700 border border-slate-200">
            <ArrowUpDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Stock-In</span>
            <p className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              +{totalStockInUnits.toLocaleString()} <span className="text-xs font-sans text-gray-400 font-normal">units</span>
            </p>
            <p className="text-[10px] text-gray-400">Cumulative stock added</p>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Stock-Out</span>
            <p className="text-lg font-bold font-mono text-amber-700 mt-0.5">
              -{totalStockOutUnits.toLocaleString()} <span className="text-xs font-sans text-gray-400 font-normal">units</span>
            </p>
            <p className="text-[10px] text-gray-400">Issued to production</p>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-wood-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Balance</span>
            <p className="text-lg font-bold font-mono text-wood-950 mt-0.5">
              {totalBalanceUnits.toLocaleString()} <span className="text-xs font-sans text-gray-400 font-normal">units</span>
            </p>
            <p className="text-[10px] text-gray-400">Available on hand</p>
          </div>
          <div className="p-2.5 bg-wood-50 rounded-xl text-wood-700 border border-wood-100">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer ${activeTab === 'STOCK' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Stock Reserves &amp; Movement Table
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${activeTab === 'LOGS' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <History className="w-4 h-4 text-wood-600" />
          <span>Stock Movement Audit Trail (Real-Time)</span>
          <span className="text-xs font-mono font-bold text-wood-700">({unifiedAuditTrail.length})</span>
        </button>
      </div>

      {activeTab === 'STOCK' ? (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-wood-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search wood or hardware materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 focus:border-wood-300 focus:bg-white rounded-xl outline-hidden font-medium text-gray-800 placeholder-gray-400"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as WoodCategory | 'All')}
                  className="bg-transparent border-0 text-sm font-semibold text-gray-700 focus:ring-0 py-2 focus:outline-hidden"
                >
                  <option value="All">All Categories</option>
                  <option value="Lumber">Lumber / Hardwood</option>
                  <option value="Plywood">Plywood / Sheets</option>
                  <option value="Hardware">Hardware / Fittings</option>
                  <option value="Finishes">Finishes &amp; Polish</option>
                  <option value="Adhesives">Adhesives &amp; Glues</option>
                  <option value="Other">Other Accessories</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${viewMode === 'TABLE' ? 'bg-white shadow-xs text-wood-950 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Table Row View
                </button>
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${viewMode === 'GRID' ? 'bg-white shadow-xs text-wood-950 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Card Grid View
                </button>
              </div>

              {/* Low Stock checkbox */}
              <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  className="rounded border-gray-300 text-wood-600 focus:ring-wood-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Show Low Stock Only
                </span>
              </label>
            </div>
          </div>

          {/* Table / Cards Display Grid depending on viewMode */}
          {viewMode === 'TABLE' ? (
            <div className="bg-white rounded-2xl border border-wood-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold select-none">
                      <th 
                        onClick={() => handleStockSort('name')} 
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition"
                        title="Click to sort by material name"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Material Details</span>
                          {stockSortField === 'name' ? (
                            stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                          ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleStockSort('category')} 
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition"
                        title="Click to sort by category"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Category</span>
                          {stockSortField === 'category' ? (
                            stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                          ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleStockSort('currentStock')} 
                        className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition bg-slate-50/60"
                        title="Click to sort by Stock"
                      >
                        <div className="flex items-center justify-end gap-1.5 text-slate-900 font-black">
                          <span>Stock</span>
                          {stockSortField === 'currentStock' ? (
                            stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-700" /> : <ArrowDown className="w-3 h-3 text-slate-700" />
                          ) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleStockSort('stockIn')} 
                        className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition bg-emerald-50/40"
                        title="Click to sort by Stock-In"
                      >
                        <div className="flex items-center justify-end gap-1.5 text-emerald-800 font-black">
                          <span>Stock-In</span>
                          {stockSortField === 'stockIn' ? (
                            stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-700" /> : <ArrowDown className="w-3 h-3 text-emerald-700" />
                          ) : <ArrowUpDown className="w-3 h-3 text-emerald-300" />}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleStockSort('stockOut')} 
                        className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition bg-amber-50/40"
                        title="Click to sort by Stock-Out"
                      >
                        <div className="flex items-center justify-end gap-1.5 text-amber-800 font-black">
                          <span>Stock-Out</span>
                          {stockSortField === 'stockOut' ? (
                            stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-700" /> : <ArrowDown className="w-3 h-3 text-amber-700" />
                          ) : <ArrowUpDown className="w-3 h-3 text-amber-300" />}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleStockSort('balance')} 
                        className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition bg-wood-50/50"
                        title="Click to sort by Balance"
                      >
                        <div className="flex items-center justify-end gap-1.5 text-wood-950 font-black">
                          <span>Balance</span>
                          {stockSortField === 'balance' ? (
                            stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                          ) : <ArrowUpDown className="w-3 h-3 text-wood-300" />}
                        </div>
                      </th>
                      <th
                        onClick={() => handleStockSort('date')}
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition"
                        title="Click to sort by latest stock movement date and time"
                      >
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-wood-700" />
                          <span>Latest Movement (Date, Real-Time &amp; Purpose)</span>
                        </div>
                      </th>
                      <th 
                        onClick={() => handleStockSort('status')} 
                        className="py-3 px-4 text-center cursor-pointer hover:bg-gray-100/80 transition"
                        title="Click to sort by stock status severity"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Stock Status</span>
                          {stockSortField === 'status' ? (
                            stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                          ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                        </div>
                      </th>
                      {!isAuditor && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {sortedInventory.length === 0 ? (
                      <tr>
                        <td colSpan={isAuditor ? 8 : 9} className="text-center py-16 text-gray-400">
                          {inventory.length === 0 ? (
                            <div className="space-y-2">
                              <p className="font-semibold text-gray-600">No inventory items in stock.</p>
                              <p className="text-xs text-gray-400">Click &ldquo;+ New Raw Material&rdquo; or &ldquo;Log Stock-In (+)&rdquo; to record stock with real-time audit tracking.</p>
                            </div>
                          ) : (
                            'No inventory items match your filters.'
                          )}
                        </td>
                      </tr>
                    ) : (
                      sortedInventory.map(item => {
                        const movement = getItemStockMovement(item);
                        const isLow = movement.balance <= 5;
                        const isWarningThreshold = movement.balance <= 2;
                        return (
                          <tr 
                            key={item.id} 
                            className={`transition ${
                              isWarningThreshold 
                                ? 'bg-amber-50/80 hover:bg-amber-100/50 text-amber-950 font-semibold border-l-4 border-amber-500' 
                                : 'hover:bg-gray-50/50 text-gray-700'
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-gray-900">{item.name}</p>
                              <p className="text-[10px] text-gray-400 font-semibold">ID: {item.id}</p>
                            </td>
                            <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-gray-500">
                              {item.category}
                            </td>
                            {/* Stock Column */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-sm bg-slate-50/30 whitespace-nowrap">
                              <span className="text-slate-900 font-bold">
                                {movement.stock}
                              </span> <span className="text-[10px] text-gray-400 font-sans font-normal">{item.unit}</span>
                            </td>
                            {/* Stock-In Column */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-sm bg-emerald-50/20 whitespace-nowrap">
                              <span className="text-emerald-700 font-bold">
                                +{movement.stockIn}
                              </span> <span className="text-[10px] text-gray-400 font-sans font-normal">{item.unit}</span>
                            </td>
                            {/* Stock-Out Column */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-sm bg-amber-50/20 whitespace-nowrap">
                              <span className="text-amber-700 font-bold">
                                -{movement.stockOut}
                              </span> <span className="text-[10px] text-gray-400 font-sans font-normal">{item.unit}</span>
                            </td>
                            {/* Balance Column */}
                            <td className="py-3.5 px-4 text-right font-mono font-black text-sm bg-wood-50/20 whitespace-nowrap">
                              <span className={movement.balance <= 5 ? 'text-red-700 font-black' : 'text-wood-950 font-black'}>
                                {movement.balance}
                              </span> <span className="text-[10px] text-gray-400 font-sans font-normal">{item.unit}</span>
                            </td>
                            {/* Latest Movement Date, Real-Time & Purpose Column */}
                            <td className="py-3.5 px-4 max-w-[240px]">
                              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-gray-800">
                                <span>{movement.lastDate}</span>
                                <span className="text-gray-300">&bull;</span>
                                <span className="text-emerald-700">{movement.lastTime}</span>
                              </div>
                              <p className="text-[11px] text-gray-600 truncate mt-0.5" title={movement.lastPurpose}>
                                Purpose: <span className="font-semibold text-gray-800">{movement.lastPurpose}</span>
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">
                                By: {movement.lastRecordedBy}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isWarningThreshold ? (
                                <span className="text-amber-900 text-[10px] font-black uppercase">
                                  CRITICAL (&le; 2 UNITS)
                                </span>
                              ) : isLow ? (
                                <span className="text-red-700 text-[10px] font-black uppercase">
                                  LOW STOCK (&le; 5 UNITS)
                                </span>
                              ) : (
                                <span className="text-emerald-700 text-[10px] font-black uppercase">
                                  HEALTHY
                                </span>
                              )}
                            </td>
                            {!isAuditor && (
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {confirmDeleteId === item.id ? (
                                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 p-1 rounded-md">
                                      <span className="text-[8px] font-black text-red-700 px-0.5 uppercase">Delete?</span>
                                      <button
                                        onClick={() => {
                                          if (onDeleteInventoryItem) onDeleteInventoryItem(item.id);
                                          setConfirmDeleteId(null);
                                        }}
                                        className="px-1.5 py-0.5 text-[8px] font-black uppercase text-white bg-red-600 hover:bg-red-700 rounded-sm transition cursor-pointer"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-1.5 py-0.5 text-[8px] font-black uppercase text-gray-500 hover:text-gray-700 cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => handleOpenLogModal('STOCK_IN', item.id)}
                                        className="px-2 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                                        title="Record Stock-In (+)"
                                      >
                                        <Plus className="w-3 h-3 text-emerald-600" />
                                        <span>Stock-In</span>
                                      </button>
                                      <button 
                                        onClick={() => handleOpenLogModal('STOCK_OUT', item.id)}
                                        className="px-2 py-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                                        title="Record Stock-Out (-)"
                                      >
                                        <ArrowUpRight className="w-3 h-3 text-amber-600" />
                                        <span>Stock-Out</span>
                                      </button>
                                      <button
                                        onClick={() => handleOpenEditModal(item)}
                                        className="px-2 py-1 text-[10px] font-black uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-md transition cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      {!isAuditor && onDeleteInventoryItem && (
                                        <button 
                                          onClick={() => setConfirmDeleteId(item.id)}
                                          className="p-1 hover:bg-red-50 rounded text-red-600 border border-transparent hover:border-red-100 transition cursor-pointer"
                                          title="Delete Material"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards Display Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedInventory.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
                  {inventory.length === 0 ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-600">No inventory items in stock.</p>
                      <p className="text-xs text-gray-400">Click &ldquo;+ New Raw Material&rdquo; or &ldquo;Log Stock-In (+)&rdquo; to record stock.</p>
                    </div>
                  ) : (
                    <p>No inventory items match your filters.</p>
                  )}
                </div>
              ) : (
                sortedInventory.map(item => {
                  const movement = getItemStockMovement(item);
                  const isLow = movement.balance <= item.minStockThreshold;
                  const isWarningThreshold = movement.balance < 5;
                  return (
                    <motion.div
                      key={item.id}
                      layoutId={`inv-${item.id}`}
                      whileHover={{ y: -3 }}
                      className={`bg-white p-5 rounded-2xl border ${
                        isWarningThreshold 
                          ? 'border-amber-300 bg-amber-50/30' 
                          : isLow 
                            ? 'border-red-200 bg-red-50/5' 
                            : 'border-wood-100'
                      } shadow-xs flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 text-xs">
                          <span className="text-wood-800 font-bold uppercase">
                            {item.category}
                          </span>
                          {isWarningThreshold ? (
                            <span className="flex items-center gap-1 text-amber-800 text-[10px] font-extrabold">
                              <AlertTriangle className="w-3 h-3" />
                              STOCK &lt; 5 UNITS
                            </span>
                          ) : isLow && (
                            <span className="flex items-center gap-1 text-red-800 text-[10px] font-extrabold">
                              <AlertTriangle className="w-3 h-3" />
                              REORDER LEVEL
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mt-1.5 line-clamp-2 leading-snug">
                          {item.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-semibold">ID: {item.id} &bull; Unit: {item.unit}</p>
                      </div>

                      {/* Stock Movement 4-Pillar Micro Metric */}
                      <div className="grid grid-cols-4 gap-2 py-2 px-3 my-2.5 bg-gray-50 rounded-xl border border-gray-100 text-center font-mono">
                        <div>
                          <p className="text-[9px] uppercase font-bold text-slate-700">Stock</p>
                          <p className="text-xs font-bold text-slate-900">{movement.stock}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-emerald-700">Stock-In</p>
                          <p className="text-xs font-bold text-emerald-700">+{movement.stockIn}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-amber-700">Stock-Out</p>
                          <p className="text-xs font-bold text-amber-700">-{movement.stockOut}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-wood-900">Balance</p>
                          <p className="text-xs font-black text-wood-950">{movement.balance}</p>
                        </div>
                      </div>

                      {/* Real-time movement stamp on card */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-0.5 mb-2">
                        <div className="flex items-center justify-between font-mono text-[10px] text-gray-600">
                          <span>{movement.lastDate}</span>
                          <span className="text-emerald-700 font-bold">{movement.lastTime}</span>
                        </div>
                        <p className="text-[11px] text-gray-800 font-semibold truncate" title={movement.lastPurpose}>
                          Purpose: {movement.lastPurpose}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          By: {movement.lastRecordedBy}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-50">
                        <div className="flex items-center justify-between gap-2 mt-1 text-[10px]">
                          <div className="flex items-center gap-1">
                            {!isAuditor && (
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="px-2 py-1 text-[9px] font-bold uppercase text-wood-700 hover:bg-wood-50 rounded-md border border-wood-200 transition cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            <button 
                              onClick={() => handleOpenLogModal('STOCK_IN', item.id)}
                              className="px-2 py-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition cursor-pointer"
                              title="Stock-In"
                            >
                              + Stock-In
                            </button>
                            <button 
                              onClick={() => handleOpenLogModal('STOCK_OUT', item.id)}
                              className="px-2 py-1 text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition cursor-pointer"
                              title="Stock-Out"
                            >
                              - Stock-Out
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {confirmDeleteId === item.id ? (
                              <div className="flex items-center gap-1 bg-red-50 border border-red-200 p-1 rounded-md">
                                <span className="text-[8px] font-black text-red-700 px-0.5 uppercase">Delete?</span>
                                <button
                                  onClick={() => {
                                    if (onDeleteInventoryItem) onDeleteInventoryItem(item.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-1.5 py-0.5 text-[8px] font-black uppercase text-white bg-red-600 hover:bg-red-700 rounded-sm transition cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 text-[8px] font-black uppercase text-gray-500 hover:text-gray-700 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                {!isAuditor && onDeleteInventoryItem && (
                                  <button 
                                    onClick={() => setConfirmDeleteId(item.id)}
                                    className="p-1 hover:bg-red-50 rounded text-red-600 border border-transparent hover:border-red-100 transition cursor-pointer"
                                    title="Delete Material"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Always-visible Real-Time Stock Movement Audit Trail right below the Stock Table */}
          {renderAuditTrailSection()}

        </div>
      ) : (
        /* Dedicated Audit Trail Tab View */
        renderAuditTrailSection()
      )}

      {/* MODAL: Edit Raw Material */}
      <AnimatePresence>
        {showEditItemModal && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Edit Material &amp; Stock Audit</h3>
                  <p className="text-xs text-wood-200">
                    Real-Time Stamp: {liveDateStr} &bull; {liveTimeStr}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowEditItemModal(false);
                    setEditingItem(null);
                  }}
                  className="text-wood-300 hover:text-white font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitEditItem} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Material Name</label>
                  <input
                    type="text"
                    required
                    value={editItemName}
                    onChange={(e) => setEditItemName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                    <select
                      value={editItemCategory}
                      onChange={(e) => setEditItemCategory(e.target.value as WoodCategory)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      <option value="Lumber">Lumber / Hardwood</option>
                      <option value="Plywood">Plywood / Sheets</option>
                      <option value="Hardware">Hardware / Fittings</option>
                      <option value="Finishes">Finishes &amp; Polish</option>
                      <option value="Adhesives">Adhesives &amp; Glues</option>
                      <option value="Other">Other Accessories</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Measuring Unit</label>
                    <select
                      value={editItemUnit}
                      onChange={(e) => setEditItemUnit(e.target.value as WoodUnit)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      <option value="Board Feet">Board Feet</option>
                      <option value="Sheets">Sheets</option>
                      <option value="Pieces">Pieces</option>
                      <option value="Liters">Liters</option>
                      <option value="Kg">Kg</option>
                      <option value="Boxes">Boxes</option>
                    </select>
                  </div>
                </div>

                {/* Edit Stock, Stock-In, Stock-Out & Balance */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-800 block">Stock</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editItemInitialStock}
                        onChange={(e) => setEditItemInitialStock(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:border-wood-500 outline-hidden text-sm font-bold text-slate-900 font-mono bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-emerald-800 block">Stock-In (+)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editItemStockIn}
                        onChange={(e) => setEditItemStockIn(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg focus:border-emerald-600 outline-hidden text-sm font-bold text-emerald-900 font-mono bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-amber-800 block">Stock-Out (-)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editItemStockOut}
                        onChange={(e) => setEditItemStockOut(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg focus:border-amber-600 outline-hidden text-sm font-bold text-amber-900 font-mono bg-white"
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Calculated Balance ({editItemUnit}):</span>
                    <span className="font-mono font-black text-sm text-wood-950">
                      {Math.max(0, editItemInitialStock + editItemStockIn - editItemStockOut)} {editItemUnit}
                    </span>
                  </div>
                </div>

                {/* Required Description / Purpose of Stock Adjustment */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Description / Purpose of Stock Movement *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="State reason or purpose for this stock adjustment..."
                    value={editItemPurpose}
                    onChange={(e) => setEditItemPurpose(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-400 outline-hidden text-xs font-medium text-gray-800"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditItemModal(false);
                      setEditingItem(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs cursor-pointer"
                  >
                    Save &amp; Log Audit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: Create New Raw Material */}
      <AnimatePresence>
        {showNewItemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">New Raw Material Listing</h3>
                  <p className="text-xs text-wood-200">
                    Real-Time Entry: {newItemDate} &bull; {liveTimeStr}
                  </p>
                </div>
                <button 
                  onClick={() => setShowNewItemModal(false)}
                  className="text-wood-300 hover:text-white font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitNewItem} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Material Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Western Red Cedar timber (2x8)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value as WoodCategory)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      <option value="Lumber">Lumber / Hardwood</option>
                      <option value="Plywood">Plywood / Sheets</option>
                      <option value="Hardware">Hardware / Fittings</option>
                      <option value="Finishes">Finishes &amp; Polish</option>
                      <option value="Adhesives">Adhesives &amp; Glues</option>
                      <option value="Other">Other Accessories</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Measuring Unit</label>
                    <select
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value as WoodUnit)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                    >
                      <option value="Board Feet">Board Feet</option>
                      <option value="Sheets">Sheets</option>
                      <option value="Pieces">Pieces</option>
                      <option value="Liters">Liters</option>
                      <option value="Kg">Kg</option>
                      <option value="Boxes">Boxes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Movement Date *</label>
                    <input
                      type="date"
                      required
                      value={newItemDate}
                      onChange={(e) => setNewItemDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Unit Cost (Le)</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={newItemUnitCost}
                      onChange={(e) => setNewItemUnitCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-700"
                    />
                  </div>
                </div>

                {/* Stock Movement Tracking Section (Stock, Stock-In, Stock-Out, and Balance) */}
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      <TrendingUp className="w-4 h-4 text-emerald-700" />
                      <span>Stock, Stock-In, Stock-Out &amp; Balance</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800">
                      Balance: {Math.max(0, newItemInitialStock + newItemStockIn - newItemStockOut)} {newItemUnit}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-900 flex items-center gap-1">
                        <span>Stock</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={newItemInitialStock}
                        onChange={(e) => setNewItemInitialStock(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:border-slate-600 outline-hidden text-sm font-bold text-slate-950 font-mono bg-white"
                        placeholder="0"
                      />
                      <span className="text-[9px] text-slate-600">Opening stock</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-emerald-900 flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                        <span>Stock-In</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={newItemStockIn}
                        onChange={(e) => setNewItemStockIn(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg focus:border-emerald-600 outline-hidden text-sm font-bold text-emerald-950 font-mono bg-white"
                        placeholder="0"
                      />
                      <span className="text-[9px] text-emerald-700">Stock received</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-amber-700" />
                        <span>Stock-Out</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={newItemInitialStock + newItemStockIn}
                        value={newItemStockOut}
                        onChange={(e) => setNewItemStockOut(Math.min(newItemInitialStock + newItemStockIn, Math.max(0, Number(e.target.value))))}
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg focus:border-amber-600 outline-hidden text-sm font-bold text-amber-950 font-mono bg-white"
                        placeholder="0"
                      />
                      <span className="text-[9px] text-amber-700">Dispatched</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-black text-emerald-950 uppercase block">
                      Description / Purpose of Stock Movement *
                    </label>
                    <input
                      type="text"
                      required
                      value={newItemPurpose}
                      onChange={(e) => setNewItemPurpose(e.target.value)}
                      placeholder="e.g. Opening Stock Receipt / Supplier Timber Delivery"
                      className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-xs font-medium bg-white text-gray-800 outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowNewItemModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs cursor-pointer"
                  >
                    Save Material &amp; Audit Log
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Log Material Stock-In / Stock-Out */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className={`p-5 text-white flex items-center justify-between ${logType === 'STOCK_IN' ? 'bg-emerald-800' : 'bg-amber-800'}`}>
                <div>
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    {logType === 'STOCK_IN' ? (
                      <>
                        <ArrowDownLeft className="w-5 h-5 text-emerald-300" />
                        <span>Log Stock-In (Restock / Add Stock)</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-5 h-5 text-amber-300" />
                        <span>Log Stock-Out (Issue / Workshop Dispatch)</span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5 font-mono">
                    Real-Time Entry Stamp: {logDate} &bull; {liveTimeStr} &bull; By {operatorLabel}
                  </p>
                </div>
                <button 
                  onClick={() => setShowLogModal(false)}
                  className="text-white hover:opacity-75 font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitLogTransaction} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                {/* Movement Type Toggle */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Movement Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLogType('STOCK_IN');
                        setLogPurpose('Supplier Timber / Material Delivery Restock');
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${logType === 'STOCK_IN' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Stock-In (+)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLogType('STOCK_OUT');
                        setLogPurpose('Issued to Workshop Production Floor');
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${logType === 'STOCK_OUT' ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                      <span>Stock-Out (-)</span>
                    </button>
                  </div>
                </div>

                {/* Date & Real-Time of Entry Row */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase block">Date of Movement *</label>
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase block">Real-Time of Entry (Live)</label>
                    <div className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{liveTimeStr}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select Material *</label>
                  <select
                    value={logItemId}
                    onChange={(e) => handleLogItemChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                  >
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Current Balance: {i.currentStock} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Quantity Units *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={logQuantity}
                      onChange={(e) => setLogQuantity(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Unit Cost (Le)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={logUnitCost}
                      onChange={(e) => setLogUnitCost(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>
                </div>

                {/* Live Balance Audit Impact Preview */}
                {selectedLogItem && (
                  <div className="p-3 bg-wood-50/60 rounded-xl border border-wood-200 flex items-center justify-between text-xs font-mono">
                    <span className="font-sans font-bold text-gray-600">Audit Balance Impact:</span>
                    <span>
                      Prev: <strong>{selectedLogItem.currentStock}</strong> &rarr; New:{' '}
                      <strong className={logType === 'STOCK_IN' ? 'text-emerald-700' : 'text-amber-800'}>
                        {logType === 'STOCK_IN'
                          ? selectedLogItem.currentStock + logQuantity
                          : Math.max(0, selectedLogItem.currentStock - logQuantity)}{' '}
                        {selectedLogItem.unit}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Required Description or Purpose of the Stock Movement */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase block">
                    Description / Purpose of Stock Movement *
                  </label>
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {(logType === 'STOCK_IN'
                      ? [
                          'Supplier Timber Delivery',
                          'Hardware & Fittings Restock',
                          'Plywood / Finishes Purchase',
                          'Returned Unused Job Material'
                        ]
                      : [
                          'Issued to Workshop Production Job',
                          'Cutting & Joinery Section',
                          'Sanding & Polishing Section',
                          'Damaged / Wastage Write-Off'
                        ]
                    ).map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setLogPurpose(preset)}
                        className="px-2 py-1 text-[10px] font-semibold bg-gray-100 hover:bg-wood-100 text-gray-700 rounded-md border border-gray-200 transition cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter specific description or purpose of this stock movement..."
                    value={logPurpose}
                    onChange={(e) => setLogPurpose(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-wood-500 outline-hidden text-sm font-medium text-gray-900"
                  />
                </div>

                {/* Optional Linked Job / Reference */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Linked Workshop Job / Reference (Optional)
                  </label>
                  <select
                    value={logReferenceId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLogReferenceId(val);
                      if (val) {
                        const foundJob = jobs.find(j => j.id === val);
                        if (foundJob && logType === 'STOCK_OUT') {
                          setLogPurpose(`Issued to Job: ${foundJob.title} (${foundJob.customerName})`);
                        }
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-xs font-semibold text-gray-700 bg-white"
                  >
                    <option value="">-- General Workshop Stock Movement --</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>
                        Job #{j.id}: {j.title} ({j.customerName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between font-mono text-xs text-gray-600">
                  <span>Total Calculated Value:</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {formatCurrency(logQuantity * logUnitCost)}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowLogModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition shadow-xs cursor-pointer ${logType === 'STOCK_IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                  >
                    {logType === 'STOCK_IN' ? 'Confirm Stock-In & Audit' : 'Confirm Stock-Out & Audit'}
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
