
import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// קריאת משתני סביבה - המפתחות נלקחים מקובץ .env ולא כתובים ישירות בקוד
// Cast import.meta to any to avoid TypeScript errors when Vite types are not globally loaded
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// משתנים לייצוא - ברירת מחדל לאובייקטים ריקים כדי למנוע קריסה בייבוא אם אין קונפיגורציה
// Initialize with a minimal mock to prevent immediate crashes if accessed before init
let auth: Auth = { currentUser: null } as unknown as Auth;
let db: Firestore = {} as Firestore;

// פונקציית עזר לבדיקת תקינות בסיסית של המפתח
const isApiKeyValid = (key: string | undefined) => {
    // מפתחות Firebase הם מחרוזות ארוכות (כ-39 תווים). בדיקה זו מסננת מחרוזות ריקות או placeholders
    return key && typeof key === 'string' && key.length > 20 && !key.includes("API_KEY");
};

// בדיקה אם הקונפיגורציה קיימת ותקינה לפני שמנסים לאתחל
if (isApiKeyValid(firebaseConfig.apiKey)) {
    try {
        // אתחול האפליקציה רק אם יש מפתח API תקין לכאורה
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
    }
} else {
    console.warn("Firebase config keys are missing or invalid. App running in offline/simple mode.");
}

// ייצוא שירותי האימות והמסד נתונים לשימוש בשאר האפליקציה
export { auth, db };
