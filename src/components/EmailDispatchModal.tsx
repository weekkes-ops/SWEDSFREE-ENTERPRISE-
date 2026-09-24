import React, { useState } from 'react';
import { 
  Mail, 
  X, 
  Send, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Receipt, 
  Sparkles, 
  AlertCircle, 
  ExternalLink, 
  Clock, 
  Building2, 
  User, 
  DollarSign,
  ShieldCheck,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../types';

export const SYSTEM_EMAIL = 'swedswoodinfo@gmail.com';
export const WORKSHOP_NAME = 'Swedswood Enterprise';
export const WORKSHOP_PHONE = '+232 76 442590';
export const WORKSHOP_ADDRESS = '2 Swed Free Avenue, Sussex';

export interface EmailDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: 'PROFORMA' | 'INVOICE' | 'RECEIPT';
  docNumber: string;
  docDate: string;
  customerName: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  projectTitle: string;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  items?: Array<{ description: string; quantity?: number; amount: number }>;
  paymentMethod?: string;
  onDownloadPdf?: () => void;
  onRecordEmailSent?: (logData: {
    recipientEmail: string;
    subject: string;
    docType: string;
    docNumber: string;
    customerName: string;
  }) => void;
}

export default function EmailDispatchModal({
  isOpen,
  onClose,
  docType,
  docNumber,
  docDate,
  customerName,
  customerCompany,
  customerEmail = '',
  customerPhone = '',
  projectTitle,
  totalAmount,
  amountPaid = 0,
  balanceDue = 0,
  items = [],
  paymentMethod,
  onDownloadPdf,
  onRecordEmailSent
}: EmailDispatchModalProps) {
  const docTitle = 
    docType === 'PROFORMA' ? 'Proforma Invoice / Quotation' :
    docType === 'INVOICE' ? 'Official Tax Invoice' : 'Official Payment Clearance Receipt';

  const defaultSubject = 
    docType === 'PROFORMA' ? `Proforma Invoice ${docNumber} - Swedswood Enterprise (${projectTitle})` :
    docType === 'INVOICE' ? `Official Invoice ${docNumber} - Swedswood Enterprise (${projectTitle})` :
    `Payment Clearance Receipt ${docNumber} - Swedswood Enterprise (${projectTitle})`;

  const [recipientEmail, setRecipientEmail] = useState(customerEmail || '');
  const [subject, setSubject] = useState(defaultSubject);
  const [ccSystemEmail, setCcSystemEmail] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [emailClientError, setEmailClientError] = useState('');

  // Update recipient email and subject if prop changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setRecipientEmail(customerEmail || '');
      setSubject(defaultSubject);
      setSentSuccess(false);
      setEmailClientError('');
      setCustomNote('');
    }
  }, [customerEmail, defaultSubject, isOpen]);

  if (!isOpen) return null;

  // Generate clean, professional text body
  const generateEmailBodyText = () => {
    let body = `Dear ${customerName}${customerCompany ? ` (${customerCompany})` : ''},\n\n`;

    if (docType === 'PROFORMA') {
      body += `Thank you for requesting a quotation from Swedswood Enterprise. Please find attached and summarized below your official Proforma Invoice.\n\n`;
    } else if (docType === 'INVOICE') {
      body += `Please find attached your official Tax Invoice from Swedswood Enterprise for woodwork and fine carpentry services rendered.\n\n`;
    } else {
      body += `We hereby confirm and acknowledge clearance of your payment towards woodwork commission services. Please find your official receipt details below.\n\n`;
    }

    body += `--------------------------------------------------\n`;
    body += `DOCUMENT DETAILS\n`;
    body += `--------------------------------------------------\n`;
    body += `Type: ${docTitle}\n`;
    body += `Reference Number: ${docNumber}\n`;
    body += `Date: ${docDate}\n`;
    body += `Project / Commission: ${projectTitle}\n`;
    body += `Customer: ${customerName}\n`;
    if (customerCompany) body += `Company: ${customerCompany}\n`;
    if (customerPhone) body += `Phone: ${customerPhone}\n`;
    body += `--------------------------------------------------\n\n`;

    if (items && items.length > 0) {
      body += `ITEMIZED BREAKDOWN:\n`;
      items.forEach((item, idx) => {
        const qtyStr = item.quantity ? ` (Qty: ${item.quantity})` : '';
        body += `${idx + 1}. ${item.description}${qtyStr} - ${formatCurrency(item.amount)}\n`;
      });
      body += `\n`;
    }

    body += `FINANCIAL SUMMARY:\n`;
    body += `Total Value: ${formatCurrency(totalAmount)}\n`;
    if (docType === 'RECEIPT') {
      body += `Payment Cleared: ${formatCurrency(amountPaid || totalAmount)}\n`;
      if (paymentMethod) body += `Payment Channel: ${paymentMethod}\n`;
      body += `Remaining Balance: ${formatCurrency(balanceDue)}\n`;
    } else if (docType === 'INVOICE') {
      body += `Amount Paid: ${formatCurrency(amountPaid)}\n`;
      body += `Balance Due: ${formatCurrency(balanceDue)}\n`;
    } else {
      body += `Estimated Total: ${formatCurrency(totalAmount)}\n`;
    }

    if (customNote.trim()) {
      body += `\nSPECIAL REMARKS / INSTRUCTIONS:\n`;
      body += `${customNote.trim()}\n`;
    }

    body += `\nBANK / PAYMENT INFORMATION:\n`;
    body += `Bank: Sierra Leone Commercial Bank (SLCB)\n`;
    body += `Account: 003-09415-2831\n`;
    body += `Swift: SLCBSLFRXXX\n`;
    body += `Account Name: Swedswood Enterprise\n\n`;

    body += `If you have any questions or require modifications, please contact our workshop team:\n`;
    body += `Official System Email: ${SYSTEM_EMAIL}\n`;
    body += `Workshop Contact: ${WORKSHOP_PHONE}\n`;
    body += `Workshop Address: ${WORKSHOP_ADDRESS}\n\n`;
    body += `Warm regards,\n`;
    body += `Swedswood Enterprise Management\n`;
    body += `2 Swed Free Avenue, Sussex`;

    return body;
  };

  const handleCopyBody = async () => {
    try {
      const fullText = `Subject: ${subject}\n\n` + generateEmailBodyText();
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setEmailClientError('Unable to access clipboard automatically.');
    }
  };

  const handleSendViaGmail = () => {
    if (!recipientEmail.trim()) {
      setEmailClientError('Please enter a valid recipient client email address.');
      return;
    }

    setEmailClientError('');
    const body = generateEmailBodyText();
    const cc = ccSystemEmail ? SYSTEM_EMAIL : '';
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail.trim())}&cc=${encodeURIComponent(cc)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    const link = document.createElement('a');
    link.href = gmailUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerRecordSent('Gmail Web Compose');
  };

  const handleSendViaMailto = () => {
    if (!recipientEmail.trim()) {
      setEmailClientError('Please enter a valid recipient client email address.');
      return;
    }

    setEmailClientError('');
    const body = generateEmailBodyText();
    const cc = ccSystemEmail ? `&cc=${encodeURIComponent(SYSTEM_EMAIL)}` : '';
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(subject)}${cc}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoUrl;
    triggerRecordSent('Default Mail App');
  };

  const triggerRecordSent = (channel: string) => {
    setSentSuccess(true);
    if (onRecordEmailSent) {
      onRecordEmailSent({
        recipientEmail: recipientEmail.trim(),
        subject,
        docType,
        docNumber,
        customerName
      });
    }

    // Auto-save to localStorage audit log
    try {
      const existingLogs = JSON.parse(localStorage.getItem('swedsfree_email_logs') || '[]');
      const newEntry = {
        id: `email-${Date.now()}`,
        docType,
        docNumber,
        customerName,
        recipientEmail: recipientEmail.trim(),
        senderEmail: SYSTEM_EMAIL,
        channel,
        subject,
        totalAmount,
        timestamp: new Date().toISOString(),
        formattedDate: new Date().toLocaleString()
      };
      existingLogs.unshift(newEntry);
      localStorage.setItem('swedsfree_email_logs', JSON.stringify(existingLogs.slice(0, 100)));
    } catch (e) {
      console.error('Error saving email log:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-5 text-white flex items-center justify-between border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">Send {docTitle} via Email</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {docNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <span>System Sender:</span>
                <span className="font-bold text-amber-400 font-mono">{SYSTEM_EMAIL}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 flex-1">
          
          {/* Success Banner */}
          {sentSuccess && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
              <div className="p-1.5 bg-emerald-200 rounded-xl text-emerald-800 shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs text-emerald-900">
                <p className="font-black text-sm">Email Dispatched Successfully!</p>
                <p className="mt-0.5 text-emerald-800">
                  The client message was compiled from <strong>{SYSTEM_EMAIL}</strong> to <strong>{recipientEmail}</strong>. 
                  Audit log record has been saved in the system database.
                </p>
              </div>
            </div>
          )}

          {/* Validation Error Banner */}
          {emailClientError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{emailClientError}</span>
            </div>
          )}

          {/* Sender & Recipient Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Sender (System Email) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Sender Email (System Address)
              </label>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate font-mono text-amber-900">{SYSTEM_EMAIL}</span>
              </div>
              <p className="text-[10px] text-slate-500">Official Swedswood Enterprise mail server identity</p>
            </div>

            {/* Recipient Client Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                Client / Recipient Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. client@company.com"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  setEmailClientError('');
                }}
                className={`w-full p-2.5 bg-white border rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  !recipientEmail ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'
                }`}
              />
              {!recipientEmail && (
                <p className="text-[10px] font-bold text-amber-600">
                  ⚠️ No email on record. Enter the customer's email address above.
                </p>
              )}
            </div>
          </div>

          {/* CC Checkbox & Customer Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={ccSystemEmail}
                onChange={(e) => setCcSystemEmail(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
              <span>Send carbon copy (CC) to {SYSTEM_EMAIL} for workshop archiving</span>
            </label>
            <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span>{customerName}</span>
              {customerCompany && <span className="text-slate-400">• {customerCompany}</span>}
            </div>
          </div>

          {/* Subject Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
              Email Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Document Summary Card & PDF Download */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black truncate">{projectTitle}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Ref: <span className="text-amber-400 font-mono font-bold">{docNumber}</span> • Issued: {docDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Total Amount</p>
                <p className="text-sm font-black text-amber-400 font-mono">{formatCurrency(totalAmount)}</p>
              </div>
              {onDownloadPdf && (
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/10"
                  title="Download PDF to inspect or attach"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* Optional Custom Note */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
              Custom Message / Specific Terms (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Please note 50% deposit has been credited. The expected delivery date is next Friday."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Live Message Preview Accordion */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Email Message Text Preview
              </label>
              <button
                type="button"
                onClick={handleCopyBody}
                className="text-amber-700 hover:text-amber-800 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied Message!' : 'Copy Full Text'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-700 whitespace-pre-wrap font-sans border border-slate-200 max-h-40 overflow-y-auto leading-relaxed">
              {generateEmailBodyText()}
            </pre>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Sends with official Swedswood Enterprise branding</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSendViaGmail}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Open pre-filled in Gmail Web Compose"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Send via Gmail Web</span>
            </button>

            <button
              type="button"
              onClick={handleSendViaMailto}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Open in default desktop or mobile mail app"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send via Mail App</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
