import { KPICard } from '@/components/dashboard/KPICard';
import { routesService } from '@/lib/services/routes.service';
import Link from 'next/link';
import MapWrapper from '@/components/dashboard/MapWrapper';

export default async function DashboardPage() {
  // Fetch active routes from backend (graceful fallback if backend is down)
  let activeRoutesCount = 0;
  let routes = [];
  try {
    routes = await routesService.getRoutes();
    activeRoutesCount = routes.filter(r => r.status === 'IN_PROGRESS' || r.status === 'PENDING').length;
  } catch (error) {
    console.error("Failed to fetch routes:", error);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-1">
            LIVE TELEMETRY · FLEET STREAM · Addis Ababa Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary">
            Manager Command & Dispatch Hub
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <span className="bg-success/10 text-success px-2 md:px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold border border-success/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            WebSocket Live
          </span>
          <span className="bg-success/10 text-success px-2 md:px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold border border-success/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            PgPool Idle
          </span>
          <button className="bg-white border border-border text-[10px] md:text-xs font-bold px-2 md:px-3 py-1.5 rounded-md hover:bg-gray-50 shadow-sm transition-colors">
            Force Resync
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="TODAY'S FIELD INFLOW"
          value="412,850"
          unit="ETB"
          trend="+22.4% vs Yesterday"
          trendUp={true}
          subItems={[
            { label: 'telebirr Verified', value: '280,000 ETB' },
            { label: 'Cash / CDE', value: '132,850 ETB' }
          ]}
        />
        <KPICard
          title="ACTIVE FIELD AGENTS"
          value="24"
          unit="/ 32"
          trend="8 Agents Offline/Buffer"
          trendUp={false}
          subItems={[
            { label: 'Live GPS Tracking', value: '16' },
            { label: 'Offline Buffered', value: '8' }
          ]}
        />
        <KPICard
          title="DELIVERED DROPS / STOPS"
          value="142"
          unit="/ 310"
          trend="96% SLA Adherence"
          trendUp={true}
          subItems={[
            { label: 'Addis Core Sectors', value: '89 Drops' },
            { label: 'Regional Outskirts', value: '53 Drops' }
          ]}
        />
        <KPICard
          title="TELEGRAM INBOUND ORDERS"
          value="18"
          unit="Orders"
          trend="4 Pending Assignment"
          trendUp={false}
          subItems={[
            { label: 'Claimed & Dispatched', value: '14' },
            { label: 'Pending / Queued', value: '4' }
          ]}
        />
      </div>

      {/* Main Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Panel */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl shadow-sm flex flex-col h-[400px] md:h-[500px] overflow-hidden">
          <div className="p-3 md:p-4 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-gray-50">
            <h3 className="font-serif font-bold text-lg">Live Regional Dispatch Map</h3>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {['All Sectors', 'Mercato', 'Bole', 'Piassa'].map((tab, i) => (
                <button key={tab} className={`px-2.5 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border transition-colors ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border hover:bg-gray-100'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-[#e5e3df] relative flex items-center justify-center z-0">
            <MapWrapper />
          </div>
        </div>

        {/* Active Route Manifests */}
        <div className="bg-surface border border-border rounded-xl shadow-sm flex flex-col h-[400px] md:h-[500px]">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-serif font-bold text-lg">Active Route Manifests</h3>
            <span className="bg-gray-100 text-xs font-bold px-2 py-1 rounded">{activeRoutesCount} Active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {routes.length > 0 ? (
              routes.map((route: any) => (
                <div key={route.id} className="border border-border rounded-lg p-4 hover:border-accent hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-text-muted">{route.id}</span>
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                      {route.status}
                    </span>
                  </div>
                  <h4 className="font-bold mb-1 group-hover:text-accent transition-colors">{route.name}</h4>
                  <p className="text-sm text-text-muted mb-3">Agent ID: {route.agentId || 'Unassigned'}</p>
                  
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs font-bold">
                      <span>0 / {route.stops?.length || 0} Stops</span>
                      <span>0%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full w-0" />
                    </div>
                  </div>
                  
                  <Link href={`/routes/${route.id}`} className="text-xs font-bold text-accent hover:underline">
                    View Turn-by-Turn →
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-text-muted mb-3">No active routes from backend.</p>
                <button className="text-xs font-bold bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200">
                  Load Mock Data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
