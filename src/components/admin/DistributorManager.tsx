import React, { useState, useEffect } from 'react';
import { Distributor, DistributorLedger } from '../../types';
import { Database, getTodayDateString } from '../../services/storage';
import { DistributorService } from '../../services/distributorService';
import { CredentialService } from '../../services/credentialService';
import { PdfService } from '../../services/pdfService';
import { useAuth } from '../../context/AuthContext';
import {
  Building2, Plus, Download, Save, Calendar, Check,
  CreditCard, Truck, ChevronRight, X, Key, Eye, EyeOff,
  Sparkles, Copy, AlertTriangle, Phone
} from 'lucide-react';

export const DistributorManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>('dist_1');
  const [date, setDate] = useState<string>(getTodayDateString());

  // Current ledger state
  const [ledger, setLedger] = useState<DistributorLedger | null>(null);
  const [kirayaInput, setKirayaInput] = useState<string>('0');
  const [paymentInput, setPaymentInput] = useState<string>('0');
  const [notesInput, setNotesInput] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Add Distributor Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123');
  const [createdResult, setCreatedResult] = useState<{ code: string; pass: string } | null>(null);

  // Distributor Password Modal State
  const [passwordModalDistributor, setPasswordModalDistributor] = useState<Distributor | null>(null);
  const [distPasswordVal, setDistPasswordVal] = useState<string>('123');
  const [distCodeVal, setDistCodeVal] = useState<string>('');
  const [showDistPasswordPlain, setShowDistPasswordPlain] = useState<boolean>(false);
  const [copiedDistDetails, setCopiedDistDetails] = useState<boolean>(false);
  const [distModalSuccess, setDistModalSuccess] = useState<string | null>(null);
  const [distModalError, setDistModalError] = useState<string | null>(null);

  const loadData = () => {
    const list = Database.getDistributors().filter(d => d.active);
    setDistributors(list);
    if (list.length > 0 && !list.some(d => d.id === selectedDistributorId)) {
      setSelectedDistributorId(list[0].id);
    }
  };

  const handleOpenDistPasswordModal = (d: Distributor) => {
    const u = CredentialService.getUserForDistributor(d.id);
    setPasswordModalDistributor(d);
    setDistCodeVal(u ? u.code : d.code);
    setDistPasswordVal(u ? u.password : '123');
    setShowDistPasswordPlain(false);
    setCopiedDistDetails(false);
    setDistModalSuccess(null);
    setDistModalError(null);
  };

  const handleSaveDistPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalDistributor || !currentUser) return;

    if (!distPasswordVal.trim()) {
      setDistModalError('Password cannot be empty.');
      return;
    }

    const u = CredentialService.getUserForDistributor(passwordModalDistributor.id);
    if (!u) {
      setDistModalError('Could not find user account for this distributor.');
      return;
    }

    const res = CredentialService.updateCredentials(
      u.id,
      distCodeVal.trim(),
      distPasswordVal.trim(),
      currentUser.id,
      currentUser.name
    );

    if (!res.success) {
      setDistModalError(res.error || 'Failed to update credentials.');
      return;
    }

    setDistModalSuccess(`Distributor credentials saved! Code: ${distCodeVal.toUpperCase()} | Pass: ${distPasswordVal.trim()}`);
    loadData();
    setTimeout(() => {
      setPasswordModalDistributor(null);
      setDistModalSuccess(null);
    }, 1500);
  };

  const handleCopyDistDetails = () => {
    if (!passwordModalDistributor) return;
    const text = `MilkDesk Distributor Login:
Distributor: ${passwordModalDistributor.name}
Login Code: ${distCodeVal.toUpperCase()}
Password: ${distPasswordVal.trim()}
Portal: ${window.location.origin}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedDistDetails(true);
      setTimeout(() => setCopiedDistDetails(false), 2500);
    });
  };

  const handleResetDistTo123 = () => {
    setDistPasswordVal('123');
  };

  const handleGenerateRandomDistPassword = () => {
    const randomPass = Math.random().toString(36).slice(-6);
    setDistPasswordVal(randomPass);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedDistributorId) return;
    const l = DistributorService.getLedgerForDate(selectedDistributorId, date);
    setLedger(l);
    setKirayaInput(String(l.kirayaAmount));
    setPaymentInput(String(l.paymentReceived));
    setNotesInput(l.notes || '');
  }, [selectedDistributorId, date]);

  const handleSaveLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistributorId || !currentUser) return;

    const k = parseFloat(kirayaInput) || 0;
    const p = parseFloat(paymentInput) || 0;

    const updated = DistributorService.updateLedger({
      distributorId: selectedDistributorId,
      date,
      kirayaAmount: k,
      paymentReceived: p,
      notes: notesInput.trim(),
      adminId: currentUser.id,
      adminName: currentUser.name
    });

    setLedger(updated);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  const handleDownloadPDF = () => {
    if (!selectedDistributorId) return;
    PdfService.generateDistributorStatementPDF(selectedDistributorId, date);
  };

  const handleSaveNewDistributor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    const res = DistributorService.createDistributor(
      { name, phone, password },
      currentUser.id,
      currentUser.name
    );

    setCreatedResult({
      code: res.distributor.code,
      pass: res.user.password
    });

    loadData();
  };

  const currentDist = distributors.find(d => d.id === selectedDistributorId);

  // Live computed values in form
  const liveKiraya = parseFloat(kirayaInput) || 0;
  const livePayment = parseFloat(paymentInput) || 0;
  const livePrevious = ledger ? ledger.previousBaki : 0;
  const liveTotal = liveKiraya + livePrevious;
  const liveRemaining = liveTotal - livePayment;

  return (
    <div className="space-y-4">
      {/* Top Bar: Selector & Add */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Distributor:</label>
          <select
            value={selectedDistributorId}
            onChange={(e) => setSelectedDistributorId(e.target.value)}
            className="bg-slate-50 border border-slate-300 font-bold text-slate-800 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-600 focus:outline-hidden"
          >
            {distributors.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none focus:outline-hidden cursor-pointer text-xs font-bold"
            />
          </div>

          {currentDist && (
            <button
              onClick={() => handleOpenDistPasswordModal(currentDist)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title={`Manage password for ${currentDist.name}`}
            >
              <Key className="w-3.5 h-3.5 text-amber-700" />
              <span>Password ({currentDist.code})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Statement PDF</span>
          </button>
          <button
            onClick={() => {
              setName('');
              setPhone('');
              setPassword('123');
              setCreatedResult(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Distributor</span>
          </button>
        </div>
      </div>

      {/* Financial Statement Card for Chosen Date */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Financial Formula Summary Cards */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 text-white rounded-2xl p-5 shadow-md">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-200 mb-1">
              Transport Rent (Kiraya) Record
            </div>
            <h3 className="text-xl font-extrabold">{currentDist?.name}</h3>
            <p className="text-xs text-brand-300 mt-0.5">Date: {date}</p>

            <div className="mt-5 space-y-2 text-xs border-t border-brand-700/60 pt-4">
              <div className="flex justify-between items-center text-slate-300">
                <span>Today's Kiraya:</span>
                <span className="font-extrabold text-white text-sm">₹{liveKiraya.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Previous Baki (Pending):</span>
                <span className="font-bold text-amber-300">₹{livePrevious.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-white pt-1 border-t border-brand-700/40">
                <span>TOTAL:</span>
                <span className="text-base text-white">₹{liveTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-300">
                <span>Today's Payment:</span>
                <span className="font-extrabold">₹{livePayment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center font-black text-rose-300 text-sm pt-1 border-t border-brand-700/40">
                <span>REMAINING:</span>
                <span className="text-lg text-rose-300">₹{liveRemaining.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-900">
            <strong className="font-bold">Automatic Balance Forwarding:</strong> Previous Baki automatically carries forward from the preceding date. If you update an old date, all subsequent records automatically re-compute.
          </div>
        </div>

        {/* Right: Data Entry / Edit Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-700" /> Enter Daily Kiraya & Payment for {date}
            </h3>
            {saveFeedback && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1 animate-fadeIn">
                <Check className="w-3.5 h-3.5" /> Saved & Recalculated!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveLedger} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Today's Kiraya (Transport Rent ₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={kirayaInput}
                  onChange={(e) => setKirayaInput(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base font-extrabold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                />
                <span className="text-[10px] text-slate-400">Plant freight / crate transport cost</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Today's Payment Received (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                  placeholder="e.g. 4000"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base font-extrabold text-emerald-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Cash or bank transfer received today</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Dispatch Notes / Crate Count
              </label>
              <input
                type="text"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="e.g. Morning dispatch 120 crates, receipt #442"
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-md shadow-brand-900/10 flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save & Update Kiraya Record</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Registered Distributors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-700" />
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
              All Distributors & Login Passwords
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            {distributors.length} Registered Plants
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Distributor / Plant Name</th>
                <th className="px-3 py-2.5">Login Code</th>
                <th className="px-3 py-2.5">Phone Contact</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {distributors.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {d.name}
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-purple-900">
                    {d.code}
                  </td>
                  <td className="px-3 py-3 text-slate-600 font-medium">
                    {d.phone || 'No phone'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold uppercase">
                      Active
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenDistPasswordModal(d)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="View or Change Distributor Password"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      <span>Password</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Distributor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-700" /> Add New Distributor
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
                  <Check className="w-5 h-5 text-emerald-600" /> Distributor Added Successfully!
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
              <form onSubmit={handleSaveNewDistributor} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Distributor Name / Plant *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kisan Milk Plant"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / Contact
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
                    className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs"
                  >
                    Create Distributor
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Distributor Password Management Modal */}
      {passwordModalDistributor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shadow-xs">
                  <Key className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Distributor Password & Login
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Credentials for {passwordModalDistributor.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalDistributor(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Distributor Summary Banner */}
            <div className="mt-3.5 p-3 bg-purple-50/60 rounded-xl border border-purple-200/70 flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">{passwordModalDistributor.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Phone: <span className="font-semibold text-slate-700">{passwordModalDistributor.phone || 'No phone'}</span>
                  <span className="ml-1 text-purple-900 font-bold">• Plant / Freight</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                passwordModalDistributor.active ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {passwordModalDistributor.active ? 'Active' : 'Archived'}
              </span>
            </div>

            {distModalError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{distModalError}</span>
              </div>
            )}

            {distModalSuccess && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{distModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveDistPassword} className="mt-4 space-y-3.5">
              {/* Login Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Distributor Login Code
                </label>
                <input
                  type="text"
                  value={distCodeVal}
                  onChange={(e) => setDistCodeVal(e.target.value.toUpperCase())}
                  placeholder="e.g. DIS01"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Unique code used by distributor on sign-in screen</p>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Distributor Portal Password
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={handleResetDistTo123}
                      className="text-purple-800 hover:text-purple-950 underline font-semibold cursor-pointer"
                    >
                      Set "123"
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleGenerateRandomDistPassword}
                      className="text-purple-800 hover:text-purple-950 underline font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Random
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showDistPasswordPlain ? 'text' : 'password'}
                    value={distPasswordVal}
                    onChange={(e) => setDistPasswordVal(e.target.value)}
                    placeholder="Enter distributor password"
                    className="w-full py-2 pl-3 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowDistPasswordPlain(!showDistPasswordPlain)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showDistPasswordPlain ? 'Hide Password' : 'Show Password'}
                  >
                    {showDistPasswordPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Copy WhatsApp / SMS details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopyDistDetails}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    copiedDistDetails
                      ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {copiedDistDetails ? (
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
                  onClick={() => setPasswordModalDistributor(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Save Distributor Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
