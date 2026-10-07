import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Shift } from '../types';
import { Database } from './storage';
import { OrderService } from './orderService';
import { DistributorService } from './distributorService';

export class PdfService {
  /**
   * VEHICLE DAILY ORDER SHEET PDF
   * Strictly respects all prompt rules:
   * - No ₹ symbol in Payment column
   * - Blank if no payment
   * - No 0 or "No Payment"
   * - No payment total in TOTAL row
   * - Product totals in the single unified TOTAL row
   * - Product columns in display position order with short names
   * - Warm Dairy Golden / Amul Amber brand identity
   */
  public static generateVehicleOrderSheet(vehicleId: string, date: string, shift: Shift): void {
    const settings = Database.getSettings();
    const vehicles = Database.getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const vehicleName = vehicle ? vehicle.name : 'All Vehicles';
    const drivers = Database.getDrivers();
    const driver = drivers.find(d => d.assignedVehicleId === vehicleId);
    const driverName = driver ? driver.name : (vehicle?.notes || 'Assigned Driver');

    const products = Database.getProducts()
      .filter(p => p.active)
      .sort((a, b) => a.displayPosition - b.displayPosition);

    const { rows, productTotals } = OrderService.getVehicleOrderSheet(vehicleId, date, shift);

    // Orientation: landscape if more than 5 products, else portrait
    const orientation = products.length > 5 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    // Header styling - Warm Dairy Golden / Amul Amber (#b45309 = [180, 83, 9])
    doc.setFillColor(180, 83, 9);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.businessName.toUpperCase(), 14, 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('DAILY ORDER & DELIVERY DEMAND SHEET', 14, 17);

    // Subheader details
    doc.setTextColor(69, 26, 3);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    const leftColX = 14;
    const midColX = doc.internal.pageSize.getWidth() / 2;

    doc.text(`Date: ${date}`, leftColX, 29);
    doc.text(`Shift: ${shift.toUpperCase()}`, leftColX, 34);
    doc.text(`Vehicle: ${vehicleName} ${vehicle?.registrationNumber ? `(${vehicle.registrationNumber})` : ''}`, midColX, 29);
    doc.text(`Driver: ${driverName}`, midColX, 34);

    // Prepare table headers: Sr, Retailer Name, [Product Short Names], Payment
    const tableHeaders = [
      'Sr',
      'Retailer Name',
      ...products.map(p => p.shortName.toUpperCase()),
      'Payment'
    ];

    // Prepare table body rows
    const tableBody: (string | number)[][] = [];

    for (const r of rows) {
      const rowData: (string | number)[] = [
        r.serialNumber,
        r.retailerName,
      ];

      for (const prod of products) {
        const qty = r.quantities[prod.id];
        rowData.push(qty && qty > 0 ? qty : '');
      }

      // Payment column rule:
      // If no payment: completely blank cell (NO ₹, NO 0, NO "No Payment")
      // If payment: only the number (e.g. 500, 1000)
      if (r.paymentAmount !== null && r.paymentAmount > 0) {
        rowData.push(r.paymentAmount);
      } else {
        rowData.push('');
      }

      tableBody.push(rowData);
    }

    // Prepare TOTAL row inside the table
    const totalRow: (string | number)[] = ['TOTAL', ''];
    for (const prod of products) {
      const totalQty = productTotals[prod.id] || 0;
      totalRow.push(totalQty > 0 ? totalQty : '');
    }
    // Payment column in TOTAL row: MUST BE BLANK!
    totalRow.push('');
    tableBody.push(totalRow);

    // Render table with warm dairy golden headers
    autoTable(doc, {
      head: [tableHeaders],
      body: tableBody,
      startY: 38,
      theme: 'grid',
      headStyles: {
        fillColor: [146, 64, 14], // Warm dairy amber-800
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' }, // Sr
        1: { halign: 'left', fontStyle: 'bold' }, // Retailer Name
        [tableHeaders.length - 1]: { halign: 'right', fontStyle: 'bold' }
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
        overflow: 'linebreak',
        lineColor: [253, 230, 138],
        lineWidth: 0.1,
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235], // Amber-50
      },
      didParseCell: (data) => {
        // Highlight the final TOTAL row
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fillColor = [254, 243, 199]; // Amber-100
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [120, 53, 15]; // Amber-900
        }
        if (data.column.index >= 2 && data.column.index < tableHeaders.length - 1) {
          data.cell.styles.halign = 'center';
        }
      },
      margin: { left: 14, right: 14, bottom: 14 }
    });

    const filename = `MilkDesk_${vehicleName.replace(/\s+/g, '_')}_${date}_${shift}.pdf`;
    doc.save(filename);
  }

  /**
   * RETAILER DAILY BILL / KHATA PDF
   */
  public static generateRetailerBillPDF(retailerId: string, date: string): void {
    const settings = Database.getSettings();
    const retailers = Database.getRetailers();
    const retailer = retailers.find(r => r.id === retailerId);
    if (!retailer) return;

    const khata = OrderService.getRetailerDailyKhata(retailerId, date);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header
    doc.setFillColor(180, 83, 9); // Warm Dairy Amber
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.businessName, 14, 11);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`RETAILER BILL & KHATA STATEMENT`, 14, 18);

    // Retailer & Date Info
    doc.setTextColor(69, 26, 3);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Retailer: ${retailer.name} (Sr #${retailer.serialNumber})`, 14, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(`Phone: ${retailer.phone}`, 14, 40);
    doc.text(`Date: ${date}`, doc.internal.pageSize.getWidth() - 50, 34);

    // Order items table
    const tableHeaders = ['Product Description', 'Unit', 'Rate', 'Quantity', 'Amount (₹)'];
    const tableBody = khata.items.map(item => [
      item.productName,
      item.unit,
      item.rate,
      item.quantity,
      item.subtotal
    ]);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableBody.length > 0 ? tableBody : [['No items ordered for this date', '', '', '', '0']],
      startY: 46,
      theme: 'grid',
      headStyles: { fillColor: [146, 64, 14], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'right', fontStyle: 'bold' }
      }
    });

    // Summary Box below the table
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable?.finalY || 100;

    const boxY = finalY + 8;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.rect(14, boxY, 182, 45, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(120, 53, 15);

    const lX = 20;
    const rX = 186;

    doc.text("Today's Order Amount:", lX, boxY + 8);
    doc.text(`₹${khata.todayOrderAmount}`, rX, boxY + 8, { align: 'right' });

    doc.text("Previous Pending Amount (Baki):", lX, boxY + 16);
    doc.text(`₹${khata.previousPendingAmount}`, rX, boxY + 16, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(69, 26, 3);
    doc.text("TOTAL AMOUNT:", lX, boxY + 24);
    doc.text(`₹${khata.totalAmount}`, rX, boxY + 24, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(5, 150, 105);
    doc.text("Today's Payment Received:", lX, boxY + 32);
    doc.text(`₹${khata.todayPayment}`, rX, boxY + 32, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text("REMAINING DUE:", lX, boxY + 40);
    doc.text(`₹${khata.remainingAmount}`, rX, boxY + 40, { align: 'right' });

    doc.save(`Bill_${retailer.name.replace(/\s+/g, '_')}_${date}.pdf`);
  }

  /**
   * DISTRIBUTOR TRANSPORT & RENT PDF
   */
  public static generateDistributorStatementPDF(distributorId: string, date: string): void {
    const settings = Database.getSettings();
    const distributors = Database.getDistributors();
    const dist = distributors.find(d => d.id === distributorId);
    if (!dist) return;

    const ledger = DistributorService.getLedgerForDate(distributorId, date);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFillColor(180, 83, 9); // Warm Dairy Amber
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.businessName, 14, 11);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`DISTRIBUTOR TRANSPORT RENT (KIRAYA) STATEMENT`, 14, 18);

    doc.setTextColor(69, 26, 3);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Distributor: ${dist.name}`, 14, 35);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Code: ${dist.code} | Phone: ${dist.phone}`, 14, 41);
    doc.text(`Date: ${date}`, doc.internal.pageSize.getWidth() - 50, 35);

    autoTable(doc, {
      head: [['Financial Field', 'Amount (₹)']],
      body: [
        ["Today's Transport Rent (Kiraya)", ledger.kirayaAmount],
        ["Previous Pending Amount (Baki)", ledger.previousBaki],
        ["TOTAL AMOUNT", ledger.total],
        ["Today's Payment Received", ledger.paymentReceived],
        ["REMAINING BALANCE DUE", ledger.remaining],
      ],
      startY: 48,
      theme: 'grid',
      headStyles: { fillColor: [146, 64, 14], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.index === 2) {
          data.cell.styles.fillColor = [254, 243, 199];
        }
        if (data.row.index === 4) {
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.textColor = [185, 28, 28];
        }
      }
    });

    doc.save(`Distributor_${dist.name.replace(/\s+/g, '_')}_${date}.pdf`);
  }

  /**
   * FINANCIAL PROFIT & EXPENSE REPORT PDF
   */
  public static generateFinancialReportPDF(startDate: string, endDate: string): void {
    const settings = Database.getSettings();
    const orders = Database.getOrders().filter(o => o.date >= startDate && o.date <= endDate);
    const payments = Database.getPayments().filter(p => p.date >= startDate && p.date <= endDate);
    const fuels = Database.getFuelEntries().filter(f => f.date >= startDate && f.date <= endDate);
    const expenses = Database.getVehicleExpenses().filter(e => e.date >= startDate && e.date <= endDate);

    const totalSales = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const pendingSales = Math.max(0, totalSales - totalPayments);

    const fuelTotal = fuels.reduce((s, f) => s + (f.amount || 0), 0);
    const repairTotal = expenses.filter(e => e.expenseType === 'Repair').reduce((s, e) => s + (e.amount || 0), 0);
    const otherExpenseTotal = expenses.filter(e => e.expenseType !== 'Repair').reduce((s, e) => s + (e.amount || 0), 0);
    const overallExpenses = fuelTotal + repairTotal + otherExpenseTotal;
    const netResult = totalPayments - overallExpenses;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFillColor(180, 83, 9); // Warm Dairy Amber
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.businessName, 14, 11);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`BUSINESS FINANCIAL & EXPENSE REPORT (${startDate} to ${endDate})`, 14, 18);

    autoTable(doc, {
      head: [['Metric', 'Amount (₹)']],
      body: [
        ['Total Sales Volume (Orders Value)', totalSales],
        ['Total Payments Collected', totalPayments],
        ['Pending Sales (Uncollected)', pendingSales],
        ['Fuel Expenses', fuelTotal],
        ['Vehicle Repair Expenses', repairTotal],
        ['Other Operational Expenses', otherExpenseTotal],
        ['Total Expenses (Fuel + Repairs + Others)', overallExpenses],
        ['NET CASH FLOW / PROFIT (Collection - Expenses)', netResult],
      ],
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [146, 64, 14], textColor: 255 },
      styles: { fontSize: 9.5, cellPadding: 3.5 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.row.index === 7) {
          data.cell.styles.fillColor = netResult >= 0 ? [236, 253, 245] : [254, 242, 242];
          data.cell.styles.textColor = netResult >= 0 ? [5, 150, 105] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    doc.save(`Financial_Report_${startDate}_to_${endDate}.pdf`);
  }
}
