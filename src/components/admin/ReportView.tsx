import React, { useState } from 'react';
import { Database, getTodayDateString, getDateDaysAgo } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { TrendingUp, Download, Calendar, DollarSign, Fuel, Wrench, ArrowUpRight } from 'lucide-react';

export const ReportView: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(getDateDaysAgo(7));
  const [endDate, setEndDate] = useState<string>(getTodayDateString());

  const orders = Database.getOrders().filter(o => o.date >= startDate && o.date <= endDate);
  const payments = Database.getPayments().filter(p => p.date >= startDate && p.date <= endDate);
  const fuelEntries = Database.getFuelEntries().filter(f => f.date >= startDate && f.date <= endDate);
  const vehicleExpenses = Database.getVehicleExpenses().filter(e => e.date >= startDate && e.date <= endDate);

  const totalSales = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = Math.max(0, totalSales - totalPayments);

  const fuelExpenses = fuelEntries.reduce((s, f) => s + (f.amount || 0), 0);
  const repairExpenses = vehicleExpenses
    .filter(e => e.expenseType === 'Repair' || e.expenseType === 'Tyre')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const otherExpenses = vehicleExpenses
    .filter(e => e.expenseType !== 'Repair' && e.expenseType !== 'Tyre')
    .reduce((s, e) => s + (e.amount || 0), 0);

  const overallExpenses = fuelExpenses + repairExpenses + otherExpenses;
  const netResult = totalPayments - overallExpenses;

  const handleDownloadPDF = () => {
    PdfService.generateFinancialReportPDF(startDate, endDate);
  };

  return (
    <div className="space-y-4">
      {/* Date Range Selector Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Business Financial & Profit Summary
          </h2>
          <p className="text-xs text-slate-500">
            Dedicated financial report area isolated from the daily live order dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <label className="text-slate-500">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none focus:outline-hidden font-bold cursor-pointer"
            />
            <label className="text-slate-500 ml-2">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none focus:outline-hidden font-bold cursor-pointer"
            />
          </div>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report PDF</span>
          </button>
        </div>
      </div>

      {/* Net Result Highlight Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-2xl p-5 border text-white shadow-md ${
          netResult >= 0
            ? 'bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 border-emerald-600'
            : 'bg-gradient-to-br from-rose-800 via-rose-700 to-red-900 border-rose-600'
        }`}>
          <div className="text-xs font-bold uppercase tracking-wider opacity-90">Net Cash Inflow / Result</div>
          <div className="text-3xl font-black mt-1">₹{netResult.toLocaleString()}</div>
          <p className="text-xs opacity-80 mt-2">
            Total Collections (₹{totalPayments.toLocaleString()}) minus Total Operating Expenses (₹{overallExpenses.toLocaleString()})
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Total Billed Sales</div>
            <div className="text-2xl font-black text-slate-900 mt-1">₹{totalSales.toLocaleString()}</div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 flex justify-between">
            <span>Orders Count:</span>
            <span className="font-bold text-slate-800">{orders.length} orders</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Uncollected / Pending Sales</div>
            <div className="text-2xl font-black text-rose-700 mt-1">₹{totalPending.toLocaleString()}</div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 flex justify-between">
            <span>Payment Collection Rate:</span>
            <span className="font-bold text-emerald-700">
              {totalSales > 0 ? Math.round((totalPayments / totalSales) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Income & Collections */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-emerald-50/80 border-b border-emerald-200 font-extrabold text-xs text-emerald-950 uppercase">
            Income & Collections Breakdown
          </div>
          <div className="p-4 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Total Retailer Orders Value:</span>
              <span className="font-bold text-slate-900">₹{totalSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Payments Collected by Admin & Drivers:</span>
              <span className="font-black text-emerald-700">₹{totalPayments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-slate-800">
              <span>Pending Outstanding from this Period:</span>
              <span className="text-rose-700">₹{totalPending.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-rose-50/80 border-b border-rose-200 font-extrabold text-xs text-rose-950 uppercase">
            Operating Expenses Breakdown
          </div>
          <div className="p-4 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-600" /> Fuel Expenses:
              </span>
              <span className="font-bold text-slate-900">₹{fuelExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-indigo-600" /> Vehicle Repairs & Tyres:
              </span>
              <span className="font-bold text-slate-900">₹{repairExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Other Miscellaneous Expenses:</span>
              <span className="font-bold text-slate-900">₹{otherExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-slate-800">
              <span>Total Operating Expenses:</span>
              <span className="text-rose-800">₹{overallExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
