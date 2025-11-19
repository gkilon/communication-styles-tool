
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
        if (response.status === 404) {
            const detailedError = "נקודת הקצה של השרת לא נמצאה (שגיאת 404). ייתכן שהפונקציה לא הופעלה כראוי.";
            console.error(`Error from Netlify function (${response.status}):`, detailedError);
            return `מצטער, חוויתי תקלה טכנית. השרת החזיר את השגיאה הבאה: "${detailedError}"`;
        }
        
        let detailedError;
        try {
            // First, try to parse the response as JSON, as the server should return a JSON error
            const errorData = await response.json();
            detailedError = errorData.error || `קוד סטטוס ${response.status}`;
        } catch (e) {
            // If JSON parsing fails, it means the server function crashed and returned something else (like HTML or plain text)
            console.error("Could not parse JSON error response. Status:", response.status);
            if (response.status === 502 || response.status === 503 || response.status === 504) {
                detailedError = `השרת אינו זמין או לא הגיב בזמן (שגיאת ${response.status}). עומס גבוה.`;
            } else {
                detailedError = "שגיאת שרת פנימית (Format Error).";
            }
        }
        console.error(`Error from Netlify function (${response.status}):`, detailedError);
        return `מצטער, חוויתי תקלה טכנית: ${detailedError}`;
    }
    
    // If response is OK, it should be valid JSON.
    const data = await response.json();
    
    // Validate that we actually got text back
    if (data && typeof data.text === 'string') {
        return data.text;
    } else {
        console.error("Invalid response format from server:", data);
        return "מצטער, התקבלה תשובה בפורמט לא תקין מהשרת.";
    }

  } catch (error) {
    console.error("Error calling the Netlify function endpoint:", error);
    return "מצטער, חוויתי תקלת רשת בתקשורת עם השרת. אנא בדוק את חיבור האינטרנט שלך ונסה שוב.";
  }
};
