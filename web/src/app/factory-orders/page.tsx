'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function FactoryOrdersPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [buyPrice, setBuyPrice] = useState(0);
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [prods, hist, bal] = await Promise.all([
        fetchApi('/products'),
        fetchApi('/factory-orders'),
        fetchApi('/factory-orders/balance')
      ]);
      setProducts(prods as any[]);
      setHistory(hist as any[]);
      setBalance((bal as any).balance);
      if ((prods as any).length > 0) {
        const firstProd = (prods as any)[0];
        setSelectedProductId(firstProd.id);
        setBuyPrice(firstProd.factoryPrice ? Number(firstProd.factoryPrice) : 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setBuyPrice(prod.factoryPrice ? Number(prod.factoryPrice) : 0);
    }
  };

  const addToCart = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    
    setCart([...cart, { 
      productId: product.id, 
      name: product.name,
      quantity: Number(quantity), 
      buyPrice: Number(buyPrice) 
    }]);
    
    setQuantity(1);
    setBuyPrice(0);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleTopUp = async () => {
    if (!topUpAmount) return;
    try {
      await fetchApi('/factory-orders/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(topUpAmount) })
      });
      setTopUpAmount('');
      loadData();
    } catch(e) {
      alert('Failed to top up');
    }
  };

  const totalBudget = cart.reduce((sum, item) => sum + (item.quantity * item.buyPrice), 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      await fetchApi('/factory-orders', {
        method: 'POST',
        body: JSON.stringify({ items: cart })
      });
      setCart([]);
      loadData(); // Refresh history
    } catch (e) {
      console.error(e);
      alert('Failed to save factory order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-surface border border-border p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">Factory Restock & Budget</h1>
          <p className="text-text-muted mt-1">Calculate capital needed and log factory purchase orders</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-text-muted font-bold mb-1">Available Ledger Balance</div>
          <div className="text-3xl font-mono text-primary font-bold">{Number(balance).toLocaleString()} ETB</div>
          <div className="mt-2 flex gap-2">
            <input 
              type="number" 
              placeholder="Amount..." 
              value={topUpAmount}
              onChange={e => setTopUpAmount(e.target.value)}
              className="bg-bg border border-border px-3 py-1 rounded-lg text-sm w-32"
            />
            <button onClick={handleTopUp} className="bg-accent text-primary-darker px-3 py-1 rounded-lg font-bold text-sm">
              Top Up
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ADD ITEMS FORM */}
        <div className="bg-surface border border-border rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg mb-4 text-primary border-b border-border pb-2">Add Product to Order</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-text-muted mb-1">Product</label>
              <select 
                className="w-full bg-bg border border-border rounded-lg px-4 py-2"
                value={selectedProductId}
                onChange={e => handleProductSelect(e.target.value)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Selling: {p.price} ETB)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-text-muted mb-1">Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full bg-bg border border-border rounded-lg px-4 py-2"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-muted mb-1">Buy Price (ETB)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="w-full bg-bg border border-border rounded-lg px-4 py-2"
                  value={buyPrice}
                  onChange={e => setBuyPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <button 
              onClick={addToCart}
              className="w-full bg-surface border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold py-2 rounded-lg transition-colors"
            >
              Add to Calculation
            </button>
          </div>
        </div>

        {/* CART & CALCULATION */}
        <div className="bg-surface border border-border rounded-xl shadow-sm p-6 flex flex-col">
          <h2 className="font-bold text-lg mb-4 text-primary border-b border-border pb-2">Current Order Calculation</h2>
          
          <div className="flex-1 overflow-y-auto min-h-[200px] mb-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-text-muted text-center italic mt-10">No products added yet.</div>
            ) : (
              cart.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-bg rounded-lg border border-border">
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-sm text-text-muted">{item.quantity} x {item.buyPrice} ETB</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold">{(item.quantity * item.buyPrice).toLocaleString()} ETB</span>
                    <button onClick={() => removeFromCart(i)} className="text-red-500 hover:text-red-700">✕</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold">Total Budget Needed:</span>
              <span className="text-2xl font-mono text-primary-darker font-bold">
                {totalBudget.toLocaleString()} ETB
              </span>
            </div>
            
            <button 
              onClick={submitOrder}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full bg-accent text-primary-darker hover:bg-accent-light disabled:opacity-50 font-bold py-3 rounded-lg transition-colors text-lg"
            >
              {isSubmitting ? 'Saving...' : 'Confirm Factory Order'}
            </button>
          </div>
        </div>
      </div>

      {/* HISTORY TABLE */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold text-primary">Past Factory Orders</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-text-muted">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No past factory orders found.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-bg border-b border-border">
              <tr>
                <th className="px-6 py-3 text-text-muted font-bold">Date</th>
                <th className="px-6 py-3 text-text-muted font-bold">Status</th>
                <th className="px-6 py-3 text-text-muted font-bold">Items</th>
                <th className="px-6 py-3 text-text-muted font-bold text-right">Total Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map(order => (
                <tr key={order.id} className="hover:bg-bg/50">
                  <td className="px-6 py-4">{new Date(order.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="list-disc pl-4 text-xs text-text-muted space-y-1">
                      {order.items.map((i: any) => (
                        <li key={i.id}>{i.quantity}x {i.product?.name}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold">
                    {Number(order.totalBudget).toLocaleString()} ETB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
