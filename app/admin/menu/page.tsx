'use client';
import { useState } from 'react';
import useSWR from 'swr';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ChevronLeft, UtensilsCrossed, PlusCircle, 
  Trash2, Tag, DollarSign, EyeOff, Eye, Search 
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminMenu() {
  const { data: menuItems, mutate } = useSWR('/api/menu', fetcher);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
    mutate();
    toast.success('Item added successfully!');
  };

  const toggleSoldOut = async (item: any) => {
    await fetch('/api/menu', {
      method: 'PUT',
      body: JSON.stringify({ id: item.id, isSoldOut: !item.isSoldOut }),
    });
    mutate();
    toast.success(item.isSoldOut ? `${item.name} is now Available` : `${item.name} marked Sold Out`, {
      icon: item.isSoldOut ? '✅' : '🛑'
    });
  };

  const deleteItem = async (id: string, itemName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${itemName}?`)) return;
    await fetch(`/api/menu?id=${id}`, { method: 'DELETE' });
    mutate();
    toast.success(`${itemName} deleted`);
  };

  // Filter items based on search
  const filteredItems = menuItems?.filter((item: any) => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900 pb-24">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '1rem', background: '#334155', color: '#fff' } }} />
      
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
        <div className="flex items-center gap-4">
          <a 
            href="/admin" 
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-100 hover:bg-slate-100 transition-all active:scale-95 [Webkit-tap-highlight-color:transparent]"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </a>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Manage Menu</h1>
            <p className="text-slate-500 font-medium">Add, update, or remove dishes from your catalog.</p>
          </div>
        </div>

        {/* --- ADD ITEM CARD --- */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100">
          <h2 className="text-xl font-extrabold flex items-center gap-2 mb-6 text-slate-900">
            <PlusCircle className="text-orange-500 w-6 h-6" /> Add New Item
          </h2>
          
          <form onSubmit={handleAddItem} className="flex flex-col md:flex-row gap-4">
            {/* Name Input */}
            <div className="flex-[2] flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-1 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
              <UtensilsCrossed className="w-5 h-5 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Item Name (e.g. Smash Burger)" 
                className="w-full bg-transparent p-2 outline-none font-medium text-slate-900 placeholder:text-slate-400"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Category Input */}
            <div className="flex-[1.5] flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-1 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
              <Tag className="w-5 h-5 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Category" 
                className="w-full bg-transparent p-2 outline-none font-medium text-slate-900 placeholder:text-slate-400"
                value={category} onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            {/* Price Input */}
            <div className="flex-[1] flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-1 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
              <DollarSign className="w-5 h-5 text-slate-400 mr-1" />
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00" 
                className="w-full bg-transparent p-2 outline-none font-medium text-slate-900 placeholder:text-slate-400"
                value={price} onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="bg-slate-900 text-white px-8 py-4 md:py-0 rounded-2xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/20 [Webkit-tap-highlight-color:transparent]"
            >
              Save Item
            </button>
          </form>
        </div>

        {/* --- MENU LIST CARD --- */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-extrabold flex items-center gap-2 text-slate-900">
              <UtensilsCrossed className="text-blue-500 w-6 h-6" /> Current Menu
            </h2>
            
            {/* Search Bar */}
            <div className="w-full md:w-64 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 focus-within:border-blue-500 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search menu..." 
                className="w-full bg-transparent p-1.5 outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {!menuItems && (
              <div className="text-center py-10 text-slate-400 font-medium animate-pulse">Loading menu items...</div>
            )}
            
            {filteredItems.length === 0 && menuItems && (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <UtensilsCrossed className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-lg">No items found</p>
                <p className="text-sm">Try adjusting your search or add a new item above.</p>
              </div>
            )}

            {filteredItems.map((item: any) => (
              <div 
                key={item.id} 
                className={`p-4 bg-white rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md ${
                  item.isSoldOut ? 'border-rose-100 bg-rose-50/30' : 'border-slate-100'
                }`}
              >
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                    {item.name}
                    {item.isSoldOut && (
                      <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        Sold Out
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-3 text-sm mt-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {item.category}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="font-extrabold text-slate-900">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex w-full md:w-auto gap-2">
                  <button 
                    onClick={() => toggleSoldOut(item)}
                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 [Webkit-tap-highlight-color:transparent] ${
                      item.isSoldOut 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {item.isSoldOut ? <><Eye className="w-4 h-4"/> Mark Available</> : <><EyeOff className="w-4 h-4"/> Mark Sold Out</>}
                  </button>
                  
                  <button 
                    onClick={() => deleteItem(item.id, item.name)}
                    className="w-12 h-10 md:w-auto md:h-auto md:px-4 md:py-2.5 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 border border-slate-200 hover:border-red-200 rounded-xl flex items-center justify-center transition-all active:scale-95 [Webkit-tap-highlight-color:transparent]"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}