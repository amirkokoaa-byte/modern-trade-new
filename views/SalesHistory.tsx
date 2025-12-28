
import React, { useState, useEffect } from 'react';
import { User, DailySale } from '../types';
import { Search, Download, Trash2, Edit } from 'lucide-react';
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
    date: '',
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
        if (user.role !== 'admin' && !user.canSeeAllSales) {
          salesList = salesList.filter(s => s.userId === user.id);
        }

        setSales(salesList);
      }
    });
  }, [user]);

  const filteredSales = sales.filter(s => {
    const matchDate = filters.date ? s.date.startsWith(filters.date) : true;
    const matchEmp = filters.employeeId ? s.userId === filters.employeeId : true;
    const matchMarket = filters.marketName ? s.marketName === filters.marketName : true;
    return matchDate && matchEmp && matchMarket;
  });

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه المبيعات؟")) {
      await remove(ref(db, `sales/${id}`));
    }
  };

  const exportExcel = () => {
    const data = filteredSales.flatMap(s => s.items.map(item => ({
      'الموظف': s.userName,
      'التاريخ': new Date(s.date).toLocaleDateString('ar-EG'),
      'الماركت': s.marketName,
      'الصنف': item.productName,
      'السعر': item.price,
      'الكمية': item.quantity,
      'الإجمالي': item.price * item.quantity
    })));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات");
    XLSX.writeFile(wb, `مبيعات_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold text-rose-800 mb-6">سجل المبيعات</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <input 
            type="date" className="border rounded-lg p-2"
            onChange={(e) => setFilters({...filters, date: e.target.value})}
          />
          <select className="border rounded-lg p-2" onChange={(e) => setFilters({...filters, employeeId: e.target.value})}>
            <option value="">كل الموظفين</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.employeeName}</option>)}
          </select>
          <select className="border rounded-lg p-2" onChange={(e) => setFilters({...filters, marketName: e.target.value})}>
            <option value="">كل الماركت</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={exportExcel} className="bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 px-4 hover:bg-green-700">
            <Download size={20}/> تصدير اكسيل
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">الموظف</th>
                <th className="p-3 text-right">الماركت</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(sale.date).toLocaleDateString('ar-EG')}</td>
                  <td className="p-3">{sale.userName}</td>
                  <td className="p-3">{sale.marketName}</td>
                  <td className="p-3">{sale.total.toLocaleString()} ج.م</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit size={18}/></button>
                    <button onClick={() => handleDelete(sale.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSales.length === 0 && <div className="text-center py-10 text-gray-500">لا توجد سجلات مطابقة</div>}
        </div>
      </div>
    </div>
  );
};

export default SalesHistory;
