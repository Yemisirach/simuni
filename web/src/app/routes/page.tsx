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

  // Edit Route Modal State
  const [editingRoute, setEditingRoute] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    date: '',
    agentId: '',
    status: 'PLANNED',
  });

  // Delete Route Confirmation State
  const [routeToDelete, setRouteToDelete] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const openEditModal = (r: any) => {
    setEditingRoute(r);
    setEditForm({
      name: r.name || '',
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      agentId: r.agentId || '',
      status: r.status || 'PLANNED',
    });
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute || !editForm.name.trim()) return alert('Route name is required');
    setActionLoading(true);
    try {
      await routesService.updateRoute(editingRoute.id, {
        name: editForm.name.trim(),
        date: new Date(editForm.date).toISOString(),
        agentId: editForm.agentId || null,
        status: editForm.status,
      });
      setEditingRoute(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update route');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRoute = async () => {
    if (!routeToDelete) return;
    setActionLoading(true);
    try {
      await routesService.deleteRoute(routeToDelete.id);
      setRouteToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete route');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickStatusChange = async (routeId: string, action: 'start' | 'complete') => {
    setActionLoading(true);
    try {
      if (action === 'start') {
        await routesService.startRoute(routeId);
      } else {
        await routesService.completeRoute(routeId);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} route`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">
            Field Routes & Fleet Operations
          </h1>
          <p className="text-text-muted mt-1">Manage active itineraries, agent dispatches, and delivery manifests</p>
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
                <th className="p-4 border-b border-border text-right">Actions</th>
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
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="font-medium text-primary">{r.agent.name}</span>
                          </div>
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
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                          r.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : r.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'PLANNED' && (
                            <button
                              onClick={() => handleQuickStatusChange(r.id, 'start')}
                              disabled={actionLoading}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                              title="Start Route"
                            >
                              ▶ Start
                            </button>
                          )}
                          {r.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleQuickStatusChange(r.id, 'complete')}
                              disabled={actionLoading}
                              className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                              title="Mark Complete"
                            >
                              ✓ Done
                            </button>
                          )}
                          <Link
                            href={`/routes/${r.id}`}
                            className="px-2.5 py-1 text-xs font-bold text-primary bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            title="Inspect details"
                          >
                            Stops &rarr;
                          </Link>
                          <button
                            onClick={() => openEditModal(r)}
                            className="px-2 py-1 text-xs font-bold text-primary hover:text-accent bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            title="Edit Route"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => setRouteToDelete(r)}
                            className="px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                            title="Delete Route"
                          >
                            🗑
                          </button>
                        </div>
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
                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${agent.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-700'}`}>
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

      {/* Edit Route Modal */}
      {editingRoute && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif font-bold text-xl text-primary">Edit Route Manifest</h3>
              <button onClick={() => setEditingRoute(null)} className="text-gray-400 hover:text-gray-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateRoute} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Route Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yeka Abado Morning Run"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Dispatch Date *</label>
                <input
                  type="date"
                  required
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Assigned Field Agent</label>
                <select
                  value={editForm.agentId}
                  onChange={(e) => setEditForm({ ...editForm, agentId: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent bg-surface"
                >
                  <option value="">-- Unassigned --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.user?.name || ag.name || 'Agent'} ({ag.vehiclePlate || 'Vehicle'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full border border-border rounded-lg p-2.5 text-sm outline-none focus:border-accent bg-surface font-semibold"
                >
                  <option value="PLANNED">PLANNED (Upcoming)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (On Road)</option>
                  <option value="COMPLETED">COMPLETED (Finished)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-accent text-primary-darker font-bold px-5 py-2 rounded-lg text-sm hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Update Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Route Confirmation Modal */}
      {routeToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border">
            <div className="text-center">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                🗑
              </div>
              <h3 className="font-serif font-bold text-lg text-primary mb-1">Delete Route</h3>
              <p className="text-text-muted text-xs mb-4">
                Are you sure you want to delete <strong className="text-primary">{routeToDelete.name}</strong>? All {routeToDelete.stops?.length || 0} stop associations on this manifest will be removed.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRouteToDelete(null)}
                className="flex-1 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteRoute}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Route'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
