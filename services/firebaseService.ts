
import { db, auth } from '../firebaseConfig';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, increment } from 'firebase/firestore';
import { Scores, UserProfile, Team } from '../types';

// --- USERS & RESULTS ---

// שמירת תוצאות המשתמש בבסיס הנתונים
export const saveUserResults = async (scores: Scores) => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  
  try {
    await setDoc(userRef, {
      scores: scores,
      completedAt: new Date().toISOString()
    }, { merge: true });
    console.log("Results saved successfully");
  } catch (error) {
    console.error("Error saving results:", error);
    throw error;
  }
};

// יצירת משתמש חדש בבסיס הנתונים
export const createUserProfile = async (uid: string, data: { email: string; displayName: string; team: string; role?: 'user' | 'admin' }) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    uid,
    email: data.email,
    displayName: data.displayName,
    team: data.team,
    role: data.role || 'user',
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

// --- TEAMS MANAGEMENT ---

export const createTeam = async (teamName: string) => {
    // Check if team exists first (by name) - simplified check
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("name", "==", teamName));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        throw new Error("שם הצוות כבר קיים במערכת");
    }

    await addDoc(teamsRef, {
        name: teamName,
        createdAt: new Date().toISOString(),
        memberCount: 0
    });
};

export const getTeams = async (): Promise<Team[]> => {
    const teamsRef = collection(db, "teams");
    const querySnapshot = await getDocs(teamsRef);
    const teams: Team[] = [];
    querySnapshot.forEach((doc) => {
        teams.push({ id: doc.id, ...doc.data() } as Team);
    });
    return teams;
};
