import { fetchApi } from '@/lib/api';

export default async function CatalogPage() {
  let products: any[] = [];
  try {
    products = await fetchApi('/products');
  } catch (err) {
    console.error('Failed to fetch products', err);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Product Catalog</h1>
          <p className="text-text-muted mt-1">Manage SKUs and pricing</p>
        </div>
        <button className="bg-accent text-primary-darker text-sm font-bold px-4 py-2 rounded-lg">
          + Add Product
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden p-4">
        {products.length === 0 ? (
          <p className="text-text-muted text-center py-8">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} className="border p-4 rounded-lg">
                <div className="text-xs font-bold text-text-muted">{p.sku}</div>
                <div className="font-bold text-lg mt-1">{p.name}</div>
                <div className="text-accent font-mono font-bold mt-2">{p.price} ETB</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
