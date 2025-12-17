
import { GoogleGenAI } from "@google/genai";
import { Scores, UserProfile } from '../types';

// Client-side AI initialization
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Get advice from AI coach directly via Gemini SDK
 */
export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  try {
    const ai = getAiClient();
    
    const red = scores.a + scores.c;
    const yellow = scores.a + scores.d;
    const green = scores.b + scores.d;
    const blue = scores.b + scores.c;
    
    const sorted = [
        { name: 'אדום', val: red },
        { name: 'צהוב', val: yellow },
        { name: 'ירוק', val: green },
        { name: 'כחול', val: blue }
    ].sort((x, y) => y.val - x.val);

    const dominant = sorted[0].name;
    const secondary = sorted[1].name;

    const systemInstruction = `אתה מאמן תקשורת מומחה המבוסס על מודל הצבעים של יונג.
    פרופיל המשתמש הנוכחי: צבע דומיננטי: ${dominant}, צבע משני: ${secondary}.
    המשימה: ספק ייעוץ תובנתי ופרקטי לשאלת המשתמש בעברית.
    הנחיות:
    - התחל ישירות בתשובה, ללא ברכות שלום.
    - השתמש בשפה מקצועית ומעודדת.
    - התייחס לדינמיקה בין הצבעים של המשתמש לסיטואציה שתיאר.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: userInput }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return result.text || "לא הצלחתי לגבש תשובה כרגע. נסה שוב.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "חלה שגיאה בחיבור למנוע ה-AI. אנא וודא שמפתח ה-API מוגדר כראוי.";
  }
};

/**
 * Get team analysis via Gemini SDK
 */
export const getTeamAiAdvice = async (users: UserProfile[], challenge: string): Promise<string> => {
    try {
        const ai = getAiClient();
        
        const teamStats = { red: 0, yellow: 0, green: 0, blue: 0, total: 0 };
        users.forEach(u => {
            if (!u.scores) return;
            const r = u.scores.a + u.scores.c;
            const y = u.scores.a + u.scores.d;
            const g = u.scores.b + u.scores.d;
            const b = u.scores.b + u.scores.c;
            const max = Math.max(r, y, g, b);
            if (max === r) teamStats.red++;
            else if (max === y) teamStats.yellow++;
            else if (max === g) teamStats.green++;
            else if (max === b) teamStats.blue++;
            teamStats.total++;
        });

        const systemInstruction = `אתה יועץ ארגוני בכיר המנתח צוות של ${teamStats.total} חברים.
        הרכב הצוות: ${teamStats.red} אדומים, ${teamStats.yellow} צהובים, ${teamStats.green} ירוקים, ${teamStats.blue} כחולים.
        נתח את האתגר: "${challenge}" וספק פתרונות אסטרטגיים בעברית המבוססים על הרכב הצבעים הזה.`;

        const result = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: challenge }] }],
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.8,
            }
        });

        return result.text || "לא ניתן היה לנתח את הצוות כרגע.";
    } catch (error) {
        console.error("Team AI Error:", error);
        return "שגיאה בניתוח הצוות.";
    }
}
