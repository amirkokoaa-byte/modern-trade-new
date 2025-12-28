
import React, { useState } from 'react';
import { User } from '../types';
import { PRODUCT_GROUPS } from '../constants';
import { Save, Plus } from 'lucide-react';
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

    // Fix: Explicitly cast qty to number to avoid 'unknown' type error when using Object.entries
    const items = Object.entries(inventory)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([name, qty]) => ({ productName: name, quantity: qty as number }));

    if (items.length === 0) {
      alert("يرجى إدخال كميات للأصناف");
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
      alert("تم حفظ المخزون بنجاح");
      setInventory({});
      setSelectedMarket('');
    } catch (e) {
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-rose-800 mb-6">تسجيل المخزون</h2>
        
        <div className="mb-8">
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
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(PRODUCT_GROUPS).map(([key, products]) => (
            <div key={key}>
              <div className="bg-gray-200 p-2 font-bold mb-3 rounded text-gray-700">
                {key === 'facial' ? 'مناديل السحب' : key === 'kitchen' ? 'مناديل مطبخ' : key === 'toilet' ? 'مناديل تواليت' : 'مناديل دولفن'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(p => (
                  <div key={p} className="flex items-center justify-between p-2 border rounded-lg bg-gray-50">
                    <span className="text-sm">{p}</span>
                    <input 
                      type="number" 
                      placeholder="الكمية" 
                      className="w-24 border rounded p-1 text-center"
                      value={inventory[p] || ''}
                      onChange={(e) => handleUpdateQuantity(p, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-6">
          <button 
            onClick={handleSave}
            className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition shadow-lg shadow-rose-100"
          >
            <Save size={20}/> حفظ المخزون
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryRegistration;
