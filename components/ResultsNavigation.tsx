import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '../i18n/useT';
import { useLanguage } from '../i18n/LanguageContext';

export const ResultsNavigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useT();
  const { dir } = useLanguage();

  const sections = [
    { id: 'chart-section', label: t('nav', 'myMap'), icon: '📊' },
    { id: 'analysis-section', label: t('nav', 'personalAnalysis'), icon: '🧠' },
    { id: 'summary-section', label: t('nav', 'summaryRecommendations'), icon: '📝' },
    { id: 'ai-coach-section', label: t('nav', 'personalCoach'), icon: '✨' },
    { id: 'case-studies-section', label: t('nav', 'dialogueSimulator'), icon: '🎭' },
    { id: 'ai-agent-section', label: t('nav', 'promptSimulator'), icon: '🤖' },
    { id: 'stuck-manager-section', label: t('nav', 'stuckHelp'), icon: '🚨' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsOpen(false);
    }
  };

  return (
    <div className={`fixed bottom-6 ${dir === 'rtl' ? 'left-6' : 'right-6'} z-50 no-print`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={`absolute bottom-16 ${dir === 'rtl' ? 'left-0' : 'right-0'} mb-2 bg-glass-dark/90 backdrop-blur-xl border border-glass-border p-2 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col gap-1 w-56`}
          >
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`flex items-center gap-3 w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors`}
              >
                <span className="text-xl">{section.icon}</span>
                <span className="font-medium text-sm">{section.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white border border-cyan-400/30"
        aria-label="Navigation Menu"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </motion.button>
    </div>
  );
};
