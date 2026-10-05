import { 
  InventoryItem, 
  InventoryTransaction, 
  Customer, 
  Employee, 
  Job, 
  FinancialTransaction, 
  DailyWorkLog, 
  RegistrationRequest, 
  WarningLetter, 
  SavedInvoice, 
  PaymentAuditLogEntry 
} from './types';

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [
  { 
    id: 'emp-01', 
    name: 'Mr Paul Bindi', 
    role: 'Admin', 
    phone: '+232 76 442590', 
    email: 'paul.bindi@swedsfree.com', 
    status: 'Active', 
    hireDate: '2024-01-10', 
    password: 'admin' 
  }
];

export const INITIAL_JOBS: Job[] = [];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [];

export const INITIAL_FINANCIALS: FinancialTransaction[] = [];

export const INITIAL_DAILY_WORK_LOGS: DailyWorkLog[] = [];

export const INITIAL_REGISTRATION_REQUESTS: RegistrationRequest[] = [];

export const INITIAL_WARNING_LETTERS: WarningLetter[] = [];

export const INITIAL_SAVED_INVOICES: SavedInvoice[] = [];

export const INITIAL_PAYMENT_AUDIT_LOGS: PaymentAuditLogEntry[] = [];

export { INITIAL_OFFICIAL_DOCUMENTS } from './initialDocuments';
