import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// הנתונים נלקחו ישירות מהטקסט שסיפקת
const firebaseConfig = {
  apiKey: "AIzaSyAzP5HCS_qly0jmPT3hkdsn05NlPq1haNA",
  authDomain: "communication-tool-4d386.firebaseapp.com",
  projectId: "communication-tool-4d386",
  storageBucket: "communication-tool-4d386.firebasestorage.app",
  messagingSenderId: "837244077464",
  appId: "1:837244077464:web:95ffac269ba42de4d457ed",
  measurementId: "G-2BLHYPM7G8"
};

// אתחול האפליקציה
const app = initializeApp(firebaseConfig);

// ייצוא שירותי האימות והמסד נתונים לשימוש בשאר האפליקציה
export const auth = getAuth(app);
export const db = getFirestore(app);