'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import StopSelectionMapWrapper from '@/components/routes/StopSelectionMapWrapper';

export default function CreateRoutePage() {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [agentId, setAgentId] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [clusterFilter, setClusterFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingViewport, setIsLoadingViewport] = useState(false);
  const router = useRouter();

  // Initial load: fetch agents and initial central Addis viewport stops
  useEffect(() => {
    fetchApi<any[]>('/agents').then(setAgents).catch(console.error);
    
    // Initial viewport fetch for central / Yeka corridor (~300 stops instead of whole 3,400+ DB)
    const initQs = new URLSearchParams({
      minLat: '9.00000',
      maxLat: '9.06000',
      minLng: '38.72000',
      maxLng: '38.86000',
      limit: '350',
    });
    fetchApi<any[]>(`/customers/viewport?${initQs.toString()}`)
      .then((data) => setCustomers(data))
      .catch((err) => {
        console.error('Failed initial viewport fetch, falling back:', err);
        fetchApi<any[]>('/customers').then(setCustomers).catch(console.error);
      });
  }, []);

  // Geospatial Viewport Fetch: fetches only the shops within the current map bounding box
  const handleViewportFetch = useCallback(
    async (vp: { minLat: number; maxLat: number; minLng: number; maxLng: number; zoom: number }) => {
      setIsLoadingViewport(true);
      try {
        const qs = new URLSearchParams({
          minLat: vp.minLat.toFixed(5),
          maxLat: vp.maxLat.toFixed(5),
          minLng: vp.minLng.toFixed(5),
          maxLng: vp.maxLng.toFixed(5),
          limit: '350',
        });

        if (selectedCustomers.length > 0) {
          qs.set('includeIds', selectedCustomers.join(','));
        }

        const data = await fetchApi<any[]>(`/customers/viewport?${qs.toString()}`);

        // Merge incoming viewport stops into local cache so previously seen and selected stops persist
        setCustomers((prev) => {
          const map = new Map<string, any>(prev.map((c) => [c.id, c]));
          for (const item of data) {
            map.set(item.id, item);
          }
          return Array.from(map.values());
        });
      } catch (err) {
        console.error('Error in viewport fetch:', err);
      } finally {
        setIsLoadingViewport(false);
      }
    },
    [selectedCustomers],
  );

  // Debounced database search: query backend when searching across the entire city database
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({
          search: searchTerm.trim(),
          limit: '150',
        });
        if (selectedCustomers.length > 0) {
          qs.set('includeIds', selectedCustomers.join(','));
        }
        const searchResults = await fetchApi<any[]>(`/customers/viewport?${qs.toString()}`);
        setCustomers((prev) => {
          const map = new Map<string, any>(prev.map((c) => [c.id, c]));
          for (const item of searchResults) {
            map.set(item.id, item);
          }
          return Array.from(map.values());
        });
      } catch (err) {
        console.error('Error searching customers:', err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCustomers]);

  // Filter customers by search term and cluster
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Search matching
      const matchesSearch =
        !searchTerm ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm));

      if (!matchesSearch) return false;

      // Cluster matching
      if (clusterFilter === 'ALL') return true;
      if (!c.lat || !c.lng) return clusterFilter === 'ALL';
      if (clusterFilter === 'YEKA') return c.lng > 38.80; // East (Yeka, Abado, Ayat, CMC)
      if (clusterFilter === 'MERCATO') return c.lng < 38.74 && c.lat > 9.01; // West (Mercato, Autobis Tera, Kolfe)
      if (clusterFilter === 'BOLE') return c.lng >= 38.76 && c.lat < 9.01; // South-East (Bole Medhanialem, Atlas, Gerji)
      if (clusterFilter === 'CENTRAL') return c.lat >= 9.01 && c.lat <= 9.04 && c.lng >= 38.74 && c.lng <= 38.77; // Piazza, Churchill, Mexico
      if (clusterFilter === 'LEBU') return c.lat < 9.00 && c.lng < 38.74; // Lebu, Jemo, Nefas Silk
      return true;
    });
  }, [customers, clusterFilter, searchTerm]);

  // Handle single customer toggle
  const toggleCustomer = (id: string) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Handle multiple customer selection from map tools (Circle / Rectangle geofencing)
  const handleSelectMultiple = (ids: string[], mode: 'add' | 'replace' | 'remove') => {
    if (mode === 'replace') {
      setSelectedCustomers(ids);
    } else if (mode === 'remove') {
      setSelectedCustomers(prev => prev.filter(id => !ids.includes(id)));
    } else {
      // Add without duplicates
      setSelectedCustomers(prev => {
        const next = [...prev];
        for (const id of ids) {
          if (!next.includes(id)) {
            next.push(id);
          }
        }
        return next;
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer stop.');
      return;
    }
    setLoading(true);
    try {
      await fetchApi('/routes', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          date: new Date(date).toISOString(),
          agentId: agentId || undefined,
          customerIds: selectedCustomers,
        }),
      });
      router.push('/routes');
    } catch (err: any) {
      alert(err.message || 'Error creating route');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted mb-1">
            <Link href="/routes" className="hover:text-primary transition-colors">
              Field Routes
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">New Route Dispatch</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Create Route &amp; Geofence Stops</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/routes"
            className="px-4 py-2 border border-border bg-white rounded-lg text-xs font-bold text-text-muted hover:text-primary transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || selectedCustomers.length === 0 || !name.trim()}
            className="px-5 py-2 bg-accent text-primary-darker rounded-lg text-xs font-extrabold hover:bg-[#b5944b] transition-all disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Dispatching...' : `Save & Dispatch (${selectedCustomers.length} Stops)`}
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Route Configuration & Stop List */}
        <div className="lg:col-span-5 space-y-5">
          <form onSubmit={handleCreate} className="bg-surface p-5 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-base font-bold text-primary border-b border-border pb-2.5">
              1. Route Details &amp; Agent
            </h2>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                Route Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Yeka Morning Express or Mercato Wholesale"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-primary mb-1">Dispatch Date</label>
                <input
                  required
                  type="date"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none font-mono"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1">Assign Agent</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                  value={agentId}
                  onChange={e => setAgentId(e.target.value)}
                >
                  <option value="">-- Leave Unassigned --</option>
                  {agents.map(a => {
                    const agentName = a.name || a.phoneNumber || a.email || `Agent ${a.id.slice(0, 6)}`;
                    const vehicle = a.agentProfile?.vehicle ? ` (${a.agentProfile.vehicle})` : '';
                    return (
                      <option key={a.id} value={a.id}>
                        {agentName}{vehicle}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Selected Stops Summary */}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span>2. Select Stops (Customers)</span>
                  <span className="bg-accent/20 text-primary-darker font-bold px-2 py-0.5 rounded-full text-[11px]">
                    {selectedCustomers.length} selected
                  </span>
                </label>
                {selectedCustomers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomers([])}
                    className="text-[11px] text-red-600 font-semibold hover:underline"
                  >
                    Deselect All
                  </button>
                )}
              </div>

              {/* Search & Sector Filters */}
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Search shops by name, phone, or address..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-accent outline-none"
                />

                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'ALL', label: 'All Sectors' },
                    { id: 'YEKA', label: '📍 Yeka / Abado' },
                    { id: 'MERCATO', label: '📍 Mercato / West' },
                    { id: 'BOLE', label: '📍 Bole / South' },
                    { id: 'CENTRAL', label: '📍 Central / Piazza' },
                    { id: 'LEBU', label: '📍 Lebu / Jemo' },
                  ].map(cluster => (
                    <button
                      type="button"
                      key={cluster.id}
                      onClick={() => setClusterFilter(cluster.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border font-bold transition-all ${
                        clusterFilter === cluster.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-white text-text-muted border-border hover:bg-gray-100'
                      }`}
                    >
                      {cluster.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Checkbox List */}
              <div className="border border-border rounded-lg max-h-72 overflow-y-auto p-2 space-y-1.5 bg-gray-50/50">
                {filteredCustomers.map((c, idx) => {
                  const isSelected = selectedCustomers.includes(c.id);
                  const selectedOrder = isSelected ? selectedCustomers.indexOf(c.id) + 1 : null;
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/80 border-accent shadow-xs'
                          : 'bg-white border-border hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCustomer(c.id)}
                        className="w-4 h-4 text-accent rounded border-gray-300 focus:ring-accent cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-primary truncate">{c.name}</span>
                          {selectedOrder && (
                            <span className="text-[10px] font-mono font-bold bg-accent text-primary-darker px-1.5 py-0.2 rounded-full">
                              Stop #{selectedOrder}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5 truncate">
                          {c.lat && c.lng ? (
                            <span className="font-mono text-emerald-700 text-[10px]">
                              📍 {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[10px]">No GPS</span>
                          )}
                          {c.address && <span className="truncate">· {c.address}</span>}
                          {c.phone && <span className="font-mono">· {c.phone}</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <div className="p-4 text-center text-xs text-text-muted">
                    No shops matching filter. Try resetting search or sector.
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={loading || selectedCustomers.length === 0 || !name.trim()}
              type="submit"
              className="w-full bg-accent text-primary-darker font-bold py-2.5 rounded-lg text-sm hover:bg-[#b5944b] transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Creating Route...' : `Create Route (${selectedCustomers.length} Stops)`}
            </button>
          </form>
        </div>

        {/* Right Column: Spatial Geofencing & Map Picker */}
        <div className="lg:col-span-7 flex flex-col h-[650px] sticky top-20">
          <div className="bg-surface p-3 border border-border border-b-0 rounded-t-xl flex justify-between items-center bg-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
                <span>🗺️ Interactive Geofence Map</span>
              </h3>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Viewport Stream ({customers.length} Loaded)</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-primary bg-white px-2.5 py-1 border border-border rounded-lg shadow-xs">
              {selectedCustomers.length} Stops Pinned
            </span>
          </div>

          <div className="flex-1 w-full relative">
            <StopSelectionMapWrapper
              customers={customers}
              selectedCustomerIds={selectedCustomers}
              onToggleCustomer={toggleCustomer}
              onSelectMultiple={handleSelectMultiple}
              onViewportFetch={handleViewportFetch}
              isLoadingViewport={isLoadingViewport}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
