import React, { useState } from 'react';
import { useTrackWise } from '../context/TrackWiseContext';
import { Tags, Plus, PlusCircle } from 'lucide-react';

export const Categories: React.FC = () => {
  const { categories, addCategory, deleteCategory } = useTrackWise();
  const [newCatName, setNewCatName] = useState('');
  const [catType, setCatType] = useState<'sale' | 'purchase' | 'expense'>('sale');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    addCategory(newCatName.trim(), catType);
    setNewCatName('');
  };

  const salesCategories = categories.filter(c => c.type === 'sale');
  const purchaseCategories = categories.filter(c => c.type === 'purchase');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Introduction Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Tags className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Financial Categories Manager</h2>
            <p className="text-xs text-slate-500">Segment separate groups for inflow revenues, stock procurements, and company bills.</p>
          </div>
        </div>
      </div>

      {/* Creation Segment & Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator Block */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>Create Custom Category</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label htmlFor="newCatName" className="block font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Category Label / Name
              </label>
              <input
                id="newCatName"
                name="newCatName"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. Legal Fees, Affiliate Income"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Accounting Type Association
              </label>
              <div className="grid grid-cols-3 gap-2 font-semibold text-[11px] text-center">
                <button
                  type="button"
                  id="catType-sale"
                  name="catType"
                  onClick={() => setCatType('sale')}
                  className={`py-2 rounded-lg border uppercase tracking-wider transition-all ${
                    catType === 'sale'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  Sale
                </button>
                <button
                  type="button"
                  id="catType-purchase"
                  name="catType"
                  onClick={() => setCatType('purchase')}
                  className={`py-2 rounded-lg border uppercase tracking-wider transition-all ${
                    catType === 'purchase'
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  Purchase
                </button>
                <button
                  type="button"
                  id="catType-expense"
                  name="catType"
                  onClick={() => setCatType('expense')}
                  className={`py-2 rounded-lg border uppercase tracking-wider transition-all ${
                    catType === 'expense'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  Expense
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 mt-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all text-xs uppercase tracking-wider shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Insert Category Set</span>
            </button>
          </form>
        </div>

        {/* Categories Lists Block */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Categories */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-3.5 bg-emerald-50/50 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Sales Categories ({salesCategories.length})
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">Inflow Streams</span>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {salesCategories.map((cat) => (
                <div 
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 transition-all"
                >
                  <span>{cat.name}</span>
                  {cat.isCustom && (
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove custom category"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Purchase Categories */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-3.5 bg-blue-50/50 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Purchase Categories ({purchaseCategories.length})
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">Procurement Cost Centers</span>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {purchaseCategories.map((cat) => (
                <div 
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 transition-all"
                >
                  <span>{cat.name}</span>
                  {cat.isCustom && (
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove custom category"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-3.5 bg-amber-50/50 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Expense Categories ({expenseCategories.length})
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">Outflow & Overhead Operations</span>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {expenseCategories.map((cat) => (
                <div 
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 transition-all"
                >
                  <span>{cat.name}</span>
                  {cat.isCustom && (
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove custom category"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
