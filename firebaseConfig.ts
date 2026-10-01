
// @ts-ignore
import { initializeApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// הגדרות Firebase - נלקחות אך ורק ממשתני סביבה!
// אין להכניס כאן ערכים קשיחים (Hardcoded strings).
// חשוב לאבטחה: כל משתנה נקרא לפי שם קבוע (import.meta.env.VITE_XXX) ולא דרך אובייקט
// import.meta.env כולו או גישה דינמית לפי מפתח, אחרת Vite מטמיע בדפדפן את כל משתני VITE_.
const firebaseConfig = {
  // @ts-ignore
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  // @ts-ignore
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  // @ts-ignore
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  // @ts-ignore
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  // @ts-ignore
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  // @ts-ignore
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  // @ts-ignore
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined) || ""
};

let auth: Auth = { currentUser: null } as unknown as Auth;
let db: Firestore = {} as Firestore;
let isFirebaseInitialized = false;

// בדיקה האם הקונפיגורציה תקינה
const isConfigValid = (config: typeof firebaseConfig) => {
    if (!config) return false;
    return !!config.apiKey && !!config.authDomain && !!config.projectId;
};

if (isConfigValid(firebaseConfig)) {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        isFirebaseInitialized = true;
        console.log("Firebase initialized securely via Environment Variables.");
    } catch (error) {
        console.error("Failed to initialize Firebase. Check Environment Variables.", error);
        isFirebaseInitialized = false;
    }
} else {
    console.warn("Firebase config missing. Please set VITE_FIREBASE_... environment variables in Netlify/Vercel.");
    isFirebaseInitialized = false;
}

export const googleProvider = new GoogleAuthProvider();

export { auth, db, isFirebaseInitialized };
