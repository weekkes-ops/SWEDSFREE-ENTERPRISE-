import React, { useState, useMemo } from 'react';
import {
  Fuel,
  Plus,
  Search,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Droplets,
  Edit3,
  Trash2,
  FileText,
  Eye,
  X,
  AlertTriangle,
  ShieldCheck,
  Filter,
  Truck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  FuelRequest,
  FuelType,
  FuelRequestStatus,
  FuelRequestUrgency,
  Employee,
  Job,
  formatCurrency
} from '../types';
import { printDocument } from '../utils/printHelper';
import { getLogoDataUrl } from '../utils/pdfGenerator';
import { getNextAscendingReference, commitAscendingReference } from '../utils/referenceSequencer';

interface FuelRequestManagerProps {
  fuelRequests: FuelRequest[];
  employees: Employee[];
  jobs: Job[];
  currentUser: Employee | null;
  onAddFuelRequest: (req: FuelRequest) => void;
  onUpdateFuelRequest: (req: FuelRequest) => void;
  onDeleteFuelRequest: (id: string) => void;
  onRecordFuelExpense?: (req: FuelRequest) => void;
}

const EQUIPMENT_PRESETS = [
  'Main Workshop Generator (Diesel)',
  'Backup Workshop Generator (Petrol)',
  'Delivery Pickup Truck',
  'Timber Logistics Van',
  'Chainsaw / Portable Cutter',
  'Site Compressor / Sprayer'
];

const csvEscape = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function FuelRequestManager({
  fuelRequests,
  employees,
  jobs,
  currentUser,
  onAddFuelRequest,
  onUpdateFuelRequest,
  onDeleteFuelRequest,
  onRecordFuelExpense
}: FuelRequestManagerProps) {
  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';
  const isAuditor = currentUser?.role === 'Auditor';
  const canApprove = isAdmin || isManager;

  const [searchTerm, setSearchTerm] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<'All' | FuelType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | FuelRequestStatus>('All');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<FuelRequest | null>(null);

  // Voucher Preview / Single Print Modal
  const [voucherRequest, setVoucherRequest] = useState<FuelRequest | null>(null);

  // Form fields
  const [fuelType, setFuelType] = useState<FuelType>('Diesel');
  const [quantityLiters, setQuantityLiters] = useState<string>('20');
  const [unitCost, setUnitCost] = useState<string>('30');
  const [equipmentOrVehicle, setEquipmentOrVehicle] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [linkedJobId, setLinkedJobId] = useState<string>('');
  const [vendorOrStation, setVendorOrStation] = useState<string>('NP / Total Filling Station');
  const [odometerOrHours, setOdometerOrHours] = useState<string>('');
  const [requestedById, setRequestedById] = useState<string>(currentUser?.id || '');
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [urgency, setUrgency] = useState<FuelRequestUrgency>('Routine');
  const [notes, setNotes] = useState<string>('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const sortedRequests = useMemo(() => {
    return [...fuelRequests].sort((a, b) => {
      const dateCmp = (b.requestDate || '').localeCompare(a.requestDate || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [fuelRequests]);

  const filteredRequests = useMemo(() => {
    return sortedRequests.filter((req) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        req.requestNo.toLowerCase().includes(q) ||
        req.requestedByName.toLowerCase().includes(q) ||
        req.equipmentOrVehicle.toLowerCase().includes(q) ||
        req.purpose.toLowerCase().includes(q) ||
        (req.vendorOrStation || '').toLowerCase().includes(q) ||
        (req.linkedJobTitle || '').toLowerCase().includes(q);
      const matchesFuel = fuelTypeFilter === 'All' || req.fuelType === fuelTypeFilter;
      const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
      return matchesSearch && matchesFuel && matchesStatus;
    });
  }, [sortedRequests, searchTerm, fuelTypeFilter, statusFilter]);

  const metrics = useMemo(() => {
    const dieselList = filteredRequests.filter((r) => r.fuelType === 'Diesel' && r.status !== 'Rejected');
    const petrolList = filteredRequests.filter((r) => r.fuelType === 'Petrol' && r.status !== 'Rejected');
    const pendingCount = filteredRequests.filter((r) => r.status === 'Pending').length;
    const dispensedValue = filteredRequests
      .filter((r) => r.status === 'Dispensed')
      .reduce((s, r) => s + (r.totalCost || 0), 0);

    return {
      totalCount: filteredRequests.length,
      pendingCount,
      dieselLiters: dieselList.reduce((s, r) => s + (r.quantityLiters || 0), 0),
      dieselCost: dieselList.reduce((s, r) => s + (r.totalCost || 0), 0),
      petrolLiters: petrolList.reduce((s, r) => s + (r.quantityLiters || 0), 0),
      petrolCost: petrolList.reduce((s, r) => s + (r.totalCost || 0), 0),
      dispensedValue,
      totalProjectedValue: dieselList.reduce((s, r) => s + (r.totalCost || 0), 0) + petrolList.reduce((s, r) => s + (r.totalCost || 0), 0)
    };
  }, [filteredRequests]);

  const openCreateModal = () => {
    setEditingRequest(null);
    setFuelType('Diesel');
    setQuantityLiters('20');
    setUnitCost('30');
    setEquipmentOrVehicle('');
    setPurpose('');
    setLinkedJobId('');
    setVendorOrStation('NP / Total Filling Station');
    setOdometerOrHours('');
    setRequestedById(currentUser?.id || (employees[0]?.id || ''));
    setRequestDate(new Date().toISOString().split('T')[0]);
    setUrgency('Routine');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (req: FuelRequest) => {
    setEditingRequest(req);
    setFuelType(req.fuelType);
    setQuantityLiters(String(req.quantityLiters));
    setUnitCost(String(req.unitCost));
    setEquipmentOrVehicle(req.equipmentOrVehicle);
    setPurpose(req.purpose);
    setLinkedJobId(req.linkedJobId || '');
    setVendorOrStation(req.vendorOrStation || '');
    setOdometerOrHours(req.odometerOrHours || '');
    setRequestedById(req.requestedById);
    setRequestDate(req.requestDate);
    setUrgency(req.urgency);
    setNotes(req.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantityLiters) || 0;
    const rate = parseFloat(unitCost) || 0;
    if (qty <= 0) {
      alert('Please enter a valid fuel quantity in Liters greater than 0.');
      return;
    }
    if (!equipmentOrVehicle.trim() || !purpose.trim()) {
      alert('Please specify the Equipment/Vehicle and Purpose for this fuel request.');
      return;
    }

    const reqEmp = employees.find((emp) => emp.id === requestedById) || currentUser;
    const jobObj = jobs.find((j) => j.id === linkedJobId);
    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    if (editingRequest) {
      const updated: FuelRequest = {
        ...editingRequest,
        fuelType,
        quantityLiters: qty,
        unitCost: rate,
        totalCost: qty * rate,
        equipmentOrVehicle: equipmentOrVehicle.trim(),
        purpose: purpose.trim(),
        linkedJobId: linkedJobId || undefined,
        linkedJobTitle: jobObj?.title || undefined,
        vendorOrStation: vendorOrStation.trim() || undefined,
        odometerOrHours: odometerOrHours.trim() || undefined,
        requestedById: reqEmp?.id || editingRequest.requestedById,
        requestedByName: reqEmp?.name || editingRequest.requestedByName,
        requestedByRole: reqEmp?.role || editingRequest.requestedByRole,
        requestDate,
        urgency,
        notes: notes.trim() || undefined,
        lastUpdated: nowIso
      };
      onUpdateFuelRequest(updated);
    } else {
      const requestNo = getNextAscendingReference('FUEL');
      commitAscendingReference('FUEL', requestNo);
      const newReq: FuelRequest = {
        id: `fuel-${Date.now()}`,
        requestNo,
        fuelType,
        quantityLiters: qty,
        unitCost: rate,
        totalCost: qty * rate,
        equipmentOrVehicle: equipmentOrVehicle.trim(),
        purpose: purpose.trim(),
        linkedJobId: linkedJobId || undefined,
        linkedJobTitle: jobObj?.title || undefined,
        vendorOrStation: vendorOrStation.trim() || undefined,
        odometerOrHours: odometerOrHours.trim() || undefined,
        requestedById: reqEmp?.id || 'staff',
        requestedByName: reqEmp?.name || 'Workshop Staff',
        requestedByRole: reqEmp?.role || 'Employee',
        requestDate,
        requestTime: nowTime,
        urgency,
        status: 'Pending',
        notes: notes.trim() || undefined,
        createdAt: nowIso,
        lastUpdated: nowIso
      };
      onAddFuelRequest(newReq);
    }

    setIsModalOpen(false);
  };

  const handleStatusTransition = (req: FuelRequest, nextStatus: FuelRequestStatus) => {
    const actor = currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Admin';
    const stamp = new Date().toLocaleString();
    const updated: FuelRequest = {
      ...req,
      status: nextStatus,
      approvedBy: nextStatus === 'Approved' || (nextStatus === 'Dispensed' && !req.approvedBy) ? actor : req.approvedBy,
      approvedAt: nextStatus === 'Approved' || (nextStatus === 'Dispensed' && !req.approvedAt) ? stamp : req.approvedAt,
      dispensedBy: nextStatus === 'Dispensed' ? actor : req.dispensedBy,
      dispensedAt: nextStatus === 'Dispensed' ? stamp : req.dispensedAt,
      lastUpdated: new Date().toISOString()
    };
    onUpdateFuelRequest(updated);
    if (nextStatus === 'Dispensed' && onRecordFuelExpense) {
      onRecordFuelExpense(updated);
    }
    if (voucherRequest?.id === req.id) {
      setVoucherRequest(updated);
    }
  };

  // ==========================================================
  // PDF DOWNLOAD WITH OFFICIAL SYSTEM HEADER AND SYSTEM FOOTER
  // ==========================================================
  const drawSystemPdfHeader = (doc: jsPDF, logoDataUrl: string | null, docTitle: string, rightLine1: string, rightLine2: string) => {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.rect(10, 10, 190, 277, 'S');

    // Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(10, 10, 190, 25, 'F');

    let logoDrawn = false;
    if (logoDataUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(13, 12.5, 20, 20, 2, 2, 'F');
        doc.addImage(logoDataUrl, 'PNG', 14, 13.5, 18, 18);
        logoDrawn = true;
      } catch {}
    }
    if (!logoDrawn) {
      doc.setFillColor(217, 119, 6);
      doc.roundedRect(14, 13, 18, 18, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('SW', 23, 24.5, { align: 'center' });
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

    // Document Title on Right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(245, 158, 11);
    doc.text(docTitle, 195, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(248, 250, 252);
    doc.text(rightLine1, 195, 23.5, { align: 'right' });
    doc.text(rightLine2, 195, 28, { align: 'right' });
  };

  const applySystemPdfFooters = (doc: jsPDF, footerTag: string) => {
    const totalPages = doc.getNumberOfPages();
    const generatedAt = new Date().toLocaleString();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.line(14, 274, 196, 274);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text('SWEDS WOOD ENTERPRISE — 2 Swed Free Avenue, Sussex • Email: swedswoodinfo@gmail.com', 14, 278.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(`${footerTag} • Printed ${generatedAt}`, 14, 282.5);
      doc.text(`Page ${p} of ${totalPages}`, 196, 280.5, { align: 'right' });
    }
  };

  const handleDownloadRegisterPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const logoDataUrl = await getLogoDataUrl('/logo.svg');

      const drawHeaderOnPage = (isCont = false) => {
        drawSystemPdfHeader(
          doc,
          logoDataUrl,
          isCont ? 'FUEL REQUEST REGISTER (CONT.)' : 'FUEL REQUEST REGISTER',
          `Scope: ${fuelTypeFilter} Fuel / ${statusFilter} Status`,
          `Prepared By: ${currentUser?.name || 'System Admin'}`
        );
      };

      drawHeaderOnPage(false);

      // Summary Boxes
      const kpiY = 40;
      const cards = [
        { label: 'TOTAL REQUESTS', val: `${metrics.totalCount}` },
        { label: 'DIESEL VOLUME', val: `${metrics.dieselLiters.toLocaleString()} L (${formatCurrency(metrics.dieselCost, 0)})` },
        { label: 'PETROL VOLUME', val: `${metrics.petrolLiters.toLocaleString()} L (${formatCurrency(metrics.petrolCost, 0)})` },
        { label: 'TOTAL FUEL VALUE', val: formatCurrency(metrics.totalProjectedValue, 0) }
      ];
      cards.forEach((c, idx) => {
        const x = 14 + idx * 46;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(x, kpiY, 44, 15, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(c.label, x + 2.5, kpiY + 5);
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(doc.splitTextToSize(c.val, 39), x + 2.5, kpiY + 10.5);
      });

      const drawTableHeader = (y: number) => {
        doc.setFillColor(15, 23, 42);
        doc.rect(14, y, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(255, 255, 255);
        doc.text('Req #', 16, y + 4.7);
        doc.text('Date', 40, y + 4.7);
        doc.text('Fuel', 58, y + 4.7);
        doc.text('Liters', 75, y + 4.7, { align: 'right' });
        doc.text('Equipment / Vehicle & Purpose', 79, y + 4.7);
        doc.text('Requested By', 137, y + 4.7);
        doc.text('Status', 164, y + 4.7);
        doc.text('Total (Le)', 194, y + 4.7, { align: 'right' });
        return y + 7;
      };

      let curY = drawTableHeader(60);

      if (filteredRequests.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('No Diesel or Petrol fuel requests match the active filters.', 105, curY + 10, { align: 'center' });
      } else {
        filteredRequests.forEach((req, idx) => {
          const descText = `${req.equipmentOrVehicle} — ${req.purpose}`;
          const descLines = doc.splitTextToSize(descText, 55);
          const rowH = Math.max(7.5, descLines.length * 3.6 + 3);

          if (curY + rowH > 264) {
            doc.addPage();
            drawHeaderOnPage(true);
            curY = drawTableHeader(40);
          }

          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, curY, 182, rowH, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(15, 23, 42);
          doc.text(req.requestNo, 16, curY + 4.5);

          doc.setFont('helvetica', 'normal');
          doc.text(req.requestDate, 40, curY + 4.5);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(req.fuelType === 'Diesel' ? 180 : 37, req.fuelType === 'Diesel' ? 83 : 99, req.fuelType === 'Diesel' ? 9 : 235);
          doc.text(req.fuelType.toUpperCase(), 58, curY + 4.5);

          doc.setTextColor(15, 23, 42);
          doc.text(`${req.quantityLiters} L`, 75, curY + 4.5, { align: 'right' });

          doc.setFont('helvetica', 'normal');
          doc.text(descLines, 79, curY + 4.5);

          doc.text(doc.splitTextToSize(req.requestedByName, 25)[0], 137, curY + 4.5);
          doc.setFont('helvetica', 'bold');
          doc.text(req.status.toUpperCase(), 164, curY + 4.5);
          doc.text(formatCurrency(req.totalCost, 0), 194, curY + 4.5, { align: 'right' });

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.15);
          doc.line(14, curY + rowH, 196, curY + rowH);
          curY += rowH;
        });
      }

      // Sign-off Block
      if (curY + 26 > 268) {
        doc.addPage();
        drawHeaderOnPage(true);
        curY = 44;
      } else {
        curY += 10;
      }

      doc.setDrawColor(148, 163, 184);
      doc.line(14, curY + 10, 68, curY + 10);
      doc.line(78, curY + 10, 132, curY + 10);
      doc.line(142, curY + 10, 196, curY + 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text('Prepared By (Workshop Staff)', 14, curY + 14);
      doc.text('Approved By (Manager / Admin)', 78, curY + 14);
      doc.text('Audited By (Internal Audit)', 142, curY + 14);

      applySystemPdfFooters(doc, 'Official Diesel & Petrol Fuel Control Register');
      doc.save(`SwedsWood_Fuel_Register_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating Fuel Register PDF:', err);
      alert('Failed to generate Fuel Register PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadVoucherPdf = async (req: FuelRequest) => {
    setIsDownloadingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const logoDataUrl = await getLogoDataUrl('/logo.svg');

      drawSystemPdfHeader(
        doc,
        logoDataUrl,
        'FUEL REQUISITION VOUCHER',
        `Voucher #: ${req.requestNo}`,
        `Date: ${req.requestDate} • Status: ${req.status.toUpperCase()}`
      );

      // Fuel Highlight Box
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, 42, 182, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9);
      doc.text(`${req.fuelType.toUpperCase()} REQUISITION AMOUNT`, 20, 49.5);
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(`${req.quantityLiters} Liters (${formatCurrency(req.totalCost, 2)})`, 20, 58.5);

      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Rate: ${formatCurrency(req.unitCost, 2)} / L`, 190, 50, { align: 'right' });
      doc.text(`Urgency: ${req.urgency.toUpperCase()}`, 190, 58, { align: 'right' });

      // Details Grid
      const rows: [string, string][] = [
        ['Requisition Number', req.requestNo],
        ['Fuel Grade / Type', `${req.fuelType} (Workshop / Transport Fuel)`],
        ['Requested By', `${req.requestedByName} (${req.requestedByRole})`],
        ['Request Date & Time', `${req.requestDate}${req.requestTime ? ` at ${req.requestTime}` : ''}`],
        ['Target Equipment / Vehicle', req.equipmentOrVehicle],
        ['Operational Purpose', req.purpose],
        ['Linked Commission / Job', req.linkedJobTitle || 'General Workshop / Transport Operations'],
        ['Filling Station / Vendor', req.vendorOrStation || 'Authorized Workshop Fuel Station'],
        ['Odometer / Generator Meter', req.odometerOrHours || 'N/A'],
        ['Approval Status', `${req.status}${req.approvedBy ? ` — Approved by ${req.approvedBy}` : ''}`],
        ['Dispensing Confirmation', req.dispensedBy ? `${req.dispensedBy} (${req.dispensedAt || ''})` : 'Pending Dispensing'],
        ['Additional Notes', req.notes || 'None']
      ];

      let y = 72;
      rows.forEach(([label, val], idx) => {
        const valLines = doc.splitTextToSize(val, 114);
        const h = Math.max(8, valLines.length * 4.5 + 3.5);
        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.rect(14, y, 60, h, 'FD');
        doc.rect(74, y, 122, h, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(label, 17, y + 5.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(valLines, 77, y + 5.2);
        y += h;
      });

      // Sign-off Section
      const sigY = Math.max(y + 16, 226);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.3);
      doc.line(14, sigY, 68, sigY);
      doc.line(78, sigY, 132, sigY);
      doc.line(142, sigY, 196, sigY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Requester Signature', 14, sigY + 4.5);
      doc.text('Manager / Admin Approval', 78, sigY + 4.5);
      doc.text('Pump Attendant / Cashier', 142, sigY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(req.requestedByName, 14, sigY + 9);
      doc.text(req.approvedBy || 'Pending Approval', 78, sigY + 9);
      doc.text(req.dispensedBy || 'Pending Dispensing', 142, sigY + 9);

      applySystemPdfFooters(doc, `Fuel Requisition Voucher ${req.requestNo} (${req.fuelType})`);
      doc.save(`SwedsWood_Fuel_Voucher_${req.requestNo}.pdf`);
    } catch (err) {
      console.error('Error generating Fuel Voucher PDF:', err);
      alert('Failed to generate Fuel Voucher PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Request No',
      'Date',
      'Fuel Type',
      'Liters',
      'Unit Cost (Le)',
      'Total Cost (Le)',
      'Equipment / Vehicle',
      'Purpose',
      'Linked Job',
      'Vendor / Station',
      'Requested By',
      'Urgency',
      'Status',
      'Approved By',
      'Dispensed By'
    ];
    const rows = filteredRequests.map((r) => [
      r.requestNo,
      r.requestDate,
      r.fuelType,
      r.quantityLiters,
      r.unitCost,
      r.totalCost,
      r.equipmentOrVehicle,
      r.purpose,
      r.linkedJobTitle || '',
      r.vendorOrStation || '',
      `${r.requestedByName} (${r.requestedByRole})`,
      r.urgency,
      r.status,
      r.approvedBy || '',
      r.dispensedBy || ''
    ]);
    const csvContent =
      '\uFEFF' + [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SwedsWood_Fuel_Requests_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: FuelRequestStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Approved':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Dispensed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Rejected':
        return 'bg-red-50 text-red-800 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fuel Request Management (Diesel &amp; Petrol)</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard workshop generator, machinery, and logistics fuel requisitions with official header &amp; footer print/PDF vouchers.
              </p>
            </div>
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
            onClick={handleDownloadRegisterPdf}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>{isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}</span>
          </button>
          <button
            type="button"
            onClick={() => printDocument('fuel')}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-600" />
            <span>Print Register</span>
          </button>
          {!isAuditor && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Fuel Request</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Diesel Volume</span>
            <Droplets className="w-4 h-4 text-amber-600" />
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.dieselLiters.toLocaleString()} L</p>
          <p className="text-xs font-bold text-amber-700 mt-0.5">{formatCurrency(metrics.dieselCost, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Petrol Volume</span>
            <Fuel className="w-4 h-4 text-blue-600" />
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.petrolLiters.toLocaleString()} L</p>
          <p className="text-xs font-bold text-blue-700 mt-0.5">{formatCurrency(metrics.petrolCost, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.pendingCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Out of {metrics.totalCount} filtered requests</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Dispensed Fuel Value</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(metrics.dispensedValue, 0)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Authorized Spend</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search request #, requester, generator, vehicle, or station..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <select
            value={fuelTypeFilter}
            onChange={(e) => setFuelTypeFilter(e.target.value as 'All' | FuelType)}
            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
          >
            <option value="All">All Fuel Types (Diesel &amp; Petrol)</option>
            <option value="Diesel">Diesel Only</option>
            <option value="Petrol">Petrol Only</option>
          </select>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | FuelRequestStatus)}
            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Dispensed">Dispensed</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                <th className="py-3.5 px-4">Req # / Date</th>
                <th className="py-3.5 px-4">Fuel &amp; Volume</th>
                <th className="py-3.5 px-4">Equipment / Vehicle &amp; Purpose</th>
                <th className="py-3.5 px-4">Requested By</th>
                <th className="py-3.5 px-4 text-right">Amount (Le)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions &amp; Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <Fuel className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">No Diesel or Petrol requests recorded yet.</p>
                    <p className="text-[11px] mt-1">Click &ldquo;New Fuel Request&rdquo; to submit a requisition.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-black text-slate-900 font-mono">{req.requestNo}</p>
                      <p className="text-[11px] text-slate-500">{req.requestDate}</p>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${
                          req.fuelType === 'Diesel'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        <Droplets className="w-3 h-3" />
                        {req.fuelType}
                      </span>
                      <p className="font-black text-slate-900 mt-1">{req.quantityLiters} Liters</p>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{req.equipmentOrVehicle}</span>
                      </p>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{req.purpose}</p>
                      {req.linkedJobTitle && (
                        <p className="text-[10px] text-amber-700 font-bold mt-0.5">Job: {req.linkedJobTitle}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900">{req.requestedByName}</p>
                      <p className="text-[10px] text-slate-500">{req.requestedByRole}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                      <p className="font-black text-slate-900">{formatCurrency(req.totalCost, 0)}</p>
                      <p className="text-[10px] text-slate-500">@ {formatCurrency(req.unitCost, 0)}/L</p>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${statusBadge(req.status)}`}>
                        {req.status}
                      </span>
                      {req.urgency !== 'Routine' && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[9px] font-black uppercase">
                          {req.urgency}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => setVoucherRequest(req)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Preview & Print Voucher with System Header/Footer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          <span>Voucher</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadVoucherPdf(req)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Download Official Fuel Voucher PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>PDF</span>
                        </button>
                        {canApprove && req.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusTransition(req, 'Approved')}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusTransition(req, 'Rejected')}
                              className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {canApprove && req.status === 'Approved' && (
                          <button
                            type="button"
                            onClick={() => handleStatusTransition(req, 'Dispensed')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Mark Dispensed
                          </button>
                        )}
                        {!isAuditor && (req.status === 'Pending' || canApprove) && (
                          <button
                            type="button"
                            onClick={() => openEditModal(req)}
                            className="p-1.5 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 rounded-lg cursor-pointer"
                            title="Edit Fuel Request"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canApprove && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete fuel request ${req.requestNo}?`)) {
                                onDeleteFuelRequest(req.id);
                              }
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer"
                            title="Delete Request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {editingRequest ? `Edit Fuel Request (${editingRequest.requestNo})` : 'New Diesel / Petrol Request'}
                  </h2>
                  <p className="text-xs text-slate-500">Submit fuel requisition for generators, trucks, or workshop equipment.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Fuel Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Diesel', 'Petrol'] as FuelType[]).map((ft) => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => setFuelType(ft)}
                        className={`py-2.5 px-3 rounded-xl font-black border text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          fuelType === ft
                            ? ft === 'Diesel'
                              ? 'bg-amber-600 text-white border-amber-700'
                              : 'bg-blue-600 text-white border-blue-700'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Droplets className="w-3.5 h-3.5" />
                        <span>{ft}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Request Date *</label>
                  <input
                    type="date"
                    required
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Quantity (Liters) *</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={quantityLiters}
                    onChange={(e) => setQuantityLiters(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Unit Price (Le / Liter) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-amber-800">Estimated Total</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {formatCurrency((parseFloat(quantityLiters) || 0) * (parseFloat(unitCost) || 0), 0)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Target Generator / Vehicle / Machinery *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Workshop Generator (Diesel) or Delivery Truck"
                  value={equipmentOrVehicle}
                  onChange={(e) => setEquipmentOrVehicle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {EQUIPMENT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setEquipmentOrVehicle(preset);
                        if (preset.includes('Petrol')) setFuelType('Petrol');
                        if (preset.includes('Diesel')) setFuelType('Diesel');
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-amber-50 text-[10px] font-bold text-slate-600 hover:text-amber-800 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Operational Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Powering workshop planers during timber milling or client site delivery"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Requested By *</label>
                  {canApprove ? (
                    <select
                      value={requestedById}
                      onChange={(e) => setRequestedById(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700">
                      {currentUser?.name} ({currentUser?.role})
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as FuelRequestUrgency)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Linked Job (Optional)</label>
                  <select
                    value={linkedJobId}
                    onChange={(e) => setLinkedJobId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  >
                    <option value="">-- Workshop General --</option>
                    {jobs.map((jb) => (
                      <option key={jb.id} value={jb.id}>
                        {jb.title} ({jb.customerName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Filling Station / Vendor</label>
                  <input
                    type="text"
                    value={vendorOrStation}
                    onChange={(e) => setVendorOrStation(e.target.value)}
                    placeholder="e.g. NP Station Sussex / Total"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Odometer / Generator Hours</label>
                  <input
                    type="text"
                    value={odometerOrHours}
                    onChange={(e) => setOdometerOrHours(e.target.value)}
                    placeholder="e.g. 42,150 km or 1,280 hrs"
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
                  placeholder="Optional voucher instructions or remarks..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl cursor-pointer shadow-sm"
                >
                  {editingRequest ? 'Save Changes' : 'Submit Fuel Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Fuel Voucher Preview & Print Modal */}
      {voucherRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm overflow-y-auto p-4 flex items-start justify-center">
          <div id="fuel-single-print-area" className="bg-white text-black rounded-2xl w-full max-w-3xl p-6 sm:p-8 my-6 border border-slate-200 shadow-2xl space-y-6">
            {/* Toolbar (hidden when printing) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 print:hidden">
              <h3 className="text-sm font-black text-slate-900">
                Fuel Voucher Preview — {voucherRequest.requestNo}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadVoucherPdf(voucherRequest)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => printDocument('fuel-single')}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherRequest(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Official System Header */}
            <div className="print-header flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="Swedswood Logo" className="w-12 h-12 object-contain" />
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight">SWEDS WOOD ENTERPRISE</h1>
                  <p className="text-xs text-gray-600">2 Swed Free Avenue, Sussex &bull; Tel: +232 76 442590 &bull; swedswoodinfo@gmail.com</p>
                  <p className="text-[11px] font-bold uppercase text-amber-700 mt-0.5">Official Fuel Requisition &amp; Dispensing Voucher</p>
                </div>
              </div>
              <div className="text-right text-xs font-mono">
                <p className="font-black text-sm">{voucherRequest.requestNo}</p>
                <p>Date: {voucherRequest.requestDate}</p>
                <p className="font-bold uppercase">Status: {voucherRequest.status}</p>
              </div>
            </div>

            {/* Summary Highlight */}
            <div className="grid grid-cols-3 gap-3 bg-amber-50/70 border border-slate-300 rounded-xl p-4 text-xs">
              <div>
                <span className="uppercase text-[10px] font-bold text-slate-500 block">Fuel Type</span>
                <strong className="text-base font-black">{voucherRequest.fuelType.toUpperCase()}</strong>
              </div>
              <div>
                <span className="uppercase text-[10px] font-bold text-slate-500 block">Authorized Volume</span>
                <strong className="text-base font-black font-mono">{voucherRequest.quantityLiters} Liters</strong>
              </div>
              <div className="text-right">
                <span className="uppercase text-[10px] font-bold text-slate-500 block">Total Value ({formatCurrency(voucherRequest.unitCost, 0)}/L)</span>
                <strong className="text-base font-black font-mono">{formatCurrency(voucherRequest.totalCost, 2)}</strong>
              </div>
            </div>

            {/* Voucher Spec Table */}
            <table className="w-full text-left border-collapse text-xs border border-slate-300">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <th className="py-2.5 px-3 bg-slate-50 w-1/3 font-bold uppercase text-[10px]">Requested By</th>
                  <td className="py-2.5 px-3 font-bold">{voucherRequest.requestedByName} ({voucherRequest.requestedByRole})</td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3 bg-slate-50 font-bold uppercase text-[10px]">Equipment / Vehicle</th>
                  <td className="py-2.5 px-3 font-bold">{voucherRequest.equipmentOrVehicle}</td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3 bg-slate-50 font-bold uppercase text-[10px]">Operational Purpose</th>
                  <td className="py-2.5 px-3">{voucherRequest.purpose}</td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3 bg-slate-50 font-bold uppercase text-[10px]">Linked Job / Commission</th>
                  <td className="py-2.5 px-3">{voucherRequest.linkedJobTitle || 'General Workshop / Transport'}</td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3 bg-slate-50 font-bold uppercase text-[10px]">Filling Station / Vendor</th>
                  <td className="py-2.5 px-3">{voucherRequest.vendorOrStation || 'Authorized Station'}</td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3 bg-slate-50 font-bold uppercase text-[10px]">Odometer / Hours</th>
                  <td className="py-2.5 px-3">{voucherRequest.odometerOrHours || 'N/A'}</td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3 bg-slate-50 font-bold uppercase text-[10px]">Approval &amp; Dispense Trail</th>
                  <td className="py-2.5 px-3">
                    {voucherRequest.approvedBy ? `Approved by ${voucherRequest.approvedBy}` : 'Awaiting Approval'}
                    {voucherRequest.dispensedBy ? ` • Dispensed by ${voucherRequest.dispensedBy}` : ''}
                  </td>
                </tr>
                {voucherRequest.notes && (
                  <tr>
                    <th className="py-2.5 px-3 bg-slate-50 font-bold uppercase text-[10px]">Notes</th>
                    <td className="py-2.5 px-3">{voucherRequest.notes}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Signatories & Official System Footer */}
            <div className="print-system-footer pt-6 border-t-2 border-slate-900 space-y-5">
              <div className="grid grid-cols-3 gap-6 text-xs pt-4">
                <div>
                  <div className="border-b border-slate-700 h-8"></div>
                  <p className="font-bold mt-1">Requester Signature</p>
                  <p className="text-[10px] text-slate-500">{voucherRequest.requestedByName}</p>
                </div>
                <div>
                  <div className="border-b border-slate-700 h-8"></div>
                  <p className="font-bold mt-1">Manager / Admin Approval</p>
                  <p className="text-[10px] text-slate-500">{voucherRequest.approvedBy || 'Pending Authorization'}</p>
                </div>
                <div>
                  <div className="border-b border-slate-700 h-8"></div>
                  <p className="font-bold mt-1">Pump Attendant / Cashier</p>
                  <p className="text-[10px] text-slate-500">{voucherRequest.dispensedBy || 'Pending Dispense'}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 border-t border-slate-200 pt-2">
                <span>SWEDS WOOD ENTERPRISE &bull; 2 Swed Free Avenue, Sussex &bull; swedswoodinfo@gmail.com</span>
                <span>Official Fuel Voucher {voucherRequest.requestNo} &bull; Printed {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          PRINT AREA: FULL FUEL REQUEST REGISTER (WITH SYSTEM HEADER & FOOTER)
         ========================================== */}
      <div id="fuel-print-area" className="hidden bg-white text-black p-6 space-y-6">
        <div className="print-header">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Swedswood Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">SWEDS WOOD ENTERPRISE</h1>
              <p className="text-xs text-gray-600">2 Swed Free Avenue, Sussex &bull; Tel: +232 76 442590 &bull; Email: swedswoodinfo@gmail.com</p>
              <p className="text-xs font-bold uppercase mt-0.5">Official Fuel Request Register (Diesel &amp; Petrol)</p>
            </div>
          </div>
          <div className="text-right text-xs font-mono">
            <p className="font-bold">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p>Filter: {fuelTypeFilter} / {statusFilter} ({filteredRequests.length} records)</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="p-3 border border-slate-300 rounded-lg">
            <span className="uppercase text-[10px] text-gray-500 font-bold">Total Requests</span>
            <p className="text-base font-black font-mono">{metrics.totalCount}</p>
          </div>
          <div className="p-3 border border-slate-300 rounded-lg">
            <span className="uppercase text-[10px] text-gray-500 font-bold">Diesel Total</span>
            <p className="text-base font-black font-mono">{metrics.dieselLiters} L ({formatCurrency(metrics.dieselCost, 0)})</p>
          </div>
          <div className="p-3 border border-slate-300 rounded-lg">
            <span className="uppercase text-[10px] text-gray-500 font-bold">Petrol Total</span>
            <p className="text-base font-black font-mono">{metrics.petrolLiters} L ({formatCurrency(metrics.petrolCost, 0)})</p>
          </div>
          <div className="p-3 border border-slate-300 rounded-lg">
            <span className="uppercase text-[10px] text-gray-500 font-bold">Dispensed Spend</span>
            <p className="text-base font-black font-mono">{formatCurrency(metrics.dispensedValue, 0)}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 uppercase text-[10px]">
              <th className="py-2 px-2">Req #</th>
              <th className="py-2 px-2">Date</th>
              <th className="py-2 px-2">Type</th>
              <th className="py-2 px-2 text-right">Liters</th>
              <th className="py-2 px-2">Equipment / Purpose</th>
              <th className="py-2 px-2">Requested By</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2 text-right">Total (Le)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-500">No fuel requests match the active filters.</td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td className="py-2 px-2 font-mono font-bold whitespace-nowrap">{req.requestNo}</td>
                  <td className="py-2 px-2 font-mono whitespace-nowrap">{req.requestDate}</td>
                  <td className="py-2 px-2 font-bold">{req.fuelType}</td>
                  <td className="py-2 px-2 text-right font-mono">{req.quantityLiters} L</td>
                  <td className="py-2 px-2">
                    <strong>{req.equipmentOrVehicle}</strong> — {req.purpose}
                  </td>
                  <td className="py-2 px-2">{req.requestedByName}</td>
                  <td className="py-2 px-2 font-bold">{req.status}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold">{formatCurrency(req.totalCost, 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Official System Print Footer */}
        <div className="print-system-footer">
          <div className="grid grid-cols-3 gap-6 text-xs pt-4 pb-3">
            <div>
              <div className="border-b border-slate-600 h-7"></div>
              <p className="font-bold mt-1">Prepared By: {currentUser?.name || 'Workshop Staff'}</p>
            </div>
            <div>
              <div className="border-b border-slate-600 h-7"></div>
              <p className="font-bold mt-1">Verified By: Workshop Manager</p>
            </div>
            <div>
              <div className="border-b border-slate-600 h-7"></div>
              <p className="font-bold mt-1">Audited By: Internal Auditor</p>
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] border-t border-slate-300 pt-2">
            <span>SWEDS WOOD ENTERPRISE &bull; 2 Swed Free Avenue, Sussex &bull; Tel: +232 76 442590</span>
            <span>Official Diesel &amp; Petrol Fuel Register &bull; Printed {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
