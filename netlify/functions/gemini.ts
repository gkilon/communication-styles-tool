import { GoogleGenAI } from "@google/genai";
import * as admin from "firebase-admin";

// ----------------------------------------------------
// 1. Firebase Admin Initialization (Service Account)
// ----------------------------------------------------
let isFirebaseAdminInitialized = false;

function initFirebaseAdmin(): admin.firestore.Firestore | null {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    return null;
  }

  try {
    let serviceAccount: any;
    if (serviceAccountRaw.trim().startsWith("{")) {
      serviceAccount = JSON.parse(serviceAccountRaw);
    } else {
      // Support base64 encoded JSON
      const decoded = Buffer.from(serviceAccountRaw, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseAdminInitialized = true;
    return admin.firestore();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

// ----------------------------------------------------
// 2. In-Memory Fallback Rate Limiter (if no Service Account
//    or if Firestore fails)
// ----------------------------------------------------
interface FallbackRecord {
  minuteTimestamps: number[];
  dailyTimestamps: number[];
}
const fallbackMap = new Map<string, FallbackRecord>();
const FALLBACK_MAX_PER_MINUTE = 10;
const FALLBACK_MAX_PER_DAY = 50;

function checkFallbackLimit(key: string): { allowed: boolean; retryAfter?: number; errorMsg?: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  let record = fallbackMap.get(key);
  if (!record) {
    record = { minuteTimestamps: [], dailyTimestamps: [] };
    fallbackMap.set(key, record);
  }

  record.minuteTimestamps = record.minuteTimestamps.filter(t => t > oneMinuteAgo);
  record.dailyTimestamps = record.dailyTimestamps.filter(t => t > oneDayAgo);

  if (record.minuteTimestamps.length >= FALLBACK_MAX_PER_MINUTE) {
    const retryAfter = Math.ceil((record.minuteTimestamps[0] + 60 * 1000 - now) / 1000);
    return {
      allowed: false,
      retryAfter: Math.max(retryAfter, 1),
      errorMsg: `הגעת למגבלת הקריאות לדקה (${FALLBACK_MAX_PER_MINUTE} קריאות). אנא המתן ${Math.max(retryAfter, 1)} שניות ונסה שוב.`
    };
  }

  if (record.dailyTimestamps.length >= FALLBACK_MAX_PER_DAY) {
    return {
      allowed: false,
      errorMsg: `הגעת למכסת הקריאות היומית המקסימלית (${FALLBACK_MAX_PER_DAY} קריאות). המכסה תתאפס מחר.`
    };
  }

  record.minuteTimestamps.push(now);
  record.dailyTimestamps.push(now);
  return { allowed: true };
}

// ----------------------------------------------------
// 3. Firestore Quota Check (Minute + Daily limits per user)
// ----------------------------------------------------
const DEFAULT_DAILY_LIMIT = 50; // מכסת ברירת מחדל יומית למשתמש רגיל
const MAX_REQUESTS_PER_MINUTE = 10; // מתחת ל-15 של גוגל

async function checkAndIncrementQuota(
  db: admin.firestore.Firestore,
  identifier: string,
  isUserId: boolean
): Promise<{ allowed: boolean; retryAfter?: number; errorMsg?: string }> {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const safeIdentifier = identifier.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 200);
  const docRef = isUserId 
    ? db.collection("usage_limits").doc(safeIdentifier)
    : db.collection("usage_limits").doc(`anon_${safeIdentifier}`);

  try {
    const docSnap = await docRef.get();
    let data = docSnap.exists ? docSnap.data() || {} : {};

    // Bypass limits for super admins
    if (data.role === 'admin' || data.unlimited === true) {
      return { allowed: true };
    }

    // Users who already used the AI have the old default (30) stored in their doc,
    // so the default acts as a floor: nobody gets less than DEFAULT_DAILY_LIMIT.
    const dailyLimit = typeof data.dailyLimit === 'number' ? Math.max(data.dailyLimit, DEFAULT_DAILY_LIMIT) : DEFAULT_DAILY_LIMIT;
    let dailyCount = data.lastDate === todayStr ? (data.dailyCount || 0) : 0;
    let minuteTimestamps: number[] = Array.isArray(data.minuteTimestamps) ? data.minuteTimestamps : [];

    // Filter old timestamps
    minuteTimestamps = minuteTimestamps.filter((t: number) => t > oneMinuteAgo);

    // Check minute rate limit
    if (minuteTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      const oldest = minuteTimestamps[0];
      const retryAfter = Math.ceil((oldest + 60 * 1000 - now) / 1000);
      return {
        allowed: false,
        retryAfter: Math.max(retryAfter, 1),
        errorMsg: `הגעת למגבלת הקריאות לדקה (${MAX_REQUESTS_PER_MINUTE} קריאות). אנא המתן ${Math.max(retryAfter, 1)} שניות ונסה שוב.`
      };
    }

    // Check daily quota limit
    if (dailyCount >= dailyLimit) {
      return {
        allowed: false,
        errorMsg: `הגעת למכסת הקריאות היומית שלך (${dailyCount}/${dailyLimit} קריאות). המכסה תתאפס בחצות.`
      };
    }

    // Update quota in Firestore
    minuteTimestamps.push(now);
    dailyCount += 1;

    await docRef.set({
      dailyCount,
      dailyLimit,
      lastDate: todayStr,
      minuteTimestamps,
      lastRequestAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { allowed: true };

  } catch (dbError) {
    // Firestore failed: use the rough in-memory limiter instead of allowing everything.
    console.error("Firestore quota check error, using in-memory fallback limiter:", dbError);
    return checkFallbackLimit(identifier);
  }
}

// ----------------------------------------------------
// 3b. Global daily cap for the whole app (safety net)
// ----------------------------------------------------
const GLOBAL_DAILY_LIMIT = 1000; // סך כל קריאות ה-AI ביום, לכל המשתמשים ביחד

async function checkGlobalDailyCap(
  db: admin.firestore.Firestore
): Promise<{ allowed: boolean; errorMsg?: string }> {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const ref = db.collection("app_usage").doc(`global_${todayStr}`);

  try {
    const allowed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count = snap.exists ? ((snap.data() as any)?.count || 0) : 0;
      if (count >= GLOBAL_DAILY_LIMIT) {
        return false;
      }
      tx.set(ref, {
        count: count + 1,
        date: todayStr,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    });

    if (!allowed) {
      return {
        allowed: false,
        errorMsg: "שירות ה-AI הגיע למכסה היומית הכללית שלו. הוא יחזור לעבוד מחר. אפשר להמשיך להשתמש בשאר חלקי האתר."
      };
    }
    return { allowed: true };
  } catch (e) {
    // If only the global counter fails, don't block everyone; per-user limits still apply.
    console.error("Global cap check failed, allowing request:", e);
    return { allowed: true };
  }
}

async function isAdminUser(db: admin.firestore.Firestore, uid: string): Promise<boolean> {
  try {
    const snap = await db.collection("users").doc(uid).get();
    return snap.exists && (snap.data() as any)?.role === "admin";
  } catch (e) {
    console.warn("Admin check (global cap) failed:", e);
    return false;
  }
}

function getClientIp(req: Request, context?: any): string {
  // Netlify's own view of the caller — never the spoofable X-Forwarded-For header.
  return context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown_client";
}

// Verifies the Firebase ID token sent in the Authorization header and returns
// the REAL, server-confirmed uid — or null if there is no valid token.
// This replaces trusting payload.userId, which the caller could set to
// anything (including a fresh random value on every request) to dodge quota.
async function getVerifiedToken(req: Request): Promise<admin.auth.DecodedIdToken | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) return null;

  try {
    if (admin.apps.length === 0) return null; // Admin SDK not initialized — can't verify
    return await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    console.warn("ID token verification failed:", e);
    return null;
  }
}

// An account may use the AI only if (a) it redeemed a valid access code
// (server-stamped "codeOk" flag, set by /api/redeem-code), or (b) it is an
// admin. Merely holding a Firebase account is NOT enough.
async function isAuthorizedForAi(db: admin.firestore.Firestore, decoded: admin.auth.DecodedIdToken): Promise<boolean> {
  if ((decoded as any).codeOk === true) return true;
  try {
    const snap = await db.collection("users").doc(decoded.uid).get();
    return snap.exists && (snap.data() as any)?.role === "admin";
  } catch (e) {
    console.warn("Admin check failed:", e);
    return false;
  }
}

// ----------------------------------------------------
// Helper: Delay and Retry wrapper for Gemini calls
// ----------------------------------------------------
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 1500): Promise<T> {
  let currentDelay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isQuotaOrBusy = 
        err?.status === 429 || 
        err?.status === 503 ||
        err?.message?.includes('429') || 
        err?.message?.includes('503') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');

      if (isQuotaOrBusy && i < retries - 1) {
        console.warn(`Gemini rate limited (${err?.status || '429/503'}). Retrying attempt ${i + 1}/${retries} in ${currentDelay}ms...`);
        await delay(currentDelay);
        currentDelay *= 1.5;
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries reached");
}

// ----------------------------------------------------
// 4. Main Function Handler
// ----------------------------------------------------
export default async (req: Request, context?: any) => {
  try {
    const { action, payload } = await req.json();
    const clientIp = getClientIp(req, context);

    const adminDb = initFirebaseAdmin();

    // 1) Who is calling? Only a server-verified login token counts —
    //    never anything the caller merely claims in the request body.
    const decoded = adminDb ? await getVerifiedToken(req) : null;
    if (!decoded || !adminDb) {
      return new Response(JSON.stringify({ error: "נדרשת התחברות כדי להשתמש בשירות ה-AI." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const verifiedUid = decoded.uid;

    // 2) Are they allowed to use the AI? Needs a redeemed access code (or admin).
    if (!(await isAuthorizedForAi(adminDb, decoded))) {
      return new Response(JSON.stringify({ error: "נדרש קוד גישה בתוקף כדי להשתמש בשירות ה-AI.", needsCode: true }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Basic guardrails on what a caller may ask the upstream model to do.
    // (The app builds its prompts client-side, so we can't lock the prompt
    // itself — but we can stop model swapping and oversized/expensive requests.)
    const ALLOWED_MODELS = ["gemini-3.8-flash"];
    const MAX_INPUT_CHARS = 120000;
    const MAX_OUTPUT_TOKENS = 8192;

    if (payload?.model && !ALLOWED_MODELS.includes(payload.model)) {
      return new Response(JSON.stringify({ error: "מודל לא נתמך." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const inputSize = JSON.stringify(payload?.contents ?? "").length +
      JSON.stringify(payload?.config?.systemInstruction ?? "").length;
    if (inputSize > MAX_INPUT_CHARS) {
      return new Response(JSON.stringify({ error: "הבקשה גדולה מדי." }), {
        status: 413,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (payload?.config && typeof payload.config.maxOutputTokens === "number" &&
        payload.config.maxOutputTokens > MAX_OUTPUT_TOKENS) {
      payload.config.maxOutputTokens = MAX_OUTPUT_TOKENS;
    }

    let limitCheck: { allowed: boolean; retryAfter?: number; errorMsg?: string };

    if (adminDb) {
      const identifier = verifiedUid || clientIp;
      limitCheck = await checkAndIncrementQuota(adminDb, identifier, !!verifiedUid);

    } else {
      limitCheck = checkFallbackLimit(verifiedUid || clientIp);
    }

    if (!limitCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: limitCheck.errorMsg || "Rate limit exceeded",
        rateLimited: true,
        retryAfter: limitCheck.retryAfter
      }), { 
        status: 429,
        headers: { 
          "Content-Type": "application/json",
          "Retry-After": String(limitCheck.retryAfter || 5)
        }
      });
    }

    // Global daily cap for the whole app (admins bypass)
    if (!(await isAdminUser(adminDb, verifiedUid))) {
      const globalCheck = await checkGlobalDailyCap(adminDb);
      if (!globalCheck.allowed) {
        return new Response(JSON.stringify({
          error: globalCheck.errorMsg || "הגענו למכסה היומית הכללית.",
          rateLimited: true,
          globalLimited: true
        }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // API Key Validation
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("Gemini API Key missing");
      return new Response(JSON.stringify({ error: "מפתח ה-API של גוגל אינו מוגדר בסביבה" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    // עודכן למודל יציב ומהיר
    const modelName = payload.model || "gemini-3.8-flash";

    const requestConfig = {
      thinkingConfig: { thinkingLevel: "MEDIUM" },
      ...payload.config
    };

    // Streaming actions with Retry wrapper
    if (action && action.endsWith('Stream')) {
      try {
        const result = await executeWithRetry(() =>
          ai.models.generateContentStream({
            model: modelName,
            contents: payload.contents,
            config: requestConfig
          })
        );

        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result) {
                const text = chunk.text;
                if (text) {
                  controller.enqueue(new TextEncoder().encode(text));
                }
              }
              controller.close();
            } catch (e: any) {
              console.error("Stream processing error:", e);
              controller.error(e);
            }
          }
        });

        return new Response(stream, {
          headers: { 
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      } catch (streamError: any) {
        console.error("Streaming initialization error after retries:", streamError);
        
        const isQuota = streamError.message?.includes('429') || streamError.message?.includes('RESOURCE_EXHAUSTED') || streamError.message?.includes('quota');
        const isServerBusy = streamError.status === 503 || streamError.message?.includes('503');

        let userMsg = "שגיאה בתקשורת עם ה-AI";
        let statusCode = 500;

        if (isQuota) {
            userMsg = "שירות ה-AI חווה עומס קריאות זמני בגוגל. אנא המתן מספר שניות ונסה שוב.";
            statusCode = 429;
        } else if (isServerBusy) {
            userMsg = "השרתים של גוגל עמוסים כרגע. אנא נסה שוב בעוד מספר שניות.";
            statusCode = 503;
        }

        return new Response(JSON.stringify({ error: userMsg }), { 
          status: statusCode,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Non-streaming actions with Retry wrapper
    const response = await executeWithRetry(() =>
      ai.models.generateContent({
        model: modelName,
        contents: payload.contents,
        config: requestConfig
      })
    );

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Netlify Function Error after retries:", error);
    
    const isQuota = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('quota');
    const isServerBusy = error.status === 503 || error.message?.includes('503');

    let userMsg = "חלה שגיאה בביצוע הבקשה";
    let statusCode = 500;

    if (isQuota) {
        userMsg = "שירות ה-AI חווה עומס קריאות זמני בגוגל. אנא המתן מספר שניות ונסה שוב.";
        statusCode = 429;
    } else if (isServerBusy) {
        userMsg = "השרתים של גוגל עמוסים כרגע. אנא נסה שוב בעוד מספר שניות.";
        statusCode = 503;
    }

    return new Response(JSON.stringify({ error: userMsg }), { 
      status: statusCode,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/gemini"
};
