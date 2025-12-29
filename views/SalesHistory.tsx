
import React, { useState, useEffect, useMemo } from 'react';
import { User, DailySale, SaleItem } from '../types';
import { Search, Download, Trash2, Edit, Trophy, BarChart3, FileSpreadsheet } from 'lucide-react';
import { db, ref, onValue, remove, update } from '../firebase';
import * as XLSX from 'xlsx';

interface Props {
  user: User;
  markets: string[];
  users: User[];
}

const SalesHistory: React.FC<Props> = ({ user, markets, users }) => {
  const [sales, setSales] = useState<DailySale[]>([]);
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
        
        // Filter based on user permissions
        if (user.role === 'coordinator' || user.role === 'usher') {
           if (!user.permissions?.viewColleaguesSales) {
             salesList = salesList.filter(s => s.userId === user.id);
           }
        }

        setSales(salesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    });
  }, [user]);

  // Statistics Calculation (Current Month: Day 1 to 30)
  const stats = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthSales = sales.filter(s => {
      const sDate = new Date(s.date);
      return sDate >= firstDay && sDate <= lastDay;
    });

    // Star of the Month
    const empPerformance: Record<string, {name: string, total: number}> = {};
    const itemPerformance: Record<string, {quantity: number, total: number}> = {};

    monthSales.forEach(s => {
      // Employee
      if (!empPerformance[s.userId]) empPerformance[s.userId] = { name: s.userName, total: 0 };
      empPerformance[s.userId].total += s.total;

      // Items
      s.items.forEach(item => {
        if (!itemPerformance[item.productName]) itemPerformance[item.productName] = { quantity: 0, total: 0 };
        itemPerformance[item.productName].quantity += Number(item.quantity);
        itemPerformance[item.productName].total += (Number(item.price) * Number(item.quantity));
      });
    });

    const star = Object.values(empPerformance).sort((a, b) => b.total - a.total)[0] || null;
    const topItems = Object.entries(itemPerformance)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return { star, topItems };
  }, [sales]);

  const filteredSales = sales.filter(s => {
    const sDate = s.date.split('T')[0];
    const matchStart = filters.dateStart ? sDate >= filters.dateStart : true;
    const matchEnd = filters.dateEnd ? sDate <= filters.dateEnd : true;
    const matchEmp = filters.employeeId ? s.userId === filters.employeeId : true;
    const matchMarket = filters.marketName ? s.marketName === filters.marketName : true;
    return matchStart && matchEnd && matchEmp && matchMarket;
  });

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه المبيعات؟")) {
      await remove(ref(db, `sales/${id}`));
    }
  };

  // Advanced Excel Export 1: Period Sales Account
  const exportPeriodAccount = () => {
    if (!filters.employeeId || !filters.marketName) {
      alert("يرجى اختيار الموظف والماركت أولاً لتصدير كشف حساب الفترة");
      return;
    }

    const employee = users.find(u => u.id === filters.employeeId);
    const itemTotals: Record<string, { qty: number, total: number }> = {};
    let grandTotal = 0;

    filteredSales.forEach(s => {
      s.items.forEach(item => {
        if (!itemTotals[item.productName]) itemTotals[item.productName] = { qty: 0, total: 0 };
        itemTotals[item.productName].qty += Number(item.quantity);
        itemTotals[item.productName].total += (Number(item.price) * Number(item.quantity));
        grandTotal += (Number(item.price) * Number(item.quantity));
      });
    });

    const excelData = [
      { 'اسم الماركت': filters.marketName, 'اسم الموظف': employee?.employeeName, 'الصنف': '', 'الكمية المباعة': '', 'القيمة الإجمالية': '' }
    ];

    Object.entries(itemTotals).forEach(([name, data]) => {
      excelData.push({
        'اسم الماركت': '',
        'اسم الموظف': '',
        'الصنف': name,
        'الكمية المباعة': data.qty.toString(),
        'القيمة الإجمالية': data.total.toLocaleString()
      });
    });

    excelData.push({ 'اسم الماركت': '', 'اسم الموظف': '', 'الصنف': 'الإجمالي الكلي للفترة', 'الكمية المباعة': '', 'القيمة الإجمالية': grandTotal.toLocaleString() });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف حساب مبيعات");
    XLSX.writeFile(wb, `كشف_حساب_${filters.marketName}_${employee?.employeeName}.xlsx`);
  };

  // Advanced Excel Export 2: Current Log Export (Clean formatting)
  const exportCurrentLog = () => {
    const excelData: any[] = [];
    let currentGrandTotal = 0;

    filteredSales.forEach(s => {
      // Header row for this sale
      excelData.push({
        'الموظف': s.userName,
        'الماركت': s.marketName,
        'التاريخ': new Date(s.date).toLocaleDateString('ar-EG'),
        'الصنف': '--- المنتجات ---',
        'الكمية': '',
        'القيمة': ''
      });

      s.items.forEach(item => {
        excelData.push({
          'الموظف': '',
          'الماركت': '',
          'التاريخ': '',
          'الصنف': item.productName,
          'الكمية': item.quantity,
          'القيمة': (Number(item.price) * Number(item.quantity)).toLocaleString()
        });
      });
      
      excelData.push({ 'الموظف': '', 'الماركت': '', 'التاريخ': '', 'الصنف': 'إجمالي الماركت', 'الكمية': '', 'القيمة': s.total.toLocaleString() });
      excelData.push({}); // Empty row for separation
      currentGrandTotal += s.total;
    });

    excelData.push({ 'الموظف': '', 'الماركت': '', 'التاريخ': '', 'الصنف': 'إجمالي المبيعات المفلترة', 'الكمية': '', 'القيمة': currentGrandTotal.toLocaleString() });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل المبيعات الحالي");
    XLSX.writeFile(wb, `سجل_المبيعات_المفلتر.xlsx`);
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Star of the Month */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-rose-50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[5rem] -mr-10 -mt-10 transition-all group-hover:scale-110"></div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="p-6 bg-amber-100 text-amber-600 rounded-[2rem]">
              <Trophy size={40} />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">نجم الشهر الحالي</p>
              {stats.star ? (
                <>
                  <h3 className="text-2xl font-black text-rose-900">{stats.star.name}</h3>
                  <p className="text-gray-400 font-bold mt-1">إجمالي مبيعات: <span className="text-rose-600">{stats.star.total.toLocaleString()} ج.م</span></p>
                </>
              ) : (
                <p className="text-gray-300 font-bold">لا توجد بيانات لهذا الشهر</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-rose-50 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-lg font-black text-rose-900">الأصناف الأكثر مبيعاً (هذا الشهر)</h3>
          </div>
          <div className="space-y-3">
            {stats.topItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-gray-400 border">{idx+1}</span>
                  <span className="text-xs font-bold text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-blue-600 leading-none">{item.quantity} قطعة</p>
                  <p className="text-[8px] font-bold text-gray-300 uppercase mt-1">{item.total.toLocaleString()} ج.م</p>
                </div>
              </div>
            ))}
            {stats.topItems.length === 0 && <p className="text-center py-4 text-gray-300 text-sm">لا توجد إحصائيات</p>}
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-rose-50">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-rose-900 text-white rounded-3xl"><History size={28}/></div>
            <div>
              <h2 className="text-2xl font-black text-rose-900">سجل المبيعات والتصدير</h2>
              <p className="text-rose-400 text-xs font-bold uppercase tracking-widest mt-1">Sales Ledger & Reports</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
             <button onClick={exportPeriodAccount} className="bg-rose-100 text-rose-900 px-6 py-4 rounded-2xl flex items-center gap-2 font-black text-xs hover:bg-rose-200 transition-all border border-rose-200 shadow-sm">
              <FileSpreadsheet size={18}/> حساب فترة معينة
            </button>
            <button onClick={exportCurrentLog} className="bg-green-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-black text-xs hover:bg-green-700 transition-all shadow-xl shadow-green-100">
              <Download size={18}/> تصدير السجل الحالي
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">من تاريخ</label>
            <input 
              type="date" className="w-full bg-white border-2 border-transparent focus:border-rose-200 rounded-xl p-3 outline-none font-bold text-sm shadow-sm"
              value={filters.dateStart} onChange={(e) => setFilters({...filters, dateStart: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">إلى تاريخ</label>
            <input 
              type="date" className="w-full bg-white border-2 border-transparent focus:border-rose-200 rounded-xl p-3 outline-none font-bold text-sm shadow-sm"
              value={filters.dateEnd} onChange={(e) => setFilters({...filters, dateEnd: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">الموظف</label>
            <select className="w-full bg-white border-2 border-transparent focus:border-rose-200 rounded-xl p-3 outline-none font-bold text-sm shadow-sm" value={filters.employeeId} onChange={(e) => setFilters({...filters, employeeId: e.target.value})}>
              <option value="">كل الموظفين</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.employeeName}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">الماركت</label>
            <select className="w-full bg-white border-2 border-transparent focus:border-rose-200 rounded-xl p-3 outline-none font-bold text-sm shadow-sm" value={filters.marketName} onChange={(e) => setFilters({...filters, marketName: e.target.value})}>
              <option value="">كل الماركت</option>
              {markets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-[10px] uppercase font-black text-gray-400 tracking-widest">
                <th className="p-6 text-right">التاريخ</th>
                <th className="p-6 text-right">الموظف</th>
                <th className="p-6 text-right">الماركت</th>
                <th className="p-6 text-right">إجمالي القيمة</th>
                <th className="p-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-rose-50/30 transition-colors">
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">{new Date(sale.date).toLocaleDateString('ar-EG')}</span>
                      <span className="text-[10px] text-gray-300 uppercase">{new Date(sale.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </td>
                  <td className="p-6 font-bold text-gray-600">{sale.userName}</td>
                  <td className="p-6">
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">{sale.marketName}</span>
                  </td>
                  <td className="p-6">
                    <span className="font-black text-rose-900">{sale.total.toLocaleString()}</span>
                    <span className="text-[10px] mr-1 text-gray-400">ج.م</span>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleDelete(sale.id)} className="p-3 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm group">
                        <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSales.length === 0 && (
            <div className="text-center py-24">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                <Search size={40}/>
              </div>
              <p className="text-gray-400 font-bold">لا توجد سجلات مبيعات تطابق البحث</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesHistory;
