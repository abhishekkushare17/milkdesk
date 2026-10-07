import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shift, Driver, Vehicle, Product } from '../../types';
import { Database, getTodayDateString } from '../../services/storage';
import { OrderService, VehicleOrderRow } from '../../services/orderService';
import { ExpenseService } from '../../services/expenseService';
import { PdfService } from '../../services/pdfService';
import {
  Truck, Fuel, Wrench, Download, CreditCard,
  CheckCircle2, Plus, Calendar, X, AlertCircle,
  CheckSquare, Square, FileSpreadsheet, Lock, Clock, PackageCheck
} from 'lucide-react';

export const DriverPortal: React.FC = () => {
  const { currentUser } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(() => {
    if (!currentUser?.driverId) return null;
    return Database.getDrivers().find(x => x.id === currentUser.driverId) || null;
  });
  const [vehicle, setVehicle] = useState<Vehicle | null>(() => {
    if (!currentUser?.driverId) return null;
    const d = Database.getDrivers().find(x => x.id === currentUser.driverId);
    if (!d?.assignedVehicleId) return null;
    return Database.getVehicles().find(x => x.id === d.assignedVehicleId) || null;
  });
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [shift, setShift] = useState<Shift>('morning');
  const [products, setProducts] = useState<Product[]>(() => {
    return Database.getProducts()
      .filter(p => p.active)
      .sort((a, b) => a.displayPosition - b.displayPosition);
  });

  // Driver tabs: Loading Mode (Specification requirement), Demand Sheet, Fuel, Expenses
  const [activeTab, setActiveTab] = useState<'loading' | 'demand' | 'fuel' | 'expenses'>('loading');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showComparison, setShowComparison] = useState(false);

  // Payment entry modal state (only available if canCollectPayment is true)
  const [paymentRow, setPaymentRow] = useState<VehicleOrderRow | null>(null);
  const [payAmountInput, setPayAmountInput] = useState<string>('');

  // Fuel modal
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelAmt, setFuelAmt] = useState('1500');
  const [fuelLitres, setFuelLitres] = useState('');
  const [fuelPump, setFuelPump] = useState('');

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expType, setExpType] = useState('Repair');
  const [repairedWhat, setRepairedWhat] = useState('');
  const [expAmt, setExpAmt] = useState('500');
  const [expNotes, setExpNotes] = useState('');

  const [refreshTick, setRefreshTick] = useState(0);

  const loadDriverData = () => {
    if (!currentUser || !currentUser.driverId) return;
    const d = Database.getDrivers().find(x => x.id === currentUser.driverId);
    if (d) {
      setDriver(d);
      if (d.assignedVehicleId) {
        const v = Database.getVehicles().find(x => x.id === d.assignedVehicleId);
        setVehicle(v || null);
      }
    }

    const pList = Database.getProducts()
      .filter(p => p.active)
      .sort((a, b) => a.displayPosition - b.displayPosition);
    setProducts(pList);
  };

  useEffect(() => {
    loadDriverData();
  }, [currentUser, refreshTick]);

  // Fetch demand table data for assigned vehicle ONLY
  const orderSheet = useMemo(() => {
    if (!vehicle?.id) return { rows: [], productTotals: {} as Record<string, number>, totalOrdersReceived: 0, totalRetailers: 0 };
    return OrderService.getVehicleOrderSheet(vehicle.id, selectedDate, shift);
  }, [vehicle?.id, selectedDate, shift, refreshTick]);

  const { rows, productTotals, totalOrdersReceived, totalRetailers } = orderSheet;
  const pendingOrdersCount = totalRetailers - totalOrdersReceived;

  // Total Demand Units across all products
  const totalDemandUnits = useMemo(() => {
    return Object.values(productTotals).reduce((sum, q) => sum + (q || 0), 0);
  }, [productTotals]);

  // Yesterday date & yesterday sheet for Smart Demand Comparison
  const yesterdayDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const yesterdaySheet = useMemo(() => {
    if (!vehicle?.id) return { rows: [], productTotals: {} as Record<string, number>, totalOrdersReceived: 0, totalRetailers: 0 };
    return OrderService.getVehicleOrderSheet(vehicle.id, yesterdayDate, shift);
  }, [vehicle?.id, yesterdayDate, shift, refreshTick]);

  if (!currentUser || !driver || !vehicle) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Driver account is not linked to an assigned vehicle. Please contact Admin.
      </div>
    );
  }

  const vehicleFuel = ExpenseService.getFuelByVehicle(vehicle.id);
  const vehicleExpenses = ExpenseService.getExpensesByVehicle(vehicle.id);

  // DRIVER PRIVACY REQUIREMENT: Driver can submit, but cannot view historical vehicle financial logs by default.
  // Driver sees only their own entries for today.
  const driverTodayFuel = vehicleFuel.filter(f => f.driverId === driver.id && f.date === selectedDate);
  const driverTodayExpenses = vehicleExpenses.filter(e => e.driverId === driver.id && e.date === selectedDate);

  const handleDownloadPDF = () => {
    PdfService.generateVehicleOrderSheet(vehicle.id, selectedDate, shift);
  };

  const handleSaveDriverPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRow || !driver.canCollectPayment) return;

    const amt = parseFloat(payAmountInput);
    if (!isNaN(amt) && amt > 0) {
      OrderService.recordPayment({
        retailerId: paymentRow.retailerId,
        vehicleId: vehicle.id,
        date: selectedDate,
        shift,
        amount: amt,
        collectedByRole: 'driver',
        collectorId: driver.id,
        collectorName: driver.name
      });
    }
    setPaymentRow(null);
    setRefreshTick(prev => prev + 1);
  };

  const handleSaveFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fuelAmt);
    if (isNaN(amt) || amt <= 0) return;

    ExpenseService.addFuelEntry({
      vehicleId: vehicle.id,
      driverId: driver.id,
      driverName: driver.name,
      date: selectedDate,
      amount: amt,
      litres: fuelLitres ? parseFloat(fuelLitres) : undefined,
      pump: fuelPump.trim(),
      userRole: 'driver'
    });

    setShowFuelModal(false);
    setRefreshTick(prev => prev + 1);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmt);
    if (isNaN(amt) || amt <= 0 || !repairedWhat.trim()) return;

    ExpenseService.addVehicleExpense({
      vehicleId: vehicle.id,
      driverId: driver.id,
      driverName: driver.name,
      date: selectedDate,
      expenseType: expType,
      description: repairedWhat.trim(),
      amount: amt,
      notes: expNotes.trim(),
      userRole: 'driver'
    });

    setShowExpenseModal(false);
    setRefreshTick(prev => prev + 1);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Top Header Box (Specification 17) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4" /> DRIVER DELIVERY CONSOLE
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1">
            VEHICLE: {vehicle.name} {vehicle.registrationNumber ? `(${vehicle.registrationNumber})` : ''}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">DRIVER: <strong className="text-white">{driver.name}</strong> ({driver.code})</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Shift Toggle */}
          <div className="bg-slate-800 p-1 rounded-xl flex border border-slate-700 text-xs font-bold">
            <button
              onClick={() => setShift('morning')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                shift === 'morning' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300'
              }`}
            >
              MORNING
            </button>
            <button
              onClick={() => setShift('evening')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                shift === 'evening' ? 'bg-indigo-400 text-slate-950 shadow-xs' : 'text-slate-300'
              }`}
            >
              EVENING
            </button>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-extrabold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Demand PDF</span>
          </button>
        </div>
      </div>

      {/* Driver Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold gap-1">
        <button
          onClick={() => setActiveTab('loading')}
          className={`flex-1 py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'loading'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Morning Loading</span>
        </button>

        <button
          onClick={() => setActiveTab('demand')}
          className={`flex-1 py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'demand'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Demand Sheet</span>
        </button>

        <button
          onClick={() => setActiveTab('fuel')}
          className={`flex-1 py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'fuel'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Fuel className="w-3.5 h-3.5" />
          <span>Fuel ({driverTodayFuel.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'expenses'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Repairs ({driverTodayExpenses.length})</span>
        </button>
      </div>

      {/* TAB 1: MORNING LOADING MODE (Specification requirement) */}
      {activeTab === 'loading' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Status & KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Vehicle & Route</span>
              <div className="text-base font-black text-slate-900 mt-0.5">{vehicle.name}</div>
              <div className="text-[11px] text-slate-500">{vehicle.registrationNumber}</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Demand</span>
              <div className="text-2xl font-black text-amber-700 mt-0.5">{totalDemandUnits}</div>
              <div className="text-[11px] text-slate-500">Units to load</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Retailers</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{totalRetailers}</div>
              <div className="text-[11px] text-slate-500">Total stops on route</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pending Orders</span>
              <div className={`text-2xl font-black mt-0.5 ${pendingOrdersCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {pendingOrdersCount}
              </div>
              <div className="text-[11px] text-slate-500">{pendingOrdersCount === 0 ? 'All received' : 'Awaiting confirmation'}</div>
            </div>
          </div>



          {/* Product Loading Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Crates & Items Loading Checklist ({shift.toUpperCase()} Shift)
                </h4>
                <p className="text-[11px] text-slate-500">Tap items to check them off as you load your vehicle</p>
              </div>
              <button
                onClick={() => setActiveTab('demand')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <span>View Demand Sheet →</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {products
                .filter(p => (productTotals[p.id] || 0) > 0)
                .map(p => {
                  const needed = productTotals[p.id] || 0;
                  const isChecked = !!checkedItems[p.id];
                  const yestQty = yesterdaySheet.productTotals[p.id] || 0;
                  const diff = needed - yestQty;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setCheckedItems(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                      className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isChecked ? 'bg-emerald-50/40 text-slate-600' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-lg ${isChecked ? 'text-emerald-600' : 'text-slate-300'}`}>
                          {isChecked ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${isChecked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>Category: {p.group}</span>
                            <span className="font-mono text-slate-400">({p.shortName})</span>
                            {yestQty > 0 && (
                              <span className={`text-[10px] font-bold ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                                Yesterday: {yestQty} ({diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0'})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-lg sm:text-xl font-black ${isChecked ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {needed} <span className="text-xs font-bold text-slate-500">{p.unit}</span>
                        </div>
                        <div className="text-[10px] font-bold">
                          {isChecked ? (
                            <span className="text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">✓ LOADED</span>
                          ) : (
                            <span className="text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded">PENDING LOAD</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEMAND TABLE (Identical format to PDF & live order table) */}
      {activeTab === 'demand' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
          <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              {vehicle.name} — Retailer Demand Table ({shift.toUpperCase()} Shift)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowComparison(!showComparison)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  showComparison
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>⇄ Compare vs Yesterday</span>
              </button>
              {driver.canCollectPayment && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Payment Collection Enabled
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 z-30">
                <tr>
                  <th scope="col" className="sticky-col-sr bg-slate-100 px-2.5 py-3 w-12 text-center border-r border-slate-200 z-30 shadow-[1px_0_0_0_#e2e8f0]">
                    Sr
                  </th>
                  <th scope="col" className="sticky-col-retailer bg-slate-100 px-3 py-3 min-w-[130px] sm:min-w-[170px] border-r border-slate-200 z-30 shadow-[2px_0_3px_rgba(0,0,0,0.06)]">
                    Retailer
                  </th>
                  {products.map(p => (
                    <th key={p.id} scope="col" className="px-2 py-3 text-center min-w-[65px] border-r border-slate-200 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900">{p.shortName}</div>
                      <div className="text-[9px] text-slate-400 font-normal lowercase">{p.unit}</div>
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-3 text-right min-w-[85px] border-r border-slate-200 bg-emerald-50 text-emerald-950 font-extrabold">
                    Payment
                  </th>
                  {driver.canCollectPayment && (
                    <th scope="col" className="px-2.5 py-3 text-center min-w-[75px] bg-slate-100 font-extrabold">
                      Collect
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={products.length + (driver.canCollectPayment ? 4 : 3)} className="text-center py-8 text-slate-400">
                      No retailers assigned to this vehicle.
                    </td>
                  </tr>
                ) : (
                  rows.map(row => (
                    <tr key={row.retailerId} className="hover:bg-slate-50 transition-colors">
                      <td className="sticky-col-sr bg-white px-2.5 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                        {row.serialNumber}
                      </td>

                      <td className="sticky-col-retailer bg-white px-3 py-2.5 font-bold text-slate-900 border-r border-slate-200 z-20 shadow-[2px_0_3px_rgba(0,0,0,0.06)]">
                        <span className="truncate max-w-[130px] sm:max-w-[170px]">{row.retailerName}</span>
                      </td>

                      {products.map(p => {
                        const qty = row.quantities[p.id];
                        return (
                          <td key={p.id} className="px-2 py-2.5 text-center font-bold text-slate-800 border-r border-slate-100">
                            {qty && qty > 0 ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-900">
                                {qty}
                              </span>
                            ) : (
                              ''
                            )}
                          </td>
                        );
                      })}

                      {/* Payment Cell rules: Blank if no payment, only number if paid */}
                      <td className="px-3 py-2.5 text-right font-extrabold text-emerald-800 border-r border-slate-200 bg-emerald-50/20">
                        {row.paymentAmount !== null && row.paymentAmount > 0 ? row.paymentAmount : ''}
                      </td>

                      {driver.canCollectPayment && (
                        <td className="px-2.5 py-2.5 text-center">
                          <button
                            onClick={() => {
                              setPaymentRow(row);
                              setPayAmountInput(row.paymentAmount ? String(row.paymentAmount) : '');
                            }}
                            className="p-1 px-2 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] transition-colors"
                            title="Collect Cash/UPI Payment"
                          >
                            Collect
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}

                {/* TOTAL ROW (Specification 17 & 6) */}
                {rows.length > 0 && (
                  <tr className="bg-amber-50/80 border-t-2 border-amber-300 font-extrabold text-amber-950 sticky bottom-0 z-20">
                    <td className="sticky-col-sr bg-amber-100 px-2.5 py-3 text-center border-r border-amber-300 z-20 shadow-[1px_0_0_0_#fde68a]">
                      TOTAL
                    </td>
                    <td className="sticky-col-retailer bg-amber-100 px-3 py-3 border-r border-amber-300 z-20 shadow-[2px_0_3px_rgba(0,0,0,0.06)]">
                      <span className="text-xs uppercase font-black">Vehicle Total Demand</span>
                    </td>

                    {products.map(p => {
                      const sum = productTotals[p.id] || 0;
                      return (
                        <td key={p.id} className="px-2 py-3 text-center text-xs font-black border-r border-amber-200 text-amber-950">
                          {sum > 0 ? sum : ''}
                        </td>
                      );
                    })}

                    {/* Payment in TOTAL row is completely blank */}
                    <td className="px-3 py-3 border-r border-amber-300 bg-amber-50/50"></td>
                    {driver.canCollectPayment && <td className="px-2.5 py-3 bg-amber-50/80"></td>}
                  </tr>
                )}

                {/* YESTERDAY COMPARISON ROW (When enabled) */}
                {rows.length > 0 && showComparison && (
                  <tr className="bg-slate-100/90 border-t border-slate-300 text-slate-700 font-bold text-[11px]">
                    <td className="sticky-col-sr bg-slate-200 px-2.5 py-2 text-center border-r border-slate-300 z-20">
                      DIFF
                    </td>
                    <td className="sticky-col-retailer bg-slate-200 px-3 py-2 border-r border-slate-300 z-20">
                      <span className="text-[10px] uppercase font-black text-slate-600">vs Yesterday ({yesterdayDate})</span>
                    </td>
                    {products.map(p => {
                      const todayQty = productTotals[p.id] || 0;
                      const yestQty = yesterdaySheet.productTotals[p.id] || 0;
                      const diff = todayQty - yestQty;
                      return (
                        <td key={p.id} className="px-2 py-2 text-center border-r border-slate-200">
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
                    <td className="px-3 py-2 border-r border-slate-300"></td>
                    {driver.canCollectPayment && <td className="px-2.5 py-2"></td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FUEL ENTRY (Specification 18 & Driver Privacy Requirement) */}
      {activeTab === 'fuel' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Vehicle Fuel Log ({vehicle.name})
              </h3>
              <p className="text-xs text-slate-500">Record daily diesel refuel expenses</p>
            </div>
            <button
              onClick={() => setShowFuelModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Fuel</span>
            </button>
          </div>

          {/* Privacy info banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Driver Privacy Protected:</strong> Displaying your entries submitted today ({selectedDate}). Past vehicle expense archives are maintained in Admin accounts.
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {driverTodayFuel.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No fuel entries logged by you today.</div>
            ) : (
              driverTodayFuel.map(f => (
                <div key={f.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{f.date}</span>
                    <span className="text-slate-500 ml-2">({f.fuelType || 'Diesel'})</span>
                    {f.pump && <span className="text-slate-400 ml-2 italic">@ {f.pump}</span>}
                    {f.litres && <div className="text-[11px] text-slate-500">{f.litres} Litres</div>}
                  </div>
                  <span className="font-black text-amber-900 text-sm">₹{f.amount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: VEHICLE EXPENSES / REPAIRS (Specification 19 & Driver Privacy Requirement) */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Vehicle Repair & Maintenance ({vehicle.name})
              </h3>
              <p className="text-xs text-slate-500">Tyre puncture, oil, workshop repair expenses</p>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Repair</span>
            </button>
          </div>

          {/* Privacy info banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Driver Privacy Protected:</strong> Displaying your repair entries submitted today ({selectedDate}). Past vehicle expense archives are maintained in Admin accounts.
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {driverTodayExpenses.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No repairs or expenses logged by you today.</div>
            ) : (
              driverTodayExpenses.map(e => (
                <div key={e.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{e.description}</div>
                    <div className="text-[11px] text-slate-500">
                      {e.date} • <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded font-bold">{e.expenseType}</span>
                    </div>
                  </div>
                  <span className="font-black text-indigo-900 text-sm">₹{e.amount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Payment Entry Modal (Only for Driver with Permission) */}
      {paymentRow && driver.canCollectPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Collect Retailer Payment
              </h3>
              <button onClick={() => setPaymentRow(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDriverPayment} className="mt-3 space-y-3">
              <div>
                <span className="text-xs text-slate-500">Retailer:</span>
                <div className="font-bold text-slate-900 text-sm">{paymentRow.retailerName} (Sr #{paymentRow.serialNumber})</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentRow(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fuel Modal */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 animate-scaleUp">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <Fuel className="w-4 h-4 text-amber-600" /> Add Fuel Log
            </h3>
            <form onSubmit={handleSaveFuel} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount Spent (₹) *</label>
                <input
                  type="number"
                  required
                  value={fuelAmt}
                  onChange={(e) => setFuelAmt(e.target.value)}
                  placeholder="1500"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Litres</label>
                  <input
                    type="number"
                    step="any"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(e.target.value)}
                    placeholder="16.5"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Petrol Pump</label>
                  <input
                    type="text"
                    value={fuelPump}
                    onChange={(e) => setFuelPump(e.target.value)}
                    placeholder="Highway IOCL"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                >
                  Save Fuel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 animate-scaleUp">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-indigo-600" /> Add Vehicle Expense
            </h3>
            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">What was repaired? *</label>
                <input
                  type="text"
                  required
                  value={repairedWhat}
                  onChange={(e) => setRepairedWhat(e.target.value)}
                  placeholder="e.g. Tyre puncture repair"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Type</label>
                  <select
                    value={expType}
                    onChange={(e) => setExpType(e.target.value)}
                    className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    <option value="Repair">Repair</option>
                    <option value="Tyre">Tyre</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Toll">Toll</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={expAmt}
                    onChange={(e) => setExpAmt(e.target.value)}
                    placeholder="1500"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
