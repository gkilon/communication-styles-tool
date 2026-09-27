import * as admin from "firebase-admin";

// ----------------------------------------------------
// Firebase Admin init (same pattern as gemini.ts)
// ----------------------------------------------------
function initFirebaseAdmin(): admin.firestore.Firestore | null {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) return null;

  try {
    let serviceAccount: any;
    if (serviceAccountRaw.trim().startsWith("{")) {
      serviceAccount = JSON.parse(serviceAccountRaw);
    } else {
      const decoded = Buffer.from(serviceAccountRaw, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return admin.firestore();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

// ----------------------------------------------------
// Light per-IP rate limit — this endpoint has no login gate (it runs BEFORE
// login), so it's the one place someone could try to brute-force guess
// access codes. This doesn't stop a determined attacker, but it blunts a
// simple guessing script without adding any friction for a real person
// typing one real code.
// ----------------------------------------------------
const attemptsByIp = new Map<string, number[]>();
const MAX_ATTEMPTS_PER_MINUTE = 20;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const timestamps = (attemptsByIp.get(ip) || []).filter(t => t > oneMinuteAgo);
  timestamps.push(now);
  attemptsByIp.set(ip, timestamps);
  return timestamps.length > MAX_ATTEMPTS_PER_MINUTE;
}

function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();
  return req.headers.get("x-nf-client-connection-ip") || "unknown_client";
}

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

async function getOrganizationById(db: admin.firestore.Firestore, orgId: string) {
  const snap = await db.collection("organizations").doc(orgId).get();
  return snap.exists ? { id: snap.id, ...(snap.data() as any) } : null;
}

async function getTeamByName(db: admin.firestore.Firestore, teamName: string) {
  const q = await db.collection("teams").where("name", "==", teamName.trim()).limit(1).get();
  if (q.empty) return null;
  const docData = q.docs[0];
  const team: any = { id: docData.id, ...docData.data() };
  if (team.organizationId) {
    const org = await getOrganizationById(db, team.organizationId);
    if (org) {
      team.companyName = team.companyName ?? (org as any).companyName;
      team.logoUrl = team.logoUrl ?? (org as any).logoUrl;
      team.orgContext = team.orgContext ?? (org as any).orgContext;
      team.knowledgeBase = team.knowledgeBase ?? (org as any).knowledgeBase;
    }
  }
  return team;
}

export default async (req: Request) => {
  try {
    const clientIp = getClientIp(req);
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ valid: false, type: 'invalid', message: 'יותר מדי ניסיונות. נסה שוב בעוד דקה.' }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { code: rawCode } = await req.json();
    const code = (rawCode || '').trim();

    const respond = (result: AccessValidationResult, status = 200) =>
      new Response(JSON.stringify(result), { status, headers: { "Content-Type": "application/json" } });

    if (!code) return respond({ valid: false, type: 'invalid', message: 'נא להזין קוד גישה' });

    const db = initFirebaseAdmin();
    if (!db) {
      return respond({ valid: false, type: 'invalid', message: 'שגיאת שרת — נסה שוב מאוחר יותר' }, 500);
    }

    // 1. Legacy global password
    try {
      const accessSnap = await db.collection("settings").doc("access").get();
      if (accessSnap.exists) {
        const qPass = (accessSnap.data() as any)?.questionnairePassword;
        if (qPass && code.toLowerCase() === qPass.toLowerCase()) {
          return respond({ valid: true, type: 'global', teamName: 'General', dailyLimit: 30 });
        }
      }
    } catch (e) {
      console.warn("Could not check settings/access:", e);
    }

    // 2. access_codes collection (case variations, same as the old client logic)
    try {
      let snap = await db.collection("access_codes").doc(code.toUpperCase()).get();
      if (!snap.exists) {
        snap = await db.collection("access_codes").doc(code).get();
      }

      if (snap.exists) {
        const data = snap.data() as any;
        if (data.active === false) {
          return respond({ valid: false, type: 'invalid', message: 'קוד הגישה פג תוקף או אינו פעיל' });
        }
        const dailyLimit = Number(data.dailyLimit ?? 50) || 50;
        const teamName = data.teamName || 'General';
        const codeType = data.type || (teamName !== 'General' ? 'team' : 'personal');

        const result: AccessValidationResult = {
          valid: true,
          type: codeType,
          teamName,
          companyName: data.companyName,
          logoUrl: data.logoUrl,
          orgContext: data.orgContext,
          knowledgeBase: data.knowledgeBase,
          dailyLimit
        };

        // Enrich from the team/org (mirrors the old client-side getTeamByName merge)
        if (result.teamName && result.teamName !== 'General') {
          const teamObj = await getTeamByName(db, result.teamName);
          if (teamObj) {
            result.companyName = teamObj.companyName;
            result.logoUrl = teamObj.logoUrl;
            result.orgContext = teamObj.orgContext;
            result.knowledgeBase = teamObj.knowledgeBase;
          }
        }

        return respond(result);
      }
    } catch (e) {
      console.warn("Error checking access_codes:", e);
    }

    return respond({ valid: false, type: 'invalid', message: 'קוד גישה שגוי. אנא ודא שהזנת את הקוד במדויק.' });

  } catch (error: any) {
    console.error("validateCode function error:", error);
    return new Response(JSON.stringify({ valid: false, type: 'invalid', message: 'שגיאת שרת' }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/validate-code"
};
