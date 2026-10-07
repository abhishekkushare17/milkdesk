import { Database } from './storage';
import { AuditService } from './auditService';

export class PricingService {
  /**
   * Get the applicable price for a specific product and retailer
   */
  public static getPrice(retailerId: string, productId: string): number {
    const retailers = Database.getRetailers();
    const retailer = retailers.find(r => r.id === retailerId);
    const products = Database.getProducts();
    const product = products.find(p => p.id === productId);

    if (!product) return 0;
    if (retailer && retailer.customPrices && retailer.customPrices[productId] !== undefined) {
      return retailer.customPrices[productId];
    }
    return product.defaultPrice;
  }

  /**
   * Update Global Product Price with Relative Delta Shifting
   * If global price increases from 100 to 120 (+20), all retailers with custom prices
   * shift by +20 (e.g. 110 -> 130), preserving their individual margin difference.
   */
  public static updateGlobalPrice(
    productId: string,
    newDefaultPrice: number,
    adminId: string,
    adminName: string
  ): { success: boolean; delta: number; affectedRetailers: number } {
    const products = Database.getProducts();
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
      return { success: false, delta: 0, affectedRetailers: 0 };
    }

    const oldPrice = products[productIndex].defaultPrice;
    const delta = newDefaultPrice - oldPrice;

    // Update the product default price
    products[productIndex].defaultPrice = newDefaultPrice;
    Database.setProducts([...products]);

    // Apply delta to all retailers that have custom prices for this product
    let affectedCount = 0;
    const retailers = Database.getRetailers();
    const updatedRetailers = retailers.map(retailer => {
      if (retailer.customPrices && retailer.customPrices[productId] !== undefined) {
        const oldCustomPrice = retailer.customPrices[productId];
        const newCustomPrice = Math.max(0, oldCustomPrice + delta);
        affectedCount++;
        return {
          ...retailer,
          customPrices: {
            ...retailer.customPrices,
            [productId]: newCustomPrice
          }
        };
      }
      return retailer;
    });

    Database.setRetailers(updatedRetailers);

    // Record audit trail
    AuditService.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action: 'Updated Global Price',
      entityType: 'price',
      entityId: productId,
      field: 'defaultPrice',
      oldValue: oldPrice,
      newValue: newDefaultPrice,
      details: `Global price shifted by ${delta >= 0 ? '+' : ''}${delta}. ${affectedCount} retailer custom prices automatically shifted.`
    });

    return { success: true, delta, affectedRetailers: affectedCount };
  }

  /**
   * Set or remove an individual custom price for a specific retailer
   */
  public static setRetailerPrice(
    retailerId: string,
    productId: string,
    price: number | null, // null removes custom override
    adminId: string,
    adminName: string
  ): boolean {
    const retailers = Database.getRetailers();
    const retailerIndex = retailers.findIndex(r => r.id === retailerId);
    if (retailerIndex === -1) return false;

    const retailer = retailers[retailerIndex];
    const oldPrice = retailer.customPrices?.[productId];
    const newCustomPrices = { ...(retailer.customPrices || {}) };

    if (price === null || isNaN(price)) {
      delete newCustomPrices[productId];
    } else {
      newCustomPrices[productId] = price;
    }

    retailers[retailerIndex] = {
      ...retailer,
      customPrices: newCustomPrices
    };

    Database.setRetailers([...retailers]);

    AuditService.log({
      userId: adminId,
      userName: adminName,
      userRole: 'admin',
      action: 'Set Retailer Custom Price',
      entityType: 'price',
      entityId: `${retailerId}_${productId}`,
      field: 'customPrice',
      oldValue: oldPrice,
      newValue: price,
      details: `Custom price for ${retailer.name} set to ${price !== null ? price : 'Default'}`
    });

    return true;
  }
}
