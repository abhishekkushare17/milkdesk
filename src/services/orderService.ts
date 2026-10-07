import { Order, Payment, Shift, Role } from '../types';
import { Database } from './storage';
import { PricingService } from './pricingService';
import { AuditService } from './auditService';

export interface VehicleOrderRow {
  retailerId: string;
  serialNumber: number;
  retailerName: string;
  phone: string;
  orderId?: string;
  isReceived: boolean;
  status?: 'pending' | 'submitted' | 'updated';
  quantities: Record<string, number>; // productId -> quantity
  orderTotal: number;
  paymentAmount: number | null; // null if unpaid
  paymentId?: string;
}

export class OrderService {
  /**
   * Check if retailer can place an order for the given date and shift
   */
  public static canRetailerOrder(retailerId: string, date: string, shift: Shift): { allowed: boolean; reason?: string } {
    const orders = Database.getOrders();
    const existing = orders.find(o => o.retailerId === retailerId && o.date === date && o.shift === shift);
    if (existing) {
      return {
        allowed: false,
        reason: `A ${shift.toUpperCase()} order for this date has already been submitted. You cannot submit twice for the same shift.`
      };
    }
    return { allowed: true };
  }

  /**
   * Submit an order by Retailer (or Admin on retailer's behalf)
   */
  public static submitOrder(params: {
    retailerId: string;
    vehicleId: string;
    date: string;
    shift: Shift;
    items: Record<string, number>;
    submittedByRole: Role;
    submitterId: string;
    submitterName: string;
  }): { success: boolean; order?: Order; error?: string } {
    const { retailerId, vehicleId, date, shift, items, submittedByRole, submitterId, submitterName } = params;

    // Filter out zero or invalid quantities
    const cleanedItems: Record<string, number> = {};
    let totalAmount = 0;

    for (const [prodId, qty] of Object.entries(items)) {
      const numQty = Number(qty);
      if (!isNaN(numQty) && numQty > 0) {
        cleanedItems[prodId] = numQty;
        const price = PricingService.getPrice(retailerId, prodId);
        totalAmount += numQty * price;
      }
    }

    if (Object.keys(cleanedItems).length === 0) {
      return { success: false, error: 'Please enter a quantity for at least one product.' };
    }

    const orders = Database.getOrders();
    const existingIndex = orders.findIndex(o => o.retailerId === retailerId && o.date === date && o.shift === shift);

    // If submitted by retailer and already exists, deny
    if (submittedByRole === 'retailer' && existingIndex !== -1) {
      return { success: false, error: `You have already placed an order for this ${shift} shift.` };
    }

    const retailers = Database.getRetailers();
    const retailer = retailers.find(r => r.id === retailerId);
    const retailerName = retailer?.name || 'Retailer';

    let orderToSave: Order;

    if (existingIndex !== -1) {
      // Update existing
      orderToSave = {
        ...orders[existingIndex],
        items: cleanedItems,
        totalAmount,
        status: 'updated',
        updatedAt: new Date().toISOString(),
        updatedBy: submitterName
      };
      orders[existingIndex] = orderToSave;
    } else {
      orderToSave = {
        id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        date,
        shift,
        retailerId,
        vehicleId,
        items: cleanedItems,
        status: 'submitted',
        totalAmount,
        submittedAt: new Date().toISOString()
      };
      orders.push(orderToSave);
    }

    Database.setOrders([...orders]);

    // Update retailer cumulative due balance
    this.recalculateRetailerBalance(retailerId);

    // In-app notifications
    const notifs = Database.getNotifications();
    const newNotifs = [...notifs];

    if (submittedByRole === 'retailer') {
      newNotifs.unshift({
        id: 'notif_' + Date.now(),
        recipientRole: 'admin',
        title: 'New Order Received',
        message: `New ${shift} order received from ${retailerName}.`,
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString()
      });
      // Also notify assigned driver
      const drivers = Database.getDrivers();
      const driver = drivers.find(d => d.assignedVehicleId === vehicleId);
      if (driver) {
        newNotifs.unshift({
          id: 'notif_drv_' + Date.now(),
          recipientRole: 'driver',
          recipientUserId: driver.id,
          title: 'New Retailer Order',
          message: `${retailerName} placed a ${shift} order for ${vehicleId}.`,
          type: 'info',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    } else if (submittedByRole === 'admin') {
      // Notify retailer that Admin entered/updated their order
      const users = Database.getUsers();
      const retUser = users.find(u => u.retailerId === retailerId);
      if (retUser) {
        newNotifs.unshift({
          id: 'notif_ret_' + Date.now(),
          recipientRole: 'retailer',
          recipientUserId: retUser.id,
          title: 'Order Updated by Admin',
          message: `Your ${shift} order for ${date} was updated by Admin.`,
          type: 'warning',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    Database.setNotifications(newNotifs.slice(0, 100));

    // Audit log
    AuditService.log({
      userId: submitterId,
      userName: submitterName,
      userRole: submittedByRole,
      action: existingIndex !== -1 ? 'Updated Order' : 'Created Order',
      entityType: 'order',
      entityId: orderToSave.id,
      newValue: cleanedItems,
      details: `${submitterName} recorded ${shift} order for ${retailerName} (Total: ₹${totalAmount})`
    });

    return { success: true, order: orderToSave };
  }

  /**
   * Admin edit for any current or past order with detailed item diff logging
   */
  public static adminEditOrder(
    orderId: string,
    newItems: Record<string, number>,
    adminId: string,
    adminName: string
  ): boolean {
    const orders = Database.getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return false;

    const oldOrder = orders[orderIndex];
    const products = Database.getProducts();

    // Clean new items
    const cleaned: Record<string, number> = {};
    let newTotal = 0;
    for (const [pId, qty] of Object.entries(newItems)) {
      const n = Number(qty);
      if (!isNaN(n) && n > 0) {
        cleaned[pId] = n;
        const price = PricingService.getPrice(oldOrder.retailerId, pId);
        newTotal += n * price;
      }
    }

    // Build diff description
    const diffs: string[] = [];
    const allPIds = Array.from(new Set([...Object.keys(oldOrder.items), ...Object.keys(cleaned)]));
    for (const pId of allPIds) {
      const oldQ = oldOrder.items[pId] || 0;
      const newQ = cleaned[pId] || 0;
      if (oldQ !== newQ) {
        const pName = products.find(p => p.id === pId)?.name || pId;
        diffs.push(`${pName}: ${oldQ} -> ${newQ}`);
      }
    }

    orders[orderIndex] = {
      ...oldOrder,
      items: cleaned,
      totalAmount: newTotal,
      status: 'updated',
      updatedAt: new Date().toISOString(),
      updatedBy: adminName
    };

    Database.setOrders([...orders]);
    this.recalculateRetailerBalance(oldOrder.retailerId);

    // Notify retailer
    const users = Database.getUsers();
    const retUser = users.find(u => u.retailerId === oldOrder.retailerId);
    if (retUser) {
      const notifs = Database.getNotifications();
      Database.setNotifications([
        {
          id: 'notif_' + Date.now(),
          recipientRole: 'retailer',
          recipientUserId: retUser.id,
          title: 'Order Modified by Admin',
          message: `Admin modified your order for ${oldOrder.date} (${oldOrder.shift}). Changes: ${diffs.join(', ')}`,
          type: 'warning',
          isRead: false,
          createdAt: new Date().toISOString()
        },
        ...notifs
      ]);
    }

    // Audit Log
    AuditService.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action: 'Admin Edited Order',
      entityType: 'order',
      entityId: orderId,
      oldValue: oldOrder.items,
      newValue: cleaned,
      details: `Changes: ${diffs.join('; ')}. New Total: ₹${newTotal}`
    });

    return true;
  }

  /**
   * Add or edit a retailer payment record
   */
  public static recordPayment(params: {
    retailerId: string;
    vehicleId: string;
    date: string;
    shift?: Shift;
    amount: number;
    collectedByRole: Role;
    collectorId: string;
    collectorName: string;
    notes?: string;
  }): Payment {
    const { retailerId, vehicleId, date, shift, amount, collectedByRole, collectorId, collectorName, notes } = params;

    const payments = Database.getPayments();
    // Check if payment already exists for this retailer on this date
    const existingIndex = payments.findIndex(p => p.retailerId === retailerId && p.date === date);

    let paymentRecord: Payment;

    if (existingIndex !== -1) {
      paymentRecord = {
        ...payments[existingIndex],
        amount,
        shift: shift || payments[existingIndex].shift,
        collectedByRole,
        collectorId,
        collectorName,
        notes: notes || payments[existingIndex].notes
      };
      payments[existingIndex] = paymentRecord;
    } else {
      paymentRecord = {
        id: 'pay_' + Date.now(),
        retailerId,
        vehicleId,
        date,
        shift,
        amount,
        collectedByRole,
        collectorId,
        collectorName,
        notes,
        createdAt: new Date().toISOString()
      };
      payments.push(paymentRecord);
    }

    Database.setPayments([...payments]);
    this.recalculateRetailerBalance(retailerId);

    // Notify retailer
    const users = Database.getUsers();
    const retUser = users.find(u => u.retailerId === retailerId);
    if (retUser) {
      const notifs = Database.getNotifications();
      Database.setNotifications([
        {
          id: 'notif_pay_' + Date.now(),
          recipientRole: 'retailer',
          recipientUserId: retUser.id,
          title: 'Payment Received',
          message: `Payment of ₹${amount} recorded on ${date} by ${collectorName}.`,
          type: 'success',
          isRead: false,
          createdAt: new Date().toISOString()
        },
        ...notifs
      ]);
    }

    AuditService.log({
      userId: collectorId,
      userName: collectorName,
      userRole: collectedByRole,
      action: 'Recorded Retailer Payment',
      entityType: 'payment',
      entityId: paymentRecord.id,
      newValue: amount,
      details: `${collectorName} collected ₹${amount} from Retailer ${retailerId}`
    });

    return paymentRecord;
  }

  /**
   * Recalculate retailer cumulative balance due
   */
  public static recalculateRetailerBalance(retailerId: string): number {
    const orders = Database.getOrders().filter(o => o.retailerId === retailerId);
    const payments = Database.getPayments().filter(p => p.retailerId === retailerId);
    const retailers = Database.getRetailers();
    const retailerIndex = retailers.findIndex(r => r.id === retailerId);
    if (retailerIndex === -1) return 0;

    const totalOrdersAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalPaymentsAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const newBalance = Math.max(0, totalOrdersAmount - totalPaymentsAmount);
    retailers[retailerIndex].balanceDue = newBalance;
    Database.setRetailers([...retailers]);

    return newBalance;
  }

  /**
   * Build complete live vehicle order sheet for Admin and Driver
   */
  public static getVehicleOrderSheet(vehicleId: string, date: string, shift: Shift): {
    rows: VehicleOrderRow[];
    productTotals: Record<string, number>;
    totalOrdersReceived: number;
    totalRetailers: number;
  } {
    const retailers = Database.getRetailers()
      .filter(r => r.vehicleId === vehicleId && r.active)
      .sort((a, b) => a.serialNumber - b.serialNumber);

    const orders = Database.getOrders().filter(o => o.vehicleId === vehicleId && o.date === date && o.shift === shift);
    const payments = Database.getPayments().filter(p => p.vehicleId === vehicleId && p.date === date);

    const productTotals: Record<string, number> = {};
    const rows: VehicleOrderRow[] = [];
    let receivedCount = 0;

    for (const retailer of retailers) {
      const order = orders.find(o => o.retailerId === retailer.id);
      const payment = payments.find(p => p.retailerId === retailer.id);

      const isReceived = !!order && Object.keys(order.items).length > 0;
      if (isReceived) receivedCount++;

      const quantities: Record<string, number> = {};
      if (order) {
        for (const [pId, qty] of Object.entries(order.items)) {
          quantities[pId] = qty;
          productTotals[pId] = (productTotals[pId] || 0) + qty;
        }
      }

      rows.push({
        retailerId: retailer.id,
        serialNumber: retailer.serialNumber,
        retailerName: retailer.name,
        phone: retailer.phone,
        orderId: order?.id,
        isReceived,
        status: order?.status,
        quantities,
        orderTotal: order?.totalAmount || 0,
        paymentAmount: (payment && payment.amount > 0) ? payment.amount : null,
        paymentId: payment?.id
      });
    }

    return {
      rows,
      productTotals,
      totalOrdersReceived: receivedCount,
      totalRetailers: retailers.length
    };
  }

  /**
   * Build Khata / Bill breakdown for a retailer on a specific date
   */
  public static getRetailerDailyKhata(retailerId: string, date: string): {
    date: string;
    items: { productName: string; quantity: number; unit: string; rate: number; subtotal: number }[];
    todayOrderAmount: number;
    previousPendingAmount: number;
    totalAmount: number;
    todayPayment: number;
    remainingAmount: number;
  } {
    const products = Database.getProducts();
    const orders = Database.getOrders().filter(o => o.retailerId === retailerId && o.date === date);
    const todayPayments = Database.getPayments().filter(p => p.retailerId === retailerId && p.date === date);

    // Calculate today's orders
    const items: { productName: string; quantity: number; unit: string; rate: number; subtotal: number }[] = [];
    let todayOrderAmount = 0;

    for (const order of orders) {
      for (const [pId, qty] of Object.entries(order.items)) {
        const prod = products.find(p => p.id === pId);
        const rate = PricingService.getPrice(retailerId, pId);
        const subtotal = qty * rate;
        todayOrderAmount += subtotal;
        items.push({
          productName: prod?.name || pId,
          quantity: qty,
          unit: prod?.unit || 'Litre',
          rate,
          subtotal
        });
      }
    }

    // Previous orders & payments before this date
    const allPreviousOrders = Database.getOrders().filter(o => o.retailerId === retailerId && o.date < date);
    const allPreviousPayments = Database.getPayments().filter(p => p.retailerId === retailerId && p.date < date);

    const prevOrderTotal = allPreviousOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const prevPaymentTotal = allPreviousPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const previousPendingAmount = Math.max(0, prevOrderTotal - prevPaymentTotal);

    const totalAmount = todayOrderAmount + previousPendingAmount;
    const todayPayment = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const remainingAmount = Math.max(0, totalAmount - todayPayment);

    return {
      date,
      items,
      todayOrderAmount,
      previousPendingAmount,
      totalAmount,
      todayPayment,
      remainingAmount
    };
  }
}
