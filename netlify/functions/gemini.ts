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
// 3. Atomic Firestore quotas (per-user + global daily cap)
// ----------------------------------------------------
const DEFAULT_DAILY_LIMIT = 50;
const MAX_REQUESTS_PER_MINUTE = 10;
const GLOBAL_DAILY_LIMIT = 1000;

async function checkAndIncrementQuota(
  db: admin.firestore.Firestore,
  uid: string,
  isAdmin: boolean
): Promise<{ allowed: boolean; retryAfter?: number; errorMsg?: string; statusCode?: number }> {
  if (isAdmin) return { allowed: true };

  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const todayStr = new Date().toISOString().split("T")[0];
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
  const userRef = db.collection("usage_limits").doc(safeUid);
  const globalRef = db.collection("app_usage").doc(`global_${todayStr}`);

  try {
    return await db.runTransaction(async (tx) => {
      // Read all documents before writing so concurrent requests cannot race past the limits.
      const userSnap = await tx.get(userRef);
      const globalSnap = await tx.get(globalRef);
      const data = userSnap.exists ? userSnap.data() || {} : {};

      const dailyCount = data.lastDate === todayStr && typeof data.dailyCount === "number"
        ? data.dailyCount
        : 0;
      const minuteTimestamps: number[] = Array.isArray(data.minuteTimestamps)
        ? data.minuteTimestamps.filter((t: unknown): t is number => typeof t === "number" && Number.isFinite(t) && t > oneMinuteAgo)
        : [];

      if (minuteTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        const retryAfter = Math.max(
          Math.ceil((minuteTimestamps[0] + 60 * 1000 - now) / 1000),
          1
        );
        return {
          allowed: false,
          retryAfter,
          errorMsg: `הגעת למגבלת הקריאות לדקה (${MAX_REQUESTS_PER_MINUTE} קריאות). אנא המתן ${retryAfter} שניות ונסה שוב.`
        };
      }

      if (dailyCount >= DEFAULT_DAILY_LIMIT) {
        return {
          allowed: false,
          errorMsg: `הגעת למכסת הקריאות היומית שלך (${dailyCount}/${DEFAULT_DAILY_LIMIT} קריאות). המכסה תתאפס בחצות.`
        };
      }

      const globalCount = globalSnap.exists && typeof globalSnap.data()?.count === "number"
        ? globalSnap.data()!.count
        : 0;
      if (globalCount >= GLOBAL_DAILY_LIMIT) {
        return {
          allowed: false,
          errorMsg: "שירות ה-AI הגיע למכסה היומית הכללית שלו. הוא יחזור לעבוד מחר. אפשר להמשיך להשתמש בשאר חלקי האתר.",
          statusCode: 429
        };
      }

      minuteTimestamps.push(now);
      tx.set(userRef, {
        dailyCount: dailyCount + 1,
        dailyLimit: DEFAULT_DAILY_LIMIT,
        lastDate: todayStr,
        minuteTimestamps,
        lastRequestAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      tx.set(globalRef, {
        count: globalCount + 1,
        date: todayStr,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return { allowed: true };
    });
  } catch (dbError) {
    // Fail closed: a broken quota store must never silently disable the protection.
    console.error("Atomic Firestore quota check failed; rejecting AI request:", dbError);
    return {
      allowed: false,
      statusCode: 503,
      errorMsg: "לא ניתן כרגע לבדוק את מכסת השימוש בשירות ה-AI. אנא נסה שוב בעוד זמן קצר."
    };
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
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "שיטת בקשה לא נתמכת." }), {
        status: 405,
        headers: { "Content-Type": "application/json", "Allow": "POST" }
      });
    }

    const MAX_REQUEST_BODY_BYTES = 300_000;
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "הבקשה גדולה מדי." }), {
        status: 413,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Read in bounded chunks so a request without Content-Length cannot grow without limit.
    const reader = req.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: "גוף הבקשה חסר." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel();
        return new Response(JSON.stringify({ error: "הבקשה גדולה מדי." }), {
          status: 413,
          headers: { "Content-Type": "application/json" }
        });
      }
      chunks.push(value);
    }
    const bodyBytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bodyBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(new TextDecoder().decode(bodyBytes));
    } catch {
      return new Response(JSON.stringify({ error: "מבנה הבקשה אינו תקין." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { action, payload } = parsedBody || {};
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return new Response(JSON.stringify({ error: "מבנה הבקשה אינו תקין." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

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
    let limitCheck: { allowed: boolean; retryAfter?: number; errorMsg?: string; statusCode?: number };

    const adminUser = await isAdminUser(adminDb, verifiedUid);
    limitCheck = await checkAndIncrementQuota(adminDb, verifiedUid, adminUser);

    if (!limitCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: limitCheck.errorMsg || "Rate limit exceeded",
        rateLimited: true,
        retryAfter: limitCheck.retryAfter
      }), { 
        status: limitCheck.statusCode || 429,
        headers: { 
          "Content-Type": "application/json",
          ...(limitCheck.retryAfter ? { "Retry-After": String(limitCheck.retryAfter) } : {})
        }
      });
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

    // גוגל מבטלת את הפרמטרים האלה - מסירים אותם כאן בנקודה אחת
    const {
      temperature: _temperature,
      topP: _topP,
      topK: _topK,
      ...cleanConfig
    } = (payload.config || {}) as Record<string, any>;
    if (cleanConfig.thinkingConfig) {
      const { thinkingBudget: _thinkingBudget, ...cleanThinking } = cleanConfig.thinkingConfig;
      cleanConfig.thinkingConfig = cleanThinking;
    }

    const requestedOutputTokens =
      typeof cleanConfig.maxOutputTokens === "number" && Number.isFinite(cleanConfig.maxOutputTokens)
        ? Math.floor(cleanConfig.maxOutputTokens)
        : 4096;
    const boundedOutputTokens = Math.max(1, Math.min(requestedOutputTokens, MAX_OUTPUT_TOKENS));

    const requestConfig = {
      thinkingConfig: { thinkingLevel: "MEDIUM" },
      ...cleanConfig,
      maxOutputTokens: boundedOutputTokens
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
