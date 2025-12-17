
import { Scores, UserProfile } from '../types';

/**
 * Safely parse JSON from a response.
 */
const safeParseJson = async (response: Response) => {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        return { text: `שגיאה בפענוח תשובת השרת: ${text.substring(0, 100)}` };
    }
};

/**
 * Calls the Netlify function to get advice from the AI coach.
 */
export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/getAiCoachAdvice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores, userInput, mode: 'individual' }),
    });

    const data = await safeParseJson(response);
    if (!response.ok) throw new Error(data.text || "שגיאה בחיבור לשרת ה-AI");
    return data.text || "לא התקבלה תשובה.";
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `שגיאה: ${error.message}`;
  }
};

/**
 * Calls the Netlify function for team dynamics analysis.
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

        const response = await fetch('/.netlify/functions/getAiCoachAdvice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userInput: challenge, 
                mode: 'team',
                teamStats
            }),
        });

        const data = await safeParseJson(response);
        if (!response.ok) throw new Error(data.text || "ניתוח הצוות נכשל בשרת.");
        
        return data.text || "לא התקבל ניתוח.";
    } catch (error: any) {
        console.error("Team AI Error:", error);
        return `שגיאה בניתוח הצוות: ${error.message}`;
    }
}
