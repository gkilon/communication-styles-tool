
import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Cast import.meta to any to avoid TypeScript errors
const env = (import.meta as any).env || {};

// --- הוראות ---
// מכיוון שיש בעיה להגדיר משתנים ב-Netlify, אנא הדבק את המפתחות שלך ישירות כאן למטה.
// החלף את המחרוזת "הדבק כאן..." בערך האמיתי מתוך מסוף פיירבייס.
// (Project Settings -> General -> Your apps -> SDK setup and configuration)

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAzP5HCS_qly0jmPT3hkdsn05NlPq1haNA",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "communication-tool-4d386.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "communication-tool-4d386",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "communication-tool-4d386.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "837244077464",
  appId: env.VITE_FIREBASE_APP_ID || "1:837244077464:web:95ffac269ba42de4d457ed"
};

let auth: Auth = { currentUser: null } as unknown as Auth;
let db: Firestore = {} as Firestore;
let isFirebaseInitialized = false;

// פונקציה פשוטה לבדיקה אם הוכנס מפתח אמיתי (לא ריק ולא הטקסט "הדבק כאן")
const isConfigValid = (config: typeof firebaseConfig) => {
    return config.apiKey && 
           config.apiKey.length > 20 && 
           !config.apiKey.includes("הדבק כאן");
};

if (isConfigValid(firebaseConfig)) {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        isFirebaseInitialized = true;
        console.log("Firebase initialized successfully connected to project:", firebaseConfig.projectId);
    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        isFirebaseInitialized = false;
    }
} else {
    console.warn("Firebase keys are missing. Please edit firebaseConfig.ts and paste your keys.");
    isFirebaseInitialized = false;
}

export { auth, db, isFirebaseInitialized };
