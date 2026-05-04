
import React, { useState, useEffect } from 'react';
import { User, SaleItem } from '../types';
import { PRODUCT_GROUPS } from '../constants';
import { ShoppingBag, Save, PlusCircle, Trash2, Edit2, Plus } from 'lucide-react';
import { db, ref, push, onValue, update, remove, set } from '../firebase';

interface Props {
  user: User;
  markets: string[];
}

const DailySales: React.FC<Props> = ({ user, markets }) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [dbProducts, setDbProducts] = useState<Record<string, {category: string, name: string}>>({});

  useEffect(() => {
    const unsub = onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDbProducts(data);
        
        setItems(prevItems => {
          const newItems: SaleItem[] = [];
          Object.entries(data).forEach(([id, prod]: any) => {
            const existing = prevItems.find(i => i.id === id);
            newItems.push({
              id,
              category: prod.category,
              productName: prod.name,
              price: existing ? existing.price : 0,
              quantity: existing ? existing.quantity : 0
            });
          });
          // Sort items by name conceptually, or maintain order based on insertion.
          // By default, Object.entries might not guarantee perfect order, but it's consistent.
          return newItems;
        });
      } else {
        const initialProducts: Record<string, any> = {};
        Object.entries(PRODUCT_GROUPS).forEach(([cat, productsList]) => {
          productsList.forEach((p, index) => {
            // Include Date.now() for unique seeding per run if needed, but index is fine here 
            // since it'll only run once when DB is empty.
            initialProducts[`${cat}-${index}-${Date.now()}`] = { category: cat, name: p };
          });
        });
        update(ref(db, 'products'), initialProducts);
      }
    });
    return () => unsub();
  }, []);

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    if (!selectedMarket) return alert("يرجى اختيار الماركت");
    const validItems = items.filter(i => i.quantity > 0 && i.price > 0);
    if (validItems.length === 0) return alert("يرجى إدخال بيانات صنف واحد على الأقل");

    const total = validItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    await push(ref(db, 'sales'), { userId: user.id, userName: user.employeeName, marketName: selectedMarket, date: new Date().toISOString(), items: validItems, total });
    alert("تم الحفظ والترحيل");
    setSelectedMarket('');
    
    setItems(prev => prev.map(i => ({ ...i, price: 0, quantity: 0 })));
  };

  // Admin handers
  const handleAddMarket = async () => {
    const marketName = prompt("أدخل اسم الماركت الجديد:");
    if (marketName && marketName.trim()) {
      await push(ref(db, 'markets'), { name: marketName.trim(), creatorId: user.id });
    }
  };

  const handleAddProduct = async (cat: string) => {
    const name = prompt("أدخل اسم المنتج الجديد:");
    if (name && name.trim()) {
      const id = Date.now().toString();
      await set(ref(db, `products/${id}`), { category: cat, name: name.trim() });
    }
  };

  const handleEditProduct = async (id: string, currentName: string) => {
    const newName = prompt("تعديل اسم المنتج:", currentName);
    if (newName && newName.trim() && newName !== currentName) {
      await update(ref(db, `products/${id}`), { name: newName.trim() });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟")) {
      await remove(ref(db, `products/${id}`));
    }
  };

  const categoriesMap: Record<string, string> = {
    facial: 'مناديل سحب (Facial)',
    kitchen: 'مناديل مطبخ (Kitchen)',
    hotel_toilet: 'تواليت فنادق (Toilet)',
    dolphin: 'دولفن (Dolphin)'
  };

  return (
    <div className="max-w-7xl mx-auto pb-4 text-right relative" dir="rtl">
      <div className="space-y-8 pb-32">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-rose-900/60 to-rose-700/20 backdrop-blur-3xl border border-white/10 shadow-2xl overflow-hidden relative">
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-white/5 rounded-3xl border border-white/10"><ShoppingBag className="text-rose-400" size={32} /></div>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-white">المبيعات اليومية</h2>
              <p className="text-[10px] font-bold text-rose-300 uppercase mt-1 opacity-60">Daily Sales Entry</p>
            </div>
          </div>
          <div className="text-4xl md:text-7xl font-black text-white">
            {items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString()} <span className="text-sm opacity-40">ج.م</span>
          </div>
        </div>
        
        <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-xl flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-rose-400 uppercase mb-3 mr-2">اختيار الماركت الحالي</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none font-bold text-white shadow-inner" value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)}>
              <option value="" className="bg-slate-900">-- اضغط لاختيار الماركت --</option>
              {markets.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
            </select>
          </div>
          {user.role === 'admin' && (
            <button
              onClick={handleAddMarket}
              className="py-4 px-6 bg-rose-600/30 text-rose-100 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-600/50 transition-all border border-rose-500/30"
            >
              <PlusCircle size={20} />
              اضف ماركت
            </button>
          )}
        </div>

        <div className="space-y-12">
          {Object.entries(categoriesMap).map(([cat, title]) => (
            <div key={cat} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-rose-100 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-rose-600 rounded-full"/> 
                  {title}
                </h3>
                {user.role === 'admin' && (
                  <button
                    onClick={() => handleAddProduct(cat)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-lg hover:bg-rose-500/30 transition-all border border-rose-500/20"
                  >
                    <Plus size={14} /> اضف منتج
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto custom-scrollbar pb-2">
                <div className="min-w-max space-y-2">
                  {items.filter(i => i.category === cat).map(item => (
                    <div key={item.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3 hover:border-rose-500/30 transition-all flex-nowrap whitespace-nowrap min-w-max">
                      <span className="min-w-[150px] md:min-w-[200px] font-bold text-xs text-white/90 whitespace-nowrap">
                        {item.productName}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="السعر" className="w-20 glass-input-dark rounded-xl p-2 text-center font-bold text-sm outline-none" value={item.price || ''} onChange={e => updateItem(item.id, 'price', Number(e.target.value))}/>
                        <input type="number" placeholder="العدد" className={`w-20 rounded-xl p-2 text-center font-black text-sm border outline-none ${item.quantity > 0 ? 'bg-rose-600 border-rose-400 text-white' : 'bg-white/5 border-white/10'}`} value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}/>
                        
                        <div className="w-24 text-center border-r border-white/5 pr-2">
                          <span className="block text-[8px] text-white/40 uppercase mb-0.5">الاجمالي</span>
                          <span className="font-black text-rose-300 text-sm">
                            {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {user.role === 'admin' && (
                        <div className="flex items-center gap-1 mr-2 border-r border-white/10 pr-3">
                          <button onClick={() => handleEditProduct(item.id, item.productName)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all" title="تعديل">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteProduct(item.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/30 transition-all" title="حذف">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {items.filter(i => i.category === cat).length === 0 && (
                     <div className="p-4 text-center text-white/30 text-xs font-bold bg-white/[0.01] rounded-2xl border border-white/5">
                        لا يوجد منتجات في هذا القسم
                     </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Sticky Save Button */}
      <div className="sticky bottom-6 z-50 flex justify-center mt-[-60px] pointer-events-none">
         <button 
            onClick={handleSave} 
            className="w-full sm:w-2/3 md:w-1/2 max-w-sm py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-lg shadow-[0_0_40px_rgba(225,29,72,0.4)] hover:bg-rose-500 active:scale-95 transition-all flex items-center justify-center gap-3 border border-rose-400/30 backdrop-blur-md pointer-events-auto"
          >
            <Save size={24} />
            حفظ وترحيل البيانات
         </button>
      </div>
    </div>
  );
};

export default DailySales;
