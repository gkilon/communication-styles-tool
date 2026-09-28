import * as admin from "firebase-admin";

// ----------------------------------------------------
// Shared server-side helpers (used by validateCode, redeemCode, ...)
// ----------------------------------------------------

export function initFirebaseAdmin(): admin.firestore.Firestore | null {
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
      serviceAccount = JSON.parse(Buffer.from(serviceAccountRaw, "base64").toString("utf-8"));
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return admin.firestore();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

// The caller's real IP, as reported by Netlify's own edge — NOT the
// X-Forwarded-For header, which a caller can set to anything (that made the
// old rate limit trivially bypassable by sending a different fake value on
// every request).
export function getTrustedClientIp(req: Request, context?: any): string {
  return context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown_client";
}

// Fixed-window rate limit stored in Firestore (so it holds across the many
// server instances Netlify may spin up, unlike an in-memory counter).
// Returns true if this caller has now exceeded `max` hits within `windowMs`.
export async function rateLimitHit(
  db: admin.firestore.Firestore,
  bucket: string,
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const safeId = `${bucket}_${key}`.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 200);
  const ref = db.collection("rate_limits").doc(safeId);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const d: any = snap.exists ? snap.data() : null;
      if (!d || now - (d.windowStart || 0) > windowMs) {
        tx.set(ref, { windowStart: now, count: 1 });
        return false;
      }
      const count = (d.count || 0) + 1;
      tx.update(ref, { count });
      return count > max;
    });
  } catch (e) {
    console.warn("Rate limiter error (failing open):", e);
    return false;
  }
}

// Verifies the Firebase ID token from the Authorization header.
// Returns the decoded token (uid + custom claims) or null.
export async function getVerifiedToken(req: Request): Promise<admin.auth.DecodedIdToken | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken || admin.apps.length === 0) return null;
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    console.warn("ID token verification failed:", e);
    return null;
  }
}

export { admin };
