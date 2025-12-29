
import React, { useState, useEffect, useMemo } from 'react';
import { User, Vacation } from '../types';
import { db, ref, onValue, push, set, remove, update } from '../firebase';
import { Calendar, Plus, Trash2, Clock, ChevronRight, ChevronLeft, X, Edit, User as UserIcon } from 'lucide-react';

interface Props {
  user: User;
  users: User[];
}

const VacationManagement: React.FC<Props> = ({ user, users }) => {
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{ userId: string, type: string, userName: string } | null>(null);
  const [editingUserBalance, setEditingUserBalance] = useState<User | null>(null);
  const [currentPeriodDate, setCurrentPeriodDate] = useState(new Date());
  
  const [newVacation, setNewVacation] = useState({
    date: new Date().toISOString().split('T')[0],
    days: 1,
    type: 'annual' as const,
    targetUserId: user.id
  });

  useEffect(() => {
    const vRef = ref(db, 'vacations');
    onValue(vRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setVacations(Object.entries(data).map(([id, val]: any) => ({ ...val, id })));
      } else {
        setVacations([]);
      }
    });
  }, []);

  const handleAddVacation = async () => {
    const vRef = ref(db, 'vacations');
    // Safety check for target user
    const targetUserId = user.role === 'admin' ? newVacation.targetUserId : user.id;
    const targetUser = users.find(u => u.id === targetUserId) || user;
    
    const up = targetUser.vacationBalance || { annual: 14, casual: 7, sick: 0, exams: 0, absent_with_permission: 0, absent_without_permission: 0 };
    let updatedBalance = { ...up };
    
    if (newVacation.type === 'annual') updatedBalance.annual -= newVacation.days;
    else if (newVacation.type === 'casual') updatedBalance.casual -= newVacation.days;
    else if (newVacation.type === 'absent_with_permission') updatedBalance.absent_with_permission = (updatedBalance.absent_with_permission || 0) - newVacation.days;

    await update(ref(db, `users/${targetUser.id}`), { vacationBalance: updatedBalance });

    await push(vRef, {
      ...newVacation,
      userId: targetUser.id,
      userName: targetUser.employeeName,
      createdAt: new Date().toISOString()
    });
    
    setIsModalOpen(false);
    alert("تم تسجيل الإجازة بنجاح");
  };

  const handleDeleteVacation = async (id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من حذف هذا السجل؟ سيتم إعادة الأيام للرصيد.")) {
      const vToDelete = vacations.find(v => v.id === id);
      if (vToDelete) {
        const targetUser = users.find(u => u.id === vToDelete.userId);
        if (targetUser) {
          const up = targetUser.vacationBalance || { annual: 14, casual: 7 };
          let updatedBalance = { ...up };
          
          if (vToDelete.type === 'annual') updatedBalance.annual += Number(vToDelete.days);
          else if (vToDelete.type === 'casual') updatedBalance.casual += Number(vToDelete.days);
          else if (vToDelete.type === 'absent_with_permission') updatedBalance.absent_with_permission = (updatedBalance.absent_with_permission || 0) + Number(vToDelete.days);

          await update(ref(db, `users/${targetUser.id}`), { vacationBalance: updatedBalance });
        }
      }
      await remove(ref(db, `vacations/${id}`));
    }
  };

  const handleSaveBalanceEdit = async () => {
    if (!editingUserBalance) return;
    await update(ref(db, `users/${editingUserBalance.id}`), {
      vacationBalance: editingUserBalance.vacationBalance
    });
    alert("تم تحديث الرصيد بنجاح");
    setEditingUserBalance(null);
  };

  const getPeriodRange = (baseDate: Date) => {
    let year = baseDate.getFullYear();
    let month = baseDate.getMonth();
    const start = new Date(year, month - 1, 21);
    const end = new Date(year, month, 20);
    return { start, end };
  };

  const currentRange = useMemo(() => getPeriodRange(currentPeriodDate), [currentPeriodDate]);

  const changePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentPeriodDate);
    if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentPeriodDate(newDate);
  };

  // Privacy Logic: Show only own account if not admin
  const visibleUsers = useMemo(() => {
    if (!users) return [];
    if (user.role === 'admin') return users;
    return users.filter(u => u.id === user.id);
  }, [user, users]);

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-rose-50">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-900 text-white rounded-2xl shadow-lg shadow-rose-100"><Calendar size={24}/></div>
            <div>
              <h2 className="text-2xl font-black text-rose-900 leading-none">إدارة رصيد الإجازات</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Vacation Balance Tracker</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setNewVacation(prev => ({ ...prev, targetUserId: user.id }));
              setIsModalOpen(true);
            }}
            className="bg-rose-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-rose-900 shadow-lg shadow-rose-100 font-black text-sm transition-all"
          >
            <Plus size={20}/> تسجيل جديد
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleUsers.map(u => (
            <div key={u.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:border-rose-200 transition-all relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-900 shadow-sm border border-slate-100"><UserIcon size={24}/></div>
                  <div>
                    <p className="font-black text-rose-900">{u.employeeName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.employeeCode || 'بدون كود'}</p>
                  </div>
                </div>
                {user.role === 'admin' && (
                  <button onClick={() => setEditingUserBalance(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit size={14}/></button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'سنوي', type: 'annual', balance: u.vacationBalance?.annual ?? 14, text: 'text-blue-600', light: 'bg-blue-50' },
                  { label: 'عارضة', type: 'casual', balance: u.vacationBalance?.casual ?? 7, text: 'text-orange-500', light: 'bg-orange-50' },
                  { label: 'مرضي', type: 'sick', balance: u.vacationBalance?.sick ?? 0, text: 'text-red-500', light: 'bg-red-50' },
                  { label: 'بدون إذن', type: 'absent_without_permission', balance: u.vacationBalance?.absent_without_permission ?? 0, text: 'text-purple-600', light: 'bg-purple-50' }
                ].map(box => (
                  <button 
                    key={box.type}
                    onClick={() => setSelectedDetails({ userId: u.id, type: box.type, userName: u.employeeName })}
                    className={`${box.light} p-3 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all shadow-sm border border-transparent hover:border-rose-200`}
                  >
                    <span className={`text-[8px] font-black uppercase ${box.text} mb-1 tracking-tighter`}>{box.label}</span>
                    <span className={`text-xl font-black ${box.text}`}>{box.balance}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {visibleUsers.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 font-bold italic">لا توجد بيانات موظفين حالياً</div>
          )}
        </div>
      </div>

      {editingUserBalance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-rose-900 mb-6 border-b pb-4">تعديل رصيد أيام {editingUserBalance.employeeName}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mr-1 mb-2">سنوي</label>
                <input 
                  type="number" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                  value={editingUserBalance.vacationBalance?.annual}
                  onChange={(e) => setEditingUserBalance({...editingUserBalance, vacationBalance: {...(editingUserBalance.vacationBalance || {}), annual: Number(e.target.value)} as any})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mr-1 mb-2">عارضة</label>
                <input 
                  type="number" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                  value={editingUserBalance.vacationBalance?.casual}
                  onChange={(e) => setEditingUserBalance({...editingUserBalance, vacationBalance: {...(editingUserBalance.vacationBalance || {}), casual: Number(e.target.value)} as any})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mr-1 mb-2">مرضي</label>
                <input 
                  type="number" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                  value={editingUserBalance.vacationBalance?.sick}
                  onChange={(e) => setEditingUserBalance({...editingUserBalance, vacationBalance: {...(editingUserBalance.vacationBalance || {}), sick: Number(e.target.value)} as any})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mr-1 mb-2">بدون إذن</label>
                <input 
                  type="number" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                  value={editingUserBalance.vacationBalance?.absent_without_permission}
                  onChange={(e) => setEditingUserBalance({...editingUserBalance, vacationBalance: {...(editingUserBalance.vacationBalance || {}), absent_without_permission: Number(e.target.value)} as any})}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={handleSaveBalanceEdit} className="flex-1 bg-rose-800 text-white py-4 rounded-xl font-black shadow-lg shadow-rose-100 hover:bg-rose-900 transition-all">حفظ التعديلات</button>
              <button onClick={() => setEditingUserBalance(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-rose-900 mb-8 flex items-center gap-3">
              <Plus className="text-rose-700"/> تسجيل إجازة
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">الموظف</label>
                <select 
                  className={`w-full bg-slate-100 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200 ${user.role !== 'admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  value={user.role === 'admin' ? newVacation.targetUserId : user.id}
                  disabled={user.role !== 'admin'}
                  onChange={(e) => setNewVacation({...newVacation, targetUserId: e.target.value})}
                >
                  {user.role === 'admin' ? (
                    users.map(u => <option key={u.id} value={u.id}>{u.employeeName}</option>)
                  ) : (
                    <option value={user.id}>{user.employeeName}</option>
                  )}
                </select>
                {user.role !== 'admin' && <p className="text-[8px] font-bold text-rose-400 mt-1 mr-1">* التسجيل متاح لحسابك الشخصي فقط</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">التاريخ</label>
                  <input 
                    type="date" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200 text-sm"
                    value={newVacation.date}
                    onChange={(e) => setNewVacation({...newVacation, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">المدة (أيام)</label>
                  <input 
                    type="number" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                    value={newVacation.days}
                    onChange={(e) => setNewVacation({...newVacation, days: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">نوع الطلب</label>
                <select 
                  className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                  value={newVacation.type}
                  onChange={(e) => setNewVacation({...newVacation, type: e.target.value as any})}
                >
                  <option value="annual">سنوي</option>
                  <option value="casual">عارضة</option>
                  <option value="sick">مرضي</option>
                  <option value="absent_with_permission">غياب بإذن</option>
                  <option value="absent_without_permission">غياب بدون إذن</option>
                  <option value="exams">امتحانات</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={handleAddVacation} className="flex-1 bg-rose-800 text-white py-4 rounded-xl font-black shadow-lg shadow-rose-100 hover:bg-rose-900 transition-all">تأكيد التسجيل</button>
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacationManagement;
