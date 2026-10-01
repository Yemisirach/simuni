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
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);
    try {
      const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
      await fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify({ name, phone: cleanPhone, password, role }),
      });
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setPassword('');
      setRole('AGENT');
      await loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Staff & Roles</h1>
          <p className="text-text-muted mt-1 text-sm">Manage agents, managers, and sales reps across your fleet</p>
        </div>
        <button 
          onClick={() => { setFormError(null); setIsModalOpen(true); }}
          className="bg-[#C4A35A] hover:bg-[#b3934b] text-[#1A1A1A] px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>+</span>
          <span>Register Staff</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#FAF9F5] border-b border-border">
            <tr>
              <th className="px-6 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wider">Name</th>
              <th className="px-6 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wider">Role</th>
              <th className="px-6 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wider">Phone / Username</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-text-muted">Loading staff list...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-text-muted">No staff found</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-text">{u.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                      u.orgRole === 'owner' 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                        : u.orgRole === 'admin' 
                        ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {u.orgRole === 'member' ? 'Field Agent' : u.orgRole}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-muted font-mono text-sm">{u.phone || u.email || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#FAF9F5]">
              <h2 className="font-serif font-bold text-xl text-primary">Register New Staff</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-text-muted hover:text-text text-xl w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                  <span className="font-bold">⚠️</span>
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-text mb-1">Full Name</label>
                <input 
                  required
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]" 
                  placeholder="e.g. Alemu Bekele"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Phone Number (Username)</label>
                <input 
                  required
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]" 
                  placeholder="0911000000"
                />
                <p className="text-xs text-text-muted mt-1">Field agents will use this phone number to sign into the mobile app.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Password</label>
                <input 
                  required type="password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]" 
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Role</label>
                <select 
                  value={role} onChange={e => setRole(e.target.value as any)}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/50 focus:border-[#C4A35A]"
                >
                  <option value="AGENT">Field Agent (Driver / Dispatch Delivery)</option>
                  <option value="MANAGER">Sales / Fleet Manager</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-surface-100 hover:bg-neutral-200 text-text px-4 py-2.5 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={submitting}
                  type="submit" 
                  className="flex-1 bg-[#C4A35A] hover:bg-[#b3934b] text-[#1A1A1A] px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50"
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
