
import React, { useState } from 'react';
import { User, AppSettings, Market, Company, Notification, UserRole } from '../types';
import { db, ref, update, set, push, remove } from '../firebase';
import { 
  Save, UserPlus, Shield, MessageCircle, AlertCircle, 
  Store, Building2, UserCog, Send, Trash2, Edit,
  Settings as SettingsIcon, Key, UserCheck, X, Mail, Hash, User as UserIcon, Trophy
} from 'lucide-react';

interface Props {
  user: User;
  settings: AppSettings | null;
  users: User[];
  markets: Market[];
  companies: Company[];
}

const Settings: React.FC<Props> = ({ user, settings, users = [], markets = [], companies = [] }) => {
  // Restriction: Only Admin can see settings data
  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-rose-50 shadow-sm">
        <Shield size={64} className="text-rose-200 mb-4" />
        <h3 className="text-xl font-black text-rose-900">عذراً، هذه الصفحة مخصصة للمدير فقط</h3>
        <p className="text-gray-400 font-bold mt-2">لا تملك الصلاحيات الكافية لعرض أو تعديل إعدادات النظام</p>
      </div>
    );
  }

  const [activeSubTab, setActiveSubTab] = useState('general');
  const [newTickerText, setNewTickerText] = useState(settings?.tickerText || '');
  const [newProgramName, setNewProgramName] = useState(settings?.programName || 'Soft Rose Modern Trade');
  const [whatsapp, setWhatsapp] = useState(settings?.whatsappNumber || '');
  const [showTopSalesInTicker, setShowTopSalesInTicker] = useState(settings?.showTopSalesInTicker || false);
  
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
      showTopSalesInTicker: showTopSalesInTicker
    });
    alert("تم حفظ الإعدادات بنجاح");
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`⚠️ هل أنت متأكد من حذف الموظف "${name}" نهائياً؟`)) {
      remove(ref(db, `users/${id}`));
    }
  };

  const handleUpdateCredentials = async () => {
    if (!editingCredentials) return;
    await update(ref(db, `users/${editingCredentials.id}`), {
      username: editingCredentials.username,
      password: editingCredentials.password
    });
    alert("تم تحديث بيانات الدخول بنجاح");
    setEditingCredentials(null);
  };

  const handleSendMessage = async () => {
    if (!messageTarget || !msgText.trim()) return;
    const notifRef = ref(db, 'notifications');
    await push(notifRef, {
      senderId: user.id,
      receiverId: messageTarget.id,
      message: msgText,
      timestamp: new Date().toISOString(),
      isRead: false
    });
    alert("تم إرسال الرسالة بنجاح");
    setMessageTarget(null);
    setMsgText('');
  };

  const handleDeleteItem = (id: string, type: 'markets' | 'companies', name: string) => {
    if (window.confirm(`⚠️ هل أنت متأكد من حذف "${name}"؟`)) {
      remove(ref(db, `${type}/${id}`));
    }
  };

  const handleUpdateItem = async () => {
    if (!editItem || !editItem.name.trim()) return;
    await update(ref(db, `${editItem.type}/${editItem.id}`), {
      name: editItem.name.trim()
    });
    setEditItem(null);
    alert("تم التعديل بنجاح");
  };

  const togglePermission = async (userId: string, permissionKey: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    const currentPerms = targetUser.permissions || {};
    const updatedPerms = { ...currentPerms, [permissionKey]: !currentPerms[permissionKey as keyof typeof currentPerms] };
    await update(ref(db, `users/${userId}`), { permissions: updatedPerms });
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = { admin: 'مدير نظام', coordinator: 'منسق', usher: 'أشر' };
    return roles[role] || role;
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
    <div className="space-y-8 pb-20">
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
            className={`flex items-center gap-2 px-6 py-3 rounded-xl whitespace-nowrap transition-all font-black text-xs ${activeSubTab === tab.id ? 'bg-rose-800 text-white shadow-lg shadow-rose-100' : 'bg-white text-gray-500 border border-slate-100'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'general' && (
        <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-rose-50 animate-in fade-in">
          <h3 className="text-xl font-black text-rose-900 mb-8 border-b pb-4">الإعدادات العامة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">اسم البرنامج</label>
              <input className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200" value={newProgramName} onChange={e => setNewProgramName(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">رقم الواتساب</label>
              <input className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}/>
            </div>
            <div className="md:col-span-2 space-y-4 pt-4">
              <div className="flex items-center justify-between p-5 bg-rose-50 rounded-[1.5rem] border border-rose-100">
                <div className="flex items-center gap-3">
                  <Trophy className="text-rose-800" size={24}/>
                  <div>
                    <p className="text-sm font-black text-rose-900">تفعيل نجم الشهر في شريط الأخبار</p>
                    <p className="text-[10px] font-bold text-rose-400">سيظهر اسم أعلى موظف مبيعات تلقائياً للجميع</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={showTopSalesInTicker} onChange={e => setShowTopSalesInTicker(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-rose-800 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full"></div>
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase mr-2">نص شريط الأخبار</label>
                <textarea className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200 h-24 resize-none" value={newTickerText} onChange={e => setNewTickerText(e.target.value)} />
              </div>
            </div>
          </div>
          <button onClick={handleSaveGeneral} className="bg-rose-800 text-white px-10 py-4 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-rose-100">
            <Save size={18}/> حفظ التعديلات
          </button>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-6 md:p-10 rounded-[2rem] border border-rose-50 shadow-sm">
            <h3 className="text-xl font-black text-rose-900 mb-6 flex items-center gap-3"><UserPlus className="text-rose-800" /> إضافة موظف</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input className="bg-slate-50 p-4 rounded-xl font-bold text-sm" placeholder="الاسم" value={newUser.employeeName} onChange={e => setNewUser({...newUser, employeeName: e.target.value})}/>
              <input className="bg-slate-50 p-4 rounded-xl font-bold text-sm" placeholder="الكود" value={newUser.employeeCode} onChange={e => setNewUser({...newUser, employeeCode: e.target.value})}/>
              <select className="bg-slate-50 p-4 rounded-xl font-bold text-sm" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="coordinator">منسق</option>
                <option value="usher">أشر</option>
                <option value="admin">مدير</option>
              </select>
            </div>
            <button onClick={() => {
              if(!newUser.username || !newUser.password) return alert("يرجى ملء البيانات");
              const id = push(ref(db, 'users')).key || '';
              set(ref(db, `users/${id}`), { ...newUser, id, isOnline: false, permissions: { registerSales: true, viewSalesHistory: true, registerInventory: true, viewInventoryHistory: true, registerCompetitorPrices: true, viewCompetitorReports: true, viewVacationMgmt: true, viewSettings: false, viewColleaguesSales: false }, vacationBalance: { annual: 14, casual: 7, sick: 0, exams: 0 } });
              setNewUser({ username: '', password: '', employeeName: '', employeeCode: '', role: 'coordinator' });
            }} className="mt-6 bg-rose-800 text-white px-10 py-4 rounded-xl font-black">إضافة الحساب</button>
          </div>

          <div className="bg-white rounded-[2rem] border border-rose-50 overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-[10px] font-black text-gray-400">
                <tr><th className="p-6">الموظف</th><th className="p-6">الكود</th><th className="p-6 text-center">الإجراءات</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-black">{u.employeeName?.charAt(0)}</div>
                        <span className="font-bold text-sm">{u.employeeName}</span>
                      </div>
                    </td>
                    <td className="p-6 font-bold text-xs">{u.employeeCode}</td>
                    <td className="p-6">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setMessageTarget(u)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"><Mail size={16}/></button>
                        <button onClick={() => setEditingCredentials(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Key size={16}/></button>
                        <button onClick={() => setEditingPermissions(u.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Shield size={16}/></button>
                        <button onClick={() => handleDeleteUser(u.id, u.employeeName)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'markets' && (
        <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-rose-50 animate-in fade-in">
          <h3 className="text-xl font-black text-rose-900 mb-8 flex items-center gap-3"><Store className="text-rose-800" /> إدارة الماركتات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map(m => (
              <div key={m.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100 group">
                <span className="font-bold text-sm text-gray-700">{m.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditItem({id: m.id, name: m.name, type: 'markets'})} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={16}/></button>
                  <button onClick={() => handleDeleteItem(m.id, 'markets', m.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
            {markets.length === 0 && <p className="text-center py-10 text-gray-400 col-span-full font-bold">لا توجد ماركتات مسجلة</p>}
          </div>
        </div>
      )}

      {activeSubTab === 'companies' && (
        <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-rose-50 animate-in fade-in">
          <h3 className="text-xl font-black text-rose-900 mb-8 flex items-center gap-3"><Building2 className="text-rose-800" /> إدارة الشركات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map(c => (
              <div key={c.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100 group">
                <span className="font-bold text-sm text-gray-700">{c.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditItem({id: c.id, name: c.name, type: 'companies'})} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={16}/></button>
                  <button onClick={() => handleDeleteItem(c.id, 'companies', c.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
            {companies.length === 0 && <p className="text-center py-10 text-gray-400 col-span-full font-bold">لا توجد شركات مسجلة</p>}
          </div>
        </div>
      )}

      {/* Modals for actions */}
      {messageTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setMessageTarget(null)}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-black text-rose-900 mb-6">مراسلة {messageTarget.employeeName}</h4>
            <textarea className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none border-2 border-transparent focus:border-rose-200 h-32 resize-none" placeholder="نص الرسالة..." value={msgText} onChange={e => setMsgText(e.target.value)}/>
            <div className="flex gap-3 mt-8">
              <button onClick={handleSendMessage} className="flex-1 bg-rose-800 text-white py-4 rounded-xl font-black">إرسال</button>
              <button onClick={() => setMessageTarget(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setEditingCredentials(null)}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-black text-rose-900 mb-6 text-center">بيانات دخول {editingCredentials.employeeName}</h4>
            <div className="space-y-4">
              <input className="w-full bg-slate-50 p-4 rounded-xl font-bold border-2 border-transparent focus:border-rose-200 outline-none" placeholder="اسم المستخدم" value={editingCredentials.username} onChange={e => setEditingCredentials({...editingCredentials, username: e.target.value})}/>
              <input type="password" className="w-full bg-slate-50 p-4 rounded-xl font-bold border-2 border-transparent focus:border-rose-200 outline-none" placeholder="كلمة المرور" value={editingCredentials.password} onChange={e => setEditingCredentials({...editingCredentials, password: e.target.value})}/>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdateCredentials} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black">تحديث</button>
              <button onClick={() => setEditingCredentials(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingPermissions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setEditingPermissions(null)}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-black text-rose-900 mb-6 border-b pb-4">صلاحيات الوصول</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(permissionLabels).map(([key, label]) => {
                const targetUser = users.find(u => u.id === editingPermissions);
                const isEnabled = targetUser?.permissions?.[key as keyof typeof targetUser.permissions];
                return (
                  <label key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-rose-50 transition-all">
                    <span className="text-xs font-bold text-gray-700">{label}</span>
                    <input type="checkbox" checked={!!isEnabled} onChange={() => togglePermission(editingPermissions, key)} className="w-5 h-5 accent-rose-800" />
                  </label>
                );
              })}
            </div>
            <button onClick={() => setEditingPermissions(null)} className="w-full mt-8 bg-rose-800 text-white py-4 rounded-xl font-black">إغلاق</button>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-black text-rose-900 mb-6">تعديل الاسم</h4>
            <input className="w-full bg-slate-50 p-4 rounded-xl font-bold border-2 border-transparent focus:border-rose-200 outline-none" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})}/>
            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdateItem} className="flex-1 bg-rose-800 text-white py-4 rounded-xl font-black shadow-lg shadow-rose-100">حفظ</button>
              <button onClick={() => setEditItem(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
