import { Job, Customer, Employee, JobPayment } from '../types';

// Helper to rasterize logo URL (e.g. /logo.svg or custom upload) into PNG Data URL for jsPDF
export async function getLogoDataUrl(logoUrl?: string): Promise<string | null> {
  const url = logoUrl || '/logo.svg';
  if (url.startsWith('data:image/png') || url.startsWith('data:image/jpeg')) {
    return url;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (e) {
        console.error('Error rasterizing logo for PDF:', e);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export interface CustomInvoiceItem {
  id: string;
  description: string;
  unitRate: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
}

// ==========================================
// PROGRAMMATIC HIGH-FIDELITY PDF INVOICE GENERATOR
// ==========================================
export function buildInvoicePdfContent(
  doc: any, // jsPDF instance
  job: Job,
  customer: Customer | undefined,
  template: 'SWEDS_WOOD' | 'MODERN',
  currentUser: Employee | null,
  customItems?: CustomInvoiceItem[],
  invoiceNoOverride?: string,
  dateOverride?: string,
  customerNameOverride?: string,
  addressOverride?: string,
  phoneOverride?: string,
  emailOverride?: string,
  customerMessageOverride?: string,
  projectTitleOverride?: string,
  projectDescriptionOverride?: string,
  commissionAmountOverride?: number,
  projectQtyOverride?: number | string,
  logoDataUrl?: string | null
) {
  const isSwedsWood = template === 'SWEDS_WOOD';
  const projectTitle = projectTitleOverride || job.title;
  const commissionAmount = commissionAmountOverride !== undefined ? commissionAmountOverride : job.quoteAmount;

  // 1. Resolve Items to Render (Ensure ALL items from customItems or job.items are included)
  let itemsToRender: { desc: string; qty: string; price: number; total: number }[] = [];
  if (customItems && customItems.length > 0) {
    itemsToRender = customItems.map(item => {
      const qtyNum = item.quantity !== undefined ? item.quantity : (parseFloat(item.unitRate) || 1);
      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.amount;
      const lineTotal = qtyNum * unitPrice;
      return {
        desc: item.description,
        qty: String(qtyNum),
        price: unitPrice,
        total: lineTotal
      };
    });
    if (commissionAmount > 0 && !customItems.some(i => i.description.includes(projectTitle))) {
      const projQtyNum = parseFloat(String(projectQtyOverride)) || 1;
      itemsToRender.unshift({
        desc: projectTitle,
        qty: String(projQtyNum),
        price: commissionAmount,
        total: commissionAmount * projQtyNum
      });
    }
  } else if (job.items && job.items.length > 0) {
    itemsToRender = job.items.map(item => ({
      desc: item.description,
      qty: String(item.quantity || 1),
      price: item.unitCost,
      total: item.totalCost || ((item.quantity || 1) * item.unitCost)
    }));
    if (commissionAmount > 0 && !itemsToRender.some(i => i.desc.includes(projectTitle))) {
      const projQtyNum = parseFloat(String(projectQtyOverride)) || 1;
      itemsToRender.unshift({
        desc: projectTitle,
        qty: String(projQtyNum),
        price: commissionAmount,
        total: commissionAmount * projQtyNum
      });
    }
  } else {
    const projQtyNum = parseFloat(String(projectQtyOverride)) || 1;
    itemsToRender = [{
      desc: projectTitle,
      qty: String(projQtyNum),
      price: commissionAmount,
      total: commissionAmount * projQtyNum
    }];
  }

  let subtotalVal = itemsToRender.reduce((sum, item) => sum + item.total, 0);
  if (subtotalVal === 0 && commissionAmount > 0) {
    subtotalVal = commissionAmount;
  }
  if (subtotalVal === 0 && job.quoteAmount > 0) {
    subtotalVal = job.quoteAmount;
  }
  const totalPaid = job.payments ? job.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
  const balanceDue = Math.max(0, subtotalVal - totalPaid);

  const invNoStr = invoiceNoOverride || `042`;
  const invDateStr = dateOverride || job.startDate;
  const cName = customerNameOverride || job.customerName;
  const cPhone = phoneOverride !== undefined ? phoneOverride : (customer?.phone || "");
  const cAddr = addressOverride || customer?.address || "";
  const cEmail = emailOverride !== undefined ? emailOverride : (customer?.email || "");

  const drawCircularSeal = (x: number, y: number, label: string) => {
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.5);
    doc.circle(x, y, 11, 'S');
    doc.circle(x, y, 9.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(180, 83, 9);
    doc.text("SWEDS WOOD ENTERPRISE", x, y - 5, { align: 'center' });
    doc.setFontSize(6.5);
    doc.text(label, x, y + 0.5, { align: 'center' });
    doc.setFontSize(4.5);
    doc.text("OFFICIAL CARPENTRY WORKSHOP", x, y + 5.5, { align: 'center' });
  };

  if (isSwedsWood) {
    // ==========================================
    // SWEDS WOOD ENTERPRISE OFFICIAL PAPER STYLE
    // ==========================================
    const drawSwedsHeader = (isContinuation: boolean = false) => {
      // Outer Page Border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(10, 10, 190, 277, 'S');

      if (isContinuation) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`SWEDS WOOD ENTERPRISE — INVOICE #${invNoStr} (CONTINUED)`, 15, 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Client: ${cName} | Date: ${invDateStr}`, 15, 25);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(15, 27, 195, 27);
        return 32;
      }

      // System Official Logo image embedding
      let logoDrawn = false;
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'PNG', 15, 13, 22, 20);
          logoDrawn = true;
        } catch (err) {
          console.error('Error drawing logo in PDF:', err);
        }
      }

      if (!logoDrawn) {
        const logoX = 25;
        const logoY = 27;
        doc.setFillColor(155, 55, 31);
        doc.circle(logoX, logoY, 9, 'F');
        doc.setLineWidth(0.6);
        doc.setDrawColor(255, 255, 255);
        for (let angle = 0; angle < 360; angle += 45) {
          const rad = (angle * Math.PI) / 180;
          const startX = logoX + Math.cos(rad) * 3.5;
          const startY = logoY + Math.sin(rad) * 3.5;
          const endX = logoX + Math.cos(rad) * 7;
          const endY = logoY + Math.sin(rad) * 7;
          doc.line(startX, startY, endX, endY);
        }
        doc.setFillColor(255, 255, 255);
        doc.circle(logoX, logoY, 2.5, 'F');
      }

      // Company Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text("SWEDS WOOD ENTERPRISE", 40, 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 70, 70);
      doc.text("Custom Hardwood Carpentry, Bespoke Furniture & Timber Logistics", 40, 29.5);

      doc.setFillColor(0, 0, 0);
      doc.rect(40, 31.5, 80, 1, 'F');

      // Invoice Badge Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.rect(135, 16, 60, 16, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("INVOICE", 135 + 30, 16 + 11, { align: 'center' });

      // Metadata Small Table
      const tableX = 15;
      const tableY = 41;
      const col1Width = 30;
      const col2Width = 65;
      const rowHeight = 6;

      const metaData = [
        { label: "Invoice No.", val: invNoStr },
        { label: "Address", val: "2 Sweds free Avenue, Sussex Freetown" },
        { label: "Date", val: invDateStr },
        { label: "Terms (days)", val: "COD / Direct Wire Clearance" }
      ];

      doc.setLineWidth(0.2);
      doc.setDrawColor(0, 0, 0);

      for (let i = 0; i < 4; i++) {
        const currentY = tableY + i * rowHeight;
        doc.setFillColor(245, 245, 245);
        doc.rect(tableX, currentY, col1Width, rowHeight, 'FD');
        doc.setFillColor(255, 255, 255);
        doc.rect(tableX + col1Width, currentY, col2Width, rowHeight, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(metaData[i].label, tableX + 3, currentY + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(metaData[i].val, tableX + col1Width + 3, currentY + 4.2);
      }

      // Customer Information Box
      const custY = 69;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("Invoice to:", 15, custY);

      const boxY = custY + 2;
      const boxHeight = 22;
      doc.setLineWidth(0.2);
      doc.setDrawColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.rect(15, boxY, 180, boxHeight, 'FD');

      doc.setFillColor(245, 245, 245);
      doc.rect(15, boxY, 180, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text("CUSTOMER INFORMATION", 18, boxY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text("NAME:", 18, boxY + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(cName, 75), 32, boxY + 10);

      doc.setFont('helvetica', 'bold');
      doc.text("MOBILE:", 115, boxY + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(cPhone || "N/A", 130, boxY + 10);

      doc.setFont('helvetica', 'bold');
      doc.text("ADDRESS:", 18, boxY + 16.5);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(cAddr || "Freetown, Sierra Leone", 75), 34, boxY + 16.5);

      doc.setFont('helvetica', 'bold');
      doc.text("EMAIL:", 115, boxY + 16.5);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(cEmail || "N/A", 60), 130, boxY + 16.5);

      return 98;
    };

    let startY = drawSwedsHeader(false);

    // Ledger Table Column Widths
    const ledCol1 = 105; // Description
    const ledCol2 = 18;  // Qty
    const ledCol3 = 27;  // Price
    const ledCol4 = 30;  // Total

    const drawTableHeader = (yPos: number) => {
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(15, yPos, 180, 7.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text("Description", 15 + 4, yPos + 5);
      doc.text("Qty", 15 + ledCol1 + (ledCol2 / 2), yPos + 5, { align: 'center' });
      doc.text("Price (SLL)", 15 + ledCol1 + ledCol2 + ledCol3 - 4, yPos + 5, { align: 'right' });
      doc.text("Total (SLL)", 15 + ledCol1 + ledCol2 + ledCol3 + ledCol4 - 4, yPos + 5, { align: 'right' });
      return yPos + 7.5;
    };

    let currentY = drawTableHeader(startY);

    // Render Table Items with Dynamic Multi-line Height & Multi-page Overflow
    itemsToRender.forEach((it, idx) => {
      const descLines = doc.splitTextToSize(it.desc, ledCol1 - 6);
      const rowHeight = Math.max(7.5, descLines.length * 4.2 + 3);

      // Check if row exceeds printable page boundary
      if (currentY + rowHeight > 245) {
        doc.addPage();
        const nextHeaderY = drawSwedsHeader(true);
        currentY = drawTableHeader(nextHeaderY);
      }

      // Alternate light background for readability
      if (idx % 2 === 1) {
        doc.setFillColor(252, 252, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      // Draw Description (All Lines Rendered without truncation)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(descLines, 19, currentY + 4.5);

      // Qty Box Badge
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(15 + ledCol1 + 2, currentY + 1.2, ledCol2 - 4, 5.2, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(it.qty, 15 + ledCol1 + (ledCol2 / 2), currentY + 4.8, { align: 'center' });

      // Price & Total
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const pStr = `${it.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      const tStr = `${it.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      doc.text(pStr, 15 + ledCol1 + ledCol2 + ledCol3 - 4, currentY + 4.8, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(tStr, 15 + ledCol1 + ledCol2 + ledCol3 + ledCol4 - 4, currentY + 4.8, { align: 'right' });

      // Row separator
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.15);
      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);

      currentY += rowHeight;
    });

    // Table Total Summary Row anchored directly to the ledger table
    const tableTotalH = 7.5;
    doc.setFillColor(242, 244, 246);
    doc.rect(15, currentY, 180, tableTotalH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL INVOICE AMOUNT (SLL):", 15 + ledCol1 + ledCol2 + ledCol3 - 4, currentY + 5, { align: 'right' });
    doc.setFontSize(8.5);
    doc.text(`SLL ${subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 195 - 4, currentY + 5, { align: 'right' });
    currentY += tableTotalH;

    // Bottom border of table
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(15, currentY, 195, currentY);

    // Outer Table Vertical Borders
    doc.line(15, startY, 15, currentY);
    doc.line(195, startY, 195, currentY);

    // Check if totals & footer summary fits on current page (requires ~55mm clearance before footer at 283)
    if (currentY + 55 > 280) {
      doc.addPage();
      const nextHeaderY = drawSwedsHeader(true);
      currentY = nextHeaderY;
    }

    // ==========================================
    // INVOICE TOTALS & FINANCIAL SUMMARY
    // ==========================================
    const totY = currentY + 4;

    // Customer Message Box on Left
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("Customer Message & Terms", 15, totY);

    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);
    doc.rect(15, totY + 2, 95, 26, 'FD');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
    const msgText = customerMessageOverride !== undefined
      ? customerMessageOverride
      : "Please inspect all custom woodwork dimensions and finishes upon workshop delivery. Thank you for commissioning Sweds Wood Enterprise!";
    const messageLines = doc.splitTextToSize(msgText, 90);
    doc.text(messageLines, 18, totY + 7);

    // Financial Calculation Summary on Right
    const sumX = 115;
    const sumW = 80;
    const sumRowH = 9;

    // Total Invoice Amount Row
    doc.setFillColor(15, 23, 42);
    doc.setDrawColor(15, 23, 42);
    doc.rect(sumX, totY + 2, sumW, sumRowH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL INVOICE AMOUNT:", sumX + 4, totY + 7.5);
    doc.text(`SLL ${subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, sumX + sumW - 4, totY + 7.5, { align: 'right' });

    // Bank Instructions & Swift Wire Clearance
    const bankY = Math.min(totY + 24, 235);
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(15, bankY, 110, 16, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text("BANK WIRE & PAYMENT SETTLEMENT:", 18, bankY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text("Bank: Sierra Leone Commercial Bank (SLCB) Freetown", 18, bankY + 8.5);
    doc.text(`Swift: SLCBSLFRXXX • Account No: 003-09415-2831 • Ref: ${invNoStr}`, 18, bankY + 12.5);

    // Authorized Signatory & Official Stamp on Right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Authorized Workshop Signatory:", 135, bankY + 4);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(135, bankY + 12, 195, bankY + 12);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text("Workshop Manager / Sweds Wood Enterprise", 135, bankY + 15.5);

    // Official Quality Stamp
    drawCircularSeal(128, bankY + 8, "VERIFIED");

    // Page Numbering across all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${p} of ${totalPages} — Sweds Wood Enterprise Official Commercial Invoice`, 105, 283, { align: 'center' });
    }

  } else {
    // ==========================================
    // MODERN DIGITAL PROFESSIONAL TEMPLATE
    // ==========================================
    const drawModernHeader = (isContinuation: boolean = false) => {
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.rect(10, 10, 190, 277, 'S');

      if (isContinuation) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(69, 26, 3);
        doc.text(`SWEDS WOOD ENTERPRISE — INVOICE #${invNoStr} (CONTINUED)`, 15, 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Client: ${cName} | Date: ${invDateStr}`, 15, 25);
        doc.setDrawColor(69, 26, 3);
        doc.setLineWidth(0.5);
        doc.line(15, 27, 195, 27);
        return 32;
      }

      // Header Logo
      let logoDrawn = false;
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'PNG', 15, 14, 14, 14);
          logoDrawn = true;
        } catch (err) {
          console.error('Failed to add logo to modern PDF template:', err);
        }
      }

      if (!logoDrawn) {
        doc.setFillColor(69, 26, 3);
        doc.rect(15, 14, 12, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("W", 19, 22.5);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(69, 26, 3);
      doc.text("SWEDS WOOD ENTERPRISE", 32, 19);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(107, 114, 128);
      doc.text("Corporate Carpentry, Woodwork, Timber Logistics & Bespoke Furniture Design", 32, 23.5);

      // Metadata on Top Right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(69, 26, 3);
      doc.text("DIGITAL INVOICE", 195, 18, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      doc.text(`Ref: #${invNoStr}`, 195, 23, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${invDateStr}`, 195, 27, { align: 'right' });

      // Divider
      doc.setDrawColor(69, 26, 3);
      doc.setLineWidth(0.6);
      doc.line(15, 31, 195, 31);

      // Client & Billing Info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(69, 26, 3);
      doc.text("BILLED TO:", 15, 38);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(doc.splitTextToSize(cName, 80), 15, 43);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Phone: ${cPhone || "N/A"}`, 15, 48);
      doc.text(`Address: ${cAddr || "Freetown, Sierra Leone"}`, 15, 52.5);
      doc.text(`Email: ${cEmail || "N/A"}`, 15, 57);

      // Issuer details on right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(69, 26, 3);
      doc.text("WORKSHOP LOCATION:", 120, 38);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text("2 Sweds free Avenue, Sussex Freetown, Sierra Leone", 120, 43);
      doc.text("Payment Terms: Standard Clearance (COD / Bank Wire)", 120, 48);

      return 64;
    };

    let startY = drawModernHeader(false);

    const drawModernTableHeader = (yPos: number) => {
      doc.setFillColor(69, 26, 3);
      doc.rect(15, yPos, 180, 7.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("Itemized Production Scope & Timber Milling", 19, yPos + 5);
      doc.text("Qty", 120, yPos + 5, { align: 'center' });
      doc.text("Unit Rate", 145, yPos + 5);
      doc.text("Total Value (Le)", 191, yPos + 5, { align: 'right' });
      return yPos + 7.5;
    };

    let currentY = drawModernTableHeader(startY);

    itemsToRender.forEach((it, idx) => {
      const descLines = doc.splitTextToSize(it.desc, 95);
      const rowHeight = Math.max(7.5, descLines.length * 4.2 + 3);

      if (currentY + rowHeight > 245) {
        doc.addPage();
        const nextHeaderY = drawModernHeader(true);
        currentY = drawModernTableHeader(nextHeaderY);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(250, 248, 246);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      doc.text(descLines, 19, currentY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(69, 26, 3);
      doc.text(it.qty, 120, currentY + 4.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`Le ${it.price.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, 145, currentY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(`Le ${it.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, 191, currentY + 4.5, { align: 'right' });

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);

      currentY += rowHeight;
    });

    // Modern Table Total Row
    const modernTableTotalH = 7.5;
    doc.setFillColor(245, 245, 244);
    doc.rect(15, currentY, 180, modernTableTotalH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(69, 26, 3);
    doc.text("TOTAL INVOICE AMOUNT (SLL):", 140, currentY + 5, { align: 'right' });
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    doc.text(`SLL ${subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 191, currentY + 5, { align: 'right' });
    currentY += modernTableTotalH;

    doc.setDrawColor(69, 26, 3);
    doc.setLineWidth(0.4);
    doc.line(15, currentY, 195, currentY);

    if (currentY + 55 > 280) {
      doc.addPage();
      const nextHeaderY = drawModernHeader(true);
      currentY = nextHeaderY;
    }

    // Totals & Bank Instructions
    const botY = currentY + 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(69, 26, 3);
    doc.text("Payment Instructions & Bank Settlement:", 15, botY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);
    const bankInstructionsText = `Standard bank wires are accepted at Sierra Leone Commercial Bank (SLCB) Freetown.\nSwift Address: SLCBSLFRXXX • Account: 003-09415-2831\nPlease specify invoice reference: INV-${invNoStr}`;
    doc.text(bankInstructionsText, 15, botY + 4.5);

    // Modern Totals Block
    const calcX = 120;
    const calcWidth = 75;
    const sumRowH = 8.5;

    // Total Invoice Amount
    doc.setFillColor(245, 245, 244);
    doc.setDrawColor(200, 200, 200);
    doc.rect(calcX, botY, calcWidth, sumRowH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    doc.text("Total Invoice Amount:", calcX + 3, botY + 5.5);
    doc.text(`SLL ${subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, calcX + calcWidth - 3, botY + 5.5, { align: 'right' });

    // Signatory
    const sigY = botY + 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(69, 26, 3);
    doc.text("Authorized Workshop Sign-off:", 120, sigY);
    doc.setDrawColor(200, 200, 200);
    doc.line(120, sigY + 8, 195, sigY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Workshop Manager / Sweds Wood Enterprise", 120, sigY + 11.5);

    drawCircularSeal(105, sigY + 6, "APPROVED");

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${p} of ${totalPages} — Sweds Wood Enterprise Modern Digital Invoice`, 105, 283, { align: 'center' });
    }
  }
}

// ==========================================
// PROGRAMMATIC HIGH-FIDELITY RECEIPT GENERATOR
// ==========================================
export function buildReceiptPdfContent(
  doc: any, // jsPDF instance
  job: Job,
  payment: JobPayment,
  customer: Customer | undefined,
  customItems?: CustomInvoiceItem[],
  receiptNoOverride?: string,
  dateOverride?: string,
  customerOverride?: string,
  methodOverride?: string,
  projectOverride?: string,
  amountOverride?: number,
  acknowledgeOverride?: string,
  companyOverride?: string,
  companySubOverride?: string,
  logoDataUrl?: string | null
) {
  const receiptNo = receiptNoOverride || payment.id.toUpperCase();
  const receiptDate = dateOverride || payment.date;
  const receiptCustomer = customerOverride || customer?.name || job.customerName;
  const receiptMethod = methodOverride || payment.method;
  const receiptProject = projectOverride || job.title;
  const receiptAmount = amountOverride !== undefined ? amountOverride : payment.amount;
  const companyName = companyOverride || "SWEDS WOOD ENTERPRISE";
  const companySub = companySubOverride || "Custom Hardwood Carpentry, Bespoke Furniture & Timber Logistics";

  // Outer Page Border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(10, 10, 190, 277, 'S');

  // Letterhead Logo
  let logoDrawn = false;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 15, 14, 16, 16);
      logoDrawn = true;
    } catch (err) {
      console.error('Failed to add logo to receipt PDF:', err);
    }
  }

  if (!logoDrawn) {
    const logoX = 23;
    const logoY = 22;
    doc.setFillColor(6, 78, 59);
    doc.circle(logoX, logoY, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("SW", logoX, logoY + 2.8, { align: 'center' });
  }

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(6, 78, 59);
  doc.text(companyName, 36, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(companySub, 36, 25);
  doc.text("2 Sweds free Avenue, Sussex Freetown, Sierra Leone", 36, 29);

  // Receipt Badge Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.6);
  doc.roundedRect(130, 14, 65, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 78, 59);
  doc.text("OFFICIAL RECEIPT", 130 + 32.5, 21, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`REC #: ${receiptNo}`, 130 + 32.5, 26.5, { align: 'center' });

  // Divider
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.8);
  doc.line(15, 34, 195, 34);

  // Cleared Value Highlight Card
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(15, 38, 180, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(6, 78, 59);
  doc.text("CLEARED PAYMENT INSTALLMENT AMOUNT:", 105, 44, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(6, 78, 59);
  doc.text(`Le ${receiptAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, 105, 53, { align: 'center' });

  // Receipt Metadata Grid
  const metaY = 62;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, metaY, 180, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("RECEIVED FROM (CLIENT):", 20, metaY + 6);
  doc.text("PAYMENT DATE:", 115, metaY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(receiptCustomer, 85), 20, metaY + 11.5);
  doc.text(receiptDate, 115, metaY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("BESPOKE CARPENTRY COMMISSION:", 20, metaY + 17.5);
  doc.text("PAYMENT METHOD:", 115, metaY + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(receiptProject, 85), 20, metaY + 22);
  doc.text(receiptMethod.toUpperCase(), 115, metaY + 22);

  // Itemized Scope Cleared Table
  let rItems: { desc: string; qty: number; unitPrice: number; total: number }[] = [];
  if (customItems && customItems.length > 0) {
    rItems = customItems.map(it => {
      const q = it.quantity !== undefined ? it.quantity : (parseFloat(it.unitRate) || 1);
      const p = it.unitPrice !== undefined ? it.unitPrice : it.amount;
      return { desc: it.description, qty: q, unitPrice: p, total: q * p };
    });
  } else if (job.items && job.items.length > 0) {
    rItems = job.items.map(it => ({
      desc: it.description,
      qty: it.quantity || 1,
      unitPrice: it.unitCost,
      total: it.totalCost || ((it.quantity || 1) * it.unitCost)
    }));
  }
  if (rItems.length === 0) {
    rItems = [{
      desc: receiptProject,
      qty: 1,
      unitPrice: receiptAmount || job.quoteAmount,
      total: receiptAmount || job.quoteAmount
    }];
  }

  const tableY = 90;
  doc.setFillColor(6, 78, 59);
  doc.rect(15, tableY, 180, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("Itemized Production Scope Cleared", 19, tableY + 4.8);
  doc.text("Qty", 120, tableY + 4.8, { align: 'center' });
  doc.text("Unit Rate", 145, tableY + 4.8);
  doc.text("Total Value (Le)", 191, tableY + 4.8, { align: 'right' });

  let curY = tableY + 7;
  rItems.slice(0, 6).forEach((it, idx) => {
    const descLines = doc.splitTextToSize(it.desc, 95);
    const rowH = Math.max(6.5, descLines.length * 3.8 + 2.5);

    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(15, curY, 180, rowH, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(descLines, 19, curY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 78, 59);
    doc.text(String(it.qty), 120, curY + 4.2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Le ${it.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, 145, curY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Le ${it.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, 191, curY + 4.2, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(15, curY + rowH, 195, curY + rowH);

    curY += rowH;
  });

  // Captured Payments Ledger
  if (job.payments && job.payments.length > 0) {
    const payTableY = curY + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(6, 78, 59);
    doc.text("ALL CAPTURED PAYMENT RECORDS FOR THIS COMMISSION:", 15, payTableY + 4);

    doc.setFillColor(240, 253, 244);
    doc.rect(15, payTableY + 6, 180, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(6, 78, 59);
    doc.text("#", 18, payTableY + 10.2);
    doc.text("Payment ID", 26, payTableY + 10.2);
    doc.text("Date", 65, payTableY + 10.2);
    doc.text("Method", 100, payTableY + 10.2);
    doc.text("Milestone Note", 130, payTableY + 10.2);
    doc.text("Amount (Le)", 191, payTableY + 10.2, { align: 'right' });

    let payY = payTableY + 12;
    job.payments.forEach((p, idx) => {
      if (payY > 215) return;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(50, 50, 50);
      doc.text(String(idx + 1), 18, payY + 4);
      doc.text(p.id.toUpperCase(), 26, payY + 4);
      doc.text(p.date, 65, payY + 4);
      doc.text(p.method, 100, payY + 4);
      doc.text(doc.splitTextToSize(p.note || 'Installment Payment', 45)[0], 130, payY + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(6, 78, 59);
      doc.text(`Le ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, 191, payY + 4, { align: 'right' });

      doc.setDrawColor(240, 240, 240);
      doc.line(15, payY + 5.5, 195, payY + 5.5);
      payY += 6;
    });

    curY = payY + 2;
  }

  // Financial Settlement Breakdown
  const totalContract = job.quoteAmount;
  const totalPaidCaptured = job.payments ? job.payments.reduce((s, p) => s + p.amount, 0) : receiptAmount;
  const balanceRemaining = Math.max(0, totalContract - totalPaidCaptured);
  const isSettled = balanceRemaining <= 0;

  const finY = Math.min(curY + 3, 218);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, finY, 180, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Total Contract Value:", 20, finY + 6);
  doc.text("Total Payments Captured to Date:", 20, finY + 11.5);
  doc.text(isSettled ? "Account Settlement Status:" : "Remaining Balance Due:", 20, finY + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Le ${totalContract.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, 110, finY + 6, { align: 'right' });
  doc.setTextColor(6, 78, 59);
  doc.text(`Le ${totalPaidCaptured.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, 110, finY + 11.5, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setTextColor(isSettled ? 6 : 180, isSettled ? 78 : 83, isSettled ? 59 : 9);
  doc.text(
    isSettled ? "LE 0.00 (FULLY SETTLED)" : `Le ${balanceRemaining.toLocaleString(undefined, { minimumFractionDigits: 0 })}`,
    110,
    finY + 17,
    { align: 'right' }
  );

  // Status Badge on Right
  doc.setFillColor(isSettled ? 240 : 254, isSettled ? 253 : 243, isSettled ? 244 : 199);
  doc.setDrawColor(isSettled ? 167 : 252, isSettled ? 243 : 211, isSettled ? 208 : 77);
  doc.roundedRect(125, finY + 4, 65, 12, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(isSettled ? 6 : 146, isSettled ? 78 : 64, isSettled ? 59 : 14);
  doc.text(isSettled ? "PAYMENT VERIFIED: SETTLED" : "PARTIAL INSTALLMENT CLEARED", 125 + 32.5, finY + 11.5, { align: 'center' });

  // Acknowledgment text
  const ackY = finY + 23;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  const ackText = acknowledgeOverride || "Payment received and credited in full accordance with Sweds Wood Enterprise official commercial workshop terms. All timber, joinery, and custom furniture commissions remain protected under enterprise warranty.";
  doc.text(doc.splitTextToSize(ackText, 110), 15, ackY + 4);

  // Authorized Signatory & Official Stamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 78, 59);
  doc.text("Authorized Workshop Cashier / Manager:", 135, ackY + 4);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(135, ackY + 12, 195, ackY + 12);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Official Clearance Signature", 135, ackY + 15.5);

  // Official Stamp
  const drawCircularReceiptSeal = (x: number, y: number) => {
    doc.setDrawColor(6, 78, 59);
    doc.setLineWidth(0.5);
    doc.circle(x, y, 10.5, 'S');
    doc.circle(x, y, 9, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(6, 78, 59);
    doc.text("SWEDS WOOD ENTERPRISE", x, y - 4.5, { align: 'center' });
    doc.setFontSize(6.5);
    doc.text("CLEARED", x, y + 0.5, { align: 'center' });
    doc.setFontSize(4.5);
    doc.text("OFFICIAL RECEIPT SEAL", x, y + 5, { align: 'center' });
  };
  drawCircularReceiptSeal(123, ackY + 9);

  // Footer page text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("Sweds Wood Enterprise — Official Carpentry & Woodwork Clearance Receipt — 2 Sweds free Avenue, Sussex Freetown", 105, 283, { align: 'center' });
}

// ==========================================
// PROGRAMMATIC HIGH-FIDELITY PROFORMA INVOICE PDF GENERATOR
// ==========================================
export interface ProformaPdfItem {
  desc?: string;
  description?: string;
  woodSpecies?: string;
  dimensions?: string;
  index?: number;
  qty?: string | number;
  quantity?: number;
  price: number;
  total: number;
}

export interface ProformaPdfOptions {
  proformaNo: string;
  date: string;
  validUntil: string;
  leadTime: string;
  paymentTerms: string;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  projectTitle: string;
  projectDescription?: string;
  items: ProformaPdfItem[];
  subtotal: number;
  discountPercent?: number;
  taxPercent?: number;
  depositPercent?: number;
  bankDetails?: string;
  notes?: string;
  preparedBy?: string;
  logoDataUrl?: string | null;
}

export function buildProformaInvoicePdfContent(
  doc: any,
  options: ProformaPdfOptions
) {
  const {
    proformaNo,
    date,
    validUntil,
    leadTime,
    paymentTerms,
    customerName,
    customerCompany,
    customerPhone,
    customerEmail,
    customerAddress,
    projectTitle,
    projectDescription,
    items,
    subtotal,
    discountPercent = 0,
    taxPercent = 0,
    depositPercent = 50,
    bankDetails,
    notes,
    preparedBy,
    logoDataUrl
  } = options;

  // Calculate pricing breakdown
  const discountVal = discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0;
  const afterDiscount = subtotal - discountVal;
  const taxVal = taxPercent > 0 ? (afterDiscount * taxPercent) / 100 : 0;
  const grandTotal = afterDiscount + taxVal;
  const depositVal = (grandTotal * (depositPercent || 50)) / 100;

  const drawCircularProformaSeal = (x: number, y: number) => {
    doc.setDrawColor(217, 119, 6); // amber-600
    doc.setLineWidth(0.5);
    doc.circle(x, y, 10, 'S');
    doc.circle(x, y, 8.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(217, 119, 6);
    doc.text("SWEDS WOOD ENTERPRISE", x, y - 4, { align: 'center' });
    doc.setFontSize(6.5);
    doc.text("PROFORMA", x, y + 0.5, { align: 'center' });
    doc.setFontSize(4.5);
    doc.text("OFFICIAL ESTIMATE", x, y + 4.5, { align: 'center' });
  };

  const drawHeader = (isContinuation: boolean = false) => {
    // Outer border
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.rect(10, 10, 190, 277, 'S');

    if (isContinuation) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`SWEDS WOOD ENTERPRISE — PROFORMA INVOICE #${proformaNo} (CONTINUED)`, 15, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Client: ${customerName} | Issued: ${date} | Valid Until: ${validUntil}`, 15, 25);
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.5);
      doc.line(15, 28, 195, 28);
      return 34;
    }

    // Top Dark Slate Accent Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(10, 10, 190, 26, 'F');

    // Logo on Left
    let logoDrawn = false;
    if (logoDataUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(13, 12.5, 21, 21, 2, 2, 'F');
        doc.addImage(logoDataUrl, 'PNG', 14, 13.5, 19, 19);
        logoDrawn = true;
      } catch (err) {
        console.error('Failed to draw logo on Proforma PDF:', err);
      }
    }
    if (!logoDrawn) {
      doc.setFillColor(217, 119, 6); // amber-600
      doc.roundedRect(14, 13, 20, 20, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text("SW", 24, 25.5, { align: 'center' });
    }

    // Company Information
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(255, 255, 255);
    doc.text("SWEDS WOOD ENTERPRISE", 38, 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text("Architectural Joinery, Hardwood Furniture, Fitted Kitchens & Interior Timber Solutions", 38, 24);
    doc.text("2 Sweds free Avenue, Sussex Freetown, Sierra Leone • Tel: +232 76 442590 • Email: info@swedswood.com", 38, 29);

    // Document Title Banner on Right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(253, 224, 71); // amber-300
    doc.text("PROFORMA INVOICE", 195, 20, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("COMMERCIAL QUOTATION", 195, 26, { align: 'right' });

    // Official preliminary notice banner
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.setLineWidth(0.2);
    doc.rect(10, 36, 190, 7.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text(
      "PRELIMINARY ESTIMATE & FORMAL PROFORMA: Issued for client budget approval, deposit settlement, and production scheduling.",
      105,
      41,
      { align: 'center' }
    );

    // Meta Block Grid (Client Dossier on Left, Quotation Terms on Right)
    // Left Box: Client Information
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 47, 88, 38, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("PROSPECTIVE CLIENT / PROFORMA RECIPIENT:", 18, 52.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(customerName || 'Valued Client', 18, 59);

    if (customerCompany) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      doc.text(customerCompany, 18, 64);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const phoneY = customerCompany ? 69 : 65;
    doc.text(`Phone: ${customerPhone || 'N/A'} • Email: ${customerEmail || 'N/A'}`, 18, phoneY);
    const addrLines = doc.splitTextToSize(`Delivery / Site: ${customerAddress || 'Freetown Workshop Handover'}`, 80);
    doc.text(addrLines, 18, phoneY + 5);

    // Right Box: Proforma Quotation Terms
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(106, 47, 89, 38, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("COMMERCIAL QUOTATION DETAILS:", 110, 52.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    doc.text("Proforma Ref No:", 110, 59);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(proformaNo || 'PRO-042', 150, 59);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text("Date of Issuance:", 110, 65);
    doc.text(date, 150, 65);

    doc.text("Quotation Validity:", 110, 71);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(validUntil || '30 Days from date', 150, 71);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text("Estimated Lead Time:", 110, 77);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(leadTime || '2 - 3 Weeks from deposit', 150, 77);

    // Project Scope Header Bar
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, 88, 181, 12, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("PROJECT / COMMISSION FOCUS:", 18, 93);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const scopeSummary = projectTitle ? `${projectTitle}${projectDescription ? ` — ${projectDescription}` : ''}` : 'Custom Architectural Woodworking & Fine Carpentry';
    doc.text(doc.splitTextToSize(scopeSummary, 172)[0] || '', 18, 97.5);

    return 105;
  };

  let curY = drawHeader(false);

  // Table Column Geometry
  const colX_No = 14;
  const colW_No = 10;
  const colX_Desc = 24;
  const colW_Desc = 82;
  const colX_Wood = 106;
  const colW_Wood = 32;
  const colX_Qty = 138;
  const colW_Qty = 16;
  const colX_Rate = 154;
  const colW_Rate = 22;
  const colX_Total = 176;
  const colW_Total = 19;

  const drawTableHeader = (y: number) => {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(14, y, 181, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);

    doc.text("#", colX_No + 3, y + 5);
    doc.text("ITEM & CRAFTSMANSHIP SPECIFICATIONS", colX_Desc + 2, y + 5);
    doc.text("WOOD / FINISH", colX_Wood + 2, y + 5);
    doc.text("QTY", colX_Qty + 8, y + 5, { align: 'center' });
    doc.text("UNIT RATE", colX_Rate + colW_Rate - 2, y + 5, { align: 'right' });
    doc.text("TOTAL (SLL)", colX_Total + colW_Total - 2, y + 5, { align: 'right' });

    return y + 7.5;
  };

  curY = drawTableHeader(curY);

  // Render Table Rows
  items.forEach((item, index) => {
    const itemDesc = item.desc || item.description || 'Custom Carpentry Item';
    const itemQty = item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1);
    const descLines = doc.splitTextToSize(itemDesc, colW_Desc - 4);
    const woodLines = doc.splitTextToSize(item.woodSpecies || 'Kiln-Dried Hardwood', colW_Wood - 4);
    const maxLines = Math.max(descLines.length, woodLines.length, 1);
    const rowH = Math.max(7.5, maxLines * 4 + 3.5);

    if (curY + rowH > 215) {
      doc.addPage();
      curY = drawHeader(true);
      curY = drawTableHeader(curY);
    }

    // Row alternating background
    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(14, curY, 181, rowH, 'F');

    // Horizontal bottom border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, curY + rowH, 195, curY + rowH);

    // Cell Texts
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(String(index + 1).padStart(2, '0'), colX_No + 3, curY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(descLines, colX_Desc + 2, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(woodLines, colX_Wood + 2, curY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(itemQty), colX_Qty + 8, curY + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX_Rate + colW_Rate - 2, curY + 5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(Number(item.total).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX_Total + colW_Total - 2, curY + 5, { align: 'right' });

    curY += rowH;
  });

  // Table bottom border
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.line(14, curY, 195, curY);

  // Footer Section Check
  if (curY > 215) {
    doc.addPage();
    curY = drawHeader(true);
  }

  const footY = Math.max(curY + 4, 190);

  // Left Box: Commercial Terms, Deposit Terms, and Bank Clearance
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, footY, 105, 52, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text("COMMERCIAL TERMS & ADVANCE DEPOSIT:", 18, footY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const termsP1 = paymentTerms || "50% Advance Deposit upon formal proforma approval to reserve seasoned timber and initiate bench fabrication. 50% Balance due on delivery and site inspection.";
  doc.text(doc.splitTextToSize(termsP1, 98), 18, footY + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text("BANK WIRE & MOBILE CLEARANCE:", 18, footY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Bank: Sierra Leone Commercial Bank (SLCB) • Freetown", 18, footY + 28.5);
  doc.text(`Account Name: Sweds Wood Enterprise • Account: 003-09415-2831`, 18, footY + 32.5);
  doc.text(`Orange Money Merchant / Africell: 076-000-000 • Ref: ${proformaNo}`, 18, footY + 36.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("Quality Guarantee: Precision joinery, kiln-dried timber & structural moisture guarantee.", 18, footY + 42);
  doc.text(notes ? `Note: ${notes}` : "Dimensions subject to on-site architectural verification before final sizing.", 18, footY + 46.5);

  // Right Box: Financial Calculation Summary
  const sumX = 124;
  const sumW = 71;
  let sumY = footY;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("ESTIMATED SUBTOTAL:", sumX, sumY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`SLL ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, sumX + sumW, sumY + 5, { align: 'right' });
  sumY += 7;

  // Optional Discount
  if (discountPercent > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52); // green-800
    doc.text(`Trade Discount (${discountPercent}%):`, sumX, sumY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`- SLL ${discountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, sumX + sumW, sumY + 5, { align: 'right' });
    sumY += 7;
  }

  // Optional GST
  if (taxPercent > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`GST / Sales Tax (${taxPercent}%):`, sumX, sumY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`+ SLL ${taxVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, sumX + sumW, sumY + 5, { align: 'right' });
    sumY += 7;
  }

  // GRAND TOTAL HIGHLIGHT ROW
  doc.setFillColor(15, 23, 42); // slate-900
  doc.setDrawColor(217, 119, 6); // amber-600
  doc.rect(sumX - 2, sumY + 2, sumW + 4, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(253, 224, 71); // amber-300
  doc.text("TOTAL ESTIMATE:", sumX + 2, sumY + 8);
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`SLL ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, sumX + sumW - 2, sumY + 8, { align: 'right' });
  sumY += 14;

  // REQUIRED ADVANCE DEPOSIT BANNER
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.3);
  doc.roundedRect(sumX - 2, sumY, sumW + 4, 9, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text(`ADVANCE DEPOSIT (${depositPercent}%):`, sumX + 2, sumY + 5.5);
  doc.setFontSize(8);
  doc.text(`SLL ${depositVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, sumX + sumW - 2, sumY + 5.5, { align: 'right' });

  // Signature Block at Bottom
  const sigY = 247;

  // Sweds Wood Authorized Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text("For: Sweds Wood Enterprise", 18, sigY);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(18, sigY + 12, 85, sigY + 12);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Authorized Signatory / ${preparedBy || 'Workshop Director'}`, 18, sigY + 16);

  // Circular Proforma Seal
  drawCircularProformaSeal(95, sigY + 8);

  // Client Acceptance Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text("Client Acceptance & Order Approval:", 120, sigY);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(120, sigY + 12, 190, sigY + 12);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature / Corporate Stamp & Date", 120, sigY + 16);

  // Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${p} of ${totalPages} — Sweds Wood Enterprise Official Commercial Proforma Invoice — 2 Sweds free Avenue, Sussex Freetown`,
      105,
      283,
      { align: 'center' }
    );
  }
}
