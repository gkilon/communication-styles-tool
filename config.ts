
// הגדרה זו קובעת האם האפליקציה תעבוד במצב "מלא" (עם Firebase, הרשמה וניהול)
// או במצב "פשוט" (כמו הגרסה המקורית).

// פונקציה בטוחה לשליפת משתנים שלא תקרוס גם אם הסביבה לא מוגדרת כשורה
const getEnv = () => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env;
    }
  } catch (e) {
    // במקרה של שגיאה, נחזיר אובייקט ריק
  }
  return {};
};

const env = getEnv();

// בדיקה האם מפתח ה-API קיים ותקין (ולא רק דגל ההפעלה)
const apiKey = env.VITE_FIREBASE_API_KEY;
// בדיקה שהמפתח אינו ריק, ארוך מספיק, ולא מכיל טקסט של ברירת מחדל
const hasValidFirebaseConfig = !!apiKey && apiKey.length > 20 && !apiKey.includes("API_KEY");

// תיקון: כפיית המצב הפשוט (Simple Mode) כברירת מחדל.
// כדי להפעיל את הגרסה המלאה (עם הרשמה), יש לשנות את השורה למטה ל:
// export const USE_FIREBASE_MODE = env.VITE_ENABLE_FIREBASE === 'true' && hasValidFirebaseConfig;
export const USE_FIREBASE_MODE = false;

// הדפסה לקונסול כדי שתוכל לראות איזה מצב נבחר כשאתה פותח את האתר (F12 -> Console)
console.log("------------------------------------------------");
console.log("App Configuration Loaded:");
console.log(`Mode: ${USE_FIREBASE_MODE ? "🔥 Full Version (Firebase & Auth)" : "⚡ Simple Version (Default)"}`);
console.log("------------------------------------------------");
