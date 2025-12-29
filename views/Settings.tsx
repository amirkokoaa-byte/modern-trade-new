
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
  const [newItemName, setNewItemName] = useState('');
  
  // Message Modal State
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
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'مدير نظام',
      coordinator: 'منسق',
      usher: 'أشر'
    };
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
    <div className="space-y-8 pb-20 px-2 md:px-0">
      {/* Navigation Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        {[
          { id: 'general', label: 'عام', icon: <SettingsIcon size={18}/> },
          { id: 'users', label: 'الموظفين', icon: <UserCog size={18}/> },
          { id: 'markets', label: 'الماركتات', icon: <Store size={18}/> },
          { id: 'companies', label: 'المنافسين', icon: <Building2 size={18}/> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl whitespace-nowrap transition-all font-black text-xs ${activeSubTab === tab.id ? 'bg-rose-800 text-white shadow-lg' : 'bg-white text-gray-500 border border-slate-100'}`}
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
              <input className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200 shadow-inner" value={newProgramName} onChange={e => setNewProgramName(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">رقم الواتساب</label>
              <input className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200 shadow-inner" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}/>
            </div>
            
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between p-5 bg-rose-50 rounded-[1.5rem] border border-rose-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-800 text-white rounded-xl shadow-lg"><Trophy size={18}/></div>
                  <div>
                    <p className="text-sm font-black text-rose-900">تفعيل نجم الشهر في شريط الأخبار</p>
                    <p className="text-[9px] font-bold text-rose-400 leading-tight">عند تفعيله، سيظهر اسم أعلى موظف مبيعات تلقائياً لجميع المستخدمين</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={showTopSalesInTicker} onChange={e => setShowTopSalesInTicker(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-800"></div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">نص شريط الأخبار الإضافي</label>
                <textarea className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200 h-24 resize-none shadow-inner" value={newTickerText} onChange={e => setNewTickerText(e.target.value)} placeholder="اكتب رسالة مخصصة تظهر لجميع الموظفين..."/>
              </div>
            </div>
          </div>
          <button onClick={handleSaveGeneral} className="w-full md:w-auto bg-rose-800 text-white px-10 py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-rose-900 transition-all active:scale-95">
            <Save size={18}/> حفظ كافة التعديلات
          </button>
        </div>
      )}

      {/* Rest of the settings tabs stay largely similar but with defensive user mapping */}
      {activeSubTab === 'users' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-6 md:p-10 rounded-[2rem] border border-rose-50 shadow-sm">
            <h3 className="text-xl font-black text-rose-900 mb-6 flex items-center gap-3"><UserPlus className="text-rose-800" /> إضافة موظف جديد</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <input className="bg-slate-50 p-4 rounded-xl font-bold text-sm border-2 border-transparent focus:border-rose-200" placeholder="الاسم الكامل" value={newUser.employeeName} onChange={e => setNewUser({...newUser, employeeName: e.target.value})}/>
              <input className="bg-slate-50 p-4 rounded-xl font-bold text-sm border-2 border-transparent focus:border-rose-200" placeholder="كود الموظف" value={newUser.employeeCode} onChange={e => setNewUser({...newUser, employeeCode: e.target.value})}/>
              <select className="bg-slate-50 p-4 rounded-xl font-bold text-sm border-2 border-transparent focus:border-rose-200" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="coordinator">منسق</option>
                <option value="usher">أشر</option>
                <option value="admin">مدير</option>
              </select>
              <input className="bg-slate-50 p-4 rounded-xl font-bold text-sm border-2 border-transparent focus:border-rose-200" placeholder="اسم المستخدم" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
              <input className="bg-slate-50 p-4 rounded-xl font-bold text-sm border-2 border-transparent focus:border-rose-200" type="password" placeholder="كلمة المرور" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
            </div>
            <button onClick={() => {
              if(!newUser.username || !newUser.password) return alert("يرجى ملء البيانات");
              const id = push(ref(db, 'users')).key || '';
              set(ref(db, `users/${id}`), { ...newUser, id, isOnline: false, vacationBalance: { annual: 14, casual: 7, sick: 0, exams: 0, absent_with_permission: 0, absent_without_permission: 0 }, permissions: { registerSales: true, viewSalesHistory: true, registerInventory: true, viewInventoryHistory: true, registerCompetitorPrices: true, viewCompetitorReports: true, viewVacationMgmt: true, viewSettings: false, viewColleaguesSales: false } });
              setNewUser({ username: '', password: '', employeeName: '', employeeCode: '', role: 'coordinator' });
              alert("تمت الإضافة بنجاح");
            }} className="mt-6 bg-rose-800 text-white px-10 py-4 rounded-xl font-black shadow-lg shadow-rose-100 hover:bg-rose-900 transition-all">إضافة الحساب</button>
          </div>

          <div className="bg-white rounded-[2rem] border border-rose-50 overflow-hidden shadow-sm">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr><th className="p-6">الموظف</th><th className="p-6">الكود</th><th className="p-6">الوظيفة</th><th className="p-6 text-center">الإجراءات</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-rose-50/20">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${u.isOnline ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{u.employeeName?.charAt(0) || '?'}</div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{u.employeeName}</span>
                          <span className="text-[10px] text-gray-400">@{u.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 font-bold text-xs">{u.employeeCode || '---'}</td>
                    <td className="p-6 font-bold text-xs text-rose-500">{getRoleLabel(u.role)}</td>
                    <td className="p-6">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setMessageTarget(u)} className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Mail size={16}/></button>
                        <button onClick={() => setEditingCredentials(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Key size={16}/></button>
                        <button onClick={() => setEditingPermissions(u.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Shield size={16}/></button>
                        <button onClick={() => handleDeleteUser(u.id, u.employeeName)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Edit Modal (Markets/Companies) */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h4 className="text-xl font-black text-rose-900 mb-6">تعديل الاسم</h4>
            <input className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none border-2 border-transparent focus:border-rose-200" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})}/>
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
