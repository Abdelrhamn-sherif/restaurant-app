'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CustomerMenu({ params }: { params: { tableId: string } }) {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session');
  
  const { data: menuItems } = useSWR('/api/menu', fetcher);
  const [cart, setCart] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<'ordering' | 'placed' | 'paid'>('ordering');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const addToCart = (item: any) => {
    if (item.isSoldOut) return;
    setCart((prev) => [...prev, { ...item, quantity: 1 }]);
    toast.success(`${item.name} added to cart`);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return toast.error('Your cart is empty');

    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ tableId: params.tableId, items: cart, sessionToken }),
    });
    
    if (res.ok) {
      const newOrder = await res.json();
      setCurrentOrderId(newOrder.id);
      setOrderStatus('placed');
      toast.success('Order placed successfully!');
    } else {
      toast.error('Invalid table session. Please ask the restaurant to seat you again.');
    }
  };

  const payOrder = async () => {
    if (!currentOrderId) return;

    const res = await fetch('/api/pay', {
      method: 'POST',
      body: JSON.stringify({ 
        orderId: currentOrderId, 
        tableId: params.tableId, 
        sessionToken 
      }),
    });

    if (res.ok) {
      setOrderStatus('paid');
      toast.success('Payment successful!');
    } else {
      toast.error('Payment failed or session expired.');
    }
  };

  // Calculate cart total dynamically
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!menuItems) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-500 font-medium">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen pb-24">
      <Toaster position="top-center" />
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">Table {params.tableId} Menu</h1>
        <p className="text-sm text-gray-500">Select your items to order</p>
      </div>

      {/* --- ORDERING PHASE --- */}
      {orderStatus === 'ordering' && (
        <div className="space-y-4">
          {menuItems.map((item: any) => (
            <div 
              key={item.id} 
              className={`p-4 bg-white rounded-xl shadow-sm flex justify-between items-center transition-all ${
                item.isSoldOut ? 'opacity-50 grayscale pointer-events-none' : 'hover:shadow-md'
              }`}
            >
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {item.name}
                  {item.isSoldOut && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                      Sold Out
                    </span>
                  )}
                </h3>
                <p className="text-gray-500 text-sm">{item.category}</p>
                <p className="font-medium mt-1 text-gray-900">${item.price.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => addToCart(item)}
                disabled={item.isSoldOut}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  item.isSoldOut 
                    ? 'bg-gray-100 text-gray-400' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                }`}
              >
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
              <button 
                onClick={placeOrder}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors"
              >
                Place Order
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- IN PROGRESS PHASE --- */}
      {orderStatus === 'placed' && (
        <div className="text-center mt-20 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            🍳
          </div>
          <h2 className="text-2xl font-bold mb-2">Order In Progress</h2>
          <p className="mb-8 text-gray-600">Your food is being prepared. When you are finished dining, click below to settle your bill.</p>
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-6 font-bold text-xl">
              <span>Total Due:</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={payOrder} 
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition-colors"
            >
              Pay Now (Dummy)
            </button>
          </div>
        </div>
      )}
      
      {/* --- PAID PHASE --- */}
      {orderStatus === 'paid' && (
        <div className="text-center mt-20 p-6 bg-white rounded-2xl shadow-sm border border-green-100">
           <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Complete</h2>
          <p className="text-gray-600">Thank you for dining with us! Have a great day.</p>
        </div>
      )}
    </div>
  );
}