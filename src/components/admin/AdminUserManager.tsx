import React, { useState } from 'react';
import { User, AdminPermissions } from '../../types';
import { Database } from '../../services/storage';
import { CredentialService } from '../../services/credentialService';
import { useAuth } from '../../context/AuthContext';
import {
  Shield, Plus, Check, X, Key, Lock, UserCheck, Eye, EyeOff,
  Sparkles, Copy, AlertTriangle
} from 'lucide-react';

const DEFAULT_PERMISSIONS: AdminPermissions = {
  orders: true,
  payments: true,
  retailers: true,
  products: false,
  vehicles: false,
  drivers: false,
  distributors: false,
  reports: false,
  userManagement: false,
  deleteRecords: false
};

export const AdminUserManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>(Database.getUsers().filter(u => u.role === 'admin'));
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('admin123');
  const [permissions, setPermissions] = useState<AdminPermissions>({ ...DEFAULT_PERMISSIONS });
  const [createdResult, setCreatedResult] = useState<{ code: string; pass: string } | null>(null);

  // Admin Password Modal State
  const [passwordModalAdmin, setPasswordModalAdmin] = useState<User | null>(null);
  const [adminPasswordVal, setAdminPasswordVal] = useState<string>('admin123');
  const [adminCodeVal, setAdminCodeVal] = useState<string>('');
  const [showAdminPasswordPlain, setShowAdminPasswordPlain] = useState<boolean>(false);
  const [copiedAdminDetails, setCopiedAdminDetails] = useState<boolean>(false);
  const [adminModalSuccess, setAdminModalSuccess] = useState<string | null>(null);
  const [adminModalError, setAdminModalError] = useState<string | null>(null);

  const loadData = () => {
    setUsers(Database.getUsers().filter(u => u.role === 'admin'));
  };

  const handleOpenAdminPasswordModal = (u: User) => {
    setPasswordModalAdmin(u);
    setAdminCodeVal(u.code);
    setAdminPasswordVal(u.password);
    setShowAdminPasswordPlain(false);
    setCopiedAdminDetails(false);
    setAdminModalSuccess(null);
    setAdminModalError(null);
  };

  const handleSaveAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalAdmin || !currentUser) return;

    if (!adminPasswordVal.trim()) {
      setAdminModalError('Password cannot be empty.');
      return;
    }

    const res = CredentialService.updateCredentials(
      passwordModalAdmin.id,
      adminCodeVal.trim(),
      adminPasswordVal.trim(),
      currentUser.id,
      currentUser.name
    );

    if (!res.success) {
      setAdminModalError(res.error || 'Failed to update credentials.');
      return;
    }

    setAdminModalSuccess(`Admin credentials saved! Code: ${adminCodeVal.toUpperCase()} | Pass: ${adminPasswordVal.trim()}`);
    loadData();
    setTimeout(() => {
      setPasswordModalAdmin(null);
      setAdminModalSuccess(null);
    }, 1500);
  };

  const handleCopyAdminDetails = () => {
    if (!passwordModalAdmin) return;
    const text = `MilkDesk Admin Credentials:
Name: ${passwordModalAdmin.name}
Role: ${passwordModalAdmin.isSuperAdmin ? 'Super Admin / Owner' : 'Staff Admin'}
Login Code: ${adminCodeVal.toUpperCase()}
Password: ${adminPasswordVal.trim()}
Portal: ${window.location.origin}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedAdminDetails(true);
      setTimeout(() => setCopiedAdminDetails(false), 2500);
    });
  };

  const handleResetAdminToDefault = () => {
    setAdminPasswordVal(passwordModalAdmin?.isSuperAdmin ? 'admin' : 'admin123');
  };

  const handleGenerateRandomAdminPassword = () => {
    const randomPass = Math.random().toString(36).slice(-8);
    setAdminPasswordVal(randomPass);
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    const allUsers = Database.getUsers();
    const adminCodes = allUsers
      .filter(u => u.role === 'admin')
      .map(u => {
        const m = u.code.match(/ADM(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      });
    const nextCode = adminCodes.length > 0 ? Math.max(...adminCodes) + 1 : 2;
    const loginCode = `ADM${String(nextCode).padStart(2, '0')}`;

    const newAdmin: User = {
      id: 'usr_adm_' + Date.now(),
      code: loginCode,
      password: password.trim() || 'admin123',
      role: 'admin',
      name: name.trim(),
      isSuperAdmin: false,
      permissions,
      active: true,
      createdAt: new Date().toISOString()
    };

    Database.setUsers([...allUsers, newAdmin]);
    setCreatedResult({ code: loginCode, pass: newAdmin.password });
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-700" /> Admin Users & Granular Access Permissions
          </h2>
          <p className="text-xs text-slate-500">
            Create staff admins and restrict operations according to assigned duties.
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setPassword('admin123');
            setPermissions({ ...DEFAULT_PERMISSIONS });
            setCreatedResult(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Admin</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Admin Name</th>
                <th className="px-3 py-3">Login Code</th>
                <th className="px-3 py-3">Role Type</th>
                <th className="px-4 py-3">Granted Permissions</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                    {u.name}
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-brand-800">
                    {u.code}
                  </td>
                  <td className="px-3 py-3">
                    {u.isSuperAdmin ? (
                      <span className="bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded text-[10px]">
                        SUPER ADMIN
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        STAFF ADMIN
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.isSuperAdmin ? (
                      <span className="text-emerald-700 font-bold text-xs">Full System Control</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.permissions && Object.entries(u.permissions)
                          .filter(([_, granted]) => granted)
                          .map(([perm]) => (
                            <span key={perm} className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold capitalize">
                              {perm}
                            </span>
                          ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      ACTIVE
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenAdminPasswordModal(u)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="View or Change Admin Password"
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-700" /> Create Staff Admin
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
                  <Check className="w-5 h-5 text-emerald-600" /> Admin Account Created!
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
              <form onSubmit={handleSaveAdmin} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Staff Admin Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra (Manager)"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Granted Module Permissions:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {Object.keys(DEFAULT_PERMISSIONS).map(key => (
                      <label key={key} className="flex items-center gap-1.5 capitalize text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions[key as keyof AdminPermissions]}
                          onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-brand-600"
                        />
                        <span>{key}</span>
                      </label>
                    ))}
                  </div>
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
                    Create Staff Admin
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Password Management Modal */}
      {passwordModalAdmin && (
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
                    Admin Password & Login
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Credentials for {passwordModalAdmin.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalAdmin(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Summary Banner */}
            <div className="mt-3.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">{passwordModalAdmin.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Role: <span className="font-bold text-amber-900">{passwordModalAdmin.isSuperAdmin ? 'Super Admin / Owner' : 'Staff Admin'}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Active
              </span>
            </div>

            {adminModalError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{adminModalError}</span>
              </div>
            )}

            {adminModalSuccess && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{adminModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdminPassword} className="mt-4 space-y-3.5">
              {/* Login Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Login Code
                </label>
                <input
                  type="text"
                  value={adminCodeVal}
                  onChange={(e) => setAdminCodeVal(e.target.value.toUpperCase())}
                  placeholder="e.g. ADM01"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Unique code used on sign-in screen</p>
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
                      onClick={handleResetAdminToDefault}
                      className="text-amber-800 hover:text-amber-950 underline font-semibold cursor-pointer"
                    >
                      Set Default
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleGenerateRandomAdminPassword}
                      className="text-amber-800 hover:text-amber-950 underline font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Random
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showAdminPasswordPlain ? 'text' : 'password'}
                    value={adminPasswordVal}
                    onChange={(e) => setAdminPasswordVal(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full py-2 pl-3 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPasswordPlain(!showAdminPasswordPlain)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showAdminPasswordPlain ? 'Hide Password' : 'Show Password'}
                  >
                    {showAdminPasswordPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Copy WhatsApp / SMS details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopyAdminDetails}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    copiedAdminDetails
                      ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {copiedAdminDetails ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Details to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Admin Credentials</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalAdmin(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Save Admin Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
