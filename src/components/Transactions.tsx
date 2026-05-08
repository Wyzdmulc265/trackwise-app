import React, { useState, useEffect } from 'react';
import { useTrackWise } from '../context/TrackWiseContext';
import { useAuth } from '../context/AuthContext';
import { TransactionType } from '../types';
import { Receipt, CheckCircle, AlertCircle, ShoppingBag, ShieldAlert } from 'lucide-react';

export const Transactions: React.FC = () => {
  const { categories, inventory, addTransaction } = useTrackWise();
  const { session } = useAuth();
  const isAccountant = session?.role === 'Accountant';

  const [type, setType] = useState<TransactionType>('sale');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]); // smart auto-date default
  const [category, setCategory] = useState<string>('');
  const [itemId, setItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter categories by type
  const typeCategories = categories.filter((cat) => {
    if (type === 'sale') return cat.type === 'sale';
    if (type === 'purchase') return cat.type === 'purchase';
    return cat.type === 'expense';
  });

  // Smart suggestions for category when transaction type changes
  useEffect(() => {
    if (typeCategories.length > 0) {
      setCategory(typeCategories[0].name);
    } else {
      setCategory('');
    }
    // Reset inventory selections
    setItemId('');
    setQuantity(1);
    setAmount('');
    setDescription('');
  }, [type]);

  // Smart auto-fill price/cost when item or quantity changes
  useEffect(() => {
    if (!itemId) return;
    const selectedItem = inventory.find((item) => item.id === itemId);
    if (selectedItem) {
      if (type === 'sale') {
        setAmount((selectedItem.unitPrice * quantity).toString());
        if (!description) {
          setDescription(`Sold ${quantity}x ${selectedItem.name}`);
        }
      } else if (type === 'purchase') {
        setAmount((selectedItem.unitCost * quantity).toString());
        if (!description) {
          setDescription(`Purchased ${quantity}x ${selectedItem.name}`);
        }
      }
    }
  }, [itemId, quantity, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid amount greater than 0.' });
      return;
    }

    if (itemId) {
      const selectedItem = inventory.find((item) => item.id === itemId);
      if (type === 'sale' && selectedItem && selectedItem.quantity < quantity) {
        setStatusMessage({
          type: 'error',
          text: `Insufficient stock! Only ${selectedItem.quantity} units of ${selectedItem.name} available.`
        });
        return;
      }
    }

    const result = await addTransaction({
      type,
      date,
      category,
      amount: parsedAmount,
      description: description || `${type.toUpperCase()} transaction`,
      itemId: itemId || undefined,
      quantity: itemId ? quantity : undefined,
    });

    if (!result.ok) {
      setStatusMessage({ type: 'error', text: result.message });
      return;
    }

    setStatusMessage({
      type: 'success',
      text: result.queued
        ? '⏳ ' + result.message + ' You can track its status in "My Pending Approvals".'
        : '✓ ' + result.message,
    });

    // Clear dynamic fields while maintaining smart defaults
    setItemId('');
    setQuantity(1);
    setAmount('');
    setDescription('');

    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Unified Transaction Engine</h2>
            <p className="text-xs text-slate-500">Record sales, stock purchases, or custom corporate expenses instantly.</p>
          </div>
        </div>
      </div>

      {isAccountant && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900">Accountant role — admin approval required</p>
            <p className="text-amber-800 mt-0.5">Transactions you record will be queued for admin review before being applied to the books.</p>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Type Selector Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1">
          {(['sale', 'purchase', 'expense'] as TransactionType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`py-3 text-center rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                type === t
                  ? t === 'sale'
                    ? 'bg-white text-emerald-600 shadow-sm border border-slate-100'
                    : t === 'purchase'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                    : 'bg-white text-amber-600 shadow-sm border border-slate-100'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {t === 'sale' ? '🟢 Record Sale' : t === 'purchase' ? '🔵 Restock Purchase' : '🟡 Log Expense'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Transaction Date */}
            <div>
              <label htmlFor="date" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Transaction Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                autoComplete="off"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Category Suggestion Box */}
            <div>
              <label htmlFor="category" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Category Placement
              </label>
              <select
                id="category"
                name="category"
                required
                autoComplete="off"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {typeCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
                {typeCategories.length === 0 && (
                  <option value="">No predefined categories. Add some in Categories manager</option>
                )}
              </select>
            </div>
          </div>

          {/* Optional Inventory Connector */}
          {type !== 'expense' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Link with Stock Inventory Item (Optional)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="itemId" className="block text-[11px] font-semibold text-slate-500 mb-1.5">Select Product</label>
                  <select
                    id="itemId"
                    name="itemId"
                    autoComplete="off"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">-- Standalone Item / Service (No Stock Adjustment) --</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (SKU: {item.sku}) — Available: {item.quantity} units
                      </option>
                    ))}
                  </select>
                </div>

                {itemId && (
                  <div>
                    <label htmlFor="quantity" className="block text-[11px] font-semibold text-slate-500 mb-1.5">Quantity</label>
                    <input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      required
                      autoComplete="off"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
              {itemId && (
                <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                  💡 Smart Default: Auto-calculating transaction pricing based on catalog values. You can still customize the final amount below.
                </p>
              )}
            </div>
          )}

          {/* Amount and Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <label htmlFor="amount" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Total Transaction Value (MWK)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                  MK
                </div>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  autoComplete="off"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Memo / Description Notes
              </label>
              <input
                id="description"
                name="description"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. Q3 subscription renewal, hardware bulk order, client consultation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Form Footer Action */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 tracking-wide transition-all shadow-md shadow-slate-900/10 cursor-pointer"
          >
            🚀 Save & Sync Transaction
          </button>
        </div>
      </form>
    </div>
  );
};
