
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
    const targetUser = users.find(u => u.id === newVacation.targetUserId) || user;
    await push(vRef, {
      ...newVacation,
      userId: targetUser.id,
      userName: targetUser.employeeName,
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(false);
    alert("تم تسجيل الإجازة بنجاح");
  };

  const handleDeleteVacation = (id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من حذف هذا السجل؟")) {
      remove(ref(db, `vacations/${id}`));
      alert("تم الحذف بنجاح");
    }
  };

  // Helper to get financial month period (21 to 20)
  const getPeriodRange = (baseDate: Date) => {
    let year = baseDate.getFullYear();
    let month = baseDate.getMonth(); // 0-11
    
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

  const getUserVacationCount = (userId: string, type: string) => {
    return vacations
      .filter(v => v.userId === userId && v.type === type)
      .reduce((acc, curr) => acc + Number(curr.days), 0);
  };

  const visibleUsers = user.role === 'admin' ? users : users.filter(u => u.id === user.id);

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-rose-50">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-900 text-white rounded-2xl"><Calendar size={24}/></div>
            <h2 className="text-2xl font-black text-rose-900 leading-none">إدارة رصيد الإجازات</h2>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-rose-900 shadow-lg shadow-rose-100 font-black text-sm transition-all"
          >
            <Plus size={20}/> تسجيل جديد
          </button>
        </div>

        {/* User Vacation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleUsers.map(u => (
            <div key={u.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:border-rose-200 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-900 shadow-sm"><UserIcon size={24}/></div>
                  <div>
                    <p className="font-black text-rose-900">{u.employeeName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.employeeCode || 'بدون كود'}</p>
                  </div>
                </div>
              </div>

              {/* 4 Mini Squares */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'سنوي', type: 'annual', bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600' },
                  { label: 'عارضة', type: 'casual', bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-500' },
                  { label: 'مرضي', type: 'sick', bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-500' },
                  { label: 'بدون إذن', type: 'absent_without_permission', bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600' }
                ].map(box => (
                  <button 
                    key={box.type}
                    onClick={() => setSelectedDetails({ userId: u.id, type: box.type, userName: u.employeeName })}
                    className={`${box.light} p-3 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all shadow-sm border border-transparent hover:border-rose-200`}
                  >
                    <span className={`text-[8px] font-black uppercase ${box.text} mb-1`}>{box.label}</span>
                    <span className={`text-xl font-black ${box.text}`}>{getUserVacationCount(u.id, box.type)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Modal (Calendar/Period View) */}
      {selectedDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-rose-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">{selectedDetails.userName}</h3>
                <p className="text-[10px] font-bold text-rose-300 uppercase mt-1">
                  سجل: {
                    selectedDetails.type === 'annual' ? 'إجازات سنوية' :
                    selectedDetails.type === 'casual' ? 'إجازات عارضة' :
                    selectedDetails.type === 'sick' ? 'إجازات مرضية' : 'غياب بدون إذن'
                  }
                </p>
              </div>
              <button onClick={() => setSelectedDetails(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </div>

            {/* Period Navigation */}
            <div className="p-4 bg-slate-50 flex items-center justify-between border-b">
              <button onClick={() => changePeriod('prev')} className="p-2 bg-white rounded-xl shadow-sm hover:bg-rose-50 transition-all text-rose-900"><ChevronRight size={20}/></button>
              <div className="text-center">
                <p className="text-xs font-black text-rose-900">
                  {currentRange.start.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[9px] font-bold text-gray-400">الفترة المالية (21 - 20)</p>
              </div>
              <button onClick={() => changePeriod('next')} className="p-2 bg-white rounded-xl shadow-sm hover:bg-rose-50 transition-all text-rose-900"><ChevronLeft size={20}/></button>
            </div>

            {/* Dates List */}
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3">
              {vacations
                .filter(v => v.userId === selectedDetails.userId && v.type === selectedDetails.type)
                .filter(v => {
                  const d = new Date(v.date);
                  return d >= currentRange.start && d <= currentRange.end;
                })
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(v => (
                  <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-800 shadow-sm font-black text-xs">
                        {new Date(v.date).getDate()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{new Date(v.date).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v.days} يوم</p>
                      </div>
                    </div>
                    {user.role === 'admin' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleDeleteVacation(v.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                ))}

              {vacations
                .filter(v => v.userId === selectedDetails.userId && v.type === selectedDetails.type)
                .filter(v => {
                  const d = new Date(v.date);
                  return d >= currentRange.start && d <= currentRange.end;
                }).length === 0 && (
                  <div className="py-20 text-center text-gray-300 font-bold italic text-sm">لا توجد سجلات لهذه الفترة</div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Register New Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-rose-900 mb-8">تسجيل إجازة / غياب</h3>
            <div className="space-y-4">
              {user.role === 'admin' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">الموظف</label>
                  <select 
                    className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                    value={newVacation.targetUserId}
                    onChange={(e) => setNewVacation({...newVacation, targetUserId: e.target.value})}
                  >
                    {users.map(u => <option key={u.id} value={u.id}>{u.employeeName}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">التاريخ</label>
                <input 
                  type="date" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                  value={newVacation.date}
                  onChange={(e) => setNewVacation({...newVacation, date: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">نوع الإجازة</label>
                  <select 
                    className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200 text-sm"
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
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">الأيام</label>
                  <input 
                    type="number" className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200"
                    value={newVacation.days}
                    onChange={(e) => setNewVacation({...newVacation, days: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={handleAddVacation} className="flex-1 bg-rose-800 text-white py-4 rounded-xl font-black shadow-lg">تأكيد التسجيل</button>
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacationManagement;
