import React, { useState, useEffect } from 'react';
import { Vehicle, FuelEntry, VehicleExpense } from '../../types';
import { Database, getTodayDateString } from '../../services/storage';
import { ExpenseService } from '../../services/expenseService';
import { useAuth } from '../../context/AuthContext';
import { Fuel, Wrench, Plus, Calendar, Filter, X, Check } from 'lucide-react';

export const ExpenseManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('veh_1');

  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);

  // Add Fuel Modal
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelAmount, setFuelAmount] = useState<string>('1500');
  const [fuelLitres, setFuelLitres] = useState<string>('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [fuelPump, setFuelPump] = useState('');
  const [fuelNotes, setFuelNotes] = useState('');

  // Add Repair Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseType, setExpenseType] = useState('Repair');
  const [description, setDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<string>('500');
  const [expenseNotes, setExpenseNotes] = useState('');

  const loadVehicleData = () => {
    const vList = Database.getVehicles().filter(v => v.active);
    setVehicles(vList);
    if (vList.length > 0 && !vList.some(v => v.id === selectedVehicleId)) {
      setSelectedVehicleId(vList[0].id);
    }

    if (selectedVehicleId) {
      setFuelEntries(ExpenseService.getFuelByVehicle(selectedVehicleId));
      setExpenses(ExpenseService.getExpensesByVehicle(selectedVehicleId));
    }
  };

  useEffect(() => {
    loadVehicleData();
  }, [selectedVehicleId]);

  const handleSaveFuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedVehicleId) return;

    const amt = parseFloat(fuelAmount);
    if (isNaN(amt) || amt <= 0) return;

    ExpenseService.addFuelEntry({
      vehicleId: selectedVehicleId,
      driverId: currentUser.id,
      driverName: currentUser.name,
      date: getTodayDateString(),
      amount: amt,
      litres: fuelLitres ? parseFloat(fuelLitres) : undefined,
      fuelType,
      pump: fuelPump.trim(),
      notes: fuelNotes.trim(),
      userRole: 'admin'
    });

    setShowFuelModal(false);
    loadVehicleData();
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedVehicleId || !description.trim()) return;

    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) return;

    ExpenseService.addVehicleExpense({
      vehicleId: selectedVehicleId,
      driverId: currentUser.id,
      driverName: currentUser.name,
      date: getTodayDateString(),
      expenseType,
      description: description.trim(),
      amount: amt,
      notes: expenseNotes.trim(),
      userRole: 'admin'
    });

    setShowExpenseModal(false);
    loadVehicleData();
  };

  const currentVeh = vehicles.find(v => v.id === selectedVehicleId);
  const totalFuelAmt = fuelEntries.reduce((s, f) => s + f.amount, 0);
  const totalRepairAmt = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      {/* Top Bar: Vehicle Selector & Add Buttons */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Vehicle:</label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-slate-50 border border-slate-300 font-bold text-slate-800 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-600 focus:outline-hidden"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.registrationNumber})
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-500 font-medium">
            Showing only entries for: <strong className="text-slate-800">{currentVeh?.name}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFuelModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Add Fuel Entry</span>
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Add Vehicle Repair</span>
          </button>
        </div>
      </div>

      {/* Summary metric banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
          <div className="text-[10px] uppercase font-bold text-amber-800">Total Fuel ({currentVeh?.name})</div>
          <div className="text-lg font-black text-amber-900 mt-1">₹{totalFuelAmt.toLocaleString()}</div>
        </div>
        <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200">
          <div className="text-[10px] uppercase font-bold text-indigo-800">Total Repairs ({currentVeh?.name})</div>
          <div className="text-lg font-black text-indigo-900 mt-1">₹{totalRepairAmt.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-600">Fuel Entries Count</div>
          <div className="text-lg font-black text-slate-900 mt-1">{fuelEntries.length}</div>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-600">Repair Logs Count</div>
          <div className="text-lg font-black text-slate-900 mt-1">{expenses.length}</div>
        </div>
      </div>

      {/* Two column lists for Fuel and Repairs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fuel Logs List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
              <Fuel className="w-4 h-4 text-amber-700" /> Vehicle Fuel Records ({currentVeh?.name})
            </h3>
            <span className="text-xs font-bold text-amber-900">{fuelEntries.length} entries</span>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Logged By</th>
                  <th className="px-3 py-2.5">Litres</th>
                  <th className="px-3 py-2.5">Pump</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fuelEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No fuel logs recorded for this vehicle.
                    </td>
                  </tr>
                ) : (
                  fuelEntries.map(f => (
                    <tr key={f.id} className="hover:bg-amber-50/20">
                      <td className="px-3 py-2.5 font-bold text-slate-800">{f.date}</td>
                      <td className="px-3 py-2.5 text-slate-600">{f.driverName}</td>
                      <td className="px-3 py-2.5 text-slate-600">{f.litres ? `${f.litres} L` : '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600 truncate max-w-[100px]">{f.pump || '—'}</td>
                      <td className="px-3 py-2.5 text-right font-black text-amber-900">₹{f.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Repair & Maintenance Logs List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-indigo-50/70 border-b border-indigo-200 flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-indigo-700" /> Vehicle Repairs & Expenses ({currentVeh?.name})
            </h3>
            <span className="text-xs font-bold text-indigo-900">{expenses.length} entries</span>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5">Logged By</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No repair or expense entries for this vehicle.
                    </td>
                  </tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id} className="hover:bg-indigo-50/20">
                      <td className="px-3 py-2.5 font-bold text-slate-800">{e.date}</td>
                      <td className="px-3 py-2.5">
                        <span className="bg-indigo-50 text-indigo-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                          {e.expenseType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 font-medium">{e.description}</td>
                      <td className="px-3 py-2.5 text-slate-600">{e.driverName}</td>
                      <td className="px-3 py-2.5 text-right font-black text-indigo-900">₹{e.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fuel Entry Modal */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-600" /> Log Fuel for {currentVeh?.name}
              </h3>
              <button
                onClick={() => setShowFuelModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFuel} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fuel Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={fuelAmount}
                  onChange={(e) => setFuelAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Litres (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(e.target.value)}
                    placeholder="e.g. 16.5"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fuel Type
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Petrol Pump / Location
                </label>
                <input
                  type="text"
                  value={fuelPump}
                  onChange={(e) => setFuelPump(e.target.value)}
                  placeholder="e.g. IOCL Highway Outlet"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={fuelNotes}
                  onChange={(e) => setFuelNotes(e.target.value)}
                  placeholder="e.g. Morning full tank"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                >
                  Save Fuel Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repair Entry Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-600" /> Log Repair for {currentVeh?.name}
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  What was repaired / purchased? *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Tyre puncture repair, Oil change"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expense Type
                  </label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Repair">Repair</option>
                    <option value="Tyre">Tyre</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Toll">Toll</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount Spent (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Workshop Details
                </label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. Raju Garage by Highway"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Save Repair Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
