
import React from 'react';

interface IntroScreenProps {
  onStart: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  return (
    <div className="bg-gray-800 p-10 md:p-14 rounded-3xl shadow-2xl text-center max-w-4xl mx-auto animate-fade-in-up border border-gray-700 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -ml-16 -mt-16"></div>
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl -mr-20 -mb-20"></div>

      {/* New Gilad Kilon Branding Logo */}
      <div className="mb-12 flex flex-col items-center">
        <a 
          href="https://kilon-consulting.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group transition-all duration-300 transform hover:scale-105"
        >
          <div className="flex flex-col items-center">
            <div className="flex items-center text-4xl md:text-5xl tracking-tight">
              <span className="text-white font-light">GILAD</span>
              <span className="text-white font-black ml-3">KILON</span>
              <span className="text-cyan-500 font-black ml-1 text-5xl leading-none">.</span>
            </div>
            <div className="text-gray-400 text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase mt-2 border-t border-gray-700 pt-2 w-full text-center">
              MANAGEMENT CONSULTING
            </div>
          </div>
        </a>
      </div>

      <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">ברוכים הבאים</h2>
      
      <div className="space-y-6 text-gray-300 text-xl md:text-2xl leading-relaxed font-light mb-12">
        <p>
          שאלון זה יסייע לך לזהות את <strong className="text-cyan-400 font-bold">סגנון התקשורת הדומיננטי</strong> שלך. 
          בכל שאלה יוצג בפניך צמד של תכונות.
        </p>
        <p>
          המטרה היא לסמן על הסקאלה לאיזו תכונה אתה נוטה <strong>יותר</strong> באופן טבעי ברוב המצבים.
        </p>
        
        <div className="bg-gray-900/40 p-8 rounded-2xl border-r-4 border-cyan-500 text-lg md:text-xl text-right inline-block w-full shadow-inner">
          <p className="mb-4">
            בסיום, תקבל/י מפה מקיפה של פרופיל התקשורת שלך, שתחשוף את החוזקות והשילוב הייחודי שיוצר את סגנונך. 
          </p>
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={onStart}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-5 px-16 rounded-2xl text-2xl transition-all duration-300 shadow-[0_15px_35px_rgba(6,182,212,0.3)] hover:-translate-y-1 active:translate-y-0"
        >
          התחל בשאלון
        </button>
        
        <a 
          href="https://kilon-consulting.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-cyan-400 text-sm font-bold transition-colors flex items-center gap-2 group"
        >
          <span>בקרו באתר הבית שלנו</span>
          <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
        </a>
      </div>
    </div>
  );
};
