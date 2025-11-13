// getAiCoachAdvice.js
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "מפתח ה-API אינו מוגדר בשרת." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    const { scores, userInput } = JSON.parse(event.body);

    if (!scores || !userInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing scores or userInput in request" }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // נשתמש ב-GoogleGenAI – נדריך אותך איך להתקין אותו בעוד רגע
    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const maxScore = 15 * 5;

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

    const prompt = systemInstruction + "\n\nשאלת המשתמש: " + userInput;
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt
});
    let answer = response.text;
if (!answer || answer.trim() === "") {
  answer = `היי! פרופיל התקשורת שלך מראה איזון מעניין בין כל ארבעת הצבעים. כדי לתת לך המלצה מדויקת, ספר לי בבקשה מה המצב איתו אתה רוצה עזרה (לדוגמה: "איך לנהל צוות?", "איך להציג רעיון למנהל שלי?")`;
}
let answer = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
if (!answer.trim()) {
  answer = `היי! פרופיל התקשורת שלך מראה איזון מעניין בין כל ארבעת הצבעים. כדי לתת לך המלצה מדויקת, ספר לי בבקשה מה המצב איתו אתה רוצה עזרה (לדוגמה: "איך לנהל צוות?", "איך להציג רעיון למנהל שלי?")`;
}
if (!answer || answer.trim() === "") {
  answer = `היי! פרופיל התקשורת שלך מראה איזון מעניין בין כל ארבעת הצבעים. כדי לתת לך המלצה מדויקת, ספר לי בבקשה מה המצב איתו אתה רוצה עזרה (לדוגמה: "איך לנהל צוות?", "איך להציג רעיון למנהל שלי?")`;
}
return {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: answer })
};
  } catch (err) {
    console.error("שגיאה בפונקציית Netlify:", err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "אירעה שגיאה פנימית בשרת." })
    };
  }
};