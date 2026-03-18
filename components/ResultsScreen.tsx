
import React, { useMemo, useState, useRef } from 'react';
import { Scores } from '../types';
import { ResultsChart } from './ResultsChart';
import { CombinedAnalysis } from './CombinedAnalysis';
import { generateProfileAnalysis } from '../services/analysisService';
import { AiCoach } from './AiCoach';
import { CaseStudiesSimulator } from './CaseStudiesSimulator';

declare global {
  interface Window {
    html2canvas: any;
    jspdf: any;
  }
}

interface ResultsScreenProps {
  scores: Scores;
  onReset: () => void;
  onEdit: () => void;
  onLogout?: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ scores, onReset, onEdit, onLogout }) => {
  const profileAnalysis = useMemo(() => generateProfileAnalysis(scores), [scores]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const { jsPDF } = window.jspdf;
    const html2canvas = window.html2canvas;
    const input = resultsRef.current;

    if (!input || !jsPDF || !html2canvas) {
      console.error("PDF generation libraries not loaded.");
      return;
    }

    setIsGeneratingPdf(true);

    try {
      // Toggle ultra-compact mode for capture
      input.classList.add('pdf-export-mode');

      const canvas = await html2canvas(input, {
        scale: 2,
        backgroundColor: '#0f172a',
        useCORS: true,
        logging: false,
        windowWidth: 1000,
        scrollY: -window.scrollY,
        scrollX: 0,
      });

      input.classList.remove('pdf-export-mode');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const margin = 8;
      const pdfContentWidth = pageWidth - (margin * 2);

      // Force the image to fit the page height if it's still too long
      const maxContentHeight = pageHeight - (margin * 2);
      const calculatedHeight = (imgProps.height * pdfContentWidth) / imgProps.width;
      const finalContentHeight = Math.min(calculatedHeight, maxContentHeight);

      // Dark background for PDF
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      pdf.addImage(imgData, 'PNG', margin, margin, pdfContentWidth, finalContentHeight);

      // Footer info
      pdf.setFontSize(7);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Kilon Consulting - דו"ח סגנון תקשורת אישי', pageWidth / 2, pageHeight - 5, { align: 'center' });

      pdf.save(`Communication_Profile_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("חלה שגיאה ביצירת ה-PDF.");
      if (input) input.classList.remove('pdf-export-mode');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up w-full max-w-5xl mx-auto px-2 sm:px-4">
      {/* Wrapper for PDF content */}
      <div ref={resultsRef} className="bg-slate-900 p-6 sm:p-12 rounded-[2rem] shadow-2xl border border-slate-800 overflow-hidden text-right" dir="rtl">

        <div className="header-section border-b border-slate-700 pb-10 mb-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-right flex-1">
            <h1 className="text-5xl font-black text-white mb-3 transition-all">דו"ח סגנון תקשורת</h1>
            <p className="text-cyan-400 font-bold uppercase tracking-widest text-lg">ניתוח מקצועי מבוסס מודל הצבעים</p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 text-center min-w-[200px]">
            <div className="text-gray-500 text-xs font-bold uppercase mb-2 tracking-tighter">תאריך הנפקת הדו"ח</div>
            <div className="text-white font-mono text-xl">{new Date().toLocaleDateString('he-IL')}</div>
          </div>
        </div>

        <div className="main-content-gap flex flex-col lg:flex-row gap-10 mb-10 items-stretch">
          <div className="chart-container flex-none lg:w-[40%] bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-700/50 shadow-inner">
            <ResultsChart scores={scores} />
          </div>
          <div className="analysis-container flex-1 bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-700/50 shadow-inner">
            <CombinedAnalysis analysis={profileAnalysis} />
          </div>
        </div>

        <div className="summary-box bg-gradient-to-br from-slate-800/20 to-cyan-900/10 p-10 rounded-[2.5rem] border border-dashed border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-cyan-400">📝</span> סיכום והמלצות מפתח
          </h3>
          <p className="text-gray-400 leading-relaxed text-xl font-light">
            הניתוח שלעיל משקף את ההעדפות הטבעיות שלך כפי שעלו מהשאלון. חשוב לזכור שסגנון תקשורת הוא מיומנות שניתן לפתח ולאזן לאורך זמן.
            השתמש בדו"ח זה ככלי למודעות עצמית ולשיפור ממשקי העבודה שלך עם סגנונות משלימים.
          </p>
          <div className="tags-container mt-8 flex gap-4 flex-wrap">
            <span className="bg-slate-800 px-4 py-2 rounded-full text-xs text-gray-500 font-bold border border-slate-700">#מודעות_עצמית</span>
            <span className="bg-slate-800 px-4 py-2 rounded-full text-xs text-gray-500 font-bold border border-slate-700">#פיתוח_מנהיגות</span>
            <span className="bg-slate-800 px-4 py-2 rounded-full text-xs text-gray-500 font-bold border border-slate-700">#תקשורת_אפקטיבית</span>
          </div>
        </div>
      </div>

      {/* AI Coach Section - Kept separate from PDF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 no-print">
        <div className="bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-700 transition-all hover:border-cyan-500/30">
          <AiCoach scores={scores} />
        </div>
        <div className="bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-700 transition-all hover:border-purple-500/30">
          <CaseStudiesSimulator scores={scores} />
        </div>
      </div>

      <div className="text-center mt-12 flex flex-wrap justify-center items-center gap-6 no-print">
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black py-5 px-12 rounded-2xl text-2xl transition-all shadow-2xl disabled:opacity-50 flex items-center gap-4 transform hover:-translate-y-1 active:translate-y-0 active:shadow-lg"
        >
          {isGeneratingPdf ? (
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></span>
              מפיק דו"ח...
            </span>
          ) : (
            <>
              <span className="text-3xl">📥</span>
              <span>הורד דו"ח PDF מורחב</span>
            </>
          )}
        </button>

        <div className="flex gap-3">
          <button
            onClick={onEdit}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-xl transition-all border border-gray-600 text-lg shadow-lg"
          >
            עריכת תשובות
          </button>
          <button
            onClick={onReset}
            className="bg-red-900/10 hover:bg-red-900/20 text-red-400 font-bold py-4 px-8 rounded-xl transition-all border border-red-900/30 text-lg shadow-lg"
          >
            איפוס שאלון
          </button>
        </div>
      </div>

      {onLogout && (
        <div className="pt-8 text-center">
          <button
            onClick={onLogout}
            className="text-gray-500 hover:text-white underline text-sm tracking-widest uppercase transition-colors"
          >
            Log Out / End Session
          </button>
        </div>
      )}
    </div>
  );
};
