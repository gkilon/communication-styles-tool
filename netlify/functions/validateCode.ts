import { initFirebaseAdmin, getTrustedClientIp, rateLimitHit } from "../lib/serverCommon";

interface AccessValidationResult {
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

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function getOrganizationById(db: FirebaseFirestore.Firestore, orgId: string) {
  const snap = await db.collection("organizations").doc(orgId).get();
  return snap.exists ? (snap.data() as any) : null;
}

async function getTeamByName(db: FirebaseFirestore.Firestore, teamName: string) {
  const q = await db.collection("teams").where("name", "==", teamName.trim()).limit(1).get();
  if (q.empty) return null;
  const team: any = { id: q.docs[0].id, ...q.docs[0].data() };
  if (team.organizationId) {
    const org = await getOrganizationById(db, team.organizationId);
    if (org) {
      team.companyName = team.companyName ?? org.companyName;
      team.logoUrl = team.logoUrl ?? org.logoUrl;
      team.orgContext = team.orgContext ?? org.orgContext;
      team.knowledgeBase = team.knowledgeBase ?? org.knowledgeBase;
    }
  }
  return team;
}

export default async (req: Request, context?: any) => {
  try {
    const db = initFirebaseAdmin();
    if (!db) {
      return json({ valid: false, type: 'invalid', message: 'שגיאת שרת — נסה שוב מאוחר יותר' }, 500);
    }

    // Rate limit on the REAL client IP (from Netlify itself, not the spoofable
    // X-Forwarded-For header), stored in Firestore so it holds across instances.
    const ip = getTrustedClientIp(req, context);
    if (await rateLimitHit(db, "validate", ip, 20, 60 * 1000)) {
      return json({ valid: false, type: 'invalid', message: 'יותר מדי ניסיונות. נסה שוב בעוד דקה.' }, 429);
    }

    const { code: rawCode } = await req.json();
    const code = (typeof rawCode === "string" ? rawCode : "").trim();
    if (!code) return json({ valid: false, type: 'invalid', message: 'נא להזין קוד גישה' });

    // 1. Legacy global password
    try {
      const accessSnap = await db.collection("settings").doc("access").get();
      const qPass = (accessSnap.data() as any)?.questionnairePassword;
      if (qPass && code.toLowerCase() === String(qPass).toLowerCase()) {
        return json({ valid: true, type: 'global', teamName: 'General', dailyLimit: 30 });
      }
    } catch (e) {
      console.warn("Could not check settings/access:", e);
    }

    // 2. access_codes collection
    let snap = await db.collection("access_codes").doc(code.toUpperCase()).get();
    if (!snap.exists) snap = await db.collection("access_codes").doc(code).get();

    if (snap.exists) {
      const data = snap.data() as any;
      if (data.active === false) {
        return json({ valid: false, type: 'invalid', message: 'קוד הגישה פג תוקף או אינו פעיל' });
      }
      const teamName = data.teamName || 'General';
      const result: AccessValidationResult = {
        valid: true,
        type: data.type || (teamName !== 'General' ? 'team' : 'personal'),
        teamName,
        companyName: data.companyName,
        logoUrl: data.logoUrl,
        orgContext: data.orgContext,
        knowledgeBase: data.knowledgeBase,
        dailyLimit: Number(data.dailyLimit ?? 50) || 50
      };

      // Organization-level branding and context, through the code's own organizationId.
      // Admin-created codes carry only the id (not the context itself), and an
      // organization-wide code has no team at all — so this is the only way it gets context.
      if (data.organizationId) {
        const org = await getOrganizationById(db, String(data.organizationId));
        if (org) {
          result.companyName = result.companyName ?? org.companyName;
          result.logoUrl = result.logoUrl ?? org.logoUrl;
          result.orgContext = result.orgContext ?? org.orgContext;
          result.knowledgeBase = result.knowledgeBase ?? org.knowledgeBase;
        }
      }

      // Team-level branding and context (the team's own values win over the organization's)
      if (teamName !== 'General') {
        const teamObj = await getTeamByName(db, teamName);
        if (teamObj) {
          result.companyName = teamObj.companyName ?? result.companyName;
          result.logoUrl = teamObj.logoUrl ?? result.logoUrl;
          result.orgContext = teamObj.orgContext ?? result.orgContext;
          result.knowledgeBase = teamObj.knowledgeBase ?? result.knowledgeBase;
        }
      }
      return json(result);
    }

    return json({ valid: false, type: 'invalid', message: 'קוד גישה שגוי. אנא ודא שהזנת את הקוד במדויק.' });
  } catch (error) {
    console.error("validateCode function error:", error);
    return json({ valid: false, type: 'invalid', message: 'שגיאת שרת' }, 500);
  }
};

export const config = {
  path: "/api/validate-code"
};
