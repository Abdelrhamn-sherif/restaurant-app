'use client';
import { useState } from 'react';
import useSWR from 'swr';
import toast, { Toaster } from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminMenu() {
  const { data: menuItems, mutate } = useSWR('/api/menu', fetcher);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !price) return toast.error('Fill all fields');

    await fetch('/api/menu', {
      method: 'POST',
      body: JSON.stringify({ name, category, price }),
    });
    
    setName('');
    setCategory('');
    setPrice('');
    mutate(); // Refresh the list
    toast.success('Item added!');
  };

  const toggleSoldOut = async (item: any) => {
    await fetch('/api/menu', {
      method: 'PUT',
      body: JSON.stringify({ id: item.id, isSoldOut: !item.isSoldOut }),
    });
    mutate();
    toast.success(item.isSoldOut ? 'Marked as Available' : 'Marked as Sold Out');
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/menu?id=${id}`, { method: 'DELETE' });
    mutate();
    toast.success('Item deleted');
  };

  if (!menuItems) return <div className="p-8">Loading menu data...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Menu</h1>
        <a href="/admin" className="text-blue-600 hover:underline">Back to Dashboard</a>
      </div>

      {/* Add New Item Form */}
      <div className="bg-gray-50 p-6 rounded-xl mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Item</h2>
        <form onSubmit={handleAddItem} className="flex gap-4">
          <input 
            type="text" 
            placeholder="Item Name (e.g. Burger)" 
            className="flex-1 p-2 border rounded"
            value={name} onChange={(e) => setName(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="Category (e.g. Mains)" 
            className="flex-1 p-2 border rounded"
            value={category} onChange={(e) => setCategory(e.target.value)}
          />
          <input 
            type="number" 
            placeholder="Price" 
            className="w-24 p-2 border rounded"
            value={price} onChange={(e) => setPrice(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">
            Add
          </button>
        </form>
      </div>

      {/* Current Menu List */}
      <div className="bg-white rounded-xl shadow">
        {menuItems.map((item: any) => (
          <div key={item.id} className="flex justify-between items-center p-4 border-b last:border-0">
            <div>
              <p className="font-semibold text-lg">{item.name}</p>
              <p className="text-sm text-gray-500">{item.category} • ${item.price}</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => toggleSoldOut(item)}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  item.isSoldOut 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                {item.isSoldOut ? 'Mark Available' : 'Mark Sold Out'}
              </button>
              <button 
                onClick={() => deleteItem(item.id)}
                className="px-4 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {menuItems.length === 0 && (
          <div className="p-8 text-center text-gray-500">No items in the menu yet.</div>
        )}
      </div>
    </div>
  );
}