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
  companyName?: string;
  insightAddendum?: string;
  insightLoading?: boolean;
  insightError?: boolean;
}

export const CombinedAnalysis: React.FC<CombinedAnalysisProps> = ({
  analysis,
  companyName = '',
  insightAddendum = '',
  insightLoading = false,
  insightError = false,
}) => {
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
          </p>
        </div>

        {/* Organization-specific insight */}
        {(insightLoading || insightAddendum || insightError) && (
          <div className="group transition-all duration-300">

            <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2 group-hover:text-cyan-400">
              <span className="opacity-50 text-sm">↳</span>

              {dir === 'rtl'
                ? `בהקשר הארגוני${companyName ? ` של ${companyName}` : ''}`
                : `Organizational context${companyName ? ` — ${companyName}` : ''}`}
            </h4>

            <div className="bg-cyan-900/10 p-4 rounded-xl border border-cyan-500/20 transition-all font-light">

              {insightLoading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>

                  <span>
                    {dir === 'rtl'
                      ? `מנתח את החיבור בין הפרופיל שלך לבין ההקשר הארגוני${companyName ? ` של ${companyName}` : ''}...`
                      : `Analyzing the connection between your profile and the organizational context${companyName ? ` of ${companyName}` : ''}...`}
                  </span>
                </div>
              )}

              {!insightLoading && insightError && (
                <p className="text-gray-400">
                  {dir === 'rtl'
                    ? 'לא ניתן היה להשלים כרגע את ההתייחסות להקשר הארגוני.'
                    : 'The organizational-context analysis could not be completed at this time.'}
                </p>
              )}

              {!insightLoading && !insightError && insightAddendum && (
                <p className="whitespace-pre-line">
                  {insightAddendum}
                </p>
              )}

            </div>
          </div>
        )}

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