import { jsPDF } from 'jspdf';

export function generateUserManualPDFDoc(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const slate900 = [15, 23, 42] as const;
  const slate700 = [51, 65, 85] as const;
  const slate500 = [100, 116, 139] as const;
  const amber600 = [217, 119, 6] as const;
  const emerald700 = [4, 120, 87] as const;
  const emerald900 = [6, 78, 59] as const;
  const woodBrown = [120, 53, 15] as const;
  const borderColor = [226, 232, 240] as const;

  function drawHeader(chapterTitle: string) {
    doc.setFillColor(...slate900);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFillColor(...amber600);
    doc.rect(0, 11.2, pageWidth, 0.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('SWEDSWOOD ENTERPRISE  •  OFFICIAL USER OPERATING MANUAL', margin, 7.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(217, 119, 6);
    doc.text(chapterTitle.toUpperCase(), pageWidth - margin, 7.5, { align: 'right' });
  }

  function drawFooter(pageNumber: number, totalPages: number) {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slate500);
    doc.text('Confidential & Proprietary • 2 Sweds free Ave, Sussex, Freetown, Sierra Leone • www.swedwoodwork.com', margin, pageHeight - 7);

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  function checkPageBreak(spaceNeeded = 25, currentChapter = '') {
    if (y + spaceNeeded > pageHeight - 18) {
      doc.addPage();
      drawHeader(currentChapter);
      y = 22;
    }
  }

  function addChapterHeading(num: string, title: string) {
    checkPageBreak(30, title);
    doc.setFillColor(245, 243, 239);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'F');
    doc.setFillColor(...amber600);
    doc.rect(margin, y, 2.5, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...woodBrown);
    doc.text(`CHAPTER ${num}: ${title.toUpperCase()}`, margin + 5, y + 8);
    y += 17;
  }

  function addSectionHeading(title: string) {
    checkPageBreak(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...slate900);
    doc.text(title, margin, y);
    doc.setDrawColor(...amber600);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 1.8, margin + 25, y + 1.8);
    y += 7;
  }

  function addParagraph(text: string, extraSpacing = 4) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(...slate700);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 4.2;
    }
    y += extraSpacing;
  }

  function addBullet(bulletTitle: string, bulletDesc: string) {
    checkPageBreak(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...woodBrown);
    doc.text('• ' + bulletTitle + ':', margin + 2, y);
    const titleWidth = doc.getTextWidth('• ' + bulletTitle + ': ');
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate700);
    const lines = doc.splitTextToSize(bulletDesc, contentWidth - 8);

    if (lines.length === 1 && titleWidth < 55) {
      doc.text(bulletDesc, margin + 2 + titleWidth, y);
      y += 4.8;
    } else {
      y += 4;
      for (const line of lines) {
        checkPageBreak(5);
        doc.text(line, margin + 6, y);
        y += 4.2;
      }
      y += 1.5;
    }
  }

  function addCalloutBox(title: string, message: string, type: 'tip' | 'warning' = 'tip') {
    checkPageBreak(25);
    const isTip = type === 'tip';
    const bgColor = isTip ? [240, 253, 244] : [255, 251, 235];
    const strokeColor = isTip ? [187, 247, 208] : [254, 215, 170];
    const textColor = isTip ? emerald900 : woodBrown;
    const barColor = isTip ? emerald700 : amber600;

    const lines = doc.splitTextToSize(message, contentWidth - 10);
    const boxHeight = 10 + lines.length * 4.2;

    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(margin, y, 2.5, boxHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(title.toUpperCase(), margin + 6, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slate700);
    let lineY = y + 10.5;
    for (const line of lines) {
      doc.text(line, margin + 6, lineY);
      lineY += 4.2;
    }
    y += boxHeight + 4;
  }

  function addTable(headers: string[], rows: string[][], colWidths: number[]) {
    checkPageBreak(20);
    const rowHeight = 6.5;
    const headerHeight = 7.5;

    // Header Row
    doc.setFillColor(...slate900);
    doc.rect(margin, y, contentWidth, headerHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    let currentX = margin;
    headers.forEach((h, i) => {
      doc.text(h, currentX + 2, y + 5);
      currentX += colWidths[i];
    });
    y += headerHeight;

    // Body Rows
    rows.forEach((row, rIdx) => {
      checkPageBreak(rowHeight + 2);
      doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(...slate700);

      let cellX = margin;
      row.forEach((cell, cIdx) => {
        if (cIdx === 0) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        const cellText = String(cell);
        doc.text(cellText, cellX + 2, y + 4.5);
        cellX += colWidths[cIdx];
      });
      y += rowHeight;
    });
    y += 4;
  }

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  doc.setFillColor(...slate900);
  doc.rect(0, 0, pageWidth, 120, 'F');

  doc.setFillColor(...amber600);
  doc.rect(0, 118, pageWidth, 3, 'F');

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.rect(margin, 25, contentWidth, 75);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.rect(margin + 2, 27, contentWidth - 4, 71);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...amber600);
  doc.text('OFFICIAL ENTERPRISE SYSTEM DOCUMENTATION', pageWidth / 2, 38, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('SWED WOOD WORK', pageWidth / 2, 50, { align: 'center' });
  doc.text('MANAGEMENT SYSTEM', pageWidth / 2, 60, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(226, 232, 240);
  doc.text('Comprehensive Operational & User Guide', pageWidth / 2, 70, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Dual Cloud Firestore & Local Offline Storage Architecture', pageWidth / 2, 78, { align: 'center' });

  // Organization Block in White Area
  y = 135;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, 48, 2, 2, 'F');
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 48, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...woodBrown);
  doc.text('SWEDSWOOD ENTERPRISE / SWEDSFREE ENTERPRISE', margin + 8, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...slate700);
  doc.text('Workshop Address: 2 Sweds free Avenue, Sussex, Freetown, Sierra Leone', margin + 8, y + 17);
  doc.text('Official Contact: info@swedwoodwork.com | Tel: +232 76 442590', margin + 8, y + 23);
  doc.text('Operating Currency Standard: Sierra Leone Leone (Le / SLL)', margin + 8, y + 29);
  doc.text('Application Release: Version 2.5 Production Build (2026 Edition)', margin + 8, y + 35);
  doc.text('Audience: System Administrators, Workshop Managers, Auditors & Artisans', margin + 8, y + 41);

  y = 195;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...slate900);
  doc.text('DOCUMENT SCOPE & PURPOSE', margin, y);
  doc.setDrawColor(...amber600);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 2, margin + 45, y + 2);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(...slate700);
  const introText = 
    'This manual serves as the authoritative operational guide for the Swedswood Carpentry and Timber ' +
    'Logistics Management System. It delivers end-to-end guidance on navigating workshop workflows, managing raw ' +
    'timber inventory and consumable hardware, registering institutional, company, and private clients, tracking ' +
    'bespoke furniture commissions, generating legally compliant branded invoices and payment receipts, enforcing ' +
    'installment payment settlement rules, conducting financial audits, managing employee payroll in Sierra Leone Leones (Le), ' +
    'and executing offline backups with Zero Data Loss protection.';
  
  const introLines = doc.splitTextToSize(introText, contentWidth);
  introLines.forEach((l: string) => {
    doc.text(l, margin, y);
    y += 4.5;
  });

  y = 255;
  doc.setFillColor(...slate900);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('ZERO DATA LOSS GUARANTEE', margin + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('The system operates a high-reliability dual-engine: all client dossiers, job records, inventory logs, and', margin + 6, y + 14);
  doc.text('financial transactions persist immediately to local device cache and sync live with Google Cloud Firestore.', margin + 6, y + 19);

  // ==========================================
  // PAGE 2: TABLE OF CONTENTS
  // ==========================================
  doc.addPage();
  drawHeader('Table of Contents');
  y = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...slate900);
  doc.text('TABLE OF CONTENTS', margin, y);
  doc.setDrawColor(...amber600);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 2, margin + 40, y + 2);
  y += 10;

  const tocItems = [
    { num: '01', title: 'System Overview & Dual Storage Architecture', desc: 'Core purpose, architecture, offline resilience, and browser storage' },
    { num: '02', title: 'User Roles & Access Control (RBAC)', desc: 'Admin, Manager, Auditor, Staff roles and permission matrix' },
    { num: '03', title: 'Workshop Hub (Dashboard Overview)', desc: 'Executive KPI metrics, inventory warnings, and rapid action shortcuts' },
    { num: '04', title: 'Inventory & Timber Logistics Management', desc: 'Raw wood species, hardware, unit costs in Le, minimum alerts & reorders' },
    { num: '05', title: 'Customer & Client Relationship Management', desc: 'Company / Institution / Private tiers, contact dossiers, and debt balance tracking' },
    { num: '06', title: 'Commission & Job Order Management', desc: 'Project specs, custom quote pricing, stages, material allocation & staff assignments' },
    { num: '07', title: 'Invoices, Receipts & Installment Clearance', desc: 'Branded invoice generation, multi-item line quotes, installment records & audit trail' },
    { num: '08', title: 'Daily Workshop & Site Activity Logs', desc: 'Photographic progress records, bench assembly logs, and site installation diaries' },
    { num: '09', title: 'Financial Accounting & Cash Flow Ledgers', desc: '6 Inwards and 8 Outwards categories, expense vouchers, cash flow analysis in Le' },
    { num: '10', title: 'Human Resources, Attendance & Wage Management', desc: 'Artisan roster, wage structures in Le, overtime tracking, and warning records' },
    { num: '11', title: 'Audit Reports & Monthly Trends Analytics', desc: 'Printable executive audit dossiers and interactive Recharts monthly trajectory' },
    { num: '12', title: 'Settings, Data Backups & Zero Data Loss Protocol', desc: 'JSON offline backup creation, data restoration, cloud sync and disaster recovery' },
    { num: '13', title: 'Frequently Asked Questions & Troubleshooting', desc: 'Network dropouts, balance updates, currency formatting, and technical support' }
  ];

  tocItems.forEach((item, index) => {
    checkPageBreak(16, 'Table of Contents');
    doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
    doc.roundedRect(margin, y, contentWidth, 13, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...woodBrown);
    doc.text(`CHAPTER ${item.num}`, margin + 3, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...slate900);
    doc.text(item.title, margin + 28, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slate500);
    doc.text(item.desc, margin + 28, y + 10);

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 13, margin + contentWidth, y + 13);

    y += 14.5;
  });

  // ==========================================
  // CHAPTER 1: SYSTEM OVERVIEW & ARCHITECTURE
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 1: System Overview');
  y = 22;

  addChapterHeading('1', 'System Overview & Dual Storage Architecture');

  addSectionHeading('1.1 Executive System Overview');
  addParagraph(
    'The Swedswood Carpentry and Construction Management System is an enterprise-grade, web-based management ' +
    'suite purpose-built for commercial carpentry workshops, timber merchants, and bespoke furniture fabricators ' +
    'in Sierra Leone. The application integrates all critical aspects of workshop management into a cohesive, ' +
    'highly responsive user interface optimized for desktop, tablet, and mobile devices.'
  );

  addSectionHeading('1.2 Zero Data Loss Dual Storage Architecture');
  addParagraph(
    'A central engineering pillar of the system is the Zero Data Loss Guarantee. Operating in environments with ' +
    'frequent electrical or internet fluctuations requires resilient data persistence. The platform incorporates ' +
    'a synchronized two-tier persistence layer:'
  );

  addBullet(
    'Tier 1: Browser Local Storage Cache',
    'Every user keystroke, job creation, financial transaction, and material entry is instantaneously written ' +
    'to the local device storage cache. If connectivity is interrupted, no unsaved changes are lost, and ' +
    'full operational access continues smoothly.'
  );

  addBullet(
    'Tier 2: Google Cloud Firestore Engine',
    'Whenever an active internet link is present, changes are synced in real-time to the dedicated Google Cloud ' +
    'Firestore database. This provides real-time cross-device synchronization and permanent cloud redundancy.'
  );

  addCalloutBox(
    'Key Operational Rule: Offline Mode Readiness',
    'You do not need to wait for internet reconnection to log daily work, create customer records, or issue ' +
    'invoices. The system queues changes locally and commits them to Cloud Firestore immediately when a network ' +
    'handshake is re-established.',
    'tip'
  );

  addSectionHeading('1.3 Hardware & Browser Requirements');
  addParagraph('The platform requires no specialized client installation and runs cleanly inside any modern web browser:');
  addBullet('Recommended Browsers', 'Google Chrome (v90+), Mozilla Firefox (v88+), Apple Safari (v14+), Microsoft Edge (v90+).');
  addBullet('Display Resolution', 'Optimized for high-density desktop displays (1920x1080) and fully responsive down to mobile viewports (375px).');
  addBullet('Printers & Export', 'Any standard A4 or Letter laser/inkjet printer, and native PDF virtual printers for direct digital dispatch.');

  // ==========================================
  // CHAPTER 2: USER ROLES & ACCESS CONTROL (RBAC)
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 2: User Roles & Access Control');
  y = 22;

  addChapterHeading('2', 'User Roles & Access Control (RBAC)');

  addSectionHeading('2.1 Role-Based Access Control Architecture');
  addParagraph(
    'To preserve data integrity, protect sensitive financial records, and enforce operational accountability, ' +
    'the system employs a stringent Role-Based Access Control (RBAC) framework. Every staff member is assigned ' +
    'one of four designated security roles:'
  );

  addBullet('Administrator (Admin)', 'Full supreme administrative authority. Manages system settings, data backup/restore, employee role assignments, database fresh start, and all workshop modules.');
  addBullet('Operations Manager', 'Supervises workshop commissions, inventory intake, client registration, quote and invoice dispatch, installment clearances, and daily workforce assignments.');
  addBullet('Financial Auditor', 'Specialized read-only oversight role. Has access to all financial ledgers, invoice archives, payment receipts, and the immutable Payment Audit Log, with destructive actions blocked.');
  addBullet('Workshop Artisan / Staff', 'Operational ground role. Restricted to logging daily work photos, viewing assigned commissions, and recording timber/material usages.');

  addSectionHeading('2.2 RBAC Permission Matrix');
  addTable(
    ['Function / Module', 'Admin', 'Manager', 'Auditor', 'Artisan/Staff'],
    [
      ['Workshop Hub Dashboard', 'Full Access', 'Full Access', 'Read-Only', 'Restricted'],
      ['Raw Timber & Inventory', 'Full Access', 'Full Access', 'Read-Only', 'Log Usage Only'],
      ['Customer Directory', 'Full Access', 'Full Access', 'Read-Only', 'No Access'],
      ['Jobs & Commissions', 'Full Access', 'Full Access', 'Read-Only', 'Assigned Only'],
      ['Invoicing & Receipts', 'Full Access', 'Full Access', 'Read-Only', 'No Access'],
      ['Payment Audit Trail', 'Full Access', 'Full Access', 'Audit View', 'No Access'],
      ['Financial Cash Ledger', 'Full Access', 'Full Access', 'Audit View', 'No Access'],
      ['Employee Roster & Payroll', 'Full Access', 'Full Access', 'Read-Only', 'No Access'],
      ['Audit Reports & Trends', 'Full Access', 'Full Access', 'Full Access', 'No Access'],
      ['Backup & Restore (Settings)', 'Full Access', 'Full Access', 'No Access', 'No Access'],
      ['Database Fresh Start', 'Admin Only', 'No Access', 'No Access', 'No Access']
    ],
    [55, 30, 30, 30, 30]
  );

  addSectionHeading('2.3 User Authentication & Approval Workflow');
  addParagraph(
    '1. Registration Request: New employees submit their full name, email, phone number, and desired role on the login screen.\n' +
    '2. Administrative Vetting: The submission enters the Pending Approval queue under the Employees tab.\n' +
    '3. Account Activation: An Administrator verifies credentials and activates the account, selecting appropriate security clearance.'
  );

  // ==========================================
  // CHAPTER 3: WORKSHOP HUB (DASHBOARD)
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 3: Workshop Hub');
  y = 22;

  addChapterHeading('3', 'Workshop Hub (Executive Dashboard)');

  addSectionHeading('3.1 Real-Time Workshop KPI Metrics');
  addParagraph(
    'The Workshop Hub serves as the primary cockpit for daily management. Upon authentication, users are presented ' +
    'with immediate high-level indicators reflecting the operational health of the enterprise:'
  );

  addBullet('Active Woodwork Jobs', 'Count of currently running commissions across Pending, In Progress, and Quality Check states.');
  addBullet('Raw Timber & Materials Stock', 'Total quantity of stored lumber pieces, board feet, and hardware items, with low-stock warnings highlighted in amber.');
  addBullet('Total Payments Cleared', 'Cumulative revenue received in Sierra Leone Leones (Le) across all recorded project deposits and installments.');
  addBullet('Active Client Portfolio', 'Total registered clients categorized into Corporate, Institutional, and Private accounts.');

  addSectionHeading('3.2 Rapid Action Shortcuts');
  addParagraph(
    'Convenient quick-action buttons at the top of the Workshop Hub allow managers to execute frequent tasks in one click:'
  );
  addBullet('New Job Commission', 'Opens the job creation modal to quote and commission a new project.');
  addBullet('Log Material Intake', 'Opens inventory entry to log arriving lumber trucks, board feet, or hardware.');
  addBullet('Record Cash Voucher', 'Logs immediate petty cash, generator fuel, or utility expenses.');
  addBullet('Issue Client Invoice', 'Redirects to the invoice workbench with client pre-selection.');

  addSectionHeading('3.3 System Health & Connectivity Indicator');
  addParagraph(
    'The top-right header displays real-time connection status (Online / Cloud Synced or Offline Local Cache). ' +
    'This guarantees total transparency regarding whether cloud replication has completed.'
  );

  // ==========================================
  // CHAPTER 4: INVENTORY & TIMBER LOGISTICS
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 4: Inventory & Timber Logistics');
  y = 22;

  addChapterHeading('4', 'Inventory & Timber Logistics Management');

  addSectionHeading('4.1 Inventory Categorization');
  addParagraph(
    'Swedswood maintains strict accounting of workshop materials divided into distinct logistical classes:'
  );
  addBullet('Hardwood & Sawn Timber', 'Locally sourced and imported timber species including Mahogany, Teak, Cedar, Iroko, and Plywood boards.');
  addBullet('Joinery Hardware', 'Heavy-duty drawer runners, ball-bearing hinges, mortise locks, handles, dowels, and structural fasteners.');
  addBullet('Finishing & Chemicals', 'Polyurethane sealers, wood stains, clear lacquers, sanding discs, glues, and thinners.');
  addBullet('Consumables & PPE', 'Safety goggles, respirators, router bits, and table-saw replacement blades.');

  addSectionHeading('4.2 Adding & Updating Inventory Items');
  addParagraph(
    '1. Click "+ Add Inventory Item" within the Inventory tab.\n' +
    '2. Input the item name, category, timber dimensions (thickness x width x length in inches or meters).\n' +
    '3. Enter current stock quantity, unit of measurement (pieces, planks, packets, liters).\n' +
    '4. Set the purchase unit cost in Sierra Leone Leones (Le).\n' +
    '5. Define the Minimum Alert Threshold (e.g. 10 planks). When stock drops below this number, the system automatically flags the item.'
  );

  addSectionHeading('4.3 Job Material Allocation & Wastage Management');
  addParagraph(
    'When carpenters consume lumber on a project, materials are logged directly against the job commission ID. ' +
    'The system automatically deducts the quantity from central inventory and tallies the total material expenditure ' +
    'against the client quote to determine project profitability.'
  );

  // ==========================================
  // CHAPTER 5: CUSTOMER & CLIENT DIRECTORY
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 5: Customer Directory');
  y = 22;

  addChapterHeading('5', 'Customer & Client Relationship Management');

  addSectionHeading('5.1 Three Client Classification Tiers');
  addParagraph(
    'To streamline billing, terms, and tax handling, the system classifies all customer accounts into three official categories:'
  );
  addBullet('Company', 'Commercial corporations, interior designers, property developers, and construction contractors.');
  addBullet('Institution', 'Government ministries, embassies, universities, educational boards, and non-profit organizations.');
  addBullet('Private', 'Individual home owners, residential clients, and private commissioners.');

  addSectionHeading('5.2 Client Profile Dossiers');
  addParagraph(
    'Each client dossier retains comprehensive records including primary contact person, direct phone, WhatsApp number, ' +
    'email, site delivery address, historical commission count, cumulative contract value, total cash cleared, and ' +
    'live outstanding debt balance.'
  );

  addSectionHeading('5.3 Direct Job Commissioning');
  addParagraph(
    'Managers can initiate a job directly from a customer card by clicking "Create Job". This pre-fills customer ' +
    'credentials, eliminating repetitive data entry and preventing duplicate accounts.'
  );

  // ==========================================
  // CHAPTER 6: COMMISSION & JOB MANAGEMENT
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 6: Job Commissions');
  y = 22;

  addChapterHeading('6', 'Commission & Job Project Management');

  addSectionHeading('6.1 Commission Creation Workflow');
  addParagraph(
    '1. Navigate to "Job lists" and click "+ New Commission Order".\n' +
    '2. Select an existing client or enter new client details on the fly.\n' +
    '3. Define the Project Title (e.g. "Solid Mahogany 10-Seater Executive Conference Table").\n' +
    '4. Itemize detailed specifications, dimensions, wood types, and finish requirements.\n' +
    '5. Set the Agreed Contract Quote in Sierra Leone Leones (Le).\n' +
    '6. Specify start date and client target delivery deadline.'
  );

  addSectionHeading('6.2 Commission Lifecycle Stages');
  addTable(
    ['Stage', 'Operational Meaning', 'Financial Milestone Expectation'],
    [
      ['Pending', 'Quote submitted, awaiting client sign-off or deposit', 'Initial mobilization deposit (typically 50-70%)'],
      ['In Progress', 'Wood selected, milling, joinery & assembly underway', 'Milestone progress installment (20-30%)'],
      ['Quality Check', 'Finishing, sanding, lacquering, hardware fitting', 'Pre-delivery inspection & final payment clearance'],
      ['Completed', 'Fabrication concluded, packaged for dispatch', '100% contract amount fully cleared'],
      ['Delivered', 'On-site installation and client sign-off achieved', 'Zero outstanding balance, project archived']
    ],
    [35, 65, 75]
  );

  addSectionHeading('6.3 Artisan & Staff Allocation');
  addParagraph(
    'Commission cards permit the assignment of lead carpenters and assistants. Assigned personnel can review ' +
    'the commission specifications from their mobile devices, ensuring exact adherence to customer measurements.'
  );

  // ==========================================
  // CHAPTER 7: INVOICES, RECEIPTS & AUDIT TRAIL
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 7: Invoices & Receipts');
  y = 22;

  addChapterHeading('7', 'Invoices, Receipts & Installment Clearance');

  addSectionHeading('7.1 Commercial Invoice Generation');
  addParagraph(
    'The Invoices & Receipts module provides complete billing capabilities. Quotes and Invoices feature official ' +
    'Swedswood Enterprise branding, registered tax information, banking coordinates, and custom multi-line itemization.'
  );

  addCalloutBox(
    'Official Invoice Rule: No Balance Displayed',
    'In accordance with enterprise accounting standards, official Commercial Invoices show the complete contractual ' +
    'quote amount and scope of works. Outstanding debt balances are NOT displayed on invoices; payment balances are ' +
    'strictly managed on official Payment Receipts and Client Financial Ledgers.',
    'warning'
  );

  addSectionHeading('7.2 Recording Installment Payments & Issuing Receipts');
  addParagraph(
    'Clients rarely settle large custom woodwork commissions in a single upfront payment. The system provides ' +
    'comprehensive installment tracking:'
  );
  addBullet('Recording an Installment', 'Select the commission, click "+ Record Payment", enter the exact amount in Le, select payment method (Cash, Bank Transfer, Cheque, Mobile Money), and add notes.');
  addBullet('Official Payment Receipt', 'Each captured payment generates a branded receipt displaying the Payment ID, date, method, notes, and the Captured Payment Records table.');
  addBullet('Financial Settlement Breakdown', 'Every receipt automatically calculates the Total Contract Value, Cumulative Payments to Date, and the Remaining Balance Due (or displays "Le 0.00 - Fully Settled").');

  addSectionHeading('7.3 Safe Payment Editing & In-UI Confirmations');
  addParagraph(
    'To avoid browser freezing inside iframe environments, all payment modifications and deletions utilize ' +
    'in-UI dialog modals with prominent validation error banners. Accidental deletions require explicit two-step confirmation.'
  );

  addSectionHeading('7.4 Immutable Payment Modification Audit Log');
  addParagraph(
    'Any modification or deletion of a payment installment is permanently recorded in the Payment Audit Log. ' +
    'The log records the timestamp, operator name, order title, action type (CREATED, UPDATED, DELETED), and ' +
    'the exact monetary difference. Auditors can inspect this log at any time without risking tampering.'
  );

  // ==========================================
  // CHAPTER 8: DAILY WORKSHOP & SITE LOGS
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 8: Daily Logs');
  y = 22;

  addChapterHeading('8', 'Daily Workshop & Site Activity Logs');

  addSectionHeading('8.1 Visual Progress Documentation');
  addParagraph(
    'High-end carpentry requires visual proof of craftsmanship and structural integrity. The Daily Logs module ' +
    'enables carpenters and site managers to upload daily photographic entries documenting work stages.'
  );

  addBullet('Bench Work & Joinery', 'Photos of mortise-and-tenon joints, carcass assemblies, carving details, and edge banding.');
  addBullet('Finishing Stages', 'Photos of wood grain filling, stain matching, primer coats, and high-gloss lacquering.');
  addBullet('Site Deliveries & Installation', 'Photos of kitchen cabinetry installations, architectural panelling, and final client sign-offs.');

  addSectionHeading('8.2 Log Search & Timeline Inspection');
  addParagraph(
    'Logs are tagged by date, artisan, and job title. Clients inquiring about project status can be shown ' +
    'an accurate visual timeline proving steady progress.'
  );

  // ==========================================
  // CHAPTER 9: FINANCIAL ACCOUNTING & CASH FLOW
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 9: Financial Accounting');
  y = 22;

  addChapterHeading('9', 'Financial Accounting & Cash Flow Ledgers');

  addSectionHeading('9.1 Financial Categorization Architecture');
  addParagraph(
    'The Financial Ledger classifies all workshop monetary transactions into standardized revenue and expense categories:'
  );

  addTable(
    ['Inwards (Revenue) Categories', 'Outwards (Expenditure) Categories'],
    [
      ['wood (Raw lumber sales & milling fees)', 'Tools and generator (Fuel, servicing, equipment purchase)'],
      ['sofa (Custom upholstered furniture)', 'Utilities (Electricity, municipal rates, water supply)'],
      ['Chair (Dining, office, and lounge seating)', 'Transportation (Timber haulage, site delivery fuel)'],
      ['Bed (Bedframes, headboards, wardrobes)', 'Material Purchase (Hardware, fasteners, varnishes, glues)'],
      ['Wood Construction (Roof trusses, decking)', 'Tools and Maintenance (Blade sharpening, machine repairs)'],
      ['others (Bespoke commissions & restoration)', 'Cast (Foundry, metal framing & brackets)'],
      ['', 'Salary (Artisan wages, casual labor, allowances)'],
      ['', 'others (Sundry workshop consumables)']
    ],
    [87, 87]
  );

  addSectionHeading('9.2 Net Cash Position & Audit Filtering');
  addParagraph(
    'The ledger automatically calculates Total Inflows, Total Outflows, and Current Net Cash Surplus/Deficit. ' +
    'Users can filter records by date ranges, transaction types, or search keywords to reconcile cash books.'
  );

  // ==========================================
  // CHAPTER 10: HUMAN RESOURCES & PAYROLL
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 10: Human Resources & Payroll');
  y = 22;

  addChapterHeading('10', 'Human Resources, Attendance & Wage Management');

  addSectionHeading('10.1 Staff Roster & Artisan Profiles');
  addParagraph(
    'The Employees module maintains profiles for master carpenters, apprentices, polishers, and machine operators. ' +
    'Profiles include contact telephone numbers, emergency contacts, hire dates, and role assignments.'
  );

  addSectionHeading('10.2 Wage Calculations in Sierra Leone Leones (Le)');
  addParagraph(
    'All wage computations are strictly formatted in Sierra Leone Leones (Le):'
  );
  addBullet('Base Compensation', 'Configurable as Daily Rate, Hourly Wage, or Fixed Monthly Salary.');
  addBullet('Overtime Multipliers', 'Overtime hours logged during night shifts or weekend rush projects are calculated with configurable overtime multipliers.');
  addBullet('Disciplinary & Warning Letters', 'Formal written warnings can be attached to an employee profile to ensure professional standards and punctuality across the workshop.');

  // ==========================================
  // CHAPTER 11: AUDIT REPORTS & MONTHLY TRENDS
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 11: Audit Reports & Trends');
  y = 22;

  addChapterHeading('11', 'Audit Reports & Monthly Trends Analytics');

  addSectionHeading('11.1 Executive Audit Dossiers');
  addParagraph(
    'The Audit Reports module synthesizes data from inventory, jobs, financial ledgers, and payments into clean, ' +
    'printable executive reports suitable for bank submissions, tax accounting, and partner reviews.'
  );

  addSectionHeading('11.2 Monthly Trends & Variance Analytics');
  addParagraph(
    'The integrated Monthly Trends section provides dynamic charts (powered by Recharts) comparing:'
  );
  addBullet('Job Completion Trajectories', 'Monthly volume of finished and delivered commissions.');
  addBullet('Material Cost Variances', 'Fluctuations in timber and hardware purchasing costs across calendar months.');
  addBullet('Profit Margin Trends', 'Net revenue spread after deducting direct project materials and labor.');

  // ==========================================
  // CHAPTER 12: SETTINGS, BACKUPS & DATA LOSS
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 12: Settings & Data Backups');
  y = 22;

  addChapterHeading('12', 'Settings, Data Backups & Zero Data Loss Protocol');

  addSectionHeading('12.1 Backup & Recovery Hub');
  addParagraph(
    'Located exclusively within the Settings tab, the Backup & Recovery Hub gives authorized active users ' +
    'complete control over their business records:'
  );

  addBullet('Backup System Data (JSON Download)', 'Exports a complete offline JSON archive containing all inventory, clients, jobs, payments, invoices, daily logs, and employee profiles. Keep this file on a secure USB drive or external drive.');
  addBullet('Restore JSON File (Upload)', 'Restores the complete database state from a previously saved JSON snapshot in seconds.');
  addBullet('Bring Back Cloud Data (Restore Till Today)', 'Pulls all latest records from Google Cloud Firestore, synchronizing local browser storage with the cloud database.');

  addCalloutBox(
    'Security Note: System Fresh Start (Admins Only)',
    'The "Clear System Data (Fresh Start)" action is strictly restricted to Administrators. It enables resetting ' +
    'the database for a new fiscal period or demonstration setup. All users are prompted for confirmation prior to execution.',
    'warning'
  );

  // ==========================================
  // CHAPTER 13: FAQ & TROUBLESHOOTING
  // ==========================================
  doc.addPage();
  drawHeader('Chapter 13: FAQ & Troubleshooting');
  y = 22;

  addChapterHeading('13', 'Frequently Asked Questions & Troubleshooting');

  addSectionHeading('13.1 Common Questions');

  addBullet('What happens if the internet goes offline during work?', 'You can continue working without disruption. All entries save to local storage immediately and sync with Cloud Firestore once reconnected.');
  addBullet('Why doesn’t the customer balance show on the printed invoice?', 'By accounting design, invoices show total quote contracts. Balances are tracked and displayed on Payment Receipts and the Customer Ledger.');
  addBullet('How can I correct an accidental payment entry?', 'Navigate to Invoices & Receipts or the Customer tab, find the installment, and click the Edit icon. The change is verified in an in-UI modal and recorded in the audit trail.');
  addBullet('Where can I download the latest User Manual PDF?', 'You can download the complete manual at any time from the Settings tab or the top bar by clicking "Download User Manual (PDF)".');

  addSectionHeading('13.2 Technical Support & Inquiries');
  addParagraph(
    'For technical assistance, system customization, or training workshops:\n' +
    '• Swedswood Enterprise IT Support Desk\n' +
    '• 2 Sweds free Avenue, Sussex, Freetown, Sierra Leone\n' +
    '• Email: support@swedwoodwork.com | info@swedwoodwork.com\n' +
    '• Direct Helpline: +232 76 442590\n' +
    '• Website: www.swedwoodwork.com'
  );

  // ==========================================
  // FINAL PASS: ADD FOOTERS & NUMBERING
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  return doc;
}

/**
 * Client-side trigger: Downloads the User Manual PDF
 */
export async function downloadUserManualPdf(): Promise<void> {
  try {
    // Attempt to download the pre-generated static PDF first
    const response = await fetch('/Swedswood_Woodwork_System_User_Manual.pdf', { method: 'HEAD' });
    if (response.ok) {
      const link = document.createElement('a');
      link.href = '/Swedswood_Woodwork_System_User_Manual.pdf';
      link.download = 'Swedswood_Woodwork_System_User_Manual.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  } catch (e) {
    console.warn('Pre-rendered PDF not fetched, compiling dynamically...', e);
  }

  // Fallback: Generate dynamically via jsPDF in client
  const doc = generateUserManualPDFDoc();
  doc.save('Swedswood_Woodwork_System_User_Manual.pdf');
}
