
import React, { useState, useEffect } from 'react';
import { User, SaleItem, DailySale } from '../types';
import { PRODUCT_GROUPS } from '../constants';
import { Plus, Trash2, Save } from 'lucide-react';
import { db, ref, push, set } from '../firebase';

interface Props {
  user: User;
  markets: string[];
}

const DailySales: React.FC<Props> = ({ user, markets }) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customProducts, setCustomProducts] = useState<string[]>([]);

  const addProductRow = () => {
    setItems([...items, { id: Date.now().toString(), category: '', productName: '', price: 0, quantity: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSave = async () => {
    if (!selectedMarket || items.length === 0) {
      alert("يرجى اختيار ماركت وإضافة أصناف");
      return;
    }

    const sale: Partial<DailySale> = {
      userId: user.id,
      userName: user.employeeName,
      marketName: selectedMarket,
      date: new Date().toISOString(),
      items,
      total: calculateTotal()
    };

    try {
      const salesRef = ref(db, 'sales');
      await push(salesRef, sale);
      alert("تم الحفظ والترحيل بنجاح");
      setItems([]);
      setSelectedMarket('');
    } catch (e) {
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-rose-800 mb-6">المبيعات اليومية</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">اسم الماركت</label>
            <div className="flex gap-2">
              <select 
                className="flex-1 border rounded-lg p-2"
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
              >
                <option value="">اختر الماركت</option>
                {markets.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button className="bg-rose-100 text-rose-700 px-3 py-2 rounded-lg hover:bg-rose-200">
                اضف ماركت
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Facial Group */}
          <div>
            <div className="bg-gray-200 p-2 font-bold mb-3 rounded">مناديل السحب</div>
            {items.filter(i => i.category === 'facial').map(item => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-end">
                <select 
                  className="border rounded p-2"
                  value={item.productName}
                  onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                >
                  <option value="">اختر الصنف</option>
                  {PRODUCT_GROUPS.facial.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input 
                  type="number" placeholder="السعر" className="border rounded p-2"
                  value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                />
                <input 
                  type="number" placeholder="الكمية" className="border rounded p-2"
                  value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                />
                <button onClick={() => removeItem(item.id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={20}/></button>
              </div>
            ))}
            <button 
              onClick={() => setItems([...items, { id: Math.random().toString(), category: 'facial', productName: '', price: 0, quantity: 0 }])}
              className="flex items-center gap-2 text-rose-600 font-medium hover:underline text-sm"
            >
              <Plus size={16}/> اضف منتج (Facial)
            </button>
          </div>

          {/* Kitchen Group */}
          <div>
            <div className="bg-gray-200 p-2 font-bold mb-3 rounded">مناديل مطبخ</div>
            {items.filter(i => i.category === 'kitchen').map(item => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-end">
                <select className="border rounded p-2" value={item.productName} onChange={(e) => updateItem(item.id, 'productName', e.target.value)}>
                  <option value="">اختر الصنف</option>
                  {PRODUCT_GROUPS.kitchen.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="number" placeholder="السعر" className="border rounded p-2" value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))} />
                <input type="number" placeholder="الكمية" className="border rounded p-2" value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))} />
                <button onClick={() => removeItem(item.id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={20}/></button>
              </div>
            ))}
            <button onClick={() => setItems([...items, { id: Math.random().toString(), category: 'kitchen', productName: '', price: 0, quantity: 0 }])} className="flex items-center gap-2 text-rose-600 font-medium hover:underline text-sm">
              <Plus size={16}/> اضف منتج (Kitchen)
            </button>
          </div>

          {/* Toilet Group */}
          <div>
            <div className="bg-gray-200 p-2 font-bold mb-3 rounded">مناديل تواليت</div>
            {items.filter(i => i.category === 'toilet').map(item => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-end">
                <select className="border rounded p-2" value={item.productName} onChange={(e) => updateItem(item.id, 'productName', e.target.value)}>
                  <option value="">اختر الصنف</option>
                  {PRODUCT_GROUPS.toilet.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="number" placeholder="السعر" className="border rounded p-2" value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))} />
                <input type="number" placeholder="الكمية" className="border rounded p-2" value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))} />
                <button onClick={() => removeItem(item.id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={20}/></button>
              </div>
            ))}
            <button onClick={() => setItems([...items, { id: Math.random().toString(), category: 'toilet', productName: '', price: 0, quantity: 0 }])} className="flex items-center gap-2 text-rose-600 font-medium hover:underline text-sm">
              <Plus size={16}/> اضف منتج (Toilet)
            </button>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t flex flex-col items-center gap-4">
          <div className="text-xl font-bold text-gray-800">
            إجمالي المبيعات: <span className="text-rose-600">{calculateTotal().toLocaleString()} ج.م</span>
          </div>
          <button 
            onClick={handleSave}
            className="w-full md:w-64 bg-rose-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition"
          >
            <Save size={20}/> حفظ وترحيل
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailySales;
