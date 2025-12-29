
import React, { useState } from 'react';
import { User, AppSettings, Market, Company, Notification, UserRole } from '../types';
import { db, ref, update, set, push, remove } from '../firebase';
import { 
  Save, UserPlus, Shield, MessageCircle, AlertCircle, 
  Store, Building2, UserCog, Send, Trash2, Edit,
  Settings as SettingsIcon, Key, UserCheck, X, Mail, Hash, User as UserIcon
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
      whatsappNumber: whatsapp
    });
    alert("تم حفظ الإعدادات بنجاح");
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`⚠️ هل أنت متأكد من حذف الموظف "${name}" نهائياً؟`)) {
      remove(ref(db, `users/${id}`));
      alert("تم الحذف بنجاح");
    }
  };

  const handleUpdateCredentials = async () => {
    if (!editingCredentials) return;
    if (!editingCredentials.username || !editingCredentials.password) {
      alert("يرجى ملء كافة البيانات");
      return;
    }
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
    if (window.confirm(`⚠️ هل أنت متأكد من حذف "${name}"؟ هذا الإجراء قد يؤثر على السجلات المرتبطة.`)) {
      remove(ref(db, `${type}/${id}`));
      alert("تم الحذف بنجاح");
    }
  };

  const handleUpdateItem = async () => {
    if (!editItem || !editItem.name.trim()) return;
    await update(ref(db, `${editItem.type}/${editItem.id}`), {
      name: editItem.name.trim()
    });
    alert("تم تعديل الاسم بنجاح");
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
          <div className="bg-white p-6 md:p-10 rounded-[2rem] border border-rose-50 shadow-sm">
            <h3 className="text-xl font-black text-rose-900 mb-6 flex items-center gap-3">
               <UserPlus className="text-rose-800" /> إضافة موظف جديد
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 mr-2 uppercase">الاسم الكامل (يظهر في السجلات)</label>
                <input className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" placeholder="أدخل اسم الموظف" value={newUser.employeeName} onChange={e => setNewUser({...newUser, employeeName: e.target.value})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 mr-2 uppercase">كود الموظف</label>
                <input className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" placeholder="مثال: SR-001" value={newUser.employeeCode} onChange={e => setNewUser({...newUser, employeeCode: e.target.value})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 mr-2 uppercase">المسمى الوظيفي</label>
                <select className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200 h-[56px]" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                  <option value="coordinator">منسق</option>
                  <option value="usher">أشر</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 mr-2 uppercase">اسم المستخدم (للدخول)</label>
                <input className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 mr-2 uppercase">كلمة المرور</label>
                <input className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-rose-200" type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
              </div>
            </div>
            <button onClick={() => {
              if(!newUser.username || !newUser.password || !newUser.employeeName) return alert("يرجى إكمال جميع البيانات الأساسية");
              const id = push(ref(db, 'users')).key || '';
              set(ref(db, `users/${id}`), { 
                ...newUser, 
                id, 
                isOnline: false, 
                vacationBalance: { annual: 21, casual: 7, sick: 0, exams: 0 },
                permissions: { viewSalesHistory: true, registerInventory: true, viewInventoryHistory: true, viewColleaguesSales: false } 
              });
              setNewUser({ username: '', password: '', employeeName: '', employeeCode: '', role: 'coordinator' });
              alert("تمت إضافة الموظف بنجاح");
            }} className="mt-6 bg-rose-800 text-white px-10 py-4 rounded-xl font-black shadow-lg shadow-rose-100 hover:bg-rose-900 transition-all flex items-center gap-2">
              <UserCheck size={20}/> تأكيد إضافة الحساب
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-rose-50 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-6">الموظف</th>
                    <th className="p-6">الكود</th>
                    <th className="p-6">الوظيفة</th>
                    <th className="p-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-rose-50/20">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${u.isOnline ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {u.employeeName?.charAt(0) || '?'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-gray-800">{u.employeeName}</span>
                            <span className="text-[10px] text-gray-400 font-bold">@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 font-bold text-xs text-slate-500">{u.employeeCode || '---'}</td>
                      <td className="p-6 font-bold text-xs text-rose-500">{getRoleLabel(u.role)}</td>
                      <td className="p-6">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => setMessageTarget(u)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all" title="إرسال رسالة"><Mail size={16}/></button>
                          <button onClick={() => setEditingCredentials(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all" title="تعديل بيانات الدخول"><Key size={16}/></button>
                          <button onClick={() => setEditingPermissions(u.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all" title="تعديل الصلاحيات"><Shield size={16}/></button>
                          <button onClick={() => handleDeleteUser(u.id, u.employeeName)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all" title="حذف"><Trash2 size={16}/></button>
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

      {(activeSubTab === 'markets' || activeSubTab === 'companies') && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-rose-50 shadow-sm">
            <h3 className="text-xl font-black text-rose-900 mb-6">إضافة {activeSubTab === 'markets' ? 'ماركت' : 'شركة منافسة'}</h3>
            <div className="flex gap-4">
              <input 
                className="flex-1 bg-slate-50 p-4 rounded-xl font-bold outline-none border-2 border-transparent focus:border-rose-200" 
                placeholder={`أدخل اسم ${activeSubTab === 'markets' ? 'الماركت' : 'الشركة'} الجديد...`}
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
              />
              <button 
                onClick={() => {
                  if(!newItemName.trim()) return;
                  push(ref(db, activeSubTab), { name: newItemName.trim(), creatorId: user.id });
                  setNewItemName('');
                  alert("تمت الإضافة بنجاح");
                }}
                className="bg-rose-800 text-white px-8 py-4 rounded-xl font-black shadow-lg shadow-rose-100"
              >إضافة</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeSubTab === 'markets' ? markets : companies).map(item => (
              <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-rose-50 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all">
                <span className="font-bold text-gray-700">{item.name}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => setEditItem({id: item.id, name: item.name, type: activeSubTab})} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit size={14}/></button>
                  <button onClick={() => handleDeleteItem(item.id, activeSubTab, item.name)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {messageTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-black text-rose-900 flex items-center gap-2"><Send size={20} /> إرسال رسالة للموظف</h4>
              <button onClick={() => setMessageTarget(null)}><X size={24} className="text-gray-400"/></button>
            </div>
            <p className="text-xs font-bold text-gray-400 mb-4">المستلم: {messageTarget.employeeName}</p>
            <textarea 
               className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none border-2 border-transparent focus:border-rose-200 h-40 resize-none text-sm"
               placeholder="اكتب رسالتك هنا..."
               value={msgText}
               onChange={e => setMsgText(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <button onClick={handleSendMessage} className="flex-1 bg-amber-600 text-white py-4 rounded-xl font-black shadow-lg">إرسال الآن</button>
              <button onClick={() => setMessageTarget(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Edit Modal */}
      {editingCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-8 border-b pb-4">
              <h4 className="text-xl font-black text-rose-900">تعديل بيانات الدخول</h4>
              <button onClick={() => setEditingCredentials(null)}><X size={24} className="text-gray-400"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">اسم المستخدم</label>
                <input 
                  className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none border-2 border-transparent focus:border-rose-200 mt-2"
                  value={editingCredentials.username}
                  onChange={e => setEditingCredentials({...editingCredentials, username: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">كلمة المرور الجديدة</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none border-2 border-transparent focus:border-rose-200 mt-2"
                  value={editingCredentials.password}
                  onChange={e => setEditingCredentials({...editingCredentials, password: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdateCredentials} className="flex-1 bg-rose-800 text-white py-4 rounded-xl font-black shadow-lg">حفظ التغييرات</button>
              <button onClick={() => setEditingCredentials(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
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

      {/* Item Edit Modal (Markets/Companies) */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h4 className="text-xl font-black text-rose-900 mb-6">تعديل الاسم</h4>
            <input 
              className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none border-2 border-transparent focus:border-rose-200"
              value={editItem.name}
              onChange={e => setEditItem({...editItem, name: e.target.value})}
            />
            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdateItem} className="flex-1 bg-rose-800 text-white py-4 rounded-xl font-black shadow-lg">حفظ</button>
              <button onClick={() => setEditItem(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Settings;
