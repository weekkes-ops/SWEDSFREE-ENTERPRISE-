export type WoodCategory = 'Lumber' | 'Plywood' | 'Hardware' | 'Finishes' | 'Adhesives' | 'Other';
export type WoodUnit = 'Board Feet' | 'Sheets' | 'Pieces' | 'Liters' | 'Kg' | 'Boxes';

export interface InventoryItem {
  id: string;
  name: string;
  category: WoodCategory;
  unit: WoodUnit;
  currentStock: number;
  minStockThreshold: number;
  unitCost: number; // typical purchase price per unit
  lastUpdated: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'INWARDS' | 'OUTWARDS' | 'STOCK_IN' | 'STOCK_OUT';
  quantity: number;
  unitCost: number;
  totalValue: number;
  date: string; // YYYY-MM-DD
  purpose: string;
  referenceId?: string; // Job ID or Purchase Order
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  registrationDate: string;
}

export type EmployeeRole = 
  | 'Admin' 
  | 'Manager' 
  | 'Employee' 
  | 'Auditor' 
  | 'Carpenter' 
  | 'Carver' 
  | 'Designer' 
  | 'Sander' 
  | 'Polisher' 
  | 'Supervisor'
  | 'Welder'
  | 'Driver'
  | 'Security'
  | 'Marketer'
  | 'Contractor'
  | 'Apprentice';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  phone: string;
  email: string;
  status: EmployeeStatus;
  hireDate: string;
  password?: string;
}

export type JobStatus = 'Quote' | 'In Progress' | 'Ready for Sander' | 'Ready for Polishing' | 'Completed' | 'Delivered';

export interface JobMaterial {
  itemId: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface JobItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface JobPayment {
  id: string;
  amount: number;
  date: string;
  method: 'Cash' | 'Bank Transfer' | 'Check' | 'Mobile Money';
  note?: string;
  referenceId?: string;
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  quantity?: number; // Job quantity / units count (e.g. 12 sets, 1 desk)
  items?: JobItem[]; // Provision for 2+ line items recorded for invoice printouts
  assignedEmployees: string[]; // Employee IDs
  status: JobStatus;
  startDate: string;
  dueDate: string;
  quoteAmount: number; // Price quoted to customer
  materialsUsed: JobMaterial[];
  laborCost: number;
  otherCosts: number;
  payments: JobPayment[];
}

export type FinancialInwardsCategory = 
  | 'wood' 
  | 'sofa' 
  | 'Chair' 
  | 'Bed' 
  | 'Wood Construction' 
  | 'others';

export type FinancialOutwardsCategory = 
  | 'Tools and generator' 
  | 'Utilities' 
  | 'Transportation' 
  | 'Material Purchase' 
  | 'Tools and Maintenance' 
  | 'Cast' 
  | 'others';

export type FinancialCategory = 
  | FinancialInwardsCategory 
  | FinancialOutwardsCategory 
  | 'Job Payment' 
  | 'Scrap wood sale' 
  | 'Custom Commission' 
  | 'Rent' 
  | 'Tools & Maintenance' 
  | 'Overhead' 
  | 'Other';

export interface FinancialTransaction {
  id: string;
  type: 'INCOME' | 'EXPENDITURE';
  category: FinancialCategory;
  amount: number;
  quantity?: number;
  unitCost?: number;
  date: string; // YYYY-MM-DD
  description: string;
  referenceId?: string; // JobId, EmployeeId, or InventoryTransactionId
  quantity?: number; // Quantity of items/units
  unitCost?: number; // Unit cost / rate per item (Le)
}

export type ReportPeriod = 'All Time' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export interface DailyWorkLog {
  id: string;
  employeeId: string;
  employeeName: string;
  jobId?: string;
  jobTitle?: string;
  date: string;
  timeStarted: string;
  timeEnd: string;
  location: string;
  comment: string;
  pictureUrl?: string;
}

export interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  password?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestDate: string;
}

export interface WarningLetter {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  type: 'Performance' | 'Conduct' | 'Attendance' | 'Safety' | 'Other';
  reason: string;
  severity: 'Low' | 'Medium' | 'High';
  issuedBy: string;
}

export interface SavedInvoiceItem {
  id: string;
  description: string;
  unitRate: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  woodSpecies?: string;
  dimensions?: string;
}

export interface SavedInvoice {
  id: string;
  jobId: string;
  invoiceNo: string;
  date: string;
  terms: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  customerMessage: string;
  preparedBy: string;
  template: 'SWEDS_WOOD' | 'MODERN' | 'PROFORMA';
  docType?: 'INVOICE' | 'PROFORMA';
  status: 'Draft' | 'Issued' | 'Paid' | 'Overdue' | 'Cancelled' | 'Accepted' | 'Expired';
  logoUrl?: string;
  items: SavedInvoiceItem[];
  subtotal: number;
  validityDays?: number;
  validUntil?: string;
  leadTime?: string;
  paymentTerms?: string;
  notes?: string;
  depositPercent?: number;
  discountPercent?: number;
  taxPercent?: number;
  customerId?: string;
  customerCompany?: string;
  projectTitle?: string;
  projectDescription?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface PaymentAuditLogEntry {
  id: string;
  jobId: string;
  jobTitle: string;
  customerName: string;
  paymentId: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  amount: number;
  previousAmount?: number;
  method: string;
  previousMethod?: string;
  date: string;
  previousDate?: string;
  note?: string;
  previousNote?: string;
  modifiedBy: string;
  timestamp: string;
}

export function formatCurrency(amount: number, decimals: number = 2): string {
  return `Le ${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export type OfficialDocumentCategory = 
  | 'Contracts & Agreements'
  | 'Permits & Regulatory'
  | 'Client Commission Documents'
  | 'Financial & Tax Documents'
  | 'Company & Legal Registration'
  | 'Safety & HR Compliance'
  | 'Delivery & Logistics Vouchers'
  | 'Other Official Scans';

export type DocumentConfidentiality = 'Public' | 'Internal / Workshop' | 'Confidential / Management';

export type DocumentStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Archived';

export interface OfficialDocument {
  id: string;
  title: string;
  referenceNumber: string; // e.g. "SL-FOR-2026-089"
  category: OfficialDocumentCategory;
  customerId?: string; // Linked customer, if any
  customerName?: string;
  jobId?: string; // Linked commission / job, if any
  jobTitle?: string;
  issuingAuthority: string; // e.g. "National Revenue Authority", "Ministry of Forestry", "Freetown Grand Hotel"
  issueDate: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD (optional, if time-bound)
  fileUrl: string; // Base64 data URL or document URL
  fileName: string;
  fileType: string; // 'application/pdf' | 'image/png' | 'image/jpeg' | etc.
  fileSize: string; // formatted size e.g. "1.4 MB"
  confidentiality: DocumentConfidentiality;
  status: DocumentStatus;
  description?: string;
  uploadedBy: string; // e.g. "Mr Paul Bindi (Admin)"
  uploadedAt: string; // YYYY-MM-DD or ISO
  tags: string[];
}


