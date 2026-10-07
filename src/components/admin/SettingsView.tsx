import React, { useState } from 'react';
import { Database } from '../../services/storage';
import { AppSettings } from '../../types';
import { Settings, Save, RotateCcw, Download, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(Database.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    Database.setSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    const confirm = window.confirm('Reset all sample data back to clean initial demo state?');
    if (confirm) {
      Database.resetToDefaults();
      setResetMsg('Database reset to clean sample data successfully.');
      setTimeout(() => setResetMsg(null), 3000);
    }
  };



  const handleExportBackup = () => {
    const snapshot = Database.getSnapshot();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `MilkDesk_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-700" /> Business Profile & System Settings
          </h2>
          <p className="text-xs text-slate-500">
            Configure header details for printed PDFs, operational defaults, and data backups.
          </p>
        </div>
      </div>

      {resetMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{resetMsg}</span>
        </div>
      )}

      {/* Business Details Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Name (Printed on PDFs)
              </label>
              <input
                type="text"
                required
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Office / Support Phone
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dairy Plant / Mandi Address
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-4 h-4" /> Settings Saved!
              </span>
            )}
            <button
              type="submit"
              className="ml-auto px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save Business Info
            </button>
          </div>
        </form>
      </div>

      {/* Data Management & Demo Reset */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
          Data Management & Database Controls
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportBackup}
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors flex items-start gap-2.5"
          >
            <Download className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 text-xs">Export JSON Backup</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Download full snapshot of users, orders & khata</p>
            </div>
          </button>

          <button
            onClick={handleResetDefaults}
            className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-colors flex items-start gap-2.5"
          >
            <RotateCcw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 text-xs">Reload Demo Data</div>
              <p className="text-[10px] text-amber-700 mt-0.5">Re-seed clean demo vehicles, retailers & orders</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
