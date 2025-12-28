
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { PRODUCT_GROUPS } from '../constants';
import { Save, Plus, Package } from 'lucide-react';
import { db, ref, push } from '../firebase';

interface Props {
  user: User;
  markets: string[];
}

const InventoryRegistration: React.FC<Props> = ({ user, markets }) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [inventory, setInventory] = useState<Record<string, number>>({});

  const handleUpdateQuantity = (product: string, qty: number) => {
    setInventory(prev => ({ ...prev, [product]: qty }));
  };

  const handleSave = async () => {
    if (!selectedMarket) {
      alert("يرجى اختيار ماركت");
      return;
    }

    const items = Object.entries(inventory)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([name, qty]) => ({ productName: name, quantity: Number(qty) }));

    if (items.length === 0) {
      alert("يرجى إدخال كمية لمنتج واحد على الأقل");
      return;
    }

    try {
      await push(ref(db, 'inventory'), {
        userId: user.id,
        userName: user.employeeName,
        marketName: selectedMarket,
        date: new Date().toISOString(),
        items
      });
      alert("تم حفظ جرد المخزون بنجاح");
      setInventory({});
      setSelectedMarket('');
    } catch (e) {
      alert("حدث خطأ أثناء الحفظ");
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
    <div className="max-w-5xl mx-auto pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-rose-50 p-8 md:p-10 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-blue-100 text-blue-800 rounded-3xl">
            <Package size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-rose-900">تسجيل الجرد الفعلي</h2>
            <p className="text-rose-400 text-xs font-bold uppercase tracking-widest mt-1">Inventory Counting Sheet</p>
          </div>
        </div>
        
        <div className="mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 mr-2">اختيار الماركت المراد جرده</label>
          <select 
            className="w-full bg-white border-2 border-transparent focus:border-blue-200 rounded-2xl p-4 outline-none font-bold text-gray-700 shadow-sm transition-all"
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
          >
            <option value="">-- اضغط لاختيار الماركت --</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {selectedMarket && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            {Object.entries(PRODUCT_GROUPS).map(([key, products]) => (
              <div key={key}>
                <div className="bg-slate-100 px-6 py-3 font-black text-slate-600 rounded-2xl mb-4 text-sm flex items-center justify-between">
                  <span>{getCategoryLabel(key)}</span>
                  <span className="text-[10px] bg-white px-3 py-1 rounded-full text-slate-400">Inventory Group</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {products.map(p => (
                    <div key={p} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all">
                      <span className="text-xs font-bold text-gray-600 flex-1 ml-4 leading-tight">{p}</span>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className={`w-20 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-xl p-2 text-center font-black outline-none transition-all ${inventory[p] > 0 ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                        value={inventory[p] || ''}
                        onChange={(e) => handleUpdateQuantity(p, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-12 pt-8 border-t border-slate-100">
              <button 
                onClick={handleSave}
                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-blue-700 hover:scale-[1.02] transition-all shadow-2xl shadow-blue-100"
              >
                <Save size={24}/> ترحيل بيانات الجرد
              </button>
            </div>
          </div>
        )}

        {!selectedMarket && (
          <div className="py-20 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
              <Package size={48} />
            </div>
            <p className="text-gray-400 font-bold">يرجى اختيار ماركت لإظهار نموذج الجرد</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryRegistration;
