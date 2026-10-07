import React, { useState } from 'react';
import { Shift, Order, Payment } from '../../types';
import { Database, getTodayDateString } from '../../services/storage';
import { OrderService } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar, Search, Edit2, CheckCircle2, History,
  FileSpreadsheet, Filter, X, Save
} from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const [filterDate, setFilterDate] = useState<string>(getTodayDateString());
  const [filterVehicleId, setFilterVehicleId] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Edit order modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editQuantities, setEditQuantities] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const vehicles = Database.getVehicles();
  const retailers = Database.getRetailers();
  const products = Database.getProducts().sort((a, b) => a.displayPosition - b.displayPosition);
  const allOrders = Database.getOrders();
  const allPayments = Database.getPayments();

  // Filtered orders
  const filteredOrders = allOrders.filter(o => {
    if (filterDate && o.date !== filterDate) return false;
    if (filterVehicleId !== 'all' && o.vehicleId !== filterVehicleId) return false;
    if (filterShift !== 'all' && o.shift !== filterShift) return false;

    if (searchTerm.trim()) {
      const ret = retailers.find(r => r.id === o.retailerId);
      const nameMatch = ret?.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!nameMatch) return false;
    }
    return true;
  });

  const handleOpenEdit = (ord: Order) => {
    setEditingOrder(ord);
    const qMap: Record<string, string> = {};
    for (const p of products) {
      qMap[p.id] = ord.items[p.id] !== undefined ? String(ord.items[p.id]) : '';
    }
    setEditQuantities(qMap);
    setSaveSuccess(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !currentUser) return;

    const numItems: Record<string, number> = {};
    for (const [pId, val] of Object.entries(editQuantities)) {
      const n = parseInt(val, 10);
      if (!isNaN(n) && n > 0) {
        numItems[pId] = n;
      }
    }

    OrderService.adminEditOrder(editingOrder.id, numItems, currentUser.id, currentUser.name);

    setSaveSuccess(true);
    setTimeout(() => {
      setEditingOrder(null);
      setSaveSuccess(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <History className="w-4 h-4 text-brand-700" /> Historical Order & Khata Records
          </h2>
          <span className="text-xs text-slate-500 font-medium">{filteredOrders.length} records matching</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold">
          {/* Date Filter */}
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">Date:</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
            />
          </div>

          {/* Vehicle Filter */}
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">Vehicle:</label>
            <select
              value={filterVehicleId}
              onChange={(e) => setFilterVehicleId(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Shift Filter */}
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">Shift:</label>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </select>
          </div>

          {/* Search by Retailer */}
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">Retailer Search:</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search retailer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-8 pr-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Historical Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Shift</th>
                <th className="px-3 py-3">Vehicle</th>
                <th className="px-4 py-3">Retailer</th>
                <th className="px-4 py-3">Items Ordered</th>
                <th className="px-3 py-3 text-right">Order Total</th>
                <th className="px-3 py-3 text-right">Payment</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-center">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No orders found for the selected date and filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(ord => {
                  const ret = retailers.find(r => r.id === ord.retailerId);
                  const veh = vehicles.find(v => v.id === ord.vehicleId);
                  const pay = allPayments.find(p => p.retailerId === ord.retailerId && p.date === ord.date);

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">{ord.date}</td>
                      <td className="px-3 py-3 uppercase text-[10px] font-extrabold text-slate-600">
                        <span className={`px-1.5 py-0.5 rounded ${ord.shift === 'morning' ? 'bg-amber-100 text-amber-900' : 'bg-indigo-100 text-indigo-900'}`}>
                          {ord.shift}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700 font-medium whitespace-nowrap">{veh?.name || '—'}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {ret?.name || ord.retailerId}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(ord.items).map(([pId, q]) => {
                            const p = products.find(x => x.id === pId);
                            return (
                              <span key={pId} className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-[11px] text-slate-800">
                                {p?.shortName || pId}: <strong className="font-bold">{q}</strong>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₹{ord.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right font-extrabold text-emerald-800 whitespace-nowrap">
                        {pay && pay.amount > 0 ? pay.amount : ''}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          ord.status === 'updated'
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {ord.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleOpenEdit(ord)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                          title="Admin can edit any historical record"
                        >
                          <Edit2 className="w-3 h-3 text-brand-700" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Edit Modal for Historical Orders */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Admin Edit: Order #{editingOrder.id}
                </h3>
                <p className="text-xs text-slate-500">
                  Date: {editingOrder.date} | Shift: {editingOrder.shift.toUpperCase()} | Retailer: {retailers.find(r => r.id === editingOrder.retailerId)?.name}
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl my-4 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Historical order updated. Dues and ledger recalculated dynamically.</span>
              </div>
            ) : (
              <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
                <div className="max-h-60 overflow-y-auto pr-1 divide-y divide-slate-100">
                  {products.map(prod => (
                    <div key={prod.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                      <div>
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
                        className="w-20 text-center py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Changes & Recalculate
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
