'use client';
import { useState } from 'react';
import useSWR from 'swr';
import toast, { Toaster } from 'react-hot-toast';
import { ChevronLeft, UtensilsCrossed, PlusCircle, Trash2, Tag, DollarSign, Search, ImageIcon, AlignLeft, Layers } from 'lucide-react';
import Link from 'next/link';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminMenu() {
  const { data: menuItems, mutate: mutateMenu } = useSWR('/api/menu', fetcher);
  const { data: categories, mutate: mutateCategories } = useSWR('/api/categories', fetcher);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // NEW: State for Add-ons
  const [addons, setAddons] = useState<{name: string, price: string}[]>([]);
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('');

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    await fetch('/api/categories', { method: 'POST', body: JSON.stringify({ name: newCatName }) });
    setNewCatName(''); mutateCategories(); toast.success('Category added!');
  };

  const deleteCategory = async (id: string) => {
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    mutateCategories();
  };

  const handleAddAddon = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!addonName) return toast.error('Add-on name is required');
    setAddons([...addons, { name: addonName, price: addonPrice || '0' }]);
    setAddonName(''); setAddonPrice('');
  };

  const removeAddon = (index: number) => {
    setAddons(addons.filter((_, i) => i !== index));
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !price) return toast.error('Name, Category, and Price are required');

    // Format addons for the database
    const formattedAddons = addons.map(a => ({ name: a.name, price: parseFloat(a.price) }));

    await fetch('/api/menu', {
      method: 'POST',
      body: JSON.stringify({ name, category, price, description, image, addons: formattedAddons }),
    });
    
    setName(''); setPrice(''); setDescription(''); setImage(''); setAddons([]);
    mutateMenu(); toast.success('Item added successfully!');
  };

  const toggleSoldOut = async (item: any) => {
    await fetch('/api/menu', { method: 'PUT', body: JSON.stringify({ id: item.id, isSoldOut: !item.isSoldOut }) });
    mutateMenu();
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm(`Delete this item?`)) return;
    await fetch(`/api/menu?id=${id}`, { method: 'DELETE' });
    mutateMenu();
  };

  const filteredItems = menuItems?.filter((item: any) => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 selection:bg-orange-100">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex items-center gap-4">
          <Link href="/admin" className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 hover:bg-slate-100 transition-all active:scale-95">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Manage Menu</h1>
            <p className="text-slate-500 font-medium">Add dishes, categories, and add-ons.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 lg:col-span-1 h-fit">
            <h2 className="text-xl font-extrabold flex items-center gap-2 mb-6"><Tag className="text-blue-500 w-5 h-5" /> Categories</h2>
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input type="text" placeholder="New Category" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none font-medium text-sm" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
              <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 text-sm"><PlusCircle className="w-4 h-4"/></button>
            </form>
            <div className="space-y-2">
              {categories?.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-sm">{c.name}</span>
                  <button onClick={() => deleteCategory(c.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 lg:col-span-2">
            <h2 className="text-xl font-extrabold flex items-center gap-2 mb-6"><UtensilsCrossed className="text-orange-500 w-5 h-5" /> Add Menu Item</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="flex gap-4 flex-col md:flex-row">
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                  <input type="text" placeholder="Item Name" className="w-full bg-transparent p-2 outline-none font-medium" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <input type="number" step="0.01" placeholder="Price" className="w-full bg-transparent p-2 outline-none font-medium" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                <select className="w-full bg-transparent p-2 outline-none font-medium text-slate-700" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="" disabled>Select a Category...</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                <ImageIcon className="w-4 h-4 text-slate-400 mr-2" />
                <input type="text" placeholder="Image URL (Optional)" className="w-full bg-transparent p-2 outline-none font-medium text-sm" value={image} onChange={(e) => setImage(e.target.value)} />
              </div>

              <div className="flex items-start bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <AlignLeft className="w-4 h-4 text-slate-400 mr-2 mt-2" />
                <textarea placeholder="Description / Ingredients (Optional)" rows={2} className="w-full bg-transparent p-1 outline-none font-medium text-sm resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* ADD-ONS SECTION */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Layers className="w-4 h-4"/> Add-ons & Extras (Optional)</p>
                <div className="space-y-2 mb-3">
                  {addons.map((addon, i) => (
                    <div key={i} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg text-sm font-medium">
                      <span>{addon.name} <span className="text-orange-500 font-bold ml-2">+${Number(addon.price).toFixed(2)}</span></span>
                      <button type="button" onClick={() => removeAddon(i)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. Extra Cheese" className="flex-[2] bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm" value={addonName} onChange={(e) => setAddonName(e.target.value)} />
                  <input type="number" step="0.01" placeholder="Price (0 if free)" className="flex-[1] bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm" value={addonPrice} onChange={(e) => setAddonPrice(e.target.value)} />
                  <button type="button" onClick={handleAddAddon} className="bg-slate-200 text-slate-700 px-3 rounded-lg font-bold hover:bg-slate-300 text-sm">Add</button>
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all">Save Menu Item</button>
            </form>
          </div>
        </div>

        {/* MENU LIST */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-extrabold">Current Menu</h2>
             <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input type="text" placeholder="Search..." className="bg-transparent p-1.5 outline-none text-sm font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {filteredItems.map((item: any) => (
               <div key={item.id} className={`p-4 rounded-2xl border flex gap-4 ${item.isSoldOut ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
                 {item.image && <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl border border-slate-200 flex-shrink-0" />}
                 <div className="flex-1">
                   <div className="flex justify-between items-start">
                     <h3 className="font-extrabold text-lg leading-tight">{item.name}</h3>
                     <span className="font-extrabold">${Number(item.price || 0).toFixed(2)}</span>
                   </div>
                   <p className="text-xs text-slate-500 font-bold mb-1">{item.category}</p>
                   {item.description && <p className="text-xs text-slate-600 line-clamp-2 mb-2">{item.description}</p>}
                   
                   {/* Display Addons */}
                   {item.addons?.length > 0 && (
                     <div className="mb-3 flex flex-wrap gap-1">
                       {item.addons.map((a: any, i: number) => (
                         <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold border border-slate-200">
                           {a.name} (+${Number(a.price).toFixed(2)})
                         </span>
                       ))}
                     </div>
                   )}
                   
                   <div className="flex gap-2 mt-auto pt-2">
                     <button onClick={() => toggleSoldOut(item)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">{item.isSoldOut ? 'Mark Available' : 'Mark Sold Out'}</button>
                     <button onClick={() => deleteItem(item.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}