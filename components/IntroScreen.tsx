
import React from 'react';

interface IntroScreenProps {
  onStart: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-3xl mx-auto animate-fade-in">
      <h2 className="text-3xl font-bold text-cyan-300 mb-4">ברוכים הבאים לשאלון סגנונות התקשורת</h2>
      <p className="text-gray-300 mb-6 text-lg leading-relaxed">
        שאלון זה יעזור לך לזהות את סגנון התקשורת הדומיננטי שלך בעבודה ובחיים האישיים.
        בכל שאלה, תקבל/י צמד של תכונות. עליך למקם את עצמך על הסקאלה ביניהן.
      </p>
      <p className="text-gray-300 mb-8 text-lg leading-relaxed">
        אין תשובות "נכונות" או "לא נכונות". פשוט ענה/י בכנות על סמך הנטייה הטבעית שלך.
        בסיום, תקבל/י ניתוח מפורט של הפרופיל שלך, כולל חוזקות, חולשות, ומאמן AI אישי שיעניק לך טיפים לשיפור.
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
