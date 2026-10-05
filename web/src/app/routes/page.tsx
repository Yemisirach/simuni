'use client';

import { useEffect, useState } from 'react';
import { routesService } from '@/lib/services/routes.service';
import { agentsService } from '@/lib/services/agents.service';
import Link from 'next/link';

export default function RoutesAgentsPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedRoutes, fetchedAgents] = await Promise.all([
        routesService.getRoutes(),
        agentsService.getAgents(),
      ]);
      setRoutes(fetchedRoutes || []);
      setAgents(fetchedAgents || []);
    } catch (err: any) {
      console.error('Failed to load routes and agents:', err);
      setError(err?.message || 'Failed to load route manifests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">
            Field Routes & Agents
          </h1>
          <p className="text-text-muted mt-1">Manage active dispatches and fleet operations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="border border-border text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
          <Link href="/routes/create" className="bg-accent text-primary-darker text-sm font-bold px-4 py-2 rounded-lg hover:bg-accent-light transition-colors shadow-sm">
            + Create Route
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm p-4 rounded-xl flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={loadData} className="font-bold underline text-xs">Retry</button>
        </div>
      )}

      {/* Routes Manifest Section */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
          <h3 className="font-serif font-bold text-lg">Active & Planned Routes</h3>
          <span className="bg-primary text-white text-xs px-2.5 py-1 rounded-full font-bold">
            {loading ? '...' : `${routes.length} Routes`}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-text-muted text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 border-b border-border">Route Name</th>
                <th className="p-4 border-b border-border">Date</th>
                <th className="p-4 border-b border-border">Assigned Agent</th>
                <th className="p-4 border-b border-border">Stops</th>
                <th className="p-4 border-b border-border">Status</th>
                <th className="p-4 border-b border-border text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    Loading field itineraries...
                  </td>
                </tr>
              ) : routes.length > 0 ? (
                routes.map((r: any) => {
                  const visitedStops = r.stops?.filter((s: any) => s.status === 'VISITED').length || 0;
                  const totalStops = r.stops?.length || 0;
                  const progressPct = totalStops > 0 ? Math.round((visitedStops / totalStops) * 100) : 0;
                  return (
                    <tr key={r.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <Link href={`/routes/${r.id}`} className="font-bold text-primary hover:text-accent">
                          {r.name}
                        </Link>
                        <div className="text-[11px] text-text-muted font-mono">{r.id.slice(0, 8)}...</div>
                      </td>
                      <td className="p-4 text-xs font-mono">
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-4">
                        {r.agent?.name ? (
                          <span className="font-medium text-primary">{r.agent.name}</span>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{visitedStops} / {totalStops}</span>
                          <div className="w-20 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-accent h-full rounded-full" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide ${
                          r.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/routes/${r.id}`} className="text-accent text-xs font-bold hover:underline">
                          View Details &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    No delivery routes created yet. Click <strong>+ Create Route</strong> to schedule today&apos;s field itinerary.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fleet Management Section */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
          <h3 className="font-serif font-bold text-lg">Fleet Management</h3>
          <span className="bg-primary-darker text-white text-xs px-2.5 py-1 rounded font-bold">
            {loading ? '...' : `${agents.length} Agents`}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-text-muted text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 border-b border-border">Agent</th>
                <th className="p-4 border-b border-border">Vehicle</th>
                <th className="p-4 border-b border-border">Status</th>
                <th className="p-4 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-text-muted">Loading fleet agents...</td>
                </tr>
              ) : agents.length > 0 ? (
                agents.map((agent: any) => (
                  <tr key={agent.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-primary">{agent.user?.name || agent.name || 'Agent'}</div>
                      <div className="text-xs text-text-muted font-mono">{agent.id.slice(0, 8)}...</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-primary-darker text-xs font-bold px-2 py-1 rounded border border-gray-200">
                        {agent.vehiclePlate || 'MB-04'} {agent.vehicleType ? `(${agent.vehicleType})` : ''}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-sm uppercase ${agent.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-700'}`}>
                        {agent.status || 'READY'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href="/routes/create" className="text-accent font-bold text-xs hover:underline">
                        Assign Route
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-muted">
                    No agents registered yet. Use <strong>Staff</strong> tab to add drivers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
