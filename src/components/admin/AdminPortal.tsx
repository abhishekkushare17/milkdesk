import React, { useState } from 'react';
import {
  LayoutDashboard, History, Store, Package, Truck,
  UserCheck, Fuel, Building2, TrendingUp, Shield,
  Settings, Menu, X, FileText, ChevronRight
} from 'lucide-react';
import { LiveOrderDashboard } from './LiveOrderDashboard';
import { RetailerManager } from './RetailerManager';
import { ProductManager } from './ProductManager';
import { VehicleManager } from './VehicleManager';
import { DriverManager } from './DriverManager';
import { DistributorManager } from './DistributorManager';
import { ExpenseManager } from './ExpenseManager';
import { HistoryView } from './HistoryView';
import { ReportView } from './ReportView';
import { AdminUserManager } from './AdminUserManager';
import { AuditLogView } from './AuditLogView';
import { SettingsView } from './SettingsView';

interface AdminPortalProps {
  selectedDate: string;
}

type AdminTab =
  | 'dashboard'
  | 'history'
  | 'retailers'
  | 'products'
  | 'vehicles'
  | 'drivers'
  | 'expenses'
  | 'distributors'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings';

export const AdminPortal: React.FC<AdminPortalProps> = ({ selectedDate }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'Orders / History', icon: History },
    { id: 'retailers', label: 'Retailers', icon: Store },
    { id: 'products', label: 'Products & Pricing', icon: Package },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'drivers', label: 'Drivers', icon: UserCheck },
    { id: 'expenses', label: 'Fuel & Expenses', icon: Fuel },
    { id: 'distributors', label: 'Distributors', icon: Building2 },
    { id: 'reports', label: 'Reports / Profit', icon: TrendingUp },
    { id: 'users', label: 'Staff Admins', icon: Shield },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)] bg-slate-50">
      {/* Mobile Top Navigation Sub-Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between shadow-xs sticky top-14 z-30">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-xs"
        >
          <Menu className="w-4 h-4 text-brand-700" />
          <span className="capitalize">{navItems.find(n => n.id === activeTab)?.label}</span>
        </button>

        {/* Quick horizontal shortcuts for most common mobile emergency actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2 py-1 rounded text-xs font-bold ${
              activeTab === 'dashboard' ? 'bg-brand-700 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('retailers')}
            className={`px-2 py-1 rounded text-xs font-bold ${
              activeTab === 'retailers' ? 'bg-brand-700 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Retailers
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-2 py-1 rounded text-xs font-bold ${
              activeTab === 'expenses' ? 'bg-brand-700 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Fuel
          </button>
        </div>
      </div>

      {/* Mobile Fullscreen Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-xs bg-white h-full p-4 flex flex-col justify-between overflow-y-auto animate-slideRight">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <span className="font-extrabold text-slate-900 text-sm">Admin Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as AdminTab);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-brand-700 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
              MilkDesk v1.0 • Emergency Mobile Admin
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Desktop Sidebar (Specification 31 & 32) */}
      <aside className="hidden md:flex flex-col w-56 lg:w-60 bg-white border-r border-slate-200 shrink-0 p-3">
        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Operations
        </div>
        <nav className="space-y-0.5 flex-1">
          {navItems.slice(0, 8).map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-brand-50 text-brand-800 border-l-4 border-brand-700 font-extrabold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 pt-3 mb-1">
            Management & System
          </div>

          {navItems.slice(8).map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-brand-50 text-brand-800 border-l-4 border-brand-700 font-extrabold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Working Area */}
      <main className="flex-1 p-3 sm:p-5 max-w-7xl w-full mx-auto overflow-x-hidden">
        {activeTab === 'dashboard' && (
          <LiveOrderDashboard
            selectedDate={selectedDate}
            onNavigateToRetailers={() => setActiveTab('retailers')}
          />
        )}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'retailers' && <RetailerManager />}
        {activeTab === 'products' && <ProductManager />}
        {activeTab === 'vehicles' && <VehicleManager />}
        {activeTab === 'drivers' && <DriverManager />}
        {activeTab === 'expenses' && <ExpenseManager />}
        {activeTab === 'distributors' && <DistributorManager />}
        {activeTab === 'reports' && <ReportView />}
        {activeTab === 'users' && <AdminUserManager />}
        {activeTab === 'audit' && <AuditLogView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};
