import { Scores, UserProfile } from '../types';

/**
 * Calls the Netlify function to get advice from the AI coach.
 * This is safer as the API key stays on the server.
 */
export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/getAiCoachAdvice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        scores, 
        userInput, 
        mode: 'individual' 
      }),
    });

    if (!response.ok) {
        let errorMsg = 'Failed to fetch from AI service';
        try {
            const errData = await response.json();
            errorMsg = errData.text || errorMsg;
        } catch (e) {
            // ignore parse error
        }
        throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.text || "לא הצלחתי לגבש תשובה כרגע. נסה שוב.";
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `מצטער, חלה שגיאה בחיבור לשרת ה-AI (${error.message}). אנא וודא שחיבור האינטרנט תקין ונסה שוב.`;
  }
};

/**
 * Calls the Netlify function for team dynamics analysis.
 */
export const getTeamAiAdvice = async (users: UserProfile[], challenge: string): Promise<string> => {
    try {
        const teamStats = { red: 0, yellow: 0, green: 0, blue: 0, total: 0 };
        users.forEach(u => {
            if (!u.scores) return;
            // Calculating standard color scores from the 4 primary axes
            const r = (u.scores.a || 0) + (u.scores.c || 0);
            const y = (u.scores.a || 0) + (u.scores.d || 0);
            const g = (u.scores.b || 0) + (u.scores.d || 0);
            const b = (u.scores.b || 0) + (u.scores.c || 0);
            
            const max = Math.max(r, y, g, b);
            
            // Assign to the most dominant color for statistical summary
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

        if (!response.ok) {
            let errorMsg = 'Failed to analyze team';
            try {
                const errData = await response.json();
                errorMsg = errData.text || errorMsg;
            } catch (e) {
                // ignore
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        return data.text || "לא ניתן היה לנתח את הצוות כרגע.";
    } catch (error: any) {
        console.error("Team AI Error:", error);
        return `שגיאה בחיבור לשרת הניתוח (${error.message}). אנא נסה שוב.`;
    }
}
