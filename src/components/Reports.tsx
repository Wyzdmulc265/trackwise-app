import React, { useState, useMemo } from 'react';
import { useTrackWise } from '../context/TrackWiseContext';
import { formatCurrency } from '../utils/format';
import { 
  BarChart3, 
  Download, 
  Printer, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  PackageCheck,
  Percent,
  CalendarDays
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { transactions, inventory } = useTrackWise();
  const [reportPeriod, setReportPeriod] = useState<'30' | '7' | 'all'>('30');

  // Helper date parsing strings
  const getDaysArray = (numDays: number) => {
    const arr = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d.toISOString().split('T')[0]);
    }
    return arr;
  };

  // 1. Daily Profit Summary calculations
  const dailySummary = useMemo(() => {
    const itemMap = new Map(inventory.map(item => [item.id, item]));
    const days = getDaysArray(7); // past 7 days for quick summary list
    return days.map(dateStr => {
      const dayTx = transactions.filter(t => t.date === dateStr);
      const sales = dayTx.filter(t => t.type === 'sale').reduce((sum, t) => sum + Number(t.amount), 0);
      const purchases = dayTx.filter(t => t.type === 'purchase').reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = dayTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const cogs = dayTx
        .filter(t => t.type === 'sale' && t.itemId && t.quantity)
        .reduce((sum, t) => sum + ((Number(itemMap.get(t.itemId!)?.unitCost) || 0) * Number(t.quantity || 0)), 0);
      const profit = sales - cogs - expenses;
      
      return { date: dateStr, sales, outflows: purchases + expenses, profit };
    });
  }, [transactions, inventory]);

  // 2. Weekly Trend Calculations (last 4 weeks)
  const weeklyTrendData = useMemo(() => {
    const weeks = [
      { name: 'Week 4', startDaysAgo: 28, endDaysAgo: 22 },
      { name: 'Week 3', startDaysAgo: 21, endDaysAgo: 15 },
      { name: 'Week 2', startDaysAgo: 14, endDaysAgo: 8 },
      { name: 'Week 1 (Recent)', startDaysAgo: 7, endDaysAgo: 0 }
    ];

    return weeks.map(w => {
      const start = new Date();
      start.setDate(start.getDate() - w.startDaysAgo);
      const end = new Date();
      end.setDate(end.getDate() - w.endDaysAgo);

      const weekTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });

      const sales = weekTx.filter(t => t.type === 'sale').reduce((sum, t) => sum + Number(t.amount), 0);
      const outflows = weekTx.filter(t => t.type !== 'sale').reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        name: w.name,
        sales,
        outflows
      };
    });
  }, [transactions]);

  // Max value calculation for scaling the SVG chart nicely
  const maxChartValue = useMemo(() => {
    const values = weeklyTrendData.flatMap(w => [w.sales, w.outflows]);
    const max = Math.max(...values, 1000);
    return max * 1.15; // add buffer
  }, [weeklyTrendData]);

  // 3. Monthly Totals or Selected Period Totals
  const totalAggregates = useMemo(() => {
    const filtered = transactions.filter(t => {
      if (reportPeriod === 'all') return true;
      const txDate = new Date(t.date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= parseInt(reportPeriod);
    });

    const sales = filtered.filter(t => t.type === 'sale').reduce((sum, t) => sum + Number(t.amount), 0);
    const purchases = filtered.filter(t => t.type === 'purchase').reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    const cogs = inventory.reduce((sum, item) => sum + Number(item.cogs), 0);

    return {
      sales,
      purchases,
      expenses,
      profit: sales - cogs - expenses
    };
  }, [transactions, reportPeriod]);

  // 4. Product Profit Margins and Turnover metrics
  const productPerformance = useMemo(() => {
    return inventory.map(item => {
      const margin = item.unitPrice > 0 
        ? ((item.unitPrice - item.unitCost) / item.unitPrice) * 100 
        : 0;

      // Turnover ratio proxy: units sold / total inventory potential
      const potentialTotal = item.salesCount + item.quantity;
      const turnoverRatio = potentialTotal > 0 
        ? (item.salesCount / potentialTotal) * 100 
        : 0;

      return {
        ...item,
        margin,
        turnoverRatio
      };
    });
  }, [inventory]);

  // Excel / CSV Data Generation Export Handler
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add Report Header
    csvContent += `TrackWise Financial Report - Generated on ${new Date().toLocaleDateString()}\r\n\r\n`;
    
    // Add Summary Aggregates
    csvContent += `FINANCIAL OVERVIEW (${reportPeriod === 'all' ? 'ALL TIME' : 'LAST ' + reportPeriod + ' DAYS'}) - MWK\r\n`;
    csvContent += `Gross Sales (MWK),${totalAggregates.sales}\r\n`;
    csvContent += `Stock Purchases (MWK),${totalAggregates.purchases}\r\n`;
    csvContent += `Expenses (MWK),${totalAggregates.expenses}\r\n`;
    csvContent += `Net Profit (MWK),${totalAggregates.profit}\r\n\r\n`;

    // Add Product Margins Table Header
    csvContent += 'PRODUCT PERFORMANCE MATRIX (MWK)\r\n';
    csvContent += 'Product Name,SKU,Unit Cost (MWK),Unit Sale Price (MWK),Units Sold,Total Revenue (MWK),Profit Margin %,Turnover Score\r\n';
    
    productPerformance.forEach(p => {
      csvContent += `"${p.name}",${p.sku},${p.unitCost},${p.unitPrice},${p.salesCount},${p.revenue},${p.margin.toFixed(1)}%,${p.turnoverRatio.toFixed(1)}%\r\n`;
    });

    csvContent += '\r\nDAILY OVERVIEW SUMMARY (PAST 7 DAYS) - MWK\r\n';
    csvContent += 'Date,Sales Revenue (MWK),Outflows Expense (MWK),Net Balance (MWK)\r\n';
    dailySummary.forEach(d => {
      csvContent += `${d.date},${d.sales},${d.outflows},${d.profit}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TrackWise_Report_Period_${reportPeriod}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:p-0">
      {/* Top Ribbon Control */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:shadow-none print:border-none print:p-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600 print:hidden" />
            <span>Analytical Reports & Business Intelligence</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Evaluate margins, turnover patterns, and export standard ledger items.</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="all">All Time Records</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/10 cursor-pointer"
            title="Download CSV for Excel/Google Sheets"
          >
            <Download className="w-4 h-4" />
            <span>Excel / CSV Export</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
            title="Open system print to generate PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Aggregate Scoreboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 print:border-slate-300">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Period Inflow Sales</span>
          <p className="text-xl font-black text-slate-800 mt-1">{formatCurrency(totalAggregates.sales)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 print:border-slate-300">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Period Stock Purchases</span>
          <p className="text-xl font-black text-slate-800 mt-1">{formatCurrency(totalAggregates.purchases)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 print:border-slate-300">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Period Overhead Expenses</span>
          <p className="text-xl font-black text-slate-800 mt-1">{formatCurrency(totalAggregates.expenses)}</p>
        </div>
        <div className={`p-4 rounded-xl border ${totalAggregates.profit >= 0 ? 'bg-slate-900 text-white border-slate-900' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${totalAggregates.profit >= 0 ? 'text-slate-400' : 'text-rose-500'}`}>Net Operating Balances</span>
          <p className="text-xl font-black mt-1">{formatCurrency(totalAggregates.profit)}</p>
        </div>
      </div>

      {/* Charts & Profit list split segment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Responsive Custom SVG Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col print:border-slate-300 print:shadow-none">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Weekly Trend Chart (Last 4 Weeks)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Comparison metrics between gross sales (green bars) and combined outflows (gray bars).</p>
          </div>

          {/* Pure SVG Bar Visualization */}
          <div className="flex-1 min-h-[220px] w-full mt-2 relative">
            <svg viewBox="0 0 400 200" className="w-full h-full overflow-visible">
              {/* Grid Horizontal Guidelines */}
              <line x1="0" y1="50" x2="400" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="100" x2="400" y2="100" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="150" x2="400" y2="150" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="190" x2="400" y2="190" stroke="#e2e8f0" strokeWidth="1.5" />

              {weeklyTrendData.map((w, index) => {
                const xOffset = index * 100 + 20;
                
                // Height scaling factors
                const salesHeight = (w.sales / maxChartValue) * 140;
                const outflowsHeight = (w.outflows / maxChartValue) * 140;
                
                const salesY = 190 - salesHeight;
                const outflowsY = 190 - outflowsHeight;

                return (
                  <g key={w.name}>
                    {/* Sales Bar */}
                    <rect
                      x={xOffset}
                      y={salesY}
                      width="24"
                      height={Math.max(salesHeight, 2)}
                      rx="3"
                      className="fill-emerald-500 transition-all duration-300 hover:opacity-90"
                    />
                    {/* Label/Value over Sales bar */}
                    {w.sales > 0 && (
                      <text x={xOffset + 12} y={salesY - 5} textAnchor="middle" className="text-[9px] font-bold fill-slate-700">
                        {Math.round(w.sales)}
                      </text>
                    )}

                    {/* Outflows Bar */}
                    <rect
                      x={xOffset + 28}
                      y={outflowsY}
                      width="24"
                      height={Math.max(outflowsHeight, 2)}
                      rx="3"
                      className="fill-slate-400 transition-all duration-300 hover:opacity-90"
                    />
                    {/* Label/Value over Outflows bar */}
                    {w.outflows > 0 && (
                      <text x={xOffset + 40} y={outflowsY - 5} textAnchor="middle" className="text-[9px] font-medium fill-slate-500">
                        {Math.round(w.outflows)}
                      </text>
                    )}

                    {/* Week Label Tag */}
                    <text x={xOffset + 26} y="206" textAnchor="middle" className="text-[10px] font-bold fill-slate-500 uppercase tracking-tight">
                      {w.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Daily Profit Summary List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col print:border-slate-300">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <span>Daily Profit Summary</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Net balance updates for the last 7 calendar days.</p>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
            {dailySummary.map((d) => (
              <div 
                key={d.date} 
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all"
              >
                <div>
                  <h5 className="text-[11px] font-bold text-slate-700">{d.date}</h5>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Sales: {formatCurrency(d.sales)} | Out: {formatCurrency(d.outflows)}
                  </p>
                </div>
                <div className="text-right flex items-center gap-1 font-bold text-xs">
                  {d.profit >= 0 ? (
                    <span className="text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <ArrowUpRight className="w-3 h-3" />
                      {formatCurrency(d.profit)}
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-0.5 bg-rose-50 px-2 py-0.5 rounded-md">
                      <ArrowDownRight className="w-3 h-3" />
                      {formatCurrency(Math.abs(d.profit))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Performance Add-on segment */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:border-slate-300 print:shadow-none">
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Product Margin Matrix & Stock Turnover Indices
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            Add-on Module Activated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-50/20">
                <th className="py-3 px-6">Product Item</th>
                <th className="py-3 px-6">Cost vs Price Structure</th>
                <th className="py-3 px-6 text-center">Units Sold</th>
                <th className="py-3 px-6 text-right">Accumulated Revenue</th>
                <th className="py-3 px-6 text-right">Profit Margin per Unit</th>
                <th className="py-3 px-6 text-center">Inventory Turnover Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {productPerformance.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-slate-800">
                    <div>
                      <p>{p.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">SKU: {p.sku}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-slate-500 whitespace-nowrap font-medium">
                    Cost: <span className="font-bold text-slate-700">{formatCurrency(p.unitCost)}</span> 
                    {' → '} 
                    Sell: <span className="font-bold text-emerald-600">{formatCurrency(p.unitPrice)}</span>
                  </td>
                  <td className="py-3.5 px-6 text-center font-bold text-slate-700">{p.salesCount} units</td>
                  <td className="py-3.5 px-6 text-right font-bold text-slate-800">{formatCurrency(p.revenue)}</td>
                  <td className="py-3.5 px-6 text-right font-black text-emerald-600 whitespace-nowrap">
                    <div className="inline-flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                      <Percent className="w-3 h-3 text-emerald-500" />
                      <span>{p.margin.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-center max-w-[150px]">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden max-w-[80px]">
                        <div 
                          className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(p.turnoverRatio, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">
                        {p.turnoverRatio.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
