import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  UploadCloud, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Shield, 
  ShieldCheck, 
  Building2, 
  Wrench, 
  Tag, 
  Calendar, 
  Lock, 
  FileCheck, 
  FileSpreadsheet, 
  Layers, 
  X, 
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  OfficialDocument, 
  OfficialDocumentCategory, 
  DocumentConfidentiality, 
  DocumentStatus,
  Customer, 
  Job, 
  Employee 
} from '../types';

interface OfficialDocumentsManagerProps {
  documents: OfficialDocument[];
  customers: Customer[];
  jobs: Job[];
  currentUser?: Employee | null;
  initialOpenUploadModal?: boolean;
  onAddDocument: (doc: Omit<OfficialDocument, 'id'>) => void;
  onUpdateDocument?: (doc: OfficialDocument) => void;
  onDeleteDocument?: (id: string) => void;
  onGoBack?: () => void;
}

const CATEGORIES: OfficialDocumentCategory[] = [
  'Contracts & Agreements',
  'Permits & Regulatory',
  'Client Commission Documents',
  'Financial & Tax Documents',
  'Company & Legal Registration',
  'Safety & HR Compliance',
  'Delivery & Logistics Vouchers',
  'Other Official Scans'
];

const CONFIDENTIALITIES: DocumentConfidentiality[] = [
  'Public',
  'Internal / Workshop',
  'Confidential / Management'
];

export default function OfficialDocumentsManager({
  documents,
  customers,
  jobs,
  currentUser,
  initialOpenUploadModal = false,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onGoBack
}: OfficialDocumentsManagerProps) {
  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';
  const isAuditor = currentUser?.role === 'Auditor';
  const canUploadOrEdit = isAdmin || isManager || !isAuditor; // Auditors have read-only audit access
  const canDelete = isAdmin || isManager;

  // View & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<OfficialDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<OfficialDocument | null>(null);

  useEffect(() => {
    if (initialOpenUploadModal) {
      openUploadModal();
    }
  }, [initialOpenUploadModal]);

  // Form State for New Document Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newRefNumber, setNewRefNumber] = useState('');
  const [newCategory, setNewCategory] = useState<OfficialDocumentCategory>('Contracts & Agreements');
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newJobId, setNewJobId] = useState('');
  const [newIssuingAuthority, setNewIssuingAuthority] = useState('');
  const [newIssueDate, setNewIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newConfidentiality, setNewConfidentiality] = useState<DocumentConfidentiality>('Internal / Workshop');
  const [newDescription, setNewDescription] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('');
  
  // File upload temporary state
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    sizeFormatted: string;
    dataUrl: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-generate Reference Number suggestion
  const handleGenerateRefSuggestion = (cat: OfficialDocumentCategory) => {
    const year = new Date().getFullYear();
    const seq = String(documents.length + 1).padStart(3, '0');
    let prefix = 'SWED-DOC';
    if (cat === 'Contracts & Agreements') prefix = 'AGR';
    else if (cat === 'Permits & Regulatory') prefix = 'PERM';
    else if (cat === 'Financial & Tax Documents') prefix = 'TAX';
    else if (cat === 'Client Commission Documents') prefix = 'COMM';
    else if (cat === 'Safety & HR Compliance') prefix = 'SAF';
    else if (cat === 'Company & Legal Registration') prefix = 'REG';
    setNewRefNumber(`${prefix}-${year}-${seq}`);
  };

  const resetUploadForm = () => {
    setNewTitle('');
    setNewRefNumber('');
    setNewCategory('Contracts & Agreements');
    setNewCustomerId('');
    setNewJobId('');
    setNewIssuingAuthority('');
    setNewIssueDate(new Date().toISOString().split('T')[0]);
    setNewExpiryDate('');
    setNewConfidentiality('Internal / Workshop');
    setNewDescription('');
    setNewTagsStr('');
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openUploadModal = () => {
    resetUploadForm();
    handleGenerateRefSuggestion('Contracts & Agreements');
    setIsUploadModalOpen(true);
  };

  // Process File to Base64 Data URL
  const processFile = (file: File) => {
    setUploadError(null);

    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15 MB limit. Please upload a compressed PDF or image.');
      return;
    }

    const sizeFormatted = file.size < 1024 * 1024 
      ? `${(file.size / 1024).toFixed(1)} KB` 
      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        sizeFormatted,
        dataUrl
      });
      if (!newTitle) {
        // Strip extension for title suggestion
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setNewTitle(cleanName);
      }
    };
    reader.onerror = () => {
      setUploadError('Unable to read the selected file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Submit Upload Form
  const handleSaveUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setUploadError('Please provide a descriptive document title.');
      return;
    }
    if (!newRefNumber.trim()) {
      setUploadError('Please provide an official reference or certificate number.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please choose or drag-and-drop a document file (PDF or image).');
      return;
    }

    // Determine initial status based on expiry date
    let status: DocumentStatus = 'Active';
    if (newExpiryDate) {
      const now = new Date();
      const exp = new Date(newExpiryDate);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        status = 'Expired';
      } else if (diffDays <= 30) {
        status = 'Expiring Soon';
      }
    }

    // Resolve associated customer and job names
    const matchedCustomer = customers.find(c => c.id === newCustomerId);
    const matchedJob = jobs.find(j => j.id === newJobId);

    const tags = newTagsStr
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const newDocData: Omit<OfficialDocument, 'id'> = {
      title: newTitle.trim(),
      referenceNumber: newRefNumber.trim(),
      category: newCategory,
      customerId: newCustomerId || undefined,
      customerName: matchedCustomer?.name || (newCustomerId ? 'Associated Client' : undefined),
      jobId: newJobId || undefined,
      jobTitle: matchedJob?.title || undefined,
      issuingAuthority: newIssuingAuthority.trim() || 'Sweds Wood Enterprise Archive',
      issueDate: newIssueDate || new Date().toISOString().split('T')[0],
      expiryDate: newExpiryDate || undefined,
      fileUrl: selectedFile.dataUrl,
      fileName: selectedFile.name,
      fileType: selectedFile.type,
      fileSize: selectedFile.sizeFormatted,
      confidentiality: newConfidentiality,
      status,
      description: newDescription.trim() || undefined,
      uploadedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Administrator',
      uploadedAt: new Date().toISOString().split('T')[0],
      tags: tags.length > 0 ? tags : [newCategory.toLowerCase().replace(/[^a-z0-9]/g, '')]
    };

    onAddDocument(newDocData);
    setIsUploadModalOpen(false);
    resetUploadForm();
  };

  // Editing existing document metadata
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !onUpdateDocument) return;

    // Recalculate status if expiry date changed
    let status = editingDoc.status;
    if (editingDoc.expiryDate) {
      const now = new Date();
      const exp = new Date(editingDoc.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        status = 'Expired';
      } else if (diffDays <= 30) {
        status = 'Expiring Soon';
      } else {
        status = 'Active';
      }
    }

    onUpdateDocument({
      ...editingDoc,
      status
    });
    setEditingDoc(null);
  };

  // Filtered List
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Category match
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
        return false;
      }
      // Status match
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'Expiring Soon' && doc.status !== 'Expiring Soon') return false;
        if (selectedStatus === 'Active' && doc.status !== 'Active') return false;
        if (selectedStatus === 'Expired' && doc.status !== 'Expired') return false;
      }
      // Customer match
      if (selectedCustomer !== 'ALL' && doc.customerId !== selectedCustomer) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(query);
        const matchesRef = doc.referenceNumber.toLowerCase().includes(query);
        const matchesAuth = doc.issuingAuthority.toLowerCase().includes(query);
        const matchesClient = doc.customerName?.toLowerCase().includes(query);
        const matchesJob = doc.jobTitle?.toLowerCase().includes(query);
        const matchesTags = (doc.tags || []).some(t => t.toLowerCase().includes(query));
        const matchesDesc = doc.description?.toLowerCase().includes(query);
        return matchesTitle || matchesRef || matchesAuth || matchesClient || matchesJob || matchesTags || matchesDesc;
      }
      return true;
    });
  }, [documents, selectedCategory, selectedStatus, selectedCustomer, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const permits = documents.filter(d => d.category === 'Permits & Regulatory' || d.category === 'Company & Legal Registration').length;
    const contracts = documents.filter(d => d.category === 'Contracts & Agreements' || d.category === 'Client Commission Documents').length;
    const expiringSoon = documents.filter(d => d.status === 'Expiring Soon').length;
    const expired = documents.filter(d => d.status === 'Expired').length;
    return { total, permits, contracts, expiringSoon, expired };
  }, [documents]);

  // Direct download trigger
  const handleDownloadDoc = (doc: OfficialDocument) => {
    const a = document.createElement('a');
    a.href = doc.fileUrl;
    a.download = doc.fileName || `${doc.referenceNumber}_Official_Document.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Direct print trigger
  const handlePrintDoc = (doc: OfficialDocument) => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups to preview and print official document scans.');
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${doc.title} - ${doc.referenceNumber}</title>
          <style>
            body { font-family: sans-serif; margin: 20px; color: #1e293b; background: #fff; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: bold; margin: 0; }
            .ref { font-family: monospace; font-size: 13px; color: #475569; }
            .meta { font-size: 12px; margin-bottom: 20px; line-height: 1.6; }
            .doc-preview { text-align: center; }
            .doc-preview img, .doc-preview svg { max-width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 4px; }
            @media print { body { margin: 0; } .header { border-bottom-width: 1px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <p class="ref">SWEDS WOOD ENTERPRISE &bull; 2 SWED FREE AVENUE, SUSSEX</p>
              <h1 class="title">${doc.title}</h1>
            </div>
            <div style="text-align: right;">
              <span class="ref">REF: ${doc.referenceNumber}</span><br>
              <span style="font-size: 11px; color: #64748b;">Category: ${doc.category}</span>
            </div>
          </div>
          <div class="meta">
            <strong>Issuing Authority:</strong> ${doc.issuingAuthority} &bull; 
            <strong>Issue Date:</strong> ${doc.issueDate} 
            ${doc.expiryDate ? `&bull; <strong>Expiry Date:</strong> ${doc.expiryDate}` : ''}
            ${doc.customerName ? `<br><strong>Client:</strong> ${doc.customerName}` : ''}
            ${doc.jobTitle ? `<br><strong>Associated Commission:</strong> ${doc.jobTitle}` : ''}
          </div>
          <div class="doc-preview">
            ${
              doc.fileType === 'application/pdf' || doc.fileUrl.startsWith('data:application/pdf') || /\.pdf$/i.test(doc.fileName)
                ? `<iframe src="${doc.fileUrl}" style="width:100%;height:850px;border:none;"></iframe>`
                : `<img src="${doc.fileUrl}" alt="${doc.title}" />`
            }
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Export CSV Register of All Official Documents
  const handleExportCSVRegister = () => {
    const rows = [
      ['SWEDS WOOD ENTERPRISE - OFFICIAL DOCUMENTS REGISTER'],
      [`Export Date: ${new Date().toLocaleDateString('en-US')}`, `Total Files: ${documents.length}`],
      [''],
      [
        'Reference No',
        'Document Title',
        'Category',
        'Issuing Authority',
        'Client / Customer',
        'Associated Commission',
        'Issue Date',
        'Expiry Date',
        'Status',
        'Confidentiality',
        'File Name',
        'File Size',
        'Uploaded By',
        'Tags'
      ],
      ...documents.map(d => [
        d.referenceNumber,
        (d.title || '').replace(/"/g, '""'),
        d.category,
        (d.issuingAuthority || '').replace(/"/g, '""'),
        (d.customerName || 'N/A').replace(/"/g, '""'),
        (d.jobTitle || 'N/A').replace(/"/g, '""'),
        d.issueDate || '-',
        d.expiryDate || 'Perpetual',
        d.status,
        d.confidentiality,
        d.fileName,
        d.fileSize,
        d.uploadedBy,
        (d.tags || []).join('; ')
      ])
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Swedswood_Official_Documents_Register_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {onGoBack && (
              <button
                onClick={onGoBack}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="p-2 bg-amber-100 text-amber-900 rounded-2xl">
              <FileCheck className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Official Documents &amp; Compliance Vault</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full font-mono uppercase">
                  Archive
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Secure central depository for workshop contracts, forestry permits, NRA tax certificates, client agreements &amp; blueprints.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              2 Swed Free Avenue, Sussex
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Swedswood Verified Storage
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSVRegister}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs border border-slate-200 transition shadow-2xs cursor-pointer"
            title="Download CSV register of all documents"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Register</span>
          </button>

          {canUploadOrEdit && (
            <button
              onClick={openUploadModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold rounded-2xl text-xs transition shadow-md shadow-amber-600/20 cursor-pointer"
              id="btn-upload-official-doc"
            >
              <UploadCloud className="w-4 h-4 text-amber-100" />
              <span>Upload Official Document</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Core Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Documents</span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.total}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Securely catalogued</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center text-amber-700">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Permits &amp; Licenses</span>
            <p className="text-2xl font-black font-mono text-emerald-700 mt-1">{stats.permits}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Forestry, NRA &amp; Council</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Contracts &amp; Blueprints</span>
            <p className="text-2xl font-black font-mono text-blue-700 mt-1">{stats.contracts}</p>
            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Signed commissions &amp; specs</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center text-blue-700">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Compliance Status</span>
            <p className={`text-xl font-black font-mono mt-1 ${stats.expiringSoon > 0 ? 'text-amber-600' : stats.expired > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {stats.expired > 0 
                ? `${stats.expired} Expired` 
                : stats.expiringSoon > 0 
                ? `${stats.expiringSoon} Expiring Soon` 
                : '100% Up to Date'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              {stats.expiringSoon > 0 ? 'Action needed < 30 days' : 'All licences active'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${stats.expired > 0 ? 'bg-red-50 border-red-100 text-red-600' : stats.expiringSoon > 0 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Search, Filter Toolbar & View Toggles */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, reference no, authority, tags, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Filters & View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active &amp; Valid</option>
              <option value="Expiring Soon">Expiring Soon (30d)</option>
              <option value="Expired">Expired</option>
            </select>

            {/* Customer Filter */}
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL">All Clients / General</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('GRID')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Table
              </button>
            </div>

          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${selectedCategory === 'ALL' ? 'bg-amber-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'}`}
          >
            All Categories ({documents.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = documents.filter(d => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${selectedCategory === cat ? 'bg-amber-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'}`}
              >
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCategory === cat ? 'bg-amber-900 text-amber-200' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Documents Content: Grid or Table */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-center mx-auto text-amber-700">
            <FileText className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-black text-slate-900">No Official Documents Found</h3>
            <p className="text-xs text-slate-500">
              {searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL'
                ? 'No documents match your active search terms or filters. Try resetting the filter.'
                : 'Upload your first signed contract, forestry permit, tax certificate, or blueprint scan to begin building your official workshop archive.'}
            </p>
          </div>
          {canUploadOrEdit && (
            <button
              onClick={openUploadModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-extrabold rounded-2xl text-xs transition cursor-pointer shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document Now</span>
            </button>
          )}
        </div>
      ) : viewMode === 'GRID' ? (
        
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map(doc => {
            const isExpSoon = doc.status === 'Expiring Soon';
            const isExp = doc.status === 'Expired';
            
            return (
              <div 
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-amber-300 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group shadow-xs"
              >
                {/* Card Top Preview / Thumbnail */}
                <div className="relative bg-slate-100 p-4 border-b border-slate-100 flex items-center justify-center min-h-[140px] overflow-hidden">
                  {doc.fileUrl.startsWith('data:image/svg+xml') || doc.fileType.startsWith('image/') ? (
                    <img 
                      src={doc.fileUrl} 
                      alt={doc.title} 
                      className="max-h-[120px] max-w-full object-contain rounded-lg shadow-2xs group-hover:scale-102 transition duration-300"
                    />
                  ) : (
                    <div className="text-center space-y-2 py-4">
                      <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-bold block uppercase">{doc.fileType || 'PDF Document'}</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 bg-white/95 backdrop-blur-xs text-slate-800 rounded-lg text-[10px] font-bold font-mono shadow-2xs border border-slate-200">
                      {doc.referenceNumber}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase shadow-2xs ${isExp ? 'bg-red-500 text-white' : isExpSoon ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
                      {doc.status}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                      <span>{doc.category}</span>
                    </div>

                    <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-amber-900 transition line-clamp-2 leading-snug">
                      {doc.title}
                    </h3>

                    {doc.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Attributes */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 text-[11px]">Issuing Authority:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]" title={doc.issuingAuthority}>
                        {doc.issuingAuthority}
                      </span>
                    </div>

                    {doc.customerName && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400 text-[11px]">Client Account:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                          {doc.customerName}
                        </span>
                      </div>
                    )}

                    {doc.jobTitle && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400 text-[11px]">Commission:</span>
                        <span className="font-semibold text-amber-900 truncate max-w-[170px]">
                          {doc.jobTitle}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                      <span>Issued: {doc.issueDate}</span>
                      <span>{doc.expiryDate ? `Expires: ${doc.expiryDate}` : 'Perpetual'}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {doc.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold">
                          #{tag}
                        </span>
                      ))}
                      {doc.tags.length > 3 && (
                        <span className="text-[9px] text-slate-400 font-bold">+{doc.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="View document in full inspector"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => handleDownloadDoc(doc)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer border border-slate-200"
                        title="Download Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handlePrintDoc(doc)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer border border-slate-200"
                        title="Print Document Scan"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {canUploadOrEdit && onUpdateDocument && (
                        <button
                          onClick={() => setEditingDoc(doc)}
                          className="p-1.5 text-slate-400 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                          title="Edit Document Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canDelete && onDeleteDocument && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to permanently delete '${doc.title}' (${doc.referenceNumber}) from the official vault?`)) {
                              onDeleteDocument(doc.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        /* Table Ledger View */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-400">
                  <th className="py-3 px-4">Ref No.</th>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Issuing Authority</th>
                  <th className="py-3 px-4">Client / Commission</th>
                  <th className="py-3 px-4">Valid Period</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredDocuments.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{doc.referenceNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-slate-900">{doc.title}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.fileName} &bull; {doc.fileSize}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800">{doc.issuingAuthority}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.customerName || doc.jobTitle ? (
                        <div>
                          {doc.customerName && <p className="font-bold text-slate-800">{doc.customerName}</p>}
                          {doc.jobTitle && <p className="text-[10px] text-amber-800">{doc.jobTitle}</p>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">General Workshop</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <div>Issued: {doc.issueDate}</div>
                      <div>{doc.expiryDate ? `Exp: ${doc.expiryDate}` : 'Perpetual'}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${doc.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : doc.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition"
                          title="Inspect Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadDoc(doc)}
                          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintDoc(doc)}
                          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canDelete && onDeleteDocument && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete '${doc.title}'?`)) onDeleteDocument(doc.id);
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UPLOAD OFFICIAL DOCUMENT MODAL                                  */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-2xl">
                  <UploadCloud className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Upload Official Document</h2>
                  <p className="text-xs text-slate-500">
                    Add certificates, signed contracts, regulatory clearances, and blueprints to the secure vault.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveUpload} className="p-6 space-y-5">
              
              {uploadError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Select or Drag Document Scan (JPEG, PDF, PNG) *
                </label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${isDragging ? 'border-amber-500 bg-amber-50/60' : selectedFile ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 hover:border-amber-400 bg-slate-50/60'}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,image/jpeg,image/png,image/*,application/pdf,.doc,.docx"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-slate-900">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          Size: {selectedFile.sizeFormatted} &bull; Type: {selectedFile.type || 'Document'}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-amber-700 underline block cursor-pointer">
                        Click or drop to replace with a different file
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center">
                        <UploadCloud className="w-6 h-6 text-amber-700" />
                      </div>
                      <p className="font-extrabold text-sm text-slate-800">
                        Drag &amp; drop document scan here, or <span className="text-amber-800 underline">browse files</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-bold">
                        Supports PDF, JPEG, JPG, and PNG files (up to 15 MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Document Title & Reference Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ministry of Forestry Conveyance Permit"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Reference / Cert No. *
                    </label>
                    <button
                      type="button"
                      onClick={() => handleGenerateRefSuggestion(newCategory)}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                    >
                      Generate Ref
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SL-FOR-2026-089"
                    value={newRefNumber}
                    onChange={(e) => setNewRefNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Category & Issuing Authority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Document Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => {
                      const cat = e.target.value as OfficialDocumentCategory;
                      setNewCategory(cat);
                      handleGenerateRefSuggestion(cat);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Issuing Authority / Agency
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. National Revenue Authority, Forestry Division"
                    value={newIssuingAuthority}
                    onChange={(e) => setNewIssuingAuthority(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Linked Client & Commission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Linked Customer / Client (Optional)
                  </label>
                  <select
                    value={newCustomerId}
                    onChange={(e) => setNewCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="">-- General Workshop / Not Client Specific --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Linked Commission Job (Optional)
                  </label>
                  <select
                    value={newJobId}
                    onChange={(e) => setNewJobId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="">-- No Specific Job --</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.id}: {j.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Issue Date & Expiry Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newIssueDate}
                    onChange={(e) => setNewIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Expiry / Renewal Date
                  </label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Confidentiality
                  </label>
                  <select
                    value={newConfidentiality}
                    onChange={(e) => setNewConfidentiality(e.target.value as DocumentConfidentiality)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition cursor-pointer"
                  >
                    {CONFIDENTIALITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags & Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Tags &amp; Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. forestry, permit, timber, tax, 2026, mahogany"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Description / Contract Terms / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of terms, clauses, or inspection parameters..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-extrabold rounded-2xl text-xs transition shadow-md shadow-amber-700/20 flex items-center gap-2 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Save to Official Vault</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DOCUMENT FULL INSPECTOR & VIEWER MODAL                          */}
      {/* ========================================================================= */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
            
            {/* Viewer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-600/30 text-amber-400 rounded-2xl border border-amber-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white line-clamp-1">{viewingDoc.title}</h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    REF: {viewingDoc.referenceNumber} &bull; Category: {viewingDoc.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDoc(viewingDoc)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={() => handlePrintDoc(viewingDoc)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Body & Metadata Split */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              
              {/* Document Preview Area (2 cols on large screen) */}
              <div className="lg:col-span-2 p-6 bg-slate-100 flex items-center justify-center min-h-[420px] overflow-auto">
                {(() => {
                  const isImg = viewingDoc.fileUrl.startsWith('data:image/') || viewingDoc.fileType?.startsWith('image/') || /\.(png|jpe?g|svg|webp|gif)$/i.test(viewingDoc.fileName);
                  const isPdf = viewingDoc.fileType === 'application/pdf' || viewingDoc.fileUrl.startsWith('data:application/pdf') || /\.pdf$/i.test(viewingDoc.fileName);

                  if (isImg) {
                    return (
                      <img 
                        src={viewingDoc.fileUrl} 
                        alt={viewingDoc.title} 
                        className="max-h-[620px] max-w-full object-contain rounded-xl shadow-lg border border-slate-300"
                      />
                    );
                  }
                  if (isPdf) {
                    return (
                      <iframe
                        src={viewingDoc.fileUrl}
                        title={viewingDoc.title}
                        className="w-full h-[620px] rounded-xl border border-slate-300 bg-white"
                      />
                    );
                  }
                  return (
                    <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 max-w-sm space-y-3">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                      <p className="font-extrabold text-sm text-slate-800">{viewingDoc.fileName}</p>
                      <p className="text-xs text-slate-500">Preview not directly embeddable for this format.</p>
                      <button
                        onClick={() => handleDownloadDoc(viewingDoc)}
                        className="px-4 py-2 bg-amber-700 text-white rounded-xl font-bold text-xs cursor-pointer"
                      >
                        Download to View
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Metadata Details Sidebar */}
              <div className="p-6 space-y-4 bg-white text-xs">
                
                <div className="space-y-1 pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status &amp; Security</span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${viewingDoc.status === 'Active' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : viewingDoc.status === 'Expiring Soon' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-red-100 text-red-900 border border-red-300'}`}>
                      {viewingDoc.status}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                      {viewingDoc.confidentiality}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Issuing Authority</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">{viewingDoc.issuingAuthority}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Official Reference ID</span>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">{viewingDoc.referenceNumber}</p>
                  </div>

                  {viewingDoc.customerName && (
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Associated Client</span>
                      <p className="font-bold text-slate-900 mt-0.5">{viewingDoc.customerName}</p>
                    </div>
                  )}

                  {viewingDoc.jobTitle && (
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Associated Job</span>
                      <p className="font-bold text-amber-900 mt-0.5">{viewingDoc.jobTitle}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Issue Date</span>
                      <span className="font-bold text-slate-800">{viewingDoc.issueDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Expiry Date</span>
                      <span className="font-bold text-slate-800">{viewingDoc.expiryDate || 'Perpetual'}</span>
                    </div>
                  </div>
                </div>

                {viewingDoc.description && (
                  <div className="space-y-1 pb-3 border-b border-slate-100">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Description / Notes</span>
                    <p className="text-slate-700 leading-relaxed">{viewingDoc.description}</p>
                  </div>
                )}

                <div className="space-y-1.5 pb-3 border-b border-slate-100 text-[11px] text-slate-500">
                  <div className="flex justify-between">
                    <span>File Name:</span>
                    <span className="font-mono text-slate-800 truncate max-w-[150px]">{viewingDoc.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>File Size:</span>
                    <span className="font-mono text-slate-800">{viewingDoc.fileSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uploaded By:</span>
                    <span className="font-semibold text-slate-800">{viewingDoc.uploadedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recorded Date:</span>
                    <span className="font-mono text-slate-800">{viewingDoc.uploadedAt}</span>
                  </div>
                </div>

                {viewingDoc.tags && viewingDoc.tags.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Keywords &amp; Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {viewingDoc.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT DOCUMENT METADATA MODAL                                    */}
      {/* ========================================================================= */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Edit Official Document Record</h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Document Title</label>
                <input
                  type="text"
                  required
                  value={editingDoc.title}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reference Number</label>
                <input
                  type="text"
                  required
                  value={editingDoc.referenceNumber}
                  onChange={(e) => setEditingDoc({ ...editingDoc, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={editingDoc.category}
                    onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value as OfficialDocumentCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={editingDoc.status}
                    onChange={(e) => setEditingDoc({ ...editingDoc, status: e.target.value as DocumentStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Issue Date</label>
                  <input
                    type="date"
                    value={editingDoc.issueDate}
                    onChange={(e) => setEditingDoc({ ...editingDoc, issueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Expiry Date</label>
                  <input
                    type="date"
                    value={editingDoc.expiryDate || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, expiryDate: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Issuing Authority</label>
                <input
                  type="text"
                  value={editingDoc.issuingAuthority}
                  onChange={(e) => setEditingDoc({ ...editingDoc, issuingAuthority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description / Notes</label>
                <textarea
                  rows={2}
                  value={editingDoc.description || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-extrabold text-xs shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
