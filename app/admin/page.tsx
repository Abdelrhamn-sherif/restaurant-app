'use client';
import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import toast, { Toaster } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { 
  LayoutDashboard, UtensilsCrossed, ChefHat, CheckCircle2, 
  Trash2, Plus, Users, Clock, CreditCard, ChevronRight, AlertCircle, RefreshCcw
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboard() {
  const { data: orders, mutate: mutateOrders } = useSWR('/api/orders', fetcher, { refreshInterval: 3000 });
  const { data: tables, mutate: mutateTables } = useSWR('/api/tables', fetcher, { refreshInterval: 5000 });
  
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState('');

  // Use a ref to track specific order IDs instead of a simple counter
  const seenOrderIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!orders) return;

    const currentIds = new Set<string>(orders.map((o: any) => o.id));

    // 1. Initial page load: silently memorize existing orders, do not show a toast
    if (seenOrderIds.current === null) {
      seenOrderIds.current = currentIds;
      return;
    }

    // 2. Subsequent polls: check if there are any new IDs we haven't seen yet
    const hasNewOrder = orders.some((o: any) => !seenOrderIds.current!.has(o.id));

    if (hasNewOrder) {
      toast.success('New Order Received!', { 
        icon: '🔔', 
        style: { borderRadius: '1rem', background: '#f97316', color: '#fff', fontWeight: 'bold' } 
      });
    }

    // 3. Always update the memorized list
    seenOrderIds.current = currentIds;
  }, [orders]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    await fetch('/api/orders', { method: 'PUT', body: JSON.stringify({ orderId, status }) });
    mutateOrders();
  };

  const clearSession = async (tableId: string) => {
    await fetch('/api/tables', { method: 'PUT', body: JSON.stringify({ tableId, action: 'clear' }) });
    mutateTables();
    toast.success('Table cleared & ready for next customer');
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
    mutateTables();
    toast.success('Table added successfully!');
  };

  const removeTable = async (tableId: string) => {
    if (!window.confirm('Remove this table completely?')) return;
    await fetch(`/api/tables?id=${tableId}`, { method: 'DELETE' });
    mutateTables();
    toast.success('Table removed');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
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
          
          {/* --- ACTIVE ORDERS COLUMN --- */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <ChefHat className="text-orange-500 w-6 h-6"/> Active Orders
              </h2>
              <div className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Live
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {orders?.filter((o: any) => o.status !== 'completed').length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-slate-300"/>
                  </div>
                  <p className="font-medium text-lg">All caught up!</p>
                  <p className="text-sm">No active orders right now.</p>
                </div>
              )}
              
              {orders?.filter((o: any) => o.status !== 'completed').map((order: any) => (
                <div key={order.id} className={`p-5 rounded-2xl border transition-all ${
                  order.status === 'paid' ? 'border-emerald-200 bg-emerald-50/50' : 
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
                      order.status === 'in-progress' ? 'bg-orange-100 text-orange-700' : 
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status === 'paid' ? <CreditCard className="w-3.5 h-3.5"/> : 
                       order.status === 'in-progress' ? <ChefHat className="w-3.5 h-3.5"/> : 
                       <AlertCircle className="w-3.5 h-3.5"/>}
                      {order.status}
                    </span>
                  </div>
                  
                  <ul className="text-sm text-slate-700 mb-5 font-medium space-y-2">
                    {order.items.map((item: any, i: number) => (
                      <li key={i} className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                        <span className="flex items-center gap-2">
                          <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-md">{item.quantity}x</span> 
                          {item.name}
                        </span>
                        <span className="font-bold text-slate-400">${(item.price * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-extrabold text-lg">${order.total.toFixed(2)}</span>
                    
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'in-progress')} 
                        className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all [Webkit-tap-highlight-color:transparent]"
                      >
                        Confirm & Cook
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
              ))}
            </div>
          </div>

          {/* --- TABLE MANAGEMENT COLUMN --- */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col h-full">
            <h2 className="text-xl font-extrabold flex items-center gap-2 mb-6">
              <Users className="text-blue-500 w-6 h-6"/> Dining Room
            </h2>

            {/* Add Table Form */}
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

                return (
                  <div key={table.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center flex flex-col items-center relative group transition-all hover:shadow-md">
                    
                    <button 
                      onClick={() => removeTable(table.id)} 
                      className="absolute top-3 right-3 text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all [Webkit-tap-highlight-color:transparent]"
                      title="Remove Table"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                    
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