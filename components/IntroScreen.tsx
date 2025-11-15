import React from 'react';

interface IntroScreenProps {
  onStart: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-3xl mx-auto animate-fade-in">
      <h2 className="text-3xl font-bold text-cyan-300 mb-4">ברוכים הבאים לשאלון סגנונות התקשורת</h2>
      <p className="text-gray-300 mb-6 text-lg leading-relaxed">
        שאלון זה יסייע לך לזהות את סגנון התקשורת הדומיננטי שלך. בכל שאלה יוצג בפניך צמד של תכונות.
        במציאות, כולנו מורכבים ובדרך כלל מפגינים את שתי התכונות במידה זו או אחרת.
      </p>
      <p className="text-gray-300 mb-6 text-lg leading-relaxed">
        המטרה כאן היא לסמן על הסקאלה לאיזו תכונה אתה נוטה <strong>יותר</strong> באופן טבעי ברוב המצבים.
        אין תשובות "נכונות" או "לא נכונות", פשוט ענה/י בכנות.
      </p>
      <p className="text-gray-300 mb-8 text-lg leading-relaxed">
        בסיום, תקבל/י מפה מקיפה של פרופיל התקשורת שלך, שתחשוף את החוזקות, האתגרים והשילוב הייחודי שיוצר את סגנונך האישי. בנוסף, יעמוד לרשותך מאמן AI מתקדם שינתח את הפרופיל שלך לעומק ויספק לך אסטרטגיות צמיחה מותאמות אישית.
      </p>
      <button
        onClick={onStart}
        className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-full text-xl transition-transform transform hover:scale-105 duration-300 shadow-lg"
      >
        התחל את השאלון
      </button>
    </div>
  );
};
