
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { User, DailySale, InventoryRecord, Vacation, Market, AppSettings } from '../types';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, MessageSquare, Trash2 } from 'lucide-react';

interface Props {
  user: User;
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

const AIChatbot: React.FC<Props> = ({ user, appData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateDataSummary = () => {
    // Creating a clean text summary of the app data to feed the AI
    const totalSales = appData.sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const marketsCount = appData.markets.length;
    const usersCount = appData.users.length;
    
    // Top salesperson of all time in the record
    const userPerformance: Record<string, number> = {};
    appData.sales.forEach(s => {
      userPerformance[s.userName] = (userPerformance[s.userName] || 0) + Number(s.total);
    });
    const sortedPerformers = Object.entries(userPerformance).sort((a, b) => b[1] - a[1]);
    const topPerformer = sortedPerformers[0] ? `${sortedPerformers[0][0]} بمبيعات ${sortedPerformers[0][1].toLocaleString()}` : 'لا يوجد';

    return `
      إليك ملخص بيانات نظام Soft Rose Modern Trade الحالي:
      - اسم البرنامج: ${appData.settings?.programName || 'Soft Rose'}
      - عدد الموظفين المسجلين: ${usersCount}
      - عدد الماركتات المتعاقد معها: ${marketsCount}
      - إجمالي مبيعات البرنامج المسجلة: ${totalSales.toLocaleString()} ج.م
      - أفضل موظف مبيعات (تاريخياً): ${topPerformer}
      - قائمة الموظفين: ${appData.users.map(u => u.employeeName).join(', ')}
      - قائمة الماركتات: ${appData.markets.map(m => m.name).join(', ')}
      - عدد سجلات المخزون: ${appData.inventory.length}
      - عدد طلبات الإجازات: ${appData.vacations.length}
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
        أنت المساعد الذكي الرسمي لنظام "Soft Rose Modern Trade".
        اسمك "روزي". أنت خبير في تحليل بيانات المبيعات والمخزون والإجازات الخاصة بالشركة.
        تحدث دائماً باللغة العربية بأسلوب احترافي وودي.
        لديك صلاحية الوصول لبيانات البرنامج الحالية المرفقة في سياق الرسالة.
        أجب على أسئلة المستخدم بناءً على البيانات المتوفرة فقط. إذا سألك عن شيء غير موجود، أخبره بلطف أنك لا تملك هذه البيانات حالياً.
        بيانات المستخدم الحالي: ${user.employeeName}، وظيفته: ${user.role}.
        ${generateDataSummary()}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: `تعليمات النظام: ${systemInstruction}` }] },
          ...messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
      });

      const aiText = response.text || "عذراً، لم أستطع معالجة طلبك حالياً.";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "حدث خطأ في الاتصال بخوادم الذكاء الاصطناعي. يرجى المحاولة لاحقاً." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-[2.5rem] shadow-xl border border-rose-50 overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-rose-900 p-6 text-white flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <Sparkles className="text-amber-400" size={24}/>
          </div>
          <div>
            <h3 className="text-xl font-black">مساعد روزي الذكي</h3>
            <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest opacity-80">Soft Rose AI Assistant</p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([])} 
          className="p-2 hover:bg-white/10 rounded-xl transition-all"
          title="مسح المحادثة"
        >
          <Trash2 size={20}/>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
            <div className="p-8 bg-rose-50 rounded-[3rem]">
              <MessageSquare size={64} className="text-rose-200" />
            </div>
            <div>
              <p className="text-xl font-black text-rose-900">أهلاً بك في المساعد الذكي</p>
              <p className="text-sm font-bold text-gray-500 mt-2 max-w-xs mx-auto">
                يمكنك سؤالي عن مبيعات الشهر، أفضل الموظفين، أو حالة المخزون في الماركتات المختلفة.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md w-full px-4">
              {["من هو أفضل موظف مبيعات؟", "كم إجمالي المبيعات الكلية؟"].map((q, i) => (
                <button 
                  key={i} 
                  onClick={() => { setInput(q); }}
                  className="bg-white border border-rose-100 p-3 rounded-2xl text-xs font-bold text-rose-800 hover:bg-rose-900 hover:text-white transition-all shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-rose-800 text-white' : 'bg-white text-rose-900 border border-rose-100'}`}>
                {m.role === 'user' ? <UserIcon size={16}/> : <Bot size={16}/>}
              </div>
              <div className={`p-4 rounded-[1.5rem] font-bold text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-rose-800 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-slate-100 rounded-tl-none'}`}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-3 items-center bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
              <Loader2 className="animate-spin text-rose-600" size={16}/>
              <span className="text-xs font-black text-gray-400 tracking-widest uppercase">جاري التفكير والتحليل...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-rose-50">
        <div className="relative group">
          <input 
            className="w-full bg-slate-50 rounded-[2rem] py-5 px-8 pr-16 outline-none font-bold text-gray-700 border-2 border-transparent focus:border-rose-200 focus:bg-white transition-all shadow-inner"
            placeholder="اسألني أي شيء عن البرنامج..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-rose-800 text-white rounded-full hover:bg-rose-900 disabled:opacity-30 transition-all shadow-xl active:scale-90"
          >
            <Send size={20} className="transform rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
