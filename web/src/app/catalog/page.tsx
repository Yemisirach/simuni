'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  price: number | string;
  factoryPrice: number | string;
  stock: number;
  isActive: boolean;
  createdAt?: string;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    name: '',
    sku: '',
    unit: 'pack',
    factoryPrice: 220,
    price: 270,
    stock: 100,
    isActive: true,
  });

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<Product[]>('/products');
      setProducts(data || []);
    } catch (err: any) {
      console.error('Failed to fetch products', err);
      setError(err?.message || 'Failed to load product catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Product name is required');
    setSubmitting(true);
    try {
      await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || undefined,
          unit: form.unit || 'pack',
          factoryPrice: Number(form.factoryPrice) || 0,
          price: Number(form.price) || 0,
          stock: Number(form.stock) || 0,
          isActive: form.isActive,
        }),
      });
      setShowAddModal(false);
      setForm({ name: '', sku: '', unit: 'pack', factoryPrice: 220, price: 270, stock: 100, isActive: true });
      await loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSubmitting(true);
    try {
      await fetchApi(`/products/${editingProduct.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingProduct.name,
          sku: editingProduct.sku || undefined,
          unit: editingProduct.unit,
          factoryPrice: Number(editingProduct.factoryPrice) || 0,
          price: Number(editingProduct.price) || 0,
          stock: Number(editingProduct.stock) || 0,
          isActive: editingProduct.isActive,
        }),
      });
      setEditingProduct(null);
      await loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the catalog?`)) return;
    try {
      await fetchApi(`/products/${id}`, { method: 'DELETE' });
      await loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  // Summary Metrics
  const totalStockPacks = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValuation = products.reduce((sum, p) => sum + (Number(p.factoryPrice || 0) * (p.stock || 0)), 0);
  const activeCount = products.filter(p => p.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Product Catalog & Pricing</h1>
          <p className="text-text-muted mt-1">
            Manage beverage SKUs, factory purchase rates, retail margins, and warehouse inventory
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="border border-border text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-primary-darker text-sm font-bold px-4 py-2 rounded-lg hover:bg-accent-light transition-colors shadow-sm"
          >
            + Add New Product
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm p-4 rounded-xl flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={loadProducts} className="font-bold underline text-xs">Retry</button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-text-muted uppercase">Active SKUs</div>
          <div className="font-mono text-2xl font-bold text-primary mt-1">
            {activeCount} <span className="text-xs font-sans text-text-muted font-normal">/ {products.length} registered</span>
          </div>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-text-muted uppercase">Warehouse Stock</div>
          <div className="font-mono text-2xl font-bold text-emerald-700 mt-1">
            {totalStockPacks.toLocaleString()} <span className="text-xs font-sans text-text-muted font-normal">packs</span>
          </div>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-text-muted uppercase">Stock Valuation (Cost)</div>
          <div className="font-mono text-2xl font-bold text-primary mt-1">
            {totalValuation.toLocaleString()} <span className="text-xs font-mono text-text-muted font-normal">ETB</span>
          </div>
        </div>

        <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-text-muted uppercase">Catalog Health</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-800">Synchronized</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
        <span className="text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Filter by product name, bottle size (0.60L, 2.00L), or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none text-primary"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-text-muted hover:text-primary">
            Clear
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
          <h3 className="font-serif font-bold text-lg">Product Catalog Matrix</h3>
          <span className="bg-primary text-white text-xs px-2.5 py-1 rounded-full font-bold">
            {loading ? '...' : `${filteredProducts.length} Items`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-text-muted text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 border-b border-border">Product / SKU</th>
                <th className="p-4 border-b border-border text-right">Factory Cost</th>
                <th className="p-4 border-b border-border text-right">Selling Price</th>
                <th className="p-4 border-b border-border text-right">Gross Margin</th>
                <th className="p-4 border-b border-border text-center">Warehouse Stock</th>
                <th className="p-4 border-b border-border text-center">Status</th>
                <th className="p-4 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-muted">
                    Loading catalog items...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const fPrice = Number(p.factoryPrice || 0);
                  const sPrice = Number(p.price || 0);
                  const margin = sPrice - fPrice;
                  const marginPct = sPrice > 0 ? Math.round((margin / sPrice) * 100) : 0;

                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-primary text-base">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.sku && (
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-mono px-1.5 py-0.5 rounded border border-gray-200">
                              {p.sku}
                            </span>
                          )}
                          <span className="text-xs text-text-muted font-medium">Unit: {p.unit || 'pack'}</span>
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-gray-600">
                        {fPrice.toLocaleString()} ETB
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-primary text-base">
                        {sPrice.toLocaleString()} ETB
                      </td>

                      <td className="p-4 text-right font-mono">
                        <span className={`font-bold ${margin >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          +{margin.toLocaleString()} ETB
                        </span>
                        <div className="text-[10px] text-text-muted font-sans font-semibold">
                          {marginPct}% margin
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded-full ${
                          p.stock > 100 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : p.stock > 0
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {p.stock || 0} pk
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                          p.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingProduct(p)}
                            className="bg-gray-100 hover:bg-gray-200 text-primary px-2.5 py-1 rounded text-xs font-bold transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="text-rose-600 hover:text-rose-800 px-2 py-1 text-xs font-semibold hover:bg-rose-50 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-muted">
                    {search ? 'No products matching filter.' : 'No products found. Click + Add New Product above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif font-bold text-xl text-primary">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Topwater 0.60L"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">SKU Code</label>
                  <input
                    type="text"
                    placeholder="e.g. TW-060"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Unit Type</label>
                  <input
                    type="text"
                    placeholder="pack, bottle, crate"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Factory Cost (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.factoryPrice}
                    onChange={(e) => setForm({ ...form, factoryPrice: Number(e.target.value) })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Selling Price (ETB) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Initial Warehouse Stock (Packs)</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-accent text-primary-darker font-bold px-5 py-2 rounded-lg text-sm hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif font-bold text-xl text-primary">Edit {editingProduct.name}</h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Unit</label>
                  <input
                    type="text"
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Factory Cost (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editingProduct.factoryPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, factoryPrice: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Selling Price (ETB)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Warehouse Stock (Packs)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={editingProduct.isActive}
                      onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-xs font-bold text-primary">Active in Catalog</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-accent text-primary-darker font-bold px-5 py-2 rounded-lg text-sm hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
