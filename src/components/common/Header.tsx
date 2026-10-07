import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SyncService } from '../../services/syncService';
import { Database, getTodayDateString, subscribeToDatabase } from '../../services/storage';
import { CredentialService } from '../../services/credentialService';
import { SyncStatus, Notification } from '../../types';
import {
  Bell, Wifi, WifiOff, RefreshCw, LogOut, User as UserIcon,
  ChevronDown, Shield, Truck, Store, Building2, CheckCircle2,
  Key, Lock, Eye, EyeOff, Sparkles, AlertTriangle, Check, X
} from 'lucide-react';

interface HeaderProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  selectedDate: string;
  onChangeDate: (date: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate,
  onChangeDate
}) => {
  const { currentUser, logout, quickSwitch, refreshUser } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncService.getStatus());
  const [queueCount, setQueueCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Self-Service Change Password Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [showPassPlain, setShowPassPlain] = useState(false);
  const [passChangeSuccess, setPassChangeSuccess] = useState<string | null>(null);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);

  useEffect(() => {
    const unsubSync = SyncService.subscribe((status, count) => {
      setSyncStatus(status);
      setQueueCount(count);
    });

    const updateNotifs = () => {
      const all = Database.getNotifications();
      if (!currentUser) return;

      const filtered = all.filter(n => {
        if (currentUser.role === 'admin') return true;
        if (n.recipientRole === 'all') return true;
        if (n.recipientRole === currentUser.role) {
          if (!n.recipientUserId || n.recipientUserId === currentUser.id) return true;
        }
        return false;
      });
      setNotifications(filtered);
    };

    updateNotifs();
    const unsubDb = subscribeToDatabase(updateNotifs);
    window.addEventListener('storage', updateNotifs);

    return () => {
      unsubSync();
      unsubDb();
      window.removeEventListener('storage', updateNotifs);
    };
  }, [currentUser]);

  if (!currentUser) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    const all = Database.getNotifications();
    const updated = all.map(n => ({ ...n, isRead: true }));
    Database.setNotifications(updated);
    setNotifications(updated);
  };

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case 'admin':
        return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded"><Shield className="w-3 h-3 text-amber-700" /> ADMIN</span>;
      case 'retailer':
        return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 text-xs font-semibold px-2 py-0.5 rounded"><Store className="w-3 h-3 text-blue-700" /> RETAILER</span>;
      case 'driver':
        return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 text-xs font-semibold px-2 py-0.5 rounded"><Truck className="w-3 h-3 text-emerald-700" /> DRIVER</span>;
      case 'distributor':
        return <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 text-xs font-semibold px-2 py-0.5 rounded"><Building2 className="w-3 h-3 text-purple-700" /> DISTRIBUTOR</span>;
    }
  };

  const handleSaveOwnPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!newPassInput.trim()) {
      setPassChangeError('New password cannot be empty.');
      return;
    }

    if (newPassInput.trim() !== confirmPassInput.trim()) {
      setPassChangeError('Passwords do not match. Please re-enter.');
      return;
    }

    const res = CredentialService.updateCredentials(
      currentUser.id,
      currentUser.code,
      newPassInput.trim(),
      currentUser.id,
      currentUser.name
    );

    if (!res.success) {
      setPassChangeError(res.error || 'Failed to update password.');
      return;
    }

    refreshUser();
    setPassChangeSuccess('Your password has been changed successfully!');
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setPassChangeSuccess(null);
    }, 1500);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between h-14">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-800 to-brand-600 flex items-center justify-center text-white font-bold shadow-xs">
            <span className="text-lg tracking-tight">MD</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">MilkDesk</h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">Internal</span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block leading-none">Distribution & Logistics System</p>
          </div>
        </div>

        {/* Center / Right tools: Network Sync Pill & Date Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Offline / Sync Indicator Pill */}
          <button
            onClick={() => SyncService.toggleSimulateOffline()}
            title="Click to simulate offline / online mode"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              syncStatus === 'ONLINE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : syncStatus === 'OFFLINE'
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                : 'bg-amber-50 text-amber-700 border-amber-300'
            }`}
          >
            {syncStatus === 'ONLINE' && <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            {syncStatus === 'OFFLINE' && <WifiOff className="w-3.5 h-3.5 text-rose-600" />}
            {(syncStatus === 'SYNCING' || syncStatus === 'SYNC COMPLETE') && (
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            )}
            <span className="text-[11px]">{syncStatus}</span>
            {queueCount > 0 && (
              <span className="bg-rose-600 text-white text-[10px] px-1 rounded-full">{queueCount}</span>
            )}
          </button>

          {/* Quick Date Selector (Compact) */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-xs">
            <label className="text-slate-500 font-medium text-[11px]">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold text-xs border-none focus:outline-hidden cursor-pointer"
            />
            {selectedDate !== getTodayDateString() && (
              <button
                onClick={() => onChangeDate(getTodayDateString())}
                className="text-[10px] text-brand-700 font-bold hover:underline ml-1"
              >
                Today
              </button>
            )}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">In-App Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-brand-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition-colors ${n.isRead ? 'bg-white opacity-80' : 'bg-blue-50/50 font-medium'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Demo Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-800 border border-slate-200 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline max-w-[110px] truncate">{currentUser.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs">
                <div className="p-2 border-b border-slate-100 mb-1">
                  <div className="font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-slate-500 text-[11px] flex items-center justify-between mt-1">
                    <span>Code: {currentUser.code}</span>
                    {getRoleBadge()}
                  </div>
                </div>

                {/* Change My Password Action */}
                <div className="py-1 border-b border-slate-100 mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePasswordModal(true);
                      setShowUserMenu(false);
                      setNewPassInput('');
                      setConfirmPassInput('');
                      setPassChangeError(null);
                      setPassChangeSuccess(null);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-50 text-amber-900 font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      <span>Change My Password</span>
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                      {currentUser.code}
                    </span>
                  </button>
                </div>

                {/* Quick Role Switcher (For Pair-Programming & Verification) */}
                <div className="p-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Switch Account:</div>
                <div className="grid grid-cols-1 gap-1 mb-2">
                  <button
                    onClick={() => { quickSwitch('ADM01'); setShowUserMenu(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center justify-between text-slate-700"
                  >
                    <span>Prem (Admin)</span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">ADM01</span>
                  </button>
                  <button
                    onClick={() => { quickSwitch('RET01'); setShowUserMenu(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center justify-between text-slate-700"
                  >
                    <span>Ramesh (Retailer)</span>
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1 rounded">RET01</span>
                  </button>
                  <button
                    onClick={() => { quickSwitch('DRV01'); setShowUserMenu(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center justify-between text-slate-700"
                  >
                    <span>Suresh (Driver 1)</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded">DRV01</span>
                  </button>
                  <button
                    onClick={() => { quickSwitch('DIS01'); setShowUserMenu(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center justify-between text-slate-700"
                  >
                    <span>Kisan Milk (Distributor)</span>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-1 rounded">DIS01</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full text-left px-2 py-2 rounded text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Self-Service Change Password Modal */}
      {showChangePasswordModal && (
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
                    Change My Password
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Update your personal login security
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Account Info Banner */}
            <div className="mt-3.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Login Code: <strong className="font-mono text-slate-800">{currentUser.code}</strong>
                </div>
              </div>
              {getRoleBadge()}
            </div>

            {passChangeError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passChangeError}</span>
              </div>
            )}

            {passChangeSuccess && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passChangeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveOwnPassword} className="mt-4 space-y-3.5">
              {/* New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => { setNewPassInput('123'); setConfirmPassInput('123'); }}
                      className="text-amber-800 hover:text-amber-950 underline font-semibold cursor-pointer"
                    >
                      Set "123"
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const r = Math.random().toString(36).slice(-6);
                        setNewPassInput(r);
                        setConfirmPassInput(r);
                      }}
                      className="text-amber-800 hover:text-amber-950 underline font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Random
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showPassPlain ? 'text' : 'password'}
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full py-2 pl-3 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassPlain(!showPassPlain)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPassPlain ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassPlain ? 'text' : 'password'}
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Update My Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
