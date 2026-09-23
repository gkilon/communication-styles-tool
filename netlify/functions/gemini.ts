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
// 2. In-Memory Fallback Rate Limiter (if no Service Account)
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
// 3. Firestore Quota Check (Minute + Daily limits)
// ----------------------------------------------------
const DEFAULT_DAILY_LIMIT = 30; // מכסת ברירת מחדל יומית למשתמש רגיל
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

    const dailyLimit = typeof data.dailyLimit === 'number' ? data.dailyLimit : DEFAULT_DAILY_LIMIT;
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
    console.error("Firestore quota check error, falling back to permissive allow:", dbError);
    return { allowed: true };
  }
}

function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-nf-client-connection-ip") || req.headers.get("client-ip") || "unknown_client";
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
export default async (req: Request) => {
  try {
    const { action, payload } = await req.json();
    const clientIp = getClientIp(req);
    const userId = payload?.userId;

    // Quota Enforcement: Firebase Admin or In-Memory Fallback
    const adminDb = initFirebaseAdmin();
    let limitCheck: { allowed: boolean; retryAfter?: number; errorMsg?: string };

    if (adminDb) {
      const identifier = userId || clientIp;
      limitCheck = await checkAndIncrementQuota(adminDb, identifier, !!userId);
    } else {
      limitCheck = checkFallbackLimit(userId || clientIp);
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

    // API Key Validation
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("Gemini API Key missing");
      return new Response(JSON.stringify({ error: "מפתח ה-API של גוגל אינו מוגדר בסביבה" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    // עודכן למודל יציב ומהיר
    const modelName = payload.model || "gemini-3.6-flash";

    const requestConfig = {
      thinkingConfig: { thinkingLevel: "LOW" },
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

        let userMsg = streamError.message || "שגיאה בתקשורת עם ה-AI";
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

    let userMsg = error.message || "חלה שגיאה בביצוע הבקשה";
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