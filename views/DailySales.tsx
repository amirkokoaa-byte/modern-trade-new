
import React, { useState, useEffect } from 'react';
import { User, SaleItem, DailySale } from '../types';
import { PRODUCT_GROUPS } from '../constants';
import { Plus, Trash2, Save, ShoppingBag, PlusCircle } from 'lucide-react';
import { db, ref, push } from '../firebase';

interface Props {
  user: User;
  markets: string[];
}

const DailySales: React.FC<Props> = ({ user, markets }) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [isAddMarketModalOpen, setIsAddMarketModalOpen] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');

  // Initial products logic: load automatically on mount
  const initItems = () => {
    const allItems: SaleItem[] = [];
    Object.entries(PRODUCT_GROUPS).forEach(([cat, products]) => {
      products.forEach(p => {
        allItems.push({
          id: `${cat}-${p}-${Date.now()}-${Math.random()}`,
          category: cat,
          productName: p,
          price: 0,
          quantity: 0
        });
      });
    });
    setItems(allItems);
  };

  useEffect(() => {
    initItems();
  }, []);

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItemManual = (category: string) => {
    const newItem: SaleItem = {
      id: `manual-${category}-${Date.now()}-${Math.random()}`,
      category,
      productName: '',
      price: 0,
      quantity: 0
    };
    setItems([...items, newItem]);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  };

  const handleSave = async () => {
    if (!selectedMarket) {
      alert("يرجى اختيار الماركت أولاً");
      return;
    }
    const finalItems = items.filter(i => i.quantity > 0 && i.productName && i.productName.trim() !== '');
    if (finalItems.length === 0) {
      alert("يرجى إدخال كمية لمنتج واحد على الأقل");
      return;
    }

    const sale: Partial<DailySale> = {
      userId: user.id,
      userName: user.employeeName,
      marketName: selectedMarket,
      date: new Date().toISOString(),
      items: finalItems,
      total: calculateTotal()
    };

    try {
      await push(ref(db, 'sales'), sale);
      alert("تم الحفظ والترحيل بنجاح");
      setSelectedMarket(''); 
      initItems(); // Reset everything
    } catch (e) {
      alert("خطأ في الاتصال بالشبكة");
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      facial: 'مناديل سحب (Facial)',
      kitchen: 'مناديل مطبخ (Kitchen)',
      hotel_toilet: 'تواليت فنادق (Hotel Toilet)',
      dolphin: 'دولفن (Dolphin)'
    };
    return labels[cat] || cat;
  };

  return (
    <div className="max-w-7xl mx-auto pb-20" dir="rtl">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-rose-900/60 to-rose-700/20 backdrop-blur-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/20 blur-[80px]"></div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-white/5 rounded-3xl border border-white/10">
              <ShoppingBag className="w-8 h-8 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-white">إجمالي المبيعات</h2>
              <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest mt-1 opacity-60">Daily Performance Tracking</p>
            </div>
          </div>
          <div className="text-4xl md:text-7xl font-black tracking-tighter text-white relative z-10">
            {calculateTotal().toLocaleString()} <span className="text-sm md:text-xl opacity-40">ج.م</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-xl">
          <div className="md:col-span-3">
            <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 mr-2">اختيار الماركت الحالي</label>
            <select 
              className="w-full bg-white/5 border border-white/10 focus:border-rose-500/50 rounded-2xl p-4 outline-none font-bold text-white shadow-inner transition-all appearance-none"
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
            >
              <option value="" className="bg-slate-900">-- اضغط لاختيار الماركت --</option>
              {markets.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
            </select>
          </div>
          <button 
            onClick={() => setIsAddMarketModalOpen(true)}
            className="self-end p-4 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 font-black text-sm"
          >
            <Plus size={20} /> إضافة ماركت
          </button>
        </div>

        <div className="space-y-12 animate-in fade-in duration-500">
          {['facial', 'kitchen', 'hotel_toilet', 'dolphin'].map(cat => (
            <div key={cat} className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-6 bg-rose-500 rounded-full"></div>
                <h3 className="text-sm font-black text-rose-100 uppercase tracking-wide">{getCategoryLabel(cat)}</h3>
              </div>
              <div className="space-y-2">
                {items.filter(i => i.category === cat).map(item => (
                  <div key={item.id} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.05] hover:border-rose-500/30 transition-all group">
                    <div className="grid grid-cols-[2fr,1fr,1fr,1.2fr] gap-4 items-center">
                      <div className="font-bold text-white text-sm">
                        {item.id.includes('manual') ? (
                          <input 
                            placeholder="اسم المنتج..."
                            className="w-full bg-transparent border-b border-white/10 focus:border-rose-500 outline-none p-1 text-sm font-bold text-rose-200"
                            value={item.productName}
                            onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                          />
                        ) : item.productName}
                      </div>
                      <input 
                        type="number" placeholder="السعر" 
                        className="w-full glass-input-dark rounded-xl p-3 text-center font-bold text-rose-400 outline-none text-sm"
                        value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                      />
                      <input 
                        type="number" placeholder="العدد" 
                        className={`w-full rounded-xl p-3 text-center font-black outline-none text-sm transition-all border ${item.quantity > 0 ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
                        value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      />
                      <div className="bg-white/5 rounded-xl p-3 text-center font-black text-rose-100/80 text-sm border border-white/5">
                        {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()} ج.م
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => addItemManual(cat)}
                  className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-white/30 font-black text-[11px] flex items-center justify-center gap-2 hover:bg-white/5 hover:text-rose-400"
                >
                  <PlusCircle size={16}/> إضافة منتج يدوي لقسم {getCategoryLabel(cat)}
                </button>
              </div>
            </div>
          ))}
          <button 
            onClick={handleSave}
            className="w-full py-6 bg-rose-600 text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 hover:bg-rose-500 transition-all shadow-2xl active:scale-[0.98] group relative overflow-hidden"
          >
            <Save size={28}/> 
            <span>ترحيل وحفظ البيانات النهائية</span>
          </button>
        </div>
      </div>
      {isAddMarketModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <div className="glass-card-dark p-8 md:p-12 rounded-[3rem] max-w-md w-full animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-white mb-6">إضافة ماركت جديد</h3>
            <input 
              className="w-full glass-input-dark rounded-2xl p-5 outline-none font-bold text-lg mb-8"
              placeholder="اسم الماركت الجديد..."
              value={newMarketName}
              onChange={(e) => setNewMarketName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-4">
              <button onClick={() => {
                if(newMarketName.trim()){
                  push(ref(db, 'markets'), { name: newMarketName.trim(), creatorId: user.id });
                  setNewMarketName('');
                  setIsAddMarketModalOpen(false);
                }
              }} className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black text-sm active-glow transition-all">إضافة الماركت</button>
              <button onClick={() => setIsAddMarketModalOpen(false)} className="flex-1 bg-white/5 text-white/40 py-4 rounded-2xl font-black text-sm hover:bg-white/10 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySales;
