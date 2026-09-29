'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routesService } from '@/lib/services/routes.service';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;

  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const data = await routesService.getRouteDetails(routeId);
      setRoute(data);
    } catch (err) {
      console.error('Failed to load route:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeId) {
      loadData();
    }
  }, [routeId]);

  const handleStartRoute = async () => {
    setActionLoading(true);
    try {
      await fetchApi(`/routes/${routeId}/start`, { method: 'PATCH' });
      await loadData();
    } catch (err) {
      alert('Failed to start route');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRoute = async () => {
    setActionLoading(true);
    try {
      await fetchApi(`/routes/${routeId}/complete`, { method: 'PATCH' });
      await loadData();
    } catch (err) {
      alert('Failed to complete route');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted">
        Loading route manifest...
      </div>
    );
  }

  if (!route) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-danger font-bold">Route not found</p>
        <Link href="/routes" className="text-accent underline text-sm">
          &larr; Back to Routes
        </Link>
      </div>
    );
  }

  const visitedStops = route.stops?.filter((s: any) => s.status === 'VISITED').length || 0;
  const totalStops = route.stops?.length || 0;
  const progressPct = totalStops > 0 ? Math.round((visitedStops / totalStops) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/routes" className="text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1">
          &larr; Back to Field Routes
        </Link>
        <div className="flex items-center gap-2">
          {route.status === 'PLANNED' && (
            <button
              onClick={handleStartRoute}
              disabled={actionLoading}
              className="bg-accent text-primary-darker font-bold px-4 py-2 rounded-lg text-sm hover:bg-accent-light transition-colors disabled:opacity-50"
            >
              Start Route
            </button>
          )}
          {route.status === 'IN_PROGRESS' && (
            <button
              onClick={handleCompleteRoute}
              disabled={actionLoading}
              className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              Complete Route
            </button>
          )}
        </div>
      </div>

      {/* Route Card Header */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-text-muted font-bold">{route.id}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide ${
                route.status === 'IN_PROGRESS'
                  ? 'bg-amber-100 text-amber-800'
                  : route.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {route.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-serif text-primary">{route.name}</h1>
            <p className="text-sm text-text-muted mt-1">
              Assigned Agent: <strong className="text-primary">{route.agent?.name || 'Unassigned'}</strong>
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-text-muted uppercase font-bold">Planned Date</div>
            <div className="font-mono text-sm font-bold text-primary">
              {new Date(route.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span>Stops Visited: {visitedStops} / {totalStops}</span>
            <span>{progressPct}% Completed</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-accent h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Planned Waypoints Manifest */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
          <h3 className="font-serif font-bold text-lg">Waypoints & Stops Manifest</h3>
          <span className="text-xs font-bold text-text-muted">{totalStops} Stops</span>
        </div>

        <div className="divide-y divide-border">
          {route.stops && route.stops.length > 0 ? (
            route.stops.map((stop: any, idx: number) => {
              const cust = stop.customer;
              const isVisited = stop.status === 'VISITED';
              return (
                <div key={stop.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isVisited
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-200 text-primary-darker'
                    }`}>
                      {isVisited ? '✓' : idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-primary">{cust?.name || `Stop #${idx + 1}`}</div>
                      <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                        {cust?.category && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{cust.category}</span>}
                        {cust?.phone && <span>📞 {cust.phone}</span>}
                        {cust?.lat && cust?.lng && (
                          <a
                            href={`https://maps.google.com/?q=${cust.lat},${cust.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline flex items-center gap-1"
                          >
                            📍 {cust.lat.toFixed(4)}, {cust.lng.toFixed(4)}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide ${
                      isVisited ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {stop.status}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-text-muted text-sm">
              No stops added to this route.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
