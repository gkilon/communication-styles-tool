
import React, { useState, useRef, useEffect } from 'react';
import { Scores, BackgroundData } from '../types';
import { getAiCoachAdviceStream } from '../services/geminiService';
import { SparklesIcon } from './icons/Icons';
import { useT } from '../i18n/useT';
import { useLanguage } from '../i18n/LanguageContext';

interface AiCoachProps {
  scores: Scores;
  backgroundData?: BackgroundData | null;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const PRESET_QUESTIONS_HE = [
  "איך אוכל למנף את הפרופיל שלי כדי להתקדם ולהשפיע בארגון?",
  "איך רצוי שאתקשר עם מנהל או קולגה בעל סגנון הפוך משלי?",
  "איך להציג רעיונות ויוזמות כדי לרתום את ההנהלה והצוות?",
  "מהם ה'שטחים המתים' (Blind Spots) שלי ואיך להימנע מהם במצבי לחץ?",
  "איך לנהל שיחות משוב וקונפליקטים מורכבים לפי הפרופיל שלי?"
];

const PRESET_QUESTIONS_EN = [
  "How can I leverage my profile to advance and influence within the organization?",
  "How should I communicate with a manager or colleague whose style is the opposite of mine?",
  "How do I present ideas and initiatives to win over leadership and the team?",
  "What are my blind spots, and how do I avoid them under pressure?",
  "How do I handle feedback conversations and complex conflicts given my profile?"
];

const AiMessageContent: React.FC<{ text: string }> = ({ text }) => {
  const { dir } = useLanguage();
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const renderMarkdown = () => {
      const marked = (window as any).marked;
      try {
        if (marked) {
          const parsed = typeof marked.parse === 'function' ? marked.parse(text) : (typeof marked === 'function' ? marked(text) : text);
          setHtmlContent(parsed);
        } else {
          setHtmlContent(text.replace(/\n/g, '<br />'));
        }
      } catch (error) {
        setHtmlContent(text.replace(/\n/g, '<br />'));
      }
    };
    renderMarkdown();
  }, [text]);

  if (!text) return null;

  return (
    <div
      className={`prose prose-invert max-w-none prose-p:text-gray-200 prose-p:leading-relaxed prose-ul:text-gray-200 prose-li:text-gray-200 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
      dir={dir}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export const AiCoach: React.FC<AiCoachProps> = ({ scores, backgroundData }) => {
  const { t } = useT();
  const { lang, dir } = useLanguage();
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const PRESET_QUESTIONS = lang === 'en' ? PRESET_QUESTIONS_EN : PRESET_QUESTIONS_HE;

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

    // Add a placeholder for AI response
    setConversation(prev => [...prev, { sender: 'ai', text: '' }]);

    try {
      await getAiCoachAdviceStream(scores, text, (chunk) => {
        setConversation(prev => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (next[lastIdx] && next[lastIdx].sender === 'ai') {
                next[lastIdx] = { ...next[lastIdx], text: chunk };
            }
            return next;
        });
      }, backgroundData, lang);
    } catch (error: any) {
      console.error("AI Coach interaction failed:", error);
      setConversation(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.sender === 'ai' && !last.text) {
            last.text = error?.message || (lang === 'en'
              ? "Sorry, there was an error connecting to the AI service. Please check your internet connection and try again."
              : "מצטער, חלה שגיאה בחיבור לשרת ה-AI. וודא שחיבור האינטרנט תקין ונסה שוב.");
        }
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" dir={dir}>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-cyan-500/20 p-2 rounded-xl">
          <SparklesIcon className="w-8 h-8 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">{t('aiCoach', 'title')}</h3>
          <p className="text-gray-400 text-sm font-medium">{t('aiCoach', 'subtitle')}</p>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="bg-gray-900/80 rounded-2xl h-[65dvh] min-h-[440px] max-h-[720px] overflow-y-auto mb-6 border border-gray-700/50 p-6 shadow-inner scroll-smooth"
      >
        {conversation.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-dashed border-gray-700">
                <p className="text-gray-400 mb-4 font-medium italic">{t('aiCoach', 'greeting')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_QUESTIONS.map((q, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSendMessage(q)} 
                      className={`${dir === 'rtl' ? 'text-right' : 'text-left'} text-sm bg-gray-800 hover:bg-gray-700 hover:text-cyan-400 text-gray-300 p-3 rounded-xl transition-all border border-gray-700 shadow-sm`}
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
                    <span className="text-xs text-gray-500 mr-2 font-bold uppercase tracking-wider">{t('aiCoach', 'processing')}</span>
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
          placeholder={t('aiCoach', 'inputPlaceholder')}
          className={`w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-4 ${dir === 'rtl' ? 'pr-5 pl-20' : 'pl-5 pr-20'} text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all shadow-lg`}
          disabled={isLoading}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !userInput.trim()}
          className={`absolute ${dir === 'rtl' ? 'left-2' : 'right-2'} top-2 bottom-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 rounded-xl transition-all disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md`}
        >
          {isLoading ? '...' : t('common', 'send')}
        </button>
      </div>
    </div>
  );
};
