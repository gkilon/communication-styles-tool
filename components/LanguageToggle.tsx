import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export const LanguageToggle: React.FC = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div className="fixed top-3 left-3 z-50 flex bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-full p-0.5 shadow-lg no-print">
      <button
        onClick={() => setLang('he')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
          lang === 'he' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        עברית
      </button>
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
          lang === 'en' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        EN
      </button>
    </div>
  );
};
