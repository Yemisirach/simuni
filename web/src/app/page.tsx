'use client';

import { KPICard } from '@/components/dashboard/KPICard';
import { routesService } from '@/lib/services/routes.service';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import MapWrapper from '@/components/dashboard/MapWrapper';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeRoutesCount, setActiveRoutesCount] = useState(0);

  useEffect(() => {
    Promise.all([
      routesService.getRoutes(),
      fetchApi<any[]>('/orders')
    ]).then(([routesData, ordersData]) => {
      setRoutes(routesData);
      setActiveRoutesCount(routesData.filter((r: any) => r.status === 'IN_PROGRESS' || r.status === 'PLANNED').length);
      setOrders(ordersData);
    }).catch(console.error);
  }, []);

  const totalInflow = orders.reduce((sum, o) => {
    return sum + (o.items?.reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0) || 0);
  }, 0);
  
  const telegramOrders = orders.filter(o => o.source === 'TELEGRAM').length;
  const pendingOrders = orders.filter(o => o.status === 'DRAFT' || o.status === 'SUBMITTED').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-text-muted uppercase mb-1">
            LIVE TELEMETRY • FLEET STREAM • Addis Ababa Hub
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
          value={totalInflow.toLocaleString()}
          unit="ETB"
          trend="Calculated from all orders"
          trendUp={true}
          subItems={[
            { label: 'Total Orders', value: orders.length.toString() }
          ]}
        />
        <KPICard
          title="ACTIVE FIELD AGENTS"
          value={activeRoutesCount.toString()}
          unit="Agents"
          trend="Assigned to routes"
          trendUp={true}
          subItems={[
            { label: 'Active Routes', value: activeRoutesCount.toString() }
          ]}
        />
        <KPICard
          title="DELIVERED DROPS / STOPS"
          value="0"
          unit="/ 0"
          trend="0% SLA Adherence"
          trendUp={true}
          subItems={[
            { label: 'Addis Core Sectors', value: '0 Drops' },
            { label: 'Regional Outskirts', value: '0 Drops' }
          ]}
        />
        <KPICard
          title="TELEGRAM INBOUND ORDERS"
          value={telegramOrders.toString()}
          unit="Orders"
          trend={`${pendingOrders} Pending Assignment`}
          trendUp={pendingOrders > 0 ? false : true}
          subItems={[
            { label: 'Total Telegram', value: telegramOrders.toString() },
            { label: 'Pending / Queued', value: pendingOrders.toString() }
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
                    View Turn-by-Turn &rarr;
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
