import React, { useState, useMemo } from 'react';
import {
  Hammer,
  Plus,
  Search,
  Printer,
  Download,
  FileText,
  Edit3,
  Trash2,
  ArrowUpRight,
  RotateCcw,
  Wrench,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  History
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  WorkshopTool,
  ToolMovementLog,
  ToolCategory,
  ToolCondition,
  ToolStatus,
  Employee,
  Job,
  formatCurrency
} from '../types';
import { printDocument } from '../utils/printHelper';
import { getLogoDataUrl } from '../utils/pdfGenerator';
import { getNextAscendingReference, commitAscendingReference } from '../utils/referenceSequencer';

interface ToolsManagerProps {
  tools: WorkshopTool[];
  toolLogs: ToolMovementLog[];
  employees: Employee[];
  jobs: Job[];
  currentUser: Employee | null;
  onAddTool: (tool: WorkshopTool, logEntry: ToolMovementLog) => void;
  onUpdateTool: (tool: WorkshopTool, logEntry?: ToolMovementLog) => void;
  onDeleteTool: (id: string) => void;
}

const TOOL_CATEGORIES: ToolCategory[] = [
  'Power Tools',
  'Hand Tools',
  'Measuring & Layout',
  'Clamps & Vices',
  'Safety Gear',
  'Generators & Heavy Machinery',
  'Other'
];

const TOOL_CONDITIONS: ToolCondition[] = ['Excellent', 'Good', 'Needs Maintenance', 'Damaged', 'Retired'];

const LOCATION_PRESETS = [
  'Main Tool Crib',
  'Woodshop Bay A',
  'Woodshop Bay B',
  'Finishing & Polishing Room',
  'Site Installation Kit'
];

const csvEscape = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function ToolsManager({
  tools,
  toolLogs,
  employees,
  jobs,
  currentUser,
  onAddTool,
  onUpdateTool,
  onDeleteTool
}: ToolsManagerProps) {
  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';
  const isAuditor = currentUser?.role === 'Auditor';
  const canManage = isAdmin || isManager;

  const [activeSubTab, setActiveSubTab] = useState<'REGISTRY' | 'MOVEMENTS'>('REGISTRY');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ToolCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ToolStatus>('All');

  // Create / Edit Tool Modal
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<WorkshopTool | null>(null);

  // Checkout / Return Modal
  const [checkoutTool, setCheckoutTool] = useState<WorkshopTool | null>(null);
  const [returnTool, setReturnTool] = useState<WorkshopTool | null>(null);

  // Tool Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ToolCategory>('Power Tools');
  const [brandOrModel, setBrandOrModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [quantityTotal, setQuantityTotal] = useState('1');
  const [condition, setCondition] = useState<ToolCondition>('Good');
  const [location, setLocation] = useState('Main Tool Crib');
  const [unitValue, setUnitValue] = useState('0');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [notes, setNotes] = useState('');

  // Checkout Form State
  const [issueEmployeeId, setIssueEmployeeId] = useState('');
  const [issueJobId, setIssueJobId] = useState('');
  const [issueQty, setIssueQty] = useState('1');
  const [issueNotes, setIssueNotes] = useState('');

  // Return Form State
  const [returnQty, setReturnQty] = useState('1');
  const [returnCondition, setReturnCondition] = useState<ToolCondition>('Good');
  const [returnNotes, setReturnNotes] = useState('');

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const filteredTools = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...tools]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .filter((t) => {
        const matchesSearch =
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.toolCode.toLowerCase().includes(q) ||
          (t.brandOrModel || '').toLowerCase().includes(q) ||
          (t.serialNumber || '').toLowerCase().includes(q) ||
          (t.assignedToName || '').toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q);
        const matchesCat = categoryFilter === 'All' || t.category === categoryFilter;
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchesSearch && matchesCat && matchesStatus;
      });
  }, [tools, searchTerm, categoryFilter, statusFilter]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...toolLogs]
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''))
      .filter((l) => {
        if (!q) return true;
        return (
          l.toolName.toLowerCase().includes(q) ||
          l.toolCode.toLowerCase().includes(q) ||
          (l.employeeName || '').toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q)
        );
      });
  }, [toolLogs, searchTerm]);

  const metrics = useMemo(() => {
    const totalUnits = filteredTools.reduce((s, t) => s + (t.quantityTotal || 0), 0);
    const availableUnits = filteredTools.reduce((s, t) => s + (t.quantityAvailable || 0), 0);
    const checkedOutUnits = Math.max(0, totalUnits - availableUnits);
    const maintenanceCount = filteredTools.filter(
      (t) => t.status === 'In Maintenance' || t.condition === 'Needs Maintenance' || t.condition === 'Damaged'
    ).length;
    const totalAssetValue = filteredTools.reduce((s, t) => s + (t.quantityTotal || 0) * (t.unitValue || 0), 0);
    return {
      assetLines: filteredTools.length,
      totalUnits,
      availableUnits,
      checkedOutUnits,
      maintenanceCount,
      totalAssetValue
    };
  }, [filteredTools]);

  const operatorLabel = currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Admin';

  const openCreateModal = () => {
    setEditingTool(null);
    setName('');
    setCategory('Power Tools');
    setBrandOrModel('');
    setSerialNumber('');
    setQuantityTotal('1');
    setCondition('Good');
    setLocation('Main Tool Crib');
    setUnitValue('0');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setNextServiceDate('');
    setNotes('');
    setIsToolModalOpen(true);
  };

  const openEditModal = (tool: WorkshopTool) => {
    setEditingTool(tool);
    setName(tool.name);
    setCategory(tool.category);
    setBrandOrModel(tool.brandOrModel || '');
    setSerialNumber(tool.serialNumber || '');
    setQuantityTotal(String(tool.quantityTotal));
    setCondition(tool.condition);
    setLocation(tool.location);
    setUnitValue(String(tool.unitValue || 0));
    setPurchaseDate(tool.purchaseDate || new Date().toISOString().split('T')[0]);
    setNextServiceDate(tool.nextServiceDate || '');
    setNotes(tool.notes || '');
    setIsToolModalOpen(true);
  };

  const handleSaveTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter the tool name.');
      return;
    }
    const qtyTotal = Math.max(1, parseInt(quantityTotal, 10) || 1);
    const val = Math.max(0, parseFloat(unitValue) || 0);
    const nowDate = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    if (editingTool) {
      const checkedOutCount = Math.max(0, editingTool.quantityTotal - editingTool.quantityAvailable);
      const nextAvailable = Math.max(0, qtyTotal - checkedOutCount);
      const nextStatus: ToolStatus =
        condition === 'Retired'
          ? 'Lost / Retired'
          : condition === 'Needs Maintenance' || condition === 'Damaged'
            ? 'In Maintenance'
            : nextAvailable === 0 && checkedOutCount > 0
              ? 'Checked Out'
              : 'Available';

      const updated: WorkshopTool = {
        ...editingTool,
        name: name.trim(),
        category,
        brandOrModel: brandOrModel.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        quantityTotal: qtyTotal,
        quantityAvailable: nextAvailable,
        condition,
        status: nextStatus,
        location: location.trim() || 'Main Tool Crib',
        purchaseDate: purchaseDate || undefined,
        unitValue: val,
        nextServiceDate: nextServiceDate || undefined,
        notes: notes.trim() || undefined,
        lastUpdated: nowDate,
        lastModifiedBy: operatorLabel
      };

      const logEntry: ToolMovementLog = {
        id: `tlog-${Date.now()}`,
        toolId: updated.id,
        toolName: updated.name,
        toolCode: updated.toolCode,
        action: 'UPDATED',
        quantity: qtyTotal,
        conditionAfter: condition,
        date: nowDate,
        time: nowTime,
        notes: `Tool record updated (${qtyTotal} total units, ${condition})`,
        recordedBy: operatorLabel
      };
      onUpdateTool(updated, logEntry);
    } else {
      const toolCode = getNextAscendingReference('TOOL');
      commitAscendingReference('TOOL', toolCode);
      const nextStatus: ToolStatus =
        condition === 'Retired'
          ? 'Lost / Retired'
          : condition === 'Needs Maintenance' || condition === 'Damaged'
            ? 'In Maintenance'
            : 'Available';

      const newTool: WorkshopTool = {
        id: `tool-${Date.now()}`,
        toolCode,
        name: name.trim(),
        category,
        brandOrModel: brandOrModel.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        quantityTotal: qtyTotal,
        quantityAvailable: qtyTotal,
        condition,
        status: nextStatus,
        location: location.trim() || 'Main Tool Crib',
        purchaseDate: purchaseDate || undefined,
        unitValue: val,
        nextServiceDate: nextServiceDate || undefined,
        notes: notes.trim() || undefined,
        lastUpdated: nowDate,
        lastModifiedBy: operatorLabel
      };

      const logEntry: ToolMovementLog = {
        id: `tlog-${Date.now()}`,
        toolId: newTool.id,
        toolName: newTool.name,
        toolCode: newTool.toolCode,
        action: 'ADDED',
        quantity: qtyTotal,
        conditionAfter: condition,
        date: nowDate,
        time: nowTime,
        notes: `Initial registration (${qtyTotal} units at ${newTool.location})`,
        recordedBy: operatorLabel
      };
      onAddTool(newTool, logEntry);
    }
    setIsToolModalOpen(false);
  };

  const openCheckoutModal = (tool: WorkshopTool) => {
    setCheckoutTool(tool);
    setIssueEmployeeId(currentUser?.id || employees[0]?.id || '');
    setIssueJobId('');
    setIssueQty('1');
    setIssueNotes('');
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTool) return;
    const qty = Math.min(checkoutTool.quantityAvailable, Math.max(1, parseInt(issueQty, 10) || 1));
    if (qty <= 0 || checkoutTool.quantityAvailable <= 0) {
      alert('No available units of this tool to check out.');
      return;
    }
    const emp = employees.find((item) => item.id === issueEmployeeId);
    if (!emp) {
      alert('Please select the employee receiving the tool.');
      return;
    }
    const job = jobs.find((j) => j.id === issueJobId);
    const nowDate = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const remaining = Math.max(0, checkoutTool.quantityAvailable - qty);

    const updated: WorkshopTool = {
      ...checkoutTool,
      quantityAvailable: remaining,
      status: remaining === 0 ? 'Checked Out' : checkoutTool.status === 'In Maintenance' ? 'In Maintenance' : 'Checked Out',
      assignedToId: emp.id,
      assignedToName: emp.name,
      assignedJobId: job?.id || undefined,
      assignedJobTitle: job?.title || undefined,
      lastUpdated: nowDate,
      lastModifiedBy: operatorLabel
    };

    const logEntry: ToolMovementLog = {
      id: `tlog-${Date.now()}`,
      toolId: updated.id,
      toolName: updated.name,
      toolCode: updated.toolCode,
      action: 'CHECKED_OUT',
      employeeId: emp.id,
      employeeName: emp.name,
      jobId: job?.id || undefined,
      jobTitle: job?.title || undefined,
      quantity: qty,
      conditionAfter: updated.condition,
      date: nowDate,
      time: nowTime,
      notes: issueNotes.trim() || `Issued to ${emp.name}${job ? ` for ${job.title}` : ''}`,
      recordedBy: operatorLabel
    };

    onUpdateTool(updated, logEntry);
    setCheckoutTool(null);
  };

  const openReturnModal = (tool: WorkshopTool) => {
    const outCount = Math.max(1, tool.quantityTotal - tool.quantityAvailable);
    setReturnTool(tool);
    setReturnQty(String(outCount));
    setReturnCondition(tool.condition === 'Damaged' ? 'Needs Maintenance' : tool.condition);
    setReturnNotes('');
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnTool) return;
    const outCount = Math.max(0, returnTool.quantityTotal - returnTool.quantityAvailable);
    const qty = Math.min(outCount, Math.max(1, parseInt(returnQty, 10) || 1));
    const nextAvailable = Math.min(returnTool.quantityTotal, returnTool.quantityAvailable + qty);
    const nowDate = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const nextStatus: ToolStatus =
      returnCondition === 'Retired'
        ? 'Lost / Retired'
        : returnCondition === 'Needs Maintenance' || returnCondition === 'Damaged'
          ? 'In Maintenance'
          : nextAvailable < returnTool.quantityTotal
            ? 'Checked Out'
            : 'Available';

    const updated: WorkshopTool = {
      ...returnTool,
      quantityAvailable: nextAvailable,
      condition: returnCondition,
      status: nextStatus,
      assignedToId: nextAvailable === returnTool.quantityTotal ? undefined : returnTool.assignedToId,
      assignedToName: nextAvailable === returnTool.quantityTotal ? undefined : returnTool.assignedToName,
      assignedJobId: nextAvailable === returnTool.quantityTotal ? undefined : returnTool.assignedJobId,
      assignedJobTitle: nextAvailable === returnTool.quantityTotal ? undefined : returnTool.assignedJobTitle,
      lastUpdated: nowDate,
      lastModifiedBy: operatorLabel
    };

    const logEntry: ToolMovementLog = {
      id: `tlog-${Date.now()}`,
      toolId: updated.id,
      toolName: updated.name,
      toolCode: updated.toolCode,
      action: 'RETURNED',
      employeeId: returnTool.assignedToId,
      employeeName: returnTool.assignedToName || 'Workshop Staff',
      jobId: returnTool.assignedJobId,
      jobTitle: returnTool.assignedJobTitle,
      quantity: qty,
      conditionAfter: returnCondition,
      date: nowDate,
      time: nowTime,
      notes: returnNotes.trim() || `Returned in ${returnCondition} condition`,
      recordedBy: operatorLabel
    };

    onUpdateTool(updated, logEntry);
    setReturnTool(null);
  };

  const handleToggleMaintenance = (tool: WorkshopTool) => {
    const nowDate = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const sendingToService = tool.status !== 'In Maintenance';
    const updated: WorkshopTool = {
      ...tool,
      status: sendingToService ? 'In Maintenance' : tool.quantityAvailable < tool.quantityTotal ? 'Checked Out' : 'Available',
      condition: sendingToService ? 'Needs Maintenance' : 'Good',
      lastServiceDate: sendingToService ? tool.lastServiceDate : nowDate,
      lastUpdated: nowDate,
      lastModifiedBy: operatorLabel
    };
    const logEntry: ToolMovementLog = {
      id: `tlog-${Date.now()}`,
      toolId: updated.id,
      toolName: updated.name,
      toolCode: updated.toolCode,
      action: sendingToService ? 'MAINTENANCE' : 'REPAIRED',
      quantity: updated.quantityTotal,
      conditionAfter: updated.condition,
      date: nowDate,
      time: nowTime,
      notes: sendingToService ? 'Marked for workshop maintenance / servicing' : 'Serviced and returned to active workshop pool',
      recordedBy: operatorLabel
    };
    onUpdateTool(updated, logEntry);
  };

  const handleExportCsv = () => {
    const headers = [
      'Tool Code',
      'Name',
      'Category',
      'Brand/Model',
      'Serial Number',
      'Total Units',
      'Available Units',
      'Condition',
      'Status',
      'Assigned To',
      'Location',
      'Unit Value (Le)',
      'Total Value (Le)',
      'Last Updated'
    ];
    const rows = filteredTools.map((t) => [
      t.toolCode,
      t.name,
      t.category,
      t.brandOrModel || '',
      t.serialNumber || '',
      t.quantityTotal,
      t.quantityAvailable,
      t.condition,
      t.status,
      t.assignedToName || '',
      t.location,
      t.unitValue,
      t.quantityTotal * t.unitValue,
      t.lastUpdated
    ]);
    const csv = '\uFEFF' + [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SwedsWood_Tools_Registry_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const logoDataUrl = await getLogoDataUrl('/logo.svg');

      const drawHeader = (isCont = false) => {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.35);
        doc.rect(10, 10, 190, 277, 'S');
        doc.setFillColor(15, 23, 42);
        doc.rect(10, 10, 190, 25, 'F');
        if (logoDataUrl) {
          try {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(13, 12.5, 20, 20, 2, 2, 'F');
            doc.addImage(logoDataUrl, 'PNG', 14, 13.5, 18, 18);
          } catch {}
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13.5);
        doc.setTextColor(255, 255, 255);
        doc.text('SWEDS WOOD ENTERPRISE', 37, 18.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(203, 213, 225);
        doc.text('Custom Hardwood Carpentry, Bespoke Furniture & Timber Logistics', 37, 23.5);
        doc.text('2 Swed Free Avenue, Sussex • Tel: +232 76 442590 • Email: swedswoodinfo@gmail.com', 37, 28);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(245, 158, 11);
        doc.text(isCont ? 'WORKSHOP TOOLS REGISTER (CONT.)' : 'WORKSHOP TOOLS REGISTER', 195, 18, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(248, 250, 252);
        doc.text(`Category: ${categoryFilter} • Status: ${statusFilter}`, 195, 23.5, { align: 'right' });
        doc.text(`Prepared By: ${currentUser?.name || 'System Admin'}`, 195, 28, { align: 'right' });
      };

      drawHeader(false);

      const drawTableHead = (y: number) => {
        doc.setFillColor(15, 23, 42);
        doc.rect(14, y, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(255, 255, 255);
        doc.text('Code', 16, y + 4.7);
        doc.text('Tool / Equipment', 40, y + 4.7);
        doc.text('Category', 92, y + 4.7);
        doc.text('Avail / Total', 127, y + 4.7, { align: 'center' });
        doc.text('Condition', 143, y + 4.7);
        doc.text('Assigned / Location', 165, y + 4.7);
        return y + 7;
      };

      let curY = drawTableHead(42);
      filteredTools.forEach((tool, idx) => {
        const nameLines = doc.splitTextToSize(`${tool.name}${tool.brandOrModel ? ` (${tool.brandOrModel})` : ''}`, 48);
        const rowH = Math.max(7.5, nameLines.length * 3.6 + 3);
        if (curY + rowH > 266) {
          doc.addPage();
          drawHeader(true);
          curY = drawTableHead(42);
        }
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, curY, 182, rowH, 'F');
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text(tool.toolCode, 16, curY + 4.5);
        doc.text(nameLines, 40, curY + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(tool.category, 30)[0], 92, curY + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${tool.quantityAvailable} / ${tool.quantityTotal}`, 127, curY + 4.5, { align: 'center' });
        doc.text(tool.condition, 143, curY + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(tool.assignedToName || tool.location, 30)[0], 165, curY + 4.5);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, curY + rowH, 196, curY + rowH);
        curY += rowH;
      });

      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(148, 163, 184);
        doc.line(14, 274, 196, 274);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text('SWEDS WOOD ENTERPRISE — 2 Swed Free Avenue, Sussex • Email: swedswoodinfo@gmail.com', 14, 278.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Official Workshop Tools & Equipment Register • Printed ${new Date().toLocaleDateString()}`, 14, 282.5);
        doc.text(`Page ${p} of ${totalPages}`, 196, 280.5, { align: 'right' });
      }

      doc.save(`SwedsWood_Tools_Register_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating Tools PDF:', err);
      alert('Failed to generate Tools Register PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const statusColor = (status: ToolStatus) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Checked Out':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'In Maintenance':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Lost / Retired':
        return 'bg-red-50 text-red-800 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600">
            <Hammer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Workshop Tools &amp; Equipment</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track power tools, hand tools, tool crib checkouts, artisan assignments, servicing, and maintenance history.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAuditor && (
            <div className="flex items-center gap-1 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-black">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auditor View</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={handleDownloadPdf}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
          <button
            type="button"
            onClick={() => printDocument('tools')}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-600" />
            <span>Print Tools</span>
          </button>
          {!isAuditor && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Tool</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tool Units</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalUnits}</p>
          <p className="text-xs text-slate-500 mt-0.5">{metrics.assetLines} distinct asset types</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Available in Tool Crib</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.availableUnits}</p>
          <p className="text-xs text-slate-500 mt-0.5">{metrics.checkedOutUnits} checked out to staff</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Maintenance / Repairs</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{metrics.maintenanceCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Tools flagged for attention</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Asset Valuation</p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{formatCurrency(metrics.totalAssetValue, 0)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Estimated replacement value</p>
        </div>
      </div>

      {/* Sub-Tabs + Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('REGISTRY')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition ${
                activeSubTab === 'REGISTRY'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>Tools Registry ({filteredTools.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('MOVEMENTS')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition ${
                activeSubTab === 'MOVEMENTS'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Checkout &amp; Service Log ({filteredLogs.length})</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tool name, code, brand, serial #, artisan, or bay..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>
          {activeSubTab === 'REGISTRY' && (
            <>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as 'All' | ToolCategory)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
              >
                <option value="All">All Categories</option>
                {TOOL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'All' | ToolStatus)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Checked Out">Checked Out</option>
                <option value="In Maintenance">In Maintenance</option>
                <option value="Lost / Retired">Lost / Retired</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      {activeSubTab === 'REGISTRY' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                  <th className="py-3.5 px-4">Code &amp; Tool</th>
                  <th className="py-3.5 px-4">Category &amp; Location</th>
                  <th className="py-3.5 px-4 text-center">Units (Avail/Total)</th>
                  <th className="py-3.5 px-4">Condition &amp; Status</th>
                  <th className="py-3.5 px-4">Assigned Artisan / Job</th>
                  <th className="py-3.5 px-4 text-right">Value (Le)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <Hammer className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-600">No workshop tools registered yet.</p>
                      <p className="text-[11px] mt-1">Click &ldquo;Add Tool&rdquo; to register drills, saws, clamps, or hand tools.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTools.map((tool) => {
                    const checkedOut = tool.quantityTotal - tool.quantityAvailable;
                    return (
                      <tr key={tool.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            {tool.toolCode}
                          </span>
                          <p className="font-black text-slate-900 mt-1">{tool.name}</p>
                          {(tool.brandOrModel || tool.serialNumber) && (
                            <p className="text-[11px] text-slate-500">
                              {tool.brandOrModel} {tool.serialNumber ? `• SN: ${tool.serialNumber}` : ''}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{tool.category}</p>
                          <p className="text-[11px] text-slate-500">{tool.location}</p>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-black text-slate-900">
                            {tool.quantityAvailable} / {tool.quantityTotal}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 space-y-1">
                          <div>
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(tool.status)}`}>
                              {tool.status}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-600">Cond: {tool.condition}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          {tool.assignedToName ? (
                            <>
                              <p className="font-bold text-slate-900">{tool.assignedToName}</p>
                              {tool.assignedJobTitle && (
                                <p className="text-[11px] text-amber-700 font-semibold">{tool.assignedJobTitle}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 italic">In Tool Crib</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          <p className="font-bold text-slate-900">{formatCurrency(tool.unitValue * tool.quantityTotal, 0)}</p>
                          <p className="text-[10px] text-slate-500">{formatCurrency(tool.unitValue, 0)} ea</p>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            {!isAuditor && tool.quantityAvailable > 0 && tool.status !== 'Lost / Retired' && (
                              <button
                                type="button"
                                onClick={() => openCheckoutModal(tool)}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Issue</span>
                              </button>
                            )}
                            {!isAuditor && checkedOut > 0 && (
                              <button
                                type="button"
                                onClick={() => openReturnModal(tool)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Return</span>
                              </button>
                            )}
                            {!isAuditor && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleMaintenance(tool)}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg cursor-pointer"
                                  title={tool.status === 'In Maintenance' ? 'Mark Repaired / Available' : 'Send to Maintenance'}
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(tool)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                  title="Edit Tool"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete tool "${tool.name}" (${tool.toolCode})?`)) {
                                    onDeleteTool(tool.id);
                                  }
                                }}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer"
                                title="Delete Tool"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Tool</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Artisan / Job</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Condition &amp; Notes</th>
                  <th className="py-3 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No tool checkout or maintenance logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <p className="font-bold text-slate-900">{log.date}</p>
                        <p className="text-[10px] text-slate-500">{log.time}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{log.toolName}</p>
                        <p className="text-[10px] font-mono text-amber-700">{log.toolCode}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-black uppercase">
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{log.employeeName || 'Tool Crib'}</p>
                        {log.jobTitle && <p className="text-[10px] text-amber-700">{log.jobTitle}</p>}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">{log.quantity}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-700">{log.conditionAfter}</span>
                        {log.notes && <p className="text-[11px] text-slate-500">{log.notes}</p>}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">{log.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Tool Modal */}
      {isToolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Hammer className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingTool ? `Edit Tool (${editingTool.toolCode})` : 'Register Workshop Tool'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsToolModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTool} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Tool Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Makita Circular Saw 7-1/4"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ToolCategory)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  >
                    {TOOL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Brand / Model</label>
                  <input
                    type="text"
                    placeholder="e.g. DeWalt DWE7491"
                    value={brandOrModel}
                    onChange={(e) => setBrandOrModel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Serial Number</label>
                  <input
                    type="text"
                    placeholder="Optional S/N"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Total Units *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityTotal}
                    onChange={(e) => setQuantityTotal(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Condition *</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ToolCondition)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  >
                    {TOOL_CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Unit Value (Le)</label>
                  <input
                    type="number"
                    min="0"
                    value={unitValue}
                    onChange={(e) => setUnitValue(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Storage Location / Bay *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {LOCATION_PRESETS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className="px-2 py-1 bg-slate-100 hover:bg-amber-50 text-[10px] font-bold text-slate-600 hover:text-amber-800 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      + {loc}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Next Service Date</label>
                  <input
                    type="date"
                    value={nextServiceDate}
                    onChange={(e) => setNextServiceDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Blade size, accessories included, warranty info..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsToolModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl cursor-pointer shadow-sm"
                >
                  {editingTool ? 'Save Changes' : 'Register Tool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Issue / Check Out Tool</h3>
              <button type="button" onClick={() => setCheckoutTool(null)} className="p-1.5 rounded-lg bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-bold text-slate-700">
              {checkoutTool.name} <span className="font-mono text-amber-700">({checkoutTool.toolCode})</span> — {checkoutTool.quantityAvailable} available
            </p>
            <form onSubmit={handleCheckoutSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Issue To Employee *</label>
                <select
                  required
                  value={issueEmployeeId}
                  onChange={(e) => setIssueEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Job (Optional)</label>
                <select
                  value={issueJobId}
                  onChange={(e) => setIssueJobId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                >
                  <option value="">-- General Workshop Use --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title} ({j.customerName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Quantity to Issue *</label>
                <input
                  type="number"
                  min="1"
                  max={checkoutTool.quantityAvailable}
                  required
                  value={issueQty}
                  onChange={(e) => setIssueQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Checkout Notes</label>
                <input
                  type="text"
                  placeholder="Optional bay or site kit note..."
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setCheckoutTool(null)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black cursor-pointer">
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Return Tool to Crib</h3>
              <button type="button" onClick={() => setReturnTool(null)} className="p-1.5 rounded-lg bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-bold text-slate-700">
              {returnTool.name} <span className="font-mono text-amber-700">({returnTool.toolCode})</span>
            </p>
            <form onSubmit={handleReturnSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Units Returned *</label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, returnTool.quantityTotal - returnTool.quantityAvailable)}
                  required
                  value={returnQty}
                  onChange={(e) => setReturnQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Inspection Condition *</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as ToolCondition)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                >
                  {TOOL_CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Inspection Notes</label>
                <input
                  type="text"
                  placeholder="Condition remarks or damage report..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setReturnTool(null)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black cursor-pointer">
                  Confirm Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          PRINT AREA: WORKSHOP TOOLS REGISTER
         ========================================== */}
      <div id="tools-print-area" className="hidden bg-white text-black p-6 space-y-6">
        <div className="print-header">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Swedswood Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">SWEDS WOOD ENTERPRISE</h1>
              <p className="text-xs text-gray-600">2 Swed Free Avenue, Sussex &bull; Workshop Tools &amp; Equipment Inventory</p>
            </div>
          </div>
          <div className="text-right text-xs font-mono">
            <p className="font-bold">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p>Scope: {categoryFilter} / {statusFilter} ({filteredTools.length} tools)</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="p-3 border border-slate-300 rounded-lg">
            <span className="uppercase text-[10px] text-gray-500 font-bold">Total Units</span>
            <p className="text-base font-black font-mono">{metrics.totalUnits}</p>
          </div>
          <div className="p-3 border border-slate-300 rounded-lg">
            <span className="uppercase text-[10px] text-gray-500 font-bold">Available</span>
            <p className="text-base font-black font-mono">{metrics.availableUnits}</p>
          </div>
          <div className="p-3 border border-slate-300 rounded-lg">
            <span className="uppercase text-[10px] text-gray-500 font-bold">Checked Out</span>
            <p className="text-base font-black font-mono">{metrics.checkedOutUnits}</p>
          </div>
          <div className="p-3 border border-slate-300 rounded-lg">
            <span className="uppercase text-[10px] text-gray-500 font-bold">Total Value</span>
            <p className="text-base font-black font-mono">{formatCurrency(metrics.totalAssetValue, 0)}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 uppercase text-[10px]">
              <th className="py-2 px-2">Code</th>
              <th className="py-2 px-2">Tool Name &amp; Model</th>
              <th className="py-2 px-2">Category</th>
              <th className="py-2 px-2 text-center">Avail/Total</th>
              <th className="py-2 px-2">Condition</th>
              <th className="py-2 px-2">Assigned / Location</th>
              <th className="py-2 px-2 text-right">Value (Le)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredTools.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">No tools match the active filter.</td>
              </tr>
            ) : (
              filteredTools.map((tool) => (
                <tr key={tool.id}>
                  <td className="py-2 px-2 font-mono font-bold whitespace-nowrap">{tool.toolCode}</td>
                  <td className="py-2 px-2 font-bold">
                    {tool.name} {tool.brandOrModel ? `(${tool.brandOrModel})` : ''}
                  </td>
                  <td className="py-2 px-2">{tool.category}</td>
                  <td className="py-2 px-2 text-center font-mono">{tool.quantityAvailable} / {tool.quantityTotal}</td>
                  <td className="py-2 px-2">{tool.condition} ({tool.status})</td>
                  <td className="py-2 px-2">{tool.assignedToName ? `${tool.assignedToName} • ` : ''}{tool.location}</td>
                  <td className="py-2 px-2 text-right font-mono">{formatCurrency(tool.unitValue * tool.quantityTotal, 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="print-system-footer flex justify-between items-center text-[10px] pt-3 border-t border-slate-300">
          <span>SWEDS WOOD ENTERPRISE &bull; 2 Swed Free Avenue, Sussex &bull; swedswoodinfo@gmail.com</span>
          <span>Official Workshop Tools &amp; Equipment Register &bull; {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
