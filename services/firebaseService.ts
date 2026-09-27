import { db, auth, isFirebaseInitialized } from '../firebaseConfig';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Scores, UserProfile, Team, Organization, BackgroundData } from '../types';
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

// נקרא פעם אחת מיד אחרי הרשמה/כניסה מוצלחת ב-AuthGate (Google או אימייל+סיסמה),
// כדי שהמשתמש יופיע מיד בלוח הבקרה גם אם עוד לא סיים את השאלון.
export const ensureUserProfile = async (params: {
  uid: string;
  email: string | null;
  displayName: string;
  teamName?: string;
  teamId?: string;
}): Promise<void> => {
  const userRef = doc(db, "users", params.uid);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    // First time we ever see this account — safe to set role: 'user' here.
    const payload: any = {
      uid: params.uid,
      email: params.email || '',
      displayName: params.displayName,
      team: params.teamName || 'General',
      role: 'user'
    };
    if (params.teamId) payload.teamId = params.teamId;
    await setDoc(userRef, payload);
  } else {
    // Returning user — update basic info only, NEVER touch role again
    // (this is what protects a manually-granted admin flag from being
    // silently reset back to 'user' on the next login).
    const payload: any = {
      email: params.email || '',
      displayName: params.displayName
    };
    if (params.teamName) payload.team = params.teamName;
    if (params.teamId) payload.teamId = params.teamId;
    await setDoc(userRef, payload, { merge: true });
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
        await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Google User',
            team: teamName,
            role: 'user',
            createdAt: new Date().toISOString(),
            photoURL: firebaseUser.photoURL
        });
        return true;
    }
    return false;
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

// --- ORGANIZATIONS MANAGEMENT ---
// An Organization holds all shared branding/context (logo, culture, knowledge base).
// A Team belongs to exactly one Organization via organizationId and holds no
// branding of its own — it exists only so the team map can be filtered per sub-group.

const UNASSIGNED_ORG_NAME = "ללא שיוך ארגוני";

// Every team must belong to an organization. If the caller doesn't pick one,
// fall back to a single shared "no org" bucket instead of leaving organizationId empty.
export const getOrCreateUnassignedOrg = async (): Promise<string> => {
  const orgsRef = collection(db, "organizations");
  const q = query(orgsRef, where("name", "==", UNASSIGNED_ORG_NAME));
  const existing = await getDocs(q);
  if (!existing.empty) return existing.docs[0].id;

  const docRef = await addDoc(orgsRef, {
    name: UNASSIGNED_ORG_NAME,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

export const createOrganization = async (orgName: string) => {
    const orgsRef = collection(db, "organizations");
    const q = query(orgsRef, where("name", "==", orgName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        throw new Error("שם הארגון כבר קיים במערכת");
    }

    const docRef = await addDoc(orgsRef, {
        name: orgName,
        createdAt: new Date().toISOString()
    });
    return docRef.id;
};

export const getOrganizations = async (): Promise<Organization[]> => {
    const orgsRef = collection(db, "organizations");
    const querySnapshot = await getDocs(orgsRef);
    const orgs: Organization[] = [];
    querySnapshot.forEach((doc) => {
        orgs.push({ id: doc.id, ...(doc.data() as any) } as Organization);
    });
    return orgs;
};

export const getOrganizationById = async (orgId: string): Promise<Organization | null> => {
  try {
    const snap = await getDoc(doc(db, "organizations", orgId));
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) } as Organization;
    }
  } catch (e) {
    console.warn("Error fetching organization:", e);
  }
  return null;
};

export const updateOrganizationDetails = async (orgId: string, data: Partial<Organization>): Promise<void> => {
  const orgRef = doc(db, "organizations", orgId);
  const payload: any = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  await updateDoc(orgRef, payload);
};

export const deleteOrganization = async (orgId: string): Promise<void> => {
  const orgRef = doc(db, "organizations", orgId);
  await deleteDoc(orgRef);
};

// --- TEAMS MANAGEMENT ---

export const createTeam = async (teamName: string, organizationId?: string) => {
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("name", "==", teamName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        throw new Error("שם הצוות כבר קיים במערכת");
    }

    const resolvedOrgId = organizationId || await getOrCreateUnassignedOrg();

    await addDoc(teamsRef, {
        name: teamName,
        createdAt: new Date().toISOString(),
        memberCount: 0,
        organizationId: resolvedOrgId
    });
};

export const getTeams = async (): Promise<Team[]> => {
    const teamsRef = collection(db, "teams");
    const querySnapshot = await getDocs(teamsRef);
    const teams: Team[] = [];
    querySnapshot.forEach((doc) => {
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

export const deleteTeam = async (teamId: string): Promise<void> => {
  const teamRef = doc(db, "teams", teamId);
  await deleteDoc(teamRef);
};

export const deleteAccessCode = async (codeId: string): Promise<void> => {
  const codeRef = doc(db, "access_codes", codeId);
  await deleteDoc(codeRef);
};

export const getTeamByName = async (teamName: string): Promise<Team | null> => {
  try {
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("name", "==", teamName.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      const team = { id: docData.id, ...(docData.data() as any) } as Team;

      // Merge in the parent organization's branding/context — the team itself
      // no longer holds its own copy of these fields.
      if (team.organizationId) {
        const org = await getOrganizationById(team.organizationId);
        if (org) {
          team.companyName = team.companyName ?? org.companyName;
          team.logoUrl = team.logoUrl ?? org.logoUrl;
          team.orgContext = team.orgContext ?? org.orgContext;
          team.knowledgeBase = team.knowledgeBase ?? org.knowledgeBase;
        }
      }

      return team;
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

  // 1. Check legacy global password in settings/access
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

  // 2. Check access_codes collection
  try {
    let snap = await getDoc(doc(db, "access_codes", code.toUpperCase()));
    if (!snap.exists()) {
      snap = await getDoc(doc(db, "access_codes", code));
    }

    if (snap.exists()) {
      const data = snap.data() as any;
      const isActive = data.active !== false;
      if (!isActive) {
        return { valid: false, type: 'invalid', message: 'קוד הגישה פג תוקף או אינו פעיל' };
      }
      const rawLimit = data.dailyLimit ?? 50;
      const parsedLimit = Number(rawLimit);
      const teamName = data.teamName || 'General';
      const codeType = data.type || (teamName !== 'General' ? 'team' : 'personal');

      const initialResult: AccessValidationResult = {
        valid: true,
        type: codeType,
        teamName: teamName,
        companyName: data.companyName,
        logoUrl: data.logoUrl,
        orgContext: data.orgContext,
        knowledgeBase: data.knowledgeBase,
        dailyLimit: isNaN(parsedLimit) ? 50 : parsedLimit
      };

      return await enrichWithTeamData(initialResult);
    }
  } catch (e) {
    console.warn("Error checking access_codes in Firestore:", e);
  }

  return { valid: false, type: 'invalid', message: 'קוד גישה שגוי. אנא ודא שהזנת את הקוד במדויק.' };
};


export interface AccessCodeRecord {
  id: string;
  code: string;
  organizationId: string;
  teamId?: string;       // optional — omitted means "whole organization, no specific team"
  teamName?: string;     // kept only for display in the admin list / session branding
  type: 'team' | 'personal';
  dailyLimit: number;
  active: boolean;
  createdAt: string;
}

export const createAccessCode = async (data: {
  code: string;
  organizationId: string;
  teamId?: string;
  teamName?: string;
  type?: 'team' | 'personal';
  dailyLimit?: number;
}): Promise<void> => {
  const cleanCode = data.code.trim().toUpperCase();
  if (!cleanCode) throw new Error("קוד גישה לא יכול להיות ריק");
  if (!data.organizationId) throw new Error("יש לבחור ארגון עבור קוד הגישה");

  const docRef = doc(db, "access_codes", cleanCode);
  await setDoc(docRef, {
    code: cleanCode,
    organizationId: data.organizationId,
    teamId: data.teamId || null,
    teamName: data.teamName || null,
    type: data.type || (data.teamId ? 'team' : 'personal'),
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
