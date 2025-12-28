
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db, ref, onValue } from '../firebase';
import { COMPANIES } from '../constants';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
  markets: string[];
}

const CompetitorReports: React.FC<Props> = ({ user, markets }) => {
  const [prices, setPrices] = useState<any[]>([]);
  const [filterMarket, setFilterMarket] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  useEffect(() => {
    const pRef = ref(db, 'competitor_prices');
    onValue(pRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPrices(Object.entries(data).map(([id, val]: any) => ({ ...val, id })));
      }
    });
  }, []);

  const filtered = prices.filter(p => {
    const matchM = filterMarket ? p.marketName === filterMarket : true;
    const matchC = filterCompany ? p.companyName === filterCompany : true;
    return matchM && matchC;
  });

  const exportExcel = () => {
    const data = filtered.flatMap(p => {
      const rows: any[] = [];
      Object.entries(p.categories).forEach(([cat, items]: any) => {
        items.forEach((item: any) => {
          rows.push({
            'الماركت': p.marketName,
            'الشركة': p.companyName,
            'الفئة': cat,
            'المنتج': item.name,
            'السعر': item.price
          });
        });
      });
      return rows;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقارير المنافسين");
    XLSX.writeFile(wb, "تقارير_المنافسين.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold text-rose-800 mb-6">تقارير المنافسين</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <select 
            className="border rounded-lg p-2"
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
          >
            <option value="">كل الماركت</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select 
            className="border rounded-lg p-2"
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
          >
            <option value="">كل الشركات</option>
            {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button 
            onClick={exportExcel}
            className="bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 px-4 hover:bg-green-700 transition"
          >
            <Download size={20}/> تصدير اكسيل
          </button>
        </div>

        <div className="space-y-4">
          {filtered.map(report => (
            <div key={report.id} className="border rounded-xl p-4 bg-gray-50">
              <div className="flex justify-between items-center border-b pb-2 mb-3">
                <span className="font-bold text-rose-700">{report.marketName} - {report.companyName}</span>
                <span className="text-xs text-gray-500">{new Date(report.date).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(report.categories).map(([cat, items]: any) => (
                  <div key={cat} className="bg-white p-2 rounded border text-xs">
                    <div className="font-bold mb-1 border-b pb-1 text-gray-600">
                      {cat === 'facial' ? 'Facial' : cat === 'kitchen' ? 'Kitchen' : 'Toilet'}
                    </div>
                    {items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between py-1">
                        <span>{item.name}</span>
                        <span className="font-bold">{item.price} ج.م</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-10 text-gray-500">لا توجد بيانات متاحة</div>}
        </div>
      </div>
    </div>
  );
};

export default CompetitorReports;
