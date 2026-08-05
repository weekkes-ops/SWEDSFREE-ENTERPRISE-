import { InventoryItem, InventoryTransaction, Customer, Employee, Job, FinancialTransaction, DailyWorkLog, RegistrationRequest, WarningLetter, SavedInvoice } from './types';

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-101', name: 'Mahogany Timber Planks (2x10x12)', category: 'Lumber', unit: 'Board Feet', currentStock: 450, minStockThreshold: 100, unitCost: 45, lastUpdated: '2026-08-04' },
  { id: 'inv-102', name: 'Oak Hardwood Beams (4x4x10)', category: 'Lumber', unit: 'Board Feet', currentStock: 280, minStockThreshold: 80, unitCost: 65, lastUpdated: '2026-08-05' },
  { id: 'inv-103', name: 'Teak Marine Plywood (18mm)', category: 'Plywood', unit: 'Sheets', currentStock: 65, minStockThreshold: 20, unitCost: 180, lastUpdated: '2026-08-03' },
  { id: 'inv-104', name: 'Polyurethane High-Gloss Varnish', category: 'Finishes', unit: 'Liters', currentStock: 40, minStockThreshold: 15, unitCost: 35, lastUpdated: '2026-08-02' },
  { id: 'inv-105', name: 'Heavy Duty Stainless Steel Hinges', category: 'Hardware', unit: 'Pieces', currentStock: 220, minStockThreshold: 50, unitCost: 12, lastUpdated: '2026-08-01' },
  { id: 'inv-106', name: 'Industrial Grade PVA Wood Glue', category: 'Adhesives', unit: 'Liters', currentStock: 30, minStockThreshold: 10, unitCost: 28, lastUpdated: '2026-08-05' },
  { id: 'inv-107', name: 'Tungsten Carbide CNC Router Bits', category: 'Hardware', unit: 'Pieces', currentStock: 18, minStockThreshold: 5, unitCost: 95, lastUpdated: '2026-08-04' },
  { id: 'inv-108', name: 'Softwood Framing Timber (2x4x12)', category: 'Lumber', unit: 'Board Feet', currentStock: 600, minStockThreshold: 150, unitCost: 22, lastUpdated: '2026-08-05' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust-201', name: 'Sierra Mining Corporation', company: 'Sierra Mining Corp', phone: '+232 78 555 101', email: 'procurement@sierramining.sl', address: '14 Wilberforce Street, Freetown', notes: 'Corporate contract client for office furniture', registrationDate: '2026-01-15' },
  { id: 'cust-202', name: 'Freetown Grand Hotel & Suites', company: 'Freetown Grand Hotel', phone: '+232 76 444 202', email: 'management@freetowngrand.com', address: 'Cape Road, Aberdeen, Freetown', notes: 'Luxury hotel doors and lobby panels', registrationDate: '2026-02-10' },
  { id: 'cust-203', name: 'Bo Construction Services', company: 'Bo Construction Ltd', phone: '+232 30 333 303', email: 'info@boconstruction.sl', address: '55 Bo-Kenema Highway, Bo', notes: 'Residential housing wood fittings contractor', registrationDate: '2026-03-22' },
  { id: 'cust-204', name: 'Lumley Bay Beach Resort', company: 'Lumley Bay Resort', phone: '+232 88 222 404', email: 'projects@lumleybayresort.sl', address: 'Lumley Beach Road, Freetown', notes: 'Outdoor deck timber & restaurant furniture', registrationDate: '2026-04-05' },
  { id: 'cust-205', name: 'Makeni Educational Complex', company: 'Makeni Schools Trust', phone: '+232 77 111 505', email: 'admin@makeniedu.org', address: '12 University Drive, Makeni', notes: 'School desks & library furniture', registrationDate: '2026-05-18' },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'emp-01', name: 'Mr Paul Bindi', role: 'Admin', phone: '+232 76 111 2222', email: 'paul.bindi@swedsfree.com', status: 'Active', baseSalary: 9500, dailyRate: 350, hireDate: '2024-01-10', password: 'admin' },
  { id: 'emp-02', name: 'David Mansaray', role: 'Manager', phone: '+232 78 222 3333', email: 'david.m@swedsfree.com', status: 'Active', baseSalary: 7500, dailyRate: 280, hireDate: '2024-03-15', password: 'manager' },
  { id: 'emp-03', name: 'Fatmata Sesay', role: 'Auditor', phone: '+232 30 444 5555', email: 'fatmata.s@swedsfree.com', status: 'Active', baseSalary: 6800, dailyRate: 250, hireDate: '2024-06-01', password: 'auditor' },
  { id: 'emp-04', name: 'Ibrahim Bangura', role: 'Carpenter', phone: '+232 77 666 7777', email: 'ibrahim.b@swedsfree.com', status: 'Active', baseSalary: 5200, dailyRate: 200, hireDate: '2024-08-20', password: 'emp' },
  { id: 'emp-05', name: 'Alimamy Kamara', role: 'Carver', phone: '+232 88 888 9999', email: 'alimamy.k@swedsfree.com', status: 'Active', baseSalary: 5000, dailyRate: 190, hireDate: '2025-02-12', password: 'emp' },
  { id: 'emp-06', name: 'Mariama Koroma', role: 'Polisher', phone: '+232 79 000 1111', email: 'mariama.k@swedsfree.com', status: 'Active', baseSalary: 4800, dailyRate: 180, hireDate: '2025-05-10', password: 'emp' },
];

export const INITIAL_JOBS: Job[] = [
  {
    id: 'job-301',
    customerId: 'cust-201',
    customerName: 'Sierra Mining Corporation',
    title: 'Executive Mahogany Boardroom Table (16 Seater)',
    description: 'Custom handcrafted mahogany boardroom table with brass wire conduits and high-gloss polish.',
    quantity: 1,
    assignedEmployees: ['emp-04', 'emp-05', 'emp-06'],
    status: 'Ready for Polishing',
    startDate: '2026-07-10',
    dueDate: '2026-08-12',
    quoteAmount: 48500,
    materialsUsed: [
      { itemId: 'inv-101', name: 'Mahogany Timber Planks', quantity: 180, unitCost: 45, totalCost: 8100 },
      { itemId: 'inv-104', name: 'Polyurethane High-Gloss Varnish', quantity: 12, unitCost: 35, totalCost: 420 },
      { itemId: 'inv-106', name: 'PVA Wood Glue', quantity: 5, unitCost: 28, totalCost: 140 },
    ],
    laborCost: 6500,
    otherCosts: 1200,
    payments: [
      { id: 'pay-401', amount: 25000, date: '2026-07-10', method: 'Bank Transfer', note: '50% Initial deposit payment', referenceId: 'REF-BANK-8821' },
      { id: 'pay-402', amount: 10000, date: '2026-08-02', method: 'Bank Transfer', note: 'Milestone payment upon framework completion', referenceId: 'REF-BANK-9012' }
    ]
  },
  {
    id: 'job-302',
    customerId: 'cust-202',
    customerName: 'Freetown Grand Hotel & Suites',
    title: 'Solid Oak Entrance Doors & Paneling (Set of 12)',
    description: 'Acoustic soundproof oak entrance doors for executive hotel suites with antique hinges.',
    quantity: 12,
    assignedEmployees: ['emp-04', 'emp-05'],
    status: 'In Progress',
    startDate: '2026-07-18',
    dueDate: '2026-08-20',
    quoteAmount: 62000,
    materialsUsed: [
      { itemId: 'inv-102', name: 'Oak Hardwood Beams', quantity: 200, unitCost: 65, totalCost: 13000 },
      { itemId: 'inv-105', name: 'Stainless Steel Hinges', quantity: 48, unitCost: 12, totalCost: 576 },
    ],
    laborCost: 8200,
    otherCosts: 1800,
    payments: [
      { id: 'pay-403', amount: 31000, date: '2026-07-18', method: 'Bank Transfer', note: 'Initial deposit', referenceId: 'REF-HOTEL-104' }
    ]
  },
  {
    id: 'job-303',
    customerId: 'cust-205',
    customerName: 'Makeni Educational Complex',
    title: 'Heavy Duty Wooden Classroom Student Desks (50 Units)',
    description: 'Durable teak plywood classroom desks and bench seats for secondary school block.',
    quantity: 50,
    assignedEmployees: ['emp-04'],
    status: 'Completed',
    startDate: '2026-06-01',
    dueDate: '2026-07-25',
    quoteAmount: 38000,
    materialsUsed: [
      { itemId: 'inv-103', name: 'Teak Marine Plywood', quantity: 35, unitCost: 180, totalCost: 6300 },
      { itemId: 'inv-108', name: 'Softwood Framing Timber', quantity: 300, unitCost: 22, totalCost: 6600 }
    ],
    laborCost: 5400,
    otherCosts: 800,
    payments: [
      { id: 'pay-404', amount: 20000, date: '2026-06-02', method: 'Check', note: 'Advance check deposit' },
      { id: 'pay-405', amount: 18000, date: '2026-07-28', method: 'Bank Transfer', note: 'Final settlement payment upon delivery' }
    ]
  },
  {
    id: 'job-304',
    customerId: 'cust-204',
    customerName: 'Lumley Bay Beach Resort',
    title: 'Outdoor Teak Restaurant Tables & Deck Benches',
    description: 'Weather-resistant teak outdoor furniture with UV-resistant sealer coating.',
    quantity: 15,
    assignedEmployees: ['emp-04', 'emp-06'],
    status: 'Delivered',
    startDate: '2026-05-10',
    dueDate: '2026-06-30',
    quoteAmount: 29500,
    materialsUsed: [
      { itemId: 'inv-103', name: 'Teak Marine Plywood', quantity: 20, unitCost: 180, totalCost: 3600 },
      { itemId: 'inv-104', name: 'Polyurethane High-Gloss Varnish', quantity: 15, unitCost: 35, totalCost: 525 }
    ],
    laborCost: 4200,
    otherCosts: 600,
    payments: [
      { id: 'pay-406', amount: 29500, date: '2026-07-02', method: 'Mobile Money', note: 'Full invoice cleared' }
    ]
  }
];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [
  { id: 'itrans-501', itemId: 'inv-101', itemName: 'Mahogany Timber Planks', type: 'INWARDS', quantity: 500, unitCost: 45, totalValue: 22500, date: '2026-07-01', purpose: 'Bulk lumber shipment arrival' },
  { id: 'itrans-502', itemId: 'inv-101', itemName: 'Mahogany Timber Planks', type: 'OUTWARDS', quantity: 180, unitCost: 45, totalValue: 8100, date: '2026-07-12', purpose: 'Allocated for Job job-301 Sierra Mining Table', referenceId: 'job-301' },
  { id: 'itrans-503', itemId: 'inv-102', itemName: 'Oak Hardwood Beams', type: 'INWARDS', quantity: 350, unitCost: 65, totalValue: 22750, date: '2026-07-05', purpose: 'Warehouse oak timber restock' },
  { id: 'itrans-504', itemId: 'inv-102', itemName: 'Oak Hardwood Beams', type: 'OUTWARDS', quantity: 200, unitCost: 65, totalValue: 13000, date: '2026-07-20', purpose: 'Allocated for Job job-302 Freetown Grand Hotel Doors', referenceId: 'job-302' },
  { id: 'itrans-505', itemId: 'inv-103', itemName: 'Teak Marine Plywood', type: 'INWARDS', quantity: 100, unitCost: 180, totalValue: 18000, date: '2026-08-01', purpose: 'New plywood shipment received' },
];

export const INITIAL_FINANCIALS: FinancialTransaction[] = [
  { id: 'fin-601', type: 'INCOME', category: 'Job Payment', amount: 25000, date: '2026-07-10', description: 'Sierra Mining Corp Boardroom Table initial deposit', referenceId: 'job-301' },
  { id: 'fin-602', type: 'INCOME', category: 'Job Payment', amount: 31000, date: '2026-07-18', description: 'Freetown Grand Hotel doors deposit', referenceId: 'job-302' },
  { id: 'fin-603', type: 'EXPENDITURE', category: 'Material Purchase', amount: 22500, date: '2026-07-01', description: 'Mahogany Timber Planks bulk restock purchase' },
  { id: 'fin-604', type: 'EXPENDITURE', category: 'Employee Wages', amount: 38800, date: '2026-07-31', description: 'July staff payroll payout' },
  { id: 'fin-605', type: 'INCOME', category: 'Job Payment', amount: 10000, date: '2026-08-02', description: 'Sierra Mining Corp milestone payment', referenceId: 'job-301' },
  { id: 'fin-606', type: 'INCOME', category: 'Scrap wood sale', amount: 3400, date: '2026-08-04', description: 'Sale of offcut mahogany scrap wood to local artisan' },
  { id: 'fin-607', type: 'EXPENDITURE', category: 'Utilities', amount: 2800, date: '2026-08-05', description: 'Workshop power generator diesel & electricity bill' },
];

export const INITIAL_DAILY_WORK_LOGS: DailyWorkLog[] = [
  { id: 'log-701', employeeId: 'emp-04', employeeName: 'Ibrahim Bangura', jobId: 'job-301', jobTitle: 'Executive Mahogany Boardroom Table', date: '2026-08-04', timeStarted: '08:00', timeEnd: '17:00', location: 'Main Workshop Station A', comment: 'Completed joinery and surface alignment for 16-seater mahogany table.' },
  { id: 'log-702', employeeId: 'emp-05', employeeName: 'Alimamy Kamara', jobId: 'job-301', jobTitle: 'Executive Mahogany Boardroom Table', date: '2026-08-04', timeStarted: '08:30', timeEnd: '16:30', location: 'Carving Studio', comment: 'Finished hand-carving decorative edge bevels on executive table top.' },
  { id: 'log-703', employeeId: 'emp-06', employeeName: 'Mariama Koroma', jobId: 'job-301', jobTitle: 'Executive Mahogany Boardroom Table', date: '2026-08-05', timeStarted: '08:00', timeEnd: '14:30', location: 'Polishing Bay 2', comment: 'Applied 2nd coat of polyurethane high-gloss sealant. Drying in progress.' },
  { id: 'log-704', employeeId: 'emp-04', employeeName: 'Ibrahim Bangura', jobId: 'job-302', jobTitle: 'Solid Oak Entrance Doors', date: '2026-08-05', timeStarted: '08:30', timeEnd: '16:00', location: 'Assembly Hall', comment: 'Mounted stainless steel acoustic hinges on 4 hotel door frames.' },
];

export const INITIAL_REGISTRATION_REQUESTS: RegistrationRequest[] = [
  { id: 'reg-801', name: 'Sorie Conteh', email: 'sorie.c@gmail.com', phone: '+232 76 999 111', role: 'Carpenter', status: 'Pending', requestDate: '2026-08-03' },
  { id: 'reg-802', name: 'Kadiatu Turay', email: 'kadiatu.t@gmail.com', phone: '+232 88 444 222', role: 'Sander', status: 'Pending', requestDate: '2026-08-04' }
];

export const INITIAL_WARNING_LETTERS: WarningLetter[] = [
  { id: 'warn-901', employeeId: 'emp-04', employeeName: 'Ibrahim Bangura', date: '2026-07-15', type: 'Safety', reason: 'Failed to wear safety eye protection goggles during CNC router operations.', severity: 'Low', issuedBy: 'Mr Paul Bindi' }
];

export const INITIAL_SAVED_INVOICES: SavedInvoice[] = [
  {
    id: 'inv-doc-1001',
    jobId: 'job-301',
    invoiceNo: 'INV-2026-08-001',
    date: '2026-08-05',
    terms: '50% Deposit Paid, Balance due upon final installation',
    customerName: 'Sierra Mining Corporation',
    customerAddress: '14 Wilberforce Street, Freetown',
    customerPhone: '+232 78 555 101',
    customerEmail: 'procurement@sierramining.sl',
    customerMessage: 'Thank you for choosing Swedswood Enterprise for your executive mahogany boardroom table.',
    preparedBy: 'Mr Paul Bindi (Admin)',
    template: 'SWEDS_WOOD',
    status: 'Issued',
    subtotal: 48500,
    createdAt: '2026-08-05',
    lastUpdated: '2026-08-05',
    items: [
      { id: 'item-1', description: 'Handcrafted Executive Mahogany Boardroom Table (16 Seater)', unitRate: '48,500', amount: 48500, quantity: 1, unitPrice: 48500 }
    ]
  }
];
