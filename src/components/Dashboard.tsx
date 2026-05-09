import React, { useState } from 'react';
import { useTrackWise } from '../context/TrackWiseContext';
import { TimeFilter, Transaction } from '../types';
import { formatCurrency } from '../utils/format';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ShoppingBag
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { transactions, inventory, setActiveTab } = useTrackWise();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  // Filter transactions based on selected quick filter
  const filterTransactions = (txs: Transaction[], filter: TimeFilter) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    return txs.filter((tx) => {
      if (filter === 'all') return true;
      
      const txDate = new Date(tx.date);
      const today = new Date(todayStr);
      const diffTime = Math.abs(today.getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filter === 'today') {
        return tx.date === todayStr;
      } else if (filter === 'week') {
        return diffDays <= 7;
      } else if (filter === 'month') {
        return diffDays <= 30;
      }
      return true;
    });
  };

  const filteredTx = filterTransactions(transactions, timeFilter);

   // Compute stats
   const sales = filteredTx.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
   const purchases = filteredTx.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
   const expenses = filteredTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
   
   // Calculate COGS from inventory (lifetime COGS of all items)
   const cogs = inventory.reduce((sum, item) => sum + item.cogs, 0);
   const grossProfit = sales - cogs;
   const netProfit = grossProfit - expenses;

  // Inventory stats
  const totalStockItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalStockValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  const lowStockItems = inventory.filter(item => item.quantity <= item.lowStockThreshold);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financial Performance Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time statistics and inventory insight parameters.</p>
        </div>
        
        {/* Quick Filters */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-auto border border-slate-200">
          {(['today', 'week', 'month', 'all'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
                timeFilter === filter
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {filter === 'all' ? 'All Time' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-semibold text-slate-500">Gross Sales</span>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(sales)}
            </h3>
            <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Inflow revenue recorded</span>
            </p>
          </div>
        </div>

        {/* Purchases Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-semibold text-slate-500">Stock Purchases</span>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(purchases)}
            </h3>
            <p className="text-xs font-medium text-blue-600 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Inventory procurement costs</span>
            </p>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-sm font-semibold text-slate-500">Operational Expenses</span>
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(expenses)}
            </h3>
            <p className="text-xs font-medium text-amber-600 mt-2 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Rent, bills & campaign spend</span>
            </p>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className={`p-6 rounded-2xl shadow-sm border relative overflow-hidden group hover:shadow-md transition-shadow ${
          netProfit >= 0 ? 'bg-slate-900 text-white border-slate-900' : 'bg-rose-50 text-rose-900 border-rose-100'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center justify-between relative z-10">
            <span className={`text-sm font-semibold ${netProfit >= 0 ? 'text-slate-400' : 'text-rose-600'}`}>Net Profit Margin</span>
            <div className={`p-3 rounded-xl ${netProfit >= 0 ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <h3 className="text-3xl font-black tracking-tight">
              {formatCurrency(netProfit)}
            </h3>
            <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-600'}`}>
              {netProfit >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{netProfit >= 0 ? 'Net positive returns' : 'Net negative deficit'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Inventory Valuation and Low Stock Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Summary Widget */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Inventory Valuation</h4>
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-1">Total tied-up capital in active stock</p>
            <div className="mt-6">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                {formatCurrency(totalStockValue)}
              </span>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
            <div>
              <p className="text-white font-bold text-base">{totalStockItems}</p>
              <p>Total Units</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-base">{inventory.length}</p>
              <p>Unique Products</p>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                <span>Low Stock Alerts</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Products below or at their trigger thresholds.</p>
            </div>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-emerald-600 font-semibold hover:underline"
            >
              Manage Stock
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[160px] pr-1 space-y-2.5 custom-scrollbar">
            {lowStockItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-sm font-medium text-slate-500">All stock levels are optimal</p>
                <p className="text-xs mt-0.5">No immediate replenishment needed.</p>
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/40"
                >
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">{item.name}</h5>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                      {item.quantity} units left
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Threshold: {item.lowStockThreshold}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action / Recent Activity Segment */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Recent Financial Actions</h3>
          <button 
            onClick={() => setActiveTab('history')}
            className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
          >
            <span>View Full History</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTx.slice(0, 5).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {tx.date}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-md uppercase tracking-wide ${
                      tx.type === 'sale' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : tx.type === 'purchase'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                    {tx.category}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                    {tx.description}
                  </td>
                  <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
                    tx.type === 'sale' ? 'text-emerald-600' : 'text-slate-700'
                  }`}>
                    {tx.type === 'sale' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
              {filteredTx.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    No transactions recorded for the filtered period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
