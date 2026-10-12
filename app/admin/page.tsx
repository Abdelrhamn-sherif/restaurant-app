'use client';
import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import toast, { Toaster } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import PusherClient from 'pusher-js';
import { 
  LayoutDashboard, UtensilsCrossed, ChefHat, CheckCircle2, 
  Trash2, Plus, Users, Clock, CreditCard, ChevronRight, 
  AlertCircle, RefreshCcw, Banknote, Bell 
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboard() {
  const { data: orders, mutate: mutateOrders } = useSWR('/api/orders', fetcher);
  const { data: tables, mutate: mutateTables } = useSWR('/api/tables', fetcher);
  
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState('');
  const seenOrderIds = useRef<Set<string> | null>(null);

  // --- PUSHER WEBSOCKET CONNECTION ---
  useEffect(() => {
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY as string, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string,
    });
    const channel = pusher.subscribe('restaurant');
    
    channel.bind('orders-updated', () => mutateOrders());
    channel.bind('tables-updated', () => mutateTables());
    
    channel.bind('help-requested', (data: { tableId: string, tableName: string }) => {
      toast(`Table ${data.tableName} needs help!`, {
        icon: '🛎️',
        style: { borderRadius: '1rem', background: '#e11d48', color: '#fff', fontWeight: 'bold' },
        duration: 5000,
      });
    });

    return () => pusher.unsubscribe('restaurant');
  }, [mutateOrders, mutateTables]);

  // --- REAL-TIME NEW ORDER NOTIFICATION ---
  useEffect(() => {
    if (!orders) return;
    const currentIds = new Set<string>(orders.map((o: any) => o.id));
    
    if (seenOrderIds.current === null) {
      seenOrderIds.current = currentIds;
      return;
    }
    
    const hasNewOrder = orders.some((o: any) => !seenOrderIds.current!.has(o.id));
    if (hasNewOrder) {
      toast.success('New Order Received!', { 
        icon: '🔔', 
        style: { borderRadius: '1rem', background: '#f97316', color: '#fff', fontWeight: 'bold' } 
      });
    }
    seenOrderIds.current = currentIds;
  }, [orders]);

  // --- DATA HANDLERS ---
  const updateOrderStatus = async (orderId: string, status: string) => {
    await fetch('/api/orders', { method: 'PUT', body: JSON.stringify({ orderId, status }) });
    mutateOrders();
  };

  const clearSession = async (tableId: string) => {
    await fetch('/api/tables', { method: 'PUT', body: JSON.stringify({ tableId, action: 'clear' }) });
    toast.success('Table cleared & ready for next customer');
  };
  
  const resolveHelp = async (tableId: string) => {
    await fetch('/api/tables', { method: 'PUT', body: JSON.stringify({ tableId, action: 'resolve-help' }) });
    toast.success('Help request resolved');
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName || !newTableSeats) return toast.error('Fill all fields');
    await fetch('/api/tables', {
      method: 'POST',
      body: JSON.stringify({ name: newTableName, seats: newTableSeats })
    });
    setNewTableName('');
    setNewTableSeats('');
    toast.success('Table added successfully!');
  };

  const removeTable = async (tableId: string) => {
    if (!window.confirm('Remove this table completely?')) return;
    await fetch(`/api/tables?id=${tableId}`, { method: 'DELETE' });
    toast.success('Table removed');
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[2rem] shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                <LayoutDashboard className="text-orange-500 w-6 h-6"/> 
              </div>
              Restaurant Dashboard
            </h1>
            <p className="text-slate-500 font-medium mt-2 ml-15">Manage your orders and dining room in real-time.</p>
          </div>
          <a 
            href="/admin/menu" 
            className="mt-6 md:mt-0 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3.5 rounded-2xl font-bold transition-all active:scale-95 [Webkit-tap-highlight-color:transparent]"
          >
            <UtensilsCrossed className="w-5 h-5"/> Manage Menu Items <ChevronRight className="w-4 h-4 text-slate-400"/>
          </a>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* ACTIVE ORDERS COLUMN */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <ChefHat className="text-orange-500 w-6 h-6"/> Active Orders
              </h2>
              <div className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span> 
                Connected
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {orders?.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled').length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-slate-300"/>
                  </div>
                  <p className="font-medium text-lg">All caught up!</p>
                  <p className="text-sm">No active orders right now.</p>
                </div>
              )}
              
              {orders?.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled').map((order: any) => (
                <div key={order.id} className={`p-5 rounded-2xl border transition-all ${
                  order.status === 'paid' ? 'border-emerald-200 bg-emerald-50/50' : 
                  order.status === 'cash-requested' ? 'border-teal-200 bg-teal-50/50' : 
                  order.status === 'in-progress' ? 'border-orange-200 bg-orange-50/50' : 
                  'border-amber-200 bg-amber-50/50'
                }`}>
                  <div className="flex justify-between items-start mb-4 border-b border-black/5 pb-4">
                    <div>
                      <span className="font-extrabold text-xl flex items-center gap-2">
                        {tables?.find((t:any) => t.id === order.tableId)?.name || `Table ${order.tableId}`}
                      </span>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3"/> {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                      order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                      order.status === 'cash-requested' ? 'bg-teal-100 text-teal-700' : 
                      order.status === 'in-progress' ? 'bg-orange-100 text-orange-700' : 
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status === 'paid' ? <CreditCard className="w-3.5 h-3.5"/> : 
                       order.status === 'cash-requested' ? <Banknote className="w-3.5 h-3.5"/> : 
                       order.status === 'in-progress' ? <ChefHat className="w-3.5 h-3.5"/> : 
                       <AlertCircle className="w-3.5 h-3.5"/>}
                      {order.status === 'cash-requested' ? 'Cash' : order.status}
                    </span>
                  </div>
                  
                  {/* ORDER ITEMS LIST WITH NOTES */}
                  <ul className="text-sm text-slate-700 mb-5 font-medium space-y-2">
                    {order.items.map((item: any, i: number) => {
                      // Addons cost calculation
                      const itemBaseAndAddons = Number(item.price || 0) + (item.selectedAddons?.reduce((a: number, b: any) => a + Number(b.price || 0), 0) || 0);

                      return (
                        <li key={i} className="flex flex-col bg-white/60 p-2 rounded-lg">
                          <div className="flex justify-between items-start">
                            <span className="flex items-start gap-2">
                              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-md mt-0.5">{item.quantity}x</span> 
                              <div>
                                <span className="font-bold">{item.name}</span>
                                {/* ADMIN VIEW: Selected Add-ons printed clearly for the Chef */}
                                {item.selectedAddons?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.selectedAddons.map((addon: any, idx: number) => (
                                      <span key={idx} className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                        + {addon.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </span>
                            <span className="font-bold text-slate-400 ml-2">${(itemBaseAndAddons * item.quantity).toFixed(2)}</span>
                          </div>
                          
                          {item.note && (
                            <p className="text-xs text-rose-500 font-bold mt-2 ml-9 flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> Note: {item.note}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-extrabold text-lg">${Number(order.total || 0).toFixed(2)}</span>                    
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'cancelled')} 
                            className="bg-slate-100 text-slate-500 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-100 hover:text-rose-600 active:scale-95 transition-all [Webkit-tap-highlight-color:transparent]"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'in-progress')} 
                            className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all [Webkit-tap-highlight-color:transparent]"
                          >
                            Confirm & Cook
                          </button>
                        </>
                      )}
                      
                      {order.status === 'in-progress' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'cancelled')} 
                          className="bg-slate-100 text-slate-400 p-2.5 rounded-xl hover:bg-rose-100 hover:text-rose-600 active:scale-95 transition-all [Webkit-tap-highlight-color:transparent]"
                          title="Cancel Order"
                        >
                          <Trash2 className="w-5 h-5"/>
                        </button>
                      )}

                      {order.status === 'cash-requested' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'completed')} 
                          className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-teal-500/30 hover:bg-teal-700 active:scale-95 transition-all flex items-center gap-2 [Webkit-tap-highlight-color:transparent]"
                        >
                          <CheckCircle2 className="w-4 h-4"/> Confirm Cash & Clear
                        </button>
                      )}
                      
                      {order.status === 'paid' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'completed')} 
                          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 [Webkit-tap-highlight-color:transparent]"
                        >
                          <CheckCircle2 className="w-4 h-4"/> Clear Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TABLE MANAGEMENT COLUMN */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col h-full">
            <h2 className="text-xl font-extrabold flex items-center gap-2 mb-6">
              <Users className="text-blue-500 w-6 h-6"/> Dining Room
            </h2>

            <form onSubmit={handleAddTable} className="flex gap-2 mb-8 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <input 
                type="text" 
                placeholder="Table Name (e.g. T-1)" 
                className="flex-[2] bg-transparent p-3 outline-none font-medium text-slate-900 placeholder:text-slate-400"
                value={newTableName} onChange={(e) => setNewTableName(e.target.value)}
              />
              <div className="w-px bg-slate-200 my-2"></div>
              <input 
                type="number" 
                placeholder="Seats" 
                className="flex-[1] bg-transparent p-3 outline-none font-medium text-slate-900 placeholder:text-slate-400 w-20"
                value={newTableSeats} onChange={(e) => setNewTableSeats(e.target.value)}
              />
              <button 
                type="submit" 
                className="bg-slate-900 text-white px-5 rounded-xl font-bold hover:bg-slate-800 flex items-center gap-1 active:scale-95 transition-all [Webkit-tap-highlight-color:transparent]"
              >
                <Plus className="w-4 h-4"/> Add
              </button>
            </form>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tables?.map((table: any) => {
                const menuUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${table.id}`;
                
                const isHelpNeeded = table.needsHelp;
                // Check if this table has an active cash request
                const isCashRequested = orders?.some((o: any) => o.tableId === table.id && o.status === 'cash-requested');

                return (
                  <div key={table.id} className={`bg-slate-50 p-5 rounded-2xl border text-center flex flex-col items-center relative group transition-all hover:shadow-md ${
                    isHelpNeeded ? 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 
                    isCashRequested ? 'border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 
                    'border-slate-100'
                  }`}>
                    
                    {/* ALERTS CONTAINER (Top Right) */}
                    <div className="absolute -top-3 -right-3 z-10 flex gap-2">
                      
                      {/* Cash Requested Alert */}
                      {isCashRequested && (
                        <span className="relative flex h-10 w-10">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <div className="relative inline-flex rounded-full h-10 w-10 bg-teal-500 text-white items-center justify-center shadow-lg" title="Cash Requested">
                            <Banknote className="w-5 h-5 animate-bounce" />
                          </div>
                        </span>
                      )}

                      {/* Needs Help Alert */}
                      {isHelpNeeded && (
                        <span className="relative flex h-10 w-10">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <button 
                            onClick={() => resolveHelp(table.id)} 
                            className="relative inline-flex rounded-full h-10 w-10 bg-rose-500 text-white items-center justify-center shadow-lg hover:bg-rose-600 transition-all active:scale-90 [Webkit-tap-highlight-color:transparent]"
                            title="Resolve Help Request"
                          >
                            <Bell className="w-5 h-5 animate-bounce" />
                          </button>
                        </span>
                      )}
                    </div>
                    
                    {/* Delete button (only show if no alerts are active) */}
                    {!isHelpNeeded && !isCashRequested && (
                      <button 
                        onClick={() => removeTable(table.id)} 
                        className="absolute top-3 right-3 text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all [Webkit-tap-highlight-color:transparent]"
                        title="Remove Table"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    )}
                    
                    <h3 className="font-extrabold text-xl text-slate-900 mb-1">{table.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mb-4 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3"/> {table.seats} Seats
                    </p>
                    
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-4 group-hover:scale-105 transition-transform">
                      <QRCodeSVG value={menuUrl} size={110} />
                    </div>

                    {table.sessionToken ? (
                      <div className="w-full mt-auto">
                        <p className="text-[10px] text-rose-600 font-extrabold mb-2 uppercase tracking-widest flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Occupied
                        </p>
                        <button 
                          onClick={() => clearSession(table.id)} 
                          className="w-full bg-white text-rose-600 py-2.5 rounded-xl text-sm font-bold border border-rose-200 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center gap-2 [Webkit-tap-highlight-color:transparent]"
                        >
                          <RefreshCcw className="w-4 h-4"/> Clear Table
                        </button>
                      </div>
                    ) : (
                      <div className="w-full mt-auto">
                         <p className="text-[10px] text-emerald-600 font-extrabold mb-2 uppercase tracking-widest flex items-center justify-center gap-1 py-2.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available
                         </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {tables?.length === 0 && (
                <div className="col-span-1 sm:col-span-2 text-center py-10 text-slate-400">
                  <p>No tables configured yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}