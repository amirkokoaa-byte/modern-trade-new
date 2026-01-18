
import React, { useState, useEffect, useMemo } from 'react';
import { User, Vacation } from '../types';
import { db, ref, onValue, push, set, remove, update } from '../firebase';
import { Calendar, Plus, Trash2, Clock, ChevronRight, ChevronLeft, X, Edit, User as UserIcon, ListFilter, History, RotateCcw, Save } from 'lucide-react';

interface Props {
  user: User;
  users: User[];
  vacations: Vacation[];
}

const VacationManagement: React.FC<Props> = ({ user, users, vacations }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{ userId: string, type: string, userName: string } | null>(null);
  const [editingUserBalance, setEditingUserBalance] = useState<User | null>(null);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [currentPeriodDate, setCurrentPeriodDate] = useState(new Date());
  
  const [newVacation, setNewVacation] = useState({
    date: new Date().toISOString().split('T')[0],
    days: 1,
    type: 'annual' as const,
    targetUserId: user.id
  });

  const sortedVacations = useMemo(() => {
    return [...vacations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [vacations]);

  const handleAddVacation = async () => {
    const targetUserId = user.role === 'admin' ? newVacation.targetUserId : user.id;
    
    // Duplicate check
    const isDuplicate = vacations.some(v => v.userId === targetUserId && v.date === newVacation.date && v.id !== (editingVacation?.id || ''));
    if (isDuplicate) {
      alert("⚠️ تم تسجيل هذا اليوم من قبل لهذا الموظف");
      return;
    }

    const targetUser = users.find(u => u.id === targetUserId) || user;
    const up = targetUser.vacationBalance || { annual: 14, casual: 7, sick: 0, exams: 0, absent_with_permission: 0, absent_without_permission: 0 };
    let updatedBalance = { ...up };
    
    // 1. Refund previous balance if editing
    if (editingVacation) {
        if (editingVacation.type === 'annual') updatedBalance.annual += Number(editingVacation.days);
        else if (editingVacation.type === 'casual') updatedBalance.casual += Number(editingVacation.days);
        else if (editingVacation.type === 'absent_with_permission') updatedBalance.absent_with_permission = (updatedBalance.absent_with_permission || 0) + Number(editingVacation.days);
        else if (editingVacation.type === 'absent_without_permission') updatedBalance.absent_without_permission = (updatedBalance.absent_without_permission || 0) - Number(editingVacation.days);
    }

    // 2. Apply new deduction
    if (newVacation.type === 'annual') updatedBalance.annual -= newVacation.days;
    else if (newVacation.type === 'casual') updatedBalance.casual -= newVacation.days;
    else if (newVacation.type === 'absent_with_permission') updatedBalance.absent_with_permission = (updatedBalance.absent_with_permission || 0) - newVacation.days;
    else if (newVacation.type === 'absent_without_permission') updatedBalance.absent_without_permission = (updatedBalance.absent_without_permission || 0) + newVacation.days;

    await update(ref(db, `users/${targetUser.id}`), { vacationBalance: updatedBalance });

    if (editingVacation) {
        await update(ref(db, `vacations/${editingVacation.id}`), { ...newVacation, userId: targetUser.id, userName: targetUser.employeeName });
    } else {
        await push(ref(db, 'vacations'), {
            ...newVacation,
            userId: targetUser.id,
            userName: targetUser.employeeName,
            createdAt: new Date().toISOString()
        });
    }
    
    setIsModalOpen(false);
    setEditingVacation(null);
    alert(editingVacation ? "✅ تم تحديث الإجازة بنجاح" : "✅ تم تسجيل الإجازة بنجاح");
  };

  const handleDeleteVacation = async (id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من حذف هذا السجل؟ سيتم إعادة الأيام للرصيد فوراً.")) {
      const vToDelete = vacations.find(v => v.id === id);
      if (vToDelete) {
        const targetUser = users.find(u => u.id === vToDelete.userId);
        if (targetUser) {
          const up = targetUser.vacationBalance || { annual: 14, casual: 7 };
          let updatedBalance = { ...up };
          
          if (vToDelete.type === 'annual') updatedBalance.annual += Number(vToDelete.days);
          else if (vToDelete.type === 'casual') updatedBalance.casual += Number(vToDelete.days);
          else if (vToDelete.type === 'absent_with_permission') updatedBalance.absent_with_permission = (updatedBalance.absent_with_permission || 0) + Number(vToDelete.days);
          else if (vToDelete.type === 'absent_without_permission') updatedBalance.absent_without_permission = (updatedBalance.absent_without_permission || 0) - Number(vToDelete.days);

          await update(ref(db, `users/${targetUser.id}`), { vacationBalance: updatedBalance });
        }
      }
      await remove(ref(db, `vacations/${id}`));
    }
  };

  const getPeriodRange = (baseDate: Date) => {
    const d = new Date(baseDate);
    const day = d.getDate();
    let start, end;
    if (day >= 21) {
      start = new Date(d.getFullYear(), d.getMonth(), 21);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 20, 23, 59, 59);
    } else {
      start = new Date(d.getFullYear(), d.getMonth() - 1, 21);
      end = new Date(d.getFullYear(), d.getMonth(), 20, 23, 59, 59);
    }
    return { start, end };
  };

  const currentRange = useMemo(() => getPeriodRange(currentPeriodDate), [currentPeriodDate]);

  const visibleUsers = useMemo(() => {
    if (!users) return [];
    if (user.role === 'admin') return users;
    return users.filter(u => u.id === user.id);
  }, [user, users]);

  const filteredDetails = useMemo(() => {
    if (!selectedDetails) return [];
    return sortedVacations.filter(v => {
      const vDate = new Date(v.date);
      return v.type === selectedDetails.type && v.userId === selectedDetails.userId && vDate >= currentRange.start && vDate <= currentRange.end;
    });
  }, [selectedDetails, sortedVacations, currentRange]);

  const totalDaysInPeriod = useMemo(() => filteredDetails.reduce((sum, v) => sum + Number(v.days || 0), 0), [filteredDetails]);

  const getTypeNameAr = (type: string) => {
    const names: any = { annual: 'سنوي', casual: 'عارضة', sick: 'مرضي', exams: 'امتحانات', absent_with_permission: 'بإذن (تخصم من الراتب)', absent_without_permission: 'بدون إذن' };
    return names[type] || type;
  };

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      <div className="glass-card-dark p-6 md:p-8 rounded-[2rem] border border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg active-glow"><Calendar size={24}/></div>
            <div>
              <h2 className="text-2xl font-black text-white leading-none">إدارة الإجازات</h2>
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1">Vacation Balance Hub</p>
            </div>
          </div>
          <button 
            onClick={() => { setIsModalOpen(true); setEditingVacation(null); setNewVacation({ date: new Date().toISOString().split('T')[0], days: 1, type: 'annual', targetUserId: user.id }); }}
            className="w-full md:w-auto bg-rose-600 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-50 shadow-xl font-black text-sm transition-all active:scale-95"
          >
            <Plus size={20}/> تسجيل إجازة
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleUsers.map(u => (
            <div key={u.id} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 group hover:border-rose-500/30 transition-all relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-rose-900/40 rounded-2xl flex items-center justify-center text-rose-400 border border-white/10 font-black">{u.employeeName?.charAt(0)}</div>
                  <div>
                    <p className="font-black text-white">{u.employeeName}</p>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{u.employeeCode}</p>
                  </div>
                </div>
                {user.role === 'admin' && (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingUserBalance(u)} className="p-2 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit size={16}/></button>
                    <button onClick={() => { if(window.confirm(`حذف الموظف ${u.employeeName}؟`)) remove(ref(db, `users/${u.id}`)); }} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'سنوي', type: 'annual', balance: u.vacationBalance?.annual ?? 0, text: 'text-blue-400', light: 'bg-blue-500/10' },
                  { label: 'عارضة', type: 'casual', balance: u.vacationBalance?.casual ?? 0, text: 'text-orange-400', light: 'bg-orange-500/10' },
                  { label: 'بإذن', type: 'absent_with_permission', balance: u.vacationBalance?.absent_with_permission ?? 0, text: 'text-emerald-400', light: 'bg-emerald-500/10' },
                  { label: 'بدون إذن', type: 'absent_without_permission', balance: u.vacationBalance?.absent_without_permission ?? 0, text: 'text-purple-400', light: 'bg-purple-500/10' }
                ].map(box => (
                  <button 
                    key={box.type}
                    onClick={() => { setSelectedDetails({ userId: u.id, type: box.type, userName: u.employeeName }); setCurrentPeriodDate(new Date()); }}
                    className={`${box.light} p-3 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all border border-transparent hover:border-white/20`}
                  >
                    <span className={`text-[8px] font-black uppercase ${box.text} mb-1 tracking-tighter opacity-70`}>{box.label}</span>
                    <span className={`text-xl font-black ${box.text}`}>{box.balance}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4" onClick={() => setSelectedDetails(null)}>
          <div className="glass-card-dark rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-900/80 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl"><History size={20}/></div>
                <div>
                  <h3 className="text-lg font-black text-right">سجل {getTypeNameAr(selectedDetails.type)}</h3>
                  <p className="text-[10px] font-bold text-rose-300 opacity-80 uppercase tracking-widest text-right">{selectedDetails.userName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDetails(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </div>
            
            <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const d = new Date(currentPeriodDate);
                  d.setMonth(d.getMonth() - 1);
                  setCurrentPeriodDate(d);
                }} className="p-1.5 hover:bg-white/10 rounded-lg text-rose-400"><ChevronRight size={16}/></button>
                <span className="text-[10px] font-black text-white/50 uppercase">
                  {currentRange.start.toLocaleDateString('ar-EG', {month: 'long', year: 'numeric'})}
                </span>
                <button onClick={() => {
                  const d = new Date(currentPeriodDate);
                  d.setMonth(d.getMonth() + 1);
                  setCurrentPeriodDate(d);
                }} className="p-1.5 hover:bg-white/10 rounded-lg text-rose-400"><ChevronLeft size={16}/></button>
              </div>
              <div className="px-4 py-1.5 bg-rose-600 text-white rounded-full text-[11px] font-black">المجموع: {totalDaysInPeriod}</div>
            </div>

            <div className="max-h-[40vh] overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {filteredDetails.length === 0 ? (
                <div className="text-center py-10 opacity-40 italic font-bold text-white/40">لا توجد سجلات لهذه الفترة</div>
              ) : (
                filteredDetails.map(v => (
                  <div key={v.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-sm flex justify-between items-center group">
                    <div>
                      <span className="block text-xs font-black text-white">{new Date(v.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span className="block text-[10px] font-bold text-rose-400/60 italic mt-1">المدة: {v.days} يوم</span>
                    </div>
                    {user.role === 'admin' && v.type !== 'annual' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingVacation(v);
                            setNewVacation({ date: v.date, days: v.days, type: v.type, targetUserId: v.userId });
                            setSelectedDetails(null);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        >
                          <Edit size={16}/>
                        </button>
                        <button 
                          onClick={() => handleDeleteVacation(v.id)} 
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-6 bg-white/5 border-t border-white/5 flex gap-3">
               <button onClick={() => setCurrentPeriodDate(new Date())} className="flex-1 bg-white/5 text-white/60 py-4 rounded-2xl font-black text-sm hover:bg-white/10 transition-all border border-white/10">الشهر الحالي</button>
               <button onClick={() => setSelectedDetails(null)} className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl font-black text-sm">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="glass-card-dark rounded-[3rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 border border-white/10">
            <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
              {editingVacation ? <Edit className="text-blue-500"/> : <Plus className="text-rose-500"/>}
              {editingVacation ? 'تعديل إجازة' : 'تسجيل إجازة'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase mb-2 mr-1">الموظف</label>
                <select 
                  className={`w-full glass-input-dark rounded-xl p-4 font-bold outline-none border border-white/10 ${user.role !== 'admin' ? 'opacity-40' : ''}`}
                  value={newVacation.targetUserId}
                  disabled={user.role !== 'admin'}
                  onChange={(e) => setNewVacation({...newVacation, targetUserId: e.target.value})}
                >
                  {users.map(u => <option key={u.id} value={u.id} className="bg-slate-900">{u.employeeName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase mb-2">التاريخ</label>
                  <input type="date" className="w-full glass-input-dark rounded-xl p-4 font-bold outline-none border border-white/10 text-sm" value={newVacation.date} onChange={(e) => setNewVacation({...newVacation, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase mb-2">المدة (أيام)</label>
                  <input type="number" className="w-full glass-input-dark rounded-xl p-4 font-bold outline-none border border-white/10" value={newVacation.days} onChange={(e) => setNewVacation({...newVacation, days: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase mb-2">نوع الطلب</label>
                <select className="w-full glass-input-dark rounded-xl p-4 font-bold border border-white/10 outline-none" value={newVacation.type} onChange={(e) => setNewVacation({...newVacation, type: e.target.value as any})}>
                  <option value="annual" className="bg-slate-900">سنوي (خصم من الرصيد)</option>
                  <option value="casual" className="bg-slate-900">عارضة (خصم من الرصيد)</option>
                  <option value="sick" className="bg-slate-900">مرضي</option>
                  <option value="absent_with_permission" className="bg-slate-900">بإذن (تخصم من الراتب)</option>
                  <option value="absent_without_permission" className="bg-slate-900">غياب بدون إذن (إضافة للعداد)</option>
                  <option value="exams" className="bg-slate-900">امتحانات</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={handleAddVacation} className="flex-1 bg-rose-600 text-white py-4 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                <Save size={18}/> {editingVacation ? 'تحديث' : 'تأكيد'}
              </button>
              <button onClick={() => { setIsModalOpen(false); setEditingVacation(null); }} className="flex-1 bg-white/5 text-white/40 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingUserBalance && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="glass-card-dark rounded-[3rem] w-full max-w-md p-8 shadow-2xl border border-white/10 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white mb-6 border-b border-white/10 pb-4">تحديث أرصدة {editingUserBalance.employeeName}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-black text-white/40 mb-2">سنوي</label><input type="number" className="w-full glass-input-dark rounded-xl p-4 font-bold border border-white/10" value={editingUserBalance.vacationBalance?.annual} onChange={(e) => setEditingUserBalance({...editingUserBalance, vacationBalance: {...(editingUserBalance.vacationBalance || {}), annual: Number(e.target.value)} as any})} /></div>
              <div><label className="block text-[10px] font-black text-white/40 mb-2">عارضة</label><input type="number" className="w-full glass-input-dark rounded-xl p-4 font-bold border border-white/10" value={editingUserBalance.vacationBalance?.casual} onChange={(e) => setEditingUserBalance({...editingUserBalance, vacationBalance: {...(editingUserBalance.vacationBalance || {}), casual: Number(e.target.value)} as any})} /></div>
              <div><label className="block text-[10px] font-black text-white/40 mb-2">مرضي</label><input type="number" className="w-full glass-input-dark rounded-xl p-4 font-bold border border-white/10" value={editingUserBalance.vacationBalance?.sick} onChange={(e) => setEditingUserBalance({...editingUserBalance, vacationBalance: {...(editingUserBalance.vacationBalance || {}), sick: Number(e.target.value)} as any})} /></div>
              <div><label className="block text-[10px] font-black text-white/40 mb-2">غياب بدون إذن</label><input type="number" className="w-full glass-input-dark rounded-xl p-4 font-bold border border-white/10" value={editingUserBalance.vacationBalance?.absent_without_permission} onChange={(e) => setEditingUserBalance({...editingUserBalance, vacationBalance: {...(editingUserBalance.vacationBalance || {}), absent_without_permission: Number(e.target.value)} as any})} /></div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { update(ref(db, `users/${editingUserBalance.id}`), { vacationBalance: editingUserBalance.vacationBalance }); setEditingUserBalance(null); alert("تم التحديث"); }} className="flex-1 bg-rose-600 text-white py-4 rounded-xl font-black">حفظ</button>
              <button onClick={() => setEditingUserBalance(null)} className="flex-1 bg-white/5 text-white/40 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacationManagement;
