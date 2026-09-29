'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

interface StaffUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  orgRole: string;
}

export default function StaffPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create user form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'AGENT' | 'MANAGER'>('AGENT');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await fetchApi<StaffUser[]>('/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load staff', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify({ name, phone, password, role }),
      });
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setPassword('');
      setRole('AGENT');
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Staff & Roles</h1>
          <p className="text-text-muted mt-1">Manage agents, managers, and sales reps</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary/90"
        >
          + Register User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-50 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Phone / Username</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-text-muted">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-text-muted">No staff found</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 font-semibold text-text">{u.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-surface-200 text-text-muted px-2 py-1 rounded text-xs font-bold uppercase">
                      {u.orgRole}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-muted font-mono">{u.phone || u.email || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="font-serif font-bold text-xl text-primary">Register New Staff</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text">×</button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Full Name</label>
                <input 
                  required
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2" 
                  placeholder="e.g. Abebe Bekele"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Phone Number (Username)</label>
                <input 
                  required
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2" 
                  placeholder="0911000000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Password</label>
                <input 
                  required type="password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2" 
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Role</label>
                <select 
                  value={role} onChange={e => setRole(e.target.value as any)}
                  className="w-full border border-border rounded-lg px-3 py-2"
                >
                  <option value="AGENT">Field Agent (Driver)</option>
                  <option value="MANAGER">Sales / Manager</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-surface-100 text-text px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button 
                  disabled={submitting}
                  type="submit" 
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
