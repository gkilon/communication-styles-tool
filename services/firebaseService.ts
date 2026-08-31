
import { db, auth } from '../firebaseConfig';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { Scores, UserProfile, Team, BackgroundData } from '../types';
import { User } from 'firebase/auth';

// --- USERS & RESULTS ---

// שמירת תוצאות המשתמש בבסיס הנתונים (למשתמש מחובר)
export const saveUserResults = async (scores: Scores, backgroundData?: BackgroundData) => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  
  try {
    const payload: any = {
      scores: scores,
      completedAt: new Date().toISOString()
    };
    if (backgroundData) {
      payload.backgroundData = backgroundData;
    }
    await setDoc(userRef, payload, { merge: true });
    console.log("Results saved successfully");
  } catch (error) {
    console.error("Error saving results:", error);
    throw error;
  }
};

// שמירת תוצאות של משתתף בסדנה צוותית (ללא צורך בהרשמה / אימייל)
export const saveWorkshopGuestResults = async (
  participantId: string, 
  displayName: string, 
  teamName: string, 
  scores: Scores, 
  backgroundData?: BackgroundData
) => {
  if (!isFirebaseInitialized || !participantId) return;

  const userRef = doc(db, "users", participantId);
  try {
    const payload: any = {
      uid: participantId,
      displayName: displayName.trim(),
      team: teamName.trim() || 'General',
      scores: scores,
      role: 'user',
      isGuest: true,
      completedAt: new Date().toISOString()
    };
    if (backgroundData) {
      payload.backgroundData = backgroundData;
    }
    await setDoc(userRef, payload, { merge: true });
    console.log("Workshop guest results saved successfully for:", displayName);
  } catch (error) {
    console.error("Error saving workshop guest results:", error);
  }
};


// עדכון צוות של משתמש קיים
export const updateUserTeam = async (uid: string, newTeamName: string) => {
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, {
      team: newTeamName
    });
    console.log(`User ${uid} moved to team ${newTeamName}`);
  } catch (error) {
    console.error("Error updating user team:", error);
    throw error;
  }
};

// יצירת משתמש חדש בבסיס הנתונים (להרשמה במייל)
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

// **חדש** - טיפול בהתחברות מגוגל
// אם המשתמש לא קיים במסד הנתונים, יוצר לו פרופיל בסיסי
export const ensureGoogleUserProfile = async (firebaseUser: User, teamName: string = 'General') => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
        // Create new profile automatically
        await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Google User',
            team: teamName, // Default team or selected one if logic permits
            role: 'user',
            createdAt: new Date().toISOString(),
            photoURL: firebaseUser.photoURL
        });
        return true; // Created new
    }
    return false; // Existed
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
        // Fix: Use type assertion to allow spreading unknown DocumentData
        teams.push({ id: doc.id, ...(doc.data() as any) } as Team);
    });
    return teams;
};

export const updateTeamDetails = async (teamId: string, data: Partial<Team>): Promise<void> => {
  const teamRef = doc(db, "teams", teamId);
  const payload: any = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  await updateDoc(teamRef, payload);
};

export const getTeamByName = async (teamName: string): Promise<Team | null> => {
  try {
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("name", "==", teamName.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return { id: docData.id, ...(docData.data() as any) } as Team;
    }
  } catch (e) {
    console.warn("Error finding team by name:", e);
  }
  return null;
};

// --- ACCESS & LICENSE CODES ---

export interface AccessValidationResult {
  valid: boolean;
  type: 'global' | 'personal' | 'team' | 'invalid';
  teamName?: string;
  companyName?: string;
  logoUrl?: string;
  orgContext?: string;
  knowledgeBase?: string;
  dailyLimit?: number;
  message?: string;
}

export const validateAccessCode = async (rawCode: string): Promise<AccessValidationResult> => {
  const code = rawCode.trim();
  if (!code) return { valid: false, type: 'invalid', message: 'נא להזין קוד גישה' };

  // Helper to attach team enterprise data if found
  const enrichWithTeamData = async (res: AccessValidationResult): Promise<AccessValidationResult> => {
    if (res.teamName && res.teamName !== 'General') {
      const teamObj = await getTeamByName(res.teamName);
      if (teamObj) {
        res.companyName = teamObj.companyName;
        res.logoUrl = teamObj.logoUrl;
        res.orgContext = teamObj.orgContext;
        res.knowledgeBase = teamObj.knowledgeBase;
      }
    }
    return res;
  };

  // 1. Check if matches legacy global password in settings/access
  try {
    const accessSnap = await getDoc(doc(db, "settings", "access"));
    if (accessSnap.exists()) {
      const qPass = (accessSnap.data() as any).questionnairePassword;
      if (qPass && code.toLowerCase() === qPass.toLowerCase()) {
        return { valid: true, type: 'global', teamName: 'General', dailyLimit: 30 };
      }
    }
  } catch (e) {
    console.warn("Could not check settings/access, falling back:", e);
  }

  // Fallback default code
  if (code.toLowerCase() === 'inspire' || code.toLowerCase() === 'kilon' || code.toLowerCase() === 'gilad') {
    return { valid: true, type: 'global', teamName: 'General', dailyLimit: 30 };
  }

  // 2. Check in access_codes or access codes collection (for personalized/team licenses)
  try {
    let snap = await getDoc(doc(db, "access_codes", code.toUpperCase()));
    if (!snap.exists()) {
      snap = await getDoc(doc(db, "access codes", code.toUpperCase()));
    }
    if (!snap.exists()) {
      snap = await getDoc(doc(db, "access_codes", code));
    }
    if (!snap.exists()) {
      snap = await getDoc(doc(db, "access codes", code));
    }

    if (snap.exists()) {
      const data = snap.data() as any;
      const isActive = data.active !== false && data.Active !== false;
      if (!isActive) {
        return { valid: false, type: 'invalid', message: 'קוד הגישה פג תוקף או אינו פעיל' };
      }
      const rawLimit = data.dailyLimit ?? data.DailyLimit ?? 50;
      const parsedLimit = Number(rawLimit);
      const teamName = data.teamName || data.TeamName || 'General';
      const codeType = data.type || data.Type || (teamName !== 'General' ? 'team' : 'personal');

      const initialResult: AccessValidationResult = {
        valid: true,
        type: codeType,
        teamName: teamName,
        companyName: data.companyName || data.CompanyName,
        logoUrl: data.logoUrl || data.LogoUrl,
        orgContext: data.orgContext || data.OrgContext,
        knowledgeBase: data.knowledgeBase || data.KnowledgeBase,
        dailyLimit: isNaN(parsedLimit) ? 50 : parsedLimit
      };

      return await enrichWithTeamData(initialResult);
    }
  } catch (e) {
    console.warn("Error checking access_codes in Firestore:", e);
  }

  // 3. Check directly if code is a team name
  try {
    const directTeam = await getTeamByName(code);
    if (directTeam) {
      return {
        valid: true,
        type: 'team',
        teamName: directTeam.name,
        companyName: directTeam.companyName,
        logoUrl: directTeam.logoUrl,
        orgContext: directTeam.orgContext,
        knowledgeBase: directTeam.knowledgeBase,
        dailyLimit: 50
      };
    }
  } catch (e) {
    console.warn("Error checking direct team name:", e);
  }

  return { valid: false, type: 'invalid', message: 'קוד גישה שגוי. אנא ודא שהזנת את הקוד במדויק.' };
};


export interface AccessCodeRecord {
  id: string;
  code: string;
  teamName: string;
  type: 'team' | 'personal';
  dailyLimit: number;
  active: boolean;
  createdAt: string;
}

export const createAccessCode = async (data: {
  code: string;
  teamName: string;
  type?: 'team' | 'personal';
  dailyLimit?: number;
}): Promise<void> => {
  const cleanCode = data.code.trim().toUpperCase();
  if (!cleanCode) throw new Error("קוד גישה לא יכול להיות ריק");

  const docRef = doc(db, "access_codes", cleanCode);
  await setDoc(docRef, {
    code: cleanCode,
    teamName: data.teamName.trim() || 'General',
    type: data.type || 'team',
    dailyLimit: data.dailyLimit || 50,
    active: true,
    createdAt: new Date().toISOString()
  });
};

export const getAccessCodes = async (): Promise<AccessCodeRecord[]> => {
  try {
    const collRef = collection(db, "access_codes");
    const snap = await getDocs(collRef);
    const codes: AccessCodeRecord[] = [];
    snap.forEach(d => {
      codes.push({ id: d.id, ...(d.data() as any) } as AccessCodeRecord);
    });
    return codes;
  } catch (e) {
    console.warn("Could not fetch access codes:", e);
    return [];
  }
};

