
import React, { useState, useEffect } from 'react';
import { User, SaleItem, DailySale } from '../types';
import { PRODUCT_GROUPS } from '../constants';
import { Plus, Trash2, Save, ShoppingBag } from 'lucide-react';
import { db, ref, push, set } from '../firebase';

interface Props {
  user: User;
  markets: string[];
}

const DailySales: React.FC<Props> = ({ user, markets }) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);

  // When a market is selected, auto-populate the list with all products
  useEffect(() => {
    if (selectedMarket) {
      const allItems: SaleItem[] = [];
      Object.entries(PRODUCT_GROUPS).forEach(([cat, products]) => {
        products.forEach(p => {
          allItems.push({
            id: `${cat}-${p}-${Date.now()}`,
            category: cat,
            productName: p,
            price: 0,
            quantity: 0
          });
        });
      });
      setItems(allItems);
    } else {
      setItems([]);
    }
  }, [selectedMarket]);

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  };

  const handleSave = async () => {
    if (!selectedMarket) {
      alert("يرجى اختيار الماركت أولاً");
      return;
    }

    const finalItems = items.filter(i => i.quantity > 0);
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
      const salesRef = ref(db, 'sales');
      await push(salesRef, sale);
      alert("تم حفظ المبيعات بنجاح");
      setSelectedMarket('');
      setItems([]);
    } catch (e) {
      alert("حدث خطأ أثناء الاتصال بالقاعدة");
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch(cat) {
      case 'facial': return 'مناديل سحب (Facial)';
      case 'kitchen': return 'مناديل مطبخ (Kitchen)';
      case 'hotel_toilet': return 'تواليت فنادق (Hotel Toilet)';
      case 'dolphin': return 'دولفن (Dolphin)';
      default: return cat;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-rose-50 p-8 md:p-10 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-rose-100 text-rose-800 rounded-3xl">
            <ShoppingBag size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-rose-900">تسجيل مبيعات اليوم</h2>
            <p className="text-rose-400 text-xs font-bold uppercase tracking-widest mt-1">Daily Sales Entry Sheet</p>
          </div>
        </div>
        
        <div className="mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 mr-2">اختيار الماركت المستهدف</label>
          <select 
            className="w-full bg-white border-2 border-transparent focus:border-rose-200 rounded-2xl p-4 outline-none font-bold text-gray-700 shadow-sm transition-all"
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
          >
            <option value="">-- اضغط لاختيار الماركت --</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {selectedMarket && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            {['facial', 'kitchen', 'hotel_toilet', 'dolphin'].map(cat => (
              <div key={cat} className="overflow-hidden">
                <div className="bg-slate-100 px-6 py-3 font-black text-slate-600 rounded-2xl mb-4 text-sm flex items-center justify-between">
                  <span>{getCategoryLabel(cat)}</span>
                  <span className="text-[10px] bg-white px-3 py-1 rounded-full text-slate-400 uppercase tracking-tighter">Category Group</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.filter(i => i.category === cat).map(item => (
                    <div key={item.id} className="p-5 bg-white border border-slate-100 rounded-3xl hover:border-rose-200 hover:shadow-md transition-all group">
                      <p className="text-sm font-black text-gray-700 mb-4 h-10 line-clamp-2">{item.productName}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-1">السعر</label>
                          <input 
                            type="number" placeholder="0.00" 
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-200 rounded-xl p-2 text-center font-bold text-rose-900 outline-none"
                            value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-1">الكمية</label>
                          <input 
                            type="number" placeholder="0" 
                            className={`w-full bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-xl p-2 text-center font-black outline-none ${item.quantity > 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
                            value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي فاتورة الماركت</span>
                <div className="text-4xl font-black text-rose-900 leading-none">
                  {calculateTotal().toLocaleString()} <span className="text-sm">ج.م</span>
                </div>
              </div>
              <button 
                onClick={handleSave}
                className="w-full md:w-80 bg-rose-800 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-rose-900 hover:scale-105 transition-all shadow-2xl shadow-rose-200"
              >
                <Save size={24}/> حفظ وترحيل الفاتورة
              </button>
            </div>
          </div>
        )}

        {!selectedMarket && (
          <div className="py-20 text-center">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-200">
              <ShoppingBag size={48} />
            </div>
            <p className="text-gray-400 font-bold">يرجى اختيار ماركت من القائمة بالأعلى لإظهار المنتجات</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailySales;
