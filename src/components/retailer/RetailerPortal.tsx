import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shift, Product, Order, Retailer } from '../../types';
import { Database, getTodayDateString } from '../../services/storage';
import { OrderService } from '../../services/orderService';
import { PricingService } from '../../services/pricingService';
import { PdfService } from '../../services/pdfService';
import {
  ShoppingBag, FileText, Download, CheckCircle, AlertTriangle,
  Clock, IndianRupee, Bell, ChevronRight, X, ArrowRight, RotateCcw, AlertCircle
} from 'lucide-react';

export const RetailerPortal: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'order' | 'khata' | 'history'>('order');
  const [selectedShift, setSelectedShift] = useState<Shift>('morning');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  const [retailer, setRetailer] = useState<Retailer | null>(() => {
    if (!currentUser?.retailerId) return null;
    return Database.getRetailers().find(x => x.id === currentUser.retailerId) || null;
  });
  const [products, setProducts] = useState<Product[]>(() => {
    return Database.getProducts()
      .filter(p => p.active)
      .sort((a, b) => a.displayPosition - b.displayPosition);
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadRetailerData = () => {
    if (!currentUser || !currentUser.retailerId) return;
    const r = Database.getRetailers().find(x => x.id === currentUser.retailerId);
    if (r) setRetailer(r);

    const pList = Database.getProducts()
      .filter(p => p.active)
      .sort((a, b) => a.displayPosition - b.displayPosition);
    setProducts(pList);
  };

  useEffect(() => {
    loadRetailerData();
  }, [currentUser]);

  // Find most recent past order for smart "Repeat Last Order"
  const previousOrders = useMemo(() => {
    if (!retailer?.id) return [];
    return Database.getOrders()
      .filter(o => o.retailerId === retailer.id && (o.date < selectedDate || (o.date === selectedDate && o.shift !== selectedShift)))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.shift === 'evening' ? 1 : -1));
  }, [retailer?.id, selectedDate, selectedShift]);

  const lastOrder = previousOrders.length > 0 ? previousOrders[0] : null;

  // Smart unusual quantity detector: checks if any product quantity is abnormally high compared to past order
  const unusualItems = useMemo(() => {
    const list: { productName: string; enteredQty: number; previousQty: number; unit: string }[] = [];
    for (const [pId, val] of Object.entries(quantities)) {
      const qty = parseInt(val, 10);
      if (!isNaN(qty) && qty > 0) {
        const prod = products.find(p => p.id === pId);
        const prevQty = lastOrder?.items?.[pId] || 0;
        // Unusual if qty >= 2.5x previous (if previous was > 0) or qty >= 25 when previous was <= 8
        const isUnusual = (prevQty > 0 && qty >= prevQty * 2.5) || (prevQty <= 8 && qty >= 25);
        if (isUnusual) {
          list.push({
            productName: prod?.name || pId,
            enteredQty: qty,
            previousQty: prevQty,
            unit: prod?.unit || 'units'
          });
        }
      }
    }
    return list;
  }, [quantities, lastOrder, products]);

  if (!currentUser || !currentUser.retailerId || !retailer) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Retailer account profile not linked. Please contact Admin.
      </div>
    );
  }

  // Check if order already submitted for selectedShift today
  const shiftEligibility = OrderService.canRetailerOrder(retailer.id, selectedDate, selectedShift);
  const existingOrdersToday = Database.getOrders().filter(o => o.retailerId === retailer.id && o.date === selectedDate);
  const existingShiftOrder = existingOrdersToday.find(o => o.shift === selectedShift);

  // Compute live bill/khata for the selected date
  const khata = OrderService.getRetailerDailyKhata(retailer.id, selectedDate);

  const handleRepeatLastOrder = () => {
    setSubmitError(null);
    if (!lastOrder || !lastOrder.items || Object.keys(lastOrder.items).length === 0) {
      setSubmitError('No previous order found to repeat.');
      return;
    }

    const newQuantities: Record<string, string> = {};
    let count = 0;
    for (const [pId, qty] of Object.entries(lastOrder.items)) {
      if (qty > 0) {
        newQuantities[pId] = String(qty);
        count++;
      }
    }

    if (count === 0) {
      setSubmitError('Last order had no items to repeat.');
      return;
    }

    setQuantities(newQuantities);
    setSubmitSuccess(`Loaded ${count} items from previous order (${lastOrder.date} - ${lastOrder.shift.toUpperCase()})`);
    setTimeout(() => setSubmitSuccess(null), 3500);
  };

  const handleReviewOrder = () => {
    setSubmitError(null);
    let hasItems = false;
    for (const val of Object.values(quantities)) {
      if (parseInt(val, 10) > 0) {
        hasItems = true;
        break;
      }
    }
    if (!hasItems) {
      setSubmitError('Please enter quantity for at least one product.');
      return;
    }
    setShowReviewModal(true);
  };

  const handleConfirmSubmit = () => {
    setSubmitError(null);
    const numericItems: Record<string, number> = {};
    for (const [pId, val] of Object.entries(quantities)) {
      const n = parseInt(val, 10);
      if (!isNaN(n) && n > 0) {
        numericItems[pId] = n;
      }
    }

    const res = OrderService.submitOrder({
      retailerId: retailer.id,
      vehicleId: retailer.vehicleId,
      date: selectedDate,
      shift: selectedShift,
      items: numericItems,
      submittedByRole: 'retailer',
      submitterId: currentUser.id,
      submitterName: retailer.name
    });

    if (!res.success) {
      setSubmitError(res.error || 'Failed to submit order.');
      setShowReviewModal(false);
      return;
    }

    setShowReviewModal(false);
    setSubmitSuccess(`Order for ${selectedShift.toUpperCase()} shift submitted successfully!`);
    setQuantities({});
    loadRetailerData();
    setTimeout(() => setSubmitSuccess(null), 4000);
  };

  const handleDownloadBillPDF = () => {
    PdfService.generateRetailerBillPDF(retailer.id, selectedDate);
  };

  // Review list calculation
  const reviewItems = Object.entries(quantities)
    .map(([pId, val]) => {
      const qty = parseInt(val, 10);
      if (!isNaN(qty) && qty > 0) {
        const prod = products.find(p => p.id === pId);
        const rate = PricingService.getPrice(retailer.id, pId);
        return {
          id: pId,
          name: prod?.name || pId,
          unit: prod?.unit || 'Litre',
          qty,
          rate,
          subtotal: qty * rate
        };
      }
      return null;
    })
    .filter(Boolean) as { id: string; name: string; unit: string; qty: number; rate: number; subtotal: number }[];

  const reviewEstimatedTotal = reviewItems.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12">
      {/* Retailer Top Greeting & Balance Due Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-800 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-amber-800/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">Retailer Portal</span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Hello, {retailer.name}</h2>
          <p className="text-xs text-amber-200 mt-1 font-medium">Sr #{retailer.serialNumber} • Mobile: {retailer.phone}</p>
        </div>

        <div className="bg-black/35 backdrop-blur-md border border-amber-500/30 px-4 py-2.5 rounded-xl text-right shadow-inner">
          <div className="text-[10px] uppercase font-extrabold tracking-wider text-amber-200">Current Outstanding Due</div>
          <div className="text-2xl font-black text-amber-300 drop-shadow-xs">₹{retailer.balanceDue.toLocaleString()}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
        <button
          onClick={() => setActiveTab('order')}
          className={`flex-1 py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'order'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Place Order</span>
        </button>

        <button
          onClick={() => setActiveTab('khata')}
          className={`flex-1 py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'khata'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Daily Bill & Khata</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>My Orders</span>
        </button>
      </div>

      {/* TAB 1: PLACE ORDER (Specification 8 & 9) */}
      {activeTab === 'order' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              PLACE ORDER FOR TOMORROW MORNING / EVENING
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter required item quantities. Next-morning delivery orders are typically placed 3 PM - 5 PM.
            </p>
          </div>

          {submitSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* STEP 1: Select Delivery Shift (Specification 9) */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              STEP 1: Select Delivery Shift
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedShift('morning')}
                className={`py-3 px-4 rounded-xl border-2 text-center font-extrabold text-sm transition-all flex flex-col items-center gap-1 ${
                  selectedShift === 'morning'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>AM (Morning - Default)</span>
                <span className="text-[10px] font-medium opacity-75">~99% standard next-morning supply</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift('evening')}
                className={`py-3 px-4 rounded-xl border-2 text-center font-extrabold text-sm transition-all flex flex-col items-center gap-1 ${
                  selectedShift === 'evening'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>PM (Evening)</span>
                <span className="text-[10px] font-medium opacity-75">Evening delivery supply</span>
              </button>
            </div>
          </div>

          {/* If already submitted for this shift, show lock warning */}
          {existingShiftOrder ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
              <div className="font-extrabold flex items-center gap-1.5 text-sm text-amber-950">
                <CheckCircle className="w-4 h-4 text-amber-700" />
                {selectedShift.toUpperCase()} Order Already Submitted
              </div>
              <p>
                You have already submitted your {selectedShift} order for today. Once submitted, orders are permanently locked for the retailer.
              </p>
              <p className="font-bold text-slate-800">
                Need to make a change? Please contact Admin directly.
              </p>
            </div>
          ) : (
            <>
              {/* STEP 2: Direct numeric inputs according to Admin Display Order (Specification 9: NO +/- buttons) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    STEP 2: Enter Quantities
                  </label>
                  {lastOrder && (
                    <button
                      type="button"
                      onClick={handleRepeatLastOrder}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-bold text-xs rounded-lg transition-colors border border-amber-300/80 shadow-xs"
                      title={`Load items from previous order (${lastOrder.date})`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>Repeat Last Order</span>
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {products.map(p => {
                    const price = PricingService.getPrice(retailer.id, p.id);

                    return (
                      <div
                        key={p.id}
                        className="p-3 sm:p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>Rate: ₹{price} / {p.unit}</span>
                            <span className="font-mono text-slate-400 font-semibold">({p.shortName})</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {/* Direct numeric text input with mobile numeric keypad (NO +/- buttons) */}
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={quantities[p.id] || ''}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                              setQuantities(prev => ({ ...prev, [p.id]: cleanVal }));
                            }}
                            className="w-20 text-center py-2 px-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-inner"
                          />
                          <span className="text-xs font-bold text-slate-500 w-10 text-left truncate">{p.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Order Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleReviewOrder}
                  className="w-full py-3.5 px-4 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-amber-950/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>REVIEW ORDER</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: DAILY BILL / KHATA (Specification 11) */}
      {activeTab === 'khata' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Daily Bill & Khata Breakdown
              </h3>
              <p className="text-xs text-slate-500">Transparent day-wise ledger and pending balances</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              />
              <button
                onClick={handleDownloadBillPDF}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                title="Download Bill as PDF"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Today's Order Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
              1. What was ordered ({selectedDate}):
            </h4>
            {khata.items.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                No orders recorded for this date.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {khata.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{item.productName}</span>
                      <span className="text-slate-500 ml-2">({item.quantity} {item.unit} @ ₹{item.rate})</span>
                    </div>
                    <span className="font-bold text-slate-900">₹{item.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Khata Computation Box (Specification 11 format) */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Today's Order Amount:</span>
              <span className="font-bold text-slate-900 text-sm">₹{khata.todayOrderAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Previous Due (Baki):</span>
              <span className="font-bold text-amber-700 text-sm">₹{khata.previousPendingAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>TOTAL:</span>
              <span className="text-base text-brand-900">₹{khata.totalAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-emerald-700">
              <span>Today's Payment:</span>
              <span className="font-extrabold text-sm">₹{khata.todayPayment.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center font-black text-rose-700 text-sm pt-1.5 border-t border-slate-200">
              <span>REMAINING:</span>
              <span className="text-lg text-rose-700">₹{khata.remainingAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY ORDERS HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">
            My Submitted Orders
          </h3>

          <div className="space-y-3">
            {Database.getOrders()
              .filter(o => o.retailerId === retailer.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(ord => (
                <div key={ord.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{ord.date}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      ord.shift === 'morning' ? 'bg-amber-100 text-amber-900' : 'bg-indigo-100 text-indigo-900'
                    }`}>
                      {ord.shift} Shift
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(ord.items).map(([pId, q]) => {
                      const p = products.find(x => x.id === pId);
                      return (
                        <span key={pId} className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-800 font-medium">
                          {p?.shortName || pId}: <strong className="font-black">{q}</strong>
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex justify-between pt-1 border-t border-slate-200/60 text-slate-600">
                    <span>Total Amount:</span>
                    <span className="font-extrabold text-slate-900">₹{ord.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          REVIEW ORDER MODAL (Specification 9 Confirmation Warning Screen)
          WARNING: Once submitted, you cannot edit this order. Contact Admin for changes.
         ========================================================================= */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base uppercase">
                CONFIRM YOUR ORDER
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-2.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-800 flex justify-between">
                <span>Delivery Shift:</span>
                <span className="uppercase text-brand-800">{selectedShift}</span>
              </div>

              {/* Product Quantities list */}
              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto text-xs">
                {reviewItems.map(item => (
                  <div key={item.id} className="py-2 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <span className="text-slate-400 ml-1 text-[11px]">({item.unit})</span>
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">{item.qty}</span>
                  </div>
                ))}
              </div>

              {/* Total Estimated Value */}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold">
                <span className="text-slate-600">Estimated Order Total:</span>
                <span className="text-brand-900 font-black text-sm">₹{reviewEstimatedTotal.toLocaleString()}</span>
              </div>

              {/* Smart Unusual Quantity Warning */}
              {unusualItems.length > 0 && (
                <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-950 text-xs space-y-1.5 animate-fadeIn">
                  <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>⚠️ Unusual Quantity Warning</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    The following quantities are significantly higher than your previous orders:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] font-semibold text-amber-950 pl-1">
                    {unusualItems.map((u, i) => (
                      <li key={i}>
                        {u.productName}: <strong className="text-amber-900">{u.enteredQty} {u.unit}</strong> (Previous: {u.previousQty} {u.unit})
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-amber-700 italic">
                    If this is intended for a special occasion/festival, please proceed. Otherwise click Cancel to edit.
                  </p>
                </div>
              )}

              {/* Mandatory Warning Notice from Specification 9 */}
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black">WARNING:</strong> Once submitted, you cannot edit this order. Contact Admin for any changes.
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="flex-1 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-extrabold shadow-md shadow-brand-900/15 transition-colors"
                >
                  CONFIRM & SUBMIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
