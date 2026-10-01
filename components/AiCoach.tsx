
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
  isError?: boolean;
}

const STARTERS_HE = [
  "מהן נקודות העיוורון שלי ואיך להימנע מהן במצבי לחץ?",
  "איך אוכל למנף את הפרופיל שלי כדי להתקדם ולהשפיע בארגון?",
  "איך רצוי שאתקשר עם מנהל או קולגה בעל סגנון הפוך משלי?",
  "יש לי דילמה מול מנהל או קולגה",
  "אני רוצה לשנות משהו בדרך שבה אני עובד",
  "אני לא בטוח מה הצעד הבא שלי"
];

const STARTERS_EN = [
  "What are my blind spots, and how do I avoid them under pressure?",
  "How can I leverage my profile to advance and influence within the organization?",
  "How should I communicate with a manager or colleague whose style is the opposite of mine?",
  "I have a dilemma with a manager or colleague",
  "I want to change something in the way I work",
  "I'm not sure what my next step should be"
];

const HEADER_TEXT = {
  he: {
    title: 'דבר עם Kilon, היועץ האישי שלך',
    subtitle: 'יועץ AI שמכיר אותך, ומייעץ בשיטה של Kilon.',
    placeholder: 'כתוב את שאלתך או ספר על הדילמה שלך...'
  },
  en: {
    title: 'Talk to Kilon, your personal advisor',
    subtitle: 'An AI advisor who knows you and advises the Kilon way.',
    placeholder: 'Ask a question or tell me about your dilemma...'
  }
};

// Plain text -> safe HTML (used only if the markdown renderer is unavailable).
const plainToHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&#39;')
   .replace(/\n/g, '<br />');

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
          setHtmlContent(plainToHtml(text));
        }
      } catch (error) {
        setHtmlContent(plainToHtml(text));
      }
    };
    renderMarkdown();
  }, [text]);

  if (!text) return null;

  return (
    <div
      className={`max-w-none text-gray-200 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ps-5 [&_ol]:mb-3 [&_li]:mb-1.5 [&_strong]:text-white [&_strong]:font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
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

  const ht = HEADER_TEXT[lang === 'en' ? 'en' : 'he'];
  const starters = lang === 'en' ? STARTERS_EN : STARTERS_HE;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, isLoading]);

  const updateLastAi = (fn: (msg: Message) => Message) => {
    setConversation(prev => {
      const list = [...prev];
      const i = list.length - 1;
      if (i >= 0 && list[i].sender === 'ai') list[i] = fn(list[i]);
      return list;
    });
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || userInput;
    if (!text.trim() || isLoading) return;

    // Everything said so far (without failed replies) goes to the model as context.
    const history = conversation.filter(m => !m.isError);

    setConversation(prev => [...prev, { sender: 'user', text }, { sender: 'ai', text: '' }]);
    setUserInput('');
    setIsLoading(true);

    try {
      await getAiCoachAdviceStream(scores, text, (chunk) => {
        updateLastAi(m => ({ ...m, text: chunk }));
      }, backgroundData, lang, history);
    } catch (error: any) {
      console.error("AI Coach interaction failed:", error);
      updateLastAi(m => m.text ? m : {
        ...m,
        isError: true,
        text: error?.message || (lang === 'en'
          ? "Sorry, there was an error connecting to the AI service. Please check your internet connection and try again."
          : "מצטער, חלה שגיאה בחיבור לשרת ה-AI. וודא שחיבור האינטרנט תקין ונסה שוב.")
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
          <h3 className="text-2xl font-bold text-white">{ht.title}</h3>
          <p className="text-gray-400 text-sm font-medium">{ht.subtitle}</p>
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
                  {starters.map((q, i) => (
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
          placeholder={ht.placeholder}
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
