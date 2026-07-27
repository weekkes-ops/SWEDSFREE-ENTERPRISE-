import { InventoryItem, InventoryTransaction, Customer, Employee, Job, FinancialTransaction, DailyWorkLog } from './types';

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-01',
    name: 'Sierra Leone Red Mahogany Planks',
    category: 'Lumber',
    unit: 'Board Feet',
    currentStock: 450,
    minStockThreshold: 100,
    unitCost: 45,
    lastUpdated: '2026-07-20'
  },
  {
    id: 'inv-02',
    name: 'Teak Hardwood Boards',
    category: 'Lumber',
    unit: 'Board Feet',
    currentStock: 320,
    minStockThreshold: 80,
    unitCost: 65,
    lastUpdated: '2026-07-22'
  },
  {
    id: 'inv-03',
    name: 'High-Grade Birch Plywood 18mm',
    category: 'Plywood',
    unit: 'Sheets',
    currentStock: 85,
    minStockThreshold: 20,
    unitCost: 180,
    lastUpdated: '2026-07-21'
  },
  {
    id: 'inv-04',
    name: 'Heavy Duty Brass Cabinet Hinges',
    category: 'Hardware',
    unit: 'Pieces',
    currentStock: 240,
    minStockThreshold: 50,
    unitCost: 12,
    lastUpdated: '2026-07-18'
  },
  {
    id: 'inv-05',
    name: 'Polyurethane Wood Varnish - Gloss',
    category: 'Finishes',
    unit: 'Liters',
    currentStock: 40,
    minStockThreshold: 15,
    unitCost: 85,
    lastUpdated: '2026-07-23'
  },
  {
    id: 'inv-06',
    name: 'Industrial Wood Adhesive D3',
    category: 'Adhesives',
    unit: 'Liters',
    currentStock: 30,
    minStockThreshold: 10,
    unitCost: 55,
    lastUpdated: '2026-07-20'
  },
  {
    id: 'inv-07',
    name: 'Stainless Steel Drawer Runners 500mm',
    category: 'Hardware',
    unit: 'Pieces',
    currentStock: 120,
    minStockThreshold: 30,
    unitCost: 25,
    lastUpdated: '2026-07-19'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-shalomville',
    name: 'Shalomville',
    company: 'Shalomville Estates & Development',
    phone: '+232 78 555 999',
    email: 'info@shalomville.sl',
    address: 'Shalomville Estate, Regent-Grafton Highway, Freetown, Sierra Leone',
    notes: 'Key estate developer. Custom mahogany entrance doors, fitted teak kitchen cabinetry, and luxury wardrobe suites.',
    registrationDate: '2026-07-24'
  },
  {
    id: 'cust-salia',
    name: 'Mr Mohamed Salia',
    company: 'Salia Enterprises & Investments',
    phone: '+232 77 888 222',
    email: 'm.salia@saliaenterprises.sl',
    address: '14 Wilkinson Road, Freetown, Sierra Leone',
    notes: 'Executive residential account. Solid red mahogany dining set, executive office pedestal desk, and credenza.',
    registrationDate: '2026-07-24'
  },
  {
    id: 'cust-01',
    name: 'Paramount Hotel Freetown',
    company: 'Paramount Hospitality Group',
    phone: '+232 76 543 210',
    email: 'procurement@paramounthotel.sl',
    address: 'Tower Hill, Freetown, Sierra Leone',
    notes: 'Key hospitality account. Prefers hand-finished red mahogany.',
    registrationDate: '2026-01-15'
  },
  {
    id: 'cust-02',
    name: 'Sierra Rutile Housing Corp',
    company: 'Sierra Rutile Ltd',
    phone: '+232 78 876 543',
    email: 'bio.a@sierrarutile.com',
    address: 'Spur Road, Freetown, Sierra Leone',
    notes: 'Executive residential estate furnishings.',
    registrationDate: '2026-02-10'
  },
  {
    id: 'cust-03',
    name: 'Dr. Kelfala Janneh',
    company: 'Freetown Medical Practice',
    phone: '+232 77 123 456',
    email: 'kjanneh@freetownclinic.sl',
    address: 'Hill Station, Freetown, Sierra Leone',
    notes: 'Private home library custom shelving and desk.',
    registrationDate: '2026-03-04'
  },
  {
    id: 'cust-04',
    name: 'West Africa Bank Executive Office',
    company: 'West Africa Bank SL',
    phone: '+232 76 999 111',
    email: 'admin@wabank.sl',
    address: 'Siaka Stevens Street, Freetown, Sierra Leone',
    notes: 'Corporate office partition & teak counter fittings.',
    registrationDate: '2026-04-18'
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-01',
    name: 'Mohamed Kamara',
    role: 'Admin',
    phone: '+232 76 111 2222',
    email: 'mohamed.kamara@swedsfree.com',
    status: 'Active',
    baseSalary: 9500,
    dailyRate: 350,
    hireDate: '2024-01-10',
    password: 'admin',
  },
  {
    id: 'emp-02',
    name: 'Samuel Bangura',
    role: 'Manager',
    phone: '+232 78 333 4444',
    email: 'samuel.b@swedsfree.com',
    status: 'Active',
    baseSalary: 7500,
    dailyRate: 280,
    hireDate: '2024-03-15',
    password: 'manager',
  },
  {
    id: 'emp-03',
    name: 'Augustine Sesay',
    role: 'Carpenter',
    phone: '+232 77 555 6666',
    email: 'augustine.s@swedsfree.com',
    status: 'Active',
    baseSalary: 5200,
    dailyRate: 200,
    hireDate: '2024-06-01',
    password: '1234',
  },
  {
    id: 'emp-04',
    name: 'Fatmata Koroma',
    role: 'Designer',
    phone: '+232 76 777 8888',
    email: 'fatmata.k@swedsfree.com',
    status: 'Active',
    baseSalary: 5800,
    dailyRate: 220,
    hireDate: '2025-01-20',
    password: '1234',
  },
  {
    id: 'emp-05',
    name: 'Ibrahim Mansaray',
    role: 'Polisher',
    phone: '+232 79 999 0000',
    email: 'ibrahim.m@swedsfree.com',
    status: 'Active',
    baseSalary: 4800,
    dailyRate: 180,
    hireDate: '2025-02-10',
    password: '1234',
  },
  {
    id: 'emp-06',
    name: 'Sahr Conteh',
    role: 'Sander',
    phone: '+232 78 222 3333',
    email: 'sahr.c@swedsfree.com',
    status: 'Active',
    baseSalary: 4500,
    dailyRate: 170,
    hireDate: '2025-03-01',
    password: '1234',
  },
  {
    id: 'emp-07',
    name: 'Hassan Turay',
    role: 'Auditor',
    phone: '+232 76 444 5555',
    email: 'hassan.t@swedsfree.com',
    status: 'Active',
    baseSalary: 6500,
    dailyRate: 250,
    hireDate: '2025-04-12',
    password: 'audit',
  }
];

export const INITIAL_JOBS: Job[] = [
  {
    id: 'JOB-2026-004',
    customerId: 'cust-shalomville',
    customerName: 'Shalomville',
    title: 'Shalomville Estate Teak Kitchen Cabinets & Doors',
    description: 'Design, fabrication, and installation of 12 sets of solid Sierra Leone teak kitchen cabinets, fitted wardrobes, and hand-carved mahogany entrance doors for Shalomville Estate residences.',
    quantity: 12,
    items: [
      { id: 'item-sv-01', description: 'Solid Sierra Leone Teak Kitchen Cabinet Units', quantity: 12, unitCost: 8000, totalCost: 96000 },
      { id: 'item-sv-02', description: 'Fitted Double-Door Wardrobes with Teak Veneer Finish', quantity: 6, unitCost: 5000, totalCost: 30000 },
      { id: 'item-sv-03', description: 'Hand-Carved Solid Mahogany Entrance Doors', quantity: 4, unitCost: 4750, totalCost: 19000 }
    ],
    assignedEmployees: ['emp-03', 'emp-04', 'emp-05'],
    status: 'In Progress',
    startDate: '2026-07-24',
    dueDate: '2026-08-30',
    quoteAmount: 145000,
    laborCost: 22000,
    otherCosts: 4500,
    materialsUsed: [
      { itemId: 'inv-02', name: 'Teak Hardwood Boards', quantity: 150, unitCost: 65, totalCost: 9750 },
      { itemId: 'inv-03', name: 'High-Grade Birch Plywood 18mm', quantity: 20, unitCost: 180, totalCost: 3600 },
      { itemId: 'inv-05', name: 'Polyurethane Wood Varnish - Gloss', quantity: 10, unitCost: 85, totalCost: 850 }
    ],
    payments: [
      { id: 'pay-sv-01', amount: 72500, date: '2026-07-24', method: 'Bank Transfer', note: '50% Commitment Advance Deposit' }
    ]
  },
  {
    id: 'JOB-2026-005',
    customerId: 'cust-salia',
    customerName: 'Mr Mohamed Salia',
    title: 'Executive Mahogany Office Desk & Dining Suite',
    description: 'Hand-finished executive red mahogany pedestal desk with leather inlay top, matching credenza, and 8-seater solid mahogany dining table with carved chairs.',
    quantity: 1,
    items: [
      { id: 'item-ms-01', description: 'Executive Red Mahogany Pedestal Desk with Leather Inlay Top', quantity: 1, unitCost: 45000, totalCost: 45000 },
      { id: 'item-ms-02', description: 'Matching Mahogany Credenza & 3-Drawer Filing Cabinet Unit', quantity: 1, unitCost: 23000, totalCost: 23000 },
      { id: 'item-ms-03', description: '8-Seater Solid Mahogany Dining Table with Carved Chairs', quantity: 1, unitCost: 30000, totalCost: 30000 }
    ],
    assignedEmployees: ['emp-03', 'emp-06'],
    status: 'Ready for Polishing',
    startDate: '2026-07-24',
    dueDate: '2026-08-20',
    quoteAmount: 98000,
    laborCost: 14000,
    otherCosts: 2800,
    materialsUsed: [
      { itemId: 'inv-01', name: 'Sierra Leone Red Mahogany Planks', quantity: 110, unitCost: 45, totalCost: 4950 },
      { itemId: 'inv-04', name: 'Heavy Duty Brass Cabinet Hinges', quantity: 24, unitCost: 12, totalCost: 288 }
    ],
    payments: [
      { id: 'pay-salia-01', amount: 49000, date: '2026-07-24', method: 'Bank Transfer', note: '50% Advance Commitment Deposit' },
      { id: 'pay-salia-02', amount: 25000, date: '2026-07-25', method: 'Cash', note: 'Milestone Progress Payment' }
    ]
  },
  {
    id: 'JOB-2026-001',
    customerId: 'cust-01',
    customerName: 'Paramount Hotel Freetown',
    title: 'Custom Mahogany Boardroom Table & 12 Chairs',
    description: 'Hand-carved 14ft solid Sierra Leone mahogany executive boardroom table with matching brass-inlaid leather chairs.',
    quantity: 1,
    items: [
      { id: 'item-ph-01', description: '14ft Solid Sierra Leone Mahogany Executive Boardroom Table', quantity: 1, unitCost: 65000, totalCost: 65000 },
      { id: 'item-ph-02', description: 'Matching Executive Leather Boardroom Chairs with Carved Mahogany Legs', quantity: 12, unitCost: 3500, totalCost: 42000 },
      { id: 'item-ph-03', description: 'Matching Wall-Mounted Mahogany Presentation Screen Frame & Credenza', quantity: 1, unitCost: 18000, totalCost: 18000 }
    ],
    assignedEmployees: ['emp-03', 'emp-04', 'emp-05'],
    status: 'In Progress',
    startDate: '2026-07-01',
    dueDate: '2026-08-15',
    quoteAmount: 125000,
    laborCost: 18000,
    otherCosts: 3500,
    materialsUsed: [
      { itemId: 'inv-01', name: 'Sierra Leone Red Mahogany Planks', quantity: 180, unitCost: 45, totalCost: 8100 },
      { itemId: 'inv-05', name: 'Polyurethane Wood Varnish - Gloss', quantity: 8, unitCost: 85, totalCost: 680 },
      { itemId: 'inv-06', name: 'Industrial Wood Adhesive D3', quantity: 5, unitCost: 55, totalCost: 275 }
    ],
    payments: [
      { id: 'pay-01', amount: 62500, date: '2026-07-01', method: 'Bank Transfer', note: '50% Initial Commitment Deposit' }
    ]
  },
  {
    id: 'JOB-2026-002',
    customerId: 'cust-02',
    customerName: 'Sierra Rutile Housing Corp',
    title: 'Executive Teak Bedroom Wardrobe Sets',
    description: 'Full teak fitted double wardrobe with integrated soft-close drawers and mirror panels.',
    assignedEmployees: ['emp-03', 'emp-06'],
    status: 'Ready for Polishing',
    startDate: '2026-07-05',
    dueDate: '2026-07-30',
    quoteAmount: 85000,
    laborCost: 12000,
    otherCosts: 2000,
    materialsUsed: [
      { itemId: 'inv-02', name: 'Teak Hardwood Boards', quantity: 120, unitCost: 65, totalCost: 7800 },
      { itemId: 'inv-03', name: 'High-Grade Birch Plywood 18mm', quantity: 15, unitCost: 180, totalCost: 2700 },
      { itemId: 'inv-07', name: 'Stainless Steel Drawer Runners 500mm', quantity: 24, unitCost: 25, totalCost: 600 }
    ],
    payments: [
      { id: 'pay-02', amount: 42500, date: '2026-07-05', method: 'Check', note: '50% Advance Payment' },
      { id: 'pay-03', amount: 20000, date: '2026-07-20', method: 'Bank Transfer', note: 'Milestone Progress Payment' }
    ]
  },
  {
    id: 'JOB-2026-003',
    customerId: 'cust-03',
    customerName: 'Dr. Kelfala Janneh',
    title: 'Custom Hardwood Bookshelf & Study Desk',
    description: 'Floor-to-ceiling teak wood library shelving with built-in LED track lighting grooves and ergonomic study desk.',
    assignedEmployees: ['emp-04', 'emp-05'],
    status: 'Completed',
    startDate: '2026-06-10',
    dueDate: '2026-07-15',
    quoteAmount: 48000,
    laborCost: 7500,
    otherCosts: 1200,
    materialsUsed: [
      { itemId: 'inv-02', name: 'Teak Hardwood Boards', quantity: 80, unitCost: 65, totalCost: 5200 },
      { itemId: 'inv-04', name: 'Heavy Duty Brass Cabinet Hinges', quantity: 32, unitCost: 12, totalCost: 384 }
    ],
    payments: [
      { id: 'pay-04', amount: 24000, date: '2026-06-10', method: 'Cash', note: 'Deposit' },
      { id: 'pay-05', amount: 24000, date: '2026-07-16', method: 'Cash', note: 'Final Balance Settlement' }
    ]
  }
];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'itx-01',
    itemId: 'inv-01',
    itemName: 'Sierra Leone Red Mahogany Planks',
    type: 'INWARDS',
    quantity: 300,
    unitCost: 45,
    totalValue: 13500,
    date: '2026-07-02',
    purpose: 'Restock timber stock from Kissy sawmill vendor',
    referenceId: 'PO-9021'
  },
  {
    id: 'itx-02',
    itemId: 'inv-01',
    itemName: 'Sierra Leone Red Mahogany Planks',
    type: 'OUTWARDS',
    quantity: 180,
    unitCost: 45,
    totalValue: 8100,
    date: '2026-07-04',
    purpose: 'Allocated timber to Paramount Hotel Boardroom Table',
    referenceId: 'JOB-2026-001'
  }
];

export const INITIAL_FINANCIALS: FinancialTransaction[] = [
  {
    id: 'fin-sv-01',
    type: 'INCOME',
    category: 'Job Payment',
    amount: 72500,
    date: '2026-07-24',
    description: 'Deposit for Shalomville Estate Teak Kitchen Cabinets & Doors (JOB-2026-004)',
    referenceId: 'JOB-2026-004'
  },
  {
    id: 'fin-salia-01',
    type: 'INCOME',
    category: 'Job Payment',
    amount: 49000,
    date: '2026-07-24',
    description: 'Advance Deposit for Executive Mahogany Office Desk & Dining Suite (JOB-2026-005)',
    referenceId: 'JOB-2026-005'
  },
  {
    id: 'fin-salia-02',
    type: 'INCOME',
    category: 'Job Payment',
    amount: 25000,
    date: '2026-07-25',
    description: 'Milestone Progress Payment received from Mr Mohamed Salia (JOB-2026-005)',
    referenceId: 'JOB-2026-005'
  },
  {
    id: 'fin-01',
    type: 'INCOME',
    category: 'Job Payment',
    amount: 62500,
    date: '2026-07-01',
    description: 'Deposit for Paramount Hotel Boardroom Table (JOB-2026-001)',
    referenceId: 'JOB-2026-001'
  },
  {
    id: 'fin-02',
    type: 'EXPENDITURE',
    category: 'Material Purchase',
    amount: 15400,
    date: '2026-07-03',
    description: 'Purchase of 300 Board Feet Sierra Leone Red Mahogany planks',
    referenceId: 'PO-9021'
  },
  {
    id: 'fin-03',
    type: 'INCOME',
    category: 'Job Payment',
    amount: 42500,
    date: '2026-07-05',
    description: 'Advance Payment for Sierra Rutile Wardrobes (JOB-2026-002)',
    referenceId: 'JOB-2026-002'
  },
  {
    id: 'fin-04',
    type: 'EXPENDITURE',
    category: 'Employee Wages',
    amount: 19000,
    date: '2026-07-15',
    description: 'Bi-weekly payroll distribution for workshop artisans and staff',
    referenceId: 'PAY-2026-07A'
  },
  {
    id: 'fin-05',
    type: 'INCOME',
    category: 'Job Payment',
    amount: 24000,
    date: '2026-07-16',
    description: 'Final payment received from Dr. Kelfala Janneh (JOB-2026-003)',
    referenceId: 'JOB-2026-003'
  },
  {
    id: 'fin-06',
    type: 'EXPENDITURE',
    category: 'Rent',
    amount: 8000,
    date: '2026-07-01',
    description: 'Monthly workshop premises lease payment (Kissy Dockyard)',
    referenceId: 'RENT-07'
  }
];

export const INITIAL_DAILY_WORK_LOGS: DailyWorkLog[] = [
  {
    id: 'log-103',
    employeeId: 'emp-03',
    employeeName: 'Augustine Sesay',
    jobId: 'JOB-2026-004',
    jobTitle: 'Shalomville Estate Teak Kitchen Cabinets & Doors',
    date: '2026-07-24',
    timeStarted: '08:00',
    timeEnd: '17:30',
    location: 'Shalomville Estate Site Bay 2',
    comment: 'Started frame assembling for Shalomville teak kitchen cabinet units and mahogany entrance doors.'
  },
  {
    id: 'log-104',
    employeeId: 'emp-06',
    employeeName: 'Sahr Conteh',
    jobId: 'JOB-2026-005',
    jobTitle: 'Executive Mahogany Office Desk & Dining Suite',
    date: '2026-07-25',
    timeStarted: '08:15',
    timeEnd: '16:45',
    location: 'Main Workshop Polishing Section',
    comment: 'Sanding and surface smoothing completed for Mr Mohamed Salia executive mahogany desk top.'
  },
  {
    id: 'log-101',
    employeeId: 'emp-03',
    employeeName: 'Augustine Sesay',
    jobId: 'JOB-2026-001',
    jobTitle: 'Custom Mahogany Boardroom Table',
    date: '2026-07-23',
    timeStarted: '08:00',
    timeEnd: '17:00',
    location: 'Main Workshop Bays',
    comment: 'Completed precision edge planing and mortise joint fitting for 14ft conference table top.'
  },
  {
    id: 'log-102',
    employeeId: 'emp-05',
    employeeName: 'Ibrahim Mansaray',
    jobId: 'JOB-2026-002',
    jobTitle: 'Executive Teak Bedroom Wardrobe Sets',
    date: '2026-07-23',
    timeStarted: '08:30',
    timeEnd: '16:30',
    location: 'Finishing & Polishing Spray Booth',
    comment: 'Applied 2nd seal coat of polyurethane gloss varnish to teak wardrobe doors.'
  }
];
