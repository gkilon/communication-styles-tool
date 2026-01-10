
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

      {/* Kilon Consulting Branding - Elegant Logo Section */}
      <div className="mb-12 flex flex-col items-center">
        <a 
          href="https://kilon-consulting.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group transition-all duration-500 transform hover:scale-105"
        >
          <div className="flex items-center gap-4 bg-white/5 px-8 py-4 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-md">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center font-black text-3xl text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:shadow-cyan-500/60 transition-all duration-500 transform group-hover:rotate-6">
                K
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-gray-800"></div>
            </div>
            <div className="text-right">
              <div className="text-white font-black text-2xl leading-none tracking-tight">KILON</div>
              <div className="text-cyan-400 text-xs font-bold tracking-[0.3em] leading-none mt-2">CONSULTING</div>
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
          <p className="text-cyan-400 font-medium italic">
            מוגש כשירות מקצועי מטעם Kilon Consulting.
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
