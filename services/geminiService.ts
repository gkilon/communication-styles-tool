
import { Scores, UserProfile } from '../types';

/**
 * Calls the secure Netlify serverless function to get advice from the AI coach.
 * This function acts as a proxy to the Gemini API, ensuring the API key is not exposed on the client-side.
 * @param scores - The user's questionnaire scores.
 * @param userInput - The user's question for the AI coach.
 * @returns A promise that resolves to the AI's response as a string.
 */
export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/getAiCoachAdvice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'individual', scores, userInput }),
    });

    return handleResponse(response);
  } catch (error) {
    console.error("Network Error calling AI service:", error);
    return "מצטער, ישנה בעיית חיבור לאינטרנט או שהשרת אינו זמין כרגע.";
  }
};

/**
 * Calls the AI to analyze team dynamics based on the aggregate composition of the team.
 */
export const getTeamAiAdvice = async (users: UserProfile[], challenge: string): Promise<string> => {
    try {
        // Calculate Team Stats
        const teamStats = {
            red: 0, yellow: 0, green: 0, blue: 0, total: 0
        };

        users.forEach(u => {
            if (!u.scores) return;
            const { a, b, c, d } = u.scores;
            // Simple logic to determine dominant color for the AI context
            const red = a + c;
            const yellow = a + d;
            const green = b + d;
            const blue = b + c;
            
            const max = Math.max(red, yellow, green, blue);
            if (max === red) teamStats.red++;
            else if (max === yellow) teamStats.yellow++;
            else if (max === green) teamStats.green++;
            else if (max === blue) teamStats.blue++;
            
            teamStats.total++;
        });

        const response = await fetch('/.netlify/functions/getAiCoachAdvice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                mode: 'team', 
                teamStats, 
                userInput: challenge 
            }),
        });

        return handleResponse(response);

    } catch (error) {
        console.error("Network Error calling Team AI:", error);
        return "שגיאה בניתוח הצוות.";
    }
}

// Helper to handle the fetch response parsing
async function handleResponse(response: Response): Promise<string> {
    if (!response.ok) {
        let detailedError = `Error ${response.status}`;
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                detailedError = errorData.error || errorData.text || detailedError;
            } else {
                const textData = await response.text();
                console.error("Non-JSON error response:", textData.substring(0, 200));
                if (response.status === 502 || response.status === 504) {
                   return "תקלת תקשורת: השרת לא הגיב בזמן (Timeout). נסה שנית.";
                }
            }
        } catch (e) { /* Ignore */ }
        
        console.error(`Server Error (${response.status}):`, detailedError);
        return `תקלת שרת: ${detailedError}`;
    }
    
    try {
        const data = await response.json();
        if (data && typeof data.text === 'string') {
            return data.text;
        } else {
            return "מצטער, התקבלה תשובה לא תקינה מהשרת.";
        }
    } catch (e) {
        return "תקלת תקשורת: התקבלה תשובה לא ברורה מהשרת.";
    }
}
