import { initFirebaseAdmin, getTrustedClientIp, rateLimitHit, rateLimitPeek, getVerifiedToken, admin } from "../lib/serverCommon";

// Same idea as validate-code: only WRONG codes use up the budget — per address (shared with
// validate-code, so the two endpoints can't be used to double it) and per account.
const FAIL_MAX = 30;
const FAIL_MAX_PER_ACCOUNT = 15;
const FAIL_WINDOW_MS = 10 * 60 * 1000;

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Called by the signed-in app with the access code the person entered.
// If the code is real and active, the server stamps the Firebase account
// with a "codeOk" flag. The AI endpoint only serves accounts that carry it,
// so simply registering a free account is no longer enough to use the AI.
export default async (req: Request, context?: any) => {
  try {
    const db = initFirebaseAdmin();
    if (!db) return json({ ok: false, error: "שגיאת שרת" }, 500);

    const decoded = await getVerifiedToken(req);
    if (!decoded) return json({ ok: false, error: "נדרשת התחברות" }, 401);

    const ip = getTrustedClientIp(req, context);
    if (await rateLimitHit(db, "redeem", ip, 120, 60 * 1000)) {
      return json({ ok: false, error: "יותר מדי ניסיונות. נסה שוב בעוד דקה." }, 429);
    }
    if (
      (await rateLimitPeek(db, "codefail", ip, FAIL_MAX, FAIL_WINDOW_MS)) ||
      (await rateLimitPeek(db, "codefail_uid", decoded.uid, FAIL_MAX_PER_ACCOUNT, FAIL_WINDOW_MS))
    ) {
      return json({ ok: false, error: "יותר מדי ניסיונות שגויים. נסה שוב בעוד כמה דקות." }, 429);
    }

    const { code: rawCode } = await req.json();
    const code = (typeof rawCode === "string" ? rawCode : "").trim();
    if (!code) return json({ ok: false, error: "קוד חסר" }, 400);

    let valid = false;

    // Legacy global password
    const accessSnap = await db.collection("settings").doc("access").get();
    const qPass = (accessSnap.data() as any)?.questionnairePassword;
    if (qPass && code.toLowerCase() === String(qPass).toLowerCase()) valid = true;

    // access_codes collection
    if (!valid) {
      let snap = await db.collection("access_codes").doc(code.toUpperCase()).get();
      if (!snap.exists) snap = await db.collection("access_codes").doc(code).get();
      if (snap.exists && (snap.data() as any).active !== false) valid = true;
    }

    if (!valid) {
      await rateLimitHit(db, "codefail", ip, FAIL_MAX, FAIL_WINDOW_MS);
      await rateLimitHit(db, "codefail_uid", decoded.uid, FAIL_MAX_PER_ACCOUNT, FAIL_WINDOW_MS);
      return json({ ok: false, error: "קוד גישה שגוי או לא פעיל" }, 403);
    }

    const user = await admin.auth().getUser(decoded.uid);
    await admin.auth().setCustomUserClaims(decoded.uid, {
      ...(user.customClaims || {}),
      codeOk: true
    });

    return json({ ok: true });
  } catch (error) {
    console.error("redeemCode error:", error);
    return json({ ok: false, error: "שגיאת שרת" }, 500);
  }
};

export const config = {
  path: "/api/redeem-code"
};
