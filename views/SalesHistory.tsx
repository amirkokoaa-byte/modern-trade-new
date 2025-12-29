
import React, { useState, useEffect, useMemo } from 'react';
import { User, DailySale, SaleItem } from '../types';
import { Search, Trash2, Edit, Trophy, BarChart3, FileSpreadsheet, ListFilter, X, Clock, Calendar as CalendarIcon, User as UserIcon, Store, History, Package } from 'lucide-react';
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

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonthSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const userTotals: Record<string, {name: string, total: number}> = {};
    const productTotals: Record<string, {quantity: number, total: number}> = {};

    currentMonthSales.forEach(s => {
      if (!userTotals[s.userId]) userTotals[s.userId] = { name: s.userName, total: 0 };
      userTotals[s.userId].total += (s.total || 0);

      s.items.forEach(item => {
        if (!productTotals[item.productName]) productTotals[item.productName] = { quantity: 0, total: 0 };
        productTotals[item.productName].quantity += Number(item.quantity);
        productTotals[item.productName].total += (Number(item.price) * Number(item.quantity));
      });
    });

    const star = Object.values(userTotals).sort((a, b) => b.total - a.total)[0] || null;
    const topProducts = Object.entries(productTotals)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 3);

    return { star, topProducts };
  }, [sales]);

  const handleDelete = (id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من حذف هذه العملية نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) {
      remove(ref(db, `sales/${id}`));
      alert("تم الحذف بنجاح");
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

  const getDayName = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long' });
  };

  return (
    <div className="space-y-6 pb-20 px-1 md:px-0" dir="rtl">
      {/* Header Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-rose-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-900 text-white rounded-2xl shadow-lg"><History size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-rose-900 leading-none">سجل المبيعات التفصيلي</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Detailed Transaction Log</p>
          </div>
        </div>
        <button onClick={() => {
              const data = filteredSales.flatMap(s => s.items.map(i => ({ 
                "الماركت": s.marketName, 
                "الموظف": s.userName, 
                "التاريخ": s.date.split('T')[0], 
                "الصنف": i.productName,
                "السعر": i.price,
                "الكمية": i.quantity,
                "الإجمالي": i.price * i.quantity
              })));
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Sales");
              XLSX.writeFile(wb, "SoftRose_Detailed_Sales.xlsx");
        }} className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-green-700 transition-all">
          <FileSpreadsheet size={18}/> تصدير السجل بالكامل
        </button>
      </div>

      {/* Star of the Month & Top Items Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Star of the Month */}
        <div className="bg-gradient-to-br from-rose-800 to-rose-950 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
          <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="text-amber-400" size={24} />
              <h3 className="font-black text-sm uppercase tracking-widest">نجم شهر {new Date().toLocaleDateString('ar-EG', {month: 'long'})}</h3>
            </div>
            {stats.star ? (
              <div>
                <p className="text-2xl font-black mb-1">{stats.star.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">{stats.star.total.toLocaleString()}</span>
                  <span className="text-xs font-bold opacity-60">جنية مبيعات محققة</span>
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold opacity-50 italic">جاري احتساب البيانات...</p>
            )}
            <p className="text-[9px] font-bold opacity-40 mt-4">* يتم التحديث لحظياً من يوم 1 حتى 30 من الشهر</p>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-rose-900">
            <BarChart3 size={24} />
            <h3 className="font-black text-sm uppercase tracking-widest">الأصناف الأكثر مبيعاً</h3>
          </div>
          <div className="space-y-3">
            {stats.topProducts.map(([name, data], idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xs">{idx + 1}</div>
                  <div>
                    <p className="text-xs font-black text-gray-800 leading-none">{name}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">{data.quantity} قطعة مباعة</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-rose-700">{data.total.toLocaleString()} ج.م</p>
                </div>
              </div>
            ))}
            {stats.topProducts.length === 0 && (
              <p className="text-center py-6 text-gray-300 font-bold italic text-xs">لا توجد بيانات مبيعات لهذا الشهر</p>
            )}
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-rose-50">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 mr-2">من تاريخ</label>
            <input type="date" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-[11px] outline-none border-2 border-transparent focus:border-rose-200" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart:e.target.value})}/>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 mr-2">إلى تاريخ</label>
            <input type="date" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-[11px] outline-none border-2 border-transparent focus:border-rose-200" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd:e.target.value})}/>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 mr-2">الموظف</label>
            <select className="w-full bg-slate-50 p-3 rounded-xl font-bold text-[11px] outline-none border-2 border-transparent focus:border-rose-200" value={filters.employeeId} onChange={e => setFilters({...filters, employeeId:e.target.value})}>
              <option value="">كل الموظفين</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.employeeName}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 mr-2">الماركت</label>
            <select className="w-full bg-slate-50 p-3 rounded-xl font-bold text-[11px] outline-none border-2 border-transparent focus:border-rose-200" value={filters.marketName} onChange={e => setFilters({...filters, marketName:e.target.value})}>
              <option value="">كل الماركت</option>
              {markets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Sales Cards - Mobile Optimized Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredSales.map(sale => {
          const sDate = new Date(sale.date);
          return (
            <div key={sale.id} className="bg-white rounded-[2rem] border border-rose-50 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              
              {/* Card Header: Market, Day, Employee */}
              <div className="bg-slate-50 p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 md:gap-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-rose-100 text-rose-700 rounded-lg"><Store size={18}/></div>
                    <span className="font-black text-rose-900 text-sm md:text-lg">{sale.marketName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><CalendarIcon size={18}/></div>
                    <span className="font-bold text-slate-600 text-[11px] md:text-sm">
                      {getDayName(sale.date)} - {sDate.toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-200 text-slate-600 rounded-lg"><UserIcon size={18}/></div>
                    <span className="font-bold text-slate-600 text-[11px] md:text-sm">{sale.userName}</span>
                  </div>
                </div>

                {/* Edit/Delete Buttons on the Left (End) */}
                {user.role === 'admin' && (
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button 
                      onClick={() => { setSelectedSale(sale); setIsEditing(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-black text-xs"
                    >
                      <Edit size={14}/> تعديل
                    </button>
                    <button 
                      onClick={() => handleDelete(sale.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all font-black text-xs"
                    >
                      <Trash2 size={14}/> حذف
                    </button>
                  </div>
                )}
              </div>

              {/* Card Body: Items Table */}
              <div className="p-4 md:p-6 overflow-x-auto">
                <table className="w-full text-right text-[10px] md:text-xs">
                  <thead className="bg-slate-50/50 text-gray-400 font-black uppercase tracking-widest">
                    <tr>
                      <th className="p-3">اسم الصنف</th>
                      <th className="p-3 text-center">السعر</th>
                      <th className="p-3 text-center">العدد</th>
                      <th className="p-3 text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30">
                        <td className="p-3 font-bold text-gray-700">{item.productName}</td>
                        <td className="p-3 text-center font-bold text-rose-600">{item.price} ج.م</td>
                        <td className="p-3 text-center font-black text-blue-600">{item.quantity}</td>
                        <td className="p-3 text-center font-black text-gray-900">{(item.price * item.quantity).toLocaleString()} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card Footer: Final Total */}
              <div className="bg-rose-900 p-4 md:p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="opacity-50" />
                  <span className="text-[10px] font-bold opacity-70">وقت التسجيل: {sDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold opacity-60">إجمالي الفاتورة:</span>
                  <span className="text-lg md:text-2xl font-black">{(sale.total || 0).toLocaleString()} <span className="text-xs opacity-50">ج.م</span></span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredSales.length === 0 && (
          <div className="bg-white py-24 rounded-[3rem] text-center border-2 border-dashed border-rose-100">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-200">
              <History size={40} />
            </div>
            <p className="text-gray-400 font-black text-sm">لا توجد عمليات بيع مسجلة ضمن هذه الفلاتر</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedSale && isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-rose-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">تعديل سجل مبيعات</h3>
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
                  <span className="text-center text-rose-600 font-black">{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="p-6 bg-rose-50 border-t flex justify-between items-center">
               <span className="font-black text-rose-900 text-sm">الإجمالي المحدث</span>
               <div className="flex items-center gap-4">
                  <span className="text-xl font-black text-rose-900">
                    {selectedSale.items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString()} ج.م
                  </span>
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
                    className="bg-rose-800 text-white px-6 py-2 rounded-xl font-black text-sm shadow-lg shadow-rose-100"
                  >حفظ التغييرات</button>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Detail Modal (Non-Edit View) */}
      {selectedSale && !isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setSelectedSale(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-rose-900">تفاصيل السجل</h3>
                <button onClick={() => setSelectedSale(null)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
             </div>
             <div className="space-y-4">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="font-black text-rose-900 text-sm">{item.productName}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{item.quantity} قطعة × {item.price} ج.م</p>
                    </div>
                    <span className="font-black text-slate-800">{(item.price * item.quantity).toLocaleString()} ج.م</span>
                  </div>
                ))}
                <div className="pt-4 mt-2 border-t flex justify-between items-center">
                  <span className="font-black text-rose-900">إجمالي العملية</span>
                  <span className="text-2xl font-black text-rose-900">{selectedSale.total?.toLocaleString()} ج.م</span>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
