import { initFirebaseAdmin, getTrustedClientIp, rateLimitHit, getVerifiedToken, admin } from "../lib/serverCommon";

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
    if (await rateLimitHit(db, "redeem", ip, 40, 60 * 1000)) {
      return json({ ok: false, error: "יותר מדי ניסיונות. נסה שוב בעוד דקה." }, 429);
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

    if (!valid) return json({ ok: false, error: "קוד גישה שגוי או לא פעיל" }, 403);

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
