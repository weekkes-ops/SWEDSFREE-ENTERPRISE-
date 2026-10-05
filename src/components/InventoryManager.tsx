import { useState, FormEvent } from 'react';
import { InventoryItem, WoodCategory, WoodUnit, formatCurrency, Employee, InventoryTransaction } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  Trash2,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  transactions?: InventoryTransaction[];
  onAddInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  onLogTransaction?: (transaction: Omit<InventoryTransaction, 'id' | 'date'>) => void;
  onUpdateInventoryItem?: (item: InventoryItem) => void;
  onDeleteInventoryItem?: (id: string) => void;
  onDeleteTransaction?: (id: string) => void;
  currentUser?: Employee | null;
}

export default function InventoryManager({
  inventory,
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  currentUser
}: InventoryManagerProps) {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WoodCategory | 'All'>('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');

  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states - New Item
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<WoodCategory>('Lumber');
  const [newItemUnit, setNewItemUnit] = useState<WoodUnit>('Board Feet');
  const [newItemMinThreshold, setNewItemMinThreshold] = useState(20);
  const [newItemInitialStock, setNewItemInitialStock] = useState(100);

  // Form states - Edit Item
  const [editItemName, setEditItemName] = useState('');
  const [editItemCategory, setEditItemCategory] = useState<WoodCategory>('Lumber');
  const [editItemUnit, setEditItemUnit] = useState<WoodUnit>('Board Feet');
  const [editItemMinThreshold, setEditItemMinThreshold] = useState(20);
  const [editItemCurrentStock, setEditItemCurrentStock] = useState(100);

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemCategory(item.category);
    setEditItemUnit(item.unit);
    setEditItemMinThreshold(item.minStockThreshold);
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
        unitCost: editingItem.unitCost || 0,
        currentStock: editItemCurrentStock,
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }
    setShowEditItemModal(false);
    setEditingItem(null);
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
      unitCost: 0
    });

    // Reset Form
    setNewItemName('');
    setNewItemMinThreshold(20);
    setNewItemInitialStock(100);
    setShowNewItemModal(false);
  };

  // Sorting states
  type StockSortField = 'name' | 'category' | 'currentStock' | 'minStockThreshold' | 'status' | 'date';
  const [stockSortField, setStockSortField] = useState<StockSortField>('name');
  const [stockSortDirection, setStockSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleStockSort = (field: StockSortField) => {
    if (stockSortField === field) {
      setStockSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setStockSortField(field);
      setStockSortDirection(field === 'date' || field === 'currentStock' ? 'desc' : 'asc');
    }
  };

  // Filter & Sort logic
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || item.currentStock <= item.minStockThreshold;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let valA: any = a[stockSortField as keyof InventoryItem];
    let valB: any = b[stockSortField as keyof InventoryItem];

    if (stockSortField === 'status') {
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

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-wood-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-display font-bold text-wood-900 tracking-tight">
            Inventory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track lumber stock reserves, raw material inventory, and reorder thresholds for bespoke woodwork production.
          </p>
        </div>
        
        {!isAuditor ? (
          <div className="flex flex-wrap gap-2">
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
                className="rounded border-gray-300 text-wood-600 focus:ring-wood-500 w-4 h-4 cursor-pointer"
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
                      className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition"
                      title="Click to sort by current stock level"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Current Stock</span>
                        {stockSortField === 'currentStock' ? (
                          stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                        ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleStockSort('minStockThreshold')} 
                      className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition"
                      title="Click to sort by minimum threshold"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Min. Threshold</span>
                        {stockSortField === 'minStockThreshold' ? (
                          stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-700" /> : <ArrowDown className="w-3 h-3 text-wood-700" />
                        ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleStockSort('status')} 
                      className="py-3 px-4 text-center cursor-pointer hover:bg-gray-100/80 transition"
                      title="Click to sort by stock status severity"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Stock status</span>
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
                      <td colSpan={6} className="text-center py-16 text-gray-400">
                        {inventory.length === 0 ? (
                          <div className="space-y-2">
                            <p className="font-semibold text-gray-600">No inventory items in stock.</p>
                            <p className="text-xs text-gray-400">Click "+ New Raw Material" to record new timber, lumber, or hardware stock.</p>
                          </div>
                        ) : (
                          'No inventory items match your filters.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    sortedInventory.map(item => {
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
                                      onClick={() => handleOpenEditModal(item)}
                                      className="px-2.5 py-1 text-[10px] font-black uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                                      title="Edit Material"
                                    >
                                      <Edit2 className="w-3 h-3 text-wood-700" />
                                      <span>Edit</span>
                                    </button>
                                    {onDeleteInventoryItem && (
                                      <button 
                                        onClick={() => setConfirmDeleteId(item.id)}
                                        className="p-1.5 hover:bg-red-50 rounded text-red-600 border border-transparent hover:border-red-100 transition cursor-pointer"
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
                    <p className="text-xs text-gray-400">Click "+ New Raw Material" to record new timber, lumber, or hardware stock.</p>
                  </div>
                ) : (
                  <p>No inventory items match your filters.</p>
                )}
              </div>
            ) : (
              sortedInventory.map(item => {
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
                          <p className="text-[10px] text-gray-400 font-semibold uppercase">Min Alert Level</p>
                          <p className="text-sm font-bold font-mono text-gray-700">
                            {item.minStockThreshold} <span className="text-xs font-sans text-gray-400 font-normal">{item.unit}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-dashed border-gray-100 text-[10px]">
                        <span className="text-gray-400 font-medium font-mono">ID: {item.id}</span>
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
                              {!isAuditor && (
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="px-2 py-0.5 text-[9px] font-bold uppercase text-wood-700 hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                  <span>Edit</span>
                                </button>
                              )}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Current Stock</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editItemCurrentStock}
                      onChange={(e) => setEditItemCurrentStock(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Min Alert Level (Threshold)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editItemMinThreshold}
                      onChange={(e) => setEditItemMinThreshold(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
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
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 rounded-xl bg-wood-600 hover:bg-wood-700 text-white text-sm font-bold transition shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Create New Raw Material */}
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
                  className="text-wood-300 hover:text-white font-bold cursor-pointer"
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Quantity</label>
                    <input
                      type="number"
                      required
                      min={0}
                      placeholder="e.g. 100"
                      value={newItemInitialStock}
                      onChange={(e) => setNewItemInitialStock(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Min Alert Level (Threshold)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newItemMinThreshold}
                      onChange={(e) => setNewItemMinThreshold(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
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
                    Save material
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
