import { routesService } from '@/lib/services/routes.service';
import { agentsService } from '@/lib/services/agents.service';
import Link from 'next/link';

export default async function RoutesAgentsPage() {
  let routes = [];
  let agents = [];
  
  try {
    const [fetchedRoutes, fetchedAgents] = await Promise.all([
      routesService.getRoutes(),
      agentsService.getAgents()
    ]);
    routes = fetchedRoutes;
    agents = fetchedAgents;
  } catch (err) {
    console.error("API error:", err);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">
            Field Routes & Agents
          </h1>
          <p className="text-text-muted mt-1">Manage active dispatches and fleet operations</p>
        </div>
        <Link href="/routes/create" className="bg-accent text-primary-darker text-sm font-bold px-4 py-2 rounded-lg hover:bg-accent-light transition-colors">
          + Create Route
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
          <h3 className="font-serif font-bold text-lg">Fleet Management</h3>
          <span className="bg-primary-darker text-white text-xs px-2 py-1 rounded">{agents.length} Agents</span>
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
              {agents.length > 0 ? agents.map((agent: any) => (
                <tr key={agent.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-primary">{agent.user?.name || 'Unknown User'}</div>
                    <div className="text-xs text-text-muted font-mono">{agent.id}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-gray-200 text-primary-darker text-xs font-bold px-2 py-1 rounded">
                      {agent.vehiclePlate} ({agent.vehicleType})
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-sm uppercase ${agent.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-gray-200 text-text-muted'}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-accent font-bold text-xs hover:underline">
                      Assign Route
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-muted">
                    No agents registered.
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
