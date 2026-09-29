'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { format } from 'date-fns';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/orders')
      .then((data: any) => setOrders(data))
      .catch((err) => console.error('Failed to fetch orders', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Orders</h1>
          <p className="text-text-muted mt-1">Manage inbound telegram orders and history</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden p-4">
        {loading ? (
          <div className="text-center py-8 text-text-muted">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="font-bold text-lg text-text-muted">No orders yet</h3>
            <p className="text-sm mt-2">When telegram or manual orders are placed, they will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-sm text-text-muted">
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-sm">{o.id.substring(0, 8)}...</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${o.source === 'TELEGRAM' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {o.source}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-bold uppercase">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {o.items?.length || 0} items
                    </td>
                    <td className="p-3 text-sm text-text-muted">
                      {o.createdAt ? format(new Date(o.createdAt), 'MMM d, HH:mm') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
