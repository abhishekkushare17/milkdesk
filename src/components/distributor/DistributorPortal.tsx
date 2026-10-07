import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Distributor, DistributorLedger } from '../../types';
import { Database, getTodayDateString } from '../../services/storage';
import { DistributorService } from '../../services/distributorService';
import { PdfService } from '../../services/pdfService';
import { Building2, Calendar, Download, AlertCircle, FileSpreadsheet } from 'lucide-react';

export const DistributorPortal: React.FC = () => {
  const { currentUser } = useAuth();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [ledger, setLedger] = useState<DistributorLedger | null>(null);

  useEffect(() => {
    if (!currentUser || !currentUser.distributorId) return;
    const d = Database.getDistributors().find(x => x.id === currentUser.distributorId);
    if (d) setDistributor(d);
  }, [currentUser]);

  useEffect(() => {
    if (!distributor) return;
    const l = DistributorService.getLedgerForDate(distributor.id, selectedDate);
    setLedger(l);
  }, [distributor, selectedDate]);

  if (!currentUser || !currentUser.distributorId || !distributor || !ledger) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Distributor account is not linked. Please contact Admin.
      </div>
    );
  }

  const handleDownloadPDF = () => {
    PdfService.generateDistributorStatementPDF(distributor.id, selectedDate);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-12">
      {/* Distributor Header Card */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-purple-200 text-xs font-semibold uppercase tracking-wider">
            Distributor Transport & Rent Portal
          </span>
          <h2 className="text-2xl font-black mt-0.5">{distributor.name}</h2>
          <p className="text-xs text-purple-200 mt-1">Code: {distributor.code} • Contact: {distributor.phone}</p>
        </div>

        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold border border-white/20 shadow-xs transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Statement PDF</span>
        </button>
      </div>

      {/* Date Selector / Calendar (Specification 23) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Calendar className="w-4 h-4 text-purple-700" />
          <span>Select Date:</span>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-purple-600"
        />
      </div>

      {/* Financial Breakdown (Specification 22 Format) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Financial Transport Record ({selectedDate})
          </h3>
          <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
            Verified
          </span>
        </div>

        <div className="space-y-3 text-sm">
          {/* Today's Kiraya */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">TODAY'S KIRAYA (RENT)</span>
            <span className="text-lg font-black text-slate-900">₹{ledger.kirayaAmount.toLocaleString()}</span>
          </div>

          {/* Previous Baki */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">PREVIOUS BAKI (PENDING)</span>
            <span className="text-lg font-black text-amber-950">₹{ledger.previousBaki.toLocaleString()}</span>
          </div>

          {/* Total */}
          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
            <span className="text-xs font-black text-purple-950 uppercase tracking-wide">TOTAL AMOUNT</span>
            <span className="text-xl font-black text-purple-950">₹{ledger.total.toLocaleString()}</span>
          </div>

          {/* Today Payment */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">TODAY'S PAYMENT RECEIVED</span>
            <span className="text-lg font-black text-emerald-800">₹{ledger.paymentReceived.toLocaleString()}</span>
          </div>

          {/* Remaining */}
          <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 flex items-center justify-between">
            <span className="text-xs font-black text-rose-950 uppercase tracking-wider">REMAINING BALANCE DUE</span>
            <span className="text-2xl font-black text-rose-700">₹{ledger.remaining.toLocaleString()}</span>
          </div>
        </div>

        {ledger.notes && (
          <div className="pt-2 text-xs text-slate-500 italic">
            Note: {ledger.notes}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-400">
        Strict privacy: Distributor portal displays only your dedicated transport and kiraya records.
      </div>
    </div>
  );
};
