import React, { useState, useEffect } from 'react';
import { Driver, Vehicle, User } from '../../types';
import { Database } from '../../services/storage';
import { AuditService } from '../../services/auditService';
import { CredentialService } from '../../services/credentialService';
import { useAuth } from '../../context/AuthContext';
import {
  UserCheck, Plus, Check, X, ShieldAlert, Key, Truck, Phone,
  Trash2, RotateCcw, Eye, EyeOff, Sparkles, Copy, AlertTriangle
} from 'lucide-react';

export const DriverManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [archivedDrivers, setArchivedDrivers] = useState<Driver[]>([]);
  const [filterTab, setFilterTab] = useState<'active' | 'archived'>('active');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>('');
  const [canCollectPayment, setCanCollectPayment] = useState(false);
  const [password, setPassword] = useState('123');

  const [createdResult, setCreatedResult] = useState<{ code: string; pass: string } | null>(null);

  // Driver Password Modal State
  const [passwordModalDriver, setPasswordModalDriver] = useState<Driver | null>(null);
  const [driverPasswordVal, setDriverPasswordVal] = useState<string>('123');
  const [driverCodeVal, setDriverCodeVal] = useState<string>('');
  const [showDriverPasswordPlain, setShowDriverPasswordPlain] = useState<boolean>(false);
  const [copiedDriverDetails, setCopiedDriverDetails] = useState<boolean>(false);
  const [passwordModalSuccess, setPasswordModalSuccess] = useState<string | null>(null);
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);

  const loadData = () => {
    const allDrivers = Database.getDrivers();
    setDrivers(allDrivers.filter(d => d.active));
    setArchivedDrivers(allDrivers.filter(d => !d.active));
    setVehicles(Database.getVehicles());
  };

  const handleArchiveDriver = (d: Driver) => {
    const confirm = window.confirm(`Archive driver ${d.name}? Their login will be disabled.`);
    if (confirm) {
      const all = Database.getDrivers();
      Database.setDrivers(all.map(x => x.id === d.id ? { ...x, active: false } : x));
      const users = Database.getUsers();
      Database.setUsers(users.map(u => u.driverId === d.id ? { ...u, active: false } : u));
      loadData();
    }
  };

  const handleRestoreDriver = (d: Driver) => {
    const confirm = window.confirm(`Restore driver ${d.name}?`);
    if (confirm) {
      const all = Database.getDrivers();
      Database.setDrivers(all.map(x => x.id === d.id ? { ...x, active: true } : x));
      const users = Database.getUsers();
      Database.setUsers(users.map(u => u.driverId === d.id ? { ...u, active: true } : u));
      loadData();
    }
  };

  const handleOpenPasswordModal = (d: Driver) => {
    const u = CredentialService.getUserForDriver(d.id);
    setPasswordModalDriver(d);
    setDriverCodeVal(u ? u.code : d.code);
    setDriverPasswordVal(u ? u.password : '123');
    setShowDriverPasswordPlain(false);
    setCopiedDriverDetails(false);
    setPasswordModalSuccess(null);
    setPasswordModalError(null);
  };

  const handleSaveDriverPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalDriver || !currentUser) return;

    if (!driverPasswordVal.trim()) {
      setPasswordModalError('Password cannot be empty.');
      return;
    }

    const u = CredentialService.getUserForDriver(passwordModalDriver.id);
    if (!u) {
      setPasswordModalError('Could not find user account for this driver.');
      return;
    }

    const res = CredentialService.updateCredentials(
      u.id,
      driverCodeVal.trim(),
      driverPasswordVal.trim(),
      currentUser.id,
      currentUser.name
    );

    if (!res.success) {
      setPasswordModalError(res.error || 'Failed to update credentials.');
      return;
    }

    setPasswordModalSuccess(`Driver credentials saved! Code: ${driverCodeVal.toUpperCase()} | Pass: ${driverPasswordVal.trim()}`);
    loadData();
    setTimeout(() => {
      setPasswordModalDriver(null);
      setPasswordModalSuccess(null);
    }, 1500);
  };

  const handleCopyDriverDetails = () => {
    if (!passwordModalDriver) return;
    const text = `MilkDesk Driver Login:
Driver: ${passwordModalDriver.name}
Login Code: ${driverCodeVal.toUpperCase()}
Password: ${driverPasswordVal.trim()}
Portal: ${window.location.origin}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedDriverDetails(true);
      setTimeout(() => setCopiedDriverDetails(false), 2500);
    });
  };

  const handleResetTo123 = () => {
    setDriverPasswordVal('123');
  };

  const handleGenerateRandomPassword = () => {
    const randomPass = Math.random().toString(36).slice(-6);
    setDriverPasswordVal(randomPass);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePaymentPermission = (driverId: string, currentVal: boolean) => {
    if (!currentUser) return;
    const dList = Database.getDrivers();
    const updated = dList.map(d => {
      if (d.id === driverId) {
        return { ...d, canCollectPayment: !currentVal };
      }
      return d;
    });
    Database.setDrivers(updated);

    AuditService.log({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'admin',
      action: 'Toggled Driver Payment Permission',
      entityType: 'vehicle',
      entityId: driverId,
      oldValue: currentVal,
      newValue: !currentVal,
      details: `${currentUser.name} ${!currentVal ? 'ENABLED' : 'DISABLED'} payment collection for driver ${driverId}`
    });

    loadData();
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    const dList = Database.getDrivers();
    const uList = Database.getUsers();

    const existingCodes = uList
      .filter(u => u.role === 'driver')
      .map(u => {
        const m = u.code.match(/DRV(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      });
    const nextCodeNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    const loginCode = `DRV${String(nextCodeNum).padStart(2, '0')}`;
    const newId = 'drv_' + Date.now();

    const newDriver: Driver = {
      id: newId,
      name: name.trim(),
      code: loginCode,
      phone: phone.trim(),
      assignedVehicleId: assignedVehicleId || null,
      canCollectPayment,
      active: true
    };

    const newUser: User = {
      id: 'usr_' + Date.now(),
      code: loginCode,
      password: password.trim() || '123',
      role: 'driver',
      name: newDriver.name,
      phone: newDriver.phone,
      driverId: newId,
      active: true,
      createdAt: new Date().toISOString()
    };

    Database.setDrivers([...dList, newDriver]);
    Database.setUsers([...uList, newUser]);

    // Update vehicle's driverId if assigned
    if (assignedVehicleId) {
      const vList = Database.getVehicles();
      Database.setVehicles(vList.map(v => v.id === assignedVehicleId ? { ...v, driverId: newId } : v));
    }

    setCreatedResult({
      code: loginCode,
      pass: newUser.password
    });

    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            Driver Accounts & Delivery Permissions
          </h2>
          <p className="text-xs text-slate-500">
            Drivers view their assigned vehicle demand table and can be granted field payment collection rights.
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setPhone('');
            setAssignedVehicleId('');
            setCanCollectPayment(false);
            setPassword('123');
            setCreatedResult(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Driver</span>
        </button>
      </div>

      {/* Permission Explanation Box */}
      <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Driver Payment Permission Policy:</strong> By default, drivers cannot enter retailer payments. Toggle the permission switch below to enable a driver to collect and log cash/UPI payments from retailers on their assigned vehicle.
        </div>
      </div>

      {/* Active vs Archived Filter Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold w-fit gap-1">
        <button
          onClick={() => setFilterTab('active')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterTab === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Active Drivers ({drivers.length})
        </button>
        <button
          onClick={() => setFilterTab('archived')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterTab === 'archived' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Archived ({archivedDrivers.length})
        </button>
      </div>

      {filterTab === 'active' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Driver Name</th>
                  <th className="px-3 py-3">Login Code</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-4 py-3">Assigned Vehicle</th>
                  <th className="px-4 py-3 text-center">Can Collect Retailer Payment?</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No active drivers. Click "Add New Driver" above to register.
                    </td>
                  </tr>
                ) : (
                  drivers.map((d) => {
                    const veh = vehicles.find(v => v.id === d.assignedVehicleId);

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                          {d.name}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-brand-800">
                          {d.code}
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-medium">
                          {d.phone}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {veh ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md">
                              <Truck className="w-3.5 h-3.5 text-brand-700" />
                              {veh.name} ({veh.registrationNumber})
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No vehicle assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleTogglePaymentPermission(d.id, d.canCollectPayment)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                              d.canCollectPayment
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {d.canCollectPayment ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>PERMITTED</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5 text-slate-400" />
                                <span>DISABLED</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenPasswordModal(d)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 hover:border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              title="View or Change Driver Password"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-700" />
                              <span>Password</span>
                            </button>
                            <button
                              onClick={() => handleArchiveDriver(d)}
                              className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Archive Driver"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filterTab === 'archived' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Driver Name</th>
                  <th className="px-3 py-3">Login Code</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No archived drivers.
                    </td>
                  </tr>
                ) : (
                  archivedDrivers.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {d.name}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-700">
                        {d.code}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {d.phone}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                          Inactive
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenPasswordModal(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            title="View or Change Driver Password"
                          >
                            <Key className="w-3.5 h-3.5 text-slate-500" />
                            <span>Password</span>
                          </button>
                          <button
                            onClick={() => handleRestoreDriver(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            title="Restore driver account"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-700" /> Create Driver Account
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdResult ? (
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-3">
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  <Check className="w-5 h-5 text-emerald-600" /> Driver Account Created!
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs space-y-1">
                  <div><strong>Login Code:</strong> <span className="font-mono text-brand-800 text-sm font-black">{createdResult.code}</span></div>
                  <div><strong>Password:</strong> <span className="font-mono text-brand-800 text-sm font-black">{createdResult.pass}</span></div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveDriver} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Driver Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Suresh Kumar"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Vehicle
                  </label>
                  <select
                    value={assignedVehicleId}
                    onChange={(e) => setAssignedVehicleId(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  >
                    <option value="">-- Select Assigned Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.registrationNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="canCollectCheck"
                    checked={canCollectPayment}
                    onChange={(e) => setCanCollectPayment(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                  <label htmlFor="canCollectCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Grant Retailer Payment Collection Permission
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-xs"
                  >
                    Create Driver
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Driver Password Management Modal */}
      {passwordModalDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs">
                  <Key className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Driver Password & Login
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Credentials for {passwordModalDriver.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalDriver(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Driver Summary Banner */}
            <div className="mt-3.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">{passwordModalDriver.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Phone: <span className="font-semibold text-slate-700">{passwordModalDriver.phone || 'No phone'}</span>
                  {passwordModalDriver.assignedVehicleId && (
                    <span className="ml-1 text-amber-900 font-bold">• Assigned Vehicle</span>
                  )}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                passwordModalDriver.active ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {passwordModalDriver.active ? 'Active' : 'Archived'}
              </span>
            </div>

            {passwordModalError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordModalError}</span>
              </div>
            )}

            {passwordModalSuccess && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passwordModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveDriverPassword} className="mt-4 space-y-3.5">
              {/* Login Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Driver Login Code
                </label>
                <input
                  type="text"
                  value={driverCodeVal}
                  onChange={(e) => setDriverCodeVal(e.target.value.toUpperCase())}
                  placeholder="e.g. DRV01"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Unique code used by driver on sign-in screen</p>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Driver Portal Password
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={handleResetTo123}
                      className="text-amber-800 hover:text-amber-950 underline font-semibold cursor-pointer"
                    >
                      Set "123"
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-amber-800 hover:text-amber-950 underline font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Random
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showDriverPasswordPlain ? 'text' : 'password'}
                    value={driverPasswordVal}
                    onChange={(e) => setDriverPasswordVal(e.target.value)}
                    placeholder="Enter driver password"
                    className="w-full py-2 pl-3 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowDriverPasswordPlain(!showDriverPasswordPlain)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showDriverPasswordPlain ? 'Hide Password' : 'Show Password'}
                  >
                    {showDriverPasswordPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Copy WhatsApp / SMS details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopyDriverDetails}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    copiedDriverDetails
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {copiedDriverDetails ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Details to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy for WhatsApp / SMS</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalDriver(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Save Driver Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
