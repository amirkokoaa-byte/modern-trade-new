
import React, { useState, useEffect } from 'react';
import { User, SaleItem, DailySale } from '../types';
import { PRODUCT_GROUPS } from '../constants';
import { Plus, Trash2, Save, ShoppingBag, PlusCircle } from 'lucide-react';
import { db, ref, push, set } from '../firebase';

interface Props {
  user: User;
  markets: string[];
}

const DailySales: React.FC<Props> = ({ user, markets }) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [isAddMarketModalOpen, setIsAddMarketModalOpen] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');

  // When a market is selected, auto-populate the list with all products
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
    return items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  };

  const handleSave = async () => {
    if (!selectedMarket) {
      alert("يرجى اختيار الماركت أولاً");
      return;
    }

    const finalItems = items.filter(i => i.quantity > 0 && i.productName.trim() !== '');
    if (finalItems.length === 0) {
      alert("يرجى إدخال كمية لمنتج واحد على الأقل واسم المنتج");
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
      alert("تم حفظ المبيعات بنجاح، يمكنك رؤيتها الآن في سجل المبيعات");
      setSelectedMarket('');
      setItems([]);
    } catch (e) {
      alert("حدث خطأ أثناء الاتصال بالقاعدة");
    }
  };

  const handleAddMarket = async () => {
    if (!newMarketName.trim()) return;
    await push(ref(db, 'markets'), {
      name: newMarketName.trim(),
      creatorId: user.id
    });
    setNewMarketName('');
    setIsAddMarketModalOpen(false);
    alert("تمت إضافة الماركت بنجاح");
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
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-rose-50 p-8 md:p-10">
        {/* Total Sales Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-rose-800 text-white rounded-3xl">
              <ShoppingBag size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-rose-900 leading-none">إجمالي المبيعات اليومية</h2>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1">Daily Sales Total Value</p>
            </div>
          </div>
          <div className="text-5xl font-black text-rose-900">
            {calculateTotal().toLocaleString()} <span className="text-lg">ج.م</span>
          </div>
        </div>
        
        <div className="mb-10 flex items-end gap-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <div className="flex-1">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 mr-2">اختيار الماركت</label>
            <select 
              className="w-full bg-white border-2 border-transparent focus:border-rose-200 rounded-2xl p-4 outline-none font-bold text-gray-700 shadow-sm"
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
            >
              <option value="">-- اضغط لاختيار الماركت --</option>
              {markets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button 
            onClick={() => setIsAddMarketModalOpen(true)}
            className="p-4 bg-rose-800 text-white rounded-2xl hover:bg-rose-900 transition-all shadow-lg shadow-rose-100"
            title="إضافة ماركت جديد"
          >
            <Plus size={24} />
          </button>
        </div>

        {selectedMarket && (
          <div className="space-y-12">
            {['facial', 'kitchen', 'hotel_toilet', 'dolphin'].map(cat => (
              <div key={cat} className="space-y-4">
                <div className="bg-slate-800 px-6 py-4 font-black text-white rounded-2xl flex items-center justify-between">
                  <span className="text-sm">{getCategoryLabel(cat)}</span>
                </div>
                
                <div className="space-y-3">
                  <div className="hidden md:grid grid-cols-[1fr,120px,120px,120px] gap-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>عنوان الصنف</span>
                    <span className="text-center">سعر القطعة</span>
                    <span className="text-center">العدد</span>
                    <span className="text-center">الإجمالي</span>
                  </div>

                  {items.filter(i => i.category === cat).map(item => (
                    <div key={item.id} className="p-4 bg-white border border-slate-100 rounded-3xl hover:border-rose-200 hover:shadow-md transition-all">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr,120px,120px,120px] gap-4 items-center">
                        <div>
                          {item.id.includes('manual') ? (
                            <input 
                              placeholder="أدخل اسم الصنف الجديد..."
                              className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-200 rounded-xl p-3 font-bold text-gray-800"
                              value={item.productName}
                              onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                            />
                          ) : (
                            <p className="font-black text-gray-700 md:px-2">{item.productName}</p>
                          )}
                        </div>
                        <div className="flex flex-col md:items-center">
                          <label className="md:hidden text-[10px] font-black text-gray-400 uppercase mb-1">سعر القطعة</label>
                          <input 
                            type="number" placeholder="0.00" 
                            className="w-full md:w-24 bg-slate-50 border-2 border-transparent focus:border-rose-200 rounded-xl p-3 text-center font-bold text-rose-900"
                            value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col md:items-center">
                          <label className="md:hidden text-[10px] font-black text-gray-400 uppercase mb-1">العدد</label>
                          <input 
                            type="number" placeholder="0" 
                            className={`w-full md:w-24 bg-slate-50 border-2 border-transparent focus:border-blue-200 rounded-xl p-3 text-center font-black ${item.quantity > 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
                            value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col md:items-center">
                          <label className="md:hidden text-[10px] font-black text-gray-400 uppercase mb-1">الإجمالي</label>
                          <div className="w-full md:w-24 bg-slate-100 rounded-xl p-3 text-center font-black text-gray-800">
                            {(Number(item.price) * Number(item.quantity)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={() => addItemManual(cat)}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-rose-200 hover:text-rose-600 transition-all"
                  >
                    <PlusCircle size={20}/> إضافة منتج جديد لهذا القسم
                  </button>
                </div>
              </div>
            ))}

            <button 
              onClick={handleSave}
              className="w-full bg-rose-800 text-white py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:bg-rose-900 hover:scale-[1.02] transition-all shadow-2xl shadow-rose-200 mt-12"
            >
              <Save size={24}/> ترحيل وحفظ المبيعات النهائية
            </button>
          </div>
        )}

        {!selectedMarket && (
          <div className="py-24 text-center">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-200">
              <ShoppingBag size={48} />
            </div>
            <p className="text-gray-400 font-black">يرجى اختيار ماركت من القائمة بالأعلى لبدء تسجيل المبيعات</p>
          </div>
        )}
      </div>

      {isAddMarketModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-rose-900 mb-6">إضافة ماركت جديد</h3>
            <input 
              className="w-full bg-slate-50 p-5 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-rose-200"
              placeholder="أدخل اسم الماركت الجديد..."
              value={newMarketName}
              onChange={(e) => setNewMarketName(e.target.value)}
            />
            <div className="flex gap-4 mt-8">
              <button onClick={handleAddMarket} className="flex-1 bg-rose-800 text-white py-4 rounded-2xl font-black shadow-lg">إضافة الماركت</button>
              <button onClick={() => setIsAddMarketModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySales;
