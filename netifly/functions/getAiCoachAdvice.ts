// Deno-compatible imports from CDN
import { GoogleGenAI } from "https://esm.sh/@google/genai@^1.29.0";
// Import the Context type for Netlify Edge Functions on Deno
import type { Context } from "https://deno.land/x/netlify_functions@v2.6.2/mod.ts";

// Deno provides the Deno global object. A declaration helps with type checking in some editors.
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

// Netlify Edge Function handler for Deno runtime
export default async (req: Request, context: Context) => {
  // Ensure the request is a POST request
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get the API key from environment variables
  const apiKey = Deno.env.get("API_KEY");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "מפתח ה-API אינו מוגדר בשרת." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse the request body as JSON
    const { scores, userInput } = await req.json();

    if (!scores || !userInput) {
      return new Response(JSON.stringify({ error: "Missing scores or userInput in request" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userInput,
        config: {
            systemInstruction: systemInstruction,
        }
    });

    // Return a successful response with the AI's text
    return new Response(JSON.stringify({ text: response.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("שגיאה בפונקציית Netlify (Deno):", error);
    let userFriendlyError = "אירעה שגיאה פנימית בשרת.";
    
    if (error instanceof Error) {
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
    
    // Return a server error response
    return new Response(JSON.stringify({ error: userFriendlyError }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
