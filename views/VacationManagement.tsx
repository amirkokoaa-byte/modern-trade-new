
import React, { useState, useEffect, useMemo } from 'react';
import { User, Vacation } from '../types';
import { db, ref, onValue, push, set, remove, update } from '../firebase';
import { Calendar, Plus, Trash2, Clock, ChevronRight, ChevronLeft, X, Edit, User as UserIcon, ListFilter, History } from 'lucide-react';

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
      // Close details if the deleted item was inside the currently viewed list
      if (filteredDetails.length <= 1) setSelectedDetails(null);
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
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    // Start: 21st of previous month
    const start = new Date(year, month - 1, 21);
    // End: 20th of current month
    const end = new Date(year, month, 20, 23, 59, 59);
    return { start, end };
  };

  const currentRange = useMemo(() => getPeriodRange(currentPeriodDate), [currentPeriodDate]);

  const changePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentPeriodDate);
    if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentPeriodDate(newDate);
  };

  const visibleUsers = useMemo(() => {
    if (!users) return [];
    if (user.role === 'admin') return users;
    return users.filter(u => u.id === user.id);
  }, [user, users]);

  // Logic for the Details Modal
  const filteredDetails = useMemo(() => {
    if (!selectedDetails) return [];
    return vacations.filter(v => {
      const vDate = new Date(v.date);
      const isCorrectType = v.type === selectedDetails.type;
      const isCorrectUser = v.userId === selectedDetails.userId;
      const isInRange = vDate >= currentRange.start && vDate <= currentRange.end;
      return isCorrectType && isCorrectUser && isInRange;
    });
  }, [selectedDetails, vacations, currentRange]);

  const totalDaysInPeriod = useMemo(() => {
    return filteredDetails.reduce((sum, v) => sum + Number(v.days || 0), 0);
  }, [filteredDetails]);

  const getTypeNameAr = (type: string) => {
    const names: any = { annual: 'سنوي', casual: 'عارضة', sick: 'مرضي', exams: 'امتحانات', absent_with_permission: 'بإذن', absent_without_permission: 'بدون إذن' };
    return names[type] || type;
  };

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header & Controls */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-rose-50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-900 text-white rounded-2xl shadow-lg shadow-rose-100"><Calendar size={24}/></div>
            <div>
              <h2 className="text-2xl font-black text-rose-900 leading-none">إدارة رصيد الإجازات</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Vacation Balance Tracker</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-full md:w-auto">
            <button onClick={() => changePeriod('prev')} className="p-2 hover:bg-white rounded-xl text-rose-800 transition-all"><ChevronRight size={20}/></button>
            <div className="flex flex-col items-center px-4 min-w-[140px]">
              <span className="text-[10px] font-black text-gray-400 uppercase">فترة الرواتب</span>
              <span className="text-sm font-black text-rose-900">
                {currentRange.start.toLocaleDateString('ar-EG', {day: '2-digit', month: '2-digit'})} - {currentRange.end.toLocaleDateString('ar-EG', {day: '2-digit', month: '2-digit'})}
              </span>
            </div>
            <button onClick={() => changePeriod('next')} className="p-2 hover:bg-white rounded-xl text-rose-800 transition-all"><ChevronLeft size={20}/></button>
          </div>

          <button 
            onClick={() => {
              setNewVacation(prev => ({ ...prev, targetUserId: user.id }));
              setIsModalOpen(true);
            }}
            className="w-full md:w-auto bg-rose-800 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-900 shadow-xl shadow-rose-100 font-black text-sm transition-all active:scale-95"
          >
            <Plus size={20}/> تسجيل جديد
          </button>
        </div>

        {/* Users List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
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
                    className={`${box.light} p-3 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all shadow-sm border border-transparent hover:border-rose-200 group/btn`}
                  >
                    <span className={`text-[8px] font-black uppercase ${box.text} mb-1 tracking-tighter opacity-70`}>{box.label}</span>
                    <span className={`text-xl font-black ${box.text}`}>{box.balance}</span>
                    <span className="text-[7px] font-bold text-gray-400 mt-1 opacity-0 group-hover/btn:opacity-100 transition-opacity">تفاصيل</span>
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

      {/* History Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setSelectedDetails(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl"><History size={20}/></div>
                <div>
                  <h3 className="text-lg font-black leading-tight">سجل إجازات {getTypeNameAr(selectedDetails.type)}</h3>
                  <p className="text-[10px] font-bold text-rose-300 opacity-80 uppercase tracking-widest">{selectedDetails.userName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDetails(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </div>
            
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                <ListFilter size={14}/> الفترة: {currentRange.start.toLocaleDateString('ar-EG', {day: 'numeric', month: 'short'})} إلى {currentRange.end.toLocaleDateString('ar-EG', {day: 'numeric', month: 'short'})}
              </div>
              <div className="px-4 py-1.5 bg-rose-100 text-rose-800 rounded-full text-xs font-black">إجمالي: {totalDaysInPeriod} يوم</div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {filteredDetails.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="mx-auto text-gray-200 mb-2" size={40}/>
                  <p className="text-sm font-bold text-gray-400">لا توجد إجازات مسجلة في هذه الفترة</p>
                </div>
              ) : (
                filteredDetails.map(v => (
                  <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className="text-center bg-slate-50 px-3 py-1 rounded-xl">
                         <span className="block text-[10px] font-black text-gray-400">{new Date(v.date).toLocaleDateString('ar-EG', {month: 'short'})}</span>
                         <span className="block text-lg font-black text-rose-900 leading-none">{new Date(v.date).getDate()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-800">إجازة لمدة {v.days} يوم</span>
                        <span className="text-[10px] font-bold text-gray-400 italic">سجلت في: {new Date(v.createdAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                    {user.role === 'admin' && (
                      <button 
                        onClick={() => handleDeleteVacation(v.id)} 
                        className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="p-6 bg-white flex justify-center">
               <button onClick={() => setSelectedDetails(null)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-black transition-all">إغلاق السجل</button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Balance Modal (Admin Only) */}
      {editingUserBalance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-rose-900 mb-6 border-b pb-4 flex items-center gap-2">
              <Edit size={20}/> تعديل أرصدة {editingUserBalance.employeeName}
            </h3>
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

      {/* Register New Vacation Modal */}
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
