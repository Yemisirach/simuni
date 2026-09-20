export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Orders</h1>
          <p className="text-text-muted mt-1">Manage inbound telegram orders and history</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm p-8 text-center">
        <h3 className="font-bold text-lg text-text-muted">No orders yet</h3>
        <p className="text-sm mt-2">When telegram or manual orders are placed, they will appear here.</p>
      </div>
    </div>
  );
}
