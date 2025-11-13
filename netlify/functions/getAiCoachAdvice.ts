import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

// This is the standard handler for Netlify Functions in a Node.js environment.
const handler: Handler = async (event: HandlerEvent) => {
  // Ensure the request is a POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // Get the API key from environment variables
  // In Netlify's Node.js runtime, environment variables are on `process.env`
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "מפתח ה-API אינו מוגדר בשרת." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    // Parse the request body. In Netlify functions, the body is a string.
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Request body is missing" }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    const { scores, userInput } = JSON.parse(event.body);

    if (!scores || !userInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing scores or userInput in request" }),
        headers: { 'Content-Type': 'application/json' }
      };
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
    
    const generateWithRetry = async (retries = 3, delay = 500) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: userInput,
              config: {
                  systemInstruction: systemInstruction,
              }
          });
          return response;
        } catch (error: any) {
          const errorMessage = error.message || String(error);
          const isOverloaded = errorMessage.includes('overloaded') || errorMessage.includes('503');

          if (isOverloaded && i < retries - 1) {
            console.log(`Model overloaded. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
            await new Promise(res => setTimeout(res, delay));
            delay *= 2; // Exponential backoff
          } else {
            throw error; // Re-throw if it's not an overload error or if retries are exhausted
          }
        }
      }
      // This should be unreachable if the logic is correct, but satisfies TypeScript
      throw new Error("Failed to get response from AI after multiple retries.");
    };

    const response = await generateWithRetry();

    // Return a successful response
    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text }),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error: any) {
    console.error("שגיאה בפונקציית Netlify (Node.js):", error);
    let userFriendlyError = "אירעה שגיאה פנימית בשרת.";
    
    const errorMessage = error.message || String(error);

    if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
        userFriendlyError = "מצטער, נראה שיש עומס על שירות ה-AI כרגע. אנא נסה שוב בעוד מספר דקות.";
    } else if (errorMessage.includes('API key not valid') || errorMessage.includes('permission denied')) {
        userFriendlyError = "מפתח ה-API שסופק אינו תקין או שאין לו הרשאות מתאימות. אנא ודא שהמפתח נכון ופעיל בחשבון Google AI Studio שלך.";
    } else if (errorMessage.includes('billing')) {
        userFriendlyError = "אירעה בעיית חיוב. אנא ודא שהחיוב (Billing) מופעל עבור פרויקט ה-Google Cloud המשויך למפתח ה-API שלך.";
    } else if (errorMessage.includes('User location is not supported')) {
        userFriendlyError = "המיקום שממנו אתה מנסה לגשת אינו נתמך כרגע על ידי ה-API.";
    } else {
         userFriendlyError = `אירעה שגיאה לא צפויה בעת התקשורת עם שירות ה-AI. פרטי השגיאה: ${errorMessage}`;
    }
    
    // Return a server error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: userFriendlyError }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };