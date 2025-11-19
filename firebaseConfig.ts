
import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// --- הוראות ---
// 1. גש ל-Firebase Console -> Project Settings.
// 2. העתק את הערכים והדבק אותם בתוך המרכאות למטה.

// שימוש בטוח במשתני סביבה של Vite
const getEnv = (key: string) => {
  try {
    // בדיקה אם import.meta מוגדר (למניעת קריסה בסביבות מסוימות)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        return (import.meta as any).env[key];
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY") || "AIzaSyAzP5HCS_qly0jmPT3hkdsn05NlPq1haNA",
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN") || "communication-tool-4d386.firebaseapp.com",
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID") || "communication-tool-4d386",
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET") || "communication-tool-4d386.firebasestorage.app",
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") || "837244077464",
  appId: getEnv("VITE_FIREBASE_APP_ID") || "1:837244077464:web:95ffac269ba42de4d457ed"
};

// --- מכאן ומטה אין צורך לשנות כלום ---

let auth: Auth = { currentUser: null } as unknown as Auth;
let db: Firestore = {} as Firestore;
let isFirebaseInitialized = false;

// בדיקה קפדנית יותר שהמפתחות הוזנו כראוי
const isConfigValid = (config: typeof firebaseConfig) => {
    if (!config) return false;
    // בדיקה שאף שדה לא מכיל את המילה "הדבק"
    const hasPlaceholder = Object.values(config).some(val => val && typeof val === 'string' && val.includes("הדבק"));
    if (hasPlaceholder) return false;

    // בדיקה שה-apiKey ארוך מספיק
    return config.apiKey && config.apiKey.length > 20;
};

if (isConfigValid(firebaseConfig)) {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        isFirebaseInitialized = true;
        console.log("Firebase initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        isFirebaseInitialized = false;
    }
} else {
    console.warn("Firebase keys are missing or invalid in firebaseConfig.ts. Running in offline mode.");
    isFirebaseInitialized = false;
}

export { auth, db, isFirebaseInitialized };