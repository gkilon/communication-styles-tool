
import { Scores } from '../types';

/**
 * Calls the secure Netlify serverless function to get advice from the AI coach.
 * This function acts as a proxy to the Gemini API, ensuring the API key is not exposed on the client-side.
 * @param scores - The user's questionnaire scores.
 * @param userInput - The user's question for the AI coach.
 * @returns A promise that resolves to the AI's response as a string.
 */
export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  try {
    // The direct endpoint for our Netlify function.
    const response = await fetch('/.netlify/functions/getAiCoachAdvice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Send the necessary data to the serverless function.
      body: JSON.stringify({ scores, userInput }),
    });

    if (!response.ok) {
        let detailedError = `Error ${response.status}`;
        try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                detailedError = errorData.error || errorData.text || detailedError;
            } else {
                // If not JSON (likely HTML error page from Netlify/timeout), read text
                const textData = await response.text();
                console.error("Non-JSON error response:", textData.substring(0, 200)); // Log first 200 chars
                if (response.status === 502 || response.status === 504) {
                   return "תקלת תקשורת: השרת לא הגיב בזמן (Timeout). נסה לשאול שאלה קצרה יותר או לנסות שוב.";
                }
            }
        } catch (e) {
            // Ignore parsing errors
        }
        
        console.error(`Server Error (${response.status}):`, detailedError);
        
        if (response.status === 404) {
            return "שגיאה: לא ניתן למצוא את שירות ה-AI (404). ייתכן שהאתר לא נפרס במלואו.";
        }
        return `תקלת שרת: ${detailedError}`;
    }
    
    // If response is OK, it should be valid JSON.
    try {
        const data = await response.json();
        // Validate that we actually got text back
        if (data && typeof data.text === 'string') {
            return data.text;
        } else {
            console.error("Invalid response format from server:", data);
            return "מצטער, התקבלה תשובה לא תקינה מהשרת.";
        }
    } catch (e) {
        console.error("Failed to parse JSON response (likely HTML received):", e);
        return "תקלת תקשורת: התקבלה תשובה לא ברורה מהשרת. ייתכן שהיה ניתוק רגעי.";
    }

  } catch (error) {
    console.error("Network Error calling AI service:", error);
    return "מצטער, ישנה בעיית חיבור לאינטרנט או שהשרת אינו זמין כרגע.";
  }
};
