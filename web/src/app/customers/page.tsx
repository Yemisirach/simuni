'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Add form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    category: 'Retailer',
    lat: '',
    lng: '',
  });

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    category: 'Retailer',
    lat: '',
    lng: '',
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
      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        category: form.category,
      };
      if (form.lat && !isNaN(Number(form.lat))) payload.lat = Number(form.lat);
      if (form.lng && !isNaN(Number(form.lng))) payload.lng = Number(form.lng);

      await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowAddModal(false);
      setForm({ name: '', phone: '', address: '', category: 'Retailer', lat: '', lng: '' });
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (c: any) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name || '',
      phone: c.phone || '',
      address: c.address || '',
      category: c.category || 'Retailer',
      lat: c.lat !== null && c.lat !== undefined ? String(c.lat) : '',
      lng: c.lng !== null && c.lng !== undefined ? String(c.lng) : '',
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.name.trim()) return alert('Customer name is required');
    setSubmitting(true);
    try {
      const payload: any = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || undefined,
        address: editForm.address.trim() || undefined,
        category: editForm.category,
        lat: editForm.lat ? Number(editForm.lat) : null,
        lng: editForm.lng ? Number(editForm.lng) : null,
      };

      await fetchApi(`/customers/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setShowEditModal(false);
      setEditingId(null);
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setSubmitting(true);
    try {
      await fetchApi(`/customers/${customerToDelete.id}`, {
        method: 'DELETE',
      });
      setCustomerToDelete(null);
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.address?.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Customers & Delivery Stops</h1>
          <p className="text-text-muted mt-1">Manage wholesale buyers, retail kiosks, geofenced GPS locations, and accounts</p>
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
          placeholder="Search customer by name, phone, category, or neighborhood..."
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
                <th className="p-4 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
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
                        {c.category || 'Retailer'}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono">{c.phone || '-'}</td>
                    <td className="p-4">{c.address || '-'}</td>
                    <td className="p-4 text-xs font-mono text-text-muted">
                      {c.lat && c.lng ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          📍 {Number(c.lat).toFixed(4)}, {Number(c.lng).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-gray-400">No GPS set</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1 text-xs font-bold text-primary hover:text-accent bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                          title="Edit Customer"
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => setCustomerToDelete(c)}
                          className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                          title="Delete Customer"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
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
                  placeholder="e.g. Yeka Abado, Churchill Ave"
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
                  <option value="Other">Other / Institutional</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Latitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 9.0227"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Longitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 38.7469"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                  />
                </div>
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

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif font-bold text-xl text-primary">Edit Customer</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Customer / Shop Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cinema Ras Mart"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 0911234567"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Yeka Abado, Churchill Ave"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent bg-surface"
                >
                  <option value="Retailer">Retailer / Kiosk</option>
                  <option value="Wholesale">Wholesale Distributor</option>
                  <option value="Supermarket">Supermarket</option>
                  <option value="Hotel/Restaurant">Hotel / Cafe / Restaurant</option>
                  <option value="Other">Other / Institutional</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Latitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 9.0227"
                    value={editForm.lat}
                    onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Longitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 38.7469"
                    value={editForm.lng}
                    onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })}
                    className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-accent text-primary-darker font-bold px-5 py-2 rounded-lg text-sm hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border">
            <div className="text-center">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                🗑
              </div>
              <h3 className="font-serif font-bold text-lg text-primary mb-1">Delete Customer</h3>
              <p className="text-text-muted text-xs mb-4">
                Are you sure you want to delete <strong className="text-primary">{customerToDelete.name}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteCustomer}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
