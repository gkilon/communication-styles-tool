import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Scores } from '../types';
import { ResultsChart } from './ResultsChart';
import { CombinedAnalysis } from './CombinedAnalysis';
import { generateProfileAnalysis } from '../services/analysisService';
import { AiCoach } from './AiCoach';
import { CaseStudiesSimulator } from './CaseStudiesSimulator';
import { AiAgentSimulator } from './AiAgentSimulator';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } }
  };

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

      const maxContentHeight = pageHeight - (margin * 2);
      const calculatedHeight = (imgProps.height * pdfContentWidth) / imgProps.width;
      const finalContentHeight = Math.min(calculatedHeight, maxContentHeight);

      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      pdf.addImage(imgData, 'PNG', margin, margin, pdfContentWidth, finalContentHeight);

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 w-full max-w-5xl mx-auto px-2 sm:px-4"
    >
      {/* Wrapper for PDF content */}
      <motion.div variants={itemVariants} ref={resultsRef} className="bg-glass-dark backdrop-blur-2xl p-6 sm:p-12 rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-glass-border overflow-hidden text-right relative" dir="rtl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none"></div>

        <div className="header-section border-b border-glass-border pb-10 mb-10 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="text-right flex-1">
            <h1 className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-4 drop-shadow-sm">דו"ח סגנון תקשורת</h1>
            <p className="text-cyan-400 font-bold uppercase tracking-[0.2em] text-lg">ניתוח מקצועי מבוסס מודל הצבעים</p>
          </div>
          <div className="bg-glass-light p-6 rounded-3xl border border-glass-border text-center min-w-[200px] backdrop-blur-md">
            <div className="text-gray-400 text-xs font-bold uppercase mb-2 tracking-widest">תאריך הנפקת הדו"ח</div>
            <div className="text-white font-mono text-xl">{new Date().toLocaleDateString('he-IL')}</div>
          </div>
        </div>

        <div className="main-content-gap flex flex-col lg:flex-row gap-10 mb-10 items-stretch relative z-10">
          <motion.div variants={itemVariants} className="chart-container flex-none lg:w-[40%] bg-glass-light p-8 rounded-[2.5rem] border border-glass-border shadow-inner backdrop-blur-sm">
            <ResultsChart scores={scores} />
          </motion.div>
          <motion.div variants={itemVariants} className="analysis-container flex-1 bg-glass-light p-8 rounded-[2.5rem] border border-glass-border shadow-inner backdrop-blur-sm">
            <CombinedAnalysis analysis={profileAnalysis} />
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="summary-box bg-gradient-to-br from-slate-800/40 to-cyan-900/20 p-10 rounded-[2.5rem] border border-dashed border-cyan-500/30 relative overflow-hidden z-10 shadow-lg backdrop-blur-sm">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-cyan-400 text-3xl">📝</span> סיכום והמלצות מפתח
          </h3>
          <p className="text-gray-300 leading-relaxed text-xl font-light">
            הניתוח שלעיל משקף את ההעדפות הטבעיות שלך כפי שעלו מהשאלון. חשוב לזכור שסגנון תקשורת הוא מיומנות שניתן לפתח ולאזן לאורך זמן.
            השתמש בדו"ח זה ככלי למודעות עצמית ולשיפור ממשקי העבודה שלך עם סגנונות משלימים.
          </p>
          <div className="tags-container mt-8 flex gap-4 flex-wrap">
            <span className="bg-glass-dark px-5 py-2.5 rounded-full text-xs text-cyan-400 font-bold border border-cyan-500/20 shadow-sm">#מודעות_עצמית</span>
            <span className="bg-glass-dark px-5 py-2.5 rounded-full text-xs text-cyan-400 font-bold border border-cyan-500/20 shadow-sm">#פיתוח_מנהיגות</span>
            <span className="bg-glass-dark px-5 py-2.5 rounded-full text-xs text-cyan-400 font-bold border border-cyan-500/20 shadow-sm">#תקשורת_אפקטיבית</span>
          </div>
        </motion.div>
      </motion.div>

      {/* AI Coach Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 no-print pt-6">
        <motion.div variants={itemVariants} className="bg-glass-dark p-8 rounded-[2.5rem] shadow-xl border border-glass-border transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-xl group">
          <AiCoach scores={scores} />
        </motion.div>
        <motion.div variants={itemVariants} className="bg-glass-dark p-8 rounded-[2.5rem] shadow-xl border border-glass-border transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-xl group">
          <CaseStudiesSimulator scores={scores} />
        </motion.div>
      </div>

      {/* AI Agent Simulator */}
      <motion.div variants={itemVariants} className="mb-12 no-print">
        <AiAgentSimulator scores={scores} />
      </motion.div>

      <motion.div variants={itemVariants} className="text-center mt-12 flex flex-wrap justify-center items-center gap-6 no-print">
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: "0px 10px 30px rgba(16,185,129,0.3)" }}
          whileTap={{ scale: 0.97 }}
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black py-5 px-12 rounded-[1.5rem] text-xl md:text-2xl transition-all shadow-2xl disabled:opacity-50 flex items-center gap-4 border border-emerald-500/50"
        >
          {isGeneratingPdf ? (
            <span className="flex items-center gap-3">
              <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></span>
              מפיק דו"ח קומפקטי...
            </span>
          ) : (
            <>
              <span className="text-3xl">📥</span>
              <span>הורד דו"ח PDF מורחב</span>
            </>
          )}
        </motion.button>

        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEdit}
            className="bg-glass-light hover:bg-glass-dark text-white font-bold py-4 px-8 rounded-2xl transition-all border border-glass-border text-lg shadow-lg backdrop-blur-sm"
          >
            עריכת תשובות
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="bg-red-900/10 hover:bg-red-900/30 text-red-500 font-bold py-4 px-8 rounded-2xl transition-all border border-red-900/30 text-lg shadow-lg backdrop-blur-sm"
          >
            איפוס שאלון
          </motion.button>
        </div>
      </motion.div>

      {onLogout && (
        <motion.div variants={itemVariants} className="pt-10 pb-6 text-center">
          <button
            onClick={onLogout}
            className="text-gray-500 hover:text-white underline text-sm tracking-[0.2em] font-medium uppercase transition-colors"
          >
            Log Out / End Session
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};
