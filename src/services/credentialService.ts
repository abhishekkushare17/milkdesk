import { Database } from './storage';
import { AuditService } from './auditService';
import { User, Driver, Distributor, Retailer, Role } from '../types';

export class CredentialService {
  /**
   * Ensures every Retailer, Driver, and Distributor in the system has a corresponding User record.
   */
  public static ensureAllEntitiesHaveUsers(): void {
    const users = Database.getUsers();
    let updated = false;
    const userList = [...users];

    // Ensure Retailers
    const retailers = Database.getRetailers();
    retailers.forEach((r, idx) => {
      let u = userList.find(x => x.retailerId === r.id);
      if (!u) {
        const num = idx + 1;
        const code = `RET${String(num).padStart(2, '0')}`;
        const newUser: User = {
          id: `usr_ret_${r.id}`,
          code,
          password: '123',
          role: 'retailer',
          name: r.name,
          phone: r.phone,
          retailerId: r.id,
          active: r.active,
          createdAt: r.createdAt || new Date().toISOString()
        };
        userList.push(newUser);
        updated = true;
      }
    });

    // Ensure Drivers
    const drivers = Database.getDrivers();
    drivers.forEach((d, idx) => {
      let u = userList.find(x => x.driverId === d.id || x.code === d.code);
      if (!u) {
        const num = idx + 1;
        const code = d.code || `DRV${String(num).padStart(2, '0')}`;
        const newUser: User = {
          id: `usr_drv_${d.id}`,
          code,
          password: '123',
          role: 'driver',
          name: d.name,
          phone: d.phone,
          driverId: d.id,
          active: d.active,
          createdAt: new Date().toISOString()
        };
        userList.push(newUser);
        updated = true;
      }
    });

    // Ensure Distributors
    const distributors = Database.getDistributors();
    distributors.forEach((dist, idx) => {
      let u = userList.find(x => x.distributorId === dist.id || x.code === dist.code);
      if (!u) {
        const num = idx + 1;
        const code = dist.code || `DIS${String(num).padStart(2, '0')}`;
        const newUser: User = {
          id: `usr_dist_${dist.id}`,
          code,
          password: '123',
          role: 'distributor',
          name: dist.name,
          phone: dist.phone,
          distributorId: dist.id,
          active: dist.active,
          createdAt: dist.createdAt || new Date().toISOString()
        };
        userList.push(newUser);
        updated = true;
      }
    });

    if (updated) {
      Database.setUsers(userList);
    }
  }

  /**
   * Finds or creates a user for a driver
   */
  public static getUserForDriver(driverId: string): User | null {
    this.ensureAllEntitiesHaveUsers();
    const users = Database.getUsers();
    const existing = users.find(u => u.driverId === driverId);
    if (existing) return existing;

    const driver = Database.getDrivers().find(d => d.id === driverId);
    if (!driver) return null;

    const newUser: User = {
      id: `usr_drv_${driver.id}`,
      code: driver.code,
      password: '123',
      role: 'driver',
      name: driver.name,
      phone: driver.phone,
      driverId: driver.id,
      active: driver.active,
      createdAt: new Date().toISOString()
    };
    Database.setUsers([...users, newUser]);
    return newUser;
  }

  /**
   * Finds or creates a user for a distributor
   */
  public static getUserForDistributor(distributorId: string): User | null {
    this.ensureAllEntitiesHaveUsers();
    const users = Database.getUsers();
    const existing = users.find(u => u.distributorId === distributorId);
    if (existing) return existing;

    const dist = Database.getDistributors().find(d => d.id === distributorId);
    if (!dist) return null;

    const newUser: User = {
      id: `usr_dist_${dist.id}`,
      code: dist.code,
      password: '123',
      role: 'distributor',
      name: dist.name,
      phone: dist.phone,
      distributorId: dist.id,
      active: dist.active,
      createdAt: dist.createdAt || new Date().toISOString()
    };
    Database.setUsers([...users, newUser]);
    return newUser;
  }

  /**
   * Finds or creates a user for a retailer
   */
  public static getUserForRetailer(retailerId: string): User | null {
    this.ensureAllEntitiesHaveUsers();
    const users = Database.getUsers();
    const existing = users.find(u => u.retailerId === retailerId);
    if (existing) return existing;

    const ret = Database.getRetailers().find(r => r.id === retailerId);
    if (!ret) return null;

    const newUser: User = {
      id: `usr_ret_${ret.id}`,
      code: `RET0${ret.serialNumber}`,
      password: '123',
      role: 'retailer',
      name: ret.name,
      phone: ret.phone,
      retailerId: ret.id,
      active: ret.active,
      createdAt: ret.createdAt || new Date().toISOString()
    };
    Database.setUsers([...users, newUser]);
    return newUser;
  }

  /**
   * Update credentials (login code and password) for any user.
   */
  public static updateCredentials(
    userId: string,
    newCode: string,
    newPassword: string,
    editorId?: string,
    editorName?: string
  ): { success: boolean; user?: User; error?: string } {
    const cleanCode = newCode.trim().toUpperCase();
    const cleanPass = newPassword.trim();

    if (!cleanCode) return { success: false, error: 'Login code cannot be empty.' };
    if (!cleanPass) return { success: false, error: 'Password cannot be empty.' };

    const users = Database.getUsers();
    const existingIndex = users.findIndex(u => u.id === userId);
    if (existingIndex === -1) {
      return { success: false, error: 'User record not found.' };
    }

    // Uniqueness check for code
    const codeClash = users.find(u => u.id !== userId && u.code.toUpperCase() === cleanCode);
    if (codeClash) {
      return { success: false, error: `Login code "${cleanCode}" is already taken by ${codeClash.name} (${codeClash.role}).` };
    }

    const prevUser = users[existingIndex];
    const updatedUser: User = {
      ...prevUser,
      code: cleanCode,
      password: cleanPass
    };

    users[existingIndex] = updatedUser;
    Database.setUsers(users);

    // If linked to a driver, keep driver.code in sync
    if (updatedUser.driverId) {
      const drivers = Database.getDrivers();
      const dIdx = drivers.findIndex(d => d.id === updatedUser.driverId);
      if (dIdx !== -1) {
        drivers[dIdx] = { ...drivers[dIdx], code: cleanCode };
        Database.setDrivers(drivers);
      }
    }

    // If linked to a distributor, keep distributor.code in sync
    if (updatedUser.distributorId) {
      const dists = Database.getDistributors();
      const distIdx = dists.findIndex(d => d.id === updatedUser.distributorId);
      if (distIdx !== -1) {
        dists[distIdx] = { ...dists[distIdx], code: cleanCode };
        Database.setDistributors(dists);
      }
    }

    // Audit log
    AuditService.log({
      userId: editorId || updatedUser.id,
      userName: editorName || updatedUser.name,
      userRole: (editorId ? 'admin' : updatedUser.role) as Role,
      action: 'Updated User Credentials',
      entityType: 'user' as any,
      entityId: updatedUser.id,
      oldValue: { code: prevUser.code },
      newValue: { code: cleanCode },
      details: `${editorName || 'User'} updated login code to "${cleanCode}" and password for ${updatedUser.name} (${updatedUser.role})`
    });

    return { success: true, user: updatedUser };
  }

  /**
   * Reset user password to a default or specified value.
   */
  public static resetPassword(
    userId: string,
    newPassword: string = '123',
    editorId?: string,
    editorName?: string
  ): { success: boolean; user?: User; error?: string } {
    const users = Database.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    return this.updateCredentials(userId, user.code, newPassword, editorId, editorName);
  }
}
