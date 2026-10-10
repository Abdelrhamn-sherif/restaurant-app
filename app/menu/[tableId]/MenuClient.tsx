'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import useSWR from 'swr';
import { Plus, ShoppingBag, Utensils, CheckCircle2, AlertCircle, ChefHat, CreditCard } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MenuClient() {
  const params = useParams();
  const tableId = params?.tableId as string;

  const { data: table, mutate: mutateTable } = useSWR(tableId ? `/api/tables?id=${tableId}` : null, fetcher, { refreshInterval: 3000 });
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
    const res = await fetch('/api/tables', { method: 'PUT', body: JSON.stringify({ tableId, action: 'checkin' }) });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(`session_${tableId}`, data.sessionToken);
      setLocalSessionToken(data.sessionToken);
      mutateTable(); 
      toast.success('Welcome! You are checked in.');
    } else {
      toast.error('Table is already occupied!');
    }
  };

  const addToCart = (item: any) => {
    if (item.isSoldOut) return;
    setCart((prev) => [...prev, { ...item, quantity: 1 }]);
    toast.success(`${item.name} added`);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return toast.error('Your cart is empty');
    const res = await fetch('/api/orders', { method: 'POST', body: JSON.stringify({ tableId, items: cart, sessionToken: localSessionToken }) });
    if (res.ok) {
      const newOrder = await res.json();
      setCurrentOrderId(newOrder.id);
      setOrderStatus('placed');
      toast.success('Order sent to the kitchen!');
    } else {
      toast.error('Session expired. Please ask staff for help.');
    }
  };

  const payOrder = async () => {
    if (!currentOrderId) return;
    const res = await fetch('/api/pay', { method: 'POST', body: JSON.stringify({ orderId: currentOrderId, tableId, sessionToken: localSessionToken }) });
    if (res.ok) {
      setOrderStatus('paid');
      toast.success('Payment successful!');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!table || !menuItems) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Utensils className="w-8 h-8 text-slate-300 mb-4 animate-bounce" />
          <p className="text-slate-400 font-medium">Loading Menu...</p>
        </div>
      </div>
    );
  }

  // VIEW 1: Check In
  if (!table.sessionToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
        <Toaster />
        <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center max-w-sm w-full border border-slate-100">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Utensils className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2">{table.name}</h1>
          <p className="text-slate-500 mb-8 font-medium">Table for up to {table.seats}</p>
          <button 
            onClick={handleCheckIn} 
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/30 touch-manipulation [Webkit-tap-highlight-color:transparent]"
          >
            Check In & Order
          </button>
        </div>
      </div>
    );
  }

  // VIEW 2: Occupied
  if (table.sessionToken !== localSessionToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm text-center max-w-sm w-full border-t-4 border-red-500">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-900">Table in Use</h1>
          <p className="text-slate-500">This table is currently occupied by another party.</p>
        </div>
      </div>
    );
  }

  // VIEW 3: The Menu
  return (
    <div className="bg-slate-50 min-h-screen pb-32 text-slate-900 font-sans selection:bg-orange-100 selection:text-orange-900">
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '1rem', background: '#334155', color: '#fff' } }} />
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{table.name}</h1>
          <p className="text-xs font-bold text-green-600 uppercase tracking-widest flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> Checked In
          </p>
        </div>
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
          <Utensils className="w-5 h-5 text-slate-600" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {orderStatus === 'ordering' && (
          <div className="space-y-4 mt-2">
            {menuItems.map((item: any) => (
              <div 
                key={item.id} 
                className={`p-4 bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-100 flex justify-between items-center transition-all ${item.isSoldOut ? 'opacity-60 grayscale pointer-events-none' : 'hover:shadow-md'}`}
              >
                <div className="pr-4">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    {item.name}
                    {item.isSoldOut && <span className="text-[9px] bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold uppercase tracking-wider">Sold Out</span>}
                  </h3>
                  <p className="text-slate-500 text-sm mt-0.5 font-medium">{item.category}</p>
                  <p className="font-extrabold text-orange-600 mt-2">${item.price.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => addToCart(item)} 
                  disabled={item.isSoldOut} 
                  className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl transition-all active:scale-90 [Webkit-tap-highlight-color:transparent] ${item.isSoldOut ? 'bg-slate-100 text-slate-400' : 'bg-orange-50 text-orange-500 hover:bg-orange-100'}`}
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                </button>
              </div>
            ))}

            {/* Floating Glassmorphic Cart Bar */}
            {cart.length > 0 && (
              <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-3 pl-2">
                  <div className="relative">
                    <ShoppingBag className="w-6 h-6 text-orange-400" />
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                      {cart.length}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Total</span>
                    <span className="font-bold text-lg">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button 
                  onClick={placeOrder} 
                  className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/20 [Webkit-tap-highlight-color:transparent]"
                >
                  Place Order
                </button>
              </div>
            )}
          </div>
        )}

        {orderStatus === 'placed' && (
          <div className="mt-12 p-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>
            <ChefHat className="w-16 h-16 text-orange-500 mx-auto mb-6" />
            <h2 className="text-2xl font-extrabold mb-2 text-slate-900">Kitchen is preparing!</h2>
            <p className="mb-8 text-slate-500 font-medium">Sit tight, your delicious food will arrive shortly.</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-8 border border-slate-100">
              <span className="block text-sm text-slate-500 font-medium mb-1">Total Bill</span>
              <span className="text-3xl font-extrabold text-slate-900">${cartTotal.toFixed(2)}</span>
            </div>

            <button 
              onClick={payOrder} 
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all [Webkit-tap-highlight-color:transparent]"
            >
              <CreditCard className="w-5 h-5" /> Pay Now
            </button>
          </div>
        )}

        {orderStatus === 'paid' && (
          <div className="mt-12 p-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Thank You!</h2>
            <p className="text-slate-500 font-medium">Your payment is complete. We hope to see you again soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}