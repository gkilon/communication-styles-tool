import React, { useState } from 'react';
import { translateAnalysisToEnglish } from '../services/geminiService';
import { Globe, Loader2 } from 'lucide-react';

interface Analysis {
  general: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
}

interface CombinedAnalysisProps {
  analysis: Analysis;
}

type Lang = 'HE' | 'EN';

export const CombinedAnalysis: React.FC<CombinedAnalysisProps> = ({ analysis: initialAnalysis }) => {
  const [currentLang, setCurrentLang] = useState<Lang>('HE');
  const [translations, setTranslations] = useState<{ HE: Analysis; EN?: Analysis }>({ HE: initialAnalysis });
  const [isLoading, setIsLoading] = useState(false);

  if (!initialAnalysis) return null;

  const currentAnalysis = (currentLang === 'EN' && translations.EN) ? translations.EN : initialAnalysis;
  const isRtl = currentLang === 'HE';

  const handleLangChange = async (lang: Lang) => {
    if (lang === currentLang) return;
    
    if (lang === 'EN' && !translations.EN) {
      setIsLoading(true);
      try {
        const englishAnalysis = await translateAnalysisToEnglish(initialAnalysis);
        setTranslations(prev => ({ ...prev, EN: englishAnalysis }));
        setCurrentLang('EN');
      } catch (error) {
        console.error("Failed to translate analysis:", error);
        alert("שגיאה בתרגום לאנגלית. אנא נסה שוב.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setCurrentLang(lang);
    }
  };

  return (
    <div className={`h-full flex flex-col space-y-6 ${isRtl ? 'dir-rtl' : 'dir-ltr'}`} style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Language Selector */}
      <div className="flex justify-between items-center no-print bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
        <div className={`flex items-center gap-2 text-cyan-400 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
          <Globe className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">{currentLang === 'HE' ? 'שפה:' : 'Language:'}</span>
        </div>
        <div className="flex items-center bg-slate-900/60 p-1 rounded-xl border border-slate-700/40 gap-1">
          <button
            onClick={() => handleLangChange('HE')}
            disabled={isLoading}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
              currentLang === 'HE'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'text-gray-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            עברית
          </button>
          <button
            onClick={() => handleLangChange('EN')}
            disabled={isLoading}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
              currentLang === 'EN'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'text-gray-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isLoading ? (
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

      <div className="space-y-6 text-gray-300 leading-relaxed overflow-y-auto pr-1 custom-scrollbar">
        <div className="group transition-all duration-300">
          <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2 group-hover:text-cyan-400">
            <span className="opacity-50 text-sm">01</span>
            {currentLang === 'HE' ? 'ניתוח כללי' : 'General Analysis'}
          </h4>
          <p className="bg-slate-800/20 p-4 rounded-xl border border-slate-700/30 group-hover:border-cyan-500/30 transition-all font-light whitespace-pre-line">
            {currentAnalysis.general}
          </p>
        </div>

        <div className="group transition-all duration-300">
          <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2 group-hover:text-cyan-400">
            <span className="opacity-50 text-sm">02</span>
            {currentLang === 'HE' ? 'חוזקות' : 'Key Strengths'}
          </h4>
          <p className="bg-slate-800/20 p-4 rounded-xl border border-slate-700/30 group-hover:border-cyan-500/30 transition-all font-light whitespace-pre-line">
            {currentAnalysis.strengths}
          </p>
        </div>

        <div className="group transition-all duration-300">
          <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2 group-hover:text-cyan-400">
            <span className="opacity-50 text-sm">03</span>
            {currentLang === 'HE' ? 'אזורים לפיתוח' : 'Development Areas'}
          </h4>
          <p className="bg-slate-800/20 p-4 rounded-xl border border-slate-700/30 group-hover:border-cyan-500/30 transition-all font-light whitespace-pre-line">
            {currentAnalysis.weaknesses}
          </p>
        </div>

        <div className="group transition-all duration-300">
          <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2 group-hover:text-cyan-400">
            <span className="opacity-50 text-sm">04</span>
            {currentLang === 'HE' ? 'המלצות לפעולה' : 'Action Recommendations'}
          </h4>
          <p className="bg-slate-800/20 p-4 rounded-xl border border-slate-700/30 group-hover:border-cyan-500/30 transition-all font-light whitespace-pre-line">
            {currentAnalysis.recommendations}
          </p>
        </div>
      </div>
    </div>
  );
};