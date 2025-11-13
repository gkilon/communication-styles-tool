import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: userInput,
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            // Return a successful response
            return {
              statusCode: 200,
              body: JSON.stringify({ text: response.text }),
              headers: { 'Content-Type': 'application/json' },
            };
        } catch (error: any) {
            console.error(`Attempt ${attempt} to call Gemini API failed:`, error.message);
            const isRetryable = error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'));

            if (isRetryable && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 500; // 1s, 2s
                console.log(`Model is overloaded. Retrying in ${delay}ms...`);
                await sleep(delay);
            } else {
                throw error; // Throw to be caught by the outer catch block
            }
        }
    }
     // This should ideally not be reached, but as a safe fallback
    throw new Error('All retry attempts failed.');

  } catch (error: any) {
    console.error("שגיאה בפונקציית Netlify (Node.js):", error);
    let userFriendlyError = "אירעה שגיאה פנימית בשרת.";
    
    if (error && error.message) {
        if (error.message.includes('API key not valid') || error.message.includes('permission denied')) {
            userFriendlyError = "מפתח ה-API שסופק אינו תקין או שאין לו הרשאות מתאימות.";
        } else if (error.message.includes('billing')) {
            userFriendlyError = "אירעה בעיית חיוב בפרויקט Google Cloud המשויך למפתח.";
        } else if (error.message.includes('User location is not supported')) {
            userFriendlyError = "המיקום שממנו אתה מנסה לגשת אינו נתמך כרגע על ידי ה-API.";
        } else if (error.message.includes('503') || error.message.toLowerCase().includes('overloaded')) {
             userFriendlyError = "מצטער, נראה שיש עומס על שירות ה-AI כרגע. אנא נסה שוב בעוד מספר דקות.";
        } else {
             userFriendlyError = `אירעה שגיאה לא צפויה בעת התקשורת עם שירות ה-AI. אנא נסה שוב מאוחר יותר.`;
        }
    } else {
        userFriendlyError = `אירעה שגיאה לא ידועה בשרת.`;
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