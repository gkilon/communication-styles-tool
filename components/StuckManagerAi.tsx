import React, { useState, useRef, useEffect } from 'react';
import { Scores } from '../types';
import { getStuckManagerAdviceStream } from '../services/geminiService';
import { useT } from '../i18n/useT';
import { useLanguage } from '../i18n/LanguageContext';

interface StuckManagerAiProps {
  scores: Scores;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const PRESET_QUESTIONS_HE = [
  "אני רותח מזעם עכשיו ועומד להתפוצץ בשיחה.",
  "אני קופא מול התנגדות של העובד ולא מוצא מילים.",
  "אני מוצף בפרטים ומרגיש שאני מאבד שליטה ומתפזר.",
  "אני בורח מהחלטה קשה כי אני מפחד לטעות."
];

const PRESET_QUESTIONS_EN = [
  "I'm boiling with anger right now and about to blow up in a conversation.",
  "I freeze up against an employee's pushback and can't find the words.",
  "I'm overloaded with details and feel like I'm losing control and scattering.",
  "I'm avoiding a hard decision because I'm afraid of getting it wrong."
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

export const StuckManagerAi: React.FC<StuckManagerAiProps> = ({ scores }) => {
  const { t } = useT();
  const { lang, dir } = useLanguage();
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const PRESET_QUESTIONS = lang === 'en' ? PRESET_QUESTIONS_EN : PRESET_QUESTIONS_HE;

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

    setConversation(prev => [...prev, { sender: 'ai', text: '' }]);

    try {
      await getStuckManagerAdviceStream(scores, text, (chunk) => {
        setConversation(prev => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (next[lastIdx] && next[lastIdx].sender === 'ai') {
                next[lastIdx] = { ...next[lastIdx], text: chunk };
            }
            return next;
        });
      }, lang);
    } catch (error: any) {
      console.error("Stuck Manager AI interaction failed:", error);
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
        <div className="bg-orange-500/20 p-2 rounded-xl">
          <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">{t('stuckManager', 'title')}</h3>
          <p className="text-gray-400 text-sm font-medium">{t('stuckManager', 'subtitle')}</p>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="bg-gray-900/80 rounded-2xl h-[65dvh] min-h-[440px] max-h-[720px] overflow-y-auto mb-6 border border-gray-700/50 p-6 shadow-inner scroll-smooth"
      >
        {conversation.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-dashed border-gray-700">
                <p className="text-gray-400 mb-4 font-medium italic">{t('stuckManager', 'greeting')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_QUESTIONS.map((q, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSendMessage(q)} 
                      className={`${dir === 'rtl' ? 'text-right' : 'text-left'} text-sm bg-gray-800 hover:bg-gray-700 hover:text-orange-400 text-gray-300 p-3 rounded-xl transition-all border border-gray-700 shadow-sm`}
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
                  ? 'bg-gradient-to-br from-orange-700 to-red-800 text-white rounded-tl-none' 
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
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                    <span className="text-xs text-gray-500 mr-2 font-bold uppercase tracking-wider">{t('stuckManager', 'analyzing')}</span>
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
          placeholder={t('stuckManager', 'inputPlaceholder')}
          className={`w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-4 ${dir === 'rtl' ? 'pr-5 pl-20' : 'pl-5 pr-20'} text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all shadow-lg`}
          disabled={isLoading}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !userInput.trim()}
          className={`absolute ${dir === 'rtl' ? 'left-2' : 'right-2'} top-2 bottom-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 rounded-xl transition-all disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md`}
        >
          {isLoading ? '...' : t('common', 'send')}
        </button>
      </div>
    </div>
  );
};
