'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';

export default function CreateRoutePage() {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [agentId, setAgentId] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchApi('/agents').then(setAgents).catch(console.error);
    fetchApi('/customers').then(setCustomers).catch(console.error);
  }, []);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    try {
      await fetchApi('/routes', {
        method: 'POST',
        body: JSON.stringify({
          name,
          date: new Date(date).toISOString(),
          agentId: agentId || undefined,
          customerIds: selectedCustomers
        })
      });
      router.push('/routes');
    } catch (err) {
      alert('Error creating route');
      console.error(err);
    }
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-2xl bg-surface p-6 rounded-xl shadow-sm border">
      <h1 className="text-2xl font-bold mb-4 font-serif">Create New Route</h1>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block font-bold mb-1">Route Name (e.g. Yeka Abdo)</label>
          <input required type="text" className="w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block font-bold mb-1">Date</label>
          <input required type="date" className="w-full border p-2 rounded" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block font-bold mb-1">Assign Agent</label>
          <select className="w-full border p-2 rounded" value={agentId} onChange={e => setAgentId(e.target.value)}>
            <option value="">-- Leave Unassigned --</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.user?.name || a.id}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-bold mb-1">Select Stops (Customers)</label>
          <div className="border rounded max-h-60 overflow-y-auto p-2 space-y-2">
            {customers.map(c => (
              <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                <input 
                  type="checkbox" 
                  checked={selectedCustomers.includes(c.id)}
                  onChange={() => toggleCustomer(c.id)} 
                />
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-text-muted">{c.address || c.phone}</div>
                </div>
              </label>
            ))}
            {customers.length === 0 && <div className="p-2 text-sm text-text-muted">No customers found. Add customers first.</div>}
          </div>
        </div>
        <button disabled={selectedCustomers.length === 0} type="submit" className="w-full bg-accent text-primary-darker font-bold py-2 rounded disabled:opacity-50">
          Create Route
        </button>
      </form>
    </div>
  );
}
