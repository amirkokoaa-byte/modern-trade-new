
import React, { useState, useEffect, useMemo } from 'react';
import { User, DailySale, SaleItem } from '../types';
import { Search, Download, Trash2, Edit, Trophy, BarChart3, FileSpreadsheet, ListFilter, X } from 'lucide-react';
import { db, ref, onValue, remove } from '../firebase';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
  markets: string[];
  users: User[];
}

const SalesHistory: React.FC<Props> = ({ user, markets = [], users = [] }) => {
  const [sales, setSales] = useState<DailySale[]>([]);
  const [selectedSale, setSelectedSale] = useState<DailySale | null>(null);
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    employeeId: '',
    marketName: ''
  });

  useEffect(() => {
    const salesRef = ref(db, 'sales');
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let salesList = Object.entries(data).map(([id, val]: any) => ({ ...val, id }));
        
        if (user.role === 'coordinator' || user.role === 'usher') {
           if (!user.permissions?.viewColleaguesSales) {
             salesList = salesList.filter(s => s.userId === user.id);
           }
        }
        setSales(salesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } else {
        setSales([]);
      }
    });
  }, [user]);

  const stats = useMemo(() => {
    if (!sales.length) return { star: null, topItems: [] };
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthSales = sales.filter(s => {
      const sDate = new Date(s.date);
      return sDate >= firstDay && sDate <= lastDay;
    });

    const empPerformance: Record<string, {name: string, total: number}> = {};
    const itemPerformance: Record<string, {quantity: number, total: number}> = {};

    monthSales.forEach(s => {
      if (!empPerformance[s.userId]) empPerformance[s.userId] = { name: s.userName, total: 0 };
      empPerformance[s.userId].total += (s.total || 0);

      if (s.items && Array.isArray(s.items)) {
        s.items.forEach(item => {
          if (!itemPerformance[item.productName]) itemPerformance[item.productName] = { quantity: 0, total: 0 };
          itemPerformance[item.productName].quantity += Number(item.quantity || 0);
          itemPerformance[item.productName].total += (Number(item.price || 0) * Number(item.quantity || 0));
        });
      }
    });

    const starList = Object.values(empPerformance).sort((a, b) => b.total - a.total);
    const star = starList.length > 0 ? starList[0] : null;

    const topItems = Object.entries(itemPerformance)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return { star, topItems };
  }, [sales]);

  const filteredSales = sales.filter(s => {
    const sDate = s.date ? s.date.split('T')[0] : '';
    const matchStart = filters.dateStart ? sDate >= filters.dateStart : true;
    const matchEnd = filters.dateEnd ? sDate <= filters.dateEnd : true;
    const matchEmp = filters.employeeId ? s.userId === filters.employeeId : true;
    const matchMarket = filters.marketName ? s.marketName === filters.marketName : true;
    return matchStart && matchEnd && matchEmp && matchMarket;
  });

  return (
    <div className="space-y-8 pb-20 px-2 md:px-0">
      {/* Stats Section with Protection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-rose-50 shadow-sm relative overflow-hidden group">
          <div className="relative z-10 flex items-center gap-6">
            <div className="p-5 bg-amber-100 text-amber-600 rounded-2xl"><Trophy size={32} /></div>
            <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">نجم الشهر الحالي</p>
              {stats.star ? (
                <>
                  <h3 className="text-xl md:text-2xl font-black text-rose-900">{stats.star.name}</h3>
                  <p className="text-xs font-bold text-gray-400 mt-1">المبيعات: <span className="text-rose-600">{stats.star.total.toLocaleString()} ج.م</span></p>
                </>
              ) : <p className="text-gray-300 font-bold">لا توجد بيانات كافية</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-rose-50 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={20} /></div>
            <h3 className="text-base font-black text-rose-900">الأصناف الأكثر مبيعاً</h3>
          </div>
          <div className="space-y-2">
            {stats.topItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs font-bold">
                <span className="text-gray-600">{item.name}</span>
                <span className="text-blue-600">{item.quantity} قطعه</span>
              </div>
            ))}
            {!stats.topItems.length && <p className="text-center py-4 text-gray-300">لا توجد إحصائيات</p>}
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-rose-50">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-rose-900 text-white rounded-2xl"><ListFilter size={20}/></div>
             <h2 className="text-xl font-black text-rose-900 leading-none">تصفية وبحث السجل</h2>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <input type="date" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart:e.target.value})}/>
          <input type="date" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd:e.target.value})}/>
          <select className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" value={filters.employeeId} onChange={e => setFilters({...filters, employeeId:e.target.value})}>
            <option value="">كل الموظفين</option>
            {users && users.map(u => <option key={u.id} value={u.id}>{u.employeeName}</option>)}
          </select>
          <select className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" value={filters.marketName} onChange={e => setFilters({...filters, marketName:e.target.value})}>
            <option value="">كل الماركت</option>
            {markets && markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Sales Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-50">
          <table className="w-full text-right border-collapse min-w-[600px]">
            <thead className="bg-slate-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
              <tr>
                <th className="p-6">التاريخ</th>
                <th className="p-6">الموظف</th>
                <th className="p-6">الماركت</th>
                <th className="p-6">القيمة</th>
                <th className="p-6 text-center">عرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-rose-50/30 transition-colors cursor-pointer" onClick={() => setSelectedSale(sale)}>
                  <td className="p-6 font-bold text-gray-700 text-sm">
                    {sale.date ? new Date(sale.date).toLocaleDateString('ar-EG') : '---'}
                  </td>
                  <td className="p-6 font-bold text-gray-600 text-sm">{sale.userName || 'مجهول'}</td>
                  <td className="p-6">
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">{sale.marketName}</span>
                  </td>
                  <td className="p-6 font-black text-rose-900 text-sm">{(sale.total || 0).toLocaleString()} <span className="text-[10px] opacity-40">ج.م</span></td>
                  <td className="p-6 text-center">
                    <button className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><Search size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredSales.length && <div className="py-20 text-center text-gray-300 font-bold italic">لا توجد بيانات مطابقة</div>}
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-rose-900 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">تفاصيل فاتورة المبيعات</h3>
                <p className="text-[10px] font-bold text-rose-300 uppercase mt-1">{selectedSale.marketName} • {new Date(selectedSale.date).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                  <span className="col-span-1">الصنف</span>
                  <span className="text-center">السعر</span>
                  <span className="text-center">العدد</span>
                  <span className="text-center">الإجمالي</span>
                </div>
                {selectedSale.items?.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl items-center text-xs font-bold">
                    <span className="text-gray-800 leading-tight">{item.productName}</span>
                    <span className="text-center text-rose-600">{item.price} ج.م</span>
                    <span className="text-center text-blue-600">{item.quantity}</span>
                    <span className="text-center text-gray-900">{(item.price * item.quantity).toLocaleString()} ج.م</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 bg-rose-50 border-t flex justify-between items-center">
               <span className="font-black text-rose-900">الإجمالي النهائي للعملية</span>
               <span className="text-2xl font-black text-rose-900">{selectedSale.total?.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
