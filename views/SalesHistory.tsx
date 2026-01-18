
import React, { useState, useEffect, useMemo } from 'react';
import { User, DailySale } from '../types';
import { Trash2, Edit, Trophy, BarChart3, FileSpreadsheet, X, Clock, Calendar as CalendarIcon, User as UserIcon, Store, History, Search, Filter, Download } from 'lucide-react';
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
  const [searchName, setSearchName] = useState('');
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    marketName: ''
  });

  useEffect(() => {
    const salesRef = ref(db, 'sales');
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let salesList = Object.entries(data).map(([id, val]: any) => ({ ...val, id }));
        
        // الصلاحيات: إذا لم يكن لديه صلاحية رؤية مبيعات الزملاء، نكتفي بمبيعاته فقط
        const up = user.permissions || { viewColleaguesSales: false };
        if (user.role !== 'admin' && !up.viewColleaguesSales) {
          salesList = salesList.filter(s => s.userId === user.id);
        }
        
        setSales(salesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } else {
        setSales([]);
      }
    });
  }, [user]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const sDate = s.date ? s.date.split('T')[0] : '';
      const matchStart = filters.dateStart ? sDate >= filters.dateStart : true;
      const matchEnd = filters.dateEnd ? sDate <= filters.dateEnd : true;
      const matchMarket = filters.marketName ? s.marketName === filters.marketName : true;
      const matchName = searchName ? s.userName.toLowerCase().includes(searchName.toLowerCase()) : true;
      return matchStart && matchEnd && matchMarket && matchName;
    });
  }, [sales, filters, searchName]);

  const stats = useMemo(() => {
    const dataToProcess = filteredSales;
    const userTotals: Record<string, {name: string, total: number}> = {};
    const productTotals: Record<string, {quantity: number, total: number}> = {};

    dataToProcess.forEach(s => {
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
  }, [filteredSales]);

  const handleExport = (dataToExport: DailySale[], fileName: string) => {
    const flatData = dataToExport.flatMap(s => (s.items || []).map(i => ({ 
      "الماركت": s.marketName, 
      "الموظف": s.userName, 
      "التاريخ": s.date?.split('T')[0], 
      "الصنف": i.productName, 
      "السعر": i.price, 
      "الكمية": i.quantity, 
      "الإجمالي": (Number(i.price || 0) * Number(i.quantity || 0))
    })));
    
    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من حذف هذه العملية؟")) {
      remove(ref(db, `sales/${id}`));
    }
  };

  return (
    <div className="space-y-8 pb-20 text-right" dir="rtl">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-rose-600 text-white rounded-[1.5rem] shadow-lg shadow-rose-900/20"><History size={28} /></div>
          <div>
            <h2 className="text-2xl font-black text-white">سجل المبيعات المتقدم</h2>
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1">Advanced Sales Management</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
            onClick={() => handleExport(filteredSales, "SoftRose_Filtered_Report")} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-lg hover:bg-rose-500 transition-all"
           >
            <Download size={18}/> تصدير النتائج الحالية
          </button>
          <button 
            onClick={() => handleExport(sales, "SoftRose_Full_History")} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 text-white/60 border border-white/10 px-6 py-4 rounded-2xl font-black text-xs hover:bg-white/10 transition-all"
          >
            <FileSpreadsheet size={18}/> السجل بالكامل
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card-dark p-6 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-1">
          <label className="text-[10px] font-black text-white/30 uppercase block mb-2 mr-2">البحث باسم الموظف</label>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={16}/>
            <input 
              type="text" 
              placeholder="اكتب اسم الموظف..." 
              className="w-full glass-input-dark rounded-xl p-4 pr-12 text-xs font-bold outline-none border-transparent focus:border-rose-500/50 transition-all"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-white/30 uppercase block mb-2 mr-2">من تاريخ</label>
          <input 
            type="date" 
            className="w-full glass-input-dark rounded-xl p-4 text-xs font-bold outline-none"
            value={filters.dateStart}
            onChange={(e) => setFilters({...filters, dateStart: e.target.value})}
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-white/30 uppercase block mb-2 mr-2">إلى تاريخ</label>
          <input 
            type="date" 
            className="w-full glass-input-dark rounded-xl p-4 text-xs font-bold outline-none"
            value={filters.dateEnd}
            onChange={(e) => setFilters({...filters, dateEnd: e.target.value})}
          />
        </div>
        <div>
          <button 
            onClick={() => {setSearchName(''); setFilters({dateStart: '', dateEnd: '', marketName: ''});}}
            className="w-full bg-white/5 text-white/40 py-4 rounded-xl font-black text-xs hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            تصفير الفلاتر
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-rose-600 to-rose-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <Trophy className="absolute -right-6 -bottom-6 w-48 h-48 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10">
            <h3 className="font-black text-[10px] uppercase mb-6 flex items-center gap-2 tracking-[0.2em] text-rose-200">
              <Trophy className="text-amber-400" size={18} /> المتصدر للنتائج الحالية
            </h3>
            {stats.star ? (
              <div className="space-y-2">
                <p className="text-3xl font-black tracking-tight">{stats.star.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-amber-400">{(stats.star.total || 0).toLocaleString()}</span>
                  <span className="text-xs font-bold opacity-60 uppercase">EGP</span>
                </div>
              </div>
            ) : <p className="text-sm font-bold opacity-50 italic">لا توجد مبيعات في هذه الفترة</p>}
          </div>
        </div>

        <div className="glass-card-dark p-8 rounded-[2.5rem] relative overflow-hidden">
          <h3 className="font-black text-[10px] text-white/40 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
            <BarChart3 size={18} className="text-rose-500" /> الأصناف الأكثر حركة
          </h3>
          <div className="space-y-4">
            {stats.topProducts.map(([name, data], idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-black text-sm">{idx + 1}</div>
                  <div>
                    <p className="text-xs font-black text-white leading-none">{name}</p>
                    <p className="text-[10px] font-bold text-white/30 mt-1 uppercase">{data.quantity} قطعة</p>
                  </div>
                </div>
                <div className="text-left font-black text-rose-400 text-sm">
                   {(data.total || 0).toLocaleString()} <span className="text-[10px] opacity-40">EGP</span>
                </div>
              </div>
            ))}
            {stats.topProducts.length === 0 && (
              <p className="text-center py-6 text-white/20 font-bold italic text-xs">لا توجد بيانات للأصناف</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-4">
        {filteredSales.map(sale => (
          <div key={sale.id} className="glass-card-dark rounded-[2.5rem] overflow-hidden group transition-all hover:bg-white/[0.05] border border-white/5">
            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 border-b border-white/5">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3 bg-rose-600/10 px-4 py-2 rounded-xl">
                  <Store size={18} className="text-rose-500"/>
                  <span className="font-black text-white text-sm">{sale.marketName}</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <CalendarIcon size={16} />
                  <span className="font-bold text-xs">{new Date(sale.date).toLocaleDateString('ar-EG', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <UserIcon size={16} />
                  <span className="font-bold text-xs">{sale.userName}</span>
                </div>
              </div>
              {user.role === 'admin' && (
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedSale(sale); setIsEditing(true); }} className="p-3 bg-white/5 text-white/60 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(sale.id)} className="p-3 bg-white/5 text-red-500/60 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                </div>
              )}
            </div>
            
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(sale.items || []).map((item, idx) => (
                  <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <span className="text-[10px] font-black text-white/40 truncate">{item.productName}</span>
                    <div className="flex justify-between items-end">
                      <div className="text-rose-400 font-black text-sm">{item.quantity} <span className="text-[9px] opacity-40">قطعة</span></div>
                      <div className="text-white font-bold text-xs">{(item.price * item.quantity).toLocaleString()} <span className="text-[8px] opacity-40">ج.م</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 p-6 md:px-8 flex justify-between items-center border-t border-white/5">
              <div className="flex items-center gap-3 text-white/20">
                <Clock size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(sale.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute: '2-digit'})}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Total Value</span>
                <span className="text-2xl font-black text-white">{(Number(sale.total) || 0).toLocaleString()} <span className="text-xs text-rose-500">ج.م</span></span>
              </div>
            </div>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="glass-card-dark py-32 rounded-[3.5rem] text-center border-dashed border-2 border-white/5">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 text-white/10">
              <History size={48} />
            </div>
            <p className="text-white/30 font-black text-sm uppercase tracking-[0.2em]">لا توجد نتائج مطابقة للبحث</p>
          </div>
        )}
      </div>

      {/* Edit Modal (Keeping existing logic) */}
      {selectedSale && isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="glass-card-dark rounded-[3rem] w-full max-w-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
            <div className="bg-rose-900/50 p-6 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">تعديل سجل مبيعات</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
              {(selectedSale.items || []).map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-4 p-5 bg-white/5 rounded-2xl items-center">
                  <span className="text-white font-bold text-xs truncate col-span-1">{item.productName}</span>
                  <input 
                    type="number" 
                    className="glass-input-dark p-3 rounded-xl text-center text-xs font-black outline-none" 
                    value={item.price} 
                    onChange={(e) => {
                      const newItems = [...(selectedSale.items || [])];
                      newItems[idx].price = Number(e.target.value);
                      setSelectedSale({...selectedSale, items: newItems});
                    }}
                  />
                  <input 
                    type="number" 
                    className="glass-input-dark p-3 rounded-xl text-center text-xs font-black outline-none" 
                    value={item.quantity} 
                    onChange={(e) => {
                      const newItems = [...(selectedSale.items || [])];
                      newItems[idx].quantity = Number(e.target.value);
                      setSelectedSale({...selectedSale, items: newItems});
                    }}
                  />
                  <span className="text-left text-rose-400 font-black text-sm">{( (Number(item.price || 0)) * (Number(item.quantity || 0)) ).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="p-8 bg-white/5 flex justify-between items-center">
               <span className="text-2xl font-black text-white">{(selectedSale.items || []).reduce((acc, i) => acc + ( (Number(i.price || 0)) * (Number(i.quantity || 0)) ), 0).toLocaleString()} <span className="text-xs text-rose-500 uppercase">EGP</span></span>
               <button onClick={async () => {
                 const newTotal = (selectedSale.items || []).reduce((acc, i) => acc + ( (Number(i.price || 0)) * (Number(i.quantity || 0)) ), 0);
                 await update(ref(db, `sales/${selectedSale.id}`), { items: selectedSale.items, total: newTotal });
                 setIsEditing(false);
                 alert("تم تحديث السجل بنجاح");
               }} className="bg-rose-600 text-white px-12 py-4 rounded-2xl font-black shadow-lg shadow-rose-900/20 hover:bg-rose-500">حفظ التعديلات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
