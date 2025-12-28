
import React, { useState } from 'react';
import { User } from '../types';
import { COMPANIES, PRODUCT_GROUPS } from '../constants';
import { Save, Plus, Trash2 } from 'lucide-react';
import { db, ref, push } from '../firebase';

interface Props {
  user: User;
  markets: string[];
}

const CompetitorPrices: React.FC<Props> = ({ user, markets }) => {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [prices, setPrices] = useState<Record<string, { name: string, price: number }[]>>({
    facial: [],
    kitchen: [],
    toilet: []
  });

  const addPriceRow = (category: string) => {
    setPrices(prev => ({
      ...prev,
      [category]: [...prev[category], { name: '', price: 0 }]
    }));
  };

  const removePriceRow = (category: string, index: number) => {
    setPrices(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const updatePriceRow = (category: string, index: number, field: string, value: any) => {
    setPrices(prev => {
      const updated = [...prev[category]];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [category]: updated };
    });
  };

  const handleSave = async () => {
    if (!selectedMarket || !selectedCompany) {
      alert("يرجى اختيار الماركت والشركة");
      return;
    }

    try {
      await push(ref(db, 'competitor_prices'), {
        userId: user.id,
        marketName: selectedMarket,
        companyName: selectedCompany,
        date: new Date().toISOString(),
        categories: prices
      });
      alert("تم حفظ الأسعار بنجاح");
      setPrices({ facial: [], kitchen: [], toilet: [] });
    } catch (e) {
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-rose-800 mb-6">تسجيل أسعار المنافسين</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-1">الماركت</label>
            <select 
              className="w-full border rounded-lg p-2"
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
            >
              <option value="">اختر الماركت</option>
              {markets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الشركة</label>
            <select 
              className="w-full border rounded-lg p-2"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value="">اختر الشركة</option>
              {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {['facial', 'kitchen', 'toilet'].map(cat => (
          <div key={cat} className="mb-8">
            <div className="bg-gray-200 p-2 font-bold mb-3 rounded">
              {cat === 'facial' ? 'مناديل سحب (Facial)' : cat === 'kitchen' ? 'مناديل مطبخ (Kitchen)' : 'تواليت (Toilet)'}
            </div>
            <div className="space-y-2 mb-3">
              {prices[cat].map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    placeholder="اسم الصنف" className="flex-1 border rounded p-2 text-sm"
                    value={row.name} onChange={(e) => updatePriceRow(cat, idx, 'name', e.target.value)}
                  />
                  <input 
                    type="number" placeholder="السعر" className="w-24 border rounded p-2 text-sm"
                    value={row.price || ''} onChange={(e) => updatePriceRow(cat, idx, 'price', Number(e.target.value))}
                  />
                  <button onClick={() => removePriceRow(cat, idx)} className="text-red-500 p-2"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => addPriceRow(cat)}
              className="text-rose-600 text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <Plus size={16}/> اضف منتج
            </button>
          </div>
        ))}

        <div className="mt-10 border-t pt-6">
          <button 
            onClick={handleSave}
            className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition"
          >
            <Save size={20}/> حفظ الأسعار
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetitorPrices;
