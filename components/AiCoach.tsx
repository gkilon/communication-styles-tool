
import React, { useState, useRef, useEffect } from 'react';
import { Scores } from '../types';
import { getAiCoachAdvice } from '../services/geminiService';
import { SparklesIcon } from './icons/Icons';

interface AiCoachProps {
  scores: Scores;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const PRESET_QUESTIONS = [
  "איך אוכל לשפר את עבודת הצוות שלי?",
  "מה הדרך הטובה ביותר עבורי להשפיע על אחרים?",
  "תן לי טיפ להתמודדות עם קונפליקטים.",
  "כיצד אוכל למנף את החוזקות שלי כדי להתקדם?"
];

const AiMessageContent: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const renderMarkdown = () => {
      const marked = (window as any).marked;
      try {
        if (marked) {
          // Robust check for different marked versions
          const parsed = typeof marked.parse === 'function' ? marked.parse(text) : (typeof marked === 'function' ? marked(text) : text);
          setHtmlContent(parsed);
        } else {
          setHtmlContent(text.replace(/\n/g, '<br />'));
        }
      } catch (error) {
        console.warn("Markdown parsing failed, falling back to plain text", error);
        setHtmlContent(text.replace(/\n/g, '<br />'));
      }
    };
    renderMarkdown();
  }, [text]);

  return (
    <div
      className="prose prose-invert max-w-none prose-p:text-gray-200 prose-p:leading-relaxed prose-ul:text-gray-200 prose-li:text-gray-200"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export const AiCoach: React.FC<AiCoachProps> = ({ scores }) => {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, isLoading]);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || userInput;
    if (!text.trim() || isLoading) return;

    const newUserMessage: Message = { sender: 'user', text };
    setConversation(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const aiResponse = await getAiCoachAdvice(scores, text);
      const safeResponse = aiResponse || "מצטער, חלה שגיאה בעיבוד התשובה. נסה שוב.";
      setConversation(prev => [...prev, { sender: 'ai', text: safeResponse }]);
    } catch (error: any) {
      console.error("AI Coach interaction failed:", error);
      setConversation(prev => [...prev, { 
        sender: 'ai', 
        text: "מצטער, חלה שגיאה בחיבור לשרת ה-AI. וודא שחיבור האינטרנט תקין ונסה שוב." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-cyan-500/20 p-2 rounded-xl">
          <SparklesIcon className="w-8 h-8 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">מאמן ה-AI האישי שלך</h3>
          <p className="text-gray-400 text-sm font-medium">ייעוץ מותאם אישית לפרופיל התקשורת שלך</p>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="bg-gray-900/80 rounded-2xl h-[400px] overflow-y-auto mb-6 border border-gray-700/50 p-6 shadow-inner scroll-smooth"
      >
        {conversation.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-dashed border-gray-700">
                <p className="text-gray-400 mb-4 font-medium italic">"היי! אני כאן כדי לעזור לך לרתום את החוזקות שלך. על מה נרצה לדבר היום?"</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_QUESTIONS.map((q, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSendMessage(q)} 
                      className="text-right text-sm bg-gray-800 hover:bg-gray-700 hover:text-cyan-400 text-gray-300 p-3 rounded-xl transition-all border border-gray-700 shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          {conversation.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div
                className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                  msg.sender === 'user' 
                  ? 'bg-gradient-to-br from-cyan-700 to-blue-800 text-white rounded-tl-none' 
                  : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tr-none'
                }`}
              >
                {msg.sender === 'ai' ? (
                   <AiMessageContent text={msg.text} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
          
           {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl rounded-tr-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                    <span className="text-xs text-gray-500 mr-2 font-bold uppercase tracking-wider">מעבד נתונים...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative group">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="כתוב את שאלתך כאן..."
          className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-4 pr-5 pl-20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all shadow-lg"
          disabled={isLoading}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !userInput.trim()}
          className="absolute left-2 top-2 bottom-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 rounded-xl transition-all disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md"
        >
          {isLoading ? '...' : 'שלח'}
        </button>
      </div>
    </div>
  );
};
