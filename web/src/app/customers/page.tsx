'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { ADDIS_ABABA_TAGGED_LOCATIONS, ADDIS_ABABA_CENTRAL_LOCATION } from '@/lib/constants/addisLocations';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick Preset Location selector in Modal
  const [selectedPresetId, setSelectedPresetId] = useState('');

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

  // Seed Addis Hubs Form state
  const [applyToAllWorkspaces, setApplyToAllWorkspaces] = useState(true);

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

  // When a preset location is picked in Add Modal, automatically autofill name, category, address & coordinates
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;

    if (presetId === 'central-hub') {
      setForm((prev) => ({
        ...prev,
        name: prev.name || ADDIS_ABABA_CENTRAL_LOCATION.name,
        address: prev.address || 'Piazza / Churchill Ave, Central Addis Ababa',
        lat: String(ADDIS_ABABA_CENTRAL_LOCATION.lat),
        lng: String(ADDIS_ABABA_CENTRAL_LOCATION.lng),
      }));
      return;
    }

    const preset = ADDIS_ABABA_TAGGED_LOCATIONS.find((l) => l.id === presetId);
    if (preset) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || preset.name,
        address: prev.address || `${preset.name}, ${preset.subCity}`,
        category: preset.defaultCategory || prev.category,
        lat: String(preset.lat),
        lng: String(preset.lng),
      }));
    }
  };

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
      setSelectedPresetId('');
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

  // Bulk Seed Tagged Addis Ababa Locations for all workspaces
  const handleSeedAddisLocations = async () => {
    setSubmitting(true);
    try {
      const formatted = ADDIS_ABABA_TAGGED_LOCATIONS.map((loc) => ({
        name: loc.name,
        phone: '0911000000',
        address: `${loc.name}, ${loc.subCity}`,
        category: loc.defaultCategory || 'Retailer',
        lat: loc.lat,
        lng: loc.lng,
      }));

      const res = await fetchApi<any>('/customers/seed-addis', {
        method: 'POST',
        body: JSON.stringify({
          locations: formatted,
          applyToAllWorkspaces,
        }),
      });

      alert(
        `✅ Successfully synced ${res.createdCount || formatted.length} tagged Addis Ababa commercial hubs across ${
          res.targetWorkspacesCount || 1
        } workspace(s)!`
      );
      setShowSeedModal(false);
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to seed Addis Ababa locations');
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
          <p className="text-text-muted mt-1">
            Manage wholesale buyers, retail kiosks, geofenced GPS locations across Addis Ababa hubs
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowSeedModal(true)}
            className="border border-accent bg-accent/10 text-primary-darker hover:bg-accent/20 text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>🇪🇹</span>
            <span>Sync All Addis Tagged Hubs</span>
          </button>
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="border border-border text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => {
              setSelectedPresetId('');
              setShowAddModal(true);
            }}
            className="bg-accent text-primary-darker text-sm font-bold px-4 py-2 rounded-lg hover:bg-accent-light transition-colors shadow-sm"
          >
            + Add Customer
          </button>
        </div>
      </div>

      {/* Quick Tagged Locations Chip Bar */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xs flex items-center justify-between gap-3 overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="font-bold text-primary flex items-center gap-1">
            <span>📍</span> Tagged Hubs:
          </span>
          <button
            onClick={() => {
              setSearch('Yeka');
            }}
            className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold text-text-muted hover:text-primary transition-colors"
          >
            Yeka / Abado (6)
          </button>
          <button
            onClick={() => {
              setSearch('Mercato');
            }}
            className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold text-text-muted hover:text-primary transition-colors"
          >
            Mercato / Autobis Tera (5)
          </button>
          <button
            onClick={() => {
              setSearch('Bole');
            }}
            className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold text-text-muted hover:text-primary transition-colors"
          >
            Bole / Atlas / Gerji (5)
          </button>
          <button
            onClick={() => {
              setSearch('Lebu');
            }}
            className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold text-text-muted hover:text-primary transition-colors"
          >
            Lebu / Jemo (3)
          </button>
          <button
            onClick={() => {
              setSearch('Piazza');
            }}
            className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold text-text-muted hover:text-primary transition-colors"
          >
            Piazza / Churchill (5)
          </button>
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-accent font-bold text-xs whitespace-nowrap hover:underline"
          >
            Show All
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
        <span className="text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Search customer by name, phone, category, sub-city, or neighborhood..."
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
          <h3 className="font-serif font-bold text-lg">Registered Clients & Tagged GPS Waypoints</h3>
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
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                          <span>📍</span>
                          <span>
                            {Number(c.lat).toFixed(4)}, {Number(c.lng).toFixed(4)}
                          </span>
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
                    {search
                      ? 'No customers match your search.'
                      : 'No customers found. Click + Add Customer or Sync All Addis Tagged Hubs.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal with Tagged Preset Picker */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
              <div>
                <h3 className="font-serif font-bold text-xl text-primary">Add New Customer</h3>
                <p className="text-xs text-text-muted">Register a store or pick from Addis Ababa tagged hubs</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ✕
              </button>
            </div>

            {/* Quick Addis Location Preset Dropdown */}
            <div className="mb-4 p-3 bg-amber-50/70 rounded-xl border border-accent/40">
              <label className="block text-xs font-extrabold text-primary-darker mb-1 uppercase flex items-center justify-between">
                <span>⚡ Autofill from Tagged Addis Location</span>
                <span className="text-[10px] text-accent font-bold">24+ Verified Hubs</span>
              </label>
              <select
                value={selectedPresetId}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="w-full border border-accent/50 rounded-lg p-2 text-xs bg-white font-medium outline-none focus:border-accent"
              >
                <option value="">-- Choose a Tagged Location or Type Manually --</option>
                <option value="central-hub">📍 Central Addis Hub (Piazza / Churchill Ave)</option>
                <optgroup label="Yeka / East Hubs">
                  {ADDIS_ABABA_TAGGED_LOCATIONS.filter((l) => l.sector === 'YEKA').map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.subCity})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Mercato / West Hubs">
                  {ADDIS_ABABA_TAGGED_LOCATIONS.filter((l) => l.sector === 'MERCATO' || l.sector === 'KOLFE').map(
                    (l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.subCity})
                      </option>
                    )
                  )}
                </optgroup>
                <optgroup label="Bole / South-East Hubs">
                  {ADDIS_ABABA_TAGGED_LOCATIONS.filter((l) => l.sector === 'BOLE').map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.subCity})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Central & Southern Hubs (Kirkos, Arada, Lebu)">
                  {ADDIS_ABABA_TAGGED_LOCATIONS.filter(
                    (l) => l.sector === 'CENTRAL' || l.sector === 'ARADA' || l.sector === 'LEBU' || l.sector === 'AKAKI'
                  ).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.subCity})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <form onSubmit={handleCreateCustomer} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Customer / Shop Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cinema Ras Mart or Yeka Abado Mini Market"
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

      {/* Bulk Seed Addis Ababa Locations Modal */}
      {showSeedModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🇪🇹</span>
                <h3 className="font-serif font-bold text-xl text-primary">Sync All Addis Locations</h3>
              </div>
              <button onClick={() => setShowSeedModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                ✕
              </button>
            </div>

            <p className="text-text-muted text-xs leading-relaxed mb-4">
              This will automatically tag and register <strong>{ADDIS_ABABA_TAGGED_LOCATIONS.length} verified commercial centers</strong> across
              all major Addis Ababa corridors (Yeka Abado, Mercato, Bole, Lebu, Piazza, CMC, etc.) with precise GPS coordinates.
            </p>

            <div className="p-3 bg-gray-50 rounded-xl border border-border mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAllWorkspaces}
                  onChange={(e) => setApplyToAllWorkspaces(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded"
                />
                <span className="text-xs font-bold text-primary">
                  Apply to all workspaces (Universal Multi-tenant Sync)
                </span>
              </label>
              <p className="text-[11px] text-text-muted mt-1 ml-6">
                Enables newly onboarded workspaces and business owners to immediately access all mapped Addis delivery stops.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowSeedModal(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSeedAddisLocations}
                disabled={submitting}
                className="bg-accent text-primary-darker font-bold px-5 py-2 rounded-lg text-sm hover:bg-accent-light transition-colors disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Syncing...' : `Sync ${ADDIS_ABABA_TAGGED_LOCATIONS.length} Locations`}
              </button>
            </div>
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
                Are you sure you want to delete <strong className="text-primary">{customerToDelete.name}</strong>? This
                action cannot be undone.
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
