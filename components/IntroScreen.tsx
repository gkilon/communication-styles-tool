
import React from 'react';

interface IntroScreenProps {
  onStart: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  return (
    <div className="bg-gray-800 p-10 md:p-14 rounded-2xl shadow-2xl text-center max-w-4xl mx-auto animate-fade-in-up border border-gray-700">
      <h2 className="text-4xl md:text-5xl font-bold text-cyan-300 mb-8">ברוכים הבאים</h2>
      <div className="space-y-6 text-gray-200 text-xl md:text-2xl leading-relaxed font-light">
        <p>
          שאלון זה יסייע לך לזהות את <strong className="text-white font-bold">סגנון התקשורת הדומיננטי</strong> שלך. 
          בכל שאלה יוצג בפניך צמד של תכונות.
        </p>
        <p>
          במציאות, כולנו מורכבים ובדרך כלל מפגינים את שתי התכונות במידה זו או אחרת.
          המטרה כאן היא לסמן על הסקאלה לאיזו תכונה אתה נוטה <strong>יותר</strong> באופן טבעי ברוב המצבים.
        </p>
        <p>
          אין תשובות "נכונות" או "לא נכונות", פשוט ענה/י בכנות.
        </p>
        <p className="bg-gray-900/50 p-6 rounded-xl border-r-4 border-cyan-500 text-lg md:text-xl">
          בסיום, תקבל/י מפה מקיפה של פרופיל התקשורת שלך, שתחשוף את החוזקות, האתגרים והשילוב הייחודי שיוצר את סגנונך האישי. 
          <br/><br/>
          בנוסף, יעמוד לרשותך <span className="text-cyan-400 font-bold">מאמן AI מתקדם</span> שינתח את הפרופיל שלך לעומק ויספק לך אסטרטגיות צמיחה מותאמות אישית.
        </p>
      </div>
      <button
        onClick={onStart}
        className="mt-10 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-12 rounded-full text-2xl transition-transform transform hover:scale-105 duration-300 shadow-xl"
      >
        התחל את השאלון
      </button>
    </div>
  );
};
