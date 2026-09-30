'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';

export default function CreateRoutePage() {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [agentId, setAgentId] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [clusterFilter, setClusterFilter] = useState('ALL');
  const router = useRouter();

  useEffect(() => {
    fetchApi<any[]>('/agents').then(setAgents).catch(console.error);
    fetchApi<any[]>('/customers').then(setCustomers).catch(console.error);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (clusterFilter === 'ALL') return customers;
    return customers.filter(c => {
      if (!c.lat || !c.lng) return clusterFilter === 'ALL';
      // Longitude: West Addis (<38.74), East Addis (>38.80)
      if (clusterFilter === 'YEKA') return c.lng > 38.80; // East (Yeka, Abado, Ayat)
      if (clusterFilter === 'MERCATO') return c.lng < 38.74; // West (Mercato, Burayu, Kolfe)
      if (clusterFilter === 'BOLE') return c.lng >= 38.74 && c.lng <= 38.80; // Center/Bole
      return true;
    });
  }, [customers, clusterFilter]);

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
          <div className="flex justify-between items-center mb-1">
            <label className="block font-bold">Select Stops (Customers)</label>
            <span className="text-xs text-text-muted font-bold">{selectedCustomers.length} selected</span>
          </div>

          {/* Neighborhood Cluster Filter */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              { id: 'ALL', label: 'All Sectors' },
              { id: 'YEKA', label: '📍 Yeka / Abado' },
              { id: 'MERCATO', label: '📍 Mercato / West' },
              { id: 'BOLE', label: '📍 Bole / Center' },
            ].map(cluster => (
              <button
                type="button"
                key={cluster.id}
                onClick={() => setClusterFilter(cluster.id)}
                className={`text-xs px-2.5 py-1 rounded-full border font-bold transition-colors ${
                  clusterFilter === cluster.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text-muted border-border hover:bg-gray-100'
                }`}
              >
                {cluster.label}
              </button>
            ))}
          </div>

          <div className="border rounded max-h-64 overflow-y-auto p-2 space-y-1.5 bg-gray-50">
            {filteredCustomers.map(c => {
              const isSelected = selectedCustomers.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected ? 'bg-amber-50/60 border-accent' : 'bg-white border-border hover:bg-gray-50'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => toggleCustomer(c.id)} 
                    className="w-4 h-4 text-accent rounded border-gray-300 focus:ring-accent"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-primary">{c.name}</span>
                      {c.category && (
                        <span className="text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded text-text-muted">
                          {c.category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                      {c.lat && c.lng ? (
                        <span className="font-mono text-[11px] text-emerald-700">📍 {c.lat.toFixed(4)}, {c.lng.toFixed(4)}</span>
                      ) : (
                        <span>No GPS</span>
                      )}
                      {c.phone && <span>· 📞 {c.phone}</span>}
                    </div>
                  </div>
                </label>
              );
            })}
            {filteredCustomers.length === 0 && (
              <div className="p-4 text-center text-sm text-text-muted">
                No shops in this sector. Try &quot;All Sectors&quot;.
              </div>
            )}
          </div>
        </div>
        <button disabled={selectedCustomers.length === 0} type="submit" className="w-full bg-accent text-primary-darker font-bold py-2 rounded disabled:opacity-50">
          Create Route
        </button>
      </form>
    </div>
  );
}
