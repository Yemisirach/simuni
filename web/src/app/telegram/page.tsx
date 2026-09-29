'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function TelegramOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [telegramLink, setTelegramLink] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [unclaimed, linkData] = await Promise.all([
          fetchApi('/orders/unclaimed'),
          fetchApi('/workspace/telegram-link')
        ]);
        setOrders(unclaimed as any[]);
        if ((linkData as any).enabled) {
          setTelegramLink((linkData as any).url);
        }
      } catch (e) {
        console.error('Failed to load telegram orders', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Telegram Inbound</h1>
          <p className="text-text-muted mt-1">Live feed of unassigned orders placed via the Telegram Bot</p>
        </div>
        
        {telegramLink && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-muted">Bot Link:</span>
            <div className="bg-surface border border-border px-4 py-2 rounded-lg flex items-center gap-2">
              <code className="text-sm text-primary-darker font-mono">{telegramLink}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(telegramLink)}
                className="text-accent hover:text-primary-darker font-bold text-sm ml-2"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm p-1">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="font-bold text-primary flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
            Unclaimed Orders ({orders.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-muted">Loading inbound orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-bg flex items-center justify-center mb-4 border border-border">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="font-bold text-primary mb-1">No Unclaimed Orders</h3>
            <p className="text-text-muted text-sm">When customers place orders via the Telegram bot, they will appear here until assigned to a route.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((order) => (
              <div key={order.id} className="p-6 hover:bg-bg transition-colors flex flex-col md:flex-row gap-6">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm bg-bg border border-border px-2 py-0.5 rounded text-primary">
                      {order.id.split('-')[0].toUpperCase()}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {order.source}
                    </span>
                    <span className="text-text-muted text-sm">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-primary text-lg">{order.customer?.name}</h3>
                  <div className="text-sm text-text-muted mt-1 flex items-center gap-4">
                    <span>📱 {order.customer?.phone}</span>
                    <span>📍 Zone: {order.customer?.zoneId || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="flex-1 bg-surface border border-border rounded-lg p-4">
                  <div className="text-sm font-bold text-primary mb-3">Order Items</div>
                  <div className="space-y-2">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-text">
                          <span className="font-mono text-text-muted mr-2">{item.quantity}x</span>
                          {item.product?.name}
                        </span>
                        <span className="font-mono text-primary-darker">
                          {(item.quantity * item.price).toLocaleString()} ETB
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex justify-between font-bold">
                    <span>Total</span>
                    <span className="font-mono text-primary-darker text-lg">{order.totalAmount.toLocaleString()} ETB</span>
                  </div>
                </div>

                <div className="flex flex-col justify-center items-end gap-2 md:w-48">
                  <button className="w-full bg-primary-darker hover:bg-black text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm">
                    Assign to Route
                  </button>
                  <button className="w-full bg-surface border border-border hover:bg-bg text-text px-4 py-2.5 rounded-lg font-bold text-sm transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
