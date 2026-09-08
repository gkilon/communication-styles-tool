import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/useT';

export const LanguageSelectScreen: React.FC = () => {
  const { setLang } = useLanguage();
  const { t } = useT();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-glass-dark p-10 md:p-14 rounded-[2.5rem] shadow-2xl text-center max-w-2xl mx-auto border border-glass-border backdrop-blur-xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] -ml-16 -mt-16 pointer-events-none"></div>

      <div className="text-5xl mb-6">🌐</div>
      <h2 className="text-3xl md:text-4xl font-black text-white mb-3">{t('languageSelect', 'title')}</h2>
      <p className="text-gray-400 text-base md:text-lg mb-10">{t('languageSelect', 'subtitle')}</p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLang('he')}
          className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-cyan-500 text-white font-black py-6 px-8 rounded-2xl text-xl transition-all shadow-lg"
        >
          עברית 🇮🇱
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLang('en')}
          className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-cyan-500 text-white font-black py-6 px-8 rounded-2xl text-xl transition-all shadow-lg"
        >
          English 🇺🇸
        </motion.button>
      </div>
    </motion.div>
  );
};
