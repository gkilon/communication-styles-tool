
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getTeamAiAdvice, getTeamAiAdviceStream, translateText } from '../services/geminiService';
import { SparklesIcon } from './icons/Icons';
import { Globe, Loader2 } from 'lucide-react';

interface TeamAiCoachProps {
  users: UserProfile[];
  teamName: string;
}

type Lang = 'HE' | 'EN';

export const TeamAiCoach: React.FC<TeamAiCoachProps> = ({ users, teamName }) => {
  const [challenge, setChallenge] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState<Lang>('HE');
  const [translations, setTranslations] = useState<{ HE?: string; EN?: string }>({});
  const [loadingLang, setLoadingLang] = useState<Lang | null>(null);

  // Reset translations when a brand new response starts
  useEffect(() => {
    if (isLoading && !aiResponse) {
        setTranslations({});
        setCurrentLang('HE');
    }
  }, [isLoading, aiResponse]);

  const handleAnalyze = async () => {
    if (!challenge.trim() || users.length === 0) return;
    
    setIsLoading(true);
    setAiResponse('');
    setTranslations({});
    setCurrentLang('HE');
    
    try {
        await getTeamAiAdviceStream(users, challenge, (chunk) => {
            setAiResponse(chunk);
            setTranslations(prev => ({ ...prev, HE: chunk }));
        });
    } catch (e: any) {
        setAiResponse(e?.message || "אירעה שגיאה בקבלת הייעוץ. אנא נסה שוב.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleTranslate = async (lang: Lang) => {
    if (lang === currentLang) return;
    if (lang === 'EN' && !translations.EN) {
      const sourceText = translations.HE || aiResponse;
      if (!sourceText) return;

      setLoadingLang('EN');
      try {
          const translated = await translateText(sourceText, 'English');
          setTranslations(prev => ({ ...prev, EN: translated }));
          setCurrentLang('EN');
      } catch (error) {
          console.error("Translation fail:", error);
          alert("שגיאה בתרגום לאנגלית. אנא נסה שוב.");
      } finally {
          setLoadingLang(null);
      }
    } else {
      setCurrentLang(lang);
    }
  };

  const renderResponse = () => {
      const text = (currentLang === 'EN' && translations.EN) ? translations.EN : (translations.HE || aiResponse);
      if (!text) return null;
      
      const isRtl = currentLang === 'HE';

      let htmlContent = '';
      const marked = (window as any).marked;

      try {
        if (marked && typeof marked.parse === 'function') {
            const result = marked.parse(text);
            htmlContent = typeof result === 'string' ? result : text.replace(/\n/g, '<br />');
        } else if (marked && typeof marked === 'function') {
            const result = marked(text);
            htmlContent = typeof result === 'string' ? result : text.replace(/\n/g, '<br />');
        } else {
            htmlContent = text.replace(/\n/g, '<br />');
        }
      } catch (error) {
        console.warn("Error parsing markdown:", error);
        htmlContent = text.replace(/\n/g, '<br />');
      }
      
      return (
          <div 
            className={`prose prose-invert prose-p:text-gray-300 prose-headings:text-cyan-400 prose-li:text-gray-300 max-w-none ${isRtl ? 'dir-rtl text-right' : 'dir-ltr text-left'}`}
            style={{ direction: isRtl ? 'rtl' : 'ltr' }}
          >
             <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
      );
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-cyan-900/50 mt-8 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4 border-b border-gray-700 pb-4">
        <div className="bg-cyan-900/50 p-2 rounded-lg">
            <SparklesIcon className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
            <h3 className="text-xl font-bold text-white">יועץ ארגוני וירטואלי לצוות: {teamName}</h3>
            <p className="text-xs text-gray-400">מבוסס על ניתוח ההרכב האנושי של הצוות אל מול האתגרים.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Input Section */}
        <div className="w-full md:w-1/3 space-y-4">
            <div>
                <label className="block text-sm text-gray-300 mb-2 font-bold">מה האתגר המרכזי של הצוות לשנה הקרובה?</label>
                <textarea
                    value={challenge}
                    onChange={(e) => setChallenge(e.target.value)}
                    placeholder="לדוגמה: יש לנו המון משימות ואנחנו מפספסים דדליינים, או שהתקשורת בישיבות הופכת לוויכוחים..."
                    className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none text-sm"
                />
            </div>
            <button
                onClick={handleAnalyze}
                disabled={isLoading || !challenge.trim() || users.length === 0}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
                {isLoading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>מעבד נתונים...</span>
                    </>
                ) : (
                    <>
                        <SparklesIcon className="w-5 h-5" />
                        <span>נתח אתגר וקבל המלצות</span>
                    </>
                )}
            </button>
        </div>

        {/* Output Section */}
        <div className="w-full md:w-2/3 bg-gray-900/50 rounded-lg p-6 border border-gray-700 min-h-[250px] flex flex-col">
            {aiResponse && (
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700/50 no-print">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                        <Globe className="w-4 h-4" />
                        <span>{currentLang === 'HE' ? 'שפה:' : 'Language:'}</span>
                    </div>
                    <div className="flex items-center bg-gray-800/80 p-1 rounded-lg border border-gray-700/60 gap-1">
                        <button
                            onClick={() => handleTranslate('HE')}
                            disabled={loadingLang !== null || isLoading}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                currentLang === 'HE'
                                    ? 'bg-cyan-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            }`}
                        >
                            עברית
                        </button>
                        <button
                            onClick={() => handleTranslate('EN')}
                            disabled={loadingLang !== null || isLoading}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                                currentLang === 'EN'
                                    ? 'bg-cyan-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            }`}
                        >
                            {loadingLang === 'EN' ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin text-cyan-300" />
                                    <span>Translating...</span>
                                </>
                            ) : (
                                <span>English</span>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1">
                {!aiResponse && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center opacity-60 py-10">
                        <SparklesIcon className="w-12 h-12 mb-2" />
                        <p>הזן אתגר בצד ימין כדי לקבל ניתוח מעמיק המותאם<br/>ל-DNA של חברי הצוות שלך.</p>
                    </div>
                )}
                
                {isLoading && !aiResponse && (
                    <div className="space-y-4 animate-pulse py-4">
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                        <div className="h-32 bg-gray-700 rounded w-full mt-4"></div>
                    </div>
                )}

                {aiResponse && (
                    <div className="animate-fade-in py-2">
                        {renderResponse()}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
