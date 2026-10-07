import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Database } from '../../services/storage';
import { User as UserType, Role } from '../../types';
import {
  ShieldCheck, Lock, User, AlertCircle, ArrowRight,
  Truck, Store, Building2, Phone, Key, Check, X,
  MessageSquare, Sparkles, HelpCircle, RotateCcw, Search
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password & Account Recovery modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotRoleTab, setForgotRoleTab] = useState<Role | 'all'>('all');
  const [forgotQuery, setForgotQuery] = useState('');
  const [forgotResetSuccess, setForgotResetSuccess] = useState<string | null>(null);
  const [selectedRecoveryUser, setSelectedRecoveryUser] = useState<UserType | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim() || !password.trim()) {
      setError('Please enter both Login Code and Password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = login(code, password);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please check credentials.');
      }
      setLoading(false);
    }, 200);
  };

  const handleFillDemo = (demoCode: string, demoPass: string) => {
    setCode(demoCode);
    setPassword(demoPass);
    setError(null);
  };

  const handleResetForgottenPassword = (targetUser: UserType) => {
    const allUsers = Database.getUsers();
    const updated = allUsers.map(u => {
      if (u.id === targetUser.id) {
        return { ...u, password: '123' };
      }
      return u;
    });
    Database.setUsers(updated);
    setForgotResetSuccess(`Password for ${targetUser.name} (${targetUser.code}) has been reset to "123"!`);
    setCode(targetUser.code);
    setPassword('123');
    setError(null);
  };

  const handleContactAdminWhatsApp = (targetUser?: UserType) => {
    const settings = Database.getSettings();
    const cleanPhone = (settings.phone || '919829000000').replace(/[^0-9]/g, '');
    const userRoleStr = targetUser ? `for ${targetUser.name} (${targetUser.role.toUpperCase()} - Code: ${targetUser.code})` : '';
    const text = encodeURIComponent(`Hello Admin, I forgot my MilkDesk password ${userRoleStr}. Please assist with login credentials.`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/70 via-orange-50/30 to-slate-100 flex flex-col justify-center py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Icon & Name */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 via-brand-700 to-amber-950 text-white shadow-lg shadow-amber-900/20 mb-3 border border-amber-300/40">
            <span className="text-3xl font-black tracking-tight">MD</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">MilkDesk</h1>
          <p className="mt-1 text-sm text-slate-600 font-medium">Internal Milk Distribution & Delivery Operations</p>
        </div>

        {/* Login Card */}
        <div className="bg-white py-7 px-5 sm:px-8 shadow-xl rounded-2xl border border-slate-200/80">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-700" /> Authorized Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter the unique credentials provided by your Administrator.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                User Login Code
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. ADM01, RET01, DRV01"
                  autoCapitalize="characters"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotResetSuccess(null);
                    setSelectedRecoveryUser(null);
                  }}
                  className="text-xs font-bold text-brand-700 hover:text-brand-900 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-brand-700 hover:bg-brand-800 active:bg-brand-900 transition-colors shadow-md shadow-brand-900/20 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Verifying...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Forgot Password / Need Help Link */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Forgot login code or pass?</span>
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(true);
                setForgotResetSuccess(null);
                setSelectedRecoveryUser(null);
              }}
              className="font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Get Login Help</span>
            </button>
          </div>

          {/* Note regarding public registration */}
          <div className="mt-3 pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              No public registration available. New retailers, drivers, and distributors are registered directly by Business Admin.
            </p>
          </div>
        </div>

        {/* Demo Fast-Switch Box */}
        <div className="mt-6 bg-white/80 backdrop-blur-xs rounded-xl p-4 border border-slate-300/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider text-center mb-2.5">
            Test Accounts (Click to Auto-Fill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleFillDemo('ADM01', 'admin')}
              className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 text-left transition-colors"
            >
              <div className="font-bold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Admin</div>
              <div className="text-[10px] text-amber-800">ADM01 / admin</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('RET01', '123')}
              className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100 text-left transition-colors"
            >
              <div className="font-bold flex items-center gap-1"><Store className="w-3.5 h-3.5 text-blue-700" /> Retailer (Ramesh)</div>
              <div className="text-[10px] text-blue-800">RET01 / 123</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('DRV01', '123')}
              className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 text-left transition-colors"
            >
              <div className="font-bold flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-emerald-700" /> Driver (Vehicle 1)</div>
              <div className="text-[10px] text-emerald-800">DRV01 / 123</div>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('DIS01', '123')}
              className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 hover:bg-purple-100 text-left transition-colors"
            >
              <div className="font-bold flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-purple-700" /> Distributor</div>
              <div className="text-[10px] text-purple-800">DIS01 / 123</div>
            </button>
          </div>
        </div>
      </div>

      {/* Account Recovery & Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 animate-scaleUp max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs">
                  <Key className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Password & Account Recovery
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Self-service reset or contact administrator
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Alert */}
            {forgotResetSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs shrink-0 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{forgotResetSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-2.5 py-1 bg-emerald-700 text-white rounded-md text-[11px] font-bold hover:bg-emerald-800 shrink-0 cursor-pointer"
                >
                  Sign In Now
                </button>
              </div>
            )}

            {/* Role Filter Tabs */}
            <div className="mt-3 flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setForgotRoleTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                  forgotRoleTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Roles
              </button>
              <button
                type="button"
                onClick={() => setForgotRoleTab('retailer')}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                  forgotRoleTab === 'retailer'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Retailers
              </button>
              <button
                type="button"
                onClick={() => setForgotRoleTab('driver')}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                  forgotRoleTab === 'driver'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Drivers
              </button>
              <button
                type="button"
                onClick={() => setForgotRoleTab('distributor')}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                  forgotRoleTab === 'distributor'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Distributors
              </button>
              <button
                type="button"
                onClick={() => setForgotRoleTab('admin')}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                  forgotRoleTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admins
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-3 relative shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={forgotQuery}
                onChange={(e) => setForgotQuery(e.target.value)}
                placeholder="Search account by Name, Code (e.g. RET01, DRV01), or Phone..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              {forgotQuery && (
                <button
                  type="button"
                  onClick={() => setForgotQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List of Matching Accounts */}
            <div className="mt-3 flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50 min-h-[160px] max-h-[260px]">
              {(() => {
                const all = Database.getUsers();
                const matched = all.filter(u => {
                  if (!u.active) return false;
                  if (forgotRoleTab !== 'all' && u.role !== forgotRoleTab) return false;
                  if (!forgotQuery.trim()) return true;
                  const q = forgotQuery.toLowerCase();
                  return (
                    u.name.toLowerCase().includes(q) ||
                    u.code.toLowerCase().includes(q) ||
                    (u.phone && u.phone.includes(q))
                  );
                });

                if (matched.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No active accounts found matching "{forgotQuery}".
                    </div>
                  );
                }

                return matched.map(u => {
                  const getRoleIcon = () => {
                    switch (u.role) {
                      case 'admin':
                        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
                      case 'retailer':
                        return <Store className="w-4 h-4 text-blue-600" />;
                      case 'driver':
                        return <Truck className="w-4 h-4 text-emerald-600" />;
                      case 'distributor':
                        return <Building2 className="w-4 h-4 text-purple-600" />;
                    }
                  };

                  const getRoleBadgeClass = () => {
                    switch (u.role) {
                      case 'admin':
                        return 'bg-amber-100 text-amber-800';
                      case 'retailer':
                        return 'bg-blue-100 text-blue-800';
                      case 'driver':
                        return 'bg-emerald-100 text-emerald-800';
                      case 'distributor':
                        return 'bg-purple-100 text-purple-800';
                    }
                  };

                  return (
                    <div key={u.id} className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getRoleIcon()}
                          <span className="font-bold text-slate-900 text-xs truncate">{u.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getRoleBadgeClass()}`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Code: <strong className="font-mono text-slate-800">{u.code}</strong></span>
                          {u.phone && <span>• Tel: {u.phone}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResetForgottenPassword(u)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Instantly reset password to 123"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-700" />
                          <span>Reset to 123</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleContactAdminWhatsApp(u)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                          title="Contact Admin on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Support Footer Banner */}
            <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 shrink-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-800 shrink-0" />
                <span className="font-medium text-[11px]">
                  Need administrator verification? Contact Admin directly.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleContactAdminWhatsApp()}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
