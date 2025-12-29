
import React, { useState, useEffect } from 'react';
import { User, Vacation } from '../types';
import { db, ref, onValue, push, set, remove } from '../firebase';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';

interface Props {
  user: User;
  users: User[];
}

const VacationManagement: React.FC<Props> = ({ user, users }) => {
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVacation, setNewVacation] = useState({
    date: new Date().toISOString().split('T')[0],
    days: 1,
    type: 'annual' as const
  });

  useEffect(() => {
    const vRef = ref(db, 'vacations');
    onValue(vRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let vList = Object.entries(data).map(([id, val]: any) => ({ ...val, id }));
        if (user.role !== 'admin') {
          vList = vList.filter(v => v.userId === user.id);
        }
        setVacations(vList);
      } else {
        setVacations([]);
      }
    });
  }, [user]);

  const handleAddVacation = async () => {
    const vRef = ref(db, 'vacations');
    await push(vRef, {
      ...newVacation,
      userId: user.id,
      userName: user.employeeName,
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(false);
    alert("تم تسجيل الإجازة بنجاح");
  };

  const handleDeleteVacation = (id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من حذف هذا السجل الخاص بالإجازة؟ سيتم التراجع عن خصم الأيام من الرصيد.")) {
      remove(ref(db, `vacations/${id}`));
      alert("تم الحذف بنجاح");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-rose-50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-rose-900">رصيد الإجازات</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-rose-900 shadow-lg shadow-rose-100 font-bold text-sm transition-all"
          >
            <Plus size={18}/> تسجيل إجازة
          </button>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
            <div className="text-[10px] font-black text-blue-600 mb-1 uppercase tracking-widest">سنوي</div>
            <div className="text-2xl font-black text-blue-800">{user.vacationBalance?.annual || 0}</div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-center">
            <div className="text-[10px] font-black text-orange-600 mb-1 uppercase tracking-widest">عارضة</div>
            <div className="text-2xl font-black text-orange-800">{user.vacationBalance?.casual || 0}</div>
          </div>
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
            <div className="text-[10px] font-black text-red-600 mb-1 uppercase tracking-widest">مرضي</div>
            <div className="text-2xl font-black text-red-800">{user.vacationBalance?.sick || 0}</div>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl text-center">
            <div className="text-[10px] font-black text-purple-600 mb-1 uppercase tracking-widest">امتحانات</div>
            <div className="text-2xl font-black text-purple-800">{user.vacationBalance?.exams || 0}</div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl text-[11px] text-slate-500 mb-6 flex items-center gap-2 font-bold">
          <Clock size={16} className="text-rose-400"/> إجازات الفترة الحالية
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-50">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="p-4">التاريخ</th>
                <th className="p-4">النوع</th>
                <th className="p-4">الأيام</th>
                {user.role === 'admin' && <th className="p-4">الموظف</th>}
                <th className="p-4 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vacations.map(v => (
                <tr key={v.id} className="hover:bg-rose-50/20 text-xs font-bold">
                  <td className="p-4 text-gray-700">{v.date}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px]">
                      {v.type === 'annual' ? 'سنوي' : v.type === 'casual' ? 'عارضة' : v.type === 'sick' ? 'مرضي' : 'امتحانات'}
                    </span>
                  </td>
                  <td className="p-4">{v.days} يوم</td>
                  {user.role === 'admin' && <td className="p-4 text-rose-600">{v.userName}</td>}
                  <td className="p-4 text-center">
                    {(user.role === 'admin') && (
                      <button onClick={() => handleDeleteVacation(v.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vacations.length === 0 && <div className="py-12 text-center text-gray-300 font-bold italic text-xs">لا يوجد سجل إجازات حتى الآن</div>}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-rose-900 mb-6">تسجيل إجازة جديدة</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">تاريخ الإجازة</label>
                <input 
                  type="date" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                  value={newVacation.date}
                  onChange={(e) => setNewVacation({...newVacation, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">عدد الأيام</label>
                <input 
                  type="number" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                  value={newVacation.days}
                  onChange={(e) => setNewVacation({...newVacation, days: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">نوع الإجازة</label>
                <select 
                  className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                  value={newVacation.type}
                  onChange={(e) => setNewVacation({...newVacation, type: e.target.value as any})}
                >
                  <option value="annual">سنوي</option>
                  <option value="casual">عارضة</option>
                  <option value="sick">مرضي</option>
                  <option value="exams">امتحانات</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button 
                onClick={handleAddVacation}
                className="flex-1 bg-rose-800 text-white py-4 rounded-xl font-black shadow-lg"
              >
                تأكيد التسجيل
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacationManagement;
