import {
  User, Vehicle, Retailer, Driver, Distributor,
  Product, Order, Payment, DistributorLedger,
  FuelEntry, VehicleExpense, AuditLog, Notification, AppSettings,
  LoadingRecord
} from '../types';

const STORAGE_PREFIX = 'milkdesk_';

export interface DatabaseSchema {
  users: User[];
  vehicles: Vehicle[];
  retailers: Retailer[];
  drivers: Driver[];
  distributors: Distributor[];
  products: Product[];
  orders: Order[];
  payments: Payment[];
  distributorLedgers: DistributorLedger[];
  fuelEntries: FuelEntry[];
  vehicleExpenses: VehicleExpense[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  settings: AppSettings;
  loadingRecords: LoadingRecord[];
}

// Utility to get today's date formatted as YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format previous date string
export function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p_gold1l', name: 'Gold Milk 1L', shortName: 'Gold 1L', group: 'Milk', unit: 'Litre', defaultPrice: 66, displayPosition: 1, active: true },
  { id: 'p_gold6l', name: 'Gold Milk 6L', shortName: 'Gold 6L', group: 'Milk', unit: 'Litre', defaultPrice: 390, displayPosition: 2, active: true },
  { id: 'p_taja', name: 'Taja Milk 1L', shortName: 'Taja', group: 'Milk', unit: 'Litre', defaultPrice: 54, displayPosition: 3, active: true },
  { id: 'p_cow', name: 'Cow Milk 1L', shortName: 'Cow', group: 'Milk', unit: 'Litre', defaultPrice: 56, displayPosition: 4, active: true },
  { id: 'p_dahi5', name: 'Dahi 5 KG Matka', shortName: 'Dahi 5K', group: 'Dahi', unit: 'Matka', defaultPrice: 350, displayPosition: 5, active: true },
  { id: 'p_dahi15', name: 'Dahi 15 KG Matka', shortName: 'Dahi 15K', group: 'Dahi', unit: 'Matka', defaultPrice: 950, displayPosition: 6, active: true },
  { id: 'p_paneer', name: 'Paneer Box 1 KG', shortName: 'Paneer', group: 'Paneer', unit: 'Box', defaultPrice: 420, displayPosition: 7, active: true },
  { id: 'p_c', name: 'Chhachh 500ml', shortName: 'C', group: 'Chhachh', unit: 'Packet', defaultPrice: 15, displayPosition: 8, active: true },
  { id: 'p_m', name: 'Masala Chhachh', shortName: 'M', group: 'Chhachh', unit: 'Packet', defaultPrice: 18, displayPosition: 9, active: true },
];

export const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'veh_1', name: 'Vehicle 1', registrationNumber: 'RJ-14-GA-1024', driverId: 'drv_1', active: true, notes: 'Main city route' },
  { id: 'veh_2', name: 'Vehicle 2', registrationNumber: 'RJ-14-GB-3310', driverId: 'drv_2', active: true, notes: 'Suburbs morning delivery' },
  { id: 'veh_3', name: 'Big Truck 1', registrationNumber: 'RJ-14-TC-8890', driverId: null, active: true, notes: 'Plant to Hub trunk line' },
];

export const INITIAL_DRIVERS: Driver[] = [
  { id: 'drv_1', name: 'Suresh Kumar', code: 'DRV01', phone: '9829012345', assignedVehicleId: 'veh_1', canCollectPayment: true, active: true },
  { id: 'drv_2', name: 'Vikram Singh', code: 'DRV02', phone: '9829098765', assignedVehicleId: 'veh_2', canCollectPayment: false, active: true },
];

export const INITIAL_RETAILERS: Retailer[] = [
  // Vehicle 1 Retailers (Ordered serial 1, 2, 3, 4, 5)
  { id: 'ret_1', vehicleId: 'veh_1', serialNumber: 1, name: 'Ramesh Dairy', phone: '9829100001', balanceDue: 4500, customPrices: {}, active: true, createdAt: '2026-08-01' },
  { id: 'ret_2', vehicleId: 'veh_1', serialNumber: 2, name: 'Kamal Milk Point', phone: '9829100002', balanceDue: 2800, customPrices: {}, active: true, createdAt: '2026-08-01' },
  { id: 'ret_3', vehicleId: 'veh_1', serialNumber: 3, name: 'Rajesh Store', phone: '9829100003', balanceDue: 6100, customPrices: {}, active: true, createdAt: '2026-08-01' },
  { id: 'ret_4', vehicleId: 'veh_1', serialNumber: 4, name: 'Mohan Dairy', phone: '9829100004', balanceDue: 1500, customPrices: { 'p_gold1l': 68 }, active: true, createdAt: '2026-08-01' },
  { id: 'ret_5', vehicleId: 'veh_1', serialNumber: 5, name: 'Sharma Sweets', phone: '9829100005', balanceDue: 3200, customPrices: {}, active: true, createdAt: '2026-08-01' },

  // Vehicle 2 Retailers (Ordered serial 1, 2, 3)
  { id: 'ret_6', vehicleId: 'veh_2', serialNumber: 1, name: 'Anand Provision', phone: '9829200001', balanceDue: 1200, customPrices: {}, active: true, createdAt: '2026-08-05' },
  { id: 'ret_7', vehicleId: 'veh_2', serialNumber: 2, name: 'Gopal Dairy Booth', phone: '9829200002', balanceDue: 3900, customPrices: {}, active: true, createdAt: '2026-08-05' },
  { id: 'ret_8', vehicleId: 'veh_2', serialNumber: 3, name: 'Pooja Milk Center', phone: '9829200003', balanceDue: 500, customPrices: {}, active: true, createdAt: '2026-08-05' },
];

export const INITIAL_DISTRIBUTORS: Distributor[] = [
  { id: 'dist_1', name: 'Kisan Milk Plant', code: 'DIS01', phone: '9829300001', active: true, createdAt: '2026-07-01' },
  { id: 'dist_2', name: 'Vrindavan Agro Transporters', code: 'DIS02', phone: '9829300002', active: true, createdAt: '2026-07-15' },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin',
    code: 'ADM01',
    password: 'admin',
    role: 'admin',
    name: 'Prem (Admin / Owner)',
    phone: '9829000000',
    isSuperAdmin: true,
    active: true,
    createdAt: '2026-01-01',
    permissions: {
      orders: true, payments: true, retailers: true, products: true,
      vehicles: true, drivers: true, distributors: true, reports: true,
      userManagement: true, deleteRecords: true
    }
  },
  {
    id: 'usr_ret1',
    code: 'RET01',
    password: '123',
    role: 'retailer',
    name: 'Ramesh Dairy',
    phone: '9829100001',
    retailerId: 'ret_1',
    active: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'usr_ret2',
    code: 'RET02',
    password: '123',
    role: 'retailer',
    name: 'Kamal Milk Point',
    phone: '9829100002',
    retailerId: 'ret_2',
    active: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'usr_ret3',
    code: 'RET03',
    password: '123',
    role: 'retailer',
    name: 'Rajesh Store',
    phone: '9829100003',
    retailerId: 'ret_3',
    active: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'usr_ret4',
    code: 'RET04',
    password: '123',
    role: 'retailer',
    name: 'Mohan Dairy',
    phone: '9829100004',
    retailerId: 'ret_4',
    active: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'usr_ret5',
    code: 'RET05',
    password: '123',
    role: 'retailer',
    name: 'Sharma Sweets',
    phone: '9829100005',
    retailerId: 'ret_5',
    active: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'usr_ret6',
    code: 'RET06',
    password: '123',
    role: 'retailer',
    name: 'Anand Provision',
    phone: '9829200001',
    retailerId: 'ret_6',
    active: true,
    createdAt: '2026-08-05'
  },
  {
    id: 'usr_ret7',
    code: 'RET07',
    password: '123',
    role: 'retailer',
    name: 'Gopal Dairy Booth',
    phone: '9829200002',
    retailerId: 'ret_7',
    active: true,
    createdAt: '2026-08-05'
  },
  {
    id: 'usr_ret8',
    code: 'RET08',
    password: '123',
    role: 'retailer',
    name: 'Pooja Milk Center',
    phone: '9829200003',
    retailerId: 'ret_8',
    active: true,
    createdAt: '2026-08-05'
  },
  {
    id: 'usr_drv1',
    code: 'DRV01',
    password: '123',
    role: 'driver',
    name: 'Suresh Kumar',
    phone: '9829012345',
    driverId: 'drv_1',
    active: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'usr_drv2',
    code: 'DRV02',
    password: '123',
    role: 'driver',
    name: 'Vikram Singh',
    phone: '9829098765',
    driverId: 'drv_2',
    active: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'usr_dist1',
    code: 'DIS01',
    password: '123',
    role: 'distributor',
    name: 'Kisan Milk Plant',
    phone: '9829300001',
    distributorId: 'dist_1',
    active: true,
    createdAt: '2026-07-01'
  },
  {
    id: 'usr_dist2',
    code: 'DIS02',
    password: '123',
    role: 'distributor',
    name: 'Vrindavan Agro Transporters',
    phone: '9829300002',
    distributorId: 'dist_2',
    active: true,
    createdAt: '2026-07-15'
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  businessName: 'MilkDesk Dairy Distribution',
  phone: '+91 98290 00000',
  address: 'Shop 14-16, Milk Mandi, Transport Nagar',
  currencySymbol: '₹',
  defaultShift: 'morning',
};

// Generate realistic today's demo orders matching the prompt table
function createInitialOrders(): Order[] {
  const today = getTodayDateString();
  return [
    {
      id: 'ord_1',
      date: today,
      shift: 'morning',
      retailerId: 'ret_1', // Ramesh
      vehicleId: 'veh_1',
      items: { 'p_gold1l': 5, 'p_gold6l': 2, 'p_taja': 3 },
      status: 'submitted',
      totalAmount: 5 * 66 + 2 * 390 + 3 * 54, // 330 + 780 + 162 = 1272
      submittedAt: `${today}T15:30:00Z`
    },
    {
      id: 'ord_2',
      date: today,
      shift: 'morning',
      retailerId: 'ret_2', // Kamal
      vehicleId: 'veh_1',
      items: { 'p_gold1l': 3, 'p_taja': 2, 'p_cow': 1 },
      status: 'submitted',
      totalAmount: 3 * 66 + 2 * 54 + 1 * 56, // 198 + 108 + 56 = 362
      submittedAt: `${today}T16:10:00Z`
    },
    // ret_3 (Rajesh) is intentionally left without an order to demonstrate "ORDER NOT RECEIVED / PENDING"
    {
      id: 'ord_4',
      date: today,
      shift: 'morning',
      retailerId: 'ret_4', // Mohan
      vehicleId: 'veh_1',
      items: { 'p_gold1l': 6, 'p_gold6l': 1 },
      status: 'submitted',
      totalAmount: 6 * 68 + 1 * 390, // Mohan custom price for gold 1L = 68
      submittedAt: `${today}T16:45:00Z`
    },
    {
      id: 'ord_5',
      date: today,
      shift: 'morning',
      retailerId: 'ret_5', // Sharma Sweets
      vehicleId: 'veh_1',
      items: { 'p_dahi5': 4, 'p_paneer': 3, 'p_c': 10 },
      status: 'submitted',
      totalAmount: 4 * 350 + 3 * 420 + 10 * 15,
      submittedAt: `${today}T17:00:00Z`
    },
    // Vehicle 2 orders
    {
      id: 'ord_6',
      date: today,
      shift: 'morning',
      retailerId: 'ret_6',
      vehicleId: 'veh_2',
      items: { 'p_gold1l': 4, 'p_taja': 5 },
      status: 'submitted',
      totalAmount: 4 * 66 + 5 * 54,
      submittedAt: `${today}T16:20:00Z`
    }
  ];
}

function createInitialPayments(): Payment[] {
  const today = getTodayDateString();
  return [
    {
      id: 'pay_1',
      date: today,
      shift: 'morning',
      retailerId: 'ret_1', // Ramesh paid 500
      vehicleId: 'veh_1',
      amount: 500,
      collectedByRole: 'admin',
      collectorId: 'usr_admin',
      collectorName: 'Admin',
      createdAt: `${today}T08:00:00Z`
    },
    {
      id: 'pay_2',
      date: today,
      shift: 'morning',
      retailerId: 'ret_4', // Mohan paid 1000
      vehicleId: 'veh_1',
      amount: 1000,
      collectedByRole: 'driver',
      collectorId: 'drv_1',
      collectorName: 'Suresh Kumar',
      createdAt: `${today}T08:30:00Z`
    }
  ];
}

function createInitialDistributorLedgers(): DistributorLedger[] {
  const today = getTodayDateString();
  const yesterday = getDateDaysAgo(1);
  return [
    {
      id: 'dist_led_1',
      distributorId: 'dist_1',
      date: today,
      kirayaAmount: 5000,
      previousBaki: 2000,
      total: 7000,
      paymentReceived: 4000,
      remaining: 3000,
      notes: 'Morning plant dispatch 120 crates',
      updatedAt: `${today}T09:00:00Z`
    },
    {
      id: 'dist_led_0',
      distributorId: 'dist_1',
      date: yesterday,
      kirayaAmount: 4500,
      previousBaki: 2500,
      total: 7000,
      paymentReceived: 5000,
      remaining: 2000,
      notes: 'Carried over balance ₹2000 to next day',
      updatedAt: `${yesterday}T09:00:00Z`
    }
  ];
}

function createInitialFuelEntries(): FuelEntry[] {
  const today = getTodayDateString();
  return [
    {
      id: 'fuel_1',
      date: today,
      vehicleId: 'veh_1',
      driverId: 'drv_1',
      driverName: 'Suresh Kumar',
      amount: 1500,
      litres: 16.5,
      fuelType: 'Diesel',
      pump: 'IOCL Highway Pump',
      notes: 'Daily morning refuel',
      createdAt: `${today}T05:30:00Z`
    }
  ];
}

function createInitialVehicleExpenses(): VehicleExpense[] {
  const today = getTodayDateString();
  return [
    {
      id: 'vexp_1',
      date: today,
      vehicleId: 'veh_1',
      driverId: 'drv_1',
      driverName: 'Suresh Kumar',
      expenseType: 'Repair',
      description: 'Tyre puncture repair & air check',
      amount: 1500,
      notes: 'Front left tyre puncture fixed near bypass',
      createdAt: `${today}T07:15:00Z`
    }
  ];
}

function createInitialAuditLogs(): AuditLog[] {
  const today = getTodayDateString();
  return [
    {
      id: 'aud_1',
      timestamp: `${today}T10:00:00Z`,
      userId: 'usr_admin',
      userName: 'Admin',
      userRole: 'admin',
      action: 'System Initialized',
      entityType: 'order',
      entityId: 'system',
      details: 'MilkDesk system initialized with active vehicle routes and catalog'
    }
  ];
}

function createInitialNotifications(): Notification[] {
  const today = getTodayDateString();
  return [
    {
      id: 'notif_1',
      recipientRole: 'admin',
      title: 'New Order Received',
      message: 'Ramesh Dairy submitted order for Morning shift.',
      type: 'info',
      isRead: false,
      createdAt: `${today}T15:30:00Z`
    },
    {
      id: 'notif_2',
      recipientRole: 'retailer',
      recipientUserId: 'usr_ret1',
      title: 'Payment Recorded',
      message: '₹500 payment recorded for today. Remaining balance: ₹4500',
      type: 'success',
      isRead: false,
      createdAt: `${today}T08:00:00Z`
    },
    {
      id: 'notif_3',
      recipientRole: 'driver',
      recipientUserId: 'usr_drv1',
      title: 'Vehicle 1 Orders Ready',
      message: 'Vehicle 1 demand sheet finalized for tomorrow morning.',
      type: 'info',
      isRead: true,
      createdAt: `${today}T17:30:00Z`
    }
  ];
}

// Reactive store subscription system
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToDatabase(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Storage listener error:', err);
    }
  });
}

// Persistence manager
export class Database {
  private static get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return defaultValue;
    }
  }

  private static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      notifyListeners();
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
    }
  }

  public static initialize(): void {
    if (!localStorage.getItem(STORAGE_PREFIX + 'initialized')) {
      this.resetToDefaults();
    }
  }

  public static resetToDefaults(): void {
    this.set('users', INITIAL_USERS);
    this.set('vehicles', INITIAL_VEHICLES);
    this.set('retailers', INITIAL_RETAILERS);
    this.set('drivers', INITIAL_DRIVERS);
    this.set('distributors', INITIAL_DISTRIBUTORS);
    this.set('products', INITIAL_PRODUCTS);
    this.set('orders', createInitialOrders());
    this.set('payments', createInitialPayments());
    this.set('distributorLedgers', createInitialDistributorLedgers());
    this.set('fuelEntries', createInitialFuelEntries());
    this.set('vehicleExpenses', createInitialVehicleExpenses());
    this.set('auditLogs', createInitialAuditLogs());
    this.set('notifications', createInitialNotifications());
    this.set('settings', INITIAL_SETTINGS);
    this.set('loadingRecords', [
      {
        id: 'load_demo_1',
        vehicleId: 'veh_1',
        driverId: 'drv_1',
        driverName: 'Suresh Kumar',
        date: getTodayDateString(),
        shift: 'morning',
        completedAt: `${getTodayDateString()}T05:45:00.000Z`
      }
    ]);
    localStorage.setItem(STORAGE_PREFIX + 'initialized', 'true');
    notifyListeners();
  }

  public static clearAllData(): void {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    // Restore admin only
    this.set('users', [INITIAL_USERS[0]]);
    this.set('vehicles', []);
    this.set('retailers', []);
    this.set('drivers', []);
    this.set('distributors', []);
    this.set('products', INITIAL_PRODUCTS);
    this.set('orders', []);
    this.set('payments', []);
    this.set('distributorLedgers', []);
    this.set('fuelEntries', []);
    this.set('vehicleExpenses', []);
    this.set('auditLogs', []);
    this.set('notifications', []);
    this.set('settings', INITIAL_SETTINGS);
    this.set('loadingRecords', []);
    localStorage.setItem(STORAGE_PREFIX + 'initialized', 'true');
    notifyListeners();
  }

  // Getters
  public static getUsers(): User[] { return this.get<User[]>('users', INITIAL_USERS); }
  public static getVehicles(): Vehicle[] { return this.get<Vehicle[]>('vehicles', INITIAL_VEHICLES); }
  public static getRetailers(): Retailer[] { return this.get<Retailer[]>('retailers', INITIAL_RETAILERS); }
  public static getDrivers(): Driver[] { return this.get<Driver[]>('drivers', INITIAL_DRIVERS); }
  public static getDistributors(): Distributor[] { return this.get<Distributor[]>('distributors', INITIAL_DISTRIBUTORS); }
  public static getProducts(): Product[] { return this.get<Product[]>('products', INITIAL_PRODUCTS); }
  public static getOrders(): Order[] { return this.get<Order[]>('orders', []); }
  public static getPayments(): Payment[] { return this.get<Payment[]>('payments', []); }
  public static getDistributorLedgers(): DistributorLedger[] { return this.get<DistributorLedger[]>('distributorLedgers', []); }
  public static getFuelEntries(): FuelEntry[] { return this.get<FuelEntry[]>('fuelEntries', []); }
  public static getVehicleExpenses(): VehicleExpense[] { return this.get<VehicleExpense[]>('vehicleExpenses', []); }
  public static getAuditLogs(): AuditLog[] { return this.get<AuditLog[]>('auditLogs', []); }
  public static getNotifications(): Notification[] { return this.get<Notification[]>('notifications', []); }
  public static getSettings(): AppSettings { return this.get<AppSettings>('settings', INITIAL_SETTINGS); }
  public static getLoadingRecords(): LoadingRecord[] { return this.get<LoadingRecord[]>('loadingRecords', []); }

  // Setters
  public static setUsers(users: User[]): void { this.set('users', users); }
  public static setVehicles(vehicles: Vehicle[]): void { this.set('vehicles', vehicles); }
  public static setRetailers(retailers: Retailer[]): void { this.set('retailers', retailers); }
  public static setDrivers(drivers: Driver[]): void { this.set('drivers', drivers); }
  public static setDistributors(distributors: Distributor[]): void { this.set('distributors', distributors); }
  public static setProducts(products: Product[]): void { this.set('products', products); }
  public static setOrders(orders: Order[]): void { this.set('orders', orders); }
  public static setPayments(payments: Payment[]): void { this.set('payments', payments); }
  public static setDistributorLedgers(ledgers: DistributorLedger[]): void { this.set('distributorLedgers', ledgers); }
  public static setFuelEntries(entries: FuelEntry[]): void { this.set('fuelEntries', entries); }
  public static setVehicleExpenses(expenses: VehicleExpense[]): void { this.set('vehicleExpenses', expenses); }
  public static setAuditLogs(logs: AuditLog[]): void { this.set('auditLogs', logs); }
  public static setNotifications(notifications: Notification[]): void { this.set('notifications', notifications); }
  public static setSettings(settings: AppSettings): void { this.set('settings', settings); }
  public static setLoadingRecords(records: LoadingRecord[]): void { this.set('loadingRecords', records); }

  // Snapshot
  public static getSnapshot(): DatabaseSchema {
    return {
      users: this.getUsers(),
      vehicles: this.getVehicles(),
      retailers: this.getRetailers(),
      drivers: this.getDrivers(),
      distributors: this.getDistributors(),
      products: this.getProducts(),
      orders: this.getOrders(),
      payments: this.getPayments(),
      distributorLedgers: this.getDistributorLedgers(),
      fuelEntries: this.getFuelEntries(),
      vehicleExpenses: this.getVehicleExpenses(),
      auditLogs: this.getAuditLogs(),
      notifications: this.getNotifications(),
      settings: this.getSettings(),
      loadingRecords: this.getLoadingRecords()
    };
  }
}
