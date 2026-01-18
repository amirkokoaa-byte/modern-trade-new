
import React, { useState } from 'react';
import { User, AppSettings, Market, Company, Notification, UserRole } from '../types';
import { db, ref, update, set, push, remove } from '../firebase';
import { 
  Save, UserPlus, Shield, MessageCircle, AlertCircle, 
  Store, Building2, UserCog, Send, Trash2, Edit,
  Settings as SettingsIcon, Key, UserCheck, X, Mail, Hash, User as UserIcon, Trophy, Zap
} from 'lucide-react';

interface Props {
  user: User;
  settings: AppSettings | null;
  users: User[];
  markets: Market[];
  companies: Company[];
}

const Settings: React.FC<Props> = ({ user, settings, users = [], markets = [], companies = [] }) => {
  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 glass-card-dark rounded-[2rem] border border-white/5 shadow-sm" dir="rtl">
        <Shield size={64} className="text-rose-500/20 mb-4" />
        <h3 className="text-xl font-black text-white">عذراً، هذه الصفحة مخصصة للمدير فقط</h3>
        <p className="text-white/40 font-bold mt-2">لا تملك الصلاحيات الكافية لعرض أو تعديل إعدادات النظام</p>
      </div>
    );
  }

  const [activeSubTab, setActiveSubTab] = useState('general');
  const [newTickerText, setNewTickerText] = useState(settings?.tickerText || '');
  const [newProgramName, setNewProgramName] = useState(settings?.programName || 'Soft Rose Modern Trade');
  const [whatsapp, setWhatsapp] = useState(settings?.whatsappNumber || '');
  const [showTopSalesInTicker, setShowTopSalesInTicker] = useState(settings?.showTopSalesInTicker || false);
  const [isTickerAnimated, setIsTickerAnimated] = useState(settings?.isTickerAnimated || false);
  
  const [newUser, setNewUser] = useState({ 
    username: '', 
    password: '', 
    employeeName: '', 
    employeeCode: '', 
    role: 'coordinator' as UserRole 
  });

  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [editingCredentials, setEditingCredentials] = useState<User | null>(null);
  const [editItem, setEditItem] = useState<{id: string, name: string, type: 'markets' | 'companies'} | null>(null);
  
  const [messageTarget, setMessageTarget] = useState<User | null>(null);
  const [msgText, setMsgText] = useState('');

  const handleSaveGeneral = async () => {
    await update(ref(db, 'settings'), {
      tickerText: newTickerText,
      programName: newProgramName,
      whatsappNumber: whatsapp,
      showTopSalesInTicker: showTopSalesInTicker,
      isTickerAnimated: isTickerAnimated
    });
    alert("✅ تم حفظ الإعدادات بنجاح");
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`⚠️ هل أنت متأكد من حذف الموظف "${name}" نهائياً من النظام؟`)) {
      remove(ref(db, `users/${id}`));
    }
  };

  const handleUpdateCredentials = async () => {
    if (!editingCredentials) return;
    await update(ref(db, `users/${editingCredentials.id}`), {
      username: editingCredentials.username,
      password: editingCredentials.password
    });
    alert("✅ تم تحديث بيانات الدخول بنجاح");
    setEditingCredentials(null);
  };

  const handleSendMessage = async () => {
    if (!messageTarget || !msgText.trim()) return;
    const nRef = ref(db, 'notifications');
    await push(nRef, {
      senderId: user.id,
      receiverId: messageTarget.id,
      message: msgText,
      timestamp: new Date().toISOString(),
      isRead: false
    });
    alert("✅ تم إرسال الرسالة بنجاح");
    setMessageTarget(null);
    setMsgText('');
  };

  const handleDeleteItem = (id: string, type: 'markets' | 'companies', name: string) => {
    if (window.confirm(`⚠️ حذف "${name}"؟`)) {
      remove(ref(db, `${type}/${id}`));
    }
  };

  const handleUpdateItem = async () => {
    if (!editItem || !editItem.name.trim()) return;
    await update(ref(db, `${editItem.type}/${editItem.id}`), {
      name: editItem.name.trim()
    });
    setEditItem(null);
    alert("✅ تم التعديل بنجاح");
  };

  const togglePermission = async (userId: string, permissionKey: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    const currentPerms = targetUser.permissions || {};
    const updatedPerms = { ...currentPerms, [permissionKey]: !currentPerms[permissionKey as keyof typeof currentPerms] };
    await update(ref(db, `users/${userId}`), { permissions: updatedPerms });
  };

  const permissionLabels: Record<string, string> = {
    registerSales: 'المبيعات اليومية',
    viewSalesHistory: 'سجل المبيعات',
    registerInventory: 'تسجيل المخزون',
    viewInventoryHistory: 'سجل المخزون',
    registerCompetitorPrices: 'أسعار المنافسين',
    viewCompetitorReports: 'تقارير المنافسين',
    viewVacationMgmt: 'رصيد الإجازات',
    viewSettings: 'إعدادات النظام',
    viewColleaguesSales: 'رؤية مبيعات الزملاء'
  };

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'general', label: 'عام', icon: <SettingsIcon size={18}/> },
          { id: 'users', label: 'الموظفين', icon: <UserCog size={18}/> },
          { id: 'markets', label: 'الماركتات', icon: <Store size={18}/> },
          { id: 'companies', label: 'المنافسين', icon: <Building2 size={18}/> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl whitespace-nowrap transition-all font-black text-xs ${activeSubTab === tab.id ? 'bg-rose-600 text-white shadow-lg' : 'bg-white/5 text-white/40 border border-white/10'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'general' && (
        <div className="glass-card-dark p-6 md:p-10 rounded-[2rem] border border-white/5 animate-in fade-in">
          <h3 className="text-xl font-black text-white mb-8 border-b border-white/10 pb-4">الإعدادات العامة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mr-2">اسم البرنامج</label>
              <input className="w-full glass-input-dark rounded-xl p-4 font-bold outline-none border border-white/10 text-sm" value={newProgramName} onChange={e => setNewProgramName(e.target.value)}/>
            </div>
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mr-2">رقم الواتساب</label>
              <input className="w-full glass-input-dark rounded-xl p-4 font-bold outline-none border border-white/10 text-sm" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}/>
            </div>
            <div className="md:col-span-2 space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-5 bg-rose-600/10 rounded-[1.5rem] border border-rose-500/20">
                  <div className="flex items-center gap-3">
                    <Trophy className="text-rose-400" size={24}/>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">تفعيل نجم الشهر</p>
                      <p className="text-[10px] font-bold text-rose-400/60 uppercase">Top Performer</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={showTopSalesInTicker} onChange={e => setShowTopSalesInTicker(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-rose-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-5 bg-blue-600/10 rounded-[1.5rem] border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <Zap className="text-blue-400" size={24}/>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">تحريك شريط الأخبار</p>
                      <p className="text-[10px] font-bold text-blue-400/60 uppercase">Animated Ticker</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isTickerAnimated} onChange={e => setIsTickerAnimated(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
              </div>
              <div className="space-y-2 text-right">
                <label className="text-[10px] font-black text-white/30 uppercase mr-2">نص شريط الأخبار</label>
                <textarea className="w-full glass-input-dark rounded-xl p-4 font-bold outline-none border border-white/10 h-24 resize-none text-sm text-right" value={newTickerText} onChange={e => setNewTickerText(e.target.value)} />
              </div>
            </div>
          </div>
          <button onClick={handleSaveGeneral} className="bg-rose-600 text-white px-10 py-4 rounded-xl font-black flex items-center gap-2 shadow-lg hover:bg-rose-500 transition-all active:scale-95">
            <Save size={18}/> حفظ الإعدادات
          </button>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="glass-card-dark p-6 md:p-10 rounded-[2.5rem] border border-white/5">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3"><UserPlus className="text-rose-50" /> إضافة موظف جديد</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input className="glass-input-dark p-4 rounded-xl font-bold text-sm text-right" placeholder="الاسم" value={newUser.employeeName} onChange={e => setNewUser({...newUser, employeeName: e.target.value})}/>
              <input className="glass-input-dark p-4 rounded-xl font-bold text-sm text-right" placeholder="الكود" value={newUser.employeeCode} onChange={e => setNewUser({...newUser, employeeCode: e.target.value})}/>
              <select className="glass-input-dark p-4 rounded-xl font-bold text-sm text-right" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="coordinator" className="bg-slate-900">منسق</option>
                <option value="usher" className="bg-slate-900">أشر</option>
                <option value="admin" className="bg-slate-900">مدير</option>
              </select>
              <input className="glass-input-dark p-4 rounded-xl font-bold text-sm text-right" placeholder="اسم المستخدم" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
              <input className="glass-input-dark p-4 rounded-xl font-bold text-sm text-right" type="password" placeholder="كلمة المرور" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
            </div>
            <button onClick={() => {
              if(!newUser.username || !newUser.password || !newUser.employeeName) return alert("⚠️ يرجى ملء البيانات");
              const id = push(ref(db, 'users')).key || '';
              set(ref(db, `users/${id}`), { 
                ...newUser, 
                id, 
                isOnline: false, 
                permissions: { registerSales: true, viewSalesHistory: true, registerInventory: true, viewInventoryHistory: true, registerCompetitorPrices: true, viewCompetitorReports: true, viewVacationMgmt: true, viewSettings: false, viewColleaguesSales: false }, 
                vacationBalance: { annual: 14, casual: 7, sick: 0, exams: 0, absent_with_permission: 0, absent_without_permission: 0 } 
              });
              setNewUser({ username: '', password: '', employeeName: '', employeeCode: '', role: 'coordinator' });
              alert("✅ تم إنشاء الحساب بنجاح");
            }} className="mt-6 bg-rose-600 text-white px-10 py-4 rounded-xl font-black shadow-lg hover:bg-rose-500 active:scale-95 transition-all">إضافة الحساب</button>
          </div>

          <div className="glass-card-dark rounded-[2.5rem] border border-white/5 overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-white/5 text-[10px] font-black text-white/40">
                <tr><th className="p-6">الموظف</th><th className="p-6">الكود</th><th className="p-6 text-center">الإجراءات</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-black border border-rose-500/20">{u.employeeName?.charAt(0)}</div>
                        <span className="font-bold text-sm text-white">{u.employeeName}</span>
                      </div>
                    </td>
                    <td className="p-6 font-bold text-xs text-white/50">{u.employeeCode}</td>
                    <td className="p-6">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setMessageTarget(u)} className="p-2 text-amber-400 hover:bg-amber-400/10 rounded-lg" title="إرسال رسالة"><Mail size={16}/></button>
                        <button onClick={() => setEditingCredentials(u)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg" title="تعديل الباسورد"><Key size={16}/></button>
                        <button onClick={() => setEditingPermissions(u.id)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg" title="الصلاحيات"><Shield size={16}/></button>
                        <button onClick={() => handleDeleteUser(u.id, u.employeeName)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg" title="حذف المستخدم"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {messageTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="glass-card-dark rounded-[3rem] p-8 max-w-md w-full border border-white/10 animate-in zoom-in-95">
            <h4 className="text-xl font-black text-white mb-6 text-right">مراسلة {messageTarget.employeeName}</h4>
            <textarea className="w-full glass-input-dark p-4 rounded-xl font-bold outline-none border border-white/10 h-32 resize-none text-right text-sm" placeholder="نص الرسالة..." value={msgText} onChange={e => setMsgText(e.target.value)}/>
            <div className="flex gap-3 mt-8">
              <button onClick={handleSendMessage} className="flex-1 bg-rose-600 text-white py-4 rounded-xl font-black shadow-lg flex items-center justify-center gap-2"><Send size={16}/> إرسال الآن</button>
              <button onClick={() => setMessageTarget(null)} className="flex-1 bg-white/5 text-white/40 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingCredentials && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="glass-card-dark rounded-[3rem] p-8 max-w-md w-full border border-white/10 animate-in zoom-in-95">
            <h4 className="text-xl font-black text-white mb-6 text-center">تحديث بيانات {editingCredentials.employeeName}</h4>
            <div className="space-y-4">
              <input className="w-full glass-input-dark p-4 rounded-xl font-bold text-right text-sm" placeholder="اسم المستخدم" value={editingCredentials.username} onChange={e => setEditingCredentials({...editingCredentials, username: e.target.value})}/>
              <input type="password" className="w-full glass-input-dark p-4 rounded-xl font-bold text-right text-sm" placeholder="كلمة المرور الجديدة" value={editingCredentials.password} onChange={e => setEditingCredentials({...editingCredentials, password: e.target.value})}/>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdateCredentials} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black">تحديث</button>
              <button onClick={() => setEditingCredentials(null)} className="flex-1 bg-white/5 text-white/40 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingPermissions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="glass-card-dark rounded-[3rem] p-8 max-w-lg w-full border border-white/10">
            <h4 className="text-xl font-black text-white mb-6 border-b border-white/10 pb-4 text-right">صلاحيات الموظف</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(permissionLabels).map(([key, label]) => {
                const targetUser = users.find(u => u.id === editingPermissions);
                const isEnabled = targetUser?.permissions?.[key as keyof typeof targetUser.permissions];
                return (
                  <label key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-rose-500/10 transition-all border border-white/5">
                    <span className="text-xs font-bold text-white/70">{label}</span>
                    <input type="checkbox" checked={!!isEnabled} onChange={() => togglePermission(editingPermissions, key)} className="w-5 h-5 accent-rose-600" />
                  </label>
                );
              })}
            </div>
            <button onClick={() => setEditingPermissions(null)} className="w-full mt-8 bg-rose-600 text-white py-4 rounded-xl font-black">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
