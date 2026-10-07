import React, { useState, useEffect } from 'react';
import { Vehicle, Retailer, Product, User } from '../../types';
import { Database } from '../../services/storage';
import { RetailerService } from '../../services/retailerService';
import { PricingService } from '../../services/pricingService';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus, ArrowUpDown, Trash2, Edit3, DollarSign,
  Phone, Key, AlertTriangle, Check, X, Store, RotateCcw,
  Eye, EyeOff, Copy, Sparkles, Shield
} from 'lucide-react';

export const RetailerManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('veh_1');
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [archivedRetailers, setArchivedRetailers] = useState<Retailer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');

  // Add retailer modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [targetPosInput, setTargetPosInput] = useState<string>('');
  const [initialDueInput, setInitialDueInput] = useState<string>('0');
  const [passwordInput, setPasswordInput] = useState('123');
  const [createdResult, setCreatedResult] = useState<{ loginCode: string; pass: string } | null>(null);

  // Custom pricing modal state
  const [pricingRetailer, setPricingRetailer] = useState<Retailer | null>(null);
  const [customPriceMap, setCustomPriceMap] = useState<Record<string, string>>({});

  // Reorder state
  const [reorderingRetailer, setReorderingRetailer] = useState<Retailer | null>(null);
  const [newSerialInput, setNewSerialInput] = useState<string>('');

  // Password / Credentials Modal state
  const [passwordModalRetailer, setPasswordModalRetailer] = useState<Retailer | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [passwordInputVal, setPasswordInputVal] = useState<string>('123');
  const [loginCodeInputVal, setLoginCodeInputVal] = useState<string>('');
  const [showPasswordPlain, setShowPasswordPlain] = useState<boolean>(true);
  const [passwordModalSuccess, setPasswordModalSuccess] = useState<string | null>(null);
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [copiedLoginDetails, setCopiedLoginDetails] = useState<boolean>(false);

  const loadData = () => {
    // Ensure all retailers have a user account so none have missing login codes
    RetailerService.ensureAllRetailersHaveUsers();

    const vList = Database.getVehicles().filter(v => v.active);
    setVehicles(vList);
    if (vList.length > 0 && !vList.some(v => v.id === selectedVehicleId)) {
      setSelectedVehicleId(vList[0].id);
    }
    const rList = RetailerService.getRetailersByVehicle(selectedVehicleId);
    setRetailers(rList);
    setArchivedRetailers(RetailerService.getArchivedRetailersByVehicle(selectedVehicleId));
    setProducts(Database.getProducts().filter(p => p.active));
  };

  useEffect(() => {
    loadData();
  }, [selectedVehicleId]);

  const handleOpenAdd = () => {
    setNameInput('');
    setPhoneInput('');
    setTargetPosInput(String(retailers.length + 1));
    setInitialDueInput('0');
    setPasswordInput('123');
    setCreatedResult(null);
    setShowAddModal(true);
  };

  const handleSaveNewRetailer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !currentUser) return;

    const pos = parseInt(targetPosInput, 10);
    const initialDue = parseFloat(initialDueInput) || 0;

    const res = RetailerService.addRetailer(
      {
        vehicleId: selectedVehicleId,
        targetPosition: isNaN(pos) ? undefined : pos,
        name: nameInput.trim(),
        phone: phoneInput.trim() || 'N/A',
        initialDue,
        password: passwordInput.trim() || '123'
      },
      currentUser.id,
      currentUser.name
    );

    setCreatedResult({
      loginCode: res.user.code,
      pass: res.user.password
    });

    loadData();
  };

  const handleDelete = (r: Retailer) => {
    if (!currentUser) return;
    const confirm = window.confirm(
      `Are you sure you want to deactivate (archive) ${r.name}? Subsequent serial numbers will automatically shift up.`
    );
    if (confirm) {
      RetailerService.deleteRetailer(r.id, currentUser.id, currentUser.name);
      loadData();
    }
  };

  const handleRestore = (r: Retailer) => {
    if (!currentUser) return;
    const confirm = window.confirm(`Restore ${r.name} to active retailers?`);
    if (confirm) {
      RetailerService.restoreRetailer(r.id, currentUser.id, currentUser.name);
      loadData();
    }
  };

  // Open Password Modal
  const handleOpenPassword = (r: Retailer) => {
    const user = RetailerService.getOrCreateRetailerUser(r);
    setPasswordModalRetailer(r);
    setPasswordModalUser(user);
    setPasswordInputVal(user.password || '123');
    setLoginCodeInputVal(user.code);
    setShowPasswordPlain(true);
    setPasswordModalSuccess(null);
    setPasswordModalError(null);
    setCopiedLoginDetails(false);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalRetailer || !currentUser) return;

    if (!passwordInputVal.trim()) {
      setPasswordModalError('Password cannot be blank.');
      return;
    }

    const res = RetailerService.updateRetailerCredentials(
      passwordModalRetailer.id,
      passwordInputVal.trim(),
      loginCodeInputVal.trim(),
      currentUser.id,
      currentUser.name
    );

    if (!res.success) {
      setPasswordModalError(res.error || 'Failed to update credentials.');
      return;
    }

    setPasswordModalUser(res.user || null);
    setPasswordModalSuccess(`Credentials updated! Code: ${res.user?.code} | Password: ${res.user?.password}`);
    loadData();
    setTimeout(() => {
      setPasswordModalRetailer(null);
      setPasswordModalSuccess(null);
    }, 1500);
  };

  const handleCopyLoginDetails = () => {
    if (!passwordModalRetailer) return;
    const code = loginCodeInputVal.trim();
    const pass = passwordInputVal.trim();
    const text = `MilkDesk Retailer Login:
Retailer: ${passwordModalRetailer.name}
Login Code: ${code}
Password: ${pass}
Portal: ${window.location.origin}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedLoginDetails(true);
      setTimeout(() => setCopiedLoginDetails(false), 2500);
    });
  };

  const handleGenerateRandomPassword = () => {
    const randomPass = Math.random().toString(36).slice(-6);
    setPasswordInputVal(randomPass);
  };

  const handleResetToDefault123 = () => {
    setPasswordInputVal('123');
  };

  // Reorder serial position
  const handleOpenReorder = (r: Retailer) => {
    setReorderingRetailer(r);
    setNewSerialInput(String(r.serialNumber));
  };

  const handleSaveReorder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderingRetailer || !currentUser) return;
    const pos = parseInt(newSerialInput, 10);
    if (!isNaN(pos) && pos >= 1) {
      RetailerService.reorderRetailer(reorderingRetailer.id, pos, currentUser.id, currentUser.name);
      setReorderingRetailer(null);
      loadData();
    }
  };

  // Open Custom Pricing modal
  const handleOpenPricing = (r: Retailer) => {
    setPricingRetailer(r);
    const map: Record<string, string> = {};
    for (const p of products) {
      const customP = r.customPrices?.[p.id];
      map[p.id] = customP !== undefined ? String(customP) : '';
    }
    setCustomPriceMap(map);
  };

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingRetailer || !currentUser) return;

    for (const p of products) {
      const valStr = customPriceMap[p.id]?.trim();
      const valNum = valStr ? parseFloat(valStr) : null;
      PricingService.setRetailerPrice(pricingRetailer.id, p.id, valNum, currentUser.id, currentUser.name);
    }

    setPricingRetailer(null);
    loadData();
  };

  const currentVeh = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
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
            {retailers.length} Retailers assigned
          </span>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Retailer to {currentVeh?.name}</span>
        </button>
      </div>

      {/* Auto-shifting Note Banner */}
      <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 flex items-start gap-2">
        <Store className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Auto-shifting Serial Sequence:</strong> Serial numbers are isolated per vehicle. When adding a new retailer at position 2, existing positions 2, 3... automatically shift down to 3, 4. Deleting a retailer shifts following serials up.
        </div>
      </div>

      {/* Active vs Archived Filter Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold w-fit gap-1">
        <button
          onClick={() => setViewTab('active')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            viewTab === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Active Retailers ({retailers.length})
        </button>
        <button
          onClick={() => setViewTab('archived')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            viewTab === 'archived' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Archived / Inactive ({archivedRetailers.length})
        </button>
      </div>

      {/* Retailers Table (Active) */}
      {viewTab === 'active' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-14 text-center">Sr #</th>
                  <th className="px-4 py-3">Retailer Name</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Login Code</th>
                  <th className="px-3 py-3 text-right">Balance Due</th>
                  <th className="px-3 py-3 text-center">Custom Rates</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retailers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No active retailers in this vehicle. Click "Add Retailer" above to assign.
                    </td>
                  </tr>
                ) : (
                  retailers.map((r) => {
                    const users = Database.getUsers();
                    const retUser = users.find(u => u.retailerId === r.id);
                    const customRatesCount = Object.keys(r.customPrices || {}).length;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 text-brand-800 font-extrabold text-xs">
                            {r.serialNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                          {r.name}
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-medium">
                          {r.phone}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-slate-700">
                          <button
                            type="button"
                            onClick={() => handleOpenPassword(r)}
                            className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-amber-900 bg-slate-100 hover:bg-amber-100/70 px-2 py-0.5 rounded-md border border-slate-200 hover:border-amber-300 transition-colors text-xs"
                            title={`Click to view/change login & password for ${r.name}`}
                          >
                            <Key className="w-3 h-3 text-amber-600" />
                            <span>{retUser ? retUser.code : 'Set Pass'}</span>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900">
                          {r.balanceDue > 0 ? (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                              ₹{r.balanceDue.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-emerald-700">₹0</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => handleOpenPricing(r)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                              customRatesCount > 0
                                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>{customRatesCount > 0 ? `${customRatesCount} Overrides` : 'Default'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenPassword(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-lg text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95"
                              title={`Set / View Password for ${r.name}`}
                            >
                              <Key className="w-3.5 h-3.5 text-amber-700" />
                              <span>Password</span>
                            </button>
                            <button
                              onClick={() => handleOpenReorder(r)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                              title="Change Serial Sequence Position"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(r)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                              title="Archive Retailer"
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

      {/* Retailers Table (Archived / Inactive) */}
      {viewTab === 'archived' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Retailer Name</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3 text-right">Balance Due</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedRetailers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No archived retailers for this vehicle.
                    </td>
                  </tr>
                ) : (
                  archivedRetailers.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {r.name}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {r.phone}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">
                        ₹{r.balanceDue.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                          Inactive
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenPassword(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-lg text-xs font-bold transition-all"
                            title={`Set / View Password for ${r.name}`}
                          >
                            <Key className="w-3.5 h-3.5 text-amber-700" />
                            <span>Password</span>
                          </button>
                          <button
                            onClick={() => handleRestore(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-lg transition-colors"
                            title="Restore retailer to active list"
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

      {/* =========================================================================
          ADD RETAILER MODAL
         ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-700" /> Add Retailer to {currentVeh?.name}
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
                  <Check className="w-5 h-5 text-emerald-600" /> Retailer Registered Successfully!
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs space-y-1">
                  <div><strong>Login Code:</strong> <span className="font-mono text-brand-800 text-sm font-black">{createdResult.loginCode}</span></div>
                  <div><strong>Password:</strong> <span className="font-mono text-brand-800 text-sm font-black">{createdResult.pass}</span></div>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Provide these credentials to the retailer for mobile order submission.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveNewRetailer} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Retailer Shop / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Ramesh Dairy"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  />
                  <span className="text-[10px] text-slate-400">Address is NOT required by policy.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Serial Position #
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={targetPosInput}
                      onChange={(e) => setTargetPosInput(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                    />
                    <span className="text-[10px] text-slate-400">Shifts existing down</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Due (₹)
                    </label>
                    <input
                      type="number"
                      value={initialDueInput}
                      onChange={(e) => setInitialDueInput(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
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
                    Create & Generate Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          REORDER POSITION MODAL
         ========================================================================= */}
      {reorderingRetailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5 border border-slate-200 animate-scaleUp">
            <h3 className="font-extrabold text-slate-900 text-sm mb-1">
              Change Position for {reorderingRetailer.name}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Current Serial: #{reorderingRetailer.serialNumber}. Other retailers will automatically shift.
            </p>

            <form onSubmit={handleSaveReorder} className="space-y-3">
              <input
                type="number"
                min={1}
                max={retailers.length}
                value={newSerialInput}
                onChange={(e) => setNewSerialInput(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReorderingRetailer(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg"
                >
                  Update Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          CUSTOM PRODUCT PRICING MODAL
         ========================================================================= */}
      {pricingRetailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Custom Rates: {pricingRetailer.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Leave blank to use default global price. Custom prices participate in relative delta price shifts.
                </p>
              </div>
              <button
                onClick={() => setPricingRetailer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePricing} className="mt-3 space-y-3">
              <div className="max-h-64 overflow-y-auto pr-1 divide-y divide-slate-100">
                {products.map(p => (
                  <div key={p.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-400">Default: ₹{p.defaultPrice} / {p.unit}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        placeholder={String(p.defaultPrice)}
                        value={customPriceMap[p.id] || ''}
                        onChange={(e) => setCustomPriceMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-20 py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPricingRetailer(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-xs"
                >
                  Save Rates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          RETAILER PASSWORD & CREDENTIALS MODAL
         ========================================================================= */}
      {passwordModalRetailer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-amber-200/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs">
                  <Key className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Retailer Password & Login
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Credentials for {passwordModalRetailer.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalRetailer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Retailer Quick Summary Banner */}
            <div className="mt-3.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">{passwordModalRetailer.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Phone: <span className="font-semibold text-slate-700">{passwordModalRetailer.phone}</span> • Route Pos: <span className="font-bold text-amber-800">#{passwordModalRetailer.serialNumber}</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                passwordModalRetailer.active ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {passwordModalRetailer.active ? 'Active' : 'Archived'}
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

            <form onSubmit={handleSavePassword} className="mt-4 space-y-3.5">
              {/* Login Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Retailer Login Code
                </label>
                <input
                  type="text"
                  value={loginCodeInputVal}
                  onChange={(e) => setLoginCodeInputVal(e.target.value.toUpperCase())}
                  placeholder="e.g. RET01"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Unique login code used on the sign-in screen</p>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Portal Password
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={handleResetToDefault123}
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
                    type={showPasswordPlain ? 'text' : 'password'}
                    value={passwordInputVal}
                    onChange={(e) => setPasswordInputVal(e.target.value)}
                    placeholder="Enter password"
                    className="w-full py-2 pl-3 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordPlain(!showPasswordPlain)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPasswordPlain ? 'Hide Password' : 'Show Password'}
                  >
                    {showPasswordPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Copy WhatsApp / SMS details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopyLoginDetails}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    copiedLoginDetails
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {copiedLoginDetails ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Details to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Details for WhatsApp / SMS</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalRetailer(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Save Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
