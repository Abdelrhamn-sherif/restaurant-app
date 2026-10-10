'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import toast, { Toaster } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboard() {
  const { data: orders, mutate: mutateOrders } = useSWR('/api/orders', fetcher, { refreshInterval: 3000 });
  const { data: tables, mutate: mutateTables } = useSWR('/api/tables', fetcher, { refreshInterval: 5000 });
  
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState(''); // NEW: Seats state

  useEffect(() => {
    if (orders && orders.length > previousOrderCount) {
      toast('New Order Received!', { icon: '🔔', style: { background: '#333', color: '#fff' } });
      setPreviousOrderCount(orders.length);
    }
  }, [orders, previousOrderCount]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    await fetch('/api/orders', { method: 'PUT', body: JSON.stringify({ orderId, status }) });
    mutateOrders();
  };

  const clearSession = async (tableId: string) => {
    await fetch('/api/tables', { method: 'PUT', body: JSON.stringify({ tableId, action: 'clear' }) });
    mutateTables();
    toast.success(`Table cleared`);
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
    toast.success('Table added!');
  };

  const removeTable = async (tableId: string) => {
    if (!window.confirm('Remove this table completely?')) return;
    await fetch(`/api/tables?id=${tableId}`, { method: 'DELETE' });
    mutateTables();
    toast.success('Table removed!');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold mb-8">Restaurant Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Active Orders Column (unchanged) */}
        <div className="bg-gray-50 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Active Orders</h2>
          <div className="space-y-4">
            {orders?.filter((o: any) => o.status !== 'completed').length === 0 && (
              <p className="text-gray-500 text-center py-8">No active orders right now.</p>
            )}
            
            {orders?.filter((o: any) => o.status !== 'completed').map((order: any) => (
              <div key={order.id} className={`p-4 rounded-lg shadow border-l-4 ${order.status === 'paid' ? 'border-green-500 bg-green-50' : order.status === 'in-progress' ? 'border-yellow-500 bg-yellow-50' : 'border-blue-500 bg-white'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">Table {tables?.find((t:any) => t.id === order.tableId)?.name || order.tableId}</span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${order.status === 'paid' ? 'bg-green-200 text-green-800' : order.status === 'in-progress' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <ul className="text-sm text-gray-700 mb-4 font-medium">
                  {order.items.map((item: any, i: number) => (
                    <li key={i} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-center border-t pt-3 mt-3">
                  <span className="font-bold">Total: ${order.total.toFixed(2)}</span>
                  {order.status === 'pending' && <button onClick={() => updateOrderStatus(order.id, 'in-progress')} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Confirm & Start</button>}
                  {order.status === 'paid' && <button onClick={() => updateOrderStatus(order.id, 'completed')} className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900">Clear Order</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table Management Column */}
        <div className="bg-gray-50 p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-semibold">Tables & Static QR Codes</h2>
            <a href="/admin/menu" className="text-blue-600 text-sm hover:underline font-medium">Manage Menu &rarr;</a>
          </div>

          {/* Updated Table Form with Seats */}
          <form onSubmit={handleAddTable} className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Name (e.g. T-1)" 
              className="flex-[2] p-2 border rounded-lg"
              value={newTableName} onChange={(e) => setNewTableName(e.target.value)}
            />
            <input 
              type="number" 
              placeholder="Seats" 
              className="flex-1 p-2 border rounded-lg"
              value={newTableSeats} onChange={(e) => setNewTableSeats(e.target.value)}
            />
            <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800">Add</button>
          </form>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tables?.map((table: any) => {
              // STATIC URL: No longer contains a session token!
              const menuUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${table.id}`;

              return (
                <div key={table.id} className="bg-white p-4 rounded-lg shadow text-center flex flex-col items-center relative">
                  <button onClick={() => removeTable(table.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">✖</button>
                  
                  <h3 className="font-bold text-lg leading-tight">{table.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{table.seats} Seats</p>
                  
                  <div className="bg-white p-2 rounded-xl shadow-inner mb-3 border">
                    <QRCodeSVG value={menuUrl} size={120} />
                  </div>

                  {table.sessionToken ? (
                    <div className="w-full">
                      <p className="text-xs text-red-600 font-bold mb-2 uppercase tracking-wider">Occupied</p>
                      <button onClick={() => clearSession(table.id)} className="w-full bg-red-50 text-red-700 py-2 rounded text-sm font-semibold hover:bg-red-100 border border-red-200">
                        Clear Table
                      </button>
                    </div>
                  ) : (
                    <div className="w-full">
                       <p className="text-xs text-green-600 font-bold mb-2 uppercase tracking-wider">Available</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}