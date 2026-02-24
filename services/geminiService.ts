import { Scores, UserProfile } from '../types';
import { GoogleGenAI } from "@google/genai";

/**
 * Helper to get the Gemini API key from environment variables.
 */
const getApiKey = () => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    // import.meta might not be defined or env might be missing
  }
  
  return undefined;
};

/**
 * Calls the Gemini API directly from the frontend to get advice from the AI coach.
 */
export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("מפתח API חסר. אנא וודא שהגדרת את VITE_GEMINI_API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const sA = Number(scores?.a || 0);
    const sB = Number(scores?.b || 0);
    const sC = Number(scores?.c || 0);
    const sD = Number(scores?.d || 0);
    
    const r = sA + sC;
    const y = sA + sD;
    const g = sB + sD;
    const b = sB + sC;
    const colors = [{n:'אדום',v:r},{n:'צהוב',v:y},{n:'ירוק',v:g},{n:'כחול',v:b}].sort((m,n)=>n.v-m.v);

    const systemInstruction = `אתה מאמן תקשורת אישי בכיר מבית Kilon Consulting. המשתמש בעל פרופיל תקשורת שבו הצבע הדומיננטי הוא ${colors[0].n} והצבע המשני הוא ${colors[1].n}.
    ענה על שאלות המשתמש בהתבסס על הפרופיל שלו בצורה מפורטת, אמפתית ופרקטית. השתמש בפורמט Markdown.
    חשוב: וודא שהתשובה שלך מלאה ומקיפה. אל תקטע את דבריך באמצע.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: userInput,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "לא התקבלה תשובה.";
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `שגיאה: ${error.message}`;
  }
};

/**
 * Calls the Gemini API directly for team dynamics analysis.
 */
export const getTeamAiAdvice = async (users: UserProfile[], challenge: string): Promise<string> => {
    try {
        if (!challenge.trim()) return "נא להזין אתגר לניתוח.";
        
        const validUsers = users.filter(u => u.scores);
        if (validUsers.length === 0) return "אין מספיק נתוני משתמשים עם תוצאות לביצוע ניתוח צוותי.";

        const teamStats = { red: 0, yellow: 0, green: 0, blue: 0, total: 0 };
        validUsers.forEach(u => {
            const s = u.scores!;
            const r = (s.a || 0) + (s.c || 0);
            const y = (s.a || 0) + (s.d || 0);
            const g = (s.b || 0) + (s.d || 0);
            const b = (s.b || 0) + (s.c || 0);
            
            const max = Math.max(r, y, g, b);
            if (max === r) teamStats.red++;
            else if (max === y) teamStats.yellow++;
            else if (max === g) teamStats.green++;
            else if (max === b) teamStats.blue++;
            teamStats.total++;
        });

        const apiKey = getApiKey();
        if (!apiKey) {
          throw new Error("מפתח API חסר. אנא וודא שהגדרת את VITE_GEMINI_API_KEY.");
        }

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `אתה יועץ ארגוני בכיר מבית Kilon Consulting. נתח את אתגר הצוות הבא על בסיס מודל ארבעת הצבעים.
        נתוני הצוות (סה"כ ${teamStats.total} משתתפים):
        - אדום: ${teamStats.red}
        - צהוב: ${teamStats.yellow}
        - ירוק: ${teamStats.green}
        - כחול: ${teamStats.blue}

        האתגר שהוצג: "${challenge}"

        מבנה התשובה הנדרש (בעברית, פורמט Markdown):
        1. ניתוח דינמיקה: מדוע הרכב הצבעים הנוכחי חווה את האתגר הזה?
        2. נקודות עיוורון: מה הצוות מפספס?
        3. 3 המלצות פרקטיות ומידיות לשיפור המצב.
        חשוב: ענה בצורה מפורטת ומלאה. אל תעצור באמצע.`;

        const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: challenge,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            },
        });

        return response.text || "לא התקבל ניתוח.";
    } catch (error: any) {
        console.error("Team AI Error:", error);
        return `שגיאה בניתוח הצוות: ${error.message}`;
    }
}