'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    workspaceName: '',
    ownerName: '',
    phone: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await fetchApi('/workspace/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      // After registration, send them to login
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center font-serif font-bold text-primary-darker text-2xl mx-auto mb-4">
            S
          </div>
          <h2 className="text-2xl font-bold font-serif text-primary">Create Your Hub</h2>
          <p className="text-text-muted mt-2">Setup a new Simuni workspace</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Company / Workspace Name</label>
            <input
              type="text"
              value={formData.workspaceName}
              onChange={(e) => setFormData({...formData, workspaceName: e.target.value})}
              className="w-full border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
              placeholder="e.g. Yeka Abdo Distributors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Your Full Name</label>
            <input
              type="text"
              value={formData.ownerName}
              onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
              className="w-full border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
              placeholder="0911..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent outline-none"
              minLength={6}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-darker text-white font-bold py-3 rounded-lg hover:bg-[#111] transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating...' : 'Register Workspace'}
          </button>
        </form>
        
        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account? <Link href="/login" className="text-accent font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
