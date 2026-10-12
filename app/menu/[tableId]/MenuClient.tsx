'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import useSWR from 'swr';
import PusherClient from 'pusher-js';
import { Plus, Minus, ShoppingBag, CheckCircle2, AlertCircle, ChefHat, CreditCard, Bell, Banknote, X, MessageSquare, Layers } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MenuClient() {
  const params = useParams();
  const tableId = params?.tableId as string;
  const [localSessionToken, setLocalSessionToken] = useState<string | null>(null);

  useEffect(() => {
    if (!tableId) return;
    const savedToken = localStorage.getItem(`session_${tableId}`);
    if (savedToken) setLocalSessionToken(savedToken);
  }, [tableId]);

  const { data: table, mutate: mutateTable } = useSWR(tableId ? `/api/tables?id=${tableId}` : null, fetcher);
  const { data: menuItems } = useSWR('/api/menu', fetcher);
  const { data: activeOrder, mutate: mutateActiveOrder } = useSWR(
    tableId && localSessionToken ? `/api/orders?tableId=${tableId}` : null, fetcher
  );

  useEffect(() => {
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY as string, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string });
    const channel = pusher.subscribe('restaurant');
    channel.bind('tables-updated', () => mutateTable());
    channel.bind('orders-updated', () => mutateActiveOrder());
    return () => pusher.unsubscribe('restaurant');
  }, [mutateTable, mutateActiveOrder]);

  const [cart, setCart] = useState<any[]>([]);
  const [isOrderingMore, setIsOrderingMore] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  
  // NEW: State for Item Customization Modal
  const [customizingItem, setCustomizingItem] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [itemNote, setItemNote] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);

  const orderStatus = activeOrder && !activeOrder.error ? activeOrder.status : 'ordering';
  const currentOrderId = activeOrder && !activeOrder.error ? activeOrder.id : null;

  const handleCheckIn = async () => {
    const res = await fetch('/api/tables', { method: 'PUT', body: JSON.stringify({ tableId, action: 'checkin' }) });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(`session_${tableId}`, data.sessionToken); setLocalSessionToken(data.sessionToken);
      mutateTable(); toast.success('Welcome!');
    } else toast.error('Table occupied!');
  };

  const callWaiter = async () => {
    toast.success('A waiter is on the way!');
    await fetch('/api/help', { method: 'POST', body: JSON.stringify({ tableId, tableName: table.name }) });
  };

  // OPEN MODAL INSTEAD OF DIRECT ADD
  const openCustomizer = (item: any) => {
    setCustomizingItem(item);
    setSelectedAddons([]);
    setItemNote('');
    setItemQuantity(1);
  };

  const toggleAddon = (addon: any) => {
    const exists = selectedAddons.find(a => a.name === addon.name);
    if (exists) setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
    else setSelectedAddons([...selectedAddons, addon]);
  };

  const confirmAddToCart = () => {
    // Generate a unique ID so if they order a Burger WITH cheese, and a Burger WITHOUT cheese, they stay separate in the cart!
    const cartItemId = crypto.randomUUID();
    
    setCart((prev) => [...prev, { 
      ...customizingItem, 
      cartItemId, 
      quantity: itemQuantity, 
      note: itemNote, 
      selectedAddons 
    }]);
    
    toast.success(`${customizingItem.name} added`);
    setCustomizingItem(null);
  };

  const removeFromCartByUniqueId = (cartItemId: string) => {
    setCart((prev) => prev.filter(i => i.cartItemId !== cartItemId));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return toast.error('Cart empty');
    const res = await fetch('/api/orders', { method: 'POST', body: JSON.stringify({ tableId, items: cart, sessionToken: localSessionToken }) });
    if (res.ok) {
      setCart([]); setIsOrderingMore(false); setIsCartModalOpen(false);
      mutateActiveOrder(); toast.success('Order sent!');
    }
  };

  const payOrder = async (method: 'cash' | 'card') => {
    if (!currentOrderId) return;
    const res = await fetch('/api/pay', { method: 'POST', body: JSON.stringify({ orderId: currentOrderId, tableId, sessionToken: localSessionToken, method }) });
    if (res.ok) { mutateActiveOrder(); toast.success('Payment requested!'); }
  };

  // CALCULATE TOTAL (Including Addons)
  const cartTotal = cart.reduce((sum, item) => {
    const itemBasePrice = Number(item.price || 0);
    const addonsPrice = item.selectedAddons?.reduce((a: number, b: any) => a + Number(b.price || 0), 0) || 0;
    return sum + ((itemBasePrice + addonsPrice) * item.quantity);
  }, 0);

  const showMenu = orderStatus === 'ordering' || isOrderingMore;

  // GROUP MENU BY CATEGORY
  const groupedMenu = menuItems?.reduce((acc: any, item: any) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (!table || !menuItems) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400 font-medium">Loading...</p></div>;
  if (!table.sessionToken) return ( <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"><button onClick={handleCheckIn} className="w-full max-w-sm bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform">Check In & Order</button></div> );
  if (table.sessionToken !== localSessionToken) return ( <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-red-500 font-bold flex items-center gap-2"><AlertCircle className="w-6 h-6"/> Table Occupied</p></div> );

  return (
    <div className="bg-slate-50 min-h-screen pb-32 text-slate-900 font-sans">
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '1rem', background: '#334155', color: '#fff' } }} />
      
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold">{table.name}</h1>
          <p className="text-xs font-bold text-green-600 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Checked In</p>
        </div>
        <button onClick={callWaiter} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-all">
          <Bell className="w-4 h-4" /> Help
        </button>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {showMenu && (
          <div className="mt-2 mb-24">
            
            {isOrderingMore && (
               <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl font-medium text-sm text-center mb-6 border border-blue-100">
                 Adding more food to your existing tab.
                 <button onClick={() => setIsOrderingMore(false)} className="block mx-auto mt-2 text-blue-600 font-bold underline active:scale-95 transition-transform">Cancel</button>
               </div>
            )}

            {/* RENDER GROUPED MENU */}
            {groupedMenu && Object.entries(groupedMenu).map(([category, items]: [string, any]) => (
              <div key={category} className="mb-10">
                <h2 className="text-2xl font-extrabold text-slate-800 mb-4 px-2 border-l-4 border-orange-500 rounded-sm">
                  {category}
                </h2>
                <div className="space-y-4">
                  {items.map((item: any) => (
                    <div key={item.id} className={`p-4 bg-white rounded-3xl shadow-sm border border-slate-100 flex gap-4 transition-all ${item.isSoldOut ? 'opacity-60 grayscale pointer-events-none' : ''}`}>
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-2xl bg-slate-100 border border-slate-200 flex-shrink-0" />
                      )}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-lg leading-tight">{item.name} {item.isSoldOut && <span className="text-[9px] bg-red-50 text-red-600 px-2 py-1 rounded-md uppercase">Sold Out</span>}</h3>
                          {item.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>}
                          <p className="font-extrabold text-orange-600 mt-2">${Number(item.price || 0).toFixed(2)}</p>
                        </div>
                        
                        <div className="flex justify-end mt-2">
                          <button onClick={() => openCustomizer(item)} disabled={item.isSoldOut} className={`w-10 h-10 flex items-center justify-center rounded-xl active:scale-90 transition-transform ${item.isSoldOut ? 'bg-slate-100 text-slate-400' : 'bg-orange-50 text-orange-500'}`}>
                            <Plus className="w-5 h-5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* FLOATING CART BAR */}
            {cart.length > 0 && (
              <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between z-20">
                <div className="flex items-center gap-3 pl-2">
                  <div className="relative">
                    <ShoppingBag className="w-6 h-6 text-orange-400" />
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">{cart.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-300 font-medium uppercase">Total</span>
                    <span className="font-bold text-lg">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={() => setIsCartModalOpen(true)} className="bg-orange-500 px-6 py-3 rounded-2xl font-bold active:scale-95 transition-all">
                  View Cart
                </button>
              </div>
            )}
          </div>
        )}

        {/* CUSTOMIZE ITEM MODAL */}
        {customizingItem && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4">
             <div className="bg-white w-full max-w-md sm:rounded-[2rem] rounded-t-[2rem] max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-extrabold">{customizingItem.name}</h2>
                    <p className="font-extrabold text-orange-600 mt-1">${Number(customizingItem.price || 0).toFixed(2)} Base</p>
                  </div>
                  <button onClick={() => setCustomizingItem(null)} className="bg-slate-100 p-2 rounded-full active:scale-90"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {customizingItem.addons?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-orange-500"/> Add-ons</h3>
                      <div className="space-y-2">
                        {customizingItem.addons.map((addon: any, i: number) => {
                          const isSelected = selectedAddons.some(a => a.name === addon.name);
                          return (
                            <label key={i} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                               <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white"/>}
                                  </div>
                                  <span className="font-bold text-slate-800">{addon.name}</span>
                               </div>
                               <span className="font-bold text-slate-500">+{Number(addon.price || 0).toFixed(2)}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-orange-500"/> Special Instructions</h3>
                    <textarea 
                      placeholder="e.g. No mayo, extra crispy..." 
                      rows={2} 
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none text-sm resize-none font-medium text-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all" 
                      value={itemNote} 
                      onChange={(e) => setItemNote(e.target.value)}
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 mb-3">Quantity</h3>
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl w-fit">
                       <button onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-orange-500 active:scale-90"><Minus className="w-5 h-5"/></button>
                       <span className="font-extrabold text-xl w-6 text-center">{itemQuantity}</span>
                       <button onClick={() => setItemQuantity(itemQuantity + 1)} className="w-10 h-10 bg-orange-500 rounded-xl shadow-sm flex items-center justify-center font-bold text-white active:scale-90"><Plus className="w-5 h-5"/></button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-100">
                   <button onClick={confirmAddToCart} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-transform flex justify-between px-6">
                     <span>Add to Order</span>
                     <span>${((Number(customizingItem.price || 0) + selectedAddons.reduce((a, b) => a + Number(b.price || 0), 0)) * itemQuantity).toFixed(2)}</span>
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* CART FULL SCREEN MODAL */}
        {isCartModalOpen && (
          <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="text-2xl font-extrabold flex items-center gap-2"><ShoppingBag className="text-orange-500"/> Your Order</h2>
              <button onClick={() => setIsCartModalOpen(false)} className="bg-slate-100 p-2 rounded-full active:scale-90"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="flex-1 p-4 space-y-6">
              {cart.map((item) => {
                const itemBaseAndAddons = Number(item.price || 0) + (item.selectedAddons?.reduce((a: number, b: any) => a + Number(b.price || 0), 0) || 0);
                
                return (
                  <div key={item.cartItemId} className="border-b border-slate-100 pb-6 relative">
                    <button onClick={() => removeFromCartByUniqueId(item.cartItemId)} className="absolute top-0 right-0 text-slate-300 hover:text-red-500 p-1"><X className="w-5 h-5"/></button>
                    <div className="pr-8">
                      <h3 className="font-bold text-lg leading-tight flex items-start gap-2"><span className="bg-slate-100 px-2 py-0.5 rounded-md text-sm text-slate-600 mt-0.5">{item.quantity}x</span> <span>{item.name}</span></h3>
                      
                      {item.selectedAddons?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                           {item.selectedAddons.map((a: any, i: number) => (
                             <span key={i} className="text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded-md font-bold">+{a.name}</span>
                           ))}
                        </div>
                      )}

                      {item.note && <p className="text-xs text-slate-500 font-medium mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">Note: {item.note}</p>}
                      <p className="font-extrabold text-slate-900 mt-2">${(itemBaseAndAddons * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-6 bg-slate-50 border-t sticky bottom-0">
               <div className="flex justify-between items-center mb-6 font-extrabold text-2xl">
                 <span>Total</span>
                 <span>${cartTotal.toFixed(2)}</span>
               </div>
               <button onClick={placeOrder} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform">
                 Confirm & Send to Kitchen
               </button>
            </div>
          </div>
        )}

        {/* ORDER STATUS VIEWS */}
        {!showMenu && (orderStatus === 'pending' || orderStatus === 'in-progress' || orderStatus === 'cash-requested') && (
          <div className="mt-12 p-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${orderStatus === 'cash-requested' ? 'bg-teal-500' : orderStatus === 'pending' ? 'bg-amber-400' : 'bg-orange-500'}`}></div>
            <ChefHat className={`w-16 h-16 mx-auto mb-6 ${orderStatus === 'cash-requested' ? 'text-teal-500' : orderStatus === 'pending' ? 'text-amber-400' : 'text-orange-500'}`} />
            <h2 className="text-2xl font-extrabold mb-2 text-slate-900">{orderStatus === 'cash-requested' ? 'Waiter on the way!' : orderStatus === 'pending' ? 'Sent to Kitchen!' : 'Kitchen is preparing!'}</h2>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100 mt-6">
              <span className="block text-sm text-slate-500 font-medium mb-1">Total Tab</span>
              <span className="text-3xl font-extrabold text-slate-900">${Number(activeOrder.total || 0).toFixed(2)}</span>
            </div>

            {orderStatus !== 'cash-requested' && (
              <button onClick={() => setIsOrderingMore(true)} className="w-full bg-orange-50 text-orange-600 py-3 rounded-2xl font-bold text-lg mb-4 flex items-center justify-center gap-2 active:scale-95 border border-orange-200">
                <Plus className="w-5 h-5" /> Order More Food
              </button>
            )}

            {orderStatus !== 'cash-requested' && (
              <div className="flex gap-2">
                <button onClick={() => payOrder('cash')} className="flex-1 bg-teal-500 text-white py-4 rounded-2xl font-bold active:scale-95 flex flex-col items-center justify-center gap-1">
                  <Banknote className="w-6 h-6" /> <span className="text-sm">Pay Cash</span>
                </button>
                <button onClick={() => payOrder('card')} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold active:scale-95 flex flex-col items-center justify-center gap-1">
                  <CreditCard className="w-6 h-6" /> <span className="text-sm">Pay Online</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}