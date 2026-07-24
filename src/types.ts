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
  type: 'INWARDS' | 'OUTWARDS';
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

export type EmployeeRole = 'Admin' | 'Manager' | 'Employee' | 'Auditor' | 'Carpenter' | 'Carver' | 'Designer' | 'Sander' | 'Polisher' | 'Apprentice';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  phone: string;
  email: string;
  status: EmployeeStatus;
  baseSalary: number; // monthly
  dailyRate: number; // daily base
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

export interface JobPayment {
  id: string;
  amount: number;
  date: string;
  method: 'Cash' | 'Bank Transfer' | 'Check' | 'Mobile Money';
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
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

export type FinancialCategory = 
  | 'Job Payment' 
  | 'Scrap wood sale' 
  | 'Custom Commission' 
  | 'Material Purchase' 
  | 'Employee Wages' 
  | 'Rent' 
  | 'Tools & Maintenance' 
  | 'Utilities' 
  | 'Overhead' 
  | 'Other';

export interface FinancialTransaction {
  id: string;
  type: 'INCOME' | 'EXPENDITURE';
  category: FinancialCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  referenceId?: string; // JobId, EmployeeId, or InventoryTransactionId
}

export type ReportPeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

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
  template: 'SWEDS_WOOD' | 'MODERN';
  status: 'Draft' | 'Issued' | 'Paid' | 'Overdue' | 'Cancelled';
  logoUrl?: string;
  items: SavedInvoiceItem[];
  subtotal: number;
  createdAt: string;
  lastUpdated: string;
}

export function formatCurrency(amount: number, decimals: number = 2): string {
  return `Le ${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}


