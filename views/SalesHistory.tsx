
import React, { useState, useEffect, useMemo } from 'react';
import { User, DailySale, SaleItem } from '../types';
import { Search, Download, Trash2, Edit, Trophy, BarChart3, FileSpreadsheet, ListFilter, X, Clock, Calendar as CalendarIcon } from 'lucide-react';
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

  const handleDelete = (id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من حذف هذه العملية نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) {
      remove(ref(db, `sales/${id}`));
      alert("تم الحذف بنجاح");
    }
  };

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
    <div className="space-y-6 pb-20 px-1 md:px-0">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-rose-50 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Trophy size={28} /></div>
          <div>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-0.5">نجم مبيعات الشهر</p>
            {stats.star ? (
              <h3 className="text-lg font-black text-rose-900">{stats.star.name}</h3>
            ) : <p className="text-gray-300 text-xs">جاري الحساب...</p>}
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-rose-50 shadow-sm flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><BarChart3 size={24} /></div>
             <span className="text-xs font-black text-gray-500">إجمالي السجلات: {filteredSales.length}</span>
           </div>
           <button onClick={() => {
              const data = filteredSales.map(s => ({ "الماركت": s.marketName, "الموظف": s.userName, "التاريخ": s.date, "الإجمالي": s.total }));
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Sales");
              XLSX.writeFile(wb, "SalesHistory.xlsx");
           }} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"><FileSpreadsheet size={20}/></button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-rose-50">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <input type="date" className="bg-slate-50 p-3 rounded-xl font-bold text-[11px] outline-none border-2 border-transparent focus:border-rose-200" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart:e.target.value})}/>
          <input type="date" className="bg-slate-50 p-3 rounded-xl font-bold text-[11px] outline-none border-2 border-transparent focus:border-rose-200" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd:e.target.value})}/>
          <select className="bg-slate-50 p-3 rounded-xl font-bold text-[11px] outline-none border-2 border-transparent focus:border-rose-200" value={filters.employeeId} onChange={e => setFilters({...filters, employeeId:e.target.value})}>
            <option value="">كل الموظفين</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.employeeName}</option>)}
          </select>
          <select className="bg-slate-50 p-3 rounded-xl font-bold text-[11px] outline-none border-2 border-transparent focus:border-rose-200" value={filters.marketName} onChange={e => setFilters({...filters, marketName:e.target.value})}>
            <option value="">كل الماركت</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Sales Table - Reduced Font Size and Detailed Columns */}
        <div className="overflow-x-auto rounded-2xl border border-slate-50">
          <table className="w-full text-right border-collapse min-w-[700px]">
            <thead className="bg-slate-50 text-[9px] uppercase font-black text-gray-400 tracking-widest">
              <tr>
                <th className="p-4">الماركت</th>
                <th className="p-4">الموظف</th>
                <th className="p-4">اليوم</th>
                <th className="p-4">الساعة</th>
                <th className="p-4">القيمة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map(sale => {
                const sDate = new Date(sale.date);
                return (
                  <tr key={sale.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-black text-rose-900 text-[11px]">{sale.marketName}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-gray-600 text-[10px]">{sale.userName}</td>
                    <td className="p-4 font-bold text-gray-500 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon size={12} className="opacity-40" />
                        {sDate.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-blue-500 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="opacity-40" />
                        {sDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-4 font-black text-gray-900 text-[11px]">{(sale.total || 0).toLocaleString()} ج.م</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setSelectedSale(sale)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200" title="عرض التفاصيل"><Search size={14}/></button>
                        
                        {user.role === 'admin' && (
                          <>
                            <button onClick={() => { setSelectedSale(sale); setIsEditing(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all" title="تعديل"><Edit size={14}/></button>
                            <button onClick={() => handleDelete(sale.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all" title="حذف"><Trash2 size={14}/></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredSales.length && <div className="py-20 text-center text-gray-300 font-bold italic text-xs">لا توجد بيانات متاحة حالياً</div>}
        </div>
      </div>

      {/* Details / Edit Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-rose-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">{isEditing ? 'تعديل فاتورة البيع' : 'تفاصيل الفاتورة'}</h3>
                <p className="text-[9px] font-bold text-rose-300 uppercase mt-1">{selectedSale.marketName} • {new Date(selectedSale.date).toLocaleString('ar-EG')}</p>
              </div>
              <button onClick={() => { setSelectedSale(null); setIsEditing(false); }} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              <div className="grid grid-cols-4 gap-2 text-[9px] font-black text-gray-400 uppercase text-center">
                <span className="text-right">الصنف</span>
                <span>السعر</span>
                <span>العدد</span>
                <span>الإجمالي</span>
              </div>
              
              {selectedSale.items?.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl items-center text-[11px] font-bold">
                  <span className="text-gray-800 leading-tight">{item.productName}</span>
                  <div className="text-center">
                    {isEditing ? (
                      <input 
                        type="number" 
                        className="w-16 bg-white border border-slate-200 rounded p-1 text-center"
                        value={item.price}
                        onChange={(e) => {
                          const newItems = [...selectedSale.items];
                          newItems[idx].price = Number(e.target.value);
                          setSelectedSale({...selectedSale, items: newItems});
                        }}
                      />
                    ) : <span>{item.price}</span>}
                  </div>
                  <div className="text-center">
                    {isEditing ? (
                      <input 
                        type="number" 
                        className="w-16 bg-white border border-slate-200 rounded p-1 text-center"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...selectedSale.items];
                          newItems[idx].quantity = Number(e.target.value);
                          setSelectedSale({...selectedSale, items: newItems});
                        }}
                      />
                    ) : <span>{item.quantity}</span>}
                  </div>
                  <span className="text-center text-rose-600">{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="p-6 bg-rose-50 border-t flex justify-between items-center">
               <span className="font-black text-rose-900 text-sm">صافي القيمة الإجمالية</span>
               <div className="flex items-center gap-4">
                  <span className="text-xl font-black text-rose-900">
                    {selectedSale.items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString()} ج.م
                  </span>
                  {isEditing && (
                    <button 
                      onClick={async () => {
                        const newTotal = selectedSale.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                        await update(ref(db, `sales/${selectedSale.id}`), {
                          items: selectedSale.items,
                          total: newTotal
                        });
                        alert("تم تحديث البيانات بنجاح");
                        setSelectedSale(null);
                        setIsEditing(false);
                      }}
                      className="bg-rose-800 text-white px-6 py-2 rounded-xl font-black text-sm"
                    >حفظ التعديلات</button>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
