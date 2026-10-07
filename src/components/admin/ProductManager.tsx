import React, { useState, useEffect } from 'react';
import { Product, ProductUnit } from '../../types';
import { Database } from '../../services/storage';
import { PricingService } from '../../services/pricingService';
import { useAuth } from '../../context/AuthContext';
import {
  PackagePlus, ArrowUp, ArrowDown, Edit2, TrendingUp,
  CheckCircle2, AlertCircle, X, Plus, Layers, RotateCcw, Trash2
} from 'lucide-react';

const COMMON_UNITS: ProductUnit[] = ['Litre', 'KG', 'Crate', 'Box', 'Matka', 'Cup', 'Packet'];

export const ProductManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
  const [filterTab, setFilterTab] = useState<'active' | 'archived'>('active');

  // Add/Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [group, setGroup] = useState('Milk');
  const [unit, setUnit] = useState<ProductUnit>('Litre');
  const [defaultPrice, setDefaultPrice] = useState<string>('50');

  // Delta shift modal
  const [shiftingProduct, setShiftingProduct] = useState<Product | null>(null);
  const [newGlobalPriceInput, setNewGlobalPriceInput] = useState<string>('');
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState<string | null>(null);

  const loadProducts = () => {
    const all = Database.getProducts();
    const active = all.filter(p => p.active).sort((a, b) => a.displayPosition - b.displayPosition);
    const archived = all.filter(p => !p.active).sort((a, b) => a.name.localeCompare(b.name));
    setProducts(active);
    setArchivedProducts(archived);
  };

  const handleArchiveProduct = (p: Product) => {
    const confirm = window.confirm(`Archive ${p.name}? It will be hidden from daily order sheets.`);
    if (confirm) {
      const all = Database.getProducts();
      const updated = all.map(x => x.id === p.id ? { ...x, active: false } : x);
      let pos = 1;
      const renumbered = updated.map(x => {
        if (x.active) {
          return { ...x, displayPosition: pos++ };
        }
        return x;
      });
      Database.setProducts(renumbered);
      loadProducts();
    }
  };

  const handleRestoreProduct = (p: Product) => {
    const confirm = window.confirm(`Restore ${p.name} to active product catalog?`);
    if (confirm) {
      const all = Database.getProducts();
      const activeCount = all.filter(x => x.active).length;
      const updated = all.map(x => x.id === p.id ? { ...x, active: true, displayPosition: activeCount + 1 } : x);
      Database.setProducts(updated);
      loadProducts();
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenAdd = () => {
    setIsAddingNew(true);
    setEditingProduct(null);
    setName('');
    setShortName('');
    setGroup('Milk');
    setUnit('Litre');
    setDefaultPrice('60');
  };

  const handleOpenEdit = (p: Product) => {
    setIsAddingNew(false);
    setEditingProduct(p);
    setName(p.name);
    setShortName(p.shortName);
    setGroup(p.group);
    setUnit(p.unit);
    setDefaultPrice(String(p.defaultPrice));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const currentList = Database.getProducts();
    const priceNum = parseFloat(defaultPrice) || 0;

    if (isAddingNew) {
      const newP: Product = {
        id: 'p_' + Date.now(),
        name: name.trim(),
        shortName: shortName.trim() || name.trim().slice(0, 4),
        group: group.trim() || 'General',
        unit,
        defaultPrice: priceNum,
        displayPosition: currentList.length + 1,
        active: true
      };
      Database.setProducts([...currentList, newP]);
    } else if (editingProduct) {
      const updated = currentList.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name: name.trim(),
            shortName: shortName.trim() || name.trim().slice(0, 4),
            group: group.trim() || 'General',
            unit,
            defaultPrice: priceNum
          };
        }
        return p;
      });
      Database.setProducts(updated);
    }

    setEditingProduct(null);
    setIsAddingNew(false);
    loadProducts();
  };

  // Reordering display positions
  const handleMovePosition = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= products.length) return;

    const list = [...products];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Renumber 1..N
    const reordered = list.map((p, idx) => ({ ...p, displayPosition: idx + 1 }));
    Database.setProducts(reordered);
    setProducts(reordered);
  };

  // Relative Delta Price Shift handler
  const handleOpenShift = (p: Product) => {
    setShiftingProduct(p);
    setNewGlobalPriceInput(String(p.defaultPrice));
    setShiftSuccessMsg(null);
  };

  const handleApplyShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftingProduct || !currentUser) return;

    const newPrice = parseFloat(newGlobalPriceInput);
    if (isNaN(newPrice) || newPrice < 0) return;

    const res = PricingService.updateGlobalPrice(
      shiftingProduct.id,
      newPrice,
      currentUser.id,
      currentUser.name
    );

    if (res.success) {
      setShiftSuccessMsg(
        `Global price updated to ₹${newPrice}. Shifted delta of ${res.delta >= 0 ? '+' : ''}₹${res.delta} across ${res.affectedRetailers} retailer custom prices.`
      );
      loadProducts();
      setTimeout(() => {
        setShiftingProduct(null);
        setShiftSuccessMsg(null);
      }, 2500);
    }
  };

  const calculatedDelta = shiftingProduct
    ? (parseFloat(newGlobalPriceInput) || 0) - shiftingProduct.defaultPrice
    : 0;

  return (
    <div className="space-y-4">
      {/* Top Banner & Add Button */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            Product Catalog & Display Column Sequence
          </h2>
          <p className="text-xs text-slate-500">
            Products appear in tables and PDFs strictly according to their display position. Variants should be kept adjacent.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <PackagePlus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Relative Delta Pricing Explanation Box */}
      <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
        <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Relative Delta Pricing System:</strong> When you increase or decrease a product's global price (e.g. from ₹100 to ₹120 = +₹20), the system automatically increases all retailers' custom prices by +₹20, preserving their individual margins without manual edits.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold w-fit gap-1">
        <button
          onClick={() => setFilterTab('active')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterTab === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Active Products ({products.length})
        </button>
        <button
          onClick={() => setFilterTab('archived')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterTab === 'archived' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Archived ({archivedProducts.length})
        </button>
      </div>

      {/* Product Sequence List Table (Active) */}
      {filterTab === 'active' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-14 text-center">Pos</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-3 py-3">Short Name</th>
                  <th className="px-3 py-3">Group</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3 text-right">Global Price</th>
                  <th className="px-4 py-3 text-center">Reorder Columns</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No active products in catalog.
                    </td>
                  </tr>
                ) : (
                  products.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-3 text-center font-extrabold text-brand-800">
                        {p.displayPosition}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                        {p.name}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                          {p.shortName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-medium">
                        {p.group}
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-medium">
                        {p.unit}
                      </td>
                      <td className="px-3 py-3 text-right font-extrabold text-slate-900 text-sm">
                        ₹{p.defaultPrice}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleMovePosition(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded disabled:opacity-20"
                            title="Move column left / up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMovePosition(idx, 'down')}
                            disabled={idx === products.length - 1}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded disabled:opacity-20"
                            title="Move column right / down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenShift(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold text-[11px] border border-emerald-200"
                            title="Adjust Global Price & Shift All Retailers"
                          >
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            <span>Shift Rate</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="Edit Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchiveProduct(p)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Archive Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product List Table (Archived) */}
      {filterTab === 'archived' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-3 py-3">Short Name</th>
                  <th className="px-3 py-3">Group</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3 text-right">Default Price</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No archived products.
                    </td>
                  </tr>
                ) : (
                  archivedProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-700">
                        {p.shortName}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {p.group}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {p.unit}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">
                        ₹{p.defaultPrice}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                          Archived
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRestoreProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-lg transition-colors"
                          title="Restore to active catalog"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD / EDIT PRODUCT MODAL
         ========================================================================= */}
      {(isAddingNew || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                {isAddingNew ? 'Add New Product' : `Edit Product: ${editingProduct?.name}`}
              </h3>
              <button
                onClick={() => { setIsAddingNew(false); setEditingProduct(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gold Milk 1L, Dahi 5 KG Matka"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Short Name (For Compact PDF)
                  </label>
                  <input
                    type="text"
                    required
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="e.g. Gold 1L, C, M"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Product Group
                  </label>
                  <input
                    type="text"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    placeholder="Milk, Dahi, Paneer..."
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit Type
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ProductUnit)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  >
                    {COMMON_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Global Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddingNew(false); setEditingProduct(null); }}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          RELATIVE DELTA PRICE SHIFT MODAL
         ========================================================================= */}
      {shiftingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Relative Price Adjustment
              </h3>
              <button
                onClick={() => setShiftingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {shiftSuccessMsg ? (
              <div className="mt-4 p-4 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{shiftSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleApplyShift} className="mt-4 space-y-4">
                <div>
                  <div className="font-bold text-slate-900 text-base">{shiftingProduct.name}</div>
                  <div className="text-xs text-slate-500">
                    Current Global Price: <strong className="text-slate-800">₹{shiftingProduct.defaultPrice}</strong> / {shiftingProduct.unit}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Global Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newGlobalPriceInput}
                    onChange={(e) => setNewGlobalPriceInput(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-lg font-black text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>

                {/* Live delta calculation box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Price Delta:</span>
                    <span className={`font-extrabold text-sm ${calculatedDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {calculatedDelta >= 0 ? `+₹${calculatedDelta}` : `-₹${Math.abs(calculatedDelta)}`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    This exact delta will be added to every retailer's custom price, maintaining individual price agreements.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShiftingProduct(null)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                  >
                    Apply Global Shift
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
