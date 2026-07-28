import { InventoryItem, InventoryTransaction, Customer, Employee, Job, FinancialTransaction, DailyWorkLog } from './types';

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-01',
    name: 'Mr Paul Bindi',
    role: 'Admin',
    phone: '+232 76 111 2222',
    email: 'paul.bindi@swedsfree.com',
    status: 'Active',
    baseSalary: 9500,
    dailyRate: 350,
    hireDate: '2024-01-10',
    password: 'admin',
  }
];

export const INITIAL_JOBS: Job[] = [];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [];

export const INITIAL_FINANCIALS: FinancialTransaction[] = [];

export const INITIAL_DAILY_WORK_LOGS: DailyWorkLog[] = [];
