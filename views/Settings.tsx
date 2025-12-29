
import React, { useState } from 'react';
import { User, AppSettings, Market, Company, Notification, UserRole } from '../types';
import { db, ref, update, set, push, remove } from '../firebase';
import { 
  Save, UserPlus, Shield, MessageCircle, AlertCircle, 
  Store, Building2, UserCog, Send, Trash2, Edit,
  Settings as SettingsIcon, Key, UserCheck, X
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
  const [newProgramName, setNewProgramName] = useState(settings?.programName || '');
  const [whatsapp, setWhatsapp] = useState(settings?.whatsappNumber || '');
  
  const [newUser, setNewUser] = useState({ username: '', password: '', employeeName: '', role: 'coordinator' as UserRole });
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [editingCredentials, setEditingCredentials] = useState<User | null>(null);
  const [messageTarget, setMessageTarget] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  const [newItemName, setNewItemName] = useState('');
  const [editItem, setEditItem] = useState<{id: string, name: string, type: 'markets' | 'companies'} | null>(null);

  const handleSaveGeneral = async () => {
    await update(ref(db, 'settings'), {
      tickerText: newTickerText,
      programName: newProgramName,
      whatsappNumber: whatsapp
    });
    alert("تم حفظ الإعدادات");
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'مدير نظام',
      coordinator: 'منسق',
      usher: 'أشر'
    };
    return roles[role] || role;
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
          <h3 className="text-xl font-black text-rose-900 mb-8">الإعدادات العامة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">اسم البرنامج</label>
              <input className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200" value={newProgramName} onChange={e => setNewProgramName(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">رقم الواتساب</label>
              <input className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}/>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">نص شريط الأخبار</label>
              <textarea className="w-full bg-slate-50 rounded-xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200 h-32 resize-none" value={newTickerText} onChange={e => setNewTickerText(e.target.value)}/>
            </div>
          </div>
          <button onClick={handleSaveGeneral} className="w-full md:w-auto bg-rose-800 text-white px-10 py-4 rounded-xl font-black flex items-center justify-center gap-2">
            <Save size={18}/> حفظ التعديلات
          </button>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="bg-white p-6 md:p-10 rounded-[2rem] border border-rose-50">
            <h3 className="text-xl font-black text-rose-900 mb-6">إضافة موظف جديد</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <input className="bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" placeholder="الاسم" value={newUser.employeeName} onChange={e => setNewUser({...newUser, employeeName: e.target.value})}/>
              <input className="bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" placeholder="المستخدم" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
              <input className="bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" type="password" placeholder="كلمة المرور" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
              <select className="bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="coordinator">منسق</option>
                <option value="usher">أشر</option>
                <option value="admin">مدير</option>
              </select>
            </div>
            <button onClick={() => {
              if(!newUser.username || !newUser.password) return alert("اكمل البيانات");
              const id = push(ref(db, 'users')).key || '';
              set(ref(db, `users/${id}`), { ...newUser, id, isOnline: false, permissions: { viewSalesHistory: true, registerInventory: true, viewInventoryHistory: true } });
              setNewUser({ username: '', password: '', employeeName: '', role: 'coordinator' });
            }} className="mt-6 bg-blue-600 text-white px-10 py-4 rounded-xl font-black">إضافة الموظف</button>
          </div>

          <div className="bg-white rounded-[2rem] border border-rose-50 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-6">الموظف</th>
                    <th className="p-6">الوظيفة</th>
                    <th className="p-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users && users.map(u => (
                    <tr key={u.id} className="hover:bg-rose-50/20">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${u.isOnline ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {u.employeeName?.charAt(0) || '?'}
                          </div>
                          <span className="font-bold text-sm text-gray-800">{u.employeeName}</span>
                        </div>
                      </td>
                      <td className="p-6 font-bold text-xs text-rose-500">{getRoleLabel(u.role)}</td>
                      <td className="p-6">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => setMessageTarget(u.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Send size={16}/></button>
                          <button onClick={() => setEditingPermissions(u.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Shield size={16}/></button>
                          <button onClick={() => remove(ref(db, `users/${u.id}`))} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal with Null Checks */}
      {editingPermissions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-8 border-b pb-4">
              <h4 className="text-xl font-black text-rose-900">تعديل الصلاحيات</h4>
              <button onClick={() => setEditingPermissions(null)}><X size={24} className="text-gray-400"/></button>
            </div>
            <div className="space-y-3">
              {(() => {
                const target = users.find(u => u.id === editingPermissions);
                if (!target || !target.permissions) return <p className="text-center text-gray-400 py-4 font-bold">لا توجد صلاحيات لعرضها</p>;
                return Object.entries(target.permissions).map(([key, val]: any) => (
                  <label key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-rose-50 transition-all">
                    <span className="text-xs font-bold text-gray-700">
                      {key === 'viewColleaguesSales' ? 'رؤية مبيعات الزملاء' : 
                       key === 'viewSalesHistory' ? 'رؤية سجل المبيعات' :
                       key === 'registerInventory' ? 'تسجيل المخزون' :
                       key === 'viewInventoryHistory' ? 'رؤية سجل المخزون' : 'صلاحية إضافية'}
                    </span>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-md accent-rose-600" 
                      checked={val} 
                      onChange={() => update(ref(db, `users/${editingPermissions}/permissions`), { [key]: !val })}
                    />
                  </label>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Ticker Animation CSS Fix */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Settings;
