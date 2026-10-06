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
  transactions = [],
  onAddInventoryItem,
  onLogTransaction,
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

  // Stock Movement Modal states
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementItemId, setMovementItemId] = useState('');
  const [movementType, setMovementType] = useState<'INWARDS' | 'OUTWARDS'>('INWARDS');
  const [movementQty, setMovementQty] = useState(10);
  const [movementPurpose, setMovementPurpose] = useState('');

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

  // Calculate stock movement for each item
  const getItemStockMetrics = (item: InventoryItem) => {
    const itemTx = transactions.filter(t => t.itemId === item.id);
    const loggedIn = itemTx.filter(t => t.type === 'INWARDS').reduce((acc, t) => acc + Number(t.quantity || 0), 0);
    const loggedOut = itemTx.filter(t => t.type === 'OUTWARDS').reduce((acc, t) => acc + Number(t.quantity || 0), 0);

    // Baseline accounts for items created with an initial stock quantity
    const baselineIn = Math.max(0, (item.currentStock || 0) + loggedOut - loggedIn);
    const stockIn = loggedIn + baselineIn;
    const stockOut = loggedOut;
    const balance = Math.max(0, stockIn - stockOut);

    return { stockIn, stockOut, balance };
  };

  const handleOpenMovementModal = (item?: InventoryItem, type: 'INWARDS' | 'OUTWARDS' = 'INWARDS') => {
    if (item) {
      setMovementItemId(item.id);
    } else if (inventory.length > 0) {
      setMovementItemId(inventory[0].id);
    }
    setMovementType(type);
    setMovementQty(10);
    setMovementPurpose('');
    setShowMovementModal(true);
  };

  const handleSubmitMovement = (e: FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === movementItemId);
    if (!item || movementQty <= 0) return;

    if (onLogTransaction) {
      onLogTransaction({
        itemId: item.id,
        itemName: item.name,
        type: movementType,
        quantity: movementQty,
        unitCost: item.unitCost || 0,
        totalValue: 0,
        purpose: movementPurpose.trim() || (movementType === 'INWARDS' ? 'Restock / Stock-In' : 'Workshop consumption / Stock-Out')
      });
    } else if (onUpdateInventoryItem) {
      const newStock = movementType === 'INWARDS'
        ? item.currentStock + movementQty
        : Math.max(0, item.currentStock - movementQty);
      onUpdateInventoryItem({
        ...item,
        currentStock: newStock,
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }

    setShowMovementModal(false);
  };

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
  type StockSortField = 'name' | 'category' | 'stockIn' | 'stockOut' | 'balance' | 'status' | 'date';
  const [stockSortField, setStockSortField] = useState<StockSortField>('name');
  const [stockSortDirection, setStockSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleStockSort = (field: StockSortField) => {
    if (stockSortField === field) {
      setStockSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setStockSortField(field);
      setStockSortDirection(field === 'date' || field === 'stockIn' || field === 'stockOut' || field === 'balance' ? 'desc' : 'asc');
    }
  };

  // Filter & Sort logic
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const metrics = getItemStockMetrics(item);
    const matchesLowStock = !showLowStockOnly || metrics.balance < 5;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const metricsA = getItemStockMetrics(a);
    const metricsB = getItemStockMetrics(b);

    let valA: any;
    let valB: any;

    if (stockSortField === 'stockIn') {
      valA = metricsA.stockIn;
      valB = metricsB.stockIn;
    } else if (stockSortField === 'stockOut') {
      valA = metricsA.stockOut;
      valB = metricsB.stockOut;
    } else if (stockSortField === 'balance') {
      valA = metricsA.balance;
      valB = metricsB.balance;
    } else if (stockSortField === 'status') {
      const getStatusRank = (metrics: { balance: number }) => {
        if (metrics.balance === 0) return 3;
        if (metrics.balance < 5) return 2;
        return 1;
      };
      valA = getStatusRank(metricsA);
      valB = getStatusRank(metricsB);
    } else if (stockSortField === 'date') {
      valA = a.lastUpdated || '';
      valB = b.lastUpdated || '';
    } else {
      valA = a[stockSortField as keyof InventoryItem];
      valB = b[stockSortField as keyof InventoryItem];
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
            Track lumber stock reserves, stock movements (Stock-In, Stock-Out, and Balance) for bespoke woodwork production.
          </p>
        </div>
        
        {!isAuditor ? (
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleOpenMovementModal()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
              title="Record Stock-In or Stock-Out movement"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Record Movement</span>
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
                      onClick={() => handleStockSort('stockIn')} 
                      className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition"
                      title="Total stock received into inventory"
                    >
                      <div className="flex items-center justify-end gap-1.5 text-emerald-800">
                        <span>Stock-In</span>
                        {stockSortField === 'stockIn' ? (
                          stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-700" /> : <ArrowDown className="w-3 h-3 text-emerald-700" />
                        ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleStockSort('stockOut')} 
                      className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition"
                      title="Total stock issued or consumed from inventory"
                    >
                      <div className="flex items-center justify-end gap-1.5 text-amber-800">
                        <span>Stock-Out</span>
                        {stockSortField === 'stockOut' ? (
                          stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-700" /> : <ArrowDown className="w-3 h-3 text-amber-700" />
                        ) : <ArrowUpDown className="w-3 h-3 text-gray-300 hover:text-gray-500" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleStockSort('balance')} 
                      className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition bg-wood-50/60"
                      title="Current remaining stock balance"
                    >
                      <div className="flex items-center justify-end gap-1.5 text-wood-950 font-bold">
                        <span>Balance</span>
                        {stockSortField === 'balance' ? (
                          stockSortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-wood-800" /> : <ArrowDown className="w-3 h-3 text-wood-800" />
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
                      <td colSpan={isAuditor ? 6 : 7} className="text-center py-16 text-gray-400">
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
                      const metrics = getItemStockMetrics(item);
                      const isDepleted = metrics.balance === 0;
                      const isLow = metrics.balance < 5;
                      return (
                        <tr 
                          key={item.id} 
                          className={`transition ${
                            isDepleted
                              ? 'bg-red-50/70 hover:bg-red-100/40 text-red-950 font-semibold border-l-4 border-red-500'
                              : isLow 
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
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                            +{metrics.stockIn} <span className="text-[10px] text-gray-400 font-sans font-normal">{item.unit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-800">
                            {metrics.stockOut > 0 ? `-${metrics.stockOut}` : '0'} <span className="text-[10px] text-gray-400 font-sans font-normal">{item.unit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-sm bg-wood-50/40">
                            <span className={metrics.balance === 0 ? 'text-red-600' : metrics.balance < 5 ? 'text-amber-700' : 'text-gray-900'}>
                              {metrics.balance}
                            </span> <span className="text-[10px] text-gray-400 font-sans font-normal">{item.unit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isDepleted ? (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-200">
                                OUT OF STOCK
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                                LOW STOCK (&lt;5)
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
                                      onClick={() => handleOpenMovementModal(item)}
                                      className="px-2 py-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                                      title="Record Stock Movement (Stock-In or Stock-Out)"
                                    >
                                      <ArrowUpDown className="w-3 h-3 text-emerald-700" />
                                      <span>Move</span>
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditModal(item)}
                                      className="px-2 py-1 text-[10px] font-black uppercase text-wood-800 bg-wood-50 hover:bg-wood-100 border border-wood-200 rounded-md transition flex items-center gap-1 cursor-pointer"
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
                const metrics = getItemStockMetrics(item);
                const isDepleted = metrics.balance === 0;
                const isLow = metrics.balance < 5;
                return (
                  <motion.div
                    key={item.id}
                    layoutId={`inv-${item.id}`}
                    whileHover={{ y: -3 }}
                    className={`bg-white p-5 rounded-2xl border ${
                      isDepleted
                        ? 'border-red-300 bg-red-50/20'
                        : isLow 
                        ? 'border-amber-300 bg-amber-50/30' 
                        : 'border-wood-100'
                    } shadow-xs flex flex-col justify-between min-h-[220px]`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="px-2.5 py-0.5 bg-wood-50 text-wood-800 text-[10px] font-bold rounded-md border border-wood-100 uppercase">
                          {item.category}
                        </span>
                        {isDepleted ? (
                          <span className="flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-amber-200">
                            <AlertTriangle className="w-3 h-3" />
                            LOW STOCK (&lt;5)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                            HEALTHY
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mt-2 line-clamp-2 leading-snug">
                        {item.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-gray-50 space-y-2">
                      <div className="grid grid-cols-3 gap-1 py-1.5 px-2 bg-gray-50/80 rounded-xl text-center">
                        <div>
                          <p className="text-[9px] text-emerald-800 font-bold uppercase">Stock-In</p>
                          <p className="text-sm font-bold font-mono text-emerald-900">+{metrics.stockIn}</p>
                        </div>
                        <div className="border-x border-gray-200">
                          <p className="text-[9px] text-amber-800 font-bold uppercase">Stock-Out</p>
                          <p className="text-sm font-bold font-mono text-amber-900">-{metrics.stockOut}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-wood-800 font-bold uppercase">Balance</p>
                          <p className={`text-sm font-black font-mono ${metrics.balance === 0 ? 'text-red-600' : metrics.balance < 5 ? 'text-amber-700' : 'text-wood-950'}`}>
                            {metrics.balance}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-gray-100 text-[10px]">
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
                                  onClick={() => handleOpenMovementModal(item)}
                                  className="px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                                  title="Record Movement"
                                >
                                  <ArrowUpDown className="w-2.5 h-2.5" />
                                  <span>Move</span>
                                </button>
                              )}
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

      {/* MODAL: Record Stock Movement */}
      <AnimatePresence>
        {showMovementModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-wood-100 shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-wood-950 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg">Record Stock Movement</h3>
                  <p className="text-xs text-wood-200">Log incoming stock or workshop material consumption.</p>
                </div>
                <button 
                  onClick={() => setShowMovementModal(false)}
                  className="text-wood-300 hover:text-white font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitMovement} className="p-6 space-y-4">
                {/* Movement Type Toggle */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Movement Type</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setMovementType('INWARDS')}
                      className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        movementType === 'INWARDS'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>Stock-In (Received)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementType('OUTWARDS')}
                      className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        movementType === 'OUTWARDS'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>Stock-Out (Consumed)</span>
                    </button>
                  </div>
                </div>

                {/* Target Raw Material */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select Material</label>
                  <select
                    required
                    value={movementItemId}
                    onChange={(e) => setMovementItemId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 bg-white"
                  >
                    <option value="" disabled>-- Select inventory item --</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.category} - {item.unit}) &bull; Balance: {item.currentStock} {item.unit}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Quantity {movementItemId && inventory.find(i => i.id === movementItemId) ? `(${inventory.find(i => i.id === movementItemId)?.unit})` : ''}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={movementQty}
                    onChange={(e) => setMovementQty(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm font-semibold text-gray-700 font-mono"
                    placeholder="e.g. 25"
                  />
                </div>

                {/* Purpose / Reference */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Notes / Purpose (Optional)</label>
                  <input
                    type="text"
                    value={movementPurpose}
                    onChange={(e) => setMovementPurpose(e.target.value)}
                    placeholder={movementType === 'INWARDS' ? 'e.g. Lumber delivery from supplier' : 'e.g. Workshop consumption / Job allocation'}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-wood-300 outline-hidden text-sm text-gray-700"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowMovementModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition shadow-xs cursor-pointer ${
                      movementType === 'INWARDS' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    Confirm {movementType === 'INWARDS' ? 'Stock-In' : 'Stock-Out'}
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
