'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isEmail = email.includes('@');
      let result;
      if (isEmail) {
        result = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
      } else {
        result = await authClient.signIn.username({
          username: email.trim(),
          password,
        });
      }

      if (result.error) {
        setError(result.error.message || 'Login failed. Please verify your credentials.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center font-bold text-primary-darker text-2xl mx-auto mb-4">
            S
          </div>
          <h2 className="text-2xl font-bold text-primary tracking-tight">Simuni Command Hub</h2>
          <p className="text-text-muted mt-2 text-sm">Sign in to your dispatcher account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Email or Phone</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all font-sans text-sm"
              placeholder="e.g. admin@simuni.local or 0911000001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all font-mono text-sm"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-primary-darker font-bold py-3 rounded-lg hover:bg-[#b0904a] transition-colors disabled:opacity-50 tracking-wide text-sm"
          >
            {loading ? 'Authenticating...' : 'Secure Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border/60 text-xs text-text-muted">
          <div className="font-semibold text-primary mb-1">Default Credentials:</div>
          <div className="font-mono bg-bg p-2.5 rounded-lg border border-border/80 space-y-1">
            <div><span className="text-text-muted">Email:</span> <span className="text-primary font-bold">admin@simuni.local</span></div>
            <div><span className="text-text-muted">Phone:</span> <span className="text-primary font-bold">0911000001</span></div>
            <div><span className="text-text-muted">Password:</span> <span className="text-primary font-bold">password123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
