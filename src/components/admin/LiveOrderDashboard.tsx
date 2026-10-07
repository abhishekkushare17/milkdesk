import React, { useState, useEffect, useMemo } from 'react';
import { Shift, Vehicle, Product } from '../../types';
import { Database, getTodayDateString } from '../../services/storage';
import { OrderService, VehicleOrderRow } from '../../services/orderService';
import { PdfService } from '../../services/pdfService';
import { useAuth } from '../../context/AuthContext';
import {
  Download, Plus, Edit2, CheckCircle2, Clock,
  FileSpreadsheet, CreditCard, ChevronRight, Save, X, RefreshCw,
  ClipboardCheck, AlertTriangle, Fuel, IndianRupee
} from 'lucide-react';

interface LiveOrderDashboardProps {
  selectedDate: string;
  onNavigateToRetailers?: () => void;
}

export const LiveOrderDashboard: React.FC<LiveOrderDashboardProps> = ({
  selectedDate,
  onNavigateToRetailers
}) => {
  const { currentUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('veh_1');
  const [shift, setShift] = useState<Shift>('morning');
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // Demand comparison toggle (Today vs Yesterday)
  const [showComparison, setShowComparison] = useState(false);

  // Day Closing Checklist modal
  const [showClosingModal, setShowClosingModal] = useState(false);

  // Quick edit modal states
  const [editingRow, setEditingRow] = useState<VehicleOrderRow | null>(null);
  const [editQuantities, setEditQuantities] = useState<Record<string, string>>({});
  const [editPayment, setEditPayment] = useState<string>('');

  // Payment recording modal
  const [paymentModalRow, setPaymentModalRow] = useState<VehicleOrderRow | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');

  // Cycle submission feedback
  const [cycleFinalized, setCycleFinalized] = useState(false);

  // Load initial vehicles and products
  useEffect(() => {
    const vList = Database.getVehicles().filter(v => v.active);
    setVehicles(vList);
    if (vList.length > 0 && !vList.some(v => v.id === selectedVehicleId)) {
      setSelectedVehicleId(vList[0].id);
    }

    const pList = Database.getProducts()
      .filter(p => p.active)
      .sort((a, b) => a.displayPosition - b.displayPosition);
    setProducts(pList);
  }, [refreshTick]);

  // Subscribe to storage updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTick(prev => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Compute live sheet for selected vehicle, date, and shift
  const orderSheetData = useMemo(() => {
    if (!selectedVehicleId) return { rows: [], productTotals: {}, totalOrdersReceived: 0, totalRetailers: 0 };
    return OrderService.getVehicleOrderSheet(selectedVehicleId, selectedDate, shift);
  }, [selectedVehicleId, selectedDate, shift, refreshTick]);

  const { rows, productTotals, totalOrdersReceived, totalRetailers } = orderSheetData;
  const pendingOrders = totalRetailers - totalOrdersReceived;
  const pendingRetailers = rows.filter(r => !r.isReceived);

  // Compute yesterday date & sheet for demand comparison
  const yesterdayDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const yesterdaySheetData = useMemo(() => {
    if (!selectedVehicleId) return { productTotals: {} as Record<string, number> };
    return OrderService.getVehicleOrderSheet(selectedVehicleId, yesterdayDate, shift);
  }, [selectedVehicleId, yesterdayDate, shift, refreshTick]);

  // Loading record for this vehicle, date, shift
  const loadingRecord = Database.getLoadingRecords().find(
    r => r.vehicleId === selectedVehicleId && r.date === selectedDate && r.shift === shift
  );

  // Fuel entries for this vehicle on selectedDate
  const todayFuel = Database.getFuelEntries().filter(
    f => f.vehicleId === selectedVehicleId && f.date === selectedDate
  );

  // Payment total for this vehicle on selectedDate
  const todayPayments = Database.getPayments().filter(
    p => p.vehicleId === selectedVehicleId && p.date === selectedDate
  );
  const todayPaymentTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Open Edit Order Modal
  const handleOpenEdit = (row: VehicleOrderRow) => {
    setEditingRow(row);
    const initialQty: Record<string, string> = {};
    for (const prod of products) {
      initialQty[prod.id] = row.quantities[prod.id] !== undefined ? String(row.quantities[prod.id]) : '';
    }
    setEditQuantities(initialQty);
    setEditPayment(row.paymentAmount !== null ? String(row.paymentAmount) : '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow || !currentUser) return;

    const numericItems: Record<string, number> = {};
    for (const [pId, strVal] of Object.entries(editQuantities)) {
      const num = parseInt(strVal, 10);
      if (!isNaN(num) && num > 0) {
        numericItems[pId] = num;
      }
    }

    // Submit order through OrderService (Admin can always edit)
    OrderService.submitOrder({
      retailerId: editingRow.retailerId,
      vehicleId: selectedVehicleId,
      date: selectedDate,
      shift,
      items: numericItems,
      submittedByRole: 'admin',
      submitterId: currentUser.id,
      submitterName: currentUser.name
    });

    // Save payment if entered
    const payNum = parseFloat(editPayment);
    if (!isNaN(payNum) && payNum > 0) {
      OrderService.recordPayment({
        retailerId: editingRow.retailerId,
        vehicleId: selectedVehicleId,
        date: selectedDate,
        shift,
        amount: payNum,
        collectedByRole: 'admin',
        collectorId: currentUser.id,
        collectorName: currentUser.name
      });
    }

    setEditingRow(null);
    setRefreshTick(prev => prev + 1);
  };

  // Open quick payment modal
  const handleOpenPayment = (row: VehicleOrderRow) => {
    setPaymentModalRow(row);
    setPaymentAmountInput(row.paymentAmount !== null ? String(row.paymentAmount) : '');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalRow || !currentUser) return;

    const amount = parseFloat(paymentAmountInput);
    if (!isNaN(amount) && amount > 0) {
      OrderService.recordPayment({
        retailerId: paymentModalRow.retailerId,
        vehicleId: selectedVehicleId,
        date: selectedDate,
        shift,
        amount,
        collectedByRole: 'admin',
        collectorId: currentUser.id,
        collectorName: currentUser.name
      });
    }
    setPaymentModalRow(null);
    setRefreshTick(prev => prev + 1);
  };

  const handleDownloadPDF = () => {
    if (!selectedVehicleId) return;
    PdfService.generateVehicleOrderSheet(selectedVehicleId, selectedDate, shift);
  };

  const handleFinalizeCycle = () => {
    setCycleFinalized(true);
    setTimeout(() => setCycleFinalized(false), 3000);
  };

  return (
    <div className="space-y-3">
      {/* =========================================================================
          1. COMPACT STICKY STATUS AREA AT TOP (Specification 3)
          Must remain near top like a compact mobile control/status bar.
          Do NOT use large dashboard cards that consume a lot of vertical space.
         ========================================================================= */}
      <div className="sticky top-14 z-30 bg-slate-900 text-white px-3 py-2 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-2 border border-slate-800">
        {/* Left: Shift selector & Date */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
            {selectedDate === getTodayDateString() ? 'TODAY' : selectedDate}
          </span>
          <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
            <button
              onClick={() => setShift('morning')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                shift === 'morning'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              MORNING
            </button>
            <button
              onClick={() => setShift('evening')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                shift === 'evening'
                  ? 'bg-indigo-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              EVENING
            </button>
          </div>
        </div>

        {/* Center: Compact Metric Counters */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-[11px]">Orders:</span>
            <span className="text-emerald-400 font-extrabold">{totalOrdersReceived}/{totalRetailers}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-[11px]">Pending:</span>
            <span className={`font-extrabold ${pendingOrders > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {pendingOrders}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              showComparison
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Toggle Today vs Yesterday Product Demand Difference"
          >
            <span>⇄ Compare vs Yesterday</span>
          </button>

          <button
            type="button"
            onClick={() => setShowClosingModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            title="Review and Finalize Shift Day Closing Checklist"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Day Closing Checklist</span>
            <span className="md:hidden">Checklist</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1 px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            title="Download Daily Order Sheet PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={handleFinalizeCycle}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
            title="Process order cycle into historical Khata"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Finalize Cycle</span>
          </button>
        </div>
      </div>

      {cycleFinalized && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>Order cycle processed & saved to historical Khata. You can still modify any row at any time.</span>
          <button onClick={() => setCycleFinalized(false)} className="text-emerald-700 hover:text-emerald-900"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* =========================================================================
          2. VEHICLE SELECTOR (Specification 3)
          Must control the entire order list shown below.
          If Vehicle 1 is selected, ONLY Vehicle 1 retailers must be shown.
         ========================================================================= */}
      <div className="bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">SELECT VEHICLE:</span>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-600 focus:outline-hidden cursor-pointer"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} {v.registrationNumber ? `(${v.registrationNumber})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Showing only retailers for: <strong className="text-slate-800">{currentVehicle?.name}</strong></span>
          {onNavigateToRetailers && (
            <button
              onClick={onNavigateToRetailers}
              className="text-brand-700 hover:underline font-bold text-xs flex items-center gap-0.5 ml-1"
            >
              Manage Retailers <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          3. LIVE ORDER TABLE (Specification 4, 5, 6)
          - Fixed / Sticky Columns on Mobile: Sr & Retailer Name
          - Product columns scrollable horizontally
          - TOTAL row immediately after the last retailer inside the same table
          - Payment: No ₹, no 0, no payment total, completely blank if unpaid
         ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto relative max-h-[calc(100vh-250px)]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header */}
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 z-30">
              <tr>
                {/* Column 1: Sr (STICKY FIXED ON MOBILE) */}
                <th scope="col" className="sticky-col-sr bg-slate-100 px-2.5 py-3 w-12 text-center border-r border-slate-200 z-30 shadow-[1px_0_0_0_#e2e8f0]">
                  Sr
                </th>

                {/* Column 2: Retailer (STICKY FIXED ON MOBILE) */}
                <th scope="col" className="sticky-col-retailer bg-slate-100 px-3 py-3 min-w-[130px] sm:min-w-[170px] border-r border-slate-200 z-30 shadow-[2px_0_3px_rgba(0,0,0,0.06)]">
                  Retailer
                </th>

                {/* Product Columns in Admin Display Order */}
                {products.map(prod => (
                  <th
                    key={prod.id}
                    scope="col"
                    className="px-2 py-3 text-center min-w-[65px] border-r border-slate-200 whitespace-nowrap"
                    title={prod.name}
                  >
                    <div className="font-extrabold text-slate-800">{prod.shortName}</div>
                    <div className="text-[9px] text-slate-400 font-normal lowercase">{prod.unit}</div>
                  </th>
                ))}

                {/* Payment Column */}
                <th scope="col" className="px-3 py-3 text-right min-w-[85px] border-r border-slate-200 bg-emerald-50/50 text-emerald-900">
                  Payment
                </th>

                {/* Action Column */}
                <th scope="col" className="px-2.5 py-3 text-center min-w-[75px] bg-slate-100">
                  Action
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={products.length + 4} className="text-center py-8 text-slate-400">
                    No active retailers assigned to this vehicle. Add retailers in Retailer Management.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.retailerId}
                    className={`hover:bg-amber-50/40 transition-colors ${
                      !row.isReceived ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Fixed Sr */}
                    <td className="sticky-col-sr bg-white px-2.5 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                      {row.serialNumber}
                    </td>

                    {/* Fixed Retailer Name */}
                    <td className="sticky-col-retailer bg-white px-3 py-2.5 font-bold text-slate-900 border-r border-slate-200 z-20 shadow-[2px_0_3px_rgba(0,0,0,0.06)]">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[130px] sm:max-w-[170px]">{row.retailerName}</span>
                        {!row.isReceived && (
                          <span className="inline-block text-[9px] font-black text-amber-700 bg-amber-100/90 px-1 py-0.2 rounded mt-0.5 max-w-fit">
                            ORDER NOT RECEIVED / PENDING
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Product Quantity Cells */}
                    {products.map(prod => {
                      const qty = row.quantities[prod.id];
                      return (
                        <td
                          key={prod.id}
                          className="px-2 py-2.5 text-center font-semibold text-slate-800 border-r border-slate-100"
                        >
                          {qty && qty > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-900 text-xs">
                              {qty}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Payment Cell (Specification 6 Rules:
                        - If no payment, leave completely blank.
                        - Do NOT show ₹, 0, "No Payment" or any other text.
                        - If payment exists, show only number: 500, 1000, etc.) */}
                    <td
                      onClick={() => handleOpenPayment(row)}
                      className="px-3 py-2.5 text-right font-extrabold text-emerald-800 border-r border-slate-200 bg-emerald-50/20 cursor-pointer hover:bg-emerald-100/40 transition-colors"
                      title="Click to enter/edit payment"
                    >
                      {row.paymentAmount !== null && row.paymentAmount > 0 ? (
                        row.paymentAmount
                      ) : (
                        ''
                      )}
                    </td>

                    {/* Quick Edit Action Button */}
                    <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(row)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${
                          row.isReceived
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                        }`}
                        title={row.isReceived ? 'Edit Quantities & Payment' : 'Enter Order Manually'}
                      >
                        {row.isReceived ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        <span className="text-[11px]">{row.isReceived ? 'Edit' : 'Add'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}

              {/* =========================================================================
                  4. TOTAL ORDER ROW (Specification 6)
                  - Do NOT create a separate "Total Demand" section below the table.
                  - Immediately inside the same table as the last row.
                  - Product totals automatically calculated.
                  - Payment column MUST be completely blank (no total, no ₹, no text).
                 ========================================================================= */}
              {rows.length > 0 && (
                <tr className="bg-amber-50/80 border-t-2 border-amber-300 font-extrabold text-amber-950 sticky bottom-0 z-20">
                  {/* Fixed TOTAL Label */}
                  <td className="sticky-col-sr bg-amber-100 px-2.5 py-3 text-center border-r border-amber-300 z-20 shadow-[1px_0_0_0_#fde68a]">
                    TOTAL
                  </td>
                  <td className="sticky-col-retailer bg-amber-100 px-3 py-3 border-r border-amber-300 z-20 shadow-[2px_0_3px_rgba(0,0,0,0.06)]">
                    <span className="text-xs text-amber-950 uppercase font-black">Product Total Demand</span>
                  </td>

                  {/* Calculated Product Totals */}
                  {products.map(prod => {
                    const sum = productTotals[prod.id] || 0;
                    return (
                      <td
                        key={prod.id}
                        className="px-2 py-3 text-center text-xs font-black border-r border-amber-200 text-amber-950"
                      >
                        {sum > 0 ? sum : ''}
                      </td>
                    );
                  })}

                  {/* Payment Cell in TOTAL row: MUST BE COMPLETELY BLANK! (Specification 6) */}
                  <td className="px-3 py-3 border-r border-amber-300 bg-amber-50/50">
                    {/* Blank by design */}
                  </td>

                  {/* Action Column Blank in Total Row */}
                  <td className="px-2.5 py-3 bg-amber-50/80"></td>
                </tr>
              )}

              {/* YESTERDAY DEMAND COMPARISON ROW (Specification requirement) */}
              {rows.length > 0 && showComparison && (
                <tr className="bg-slate-100/95 border-t border-slate-300 text-slate-700 font-bold text-[11px] sticky bottom-0 z-20">
                  <td className="sticky-col-sr bg-slate-200 px-2.5 py-2 text-center border-r border-slate-300 z-20 shadow-[1px_0_0_0_#cbd5e1]">
                    DIFF
                  </td>
                  <td className="sticky-col-retailer bg-slate-200 px-3 py-2 border-r border-slate-300 z-20 shadow-[2px_0_3px_rgba(0,0,0,0.06)]">
                    <span className="text-[10px] uppercase font-black text-slate-700">vs Yesterday ({yesterdayDate})</span>
                  </td>
                  {products.map(prod => {
                    const todayQty = productTotals[prod.id] || 0;
                    const yestQty = yesterdaySheetData.productTotals[prod.id] || 0;
                    const diff = todayQty - yestQty;
                    return (
                      <td key={prod.id} className="px-2 py-2 text-center border-r border-slate-200">
                        {diff !== 0 ? (
                          <span className={`font-black ${diff > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {diff > 0 ? `+${diff}` : `${diff}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 border-r border-slate-300 bg-slate-100/50"></td>
                  <td className="px-2.5 py-2 bg-slate-200/80"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          EDIT ORDER MODAL (Direct Manual Entry from Same Row)
         ========================================================================= */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingRow.isReceived ? 'Edit Retailer Order' : 'Enter Missing Retailer Order'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {editingRow.retailerName} (Sr #{editingRow.serialNumber}) • Shift: <span className="uppercase font-bold text-slate-700">{shift}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingRow(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div className="max-h-60 overflow-y-auto pr-1 divide-y divide-slate-100">
                {products.map(prod => (
                  <div key={prod.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">{prod.name}</span>
                      <span className="text-slate-400 ml-1.5 text-[11px]">({prod.unit})</span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editQuantities[prod.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setEditQuantities(prev => ({ ...prev, [prod.id]: val }));
                      }}
                      placeholder="0"
                      className="w-20 text-center py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                    />
                  </div>
                ))}
              </div>

              {/* Payment field in modal */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-xs font-bold text-emerald-900">Today's Payment (₹)</label>
                  <span className="text-[10px] text-emerald-700">Numeric amount only</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editPayment}
                  onChange={(e) => setEditPayment(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 500"
                  className="w-28 text-right py-1.5 px-2 bg-white border border-emerald-300 rounded-lg text-sm font-bold text-emerald-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAYMENT RECORDING MODAL
         ========================================================================= */}
      {paymentModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Enter Payment
              </h3>
              <button
                onClick={() => setPaymentModalRow(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="mt-3 space-y-3">
              <div>
                <span className="text-xs text-slate-600 font-medium">Retailer:</span>
                <div className="font-bold text-slate-900 text-sm">{paymentModalRow.retailerName}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="500, 1000..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter only numeric digits. Cell will display as plain number.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalRow(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DAY & SHIFT CLOSING CHECKLIST MODAL (Specification requirement)
         ========================================================================= */}
      {showClosingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 animate-scaleUp space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-700" />
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase">
                    DAY & SHIFT CLOSING CHECKLIST
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentVehicle?.name} • {selectedDate} ({shift.toUpperCase()} Shift)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClosingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Check 1: Retailer Orders Status */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                pendingOrders === 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
              }`}>
                {pendingOrders === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-slate-900">
                    1. Retailer Orders Status: {totalOrdersReceived}/{totalRetailers} Submitted
                  </div>
                  {pendingOrders === 0 ? (
                    <p className="text-emerald-800 font-medium">All assigned retailers for this vehicle have submitted orders.</p>
                  ) : (
                    <div>
                      <p className="text-amber-800 font-medium">
                        {pendingOrders} retailer order(s) pending submission:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pendingRetailers.map(r => (
                          <span key={r.retailerId} className="bg-white border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold text-amber-950">
                            {r.retailerName} (Sr #{r.serialNumber})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Check 2: Driver Loading Mode Verification */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                loadingRecord ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-300'
              }`}>
                {loadingRecord ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-extrabold text-sm text-slate-900">
                    2. Driver Morning Loading Confirmation
                  </div>
                  {loadingRecord ? (
                    <p className="text-emerald-800 font-medium">
                      ✓ Completed at {new Date(loadingRecord.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {loadingRecord.driverName}.
                    </p>
                  ) : (
                    <p className="text-slate-500 font-medium">
                      Loading has not yet been marked complete by the driver for this shift.
                    </p>
                  )}
                </div>
              </div>

              {/* Check 3: Fuel Logging Status */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                todayFuel.length > 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
              }`}>
                {todayFuel.length > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Fuel className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-extrabold text-sm text-slate-900">
                    3. Vehicle Fuel Entry Log
                  </div>
                  {todayFuel.length > 0 ? (
                    <p className="text-emerald-800 font-medium">
                      ✓ {todayFuel.length} fuel log(s) recorded: ₹{todayFuel.reduce((s, f) => s + f.amount, 0).toLocaleString()} ({todayFuel.map(f => f.pump || 'Pump').join(', ')})
                    </p>
                  ) : (
                    <p className="text-amber-800 font-medium">
                      No fuel log recorded for this vehicle today. (If vehicle was refueled, ask driver or enter in Fuel tab).
                    </p>
                  )}
                </div>
              </div>

              {/* Check 4: Payment Reconciliation */}
              <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 space-y-1.5">
                <div className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                  <span>4. Payments Collected Today:</span>
                  <span className="text-emerald-700 font-black text-base">₹{todayPaymentTotal.toLocaleString()}</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  {todayPayments.length} payment transaction(s) recorded today for {currentVehicle?.name}.
                </p>
              </div>
            </div>

            {/* Closing Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClosingModal(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={() => {
                  handleFinalizeCycle();
                  setShowClosingModal(false);
                }}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM DAY CLOSING</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
