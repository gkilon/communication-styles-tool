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
    // The endpoint for our Netlify function, using the clean /api proxy.
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
            return detailedError;
        }
        
        try {
            // The server should return a JSON object with a user-friendly 'error' field.
            const errorData = await response.json();
            const detailedError = errorData.error || `אירעה שגיאה לא צפויה מהשרת (קוד ${response.status}).`;
            console.error(`Error from Netlify function (${response.status}):`, detailedError);
            return detailedError;
        } catch (e) {
            // If JSON parsing fails, it's an unexpected server error.
            const detailedError = "השרת החזיר תגובה בפורמט לא תקין, ייתכן שנפלה בו שגיאה קריטית.";
            console.error("Could not parse JSON error response. Status:", response.status);
            return detailedError;
        }
    }
    
    // If response is OK, it should be valid JSON with a 'text' field.
    const data = await response.json();
    return data.text;

  } catch (error) {
    console.error("Error calling the Netlify function endpoint:", error);
    return "מצטער, חוויתי תקלת רשת בתקשורת עם השרת. אנא בדוק את חיבור האינטרנט שלך ונסה שוב.";
  }
};