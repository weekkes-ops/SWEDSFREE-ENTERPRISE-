import { useState, FormEvent } from 'react';
import { InventoryItem, InventoryTransaction, WoodCategory, WoodUnit, formatCurrency, Employee } from '../types';
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
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  transactions: InventoryTransaction[];
  onAddInventoryItem: (
    item: Omit<InventoryItem, 'id' | 'lastUpdated'>,
    stockMovements?: { initialStock?: number; stockIn: number; stockOut: number; purpose?: string }
  ) => void;
  onLogTransaction: (transaction: Omit<InventoryTransaction, 'id' | 'date'>) => void;
  onUpdateInventoryItem?: (item: InventoryItem) => void;
  onDeleteInventoryItem?: (id: string) => void;
  onDeleteTransaction?: (id: string) => void;
  currentUser?: Employee | null;
}

export default function InventoryManager({
  inventory,
  transactions,
  onAddInventoryItem,
  onLogTransaction,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  onDeleteTransaction,
  currentUser
}: InventoryManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WoodCategory | 'All'>('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'LOGS'>('STOCK');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');

  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states - New Item with Stock Movement (Stock, Stock-In, Stock-Out, and Balance tracking)
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<WoodCategory>('Lumber');
  const [newItemUnit, setNewItemUnit] = useState<WoodUnit>('Board Feet');
  const [newItemInitialStock, setNewItemInitialStock] = useState(50);
  const [newItemStockIn, setNewItemStockIn] = useState(0);
  const [newItemStockOut, setNewItemStockOut] = useState(0);
  const [newItemPurpose, setNewItemPurpose] = useState('Opening Stock Receipt / Supplier Inward');

  // Form states - Edit Item
  const [editItemName, setEditItemName] = useState('');
  const [editItemCategory, setEditItemCategory] = useState<WoodCategory>('Lumber');
  const [editItemUnit, setEditItemUnit] = useState<WoodUnit>('Board Feet');
  const [editItemInitialStock, setEditItemInitialStock] = useState(50);
  const [editItemStockIn, setEditItemStockIn] = useState(0);
  const [editItemStockOut, setEditItemStockOut] = useState(0);

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

    return { stock, stockIn, stockOut, balance };
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
    setShowEditItemModal(true);
  };

  const handleSubmitEditItem = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemName.trim()) return;

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
    const calculatedBalance = Math.max(0, safeStock + safeStockIn - safeStockOut);

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
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }
    setShowEditItemModal(false);
    setEditingItem(null);
  };

  // Form states - Log Transaction
  const [logItemId, setLogItemId] = useState(inventory[0]?.id || '');
  const [logType, setLogType] = useState<'STOCK_IN' | 'STOCK_OUT'>('STOCK_IN');
  const [logQuantity, setLogQuantity] = useState(50);
  const [logUnitCost, setLogUnitCost] = useState(0);
  const [logPurpose, setLogPurpose] = useState('');

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
    setLogQuantity(type === 'STOCK_IN' ? 50 : 10);
    setLogPurpose(type === 'STOCK_IN' ? 'Supplier Restock / Purchase' : 'Workshop Dispatch / Production Issue');
    setShowLogModal(true);
  };

  const handleSubmitNewItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const safeInitialStock = Math.max(0, newItemInitialStock);
    const safeStockIn = Math.max(0, newItemStockIn);
    const totalAvailable = safeInitialStock + safeStockIn;
    const safeStockOut = Math.min(totalAvailable, Math.max(0, newItemStockOut));
    const calculatedBalance = Math.max(0, totalAvailable - safeStockOut);

    onAddInventoryItem({
      name: newItemName,
      category: newItemCategory,
      unit: newItemUnit,
      initialStock: safeInitialStock,
      currentStock: calculatedBalance,
      minStockThreshold: 5,
      unitCost: 0
    }, {
      initialStock: safeInitialStock,
      stockIn: safeStockIn,
      stockOut: safeStockOut,
      purpose: newItemPurpose || 'Initial Stock Movement / Opening Balance'
    });

    // Reset Form
    setNewItemName('');
    setNewItemInitialStock(50);
    setNewItemStockIn(0);
    setNewItemStockOut(0);
    setNewItemPurpose('Opening Stock Receipt / Supplier Inward');
    setShowNewItemModal(false);
  };

  const handleSubmitLogTransaction = (e: FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === logItemId);
    if (!item) return;

    if (logType === 'STOCK_OUT' && item.currentStock < logQuantity) {
      alert(`Insufficient Stock! Current balance for ${item.name} is ${item.currentStock} ${item.unit}. Cannot stock out ${logQuantity} ${item.unit}.`);
      return;
    }

    onLogTransaction({
      itemId: logItemId,
      itemName: item.name,
      type: logType,
      quantity: logQuantity,
      unitCost: logUnitCost,
      totalValue: logQuantity * logUnitCost,
      purpose: logPurpose
    });

    setShowLogModal(false);
  };

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
      valA = a.lastUpdated || '';
      valB = b.lastUpdated || '';
    }

    if (typeof valA === 'string') {
      const comp = (valA || '').localeCompare(valB || '');
      return stockSortDirection === 'asc' ? comp : -comp;
    }

    if (valA < valB) return stockSortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return stockSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedTransactions = [...transactions].sort((a, b) => {
    let valA: any = a[txSortField as keyof InventoryTransaction];
    let valB: any = b[txSortField as keyof InventoryTransaction];

    if (typeof valA === 'string') {
      const comp = (valA || '').localeCompare(valB || '');
      return txSortDirection === 'asc' ? comp : -comp;
    }

    if (valA < valB) return txSortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return txSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Inventory & Stock Movement
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track Stock-In, Stock-Out, and current balances to monitor timber and hardware flow.
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
              onClick={() => setShowNewItemModal(true)}
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
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'STOCK' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Stock Reserves & Movement Table
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'LOGS' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Stock Movement History (Stock-In / Stock-Out)
        </button>
      </div>

      {activeTab === 'STOCK' ? (
        <div className="space-y-4">
          
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
                  <option value="Finishes">Finishes & Polish</option>
                  <option value="Adhesives">Adhesives & Glues</option>
                  <option value="Other">Other Accessories</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${viewMode === 'TABLE' ? 'bg-white shadow-xs text-wood-950 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Table Row View
                </button>
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${viewMode === 'GRID' ? 'bg-white shadow-xs text-wood-950 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
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
                        <td colSpan={isAuditor ? 7 : 8} className="text-center py-16 text-gray-400">
                          {inventory.length === 0 ? (
                            <div className="space-y-2">
                              <p className="font-semibold text-gray-600">No inventory items in stock.</p>
                              <p className="text-xs text-gray-400">All inventory data has been cleared. Click "+ New Raw Material" or "+ Log Stock-In" to record stock.</p>
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
                              <p className="text-[10px] text-gray-400 font-semibold">ID: {item.id} &bull; Updated {item.lastUpdated}</p>
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
                            <td className="py-3.5 px-4 text-center">
                              {isWarningThreshold ? (
                                <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                                  CRITICAL (≤ 2 UNITS)
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-200">
                                  LOW STOCK (≤ 5 UNITS)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
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
                      <p className="text-xs text-gray-400">All inventory data has been cleared. Click "+ New Raw Material" or "+ Log Stock-In" to record stock.</p>
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
                        <div className="flex items-start justify-between gap-1">
                          <span className="px-2.5 py-0.5 bg-wood-50 text-wood-800 text-[10px] font-bold rounded-md border border-wood-100 uppercase">
                            {item.category}
                          </span>
                          {isWarningThreshold ? (
                            <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-amber-200 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              STOCK &lt; 5 UNITS
                            </span>
                          ) : isLow && (
                            <span className="flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-red-200">
                              <AlertTriangle className="w-3 h-3" />
                              REORDER LEVEL
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mt-2 line-clamp-2 leading-snug">
                          {item.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-semibold">ID: {item.id} &bull; Unit: {item.unit}</p>
                      </div>

                      {/* Stock Movement 4-Pillar Micro Metric */}
                      <div className="grid grid-cols-4 gap-2 py-2 px-3 my-2 bg-gray-50 rounded-xl border border-gray-100 text-center font-mono">
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

        </div>
      ) : (
        /* Logs Section */
        <div className="bg-white rounded-2xl border border-wood-100 shadow-xs overflow-hidden">
          <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-display font-bold text-gray-800 flex items-center gap-1.5">
              <History className="w-4 h-4 text-wood-600" />
              Stock Movement History Ledger (Stock-In & Stock-Out)
            </h3>
            <span className="text-xs text-gray-400 font-semibold">
              Showing {transactions.length} movement record(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold select-none">
                  <th 
                    onClick={() => handleTxSort('date')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-gray-100/80 transition"
                    title="Click to sort by transaction date"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      {txSortField === 'date' ? (
                        txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleTxSort('itemName')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-gray-100/80 transition"
                    title="Click to sort by material name"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Material Details</span>
                      {txSortField === 'itemName' ? (
                        txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleTxSort('type')}
                    className="py-3.5 px-4 text-center cursor-pointer hover:bg-gray-100/80 transition"
                    title="Click to sort by movement type"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Movement Type</span>
                      {txSortField === 'type' ? (
                        txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleTxSort('quantity')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition"
                    title="Click to sort by quantity"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Quantity</span>
                      {txSortField === 'quantity' ? (
                        txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleTxSort('totalValue')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition"
                    title="Click to sort by total movement valuation"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Value</span>
                      {txSortField === 'totalValue' ? (
                        txSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Purpose & Reference</th>
                  {!isAuditor && onDeleteTransaction && <th className="py-3.5 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No stock movement transactions logged yet. Use "+ Log Stock-In" or "- Log Stock-Out" to record movements.
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map(tx => {
                    const isStockIn = tx.type === 'STOCK_IN' || tx.type === 'INWARDS';
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3 px-4 font-mono text-xs text-gray-500 whitespace-nowrap">{tx.date}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-800">{tx.itemName}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">ID: {tx.itemId}</p>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 text-[10px] font-black rounded-md border uppercase ${isStockIn ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {isStockIn ? <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-amber-600" />}
                            {isStockIn ? 'STOCK-IN' : 'STOCK-OUT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-gray-700">
                          {isStockIn ? '+' : '-'}{tx.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-800 whitespace-nowrap">
                          {formatCurrency(tx.totalValue)}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate">
                          <span>{tx.purpose}</span>
                          {tx.referenceId && (
                            <span className="block text-[10px] text-wood-600 font-semibold uppercase">
                              Ref: {tx.referenceId}
                            </span>
                          )}
                        </td>
                        {!isAuditor && onDeleteTransaction && (
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete inventory transaction record for "${tx.itemName}"?`)) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete Transaction Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                  <h3 className="font-display font-bold text-lg">Edit Material Record</h3>
                  <p className="text-xs text-wood-200">Modify properties of raw wood or hardware reserves.</p>
                </div>
                <button 
                  onClick={() => {
                    setShowEditItemModal(false);
                    setEditingItem(null);
                  }}
                  className="text-wood-300 hover:text-white font-bold text-xl"
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
                      <option value="Finishes">Finishes & Polish</option>
                      <option value="Adhesives">Adhesives & Glues</option>
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

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditItemModal(false);
                      setEditingItem(null);
                    }}
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
                  <p className="text-xs text-wood-200">Register a lumber, plywood, hardware, or finish type.</p>
                </div>
                <button 
                  onClick={() => setShowNewItemModal(false)}
                  className="text-wood-300 hover:text-white font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitNewItem} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Material Name</label>
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
                      <option value="Finishes">Finishes & Polish</option>
                      <option value="Adhesives">Adhesives & Glues</option>
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

                {/* Stock Movement Tracking Section (Stock, Stock-In, Stock-Out, and Balance) */}
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      <TrendingUp className="w-4 h-4 text-emerald-700" />
                      <span>Stock, Stock-In, Stock-Out & Balance</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      newItemInitialStock + newItemStockIn - newItemStockOut > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
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

                  {/* Calculated Net Balance & Status Summary Strip */}
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Net Initial Balance</span>
                      <span className="font-mono font-black text-sm text-wood-950">
                        {Math.max(0, newItemInitialStock + newItemStockIn - newItemStockOut)} <span className="text-xs font-normal text-gray-500">{newItemUnit}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Initial Stock Status</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        {Math.max(0, newItemInitialStock + newItemStockIn - newItemStockOut) <= 2 ? 'Critical (≤2)' : Math.max(0, newItemInitialStock + newItemStockIn - newItemStockOut) <= 5 ? 'Low Stock (≤5)' : 'Healthy In-Stock'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Movement Purpose / Inward Note</label>
                    <input
                      type="text"
                      value={newItemPurpose}
                      onChange={(e) => setNewItemPurpose(e.target.value)}
                      placeholder="e.g. Opening Stock Receipt / Supplier Inward"
                      className="w-full px-2.5 py-1 border border-emerald-200 rounded-lg text-xs bg-white text-gray-800 outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowNewItemModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs"
                  >
                    Save material
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
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
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
                  <p className="text-xs opacity-90 mt-0.5">
                    {logType === 'STOCK_IN' ? 'Add raw timber or hardware supplies to active balance' : 'Dispatch and deduct material used in production jobs'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowLogModal(false)}
                  className="text-white hover:opacity-75 font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitLogTransaction} className="p-6 space-y-4">
                {/* Movement Type Toggle */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Movement Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLogType('STOCK_IN');
                        setLogPurpose('Supplier Restock / Purchase');
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
                        setLogPurpose('Workshop Dispatch / Production Issue');
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${logType === 'STOCK_OUT' ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                      <span>Stock-Out (-)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select Material</label>
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
                    <label className="text-xs font-bold text-gray-500 uppercase">Quantity Units</label>
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
                      min={0.1}
                      step={0.1}
                      value={logUnitCost}
                      onChange={(e) => setLogUnitCost(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Purpose / Memo</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard timber purchase restock, or Used in bespoke dining table"
                    value={logPurpose}
                    onChange={(e) => setLogPurpose(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-medium"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between font-mono text-xs text-gray-600">
                  <span>Total Calculated Value:</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {formatCurrency(logQuantity * logUnitCost)}
                  </span>
                </div>

                <div className="flex gap-2 pt-4">
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
                    {logType === 'STOCK_IN' ? 'Confirm Stock-In (+)' : 'Confirm Stock-Out (-)'}
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
