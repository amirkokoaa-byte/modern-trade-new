
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

  useEffect(() => {
    if (selectedMarket) {
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
    } else {
      setItems([]);
    }
  }, [selectedMarket]);

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
      setItems([]);
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
    <div className="max-w-7xl mx-auto pb-20 px-2">
      <div className="bg-white rounded-[2rem] shadow-xl border border-rose-50 p-4 md:p-8 overflow-hidden">
        
        {/* Total Summary Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-rose-900 p-6 md:p-10 rounded-[2rem] text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
              <ShoppingBag size={32} />
            </div>
            <div className="text-center md:text-right">
              <h2 className="text-lg md:text-2xl font-black">إجمالي مبيعات اليوم</h2>
              <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest mt-1">Live Sales Dashboard</p>
            </div>
          </div>
          <div className="text-4xl md:text-6xl font-black tracking-tighter">
            {calculateTotal().toLocaleString()} <span className="text-lg opacity-60">ج.م</span>
          </div>
        </div>
        
        {/* Market Selection Section */}
        <div className="mb-8 flex flex-col md:flex-row items-stretch md:items-end gap-3 bg-slate-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-slate-100">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mr-2">الماركت الحالي</label>
            <select 
              className="w-full bg-white border-2 border-transparent focus:border-rose-300 rounded-xl md:rounded-2xl p-4 outline-none font-bold text-gray-700 shadow-sm"
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
            >
              <option value="">-- اضغط لاختيار الماركت --</option>
              {markets && markets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button 
            onClick={() => setIsAddMarketModalOpen(true)}
            className="p-4 bg-rose-800 text-white rounded-xl md:rounded-2xl hover:bg-rose-900 transition-all shadow-md flex items-center justify-center"
          >
            <Plus size={24} />
          </button>
        </div>

        {selectedMarket && (
          <div className="space-y-10">
            {['facial', 'kitchen', 'hotel_toilet', 'dolphin'].map(cat => (
              <div key={cat} className="space-y-3">
                <div className="bg-slate-800 px-6 py-3 font-black text-white rounded-xl flex items-center justify-between">
                  <span className="text-xs md:text-sm">{getCategoryLabel(cat)}</span>
                </div>
                
                <div className="space-y-2">
                  {/* Desktop Columns Header */}
                  <div className="hidden md:grid grid-cols-[2.5fr,1fr,1fr,1.2fr] gap-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    <span>اسم الصنف</span>
                    <span className="text-center">سعر القطعة</span>
                    <span className="text-center">العدد</span>
                    <span className="text-center">الإجمالي</span>
                  </div>

                  {items.filter(i => i.category === cat).map(item => (
                    <div key={item.id} className="p-3 md:p-4 bg-white border border-slate-100 rounded-xl md:rounded-2xl hover:border-rose-200 hover:shadow-md transition-all group">
                      <div className="grid grid-cols-1 md:grid-cols-[2.5fr,1fr,1fr,1.2fr] gap-3 md:gap-4 items-center">
                        
                        {/* Name Column */}
                        <div className="font-bold text-gray-800">
                          {item.id.includes('manual') ? (
                            <input 
                              placeholder="اسم المنتج الجديد..."
                              className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-300 rounded-lg p-2 font-bold outline-none"
                              value={item.productName}
                              onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                            />
                          ) : (
                            <div className="text-sm md:text-base leading-tight">{item.productName}</div>
                          )}
                        </div>

                        {/* Price Column */}
                        <div className="flex items-center gap-2">
                          <span className="md:hidden text-[9px] font-black text-gray-400 uppercase w-12">السعر:</span>
                          <input 
                            type="number" placeholder="0.00" 
                            className="flex-1 md:w-full bg-slate-50 border-2 border-transparent focus:border-rose-200 rounded-xl p-2 md:p-3 text-center font-bold text-rose-900 outline-none"
                            value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                          />
                        </div>

                        {/* Qty Column */}
                        <div className="flex items-center gap-2">
                          <span className="md:hidden text-[9px] font-black text-gray-400 uppercase w-12">العدد:</span>
                          <input 
                            type="number" placeholder="0" 
                            className={`flex-1 md:w-full bg-slate-50 border-2 border-transparent focus:border-blue-300 rounded-xl p-2 md:p-3 text-center font-black outline-none ${item.quantity > 0 ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                            value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          />
                        </div>

                        {/* Total Column */}
                        <div className="flex items-center gap-2">
                          <span className="md:hidden text-[9px] font-black text-gray-400 uppercase w-12">إجمالي:</span>
                          <div className="flex-1 md:w-full bg-slate-100 rounded-xl p-2 md:p-3 text-center font-black text-gray-700 text-sm">
                            {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()} <span className="text-[10px] opacity-40">ج.م</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={() => addItemManual(cat)}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-black text-[11px] flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-rose-600 transition-all mt-4"
                  >
                    <PlusCircle size={18}/> إضافة صنف غير مدرج لقسم {getCategoryLabel(cat)}
                  </button>
                </div>
              </div>
            ))}

            <button 
              onClick={handleSave}
              className="w-full bg-rose-800 text-white py-6 rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-rose-900 hover:scale-[1.01] transition-all shadow-2xl active:scale-95"
            >
              <Save size={28}/> ترحيل وحفظ المبيعات النهائية
            </button>
          </div>
        )}

        {!selectedMarket && (
          <div className="py-24 text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-200">
              <ShoppingBag size={40} />
            </div>
            <p className="text-gray-400 font-black">يرجى اختيار ماركت من القائمة بالأعلى لبدء تسجيل المبيعات</p>
          </div>
        )}
      </div>

      {isAddMarketModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-rose-900 mb-6">إضافة ماركت جديد</h3>
            <input 
              className="w-full bg-slate-50 p-5 rounded-xl outline-none font-bold border-2 border-transparent focus:border-rose-300"
              placeholder="أدخل اسم الماركت الجديد..."
              value={newMarketName}
              onChange={(e) => setNewMarketName(e.target.value)}
            />
            <div className="flex gap-4 mt-8">
              <button onClick={() => {
                if(newMarketName.trim()){
                  push(ref(db, 'markets'), { name: newMarketName.trim(), creatorId: user.id });
                  setNewMarketName('');
                  setIsAddMarketModalOpen(false);
                }
              }} className="flex-1 bg-rose-800 text-white py-4 rounded-xl font-black">إضافة</button>
              <button onClick={() => setIsAddMarketModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySales;
