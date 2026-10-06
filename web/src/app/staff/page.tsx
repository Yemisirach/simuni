'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { fetchApi } from '@/lib/api';

interface StaffUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneNumber?: string | null;
  username?: string | null;
  orgRole: 'owner' | 'admin' | 'member' | string;
  vehicle?: string | null;
  isOnline?: boolean;
  createdAt?: string;
}

export default function StaffPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'AGENT' | 'MANAGER' | 'OWNER'>('ALL');

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'AGENT' as 'AGENT' | 'MANAGER',
    vehicle: '',
    password: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal state
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'AGENT' as 'AGENT' | 'MANAGER',
    vehicle: '',
    password: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<StaffUser | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await fetchApi<StaffUser[]>('/users');
      setUsers(data || []);
    } catch (err: any) {
      console.error('Failed to load staff list:', err);
      showToast(err.message || 'Failed to load staff list', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Filtered staff list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter === 'AGENT' && u.orgRole !== 'member') return false;
      if (roleFilter === 'MANAGER' && u.orgRole !== 'admin') return false;
      if (roleFilter === 'OWNER' && u.orgRole !== 'owner') return false;

      // Text search
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const nameMatch = (u.name || '').toLowerCase().includes(q);
      const phoneMatch = (u.phone || u.phoneNumber || u.username || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const vehicleMatch = (u.vehicle || '').toLowerCase().includes(q);
      const roleMatch = (u.orgRole || '').toLowerCase().includes(q);

      return nameMatch || phoneMatch || emailMatch || vehicleMatch || roleMatch;
    });
  }, [users, roleFilter, search]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = users.length;
    const agents = users.filter((u) => u.orgRole === 'member').length;
    const managers = users.filter((u) => u.orgRole === 'admin').length;
    const owners = users.filter((u) => u.orgRole === 'owner').length;
    const online = users.filter((u) => u.isOnline).length;
    return { total, agents, managers, owners, online };
  }, [users]);

  // Create Staff Handler
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) return setCreateError('Full Name is required');
    if (!createForm.phone.trim()) return setCreateError('Phone number is required');
    if (createForm.password.length < 6) return setCreateError('Password must be at least 6 characters');

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const cleanPhone = createForm.phone.replace(/[\s\-\+\(\)]/g, '');
      const payload: any = {
        name: createForm.name.trim(),
        phone: cleanPhone,
        role: createForm.role,
        password: createForm.password,
      };
      if (createForm.email.trim()) payload.email = createForm.email.trim();
      if (createForm.vehicle.trim()) payload.vehicle = createForm.vehicle.trim();

      await fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowCreateModal(false);
      setCreateForm({
        name: '',
        phone: '',
        email: '',
        role: 'AGENT',
        vehicle: '',
        password: '',
      });
      showToast(`Successfully registered ${payload.name} as staff!`);
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to register staff');
    } finally {
      setCreateSubmitting(false);
    }
  }

  // Open Edit Modal
  function handleOpenEdit(u: StaffUser) {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      phone: u.phone || u.phoneNumber || u.username || '',
      email: u.email || '',
      role: u.orgRole === 'admin' ? 'MANAGER' : 'AGENT',
      vehicle: u.vehicle || '',
      password: '',
    });
    setEditError(null);
  }

  // Update Staff Handler
  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    if (!editForm.name.trim()) return setEditError('Full Name is required');
    if (!editForm.phone.trim()) return setEditError('Phone number is required');

    setEditSubmitting(true);
    setEditError(null);
    try {
      const cleanPhone = editForm.phone.replace(/[\s\-\+\(\)]/g, '');
      const payload: any = {
        name: editForm.name.trim(),
        phone: cleanPhone,
        role: editForm.role,
      };
      if (editForm.email.trim()) payload.email = editForm.email.trim();
      if (editForm.vehicle !== undefined) payload.vehicle = editForm.vehicle.trim() || null;
      if (editForm.password && editForm.password.length >= 6) {
        payload.password = editForm.password;
      }

      await fetchApi(`/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setEditingUser(null);
      showToast(`Staff member ${payload.name} updated successfully!`);
      await loadUsers();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update staff member');
    } finally {
      setEditSubmitting(false);
    }
  }

  // Delete Staff Handler
  async function handleDeleteUser() {
    if (!userToDelete) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await fetchApi(`/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const name = userToDelete.name;
      setUserToDelete(null);
      showToast(`Staff member ${name} removed from workspace.`);
      await loadUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove staff member');
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // Helper for initials
  const getInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-xl border flex items-center gap-3 transition-all animate-in slide-in-from-top-4 duration-200 ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary">Staff & Fleet Team</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF9F5] border border-[#E5E5E3] text-[#1A1A1A]">
              {users.length} Active
            </span>
          </div>
          <p className="text-text-muted mt-1 text-sm">
            Manage dispatch delivery agents, fleet managers, login credentials, and vehicle assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadUsers()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border bg-white hover:bg-neutral-50 text-text text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
            title="Refresh list"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            className="bg-[#C4A35A] hover:bg-[#b3934b] text-[#1A1A1A] px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <span className="text-lg leading-none">+</span>
            <span>Register Staff</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg">
            👥
          </div>
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Staff</div>
            <div className="text-xl font-bold font-mono text-primary">{metrics.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
            🚚
          </div>
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Field Agents</div>
            <div className="text-xl font-bold font-mono text-primary">{metrics.agents}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg">
            💼
          </div>
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Managers</div>
            <div className="text-xl font-bold font-mono text-primary">{metrics.managers}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold text-lg">
            📡
          </div>
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Live / Online</div>
            <div className="text-xl font-bold font-mono text-emerald-600">{metrics.online}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Box */}
        <div className="relative w-full md:w-96">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, vehicle, or role..."
            className="w-full pl-10 pr-9 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Roles' },
            { id: 'AGENT', label: 'Field Agents' },
            { id: 'MANAGER', label: 'Managers' },
            { id: 'OWNER', label: 'Owners' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                roleFilter === tab.id
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#FAF9F5] border-b border-border">
              <tr>
                <th className="px-5 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wider">Staff Member</th>
                <th className="px-5 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wider">Role</th>
                <th className="px-5 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wider">Mobile App Login</th>
                <th className="px-5 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wider">Assigned Vehicle</th>
                <th className="px-5 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-2xl animate-spin">⏳</span>
                      <span>Loading staff directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span className="text-4xl">👥</span>
                      <div className="font-semibold text-text">No staff found</div>
                      <p className="text-xs text-text-muted max-w-sm">
                        {search
                          ? `No staff members matched "${search}". Try clearing your search term.`
                          : 'There are no staff members registered in this category.'}
                      </p>
                      {search ? (
                        <button
                          onClick={() => {
                            setSearch('');
                            setRoleFilter('ALL');
                          }}
                          className="mt-2 text-xs font-bold text-[#C4A35A] underline"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setCreateError(null);
                            setShowCreateModal(true);
                          }}
                          className="mt-2 bg-[#C4A35A] text-[#1A1A1A] font-bold px-4 py-2 rounded-xl text-xs"
                        >
                          + Register First Staff Member
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isOwner = u.orgRole === 'owner';
                  const isAdmin = u.orgRole === 'admin';
                  const isAgent = u.orgRole === 'member';

                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-[#FAF9F5] flex items-center justify-center font-bold text-xs border border-border shadow-inner">
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div className="font-bold text-text flex items-center gap-2">
                              <span>{u.name}</span>
                              {isOwner && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-text-muted font-mono">{u.email || u.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                            isOwner
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isAdmin
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isOwner ? '👑 Business Owner' : isAdmin ? '💼 Fleet Manager' : '🚚 Field Agent'}
                        </span>
                      </td>

                      {/* Phone / Username */}
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm text-text font-semibold">
                          {u.phone || u.phoneNumber || u.username || 'N/A'}
                        </div>
                        <span className="text-[11px] text-text-muted">App Username</span>
                      </td>

                      {/* Assigned Vehicle */}
                      <td className="px-5 py-4">
                        {u.vehicle ? (
                          <span className="inline-flex items-center gap-1.5 bg-neutral-100 border border-border text-neutral-800 text-xs font-bold px-2.5 py-1 rounded-md">
                            <span>🚛</span>
                            <span>{u.vehicle}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted italic">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {u.isOnline ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
                            Offline
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-text-muted hover:text-text hover:bg-neutral-100 rounded-lg transition-colors border border-transparent hover:border-border"
                            title="Edit Staff Member"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setUserToDelete(u);
                            }}
                            disabled={isOwner}
                            className={`p-1.5 rounded-lg transition-colors border border-transparent ${
                              isOwner
                                ? 'opacity-30 cursor-not-allowed text-neutral-400'
                                : 'text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200'
                            }`}
                            title={isOwner ? 'Workspace owner cannot be removed' : 'Remove Staff Member'}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= REGISTER MODAL ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#FAF9F5]">
              <div>
                <h2 className="font-serif font-bold text-xl text-primary">Register New Staff Member</h2>
                <p className="text-xs text-text-muted mt-0.5">Provision login credentials and operational roles</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text text-xl w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                  <span className="font-bold">⚠️</span>
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-text mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                  placeholder="e.g. Dawit Kebede"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                    placeholder="0911223344"
                  />
                  <p className="text-[11px] text-text-muted mt-1">Used as username to log in to mobile app.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                    placeholder="dawit@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Operational Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                  >
                    <option value="AGENT">Field Agent (Delivery Driver)</option>
                    <option value="MANAGER">Fleet / Sales Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Vehicle / Fleet Tag</label>
                  <input
                    value={createForm.vehicle}
                    onChange={(e) => setCreateForm({ ...createForm, vehicle: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                    placeholder="e.g. MB-04 Van"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1">
                  Login Password <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-text px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={createSubmitting}
                  type="submit"
                  className="flex-1 bg-[#C4A35A] hover:bg-[#b3934b] text-[#1A1A1A] px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 text-sm"
                >
                  {createSubmitting ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#FAF9F5]">
              <div>
                <h2 className="font-serif font-bold text-xl text-primary">Edit Staff Profile</h2>
                <p className="text-xs text-text-muted mt-0.5">Updating {editingUser.name}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-text-muted hover:text-text text-xl w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                  <span className="font-bold">⚠️</span>
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-text mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                  placeholder="e.g. Dawit Kebede"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                    placeholder="0911223344"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                    placeholder="dawit@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Operational Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    disabled={editingUser.orgRole === 'owner'}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A] disabled:bg-neutral-100 disabled:text-text-muted"
                  >
                    <option value="AGENT">Field Agent (Delivery Driver)</option>
                    <option value="MANAGER">Fleet / Sales Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Vehicle / Fleet Tag</label>
                  <input
                    value={editForm.vehicle}
                    onChange={(e) => setEditForm({ ...editForm, vehicle: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                    placeholder="e.g. MB-04 Van"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1">
                  Reset Password <span className="text-xs text-text-muted font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                  placeholder="New password (min 6 characters)"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-text px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={editSubmitting}
                  type="submit"
                  className="flex-1 bg-[#C4A35A] hover:bg-[#b3934b] text-[#1A1A1A] px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 text-sm"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto mb-4">
                ⚠️
              </div>
              <h2 className="font-serif font-bold text-xl text-center text-primary mb-2">Remove Staff Member</h2>
              <p className="text-sm text-text-muted text-center mb-4">
                Are you sure you want to remove <strong className="text-text">{userToDelete.name}</strong> from your
                workspace team?
              </p>
              <div className="p-3 bg-neutral-50 rounded-xl border border-border text-xs text-text-muted space-y-1 mb-6">
                <div>• Role: <span className="font-semibold text-text">{userToDelete.orgRole}</span></div>
                <div>• Mobile login: <span className="font-mono text-text">{userToDelete.phone || userToDelete.phoneNumber || userToDelete.username}</span></div>
                <div>• They will immediately lose access to the mobile delivery app.</div>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs mb-4">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-text px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteSubmitting}
                  onClick={handleDeleteUser}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 text-sm"
                >
                  {deleteSubmitting ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
