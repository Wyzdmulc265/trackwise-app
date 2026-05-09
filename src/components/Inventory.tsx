import React, { useState } from 'react';
import { useTrackWise } from '../context/TrackWiseContext';
import { useAuth } from '../context/AuthContext';
import { InventoryItem } from '../types';
import { formatCurrency } from '../utils/format';
import { Plus, Package, ShieldAlert, BadgeDollarSign, Trash2, Edit3, X } from 'lucide-react';

export const Inventory: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useTrackWise();
  const { session } = useAuth();
  const role = session?.role ?? 'Viewer';
  const canMutate = role !== 'Viewer';
  const requiresApproval = role === 'Accountant';

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  // Creation state
   const [showAddForm, setShowAddForm] = useState(false);
   const [name, setName] = useState('');
   const [sku, setSku] = useState('');
   const [unitCost, setUnitCost] = useState('');
   const [unitPrice, setUnitPrice] = useState('');
   const [quantity, setQuantity] = useState('');
   const [threshold, setThreshold] = useState('5');
   const [measurementUnit, setMeasurementUnit] = useState('Pieces');

  // Editing modal state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const totalStockValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  const lowStockCount = inventory.filter(item => item.quantity <= item.lowStockThreshold).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;

    const result = await addInventoryItem({
      name,
      sku,
      measurementUnit,
      unitCost: parseFloat(unitCost) || 0,
      unitPrice: parseFloat(unitPrice) || 0,
      quantity: parseInt(quantity) || 0,
      lowStockThreshold: parseInt(threshold) || 3,
    });

    if (!result.ok) { showToast('error', result.message); return; }
    showToast('success', result.queued ? '⏳ ' + result.message : '✓ ' + result.message);

    setName(''); setSku(''); setUnitCost(''); setUnitPrice(''); setQuantity(''); setThreshold('5'); setMeasurementUnit('Pieces');
    setShowAddForm(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const result = await updateInventoryItem(editingItem.id, editingItem);
    setEditingItem(null);
    if (!result.ok) showToast('error', result.message);
    else showToast('success', result.queued ? '⏳ ' + result.message : '✓ ' + result.message);
  };

  const handleDelete = async (id: string, name: string) => {
    const verb = requiresApproval ? 'submit a delete request for' : 'permanently delete';
    if (!window.confirm(`Are you sure you want to ${verb} ${name}?`)) return;
    const result = await deleteInventoryItem(id);
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
          🛡 <span className="font-bold">Accountant role:</span> All inventory changes (add, edit, delete) require admin approval.
        </div>
      )}

      {/* Top Banner & Overview widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Stock Value</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
              {formatCurrency(totalStockValue)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Sum of cost basis values</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <BadgeDollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Low Stock Items</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
              {lowStockCount} / {inventory.length}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Require replacement attention</p>
          </div>
          <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-amber-50 text-amber-500 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          {canMutate ? (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full py-3 px-4 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Close Product form' : 'Add New Catalog Item'}</span>
            </button>
          ) : (
            <div className="text-center text-xs text-slate-400 italic font-medium py-3">
              👁 Viewer role — read-only inventory access
            </div>
          )}
        </div>
      </div>

      {/* Expansion Creation Form */}
      {showAddForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 animate-zoom-in">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Add New Catalog Master Product</h3>
            </div>
            
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label htmlFor="name" className="block text-[11px] font-semibold text-slate-500 mb-1">Product Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. iPhone 15 Pro, Office Chair"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="sku" className="block text-[11px] font-semibold text-slate-500 mb-1">SKU Code</label>
              <input
                id="sku"
                name="sku"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. SKU-APP-123"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="threshold" className="block text-[11px] font-semibold text-slate-500 mb-1">Low Stock Threshold</label>
              <input
                id="threshold"
                name="threshold"
                type="number"
                min="0"
                required
                autoComplete="off"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="measurementUnit" className="block text-[11px] font-semibold text-slate-500 mb-1">Measurement Unit</label>
              <select
                id="measurementUnit"
                name="measurementUnit"
                value={measurementUnit}
                onChange={(e) => setMeasurementUnit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Litres">Litres</option>
                <option value="Pieces (pcs)">Pieces (pcs)</option>
                <option value="KG">KG</option>
              </select>
            </div>

            <div>
              <label htmlFor="unitCost" className="block text-[11px] font-semibold text-slate-500 mb-1">Unit Cost Basis (MWK)</label>
              <input
                id="unitCost"
                name="unitCost"
                type="number"
                step="0.01"
                min="0"
                required
                autoComplete="off"
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="unitPrice" className="block text-[11px] font-semibold text-slate-500 mb-1">Target Sale Price (MWK)</label>
              <input
                id="unitPrice"
                name="unitPrice"
                type="number"
                step="0.01"
                min="0"
                required
                autoComplete="off"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="quantity" className="block text-[11px] font-semibold text-slate-500 mb-1">Initial Physical Units</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                required
                autoComplete="off"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-md cursor-pointer"
            >
              Add Product to Inventory
            </button>
          </div>
        </form>
      )}

      {/* Stock Management Table List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Active Product Portfolio</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/20">
                <th className="py-3 px-6">Product Details</th>
                <th className="py-3 px-6">SKU Code</th>
                <th className="py-3 px-6 text-right">Unit Cost</th>
                <th className="py-3 px-6 text-right">Sale Price</th>
                <th className="py-3 px-6 text-center">In-Stock Quantity</th>
                <th className="py-3 px-6 text-right">Total Asset Value</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {inventory.map((item) => {
                const isLow = item.quantity <= item.lowStockThreshold;
                return (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isLow ? 'bg-amber-50/20' : ''}`}>
                    <td className="py-4 px-6 font-bold text-slate-800">
                      <div>
                        <p className="text-sm">{item.name}</p>
                        {isLow && (
                          <span className="text-[10px] text-amber-600 font-semibold bg-amber-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            ⚠️ Low Stock Threshold Reached
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500 font-semibold">{item.sku}</td>
                    <td className="py-4 px-6 text-right text-slate-600 font-medium">{formatCurrency(item.unitCost)}</td>
                    <td className="py-4 px-6 text-right text-emerald-600 font-bold">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center gap-2 bg-slate-100 rounded-lg px-2.5 py-1 font-bold">
                        <span className={isLow ? 'text-amber-600' : 'text-slate-800'}>{item.quantity}</span>
                        <span className="text-slate-400 font-normal text-[10px]">{item.measurementUnit || 'Pieces'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-slate-800">
                      {formatCurrency(item.quantity * item.unitCost)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {canMutate ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingItem({ ...item })}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                            title={requiresApproval ? 'Modify (requires admin approval)' : 'Modify product properties'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={requiresApproval ? 'Delete (requires admin approval)' : 'Delete item'}
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
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    No items in inventory. Use the button above to add a product.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editing dialog overlay */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden animate-zoom-in">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider">🛠️ Modify Product Parameters</h3>
              <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label htmlFor="edit-name" className="block text-[11px] font-bold text-slate-500 mb-1">Product Name</label>
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="off"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-sku" className="block text-[11px] font-bold text-slate-500 mb-1">SKU</label>
                  <input
                    id="edit-sku"
                    name="sku"
                    type="text"
                    required
                    autoComplete="off"
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-threshold" className="block text-[11px] font-bold text-slate-500 mb-1">Low Stock Threshold</label>
                  <input
                    id="edit-threshold"
                    name="lowStockThreshold"
                    type="number"
                    required
                    autoComplete="off"
                    value={editingItem.lowStockThreshold}
                    onChange={(e) => setEditingItem({ ...editingItem, lowStockThreshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="edit-unitCost" className="block text-[11px] font-bold text-slate-500 mb-1">Cost Basis (MWK)</label>
                  <input
                    id="edit-unitCost"
                    name="unitCost"
                    type="number"
                    step="0.01"
                    required
                    autoComplete="off"
                    value={editingItem.unitCost}
                    onChange={(e) => setEditingItem({ ...editingItem, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-unitPrice" className="block text-[11px] font-bold text-slate-500 mb-1">Sale Price (MWK)</label>
                  <input
                    id="edit-unitPrice"
                    name="unitPrice"
                    type="number"
                    step="0.01"
                    required
                    autoComplete="off"
                    value={editingItem.unitPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-measurementUnit" className="block text-[11px] font-bold text-slate-500 mb-1">Measurement Unit</label>
                  <select
                    id="edit-measurementUnit"
                    name="measurementUnit"
                    value={editingItem.measurementUnit}
                    onChange={(e) => setEditingItem({ ...editingItem, measurementUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl font-medium text-slate-800 focus:outline-none"
                  >
                    <option value="Litres">Litres</option>
                    <option value="Pieces (pcs)">Pieces (pcs)</option>
                    <option value="KG">KG</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <div>
                  <label htmlFor="edit-quantity" className="block text-[11px] font-bold text-slate-500 mb-1">Units physically on hand</label>
                  <input
                    id="edit-quantity"
                    name="quantity"
                    type="number"
                    required
                    autoComplete="off"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 font-semibold text-slate-500 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 rounded-xl shadow-md"
                >
                  Save Master Values
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
