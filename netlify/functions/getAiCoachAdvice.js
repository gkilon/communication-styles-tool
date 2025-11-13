// netlify/functions/getAiCoachAdvice.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    const { scores, userInput } = JSON.parse(event.body);

    if (!scores || !userInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing scores or userInput" }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const maxScore = 15 * 5;

    // === אותו המלל החשוב – רק ב-JS פשוט ===
    const systemInstruction = `
אתה מאמן אישי ויועץ ארגוני מומחה, המתמחה בסגנונות תקשורת על פי מודל ארבעת הצבעים.
המשתמש שאתה מדבר איתו סיים שאלון, וזהו תיאור פרופיל התקשורת המלא שלו:
- נטייה למוחצנות (סגנונות אדום/צהוב): ציון ${scores.a} מתוך ${maxScore}.
- נטייה למופנמות (סגנונות כחול/ירוק): ציון ${scores.b} מתוך ${maxScore}.
- נטייה למשימתיות (סגנונות אדום/כחול): ציון ${scores.c} מתוך ${maxScore}.
- נטייה לאנושיות (סגנונות צהוב/ירוק): ציון ${scores.d} מתוך ${maxScore}.

אל תזכיר את הציונים המספריים בתשובותיך. השתמש במידע זה רק כדי להבין את הפרופיל שלו לעומק.
כשאתה עונה על שאלות המשתמש, עליך לספק תשובות מקצועיות, מעשיות ומעצימות בעברית, בשפה קולחת ופשוטה.
בסס את תשובותיך על **השילוב והאיזון** בין כל ארבעת הצבעים בפרופיל שלו, ולא רק על הסגנון הדומיננטי.
התשובות צריכות להיות מעוצבות ב-Markdown לקריאות נוחה.
היה חיובי, תומך וממוקד בפתרונות.
אל תזכיר שאתה מודל שפה או AI. דבר כמאמן מומחה.
    `;

    // === ניסיון קצר ל-Gemini – אם נכשל – נחזיר דמה ===
    try {
      const { GoogleGenAI } = require("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = systemInstruction + "\n\nשאלת המשתמש: " + userInput;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      let answer = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!answer.trim()) throw new Error("empty");
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: answer })
      };
    } catch (geminiErr) {
      // אם Gemini כשל – נחזיר את הדמה עם אותו התוכן
      // אם המשתמש לא כתב כלום או רק מילה-שתיים – נחזיר גנרי, אחרת – נחזיר תשובה מותאמת
const isShort = !userInput || userInput.trim().split(/\s+/).length <= 2;
const fallback = isShort
  ? `היי! פרופיל התקשורת שלך מראה איזון מעניין בין כל ארבעת הצבעים. כדי לתת לך המלצה מדויקת, ספר לי בבקשה מה המצב איתו אתה רוצה עזרה (לדוגמה: "איך לנהל צוות?", "איך להציג רעיון למנהל שלי?")`
  : `היי! על בסיס הציונים שלך (אדום: ${scores.a}, כחול: ${scores.b}, ירוק: ${scores.c}, צהוב: ${scores.d}) – הנה המלצה מותאמת: נראה שאתה משלב בין יצירתיות ומיקוד במשימות. כשאתה פונה לאנשים, כדאי לך להתחיל בקשר אישי (צהוב), לספק נתונים ברורים (כחול) ולבסוף לשתף בחזון (אדום). בהצלחה!`;
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fallback })
      };
    }
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "אירעה שגיאה פנימית." })
    };
  }
};