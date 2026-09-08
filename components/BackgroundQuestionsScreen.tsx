import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BackgroundData } from '../types';
import { useT } from '../i18n/useT';
import { useLanguage } from '../i18n/LanguageContext';

interface BackgroundQuestionsScreenProps {
  data: BackgroundData;
  onChange: (data: BackgroundData) => void;
  onSubmit: () => void;
}

export const BackgroundQuestionsScreen: React.FC<BackgroundQuestionsScreenProps> = ({
  data,
  onChange,
  onSubmit
}) => {
  const { t } = useT();
  const { dir } = useLanguage();
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(data.gender);
  const [isManager, setIsManager] = useState<'yes' | 'no' | ''>(data.isManager);
  const [goal, setGoal] = useState<string>(data.goal);
  const [error, setError] = useState<string>('');

  const goalsList = [
    { id: 'self_learn', label: t('background', 'goalSelfLearn') },
    { id: 'management', label: t('background', 'goalManagement') },
    { id: 'teamwork', label: t('background', 'goalTeamwork') },
    { id: 'influence', label: t('background', 'goalInfluence') }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender || !isManager || !goal) {
      setError(t('background', 'errorIncomplete'));
      return;
    }
    setError('');
    onChange({ gender, isManager, goal });
    onSubmit();
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 200, damping: 20 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-glass-dark backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-glass-border max-w-2xl mx-auto text-right relative overflow-hidden"
      dir={dir}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-3">
          {t('background', 'title')}
        </h2>
        <p className="text-gray-400 text-base font-light">
          {t('background', 'subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
        
        {/* Q1: Gender */}
        <div className="space-y-3">
          <label className="block text-lg font-bold text-cyan-400">{t('background', 'q1')}</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'male', label: t('background', 'male') },
              { id: 'female', label: t('background', 'female') },
              { id: 'other', label: t('background', 'other') }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setGender(opt.id as any); setError(''); }}
                className={`py-3.5 px-4 rounded-2xl border font-bold text-base transition-all duration-300 flex justify-center items-center ${
                  gender === opt.id
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'border-slate-700 bg-slate-800/40 text-gray-300 hover:border-slate-600 hover:bg-slate-800/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q2: Is Manager */}
        <div className="space-y-3">
          <label className="block text-lg font-bold text-cyan-400">{t('background', 'q2')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'yes', label: t('background', 'managerYes') },
              { id: 'no', label: t('background', 'managerNo') }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setIsManager(opt.id as any); setError(''); }}
                className={`py-4 px-5 rounded-2xl border font-bold text-sm sm:text-base transition-all duration-300 text-right ${
                  isManager === opt.id
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'border-slate-700 bg-slate-800/40 text-gray-300 hover:border-slate-600 hover:bg-slate-800/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q3: Main Goal */}
        <div className="space-y-3">
          <label className="block text-lg font-bold text-cyan-400">{t('background', 'q3')}</label>
          <div className="space-y-2.5">
            {goalsList.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setGoal(opt.label); setError(''); }}
                className={`w-full py-4 px-5 rounded-2xl border font-bold text-base transition-all duration-300 text-right flex items-center justify-between ${
                  goal === opt.label
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'border-slate-700 bg-slate-800/40 text-gray-300 hover:border-slate-600 hover:bg-slate-800/70'
                }`}
              >
                <span>{opt.label}</span>
                {goal === opt.label && (
                  <span className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 text-xs">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-red-400 font-bold text-sm text-center animate-pulse pt-2"
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* Submit button */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4.5 px-8 rounded-2xl text-xl transition-all duration-300 shadow-[0_10px_25px_rgba(6,182,212,0.25)] hover:-translate-y-0.5 active:translate-y-0"
          >
            {t('background', 'continueButton')}
          </button>
        </div>

      </form>
    </motion.div>
  );
};
