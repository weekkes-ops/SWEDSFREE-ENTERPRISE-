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
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  transactions: InventoryTransaction[];
  onAddInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  onLogTransaction: (transaction: Omit<InventoryTransaction, 'id' | 'date'>) => void;
  onUpdateInventoryItem?: (item: InventoryItem) => void;
  currentUser?: Employee | null;
}

export default function InventoryManager({
  inventory,
  transactions,
  onAddInventoryItem,
  onLogTransaction,
  onUpdateInventoryItem,
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

  // Form states - New Item
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<WoodCategory>('Lumber');
  const [newItemUnit, setNewItemUnit] = useState<WoodUnit>('Board Feet');
  const [newItemMinThreshold, setNewItemMinThreshold] = useState(20);
  const [newItemUnitCost, setNewItemUnitCost] = useState(10);
  const [newItemInitialStock, setNewItemInitialStock] = useState(100);

  // Form states - Edit Item
  const [editItemName, setEditItemName] = useState('');
  const [editItemCategory, setEditItemCategory] = useState<WoodCategory>('Lumber');
  const [editItemUnit, setEditItemUnit] = useState<WoodUnit>('Board Feet');
  const [editItemMinThreshold, setEditItemMinThreshold] = useState(20);
  const [editItemUnitCost, setEditItemUnitCost] = useState(10);
  const [editItemCurrentStock, setEditItemCurrentStock] = useState(100);

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemCategory(item.category);
    setEditItemUnit(item.unit);
    setEditItemMinThreshold(item.minStockThreshold);
    setEditItemUnitCost(item.unitCost);
    setEditItemCurrentStock(item.currentStock);
    setShowEditItemModal(true);
  };

  const handleSubmitEditItem = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemName.trim()) return;

    if (onUpdateInventoryItem) {
      onUpdateInventoryItem({
        ...editingItem,
        name: editItemName,
        category: editItemCategory,
        unit: editItemUnit,
        minStockThreshold: editItemMinThreshold,
        unitCost: editItemUnitCost,
        currentStock: editItemCurrentStock,
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }
    setShowEditItemModal(false);
    setEditingItem(null);
  };

  // Form states - Log Transaction
  const [logItemId, setLogItemId] = useState(inventory[0]?.id || '');
  const [logType, setLogType] = useState<'INWARDS' | 'OUTWARDS'>('INWARDS');
  const [logQuantity, setLogQuantity] = useState(50);
  const [logUnitCost, setLogUnitCost] = useState(0);
  const [logPurpose, setLogPurpose] = useState('');

  // Handle selected item changed in Log Transaction Modal to auto-fill unit cost
  const handleLogItemChange = (itemId: string) => {
    setLogItemId(itemId);
    const item = inventory.find(i => i.id === itemId);
    if (item) {
      setLogUnitCost(item.unitCost);
    }
  };

  const handleOpenLogModal = (type: 'INWARDS' | 'OUTWARDS', itemId?: string) => {
    setLogType(type);
    const targetId = itemId || inventory[0]?.id || '';
    setLogItemId(targetId);
    const item = inventory.find(i => i.id === targetId);
    if (item) {
      setLogUnitCost(item.unitCost);
    }
    setLogQuantity(type === 'INWARDS' ? 50 : 10);
    setLogPurpose(type === 'INWARDS' ? 'Supplier Restock' : 'Workshop Dispatch');
    setShowLogModal(true);
  };

  const handleSubmitNewItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    onAddInventoryItem({
      name: newItemName,
      category: newItemCategory,
      unit: newItemUnit,
      currentStock: newItemInitialStock,
      minStockThreshold: newItemMinThreshold,
      unitCost: newItemUnitCost
    });

    // Reset Form
    setNewItemName('');
    setNewItemMinThreshold(20);
    setNewItemUnitCost(10);
    setNewItemInitialStock(100);
    setShowNewItemModal(false);
  };

  const handleSubmitLogTransaction = (e: FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === logItemId);
    if (!item) return;

    if (logType === 'OUTWARDS' && item.currentStock < logQuantity) {
      alert(`Insufficient Stock! Current stock for ${item.name} is ${item.currentStock} ${item.unit}.`);
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

  // Filter logic
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || item.currentStock <= item.minStockThreshold;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Inventory & Raw Materials
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track incoming supplies and outgoing material logs for bespoke woodwork production.
          </p>
        </div>
        
        {!isAuditor ? (
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleOpenLogModal('INWARDS')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Log Inwards (Inflow)</span>
            </button>
            <button 
              onClick={() => handleOpenLogModal('OUTWARDS')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-semibold transition"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Log Outwards (Outflow)</span>
            </button>
            <button 
              onClick={() => setShowNewItemModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-wood-600 hover:bg-wood-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
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

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'STOCK' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Stock Level Reserves
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'LOGS' ? 'border-wood-600 text-wood-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Inwards & Outwards History
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
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      <th className="py-3 px-4">Material Details</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Current Stock</th>
                      <th className="py-3 px-4 text-right">Unit rate</th>
                      <th className="py-3 px-4 text-right">Min. Threshold</th>
                      <th className="py-3 px-4 text-center">Stock status</th>
                      {!isAuditor && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400">
                          No inventory items match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredInventory.map(item => {
                        const isLow = item.currentStock <= item.minStockThreshold;
                        const isWarningThreshold = item.currentStock < 5;
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
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                              {item.currentStock} <span className="text-[10px] text-gray-400 font-sans font-normal">{item.unit}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono">
                              {formatCurrency(item.unitCost)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                              {item.minStockThreshold} {item.unit}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isWarningThreshold ? (
                                <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                                  STOCK UNDER 5 UNITS
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-200">
                                  REORDER LEVEL
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
                                  <button
                                    onClick={() => handleOpenEditModal(item)}
                                    className="px-2 py-1 text-[10px] font-black uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-md transition"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleOpenLogModal('INWARDS', item.id)}
                                    className="p-1 hover:bg-emerald-50 rounded text-emerald-600 border border-transparent hover:border-emerald-100 transition"
                                    title="Add Inwards Log"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleOpenLogModal('OUTWARDS', item.id)}
                                    className="p-1 hover:bg-amber-50 rounded text-amber-600 border border-transparent hover:border-amber-100 transition"
                                    title="Add Outwards Log"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
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
              {filteredInventory.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
                  <p>No inventory items match your filters.</p>
                </div>
              ) : (
                filteredInventory.map(item => {
                  const isLow = item.currentStock <= item.minStockThreshold;
                  const isWarningThreshold = item.currentStock < 5;
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
                      } shadow-xs flex flex-col justify-between h-48`}
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
                      </div>

                      <div className="pt-2 border-t border-gray-50">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Current Stock</p>
                            <p className="text-xl font-bold font-mono text-wood-950">
                              {item.currentStock} <span className="text-xs font-sans text-gray-500 font-normal">{item.unit}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Est. Unit Cost</p>
                            <p className="text-sm font-bold font-mono text-gray-800">
                              {formatCurrency(item.unitCost)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-dashed border-gray-100 text-[10px]">
                          <span className="text-gray-400 font-medium">Min Threshold: {item.minStockThreshold} {item.unit}</span>
                          <div className="flex items-center gap-1.5">
                            {!isAuditor && (
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="px-2 py-0.5 text-[9px] font-bold uppercase text-wood-700 hover:underline"
                              >
                                Edit
                              </button>
                            )}
                            <button 
                              onClick={() => handleOpenLogModal('INWARDS', item.id)}
                              className="p-1 hover:bg-emerald-50 rounded text-emerald-600 border border-transparent hover:border-emerald-100 transition"
                              title="Add Inwards Log"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleOpenLogModal('OUTWARDS', item.id)}
                              className="p-1 hover:bg-amber-50 rounded text-amber-600 border border-transparent hover:border-amber-100 transition"
                              title="Add Outwards Log"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
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
              Inwards & Outwards Transaction Ledger
            </h3>
            <span className="text-xs text-gray-400 font-semibold">
              Showing {transactions.length} record(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Material Details</th>
                  <th className="py-3.5 px-4 text-center">Flow Type</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-right">Unit Rate</th>
                  <th className="py-3.5 px-4 text-right">Total Outflow/Inflow</th>
                  <th className="py-3.5 px-4">Purpose & reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  [...transactions].reverse().map(tx => {
                    const isIn = tx.type === 'INWARDS';
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3 px-4 font-mono text-xs text-gray-500 whitespace-nowrap">{tx.date}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-800">{tx.itemName}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">ID: {tx.itemId}</p>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 text-[10px] font-bold rounded-md border uppercase ${isIn ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                            {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-gray-700">
                          {tx.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-500 whitespace-nowrap">
                          {formatCurrency(tx.unitCost)}
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

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Current Stock</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editItemCurrentStock}
                      onChange={(e) => setEditItemCurrentStock(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Unit Cost (Le)</label>
                    <input
                      type="number"
                      required
                      min={0.1}
                      step={0.1}
                      value={editItemUnitCost}
                      onChange={(e) => setEditItemUnitCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Min Alert Level</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editItemMinThreshold}
                      onChange={(e) => setEditItemMinThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
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

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Initial Stock</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newItemInitialStock}
                      onChange={(e) => setNewItemInitialStock(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Est. Unit Cost</label>
                    <input
                      type="number"
                      required
                      min={0.1}
                      step={0.1}
                      value={newItemUnitCost}
                      onChange={(e) => setNewItemUnitCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Min Alert Level</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newItemMinThreshold}
                      onChange={(e) => setNewItemMinThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
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

      {/* MODAL 2: Log Material Inflow / Outflow */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className={`p-5 text-white flex items-center justify-between ${logType === 'INWARDS' ? 'bg-emerald-800' : 'bg-amber-800'}`}>
                <div>
                  <h3 className="font-display font-bold text-lg">
                    Log {logType === 'INWARDS' ? 'Inwards Stock Restock' : 'Outwards Stock Dispatch'}
                  </h3>
                  <p className="text-xs opacity-90">
                    {logType === 'INWARDS' ? 'Add raw wood or hardware reserves' : 'Dispatch wood to client commissions'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowLogModal(false)}
                  className="text-white hover:opacity-75 font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitLogTransaction} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select Material</label>
                  <select
                    value={logItemId}
                    onChange={(e) => handleLogItemChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                  >
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Available: {i.currentStock} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Quantity</label>
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
                    placeholder="e.g. Standard supplier restock, or Used in custom wardrobe build"
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
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition shadow-xs ${logType === 'INWARDS' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                  >
                    Post Log Entry
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
