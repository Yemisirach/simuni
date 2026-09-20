import { fetchApi } from '@/lib/api';

export default async function CustomersPage() {
  let customers: any[] = [];
  try {
    customers = await fetchApi('/customers');
  } catch (err) {
    console.error('Failed to fetch customers', err);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Customers</h1>
          <p className="text-text-muted mt-1">Manage delivery stops and clients</p>
        </div>
        <button className="bg-accent text-primary-darker text-sm font-bold px-4 py-2 rounded-lg">
          + Add Customer
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden p-4">
        {customers.length === 0 ? (
          <p className="text-text-muted text-center py-8">No customers found. Create one first.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th>Phone</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b">
                  <td className="py-3 font-bold text-primary">{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
