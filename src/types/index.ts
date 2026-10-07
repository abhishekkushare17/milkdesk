export type Role = 'admin' | 'retailer' | 'driver' | 'distributor';

export type Shift = 'morning' | 'evening';

export type SyncStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC COMPLETE';

export interface AdminPermissions {
  orders: boolean;
  payments: boolean;
  retailers: boolean;
  products: boolean;
  vehicles: boolean;
  drivers: boolean;
  distributors: boolean;
  reports: boolean;
  userManagement: boolean;
  deleteRecords: boolean;
}

export interface User {
  id: string;
  code: string; // Unique Login Code e.g. ADM01, RET01
  password: string;
  role: Role;
  name: string;
  phone?: string;
  isSuperAdmin?: boolean;
  permissions?: AdminPermissions;
  retailerId?: string; // Linked ID if role is retailer
  driverId?: string;   // Linked ID if role is driver
  distributorId?: string; // Linked ID if role is distributor
  active: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  name: string; // e.g. "Vehicle 1", "Vehicle 2", "Big Truck 1"
  registrationNumber: string;
  driverId: string | null;
  active: boolean;
  notes?: string;
}

export interface Retailer {
  id: string;
  vehicleId: string;
  serialNumber: number; // 1-based, vehicle-specific sequence
  name: string;
  phone: string;
  balanceDue: number; // Cumulative pending balance
  customPrices: Record<string, number>; // productId -> custom price override
  active: boolean;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  code: string;
  phone: string;
  assignedVehicleId: string | null;
  canCollectPayment: boolean; // Admin-granted permission to enter retailer payments
  active: boolean;
}

export interface Distributor {
  id: string;
  name: string;
  code: string;
  phone: string;
  active: boolean;
  createdAt: string;
}

export type ProductUnit = 'Litre' | 'KG' | 'Crate' | 'Box' | 'Matka' | 'Cup' | 'Packet' | string;

export interface Product {
  id: string;
  name: string;
  shortName: string; // Compact name for PDF & small screens (e.g. "C", "M")
  group: string;     // e.g. "Milk", "Dahi", "Paneer", "Butter"
  unit: ProductUnit;
  defaultPrice: number;
  displayPosition: number; // Order of display in tables & PDFs
  active: boolean;
}

export interface Order {
  id: string;
  date: string; // YYYY-MM-DD
  shift: Shift;
  retailerId: string;
  vehicleId: string;
  items: Record<string, number>; // productId -> quantity
  status: 'pending' | 'submitted' | 'updated';
  totalAmount: number;
  notes?: string;
  submittedAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Payment {
  id: string;
  date: string; // YYYY-MM-DD
  shift?: Shift;
  retailerId: string;
  vehicleId: string;
  amount: number;
  collectedByRole: Role;
  collectorId: string;
  collectorName: string;
  notes?: string;
  createdAt: string;
}

export interface DistributorLedger {
  id: string;
  distributorId: string;
  date: string; // YYYY-MM-DD
  kirayaAmount: number;     // Today's transport/rent
  previousBaki: number;     // Previous pending amount
  total: number;            // Kiraya + Previous Baki
  paymentReceived: number;  // Today's payment
  remaining: number;        // Total - Today Payment
  notes?: string;
  updatedAt: string;
}

export interface FuelEntry {
  id: string;
  date: string; // YYYY-MM-DD
  vehicleId: string;
  driverId: string;
  driverName: string;
  amount: number;
  litres?: number;
  fuelType?: string;
  pump?: string;
  notes?: string;
  createdAt: string;
}

export interface VehicleExpense {
  id: string;
  date: string; // YYYY-MM-DD
  vehicleId: string;
  driverId: string;
  driverName: string;
  expenseType: string; // e.g. "Repair", "Tyre", "Maintenance", "Oil", "Toll"
  description: string; // e.g. "Tyre puncture repair"
  amount: number;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  entityType: 'order' | 'payment' | 'product' | 'retailer' | 'price' | 'vehicle' | 'distributor';
  entityId: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  details?: string;
}

export interface Notification {
  id: string;
  recipientRole?: Role | 'all';
  recipientUserId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  isRead: boolean;
  createdAt: string;
}

export interface AppSettings {
  businessName: string;
  phone: string;
  address: string;
  currencySymbol: string; // Default '₹'
  defaultShift: Shift;
}

export interface QueuedMutation {
  id: string;
  action: string;
  payload: any;
  timestamp: string;
}

export interface LoadingRecord {
  id: string;
  vehicleId: string;
  driverId: string;
  driverName: string;
  date: string; // YYYY-MM-DD
  shift: Shift;
  completedAt: string; // ISO timestamp
}
