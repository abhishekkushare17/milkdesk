import { Distributor, DistributorLedger, User } from '../types';
import { Database, getTodayDateString } from './storage';
import { AuditService } from './auditService';

export class DistributorService {
  /**
   * Get or calculate ledger for a distributor on a specific date.
   * Auto-carries forward previous day's remaining balance as Previous Baki.
   */
  public static getLedgerForDate(distributorId: string, date: string): DistributorLedger {
    const ledgers = Database.getDistributorLedgers();
    const existing = ledgers.find(l => l.distributorId === distributorId && l.date === date);
    if (existing) {
      return existing;
    }

    // Find the most recent ledger entry prior to this date
    const previousEntries = ledgers
      .filter(l => l.distributorId === distributorId && l.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));

    const previousBaki = previousEntries.length > 0 ? previousEntries[0].remaining : 0;
    const kirayaAmount = 0;
    const total = kirayaAmount + previousBaki;
    const paymentReceived = 0;
    const remaining = total - paymentReceived;

    return {
      id: 'dist_led_temp_' + date,
      distributorId,
      date,
      kirayaAmount,
      previousBaki,
      total,
      paymentReceived,
      remaining,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Admin updates distributor daily kiraya, payment, and recalculates downstream records
   */
  public static updateLedger(params: {
    distributorId: string;
    date: string;
    kirayaAmount: number;
    paymentReceived: number;
    notes?: string;
    adminId: string;
    adminName: string;
  }): DistributorLedger {
    const { distributorId, date, kirayaAmount, paymentReceived, notes, adminId, adminName } = params;
    const ledgers = Database.getDistributorLedgers();

    // Previous baki from last recorded date before this date
    const priorEntries = ledgers
      .filter(l => l.distributorId === distributorId && l.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));

    const previousBaki = priorEntries.length > 0 ? priorEntries[0].remaining : 0;
    const total = kirayaAmount + previousBaki;
    const remaining = total - paymentReceived;

    const existingIndex = ledgers.findIndex(l => l.distributorId === distributorId && l.date === date);

    let updatedLedger: DistributorLedger;

    if (existingIndex !== -1) {
      updatedLedger = {
        ...ledgers[existingIndex],
        kirayaAmount,
        previousBaki,
        total,
        paymentReceived,
        remaining,
        notes: notes || ledgers[existingIndex].notes,
        updatedAt: new Date().toISOString()
      };
      ledgers[existingIndex] = updatedLedger;
    } else {
      updatedLedger = {
        id: 'dist_led_' + Date.now(),
        distributorId,
        date,
        kirayaAmount,
        previousBaki,
        total,
        paymentReceived,
        remaining,
        notes,
        updatedAt: new Date().toISOString()
      };
      ledgers.push(updatedLedger);
    }

    // Now re-propagate forward balances for any entries after this date
    ledgers.sort((a, b) => a.date.localeCompare(b.date));
    let currentCarry = remaining;

    for (let i = 0; i < ledgers.length; i++) {
      if (ledgers[i].distributorId === distributorId && ledgers[i].date > date) {
        ledgers[i].previousBaki = currentCarry;
        ledgers[i].total = ledgers[i].kirayaAmount + currentCarry;
        ledgers[i].remaining = ledgers[i].total - ledgers[i].paymentReceived;
        currentCarry = ledgers[i].remaining;
      }
    }

    Database.setDistributorLedgers([...ledgers]);

    // In-app notification to distributor
    const users = Database.getUsers();
    const distUser = users.find(u => u.distributorId === distributorId);
    if (distUser) {
      const notifs = Database.getNotifications();
      Database.setNotifications([
        {
          id: 'notif_' + Date.now(),
          recipientRole: 'distributor',
          recipientUserId: distUser.id,
          title: 'Kiraya / Payment Record Updated',
          message: `Your record for ${date} has been updated. Kiraya: ₹${kirayaAmount}, Payment: ₹${paymentReceived}, Remaining: ₹${remaining}.`,
          type: 'info',
          isRead: false,
          createdAt: new Date().toISOString()
        },
        ...notifs
      ]);
    }

    AuditService.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action: 'Updated Distributor Ledger',
      entityType: 'distributor',
      entityId: distributorId,
      details: `Kiraya: ₹${kirayaAmount}, Payment: ₹${paymentReceived} for date ${date}`
    });

    return updatedLedger;
  }

  /**
   * Create a new distributor with credentials
   */
  public static createDistributor(params: {
    name: string;
    phone: string;
    password?: string;
  }, adminId: string, adminName: string): { distributor: Distributor; user: User } {
    const distributors = Database.getDistributors();
    const newId = 'dist_' + Date.now();

    const users = Database.getUsers();
    const existingDistCodes = users
      .filter(u => u.role === 'distributor')
      .map(u => {
        const match = u.code.match(/DIS(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const nextCodeNum = existingDistCodes.length > 0 ? Math.max(...existingDistCodes) + 1 : 1;
    const loginCode = `DIS${String(nextCodeNum).padStart(2, '0')}`;
    const password = params.password || '123';

    const newDist: Distributor = {
      id: newId,
      name: params.name.trim(),
      code: loginCode,
      phone: params.phone.trim(),
      active: true,
      createdAt: new Date().toISOString()
    };

    const newUser: User = {
      id: 'usr_' + Date.now(),
      code: loginCode,
      password,
      role: 'distributor',
      name: newDist.name,
      phone: newDist.phone,
      distributorId: newId,
      active: true,
      createdAt: new Date().toISOString()
    };

    Database.setDistributors([...distributors, newDist]);
    Database.setUsers([...users, newUser]);

    // Initialize today's blank ledger
    this.updateLedger({
      distributorId: newId,
      date: getTodayDateString(),
      kirayaAmount: 0,
      paymentReceived: 0,
      adminId,
      adminName
    });

    AuditService.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action: 'Created Distributor',
      entityType: 'distributor',
      entityId: newId,
      newValue: { name: newDist.name, code: loginCode },
      details: `Added distributor ${newDist.name} with Login Code: ${loginCode}`
    });

    return { distributor: newDist, user: newUser };
  }
}
