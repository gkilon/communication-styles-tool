
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

  // Ensure API_KEY is present as per @google/genai guidelines.
  if (!process.env.API_KEY) {
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

    // Initialize GoogleGenAI with named parameter apiKey.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        3. 3 המלצות פרקטיות ומידיות לשיפור המצב.
        חשוב: ענה בצורה מפורטת ומלאה. אל תעצור באמצע.`;
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
        ענה על שאלות המשתמש בהתבסס על הפרופיל שלו בצורה מפורטת, אמפתית ופרקטית. השתמש בפורמט Markdown.
        חשוב: וודא שהתשובה שלך מלאה ומקיפה. אל תקטע את דבריך באמצע.`;
    }

    // Use gemini-3-pro-preview for complex reasoning tasks as per guidelines.
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview", 
        contents: userInput,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            // Include thinkingBudget for reasoning models; removed fixed maxOutputTokens to prevent response blocking.
            thinkingConfig: { thinkingBudget: 4000 }
        }
    });

    // Access the response text directly as a property on the response object.
    const responseText = response.text;
    if (!responseText) {
        throw new Error("AI returned empty response");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: responseText }),
    };

  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    
    if (error.message?.includes('PERMISSION_DENIED') && error.message?.includes('referer')) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ 
              text: `שגיאת הרשאה: מפתח ה-API חסום לשימוש בשרת. עליך לבטל את ה-HTTP Referrer restriction ב-Google Cloud Console.` 
            }),
        };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        text: `חלה שגיאה בעיבוד ה-AI. פרטי שגיאה: ${error.message || 'שגיאה כללית'}` 
      }),
    };
  }
};

export { handler };
