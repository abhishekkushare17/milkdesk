import { FuelEntry, VehicleExpense, Role } from '../types';
import { Database } from './storage';
import { AuditService } from './auditService';

export class ExpenseService {
  public static addFuelEntry(params: {
    vehicleId: string;
    driverId: string;
    driverName: string;
    date: string;
    amount: number;
    litres?: number;
    fuelType?: string;
    pump?: string;
    notes?: string;
    userRole: Role;
  }): FuelEntry {
    const { vehicleId, driverId, driverName, date, amount, litres, fuelType, pump, notes, userRole } = params;
    const entries = Database.getFuelEntries();

    const newEntry: FuelEntry = {
      id: 'fuel_' + Date.now(),
      vehicleId,
      driverId,
      driverName,
      date,
      amount,
      litres,
      fuelType: fuelType || 'Diesel',
      pump,
      notes,
      createdAt: new Date().toISOString()
    };

    Database.setFuelEntries([newEntry, ...entries]);

    AuditService.log({
      userId: driverId,
      userName: driverName,
      userRole,
      action: 'Added Fuel Entry',
      entityType: 'vehicle',
      entityId: vehicleId,
      newValue: amount,
      details: `${driverName} logged fuel expense of ₹${amount} for ${vehicleId}`
    });

    return newEntry;
  }

  public static addVehicleExpense(params: {
    vehicleId: string;
    driverId: string;
    driverName: string;
    date: string;
    expenseType: string;
    description: string;
    amount: number;
    notes?: string;
    userRole: Role;
  }): VehicleExpense {
    const { vehicleId, driverId, driverName, date, expenseType, description, amount, notes, userRole } = params;
    const expenses = Database.getVehicleExpenses();

    const newExpense: VehicleExpense = {
      id: 'vexp_' + Date.now(),
      vehicleId,
      driverId,
      driverName,
      date,
      expenseType: expenseType || 'Repair',
      description,
      amount,
      notes,
      createdAt: new Date().toISOString()
    };

    Database.setVehicleExpenses([newExpense, ...expenses]);

    AuditService.log({
      userId: driverId,
      userName: driverName,
      userRole,
      action: 'Added Vehicle Expense',
      entityType: 'vehicle',
      entityId: vehicleId,
      newValue: amount,
      details: `${driverName} logged ${expenseType} (₹${amount}): ${description}`
    });

    return newExpense;
  }

  public static getFuelByVehicle(vehicleId: string): FuelEntry[] {
    return Database.getFuelEntries()
      .filter(f => f.vehicleId === vehicleId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  public static getExpensesByVehicle(vehicleId: string): VehicleExpense[] {
    return Database.getVehicleExpenses()
      .filter(e => e.vehicleId === vehicleId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}
