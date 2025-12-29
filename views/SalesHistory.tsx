
import React, { useState, useEffect, useMemo } from 'react';
import { User, DailySale } from '../types';
import { Trash2, Edit, Trophy, BarChart3, FileSpreadsheet, X, Clock, Calendar as CalendarIcon, User as UserIcon, Store, History } from 'lucide-react';
import { db, ref, onValue, remove, update } from '../firebase';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
  markets: string[];
  users: User[];
}

const SalesHistory: React.FC<Props> = ({ user, markets = [], users = [] }) => {
  const [sales, setSales] = useState<DailySale[]>([]);
  const [selectedSale, setSelectedSale] = useState<DailySale | null>(null);
  const [isEditing, setIsEditing] = useState(false);
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
           const up = user.permissions || { viewColleaguesSales: false };
           if (!up.viewColleaguesSales) {
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
    const now = new Date();
    const currentMonthSales = sales.filter(s => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const userTotals: Record<string, {name: string, total: number}> = {};
    const productTotals: Record<string, {quantity: number, total: number}> = {};

    currentMonthSales.forEach(s => {
      const uid = s.userId || 'unknown';
      if (!userTotals[uid]) userTotals[uid] = { name: s.userName || 'غير معروف', total: 0 };
      userTotals[uid].total += (Number(s.total) || 0);

      (s.items || []).forEach(item => {
        const pname = item.productName || 'صنف غير معروف';
        if (!productTotals[pname]) productTotals[pname] = { quantity: 0, total: 0 };
        const q = Number(item.quantity) || 0;
        const p = Number(item.price) || 0;
        productTotals[pname].quantity += q;
        productTotals[pname].total += (q * p);
      });
    });

    const star = Object.values(userTotals).sort((a, b) => b.total - a.total)[0] || null;
    const topProducts = Object.entries(productTotals)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 3);

    return { star, topProducts };
  }, [sales]);

  const handleDelete = (id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من حذف هذه العملية؟")) {
      remove(ref(db, `sales/${id}`));
    }
  };

  const filteredSales = sales.filter(s => {
    const sDate = s.date ? s.date.split('T')[0] : '';
    const matchStart = filters.dateStart ? sDate >= filters.dateStart : true;
    const matchEnd = filters.dateEnd ? sDate <= filters.dateEnd : true;
    const matchEmp = filters.employeeId ? s.userId === filters.employeeId : true;
    const matchMarket = filters.marketName ? s.marketName === filters.marketName : true;
    return matchStart && matchEnd && matchEmp && matchMarket;
  });

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-rose-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-900 text-white rounded-2xl"><History size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-rose-900">سجل المبيعات التفصيلي</h2>
            <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest">Detailed Transaction Log</p>
          </div>
        </div>
        <button onClick={() => {
              const data = filteredSales.flatMap(s => (s.items || []).map(i => ({ 
                "الماركت": s.marketName, "الموظف": s.userName, "التاريخ": s.date?.split('T')[0], 
                "الصنف": i.productName, "السعر": i.price, "الكمية": i.quantity, "الإجمالي": (Number(i.price || 0) * Number(i.quantity || 0))
              })));
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Sales");
              XLSX.writeFile(wb, "SoftRose_Sales.xlsx");
        }} className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg shadow-green-100 hover:bg-green-700 transition-all">
          <FileSpreadsheet size={18}/> تصدير السجل بالكامل
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* نجم الشهر */}
        <div className="bg-gradient-to-br from-rose-800 to-rose-950 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
          <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
          <div className="relative z-10">
            <h3 className="font-black text-xs md:text-sm uppercase mb-4 flex items-center gap-2 tracking-widest text-amber-200">
              <Trophy className="text-amber-400" size={20} /> نجم شهر {new Date().toLocaleDateString('ar-EG', {month: 'long'})}
            </h3>
            {stats.star ? (
              <div>
                <p className="text-xl md:text-2xl font-black mb-1 leading-tight">{stats.star.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-black text-amber-400">{(stats.star.total || 0).toLocaleString()}</span>
                  <span className="text-xs font-bold opacity-60">ج.م مبيعات</span>
                </div>
              </div>
            ) : <p className="text-sm font-bold opacity-50 italic">لا توجد مبيعات مسجلة لهذا الشهر حتى الآن</p>}
            <p className="text-[9px] font-bold opacity-40 mt-4">* يتم التحديث لحظياً من يوم 1 حتى نهاية الشهر</p>
          </div>
        </div>

        {/* الأصناف الأكثر مبيعاً */}
        <div className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-sm overflow-hidden">
          <h3 className="font-black text-xs md:text-sm text-rose-900 mb-4 flex items-center gap-2 uppercase tracking-widest">
            <BarChart3 size={20} className="text-rose-600" /> الأصناف الأكثر مبيعاً
          </h3>
          <div className="space-y-2.5">
            {stats.topProducts.map(([name, data], idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-rose-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xs">{idx + 1}</div>
                  <div className="flex flex-col">
                    <p className="text-xs font-black text-gray-800 leading-none">{name}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{data.quantity} قطعة مباعة</p>
                  </div>
                </div>
                <div className="text-left">
                   <p className="text-sm font-black text-rose-700">{(data.total || 0).toLocaleString()} <span className="text-[10px] opacity-40">ج.م</span></p>
                </div>
              </div>
            ))}
            {stats.topProducts.length === 0 && (
              <p className="text-center py-6 text-gray-300 font-bold italic text-xs">لا توجد بيانات لهذا الشهر</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredSales.map(sale => (
          <div key={sale.id} className="bg-white rounded-[2rem] border border-rose-50 shadow-md overflow-hidden animate-in fade-in duration-300">
            <div className="bg-slate-50 p-4 md:p-6 border-b flex flex-col md:flex-row justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 md:gap-6">
                <div className="flex items-center gap-2"><Store size={18} className="text-rose-600"/><span className="font-black text-rose-900 text-sm">{sale.marketName}</span></div>
                <div className="flex items-center gap-2"><CalendarIcon size={18} className="text-blue-500"/><span className="font-bold text-slate-600 text-[11px]">{sale.date?.split('T')[0]}</span></div>
                <div className="flex items-center gap-2"><UserIcon size={18} className="text-slate-400"/><span className="font-bold text-slate-600 text-[11px]">{sale.userName}</span></div>
              </div>
              {user.role === 'admin' && (
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedSale(sale); setIsEditing(true); }} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all">تعديل</button>
                  <button onClick={() => handleDelete(sale.id)} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-black text-xs hover:bg-red-600 hover:text-white transition-all">حذف</button>
                </div>
              )}
            </div>
            <div className="p-4 md:p-6 overflow-x-auto">
              <table className="w-full text-right text-[10px] md:text-xs">
                <thead className="text-gray-400 font-black uppercase tracking-widest border-b border-slate-50">
                  <tr><th className="p-3">اسم الصنف</th><th className="p-3 text-center">السعر</th><th className="p-3 text-center">العدد</th><th className="p-3 text-center">الإجمالي</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  { (sale.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-gray-700">{item.productName}</td>
                      <td className="p-3 text-center font-bold text-rose-600">{Number(item.price || 0)}</td>
                      <td className="p-3 text-center font-black text-blue-600">{item.quantity}</td>
                      <td className="p-3 text-center font-black text-gray-900">{( (Number(item.price || 0)) * (Number(item.quantity || 0)) ).toLocaleString()} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-rose-900 p-4 md:p-6 text-white flex justify-between items-center">
              <Clock size={16} className="opacity-50" />
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold opacity-60">إجمالي الفاتورة:</span>
                <span className="text-lg md:text-2xl font-black">{(Number(sale.total) || 0).toLocaleString()} <span className="text-xs opacity-50 uppercase">ج.م</span></span>
              </div>
            </div>
          </div>
        ))}
        {filteredSales.length === 0 && (
          <div className="bg-white py-24 rounded-[3rem] text-center border-2 border-dashed border-rose-50">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-200">
              <History size={40} />
            </div>
            <p className="text-gray-400 font-black text-sm">لا توجد عمليات بيع مسجلة حالياً</p>
          </div>
        )}
      </div>

      {selectedSale && isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-rose-900 p-6 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">تعديل سجل مبيعات</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {(selectedSale.items || []).map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl items-center text-[11px] font-bold">
                  <span className="text-gray-800 truncate leading-tight">{item.productName}</span>
                  <input type="number" className="w-16 bg-white border border-slate-200 p-1 rounded text-center outline-none focus:border-rose-300" value={item.price} onChange={(e) => {
                    const newItems = [...(selectedSale.items || [])];
                    newItems[idx].price = Number(e.target.value);
                    setSelectedSale({...selectedSale, items: newItems});
                  }}/>
                  <input type="number" className="w-16 bg-white border border-slate-200 p-1 rounded text-center outline-none focus:border-rose-300" value={item.quantity} onChange={(e) => {
                    const newItems = [...(selectedSale.items || [])];
                    newItems[idx].quantity = Number(e.target.value);
                    setSelectedSale({...selectedSale, items: newItems});
                  }}/>
                  <span className="text-center text-rose-600 font-black">{( (Number(item.price || 0)) * (Number(item.quantity || 0)) ).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="p-6 bg-rose-50 flex justify-between items-center">
               <span className="text-xl font-black text-rose-900">{(selectedSale.items || []).reduce((acc, i) => acc + ( (Number(i.price || 0)) * (Number(i.quantity || 0)) ), 0).toLocaleString()} ج.م</span>
               <button onClick={async () => {
                 const newTotal = (selectedSale.items || []).reduce((acc, i) => acc + ( (Number(i.price || 0)) * (Number(i.quantity || 0)) ), 0);
                 await update(ref(db, `sales/${selectedSale.id}`), { items: selectedSale.items, total: newTotal });
                 setIsEditing(false);
                 alert("تم تحديث السجل بنجاح");
               }} className="bg-rose-800 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-rose-200 hover:bg-rose-900">حفظ التعديلات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
