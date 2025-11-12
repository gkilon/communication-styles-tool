import React, { useMemo, useState, useRef } from 'react';
import { Scores } from '../types';
import { ResultsChart } from './ResultsChart';
import { CombinedAnalysis } from './CombinedAnalysis';
import { generateProfileAnalysis } from '../services/analysisService';
import { AiCoach } from './AiCoach';

// Declare libraries loaded from CDN for TypeScript
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
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ scores, onReset, onEdit }) => {
  const profileAnalysis = useMemo(() => generateProfileAnalysis(scores), [scores]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const { jsPDF } = window.jspdf;
    const html2canvas = window.html2canvas;

    if (!resultsRef.current || !jsPDF || !html2canvas) {
      console.error("PDF generation libraries not loaded or target element not found.");
      return;
    }
    
    setIsGeneratingPdf(true);

    try {
        const canvas = await html2canvas(resultsRef.current, {
            scale: 2, // Higher scale for better quality
            backgroundColor: '#111827', // Use main background for PDF
            useCORS: true,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        // Add a margin
        const margin = 10;
        const contentWidth = pdfWidth - margin * 2;
        const pdfHeight = (imgProps.height * contentWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, pdfHeight);
        pdf.save('communication-profile.pdf');

    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div ref={resultsRef}>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-none lg:w-1/3 bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
            <ResultsChart scores={scores} />
          </div>
          <div className="flex-1 bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
            <CombinedAnalysis analysis={profileAnalysis} />
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
        <AiCoach scores={scores} />
      </div>

      <div className="text-center mt-8 flex flex-wrap justify-center items-center gap-4">
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-full text-lg transition-transform transform hover:scale-105 duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isGeneratingPdf ? '...מייצר' : 'הורד PDF'}
        </button>
        <button
          onClick={onEdit}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-full text-lg transition-transform transform hover:scale-105 duration-300"
        >
          ערוך תשובות
        </button>
        <button
          onClick={onReset}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-full text-lg transition-transform transform hover:scale-105 duration-300"
        >
          התחל מחדש
        </button>
      </div>
    </div>
  );
};
