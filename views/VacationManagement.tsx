
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
    // Here we should also deduct from balance in firebase
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-rose-800">رصيد الإجازات</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-rose-700"
          >
            <Plus size={20}/> تسجيل إجازة
          </button>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
            <div className="text-sm text-blue-600 mb-1">سنوي</div>
            <div className="text-2xl font-bold text-blue-800">{user.vacationBalance?.annual || 0}</div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center">
            <div className="text-sm text-orange-600 mb-1">عارضة</div>
            <div className="text-2xl font-bold text-orange-800">{user.vacationBalance?.casual || 0}</div>
          </div>
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
            <div className="text-sm text-red-600 mb-1">مرضي</div>
            <div className="text-2xl font-bold text-red-800">{user.vacationBalance?.sick || 0}</div>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-center">
            <div className="text-sm text-purple-600 mb-1">امتحانات</div>
            <div className="text-2xl font-bold text-purple-800">{user.vacationBalance?.exams || 0}</div>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-4 flex items-center gap-2">
          <Clock size={16}/> إجازات الفترة من 21-11-2024 حتى 20-12-2024
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-right bg-gray-50">
                <th className="p-3">التاريخ</th>
                <th className="p-3">النوع</th>
                <th className="p-3">الأيام</th>
                {user.role === 'admin' && <th className="p-3">الموظف</th>}
                <th className="p-3 text-center">حذف</th>
              </tr>
            </thead>
            <tbody>
              {vacations.map(v => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{v.date}</td>
                  <td className="p-3">
                    {v.type === 'annual' ? 'سنوي' : v.type === 'casual' ? 'عارضة' : v.type === 'sick' ? 'مرضي' : 'امتحانات'}
                  </td>
                  <td className="p-3">{v.days}</td>
                  {user.role === 'admin' && <td className="p-3">{v.userName}</td>}
                  <td className="p-3 text-center">
                    {(user.role === 'admin') && (
                      <button onClick={() => remove(ref(db, `vacations/${v.id}`))} className="text-red-500">
                        <Trash2 size={18}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-6">تسجيل إجازة جديدة</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">تاريخ الإجازة</label>
                <input 
                  type="date" className="w-full border rounded-lg p-2"
                  value={newVacation.date}
                  onChange={(e) => setNewVacation({...newVacation, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">عدد الأيام</label>
                <input 
                  type="number" className="w-full border rounded-lg p-2"
                  value={newVacation.days}
                  onChange={(e) => setNewVacation({...newVacation, days: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">نوع الإجازة</label>
                <select 
                  className="w-full border rounded-lg p-2"
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
            <div className="flex gap-3 mt-8">
              <button 
                onClick={handleAddVacation}
                className="flex-1 bg-rose-600 text-white py-2 rounded-lg font-bold"
              >
                تأكيد
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg"
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
