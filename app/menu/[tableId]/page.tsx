'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; // <-- Import useParams
import toast, { Toaster } from 'react-hot-toast';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Remove `params` from the function arguments entirely
export default function CustomerMenu() {
  // Extract tableId safely on the client side
  const params = useParams();
  const tableId = params.tableId as string;
  
  // Use SWR conditionally so it doesn't fetch until tableId is ready
  const { data: table, mutate: mutateTable } = useSWR(
    tableId ? `/api/tables?id=${tableId}` : null, 
    fetcher, 
    { refreshInterval: 3000 }
  );
  const { data: menuItems } = useSWR('/api/menu', fetcher);
  
  const [localSessionToken, setLocalSessionToken] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<'ordering' | 'placed' | 'paid'>('ordering');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!tableId) return;
    const savedToken = localStorage.getItem(`session_${tableId}`);
    if (savedToken) setLocalSessionToken(savedToken);
  }, [tableId]);

  const handleCheckIn = async () => {
    const res = await fetch('/api/tables', {
      method: 'PUT',
      body: JSON.stringify({ tableId, action: 'checkin' })
    });
    
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(`session_${tableId}`, data.sessionToken);
      setLocalSessionToken(data.sessionToken);
      mutateTable(); 
      toast.success('You are checked in!');
    } else {
      toast.error('Table is already occupied!');
    }
  };

  const addToCart = (item: any) => {
    if (item.isSoldOut) return;
    setCart((prev) => [...prev, { ...item, quantity: 1 }]);
    toast.success(`${item.name} added to cart`);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return toast.error('Cart empty');
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ tableId, items: cart, sessionToken: localSessionToken }),
    });
    
    if (res.ok) {
      const newOrder = await res.json();
      setCurrentOrderId(newOrder.id);
      setOrderStatus('placed');
      toast.success('Order placed successfully!');
    } else {
      toast.error('Session expired. Please ask staff for help.');
    }
  };

  const payOrder = async () => {
    if (!currentOrderId) return;
    const res = await fetch('/api/pay', {
      method: 'POST',
      body: JSON.stringify({ orderId: currentOrderId, tableId, sessionToken: localSessionToken }),
    });

    if (res.ok) {
      setOrderStatus('paid');
      toast.success('Payment successful!');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!table || !menuItems) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  // VIEW 1: Table is empty, customer needs to check in
  if (!table.sessionToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Toaster />
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <h1 className="text-3xl font-bold mb-2">{table.name}</h1>
          <p className="text-gray-500 mb-8">Capacity: {table.seats} Seats</p>
          <button onClick={handleCheckIn} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700">
            Check In & View Menu
          </button>
        </div>
      </div>
    );
  }

  // VIEW 2: Table is occupied by someone else
  if (table.sessionToken !== localSessionToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border-t-4 border-red-500">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Table Occupied</h1>
          <p className="text-gray-600">This table is currently in use by another party.</p>
        </div>
      </div>
    );
  }

  // VIEW 3: Customer is checked in (The Menu)
  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen pb-24">
      <Toaster position="top-center" />
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">{table.name} Menu</h1>
        <p className="text-sm text-green-600 font-bold uppercase tracking-wider">✓ Checked In</p>
      </div>

      {orderStatus === 'ordering' && (
        <div className="space-y-4">
          {menuItems.map((item: any) => (
            <div key={item.id} className={`p-4 bg-white rounded-xl shadow-sm flex justify-between items-center ${item.isSoldOut ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {item.name}
                  {item.isSoldOut && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Sold Out</span>}
                </h3>
                <p className="text-gray-500 text-sm">{item.category}</p>
                <p className="font-medium mt-1">${item.price.toFixed(2)}</p>
              </div>
              <button onClick={() => addToCart(item)} disabled={item.isSoldOut} className={`px-4 py-2 rounded-lg font-medium ${item.isSoldOut ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white'}`}>
                Add
              </button>
            </div>
          ))}

          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col max-w-md mx-auto">
              <div className="flex justify-between items-center mb-3 font-semibold">
                <span>Total ({cart.length} items)</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={placeOrder} className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg">Place Order</button>
            </div>
          )}
        </div>
      )}

      {orderStatus === 'placed' && (
        <div className="text-center mt-20 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold mb-2">Order In Progress</h2>
          <p className="mb-8 text-gray-600">Your food is being prepared.</p>
          <div className="border-t pt-6">
            <button onClick={payOrder} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg">Pay Now: ${cartTotal.toFixed(2)}</button>
          </div>
        </div>
      )}

      {orderStatus === 'paid' && (
        <div className="text-center mt-20 p-6 bg-white rounded-2xl shadow-sm border border-green-100">
          <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Complete</h2>
          <p className="text-gray-600">Thank you! You may close this page.</p>
        </div>
      )}
    </div>
  );
}