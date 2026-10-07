import { Retailer, User } from '../types';
import { Database } from './storage';
import { AuditService } from './auditService';

export class RetailerService {
  /**
   * Get retailers filtered by vehicle and sorted strictly by 1-based serial number
   */
  public static getRetailersByVehicle(vehicleId: string): Retailer[] {
    const retailers = Database.getRetailers();
    return retailers
      .filter(r => r.vehicleId === vehicleId && r.active)
      .sort((a, b) => a.serialNumber - b.serialNumber);
  }

  /**
   * Get soft-deleted / archived retailers for this vehicle
   */
  public static getArchivedRetailersByVehicle(vehicleId: string): Retailer[] {
    const retailers = Database.getRetailers();
    return retailers
      .filter(r => r.vehicleId === vehicleId && !r.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Add a new retailer to a vehicle at a target serial position.
   * If target position exists, shifts existing retailers at >= target position down by 1.
   */
  public static addRetailer(
    params: {
      vehicleId: string;
      targetPosition?: number;
      name: string;
      phone: string;
      initialDue?: number;
      password?: string;
    },
    adminId: string,
    adminName: string
  ): { retailer: Retailer; user: User } {
    const retailers = Database.getRetailers();
    const vehicleRetailers = retailers
      .filter(r => r.vehicleId === params.vehicleId)
      .sort((a, b) => a.serialNumber - b.serialNumber);

    const targetPos = (params.targetPosition && params.targetPosition >= 1)
      ? Math.min(params.targetPosition, vehicleRetailers.length + 1)
      : vehicleRetailers.length + 1;

    // Shift existing retailers at or after target position down by +1
    const updatedRetailers = retailers.map(r => {
      if (r.vehicleId === params.vehicleId && r.serialNumber >= targetPos) {
        return { ...r, serialNumber: r.serialNumber + 1 };
      }
      return r;
    });

    const newRetailerId = 'ret_' + Date.now();
    const newRetailer: Retailer = {
      id: newRetailerId,
      vehicleId: params.vehicleId,
      serialNumber: targetPos,
      name: params.name.trim(),
      phone: params.phone.trim(),
      balanceDue: params.initialDue || 0,
      customPrices: {},
      active: true,
      createdAt: new Date().toISOString()
    };

    updatedRetailers.push(newRetailer);
    Database.setRetailers(updatedRetailers);

    // Generate login code and User record for this retailer
    const users = Database.getUsers();
    const existingRetailerCodes = users
      .filter(u => u.role === 'retailer')
      .map(u => {
        const match = u.code.match(/RET(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const nextCodeNum = existingRetailerCodes.length > 0 ? Math.max(...existingRetailerCodes) + 1 : 1;
    const loginCode = `RET${String(nextCodeNum).padStart(2, '0')}`;
    const password = params.password || Math.random().toString(36).slice(-6);

    const newUser: User = {
      id: 'usr_' + Date.now(),
      code: loginCode,
      password: password,
      role: 'retailer',
      name: newRetailer.name,
      phone: newRetailer.phone,
      retailerId: newRetailerId,
      active: true,
      createdAt: new Date().toISOString()
    };

    Database.setUsers([...users, newUser]);

    AuditService.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action: 'Created Retailer',
      entityType: 'retailer',
      entityId: newRetailerId,
      newValue: { name: newRetailer.name, vehicleId: params.vehicleId, serialNumber: targetPos },
      details: `Added ${newRetailer.name} to Vehicle at position #${targetPos}. Generated Login Code: ${loginCode}`
    });

    return { retailer: newRetailer, user: newUser };
  }

  /**
   * Soft-delete a retailer (active: false) and shift following active serials up by -1
   */
  public static deleteRetailer(
    retailerId: string,
    adminId: string,
    adminName: string
  ): boolean {
    const retailers = Database.getRetailers();
    const target = retailers.find(r => r.id === retailerId);
    if (!target) return false;

    const vehicleId = target.vehicleId;
    const deletedSerial = target.serialNumber;

    // Mark inactive and shift active serials up
    const updatedRetailers = retailers.map(r => {
      if (r.id === retailerId) {
        return { ...r, active: false, serialNumber: 0 };
      }
      if (r.active && r.vehicleId === vehicleId && r.serialNumber > deletedSerial) {
        return { ...r, serialNumber: r.serialNumber - 1 };
      }
      return r;
    });

    Database.setRetailers(updatedRetailers);

    // Deactivate linked user
    const users = Database.getUsers();
    Database.setUsers(users.map(u => u.retailerId === retailerId ? { ...u, active: false } : u));

    AuditService.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action: 'Deactivated Retailer',
      entityType: 'retailer',
      entityId: retailerId,
      oldValue: { name: target.name, serialNumber: deletedSerial },
      details: `Deactivated (archived) ${target.name}. Subsequent serials shifted up.`
    });

    return true;
  }

  /**
   * Restore a soft-deleted retailer
   */
  public static restoreRetailer(
    retailerId: string,
    adminId: string,
    adminName: string
  ): boolean {
    const retailers = Database.getRetailers();
    const target = retailers.find(r => r.id === retailerId);
    if (!target) return false;

    const vehicleId = target.vehicleId;
    const activeInVehicle = retailers.filter(r => r.vehicleId === vehicleId && r.active);
    const newSerial = activeInVehicle.length + 1;

    const updatedRetailers = retailers.map(r => {
      if (r.id === retailerId) {
        return { ...r, active: true, serialNumber: newSerial };
      }
      return r;
    });

    Database.setRetailers(updatedRetailers);

    // Reactivate user
    const users = Database.getUsers();
    Database.setUsers(users.map(u => u.retailerId === retailerId ? { ...u, active: true } : u));

    AuditService.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action: 'Restored Retailer',
      entityType: 'retailer',
      entityId: retailerId,
      newValue: { name: target.name, serialNumber: newSerial },
      details: `Restored ${target.name} at serial #${newSerial}.`
    });

    return true;
  }

  /**
   * Move retailer to a specific serial position within the same vehicle
   */
  public static reorderRetailer(
    retailerId: string,
    newPosition: number,
    adminId: string,
    adminName: string
  ): boolean {
    const retailers = Database.getRetailers();
    const target = retailers.find(r => r.id === retailerId);
    if (!target) return false;

    const vehicleId = target.vehicleId;
    const currentPos = target.serialNumber;
    if (currentPos === newPosition) return true;

    const vehicleRetailers = retailers
      .filter(r => r.vehicleId === vehicleId)
      .sort((a, b) => a.serialNumber - b.serialNumber);

    const clampedPos = Math.max(1, Math.min(newPosition, vehicleRetailers.length));

    const updated = retailers.map(r => {
      if (r.vehicleId !== vehicleId) return r;
      if (r.id === retailerId) {
        return { ...r, serialNumber: clampedPos };
      }
      if (currentPos < clampedPos) {
        // Moving down: shift items between current+1 and clampedPos UP (-1)
        if (r.serialNumber > currentPos && r.serialNumber <= clampedPos) {
          return { ...r, serialNumber: r.serialNumber - 1 };
        }
      } else {
        // Moving up: shift items between clampedPos and current-1 DOWN (+1)
        if (r.serialNumber >= clampedPos && r.serialNumber < currentPos) {
          return { ...r, serialNumber: r.serialNumber + 1 };
        }
      }
      return r;
    });

    Database.setRetailers(updated);

    AuditService.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action: 'Reordered Retailer Serial',
      entityType: 'retailer',
      entityId: retailerId,
      oldValue: currentPos,
      newValue: clampedPos,
      details: `Reordered ${target.name} from #${currentPos} to #${clampedPos}`
    });

    return true;
  }

  /**
   * Ensure that every retailer has a linked user account with a login code and password.
   */
  public static ensureAllRetailersHaveUsers(): void {
    const retailers = Database.getRetailers();
    const users = Database.getUsers();
    let hasChanges = false;
    const updatedUsers = [...users];

    for (const r of retailers) {
      const exists = updatedUsers.find(u => u.retailerId === r.id);
      if (!exists) {
        const existingCodes = updatedUsers
          .filter(u => u.role === 'retailer')
          .map(u => {
            const m = u.code.match(/RET(\d+)/);
            return m ? parseInt(m[1], 10) : 0;
          });
        const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
        const code = `RET${String(nextNum).padStart(2, '0')}`;

        updatedUsers.push({
          id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          code,
          password: '123',
          role: 'retailer',
          name: r.name,
          phone: r.phone,
          retailerId: r.id,
          active: r.active,
          createdAt: new Date().toISOString()
        });
        hasChanges = true;
      }
    }

    if (hasChanges) {
      Database.setUsers(updatedUsers);
    }
  }

  /**
   * Get or create a linked User for a given retailer
   */
  public static getOrCreateRetailerUser(retailer: Retailer, defaultPassword = '123'): User {
    const users = Database.getUsers();
    let user = users.find(u => u.retailerId === retailer.id);
    if (!user) {
      const existingCodes = users
        .filter(u => u.role === 'retailer')
        .map(u => {
          const m = u.code.match(/RET(\d+)/);
          return m ? parseInt(m[1], 10) : 0;
        });
      const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
      const code = `RET${String(nextNum).padStart(2, '0')}`;

      user = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        code,
        password: defaultPassword,
        role: 'retailer',
        name: retailer.name,
        phone: retailer.phone,
        retailerId: retailer.id,
        active: retailer.active,
        createdAt: new Date().toISOString()
      };
      Database.setUsers([...users, user]);
    }
    return user;
  }

  /**
   * Update password and optionally login code for a retailer
   */
  public static updateRetailerCredentials(
    retailerId: string,
    newPassword: string,
    newCode?: string,
    adminId?: string,
    adminName?: string
  ): { success: boolean; user?: User; error?: string } {
    const currentRetailers = Database.getRetailers();
    const retailer = currentRetailers.find(r => r.id === retailerId);
    if (!retailer) {
      return { success: false, error: 'Retailer not found' };
    }

    const currentUsers = Database.getUsers();
    let userIndex = currentUsers.findIndex(u => u.retailerId === retailerId);

    if (userIndex === -1) {
      this.getOrCreateRetailerUser(retailer, newPassword);
      userIndex = Database.getUsers().findIndex(u => u.retailerId === retailerId);
    }

    const freshUsers = Database.getUsers();
    const userToUpdate = { ...freshUsers[userIndex] };

    if (newCode && newCode.trim()) {
      const cleanCode = newCode.trim().toUpperCase();
      const conflict = freshUsers.find(u => u.id !== userToUpdate.id && u.code.toUpperCase() === cleanCode);
      if (conflict) {
        return { success: false, error: `Login code "${cleanCode}" is already in use by ${conflict.name}.` };
      }
      userToUpdate.code = cleanCode;
    }

    userToUpdate.password = newPassword.trim();
    freshUsers[userIndex] = userToUpdate;
    Database.setUsers(freshUsers);

    if (adminId && adminName) {
      AuditService.log({
        userId: adminId,
        userName: adminName,
        userRole: 'admin',
        action: 'Updated Retailer Password',
        entityType: 'retailer',
        entityId: retailerId,
        details: `Updated login credentials for ${retailer.name} (Code: ${userToUpdate.code}).`
      });
    }

    return { success: true, user: userToUpdate };
  }
}
