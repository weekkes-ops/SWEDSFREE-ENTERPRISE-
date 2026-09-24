import React, { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  ExternalLink, 
  X, 
  Search, 
  ShieldCheck, 
  Database, 
  Users, 
  Package, 
  UserCheck, 
  Wrench, 
  Receipt, 
  Camera, 
  DollarSign, 
  FileBarChart, 
  Settings, 
  HelpCircle,
  ChevronRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { downloadUserManualPdf } from '../utils/userManualPdf';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManualChapter {
  id: string;
  num: string;
  title: string;
  icon: React.ElementType;
  badge: string;
  summary: string;
  content: {
    heading: string;
    text?: string;
    bullets?: { title: string; desc: string }[];
    table?: { headers: string[]; rows: string[][] };
    tip?: string;
    warning?: string;
  }[];
}

const CHAPTERS: ManualChapter[] = [
  {
    id: 'ch1',
    num: '01',
    title: 'System Overview & Dual Storage Architecture',
    icon: Database,
    badge: 'Core Architecture',
    summary: 'Executive overview, browser local cache, Google Cloud Firestore real-time synchronization, and zero data loss protection.',
    content: [
      {
        heading: 'Executive Purpose & Platform Scope',
        text: 'The Swedswood Carpentry and Timber Construction Management System is an enterprise-grade web application built to streamline operations for custom woodwork shops, timber merchants, and joinery factories in Sierra Leone. The system unifies inventory tracking, client portfolios, commission job orders, branded commercial invoicing, installment payment receipts, daily work photo logs, and financial cash ledgers into a single, cohesive workflow.'
      },
      {
        heading: 'Zero Data Loss Dual Persistence Protocol',
        text: 'To protect workshop records against internet dropouts and power disruptions, the platform utilizes a robust two-layer persistence architecture:',
        bullets: [
          { title: 'Tier 1 - Browser Local Storage Cache', desc: 'Every data change is saved immediately to device memory. You can continue creating orders, logging timber, and issuing receipts without interruption even if completely offline.' },
          { title: 'Tier 2 - Google Cloud Firestore Synchronization', desc: 'When internet connectivity is active, all changes replicate instantaneously to Google Cloud Firestore, providing real-time multi-device synchronization and permanent cloud safety.' }
        ],
        tip: 'You do not need to wait for internet reconnection to log daily work or issue receipts. The system queues changes and commits them to Cloud Firestore immediately once reconnected.'
      }
    ]
  },
  {
    id: 'ch2',
    num: '02',
    title: 'User Roles & Access Control (RBAC)',
    icon: ShieldCheck,
    badge: 'Security & Permissions',
    summary: 'Role-Based Access Control matrix for Admin, Manager, Auditor, and Carpenter/Staff accounts.',
    content: [
      {
        heading: 'Four Defined Operational Security Roles',
        bullets: [
          { title: 'Administrator (Admin)', desc: 'Full authority across all workshop modules, system settings, employee approvals, database backups, and clean-slate resets.' },
          { title: 'Operations Manager', desc: 'Manages jobs, inventory, client accounts, quotes, invoices, installment clearances, and workforce schedules.' },
          { title: 'Financial Auditor', desc: 'Dedicated read-only inspection access to invoices, receipts, payment histories, and immutable audit trails without permission to delete records.' },
          { title: 'Artisan / Staff', desc: 'Shop floor access to log daily photo work, check assigned commission specs, and record timber usage.' }
        ]
      },
      {
        heading: 'Role Permissions Matrix',
        table: {
          headers: ['Module / Capability', 'Admin', 'Manager', 'Auditor', 'Staff'],
          rows: [
            ['Workshop Hub Dashboard', 'Full Access', 'Full Access', 'Read-Only', 'Restricted'],
            ['Inventory & Raw Timber', 'Full Access', 'Full Access', 'Read-Only', 'Log Usage Only'],
            ['Client Directory', 'Full Access', 'Full Access', 'Read-Only', 'No Access'],
            ['Job Commissions', 'Full Access', 'Full Access', 'Read-Only', 'Assigned Only'],
            ['Invoicing & Receipts', 'Full Access', 'Full Access', 'Read-Only', 'No Access'],
            ['Payment Audit Trail', 'Full Access', 'Full Access', 'Audit View', 'No Access'],
            ['Financial Cash Ledger', 'Full Access', 'Full Access', 'Audit View', 'No Access'],
            ['Employee Payroll & Wage', 'Full Access', 'Full Access', 'Read-Only', 'No Access'],
            ['Backup & Restore (Settings)', 'Full Access', 'Full Access', 'No Access', 'No Access'],
            ['Database Fresh Start', 'Admin Only', 'No Access', 'No Access', 'No Access']
          ]
        }
      }
    ]
  },
  {
    id: 'ch3',
    num: '03',
    title: 'Workshop Hub (Executive Dashboard)',
    icon: BookOpen,
    badge: 'Dashboard',
    summary: 'Real-time workshop KPI metrics, quick action shortcuts, and connectivity monitors.',
    content: [
      {
        heading: 'Real-Time Operational Indicators',
        bullets: [
          { title: 'Active Woodwork Jobs', desc: 'Live count of orders in Pending, In Progress, or Quality Check stages.' },
          { title: 'Materials & Timber Stock', desc: 'Stored timber planks, board feet, and hardware items, with low-stock warnings highlighted.' },
          { title: 'Total Cleared Revenue', desc: 'Cumulative revenue received in Sierra Leone Leones (Le) across all recorded project deposits and installments.' },
          { title: 'Client Portfolio', desc: 'Active registered customer dossiers split by Company, Institution, and Private.' }
        ]
      },
      {
        heading: 'Quick Action Shortcuts',
        text: 'Managers can trigger key workflows with one click from the Workshop Hub: "+ New Job", "+ Log Material", "+ Record Cash Voucher", and "+ Issue Invoice".'
      }
    ]
  },
  {
    id: 'ch4',
    num: '04',
    title: 'Inventory & Timber Logistics Management',
    icon: Package,
    badge: 'Materials',
    summary: 'Tracking raw lumber species, joinery hardware, unit purchase costs in Le, and minimum reorder thresholds.',
    content: [
      {
        heading: 'Timber & Consumables Classification',
        bullets: [
          { title: 'Hardwood & Sawn Timber', desc: 'Mahogany, Teak, Cedar, Iroko, Framing Timber, and Plywood boards.' },
          { title: 'Joinery Hardware', desc: 'Ball-bearing hinges, drawer runners, locks, handles, structural screws, and dowels.' },
          { title: 'Finishes & Chemicals', desc: 'Lacquers, sanding sealers, stains, wood glue, and thinners.' }
        ]
      },
      {
        heading: 'Job Material Consumption & Wastage Tracking',
        text: 'When artisans pull timber from inventory for a project, materials are logged directly against the Job ID. The system deducts stock and tallies material costs against the client quote to determine true project margins.'
      }
    ]
  },
  {
    id: 'ch5',
    num: '05',
    title: 'Customer & Client Relationship Management',
    icon: UserCheck,
    badge: 'Clients',
    summary: 'Managing accounts across Company, Institution, and Private categories with debt clearance tracking.',
    content: [
      {
        heading: 'Official Client Classification Tiers',
        bullets: [
          { title: 'Company', desc: 'Commercial entities, real estate developers, contractors, and interior architecture firms.' },
          { title: 'Institution', desc: 'Government ministries, embassies, educational institutions, and NGOs.' },
          { title: 'Private', desc: 'Homeowners and individual commissioners.' }
        ]
      },
      {
        heading: 'Outstanding Debt Tracking',
        text: 'Each client card displays total quotes commissioned, total cash cleared to date, and remaining debt balance. Managers can click "Create Job" directly from the client profile.'
      }
    ]
  },
  {
    id: 'ch6',
    num: '06',
    title: 'Commission & Job Order Management',
    icon: Wrench,
    badge: 'Production',
    summary: 'Custom scopes, quote amounts in Le, progress stages, and staff assignments.',
    content: [
      {
        heading: 'Five Production Lifecycle Stages',
        table: {
          headers: ['Stage', 'Description', 'Expected Financial Milestone'],
          rows: [
            ['Pending', 'Quote submitted, awaiting client sign-off or deposit', 'Mobilization deposit (50-70%)'],
            ['In Progress', 'Wood milling, joinery & carcass assembly underway', 'Progress installment (20-30%)'],
            ['Quality Check', 'Sanding, finishing, lacquering & hardware fitting', 'Pre-dispatch final balance clearance'],
            ['Completed', 'Fabrication concluded, packaged for dispatch', '100% contract cleared'],
            ['Delivered', 'On-site installation and client sign-off achieved', 'Zero debt, project archived']
          ]
        }
      }
    ]
  },
  {
    id: 'ch7',
    num: '07',
    title: 'Invoices, Receipts & Installment Clearance',
    icon: Receipt,
    badge: 'Billing & Payments',
    summary: 'Commercial invoices without balances, official payment receipts with full settlement breakdown, and immutable audit trail.',
    content: [
      {
        heading: 'Official Commercial Invoices vs Payment Receipts',
        text: 'The system enforces a clean separation of billing documents:',
        bullets: [
          { title: 'Commercial Invoices', desc: 'Display total contract scope, specifications, itemized line items, and contractual quote in Le. Outstanding debt balances are intentionally NOT displayed on invoices.' },
          { title: 'Payment Receipts', desc: 'Each captured payment generates a receipt featuring the Captured Payment Records table, Total Contract Value, Total Payments to Date, and Remaining Balance Due (or "Fully Settled" badge).' }
        ],
        warning: 'Invoices reflect agreed contract quotes. Financial settlement breakdowns and remaining balances are strictly managed on official Payment Receipts and Client Portfolios.'
      },
      {
        heading: 'Safe In-UI Confirmation Modals & Audit Logging',
        text: 'Payment edits and deletions use custom in-UI confirmation modals to prevent browser freezing. Any change to a payment record is permanently logged in the Payment Audit Log with operator attribution, old/new amounts, and timestamps.'
      }
    ]
  },
  {
    id: 'ch8',
    num: '08',
    title: 'Daily Workshop & Site Activity Logs',
    icon: Camera,
    badge: 'Field Logs',
    summary: 'Photographic quality control, bench assembly milestones, and site installation records.',
    content: [
      {
        heading: 'Visual Proof of Craftsmanship',
        text: 'Carpenters and supervisors can snap photos on shop floor mobile devices to log daily progress across joinery, carving, finishing, and on-site installations. Logs are indexed by date and job for instant review.'
      }
    ]
  },
  {
    id: 'ch9',
    num: '09',
    title: 'Financial Accounting & Cash Flow Ledgers',
    icon: DollarSign,
    badge: 'Finance',
    summary: 'Standardized Inwards revenue and Outwards expenditure categories in Sierra Leone Leones (Le).',
    content: [
      {
        heading: 'Standardized Financial Categories',
        table: {
          headers: ['Inwards (Revenue) Categories', 'Outwards (Expenditure) Categories'],
          rows: [
            ['wood', 'Tools and generator'],
            ['sofa', 'Utilities'],
            ['Chair', 'Transportation'],
            ['Bed', 'Material Purchase'],
            ['Wood Construction', 'Tools and Maintenance'],
            ['others', 'Cast'],
            ['', 'Salary'],
            ['', 'others']
          ]
        }
      }
    ]
  },
  {
    id: 'ch10',
    num: '10',
    title: 'Human Resources, Attendance & Wage Management',
    icon: Users,
    badge: 'Workforce',
    summary: 'Employee profiles, compensation in Le (daily/hourly/monthly), overtime multipliers, and disciplinary records.',
    content: [
      {
        heading: 'Compensation & Wage Calculations in Le',
        text: 'All workforce payments are strictly formatted in Sierra Leone Leones (Le). The system calculates base compensation, logs overtime hours with multipliers, and records formal written warning letters for workshop discipline.'
      }
    ]
  },
  {
    id: 'ch11',
    num: '11',
    title: 'Audit Reports & Monthly Trends Analytics',
    icon: FileBarChart,
    badge: 'Analytics',
    summary: 'Printable executive audit summaries and Recharts monthly trajectory comparing jobs completed to material costs.',
    content: [
      {
        heading: 'Executive Audit Summaries & Monthly Trends',
        text: 'The Reports module features one-click printable executive audit reports and interactive Recharts visualizations showing job completion volumes alongside material cost variances to monitor workshop productivity and margins.'
      }
    ]
  },
  {
    id: 'ch12',
    num: '12',
    title: 'Settings, Data Backups & Zero Data Loss Protocol',
    icon: Settings,
    badge: 'Data Management',
    summary: 'Offline JSON backups, restore capabilities, cloud database sync, and disaster recovery.',
    content: [
      {
        heading: 'Backup & Recovery Hub',
        bullets: [
          { title: 'Download System Backup (.JSON)', desc: 'Downloads a complete offline snapshot of all jobs, inventory, client ledgers, invoices, and employee records.' },
          { title: 'Restore JSON File (.JSON)', desc: 'Uploads a previous backup file to restore or migrate database state.' },
          { title: 'Bring Back Cloud Data (Restore Till Today)', desc: 'Pulls the latest Firestore records to synchronize local browser state with the cloud database.' }
        ]
      }
    ]
  },
  {
    id: 'ch13',
    num: '13',
    title: 'Frequently Asked Questions & Troubleshooting',
    icon: HelpCircle,
    badge: 'Support',
    summary: 'Offline operation, balance calculation, currency rules, and IT support contacts.',
    content: [
      {
        heading: 'Workshop Support & Enquiries',
        text: 'Swedswood Enterprise IT Support Desk\n2 Sweds free Avenue, Sussex, Freetown, Sierra Leone\nEmail: swedswoodinfo@gmail.com\nTel: +232 76 442590'
      }
    ]
  }
];

export default function UserManualModal({ isOpen, onClose }: UserManualModalProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ch1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeChapter = CHAPTERS.find(c => c.id === selectedChapterId) || CHAPTERS[0];

  const filteredChapters = CHAPTERS.filter(ch => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ch.title.toLowerCase().includes(q) ||
      ch.summary.toLowerCase().includes(q) ||
      ch.content.some(c => 
        c.heading.toLowerCase().includes(q) || 
        (c.text && c.text.toLowerCase().includes(q))
      )
    );
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadUserManualPdf();
    } catch (e) {
      console.error('Error downloading manual:', e);
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  const handleOpenInNewTab = () => {
    try {
      const a = document.createElement('a');
      a.href = '/Swedswood_Woodwork_System_User_Manual.pdf';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open('/Swedswood_Woodwork_System_User_Manual.pdf', '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* Top Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-amber-500/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-base uppercase tracking-tight">
                  Swedswood Enterprise Operating Guide
                </h2>
                <span className="text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Official Manual
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Woodwork & Timber Logistics Management System • 2 Sweds free Ave, Freetown, Sierra Leone
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Download 15-Page PDF Manual"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isDownloading ? 'Preparing PDF...' : 'Download PDF Guide'}</span>
            </button>

            <button
              onClick={handleOpenInNewTab}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              title="Open PDF in Browser Viewer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chapters, roles, invoices, ledger, inventory..."
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-amber-400 outline-hidden font-medium text-slate-800"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-700">{filteredChapters.length}</span> Chapters Available
            <span className="text-slate-300">•</span>
            <span className="font-mono text-[11px] text-amber-700 font-bold">15-Page Comprehensive Manual</span>
          </div>
        </div>

        {/* Main Content Layout: Sidebar Table of Contents + Chapter Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left TOC Sidebar */}
          <div className="w-full md:w-80 bg-slate-50/70 border-r border-slate-200 overflow-y-auto p-3 space-y-1 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
              Table of Contents
            </p>
            {filteredChapters.map(ch => {
              const isSelected = ch.id === selectedChapterId;
              const Icon = ch.icon;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChapterId(ch.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2.5 cursor-pointer ${
                    isSelected 
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-900 shadow-2xs font-bold' 
                      : 'hover:bg-slate-100 text-slate-700 font-medium'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono text-amber-700 font-bold">CH {ch.num}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-200/80 rounded font-semibold text-slate-600">
                        {ch.badge}
                      </span>
                    </div>
                    <p className="text-xs truncate font-semibold mt-0.5 text-slate-900">
                      {ch.title}
                    </p>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-1 text-slate-400 ${isSelected ? 'text-amber-600' : ''}`} />
                </button>
              );
            })}
          </div>

          {/* Right Chapter Reader */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white">
            {/* Active Chapter Header */}
            <div className="border-b border-slate-100 pb-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 border border-amber-500/25">
                  Chapter {activeChapter.num}
                </span>
                <span className="text-xs text-slate-400 font-semibold">• {activeChapter.badge}</span>
              </div>
              <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
                {activeChapter.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl">
                {activeChapter.summary}
              </p>
            </div>

            {/* Chapter Sections */}
            <div className="space-y-6">
              {activeChapter.content.map((sec, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-amber-600 rounded-full inline-block" />
                    <span>{sec.heading}</span>
                  </h3>

                  {sec.text && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {sec.text}
                    </p>
                  )}

                  {sec.bullets && (
                    <div className="space-y-2 pl-2">
                      {sec.bullets.map((b, bIdx) => (
                        <div key={bIdx} className="text-xs sm:text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                          <span className="text-amber-600 font-bold mt-0.5">•</span>
                          <div>
                            <strong className="text-slate-900 font-semibold">{b.title}:</strong>{' '}
                            <span>{b.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {sec.table && (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                            {sec.table.headers.map((h, hIdx) => (
                              <th key={hIdx} className="py-2.5 px-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sec.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className={`py-2 px-3 text-slate-700 ${cIdx === 0 ? 'font-bold text-slate-900' : ''}`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sec.tip && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold block text-emerald-950 uppercase text-[10px]">Operational Tip</strong>
                        <span className="mt-0.5 text-emerald-800">{sec.tip}</span>
                      </div>
                    </div>
                  )}

                  {sec.warning && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold block text-amber-950 uppercase text-[10px]">Accounting & Compliance Notice</strong>
                        <span className="mt-0.5 text-amber-800">{sec.warning}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Chapter Navigation Bar */}
            <div className="pt-6 mt-8 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleDownload}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Complete 15-Page PDF Guide</span>
              </button>

              <button
                onClick={handleOpenInNewTab}
                className="px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Open in Native PDF Viewer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
