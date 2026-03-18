import React from 'react';

interface Analysis {
  general: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
}

interface CombinedAnalysisProps {
  analysis: Analysis;
}

export const CombinedAnalysis: React.FC<CombinedAnalysisProps> = ({ analysis }) => {
  if (!analysis) {
    return null;
  }
  
  return (
    <div className="h-full flex flex-col">
      <h3 className="text-2xl font-bold text-cyan-400 mb-4">ניתוח פרופיל משולב</h3>
      <div className="space-y-6 text-gray-300 leading-relaxed">
        <div>
          <h4 className="text-lg font-bold text-white mb-2">כללי</h4>
          <p>{analysis.general}</p>
        </div>
        <div>
          <h4 className="text-lg font-bold text-white mb-2">חוזקות</h4>
          <p>{analysis.strengths}</p>
        </div>
        <div>
          <h4 className="text-lg font-bold text-white mb-2">אזורים לפיתוח</h4>
          <p>{analysis.weaknesses}</p>
        </div>
        <div>
          <h4 className="text-lg font-bold text-white mb-2">המלצות לפעולה</h4>
          <p>{analysis.recommendations}</p>
        </div>
      </div>
    </div>
  );
};