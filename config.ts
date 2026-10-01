
// הגדרה זו קובעת האם האפליקציה תעבוד במצב "מלא" (עם Firebase, הרשמה וניהול)
// או במצב "פשוט" (כמו הגרסה המקורית).

// חשוב לאבטחה: ניגשים למשתני הסביבה רק לפי שם קבוע (import.meta.env.VITE_XXX).
// אסור להחזיר או לעבור על האובייקט import.meta.env כולו, כי Vite אז מטמיע בקובץ ה-JS
// שמגיע לדפדפן את *כל* משתני VITE_ שהוגדרו בנטליפיי, כולל סודות.
// @ts-ignore
const firebaseApiKeyFromEnv: string | undefined = import.meta.env.VITE_FIREBASE_API_KEY;
// @ts-ignore
const forceFirebaseFromEnv: string | undefined = import.meta.env.VITE_FORCE_FIREBASE;

// בדיקה האם מפתח ה-API קיים ותקין (ולא רק דגל ההפעלה)
const apiKey = firebaseApiKeyFromEnv;
export const hasValidFirebaseConfig = !!apiKey && apiKey.length > 20 && !apiKey.includes("API_KEY");

// לוגיקה חכמה לבחירת מצב:
// אם בכתובת ה-URL מופיע ?mode=team, אנחנו נכנסים למצב ארגון בכל מקרה.
// אם אין קונפיגורציה תקינה, הקוד ב-App.tsx יציג מסך שגיאה מתאים.
const isTeamModeUrl = typeof window !== 'undefined' && window.location.search.includes('mode=team');

export const USE_FIREBASE_MODE = (forceFirebaseFromEnv === 'true' || isTeamModeUrl);

// הדפסה לקונסול כדי שתוכל לראות איזה מצב נבחר כשאתה פותח את האתר (F12 -> Console)
console.log("------------------------------------------------");
console.log("App Configuration Loaded:");
console.log(`Mode Selected: ${USE_FIREBASE_MODE ? "🔥 Team/Full Version" : "⚡ Personal/Simple Version"}`);
console.log(`Firebase Config Valid: ${hasValidFirebaseConfig}`);
console.log("------------------------------------------------");
