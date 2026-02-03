
import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const handler: Handler = async (event: HandlerEvent) => {
  const headers = { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ text: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ text: "שגיאת שרת: מפתח API חסר בהגדרות Netlify." })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { scores, userInput, mode, teamStats } = body;

    if (!userInput) {
      return { statusCode: 400, headers, body: JSON.stringify({ text: "נא להזין טקסט." }) };
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    let systemInstruction = "";
    
    if (mode === 'team') {
        const { red, yellow, green, blue, total } = teamStats || { red:0, yellow:0, green:0, blue:0, total:0 };
        
        systemInstruction = `אתה יועץ ארגוני בכיר מבית Kilon Consulting. נתח את אתגר הצוות הבא על בסיס מודל ארבעת הצבעים.
        נתוני הצוות (סה"כ ${total} משתתפים):
        - אדום: ${red}
        - צהוב: ${yellow}
        - ירוק: ${green}
        - כחול: ${blue}

        האתגר שהוצג: "${userInput}"

        מבנה התשובה הנדרש (בעברית, פורמט Markdown):
        1. ניתוח דינמיקה: מדוע הרכב הצבעים הנוכחי חווה את האתגר הזה?
        2. נקודות עיוורון: מה הצוות מפספס?
        3. 3 המלצות פרקטיות ומידיות לשיפור המצב.`;
    } else {
        const sA = Number(scores?.a || 0);
        const sB = Number(scores?.b || 0);
        const sC = Number(scores?.c || 0);
        const sD = Number(scores?.d || 0);
        
        const r = sA + sC;
        const y = sA + sD;
        const g = sB + sD;
        const b = sB + sC;
        const colors = [{n:'אדום',v:r},{n:'צהוב',v:y},{n:'ירוק',v:g},{n:'כחול',v:b}].sort((m,n)=>n.v-m.v);

        systemInstruction = `אתה מאמן תקשורת אישי בכיר מבית Kilon Consulting. המשתמש בעל פרופיל תקשורת שבו הצבע הדומיננטי הוא ${colors[0].n} והצבע המשני הוא ${colors[1].n}.
        ענה על שאלות המשתמש בהתבסס על הפרופיל שלו בצורה מפורטת, אמפתית ופרקטית. השתמש בפורמט Markdown.`;
    }

    // Direct call with explicit content structure for best compatibility
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: [{ role: 'user', parts: [{ text: userInput }] }],
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 1000
        }
    });

    if (!response || !response.text) {
        throw new Error("AI returned empty response");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: response.text }),
    };

  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    
    // Check for Referrer Blocked Error
    if (error.message?.includes('PERMISSION_DENIED') && error.message?.includes('referer')) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ 
              text: `מפתח ה-API שלך חסום לשימוש בשרת. עליך להיכנס ל-Google Cloud Console, ללכת ל-Credentials, ולבטל את ה-HTTP Referrer restriction (להעביר ל-None). המפתח נשאר בטוח כי הוא מופעל מתוך Netlify Function.` 
            }),
        };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        text: `חלה שגיאה בעיבוד ה-AI. אנא וודא שמפתח ה-API תקין ומוגדר ללא מגבלות דומיין ב-Google Cloud Console. שגיאה: ${error.message || 'שגיאה כללית'}` 
      }),
    };
  }
};

export { handler };
