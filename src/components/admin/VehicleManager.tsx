import React, { useState, useEffect } from 'react';
import { Vehicle, Driver } from '../../types';
import { Database } from '../../services/storage';
import { Truck, Plus, Edit2, CheckCircle, Users, Fuel, Wrench, X, Trash2, RotateCcw } from 'lucide-react';

export const VehicleManager: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [archivedVehicles, setArchivedVehicles] = useState<Vehicle[]>([]);
  const [filterTab, setFilterTab] = useState<'active' | 'archived'>('active');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [driverId, setDriverId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    const all = Database.getVehicles();
    setVehicles(all.filter(v => v.active));
    setArchivedVehicles(all.filter(v => !v.active));
    setDrivers(Database.getDrivers().filter(d => d.active));
  };

  const handleArchiveVehicle = (v: Vehicle) => {
    const confirm = window.confirm(`Archive ${v.name}?`);
    if (confirm) {
      const all = Database.getVehicles();
      Database.setVehicles(all.map(x => x.id === v.id ? { ...x, active: false } : x));
      loadData();
    }
  };

  const handleRestoreVehicle = (v: Vehicle) => {
    const confirm = window.confirm(`Restore ${v.name} to active fleet?`);
    if (confirm) {
      const all = Database.getVehicles();
      Database.setVehicles(all.map(x => x.id === v.id ? { ...x, active: true } : x));
      loadData();
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setIsAdding(true);
    setEditingVehicle(null);
    setName(`Vehicle ${vehicles.length + 1}`);
    setRegistrationNumber('');
    setDriverId('');
    setNotes('');
  };

  const handleOpenEdit = (v: Vehicle) => {
    setIsAdding(false);
    setEditingVehicle(v);
    setName(v.name);
    setRegistrationNumber(v.registrationNumber);
    setDriverId(v.driverId || '');
    setNotes(v.notes || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const vList = Database.getVehicles();

    if (isAdding) {
      const newV: Vehicle = {
        id: 'veh_' + Date.now(),
        name: name.trim(),
        registrationNumber: registrationNumber.trim().toUpperCase(),
        driverId: driverId || null,
        active: true,
        notes: notes.trim()
      };
      Database.setVehicles([...vList, newV]);

      // If driver assigned, link driver's assignedVehicleId
      if (driverId) {
        const dList = Database.getDrivers();
        Database.setDrivers(dList.map(d => d.id === driverId ? { ...d, assignedVehicleId: newV.id } : d));
      }
    } else if (editingVehicle) {
      const updated = vList.map(v => {
        if (v.id === editingVehicle.id) {
          return {
            ...v,
            name: name.trim(),
            registrationNumber: registrationNumber.trim().toUpperCase(),
            driverId: driverId || null,
            notes: notes.trim()
          };
        }
        return v;
      });
      Database.setVehicles(updated);

      if (driverId) {
        const dList = Database.getDrivers();
        Database.setDrivers(dList.map(d => d.id === driverId ? { ...d, assignedVehicleId: editingVehicle.id } : d));
      }
    }

    setIsAdding(false);
    setEditingVehicle(null);
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            Delivery Fleet Management
          </h2>
          <p className="text-xs text-slate-500">
            Each vehicle maintains independent retailers, fuel logs, and expense records.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* Active vs Archived Filter Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold w-fit gap-1">
        <button
          onClick={() => setFilterTab('active')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterTab === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Active Fleet ({vehicles.length})
        </button>
        <button
          onClick={() => setFilterTab('archived')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterTab === 'archived' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Archived ({archivedVehicles.length})
        </button>
      </div>

      {filterTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-sm">
              No active vehicles. Click Add New Vehicle above.
            </div>
          ) : (
            vehicles.map((v) => {
              const driver = drivers.find(d => d.id === v.driverId);
              const retailerCount = Database.getRetailers().filter(r => r.vehicleId === v.id && r.active).length;
              const fuelCount = Database.getFuelEntries().filter(f => f.vehicleId === v.id).length;
              const expCount = Database.getVehicleExpenses().filter(e => e.vehicleId === v.id).length;

              return (
                <div
                  key={v.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-brand-300 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {v.registrationNumber || 'NO REG #'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Edit Vehicle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchiveVehicle(v)}
                          className="p-1 text-rose-400 hover:text-rose-700 rounded hover:bg-rose-50"
                          title="Archive Vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-brand-700" />
                      {v.name}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      Driver: <strong className="text-slate-800">{driver ? driver.name : 'Unassigned'}</strong>
                    </p>
                    {v.notes && <p className="text-[11px] text-slate-400 mt-1 italic">{v.notes}</p>}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Retailers</div>
                      <div className="font-black text-slate-800 text-sm">{retailerCount}</div>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Fuel Logs</div>
                      <div className="font-black text-slate-800 text-sm">{fuelCount}</div>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Repairs</div>
                      <div className="font-black text-slate-800 text-sm">{expCount}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {filterTab === 'archived' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Vehicle Name</th>
                  <th className="px-3 py-3">Registration #</th>
                  <th className="px-3 py-3">Notes</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No archived vehicles.
                    </td>
                  </tr>
                ) : (
                  archivedVehicles.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {v.name}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-700">
                        {v.registrationNumber || '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {v.notes || '—'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                          Archived
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRestoreVehicle(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-lg transition-colors"
                          title="Restore to active fleet"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(isAdding || editingVehicle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                {isAdding ? 'Add Vehicle' : `Edit Vehicle: ${editingVehicle?.name}`}
              </h3>
              <button
                onClick={() => { setIsAdding(false); setEditingVehicle(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vehicle Name / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vehicle 1, Big Truck 2"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. RJ-14-GA-1024"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Driver
                </label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                >
                  <option value="">-- No Assigned Driver --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Route Info
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Morning city delivery"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingVehicle(null); }}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-xs"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
