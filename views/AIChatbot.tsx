
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { User, DailySale, InventoryRecord, Vacation, Market, AppSettings } from '../types';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, MessageSquare, Trash2, X } from 'lucide-react';

interface Props {
  user: User;
  onClose: () => void;
  appData: {
    sales: DailySale[];
    inventory: InventoryRecord[];
    vacations: Vacation[];
    users: User[];
    markets: Market[];
    settings: AppSettings | null;
  };
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const AIChatbot: React.FC<Props> = ({ user, appData, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateDataSummary = () => {
    const totalSales = appData.sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const marketsCount = appData.markets.length;
    const usersCount = appData.users.length;
    
    const userPerformance: Record<string, number> = {};
    appData.sales.forEach(s => {
      userPerformance[s.userName] = (userPerformance[s.userName] || 0) + Number(s.total);
    });
    const sortedPerformers = Object.entries(userPerformance).sort((a, b) => b[1] - a[1]);
    const topPerformer = sortedPerformers[0] ? `${sortedPerformers[0][0]} بمبيعات ${sortedPerformers[0][1].toLocaleString()}` : 'لا يوجد';

    return `
      إليك ملخص بيانات نظام Soft Rose Modern Trade الحالي (مأخوذ مباشرة من قاعدة البيانات):
      - اسم البرنامج: ${appData.settings?.programName || 'Soft Rose'}
      - عدد الموظفين المسجلين: ${usersCount}
      - عدد الماركتات: ${marketsCount}
      - إجمالي المبيعات الكلية المسجلة: ${totalSales.toLocaleString()} ج.م
      - المتصدر حالياً: ${topPerformer}
      - الموظفون: ${appData.users.map(u => u.employeeName).join(', ')}
      - الماركتات: ${appData.markets.map(m => m.name).join(', ')}
    `;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `
        أنت المساعد الذكي "روزي" لنظام Soft Rose. خبير في تحليل البيانات وتقديم الدعم الفوري.
        تحدث بالعربية بأسلوب مهذب ومختصر.
        صلاحياتك: تحليل المبيعات، المخزون، والإجازات.
        لديك وصول كامل لبيانات النظام اللحظية المرفقة أدناه.
        بيانات النظام الآن: ${generateDataSummary()}
        المستخدم الحالي هو: ${user.employeeName} (${user.role}).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: `التعليمات: ${systemInstruction}` }] },
          ...messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
      });

      const aiText = response.text || "عذراً، لم أستطع الرد حالياً.";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "خطأ في الاتصال. يرجى المحاولة لاحقاً." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-2xl border border-rose-100 overflow-hidden flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-rose-900 p-4 text-white flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Sparkles className="text-amber-400" size={18}/>
          </div>
          <div>
            <h3 className="text-sm font-black">روزي - المساعد الذكي</h3>
            <p className="text-[8px] font-bold text-rose-300 uppercase tracking-widest opacity-80">AI Assistant</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setMessages([])} className="p-2 hover:bg-white/10 rounded-lg transition-all"><Trash2 size={16}/></button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all"><X size={16}/></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div className="p-6 bg-rose-50 rounded-[2rem]">
              <MessageSquare size={48} className="text-rose-200" />
            </div>
            <p className="text-xs font-black text-rose-900 px-10">أهلاً {user.employeeName}! كيف يمكنني مساعدتك في بيانات Soft Rose اليوم؟</p>
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-rose-800 text-white' : 'bg-white text-rose-900 border border-rose-100'}`}>
                {m.role === 'user' ? <UserIcon size={14}/> : <Bot size={14}/>}
              </div>
              <div className={`p-3 rounded-2xl font-bold text-xs leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-rose-800 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-slate-100 rounded-tl-none'}`}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-end animate-pulse">
            <div className="flex gap-2 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
              <Loader2 className="animate-spin text-rose-600" size={14}/>
              <span className="text-[10px] font-black text-gray-400">جاري التحليل...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-rose-50 shrink-0">
        <div className="relative group">
          <input 
            className="w-full bg-slate-50 rounded-2xl py-4 px-12 pr-6 outline-none font-bold text-xs text-gray-700 border-2 border-transparent focus:border-rose-200 focus:bg-white transition-all shadow-inner"
            placeholder="اسألني عن المبيعات أو الموظفين..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 bg-rose-800 text-white rounded-xl hover:bg-rose-900 disabled:opacity-30 transition-all shadow-lg active:scale-90"
          >
            <Send size={16} className="transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
