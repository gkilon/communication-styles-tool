import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/useT';

interface Analysis {
  general: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
}

interface CombinedAnalysisProps {
  analysis: Analysis;
  /** AI-generated continuation (role/goal + org-fit) — appended onto the general paragraph once ready. */
  insightAddendum?: string;
  insightLoading?: boolean;
  insightError?: boolean;
}

export const CombinedAnalysis: React.FC<CombinedAnalysisProps> = ({ analysis, insightAddendum, insightLoading }) => {
  const { dir } = useLanguage();
  const { t } = useT();

  if (!analysis) return null;

  return (
    <div className="h-full flex flex-col space-y-6" dir={dir}>
      <div className="space-y-6 text-gray-300 leading-relaxed overflow-y-auto pr-1 custom-scrollbar">
        <div className="group transition-all duration-300">
          <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2 group-hover:text-cyan-400">
            <span className="opacity-50 text-sm">01</span>
            {t('combinedAnalysisChrome', 'general')}
          </h4>
          <p className="bg-slate-800/20 p-4 rounded-xl border border-slate-700/30 group-hover:border-cyan-500/30 transition-all font-light whitespace-pre-line">
            {analysis.general}
            {insightAddendum ? ' ' + insightAddendum : ''}
            {insightLoading && !insightAddendum && (
              <span className="inline-flex items-center gap-1.5 text-gray-500 text-sm mr-1 align-middle">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.4s]"></span>
              </span>
            )}
          </p>
        </div>

        <div className="group transition-all duration-300">
          <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2 group-hover:text-cyan-400">
            <span className="opacity-50 text-sm">02</span>
            {t('combinedAnalysisChrome', 'strengths')}
          </h4>
          <p className="bg-slate-800/20 p-4 rounded-xl border border-slate-700/30 group-hover:border-cyan-500/30 transition-all font-light whitespace-pre-line">
            {analysis.strengths}
          </p>
        </div>

        <div className="group transition-all duration-300">
          <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2 group-hover:text-cyan-400">
            <span className="opacity-50 text-sm">03</span>
            {t('combinedAnalysisChrome', 'weaknesses')}
          </h4>
          <p className="bg-slate-800/20 p-4 rounded-xl border border-slate-700/30 group-hover:border-cyan-500/30 transition-all font-light whitespace-pre-line">
            {analysis.weaknesses}
          </p>
        </div>

        <div className="group transition-all duration-300">
          <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2 group-hover:text-cyan-400">
            <span className="opacity-50 text-sm">04</span>
            {t('combinedAnalysisChrome', 'recommendations')}
          </h4>
          <p className="bg-slate-800/20 p-4 rounded-xl border border-slate-700/30 group-hover:border-cyan-500/30 transition-all font-light whitespace-pre-line">
            {analysis.recommendations}
          </p>
        </div>
      </div>
    </div>
  );
};