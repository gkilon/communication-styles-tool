import { GoogleGenAI } from "https://esm.sh/@google/genai@1.29.0";
import type { Handler } from "https://esm.sh/@netlify/functions@5.1.0";


// This is the serverless function that will securely call the Gemini API
const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.API_KEY) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "מפתח ה-API אינו מוגדר בשרת." }) 
    };
  }

  try {
    const { scores, userInput } = JSON.parse(event.body || '{}');

    if (!scores || !userInput) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing scores or userInput in request" }) };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userInput,
        config: {
            systemInstruction: systemInstruction, 
        }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text }),
    };

  } catch (error) {
    console.error("שגיאה בפונקציית Netlify:", error);
    let userFriendlyError = "אירעה שגיאה פנימית בשרת.";

    if (error instanceof Error && error.message) {
        if (error.message.includes('API key not valid') || error.message.includes('permission denied')) {
            userFriendlyError = "מפתח ה-API שסופק אינו תקין או שאין לו הרשאות מתאימות. אנא ודא שהמפתח נכון ופעיל בחשבון Google AI Studio שלך.";
        } else if (error.message.includes('billing')) {
            userFriendlyError = "אירעה בעיית חיוב. אנא ודא שהחיוב (Billing) מופעל עבור פרויקט ה-Google Cloud המשויך למפתח ה-API שלך.";
        } else if (error.message.includes('User location is not supported')) {
            userFriendlyError = "המיקום שממנו אתה מנסה לגשת אינו נתמך כרגע על ידי ה-API.";
        } else {
             userFriendlyError = `אירעה שגיאה לא צפויה בעת התקשורת עם שירות ה-AI. פרטי השגיאה: ${error.message}`;
        }
    } else {
        userFriendlyError = `אירעה שגיאה לא ידועה בשרת. פרטי השגיאה: ${String(error)}`;
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: userFriendlyError }),
    };
  }
};

export { handler };