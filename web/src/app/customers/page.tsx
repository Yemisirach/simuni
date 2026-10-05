'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    category: 'Retailer',
  });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<any[]>('/customers');
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Customer name is required');
    setSubmitting(true);
    try {
      await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowAddModal(false);
      setForm({ name: '', phone: '', address: '', category: 'Retailer' });
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Customers & Delivery Stops</h1>
          <p className="text-text-muted mt-1">Manage wholesale buyers, retail kiosks, and delivery locations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="border border-border text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-primary-darker text-sm font-bold px-4 py-2 rounded-lg hover:bg-accent-light transition-colors shadow-sm"
          >
            + Add Customer
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
        <span className="text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Search customer by name, phone, or neighborhood..."
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

      {/* Customers Table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
          <h3 className="font-serif font-bold text-lg">Registered Clients</h3>
          <span className="bg-primary text-white text-xs px-2.5 py-1 rounded-full font-bold">
            {loading ? '...' : `${filtered.length} of ${customers.length}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-text-muted text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 border-b border-border">Name</th>
                <th className="p-4 border-b border-border">Category</th>
                <th className="p-4 border-b border-border">Phone</th>
                <th className="p-4 border-b border-border">Address / Area</th>
                <th className="p-4 border-b border-border">GPS Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted">
                    Loading customer directory...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-primary">{c.name}</div>
                      <div className="text-[11px] text-text-muted font-mono">{c.id.slice(0, 8)}...</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-medium border border-gray-200">
                        {c.category || 'Standard'}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono">{c.phone || '-'}</td>
                    <td className="p-4">{c.address || '-'}</td>
                    <td className="p-4 text-xs font-mono text-text-muted">
                      {c.lat && c.lng ? (
                        <span className="text-emerald-700 font-bold">
                          📍 {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-gray-400">No GPS set</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted">
                    {search ? 'No customers match your search.' : 'No customers found. Click + Add Customer above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif font-bold text-xl text-primary">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Customer / Shop Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cinema Ras Mart"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 0911234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Mercato, Churchill Ave"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent bg-surface"
                >
                  <option value="Retailer">Retailer / Kiosk</option>
                  <option value="Wholesale">Wholesale Distributor</option>
                  <option value="Supermarket">Supermarket</option>
                  <option value="Hotel/Restaurant">Hotel / Cafe / Restaurant</option>
                </select>
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
                  {submitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
