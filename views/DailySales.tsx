
import React, { useState, useEffect } from 'react';
import { User, SaleItem, DailySale } from '../types';
import { PRODUCT_GROUPS } from '../constants';
import { ShoppingBag, Save, PlusCircle } from 'lucide-react';
import { db, ref, push } from '../firebase';

interface Props {
  user: User;
  markets: string[];
}

const DailySales: React.FC<Props> = ({ user, markets }) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);

  // Function to load all products automatically
  const loadDefaultProducts = () => {
    const allItems: SaleItem[] = [];
    Object.entries(PRODUCT_GROUPS).forEach(([cat, products]) => {
      products.forEach(p => {
        allItems.push({ id: `${cat}-${p}-${Date.now()}`, category: cat, productName: p, price: 0, quantity: 0 });
      });
    });
    setItems(allItems);
  };

  useEffect(() => {
    loadDefaultProducts();
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
    loadDefaultProducts();
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 text-right" dir="rtl">
      <div className="space-y-8">
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
        
        <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-xl">
          <label className="block text-[10px] font-black text-rose-400 uppercase mb-3 mr-2">اختيار الماركت الحالي</label>
          <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none font-bold text-white shadow-inner" value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)}>
            <option value="" className="bg-slate-900">-- اضغط لاختيار الماركت --</option>
            {markets.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
          </select>
        </div>

        <div className="space-y-12">
          {['facial', 'kitchen', 'hotel_toilet', 'dolphin'].map(cat => (
            <div key={cat} className="space-y-4">
              <h3 className="text-sm font-black text-rose-100 flex items-center gap-2 px-2"><div className="w-1.5 h-6 bg-rose-600 rounded-full"/> {cat === 'facial' ? 'مناديل سحب' : cat === 'kitchen' ? 'مناديل مطبخ' : cat === 'hotel_toilet' ? 'تواليت فنادق' : 'دولفن'}</h3>
              <div className="space-y-2">
                {items.filter(i => i.category === cat).map(item => (
                  <div key={item.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4 hover:border-rose-500/30 transition-all">
                    <span className="flex-1 font-bold text-xs text-white/90">{item.productName}</span>
                    <input type="number" placeholder="السعر" className="w-24 glass-input-dark rounded-xl p-3 text-center font-bold text-sm" value={item.price || ''} onChange={e => updateItem(item.id, 'price', Number(e.target.value))}/>
                    <input type="number" placeholder="العدد" className={`w-24 rounded-xl p-3 text-center font-black text-sm border ${item.quantity > 0 ? 'bg-rose-600 border-rose-400 text-white' : 'bg-white/5 border-white/10'}`} value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}/>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={handleSave} className="w-full py-6 bg-rose-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-rose-500 active:scale-95 transition-all">حفظ وترحيل البيانات</button>
        </div>
      </div>
    </div>
  );
};

export default DailySales;
