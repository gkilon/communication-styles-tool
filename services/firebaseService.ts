import { db, auth } from '../firebaseConfig';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Scores, UserProfile } from '../types';

// שמירת תוצאות המשתמש בבסיס הנתונים
export const saveUserResults = async (scores: Scores) => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  
  try {
    await setDoc(userRef, {
      scores: scores,
      completedAt: new Date().toISOString()
    }, { merge: true }); // merge=true אומר שאנחנו רק מעדכנים ולא דורסים את השם/צוות
    console.log("Results saved successfully");
  } catch (error) {
    console.error("Error saving results:", error);
    throw error;
  }
};

// יצירת משתמש חדש בבסיס הנתונים (פרטים אישיים וצוות)
export const createUserProfile = async (uid: string, data: { email: string; displayName: string; team: string }) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    uid,
    ...data,
    role: 'user', // ברירת מחדל
    createdAt: new Date().toISOString()
  });
};

// קבלת פרופיל המשתמש הנוכחי
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
};

// (למנהלים) קבלת כל המשתמשים מצוות מסוים
export const getTeamMembers = async (teamName: string) => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("team", "==", teamName));
  
  const querySnapshot = await getDocs(q);
  const users: UserProfile[] = [];
  querySnapshot.forEach((doc) => {
    users.push(doc.data() as UserProfile);
  });
  return users;
};

// (למנהל על) קבלת כל המשתמשים במערכת
export const getAllUsers = async () => {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    return users;
};