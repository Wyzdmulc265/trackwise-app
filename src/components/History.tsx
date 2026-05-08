import React, { useState } from 'react';
import { useTrackWise } from '../context/TrackWiseContext';
import { useAuth } from '../context/AuthContext';
import { Transaction, TransactionType } from '../types';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  X, 
  Calendar
} from 'lucide-react';

export const History: React.FC = () => {
  const { transactions, categories, inventory, updateTransaction, deleteTransaction } = useTrackWise();
  const { session } = useAuth();
  const role = session?.role ?? 'Viewer';
  const canMutate = role !== 'Viewer';
  const requiresApproval = role === 'Accountant';

  // Inline toast for queued/error messages
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal Editing state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Filter application
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    
    const txDate = new Date(tx.date);
    const matchesStart = !startDate || txDate >= new Date(startDate);
    const matchesEnd = !endDate || txDate <= new Date(endDate);

    return matchesSearch && matchesType && matchesStart && matchesEnd;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 2 }).format(val);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx({ ...tx });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const result = await updateTransaction(editingTx.id, editingTx);
    setEditingTx(null);
    if (!result.ok) showToast('error', result.message);
    else showToast('success', result.queued ? '⏳ ' + result.message : '✓ ' + result.message);
  };

  const handleDelete = async (id: string) => {
    const verb = requiresApproval ? 'submit a delete request for' : 'permanently delete';
    if (!window.confirm(`Are you sure you want to ${verb} this transaction?`)) return;
    const result = await deleteTransaction(id);
    if (!result.ok) showToast('error', result.message);
    else showToast('success', result.queued ? '⏳ ' + result.message : '✓ ' + result.message);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {requiresApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 px-4 text-xs text-amber-800 font-medium">
          🛡 <span className="font-bold">Accountant role:</span> Edits and deletes require admin approval before being applied.
        </div>
      )}

      {role === 'Viewer' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 px-4 text-xs text-slate-600 font-medium">
          👁 <span className="font-bold">Viewer role:</span> You have read-only access to transaction history.
        </div>
      )}

      {/* Top Controls Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Unified Transaction History</h2>
          <p className="text-xs text-slate-500 mt-0.5">Filter, query, revise or remove historical transaction data items.</p>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Text Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search description or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Filter className="w-4 h-4" />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="sale">Sales only</option>
              <option value="purchase">Purchases only</option>
              <option value="expense">Expenses only</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider w-10">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider w-6">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Clear Filters helper */}
        {(searchTerm || typeFilter !== 'all' || startDate || endDate) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
            >
              Reset Search Queries
            </button>
          </div>
        )}
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-6">Classification</th>
                <th className="py-3 px-6">Category Placed</th>
                <th className="py-3 px-6">Memo Line</th>
                <th className="py-3 px-6">Stock Connected</th>
                <th className="py-3 px-6 text-right">Amount</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.map((tx) => {
                const linkedProduct = tx.itemId ? inventory.find(i => i.id === tx.itemId) : null;
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tx.date}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                        tx.type === 'sale'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : tx.type === 'purchase'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-700 whitespace-nowrap">
                      {tx.category}
                    </td>
                    <td className="py-4 px-6 text-slate-500 max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                      {linkedProduct ? (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          📦 {linkedProduct.name} ({tx.quantity} units)
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className={`py-4 px-6 text-right font-black text-sm whitespace-nowrap ${
                      tx.type === 'sale' ? 'text-emerald-600' : 'text-slate-800'
                    }`}>
                      {tx.type === 'sale' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-center">
                      {canMutate ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                            title={requiresApproval ? 'Edit (requires admin approval)' : 'Edit row'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title={requiresApproval ? 'Delete (requires admin approval)' : 'Delete row'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic font-medium">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-sm">
                    No matching ledger items found for the current search/filter combination.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Overlay Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-xl overflow-hidden animate-zoom-in">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                ⚙️ Revise Transaction Ledger
              </h3>
              <button 
                onClick={() => setEditingTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={editingTx.date}
                  onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-slate-800 font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Category Designation</label>
                <select
                  value={editingTx.category}
                  onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-slate-800 font-medium focus:outline-none"
                >
                  {categories
                    .filter((c) => c.type === editingTx.type)
                    .map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Amount ($ value)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={editingTx.amount}
                  onChange={(e) => setEditingTx({ ...editingTx, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl font-bold text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Memo / Notes</label>
                <input
                  type="text"
                  required
                  value={editingTx.description}
                  onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-slate-800 font-medium focus:outline-none"
                />
              </div>

              {editingTx.itemId && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 font-medium">
                  ⚠️ Note: Altering quantities here will perfectly recalculate and restate original inventory stocks upon confirmation.
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
