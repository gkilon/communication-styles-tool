import { Scores } from '../types';

/**
 * Sleep utility for delays between retries
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calls the secure Netlify serverless function to get advice from the AI coach.
 * This function acts as a proxy to the Gemini API, ensuring the API key is not exposed on the client-side.
 * @param scores - The user's questionnaire scores.
 * @param userInput - The user's question for the AI coach.
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns A promise that resolves to the AI's response as a string.
 */
export const getAiCoachAdvice = async (
  scores: Scores, 
  userInput: string,
  maxRetries: number = 3
): Promise<string> => {
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add exponential backoff delay before retry (except first attempt)
      if (attempt > 0) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
        console.log(`ניסיון ${attempt + 1}/${maxRetries} - ממתין ${delayMs}ms לפני ניסיון חוזר...`);
        await sleep(delayMs);
      }

      // The direct endpoint for our Netlify function.
      const response = await fetch('/.netlify/functions/getAiCoachAdvice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send the necessary data to the serverless function.
        body: JSON.stringify({ scores, userInput }),
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 seconds timeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          const detailedError = "נקודת הקצה של השרת לא נמצאה (שגיאת 404). ייתכן שהפונקציה לא הופעלה כראוי.";
          console.error(`Error from Netlify function (${response.status}):`, detailedError);
          return `מצטער, חוויתי תקלה טכנית. השרת החזיר את השגיאה הבאה: "${detailedError}"`;
        }
        
        let detailedError;
        let shouldRetry = false;
        
        try {
          // First, try to parse the response as JSON, as the server should return a JSON error
          const errorData = await response.json();
          detailedError = errorData.error || `קוד סטטוס ${response.status}`;
          
          // Check if error is retryable (rate limit, server overload, etc.)
          if (response.status === 429 || response.status === 503 || response.status === 504) {
            shouldRetry = true;
          }
          
          // Check for specific Gemini API errors that are retryable
          if (errorData.error?.includes('RESOURCE_EXHAUSTED') || 
              errorData.error?.includes('503') ||
              errorData.error?.includes('עומס')) {
            shouldRetry = true;
          }
          
        } catch (e) {
          // If JSON parsing fails, check status codes for retry eligibility
          console.error("Could not parse JSON error response. Status:", response.status);
          if (response.status === 502 || response.status === 503 || response.status === 504) {
            shouldRetry = true;
            detailedError = `השרת אינו זמין או לא הגיב בזמן (שגיאת ${response.status}).`;
          } else {
            detailedError = "השרת החזיר תגובה בפורמט לא תקין.";
          }
        }
        
        // If this is a retryable error and we have retries left, continue to next attempt
        if (shouldRetry && attempt < maxRetries - 1) {
          console.warn(`שגיאה זמנית בניסיון ${attempt + 1}, מנסה שוב...`, detailedError);
          continue; // Try again
        }
        
        // If no more retries or not retryable, return error
        console.error(`Error from Netlify function (${response.status}):`, detailedError);
        return `מצטער, חוויתי תקלה טכנית. ${attempt > 0 ? `(לאחר ${attempt + 1} נסיונות) ` : ''}השרת החזיר את השגיאה הבאה: "${detailedError}"`;
      }
      
      // If response is OK, it should be valid JSON.
      const data = await response.json();
      
      if (attempt > 0) {
        console.log(`✅ הצלחה בניסיון ${attempt + 1}!`);
      }
      
      return data.text;
      
    } catch (error) {
      // Network errors or timeout
      const isLastAttempt = attempt === maxRetries - 1;
      
      if (error instanceof Error && error.name === 'TimeoutError') {
        console.error(`Timeout on attempt ${attempt + 1}`);
        if (!isLastAttempt) continue;
        return "מצטער, הבקשה לקחה יותר מדי זמן. אנא נסה שוב.";
      }
      
      console.error(`Network error on attempt ${attempt + 1}:`, error);
      
      if (!isLastAttempt) {
        continue; // Try again
      }
      
      return "מצטער, חוויתי תקלת רשת בתקשורת עם השרת. אנא בדוק את חיבור האינטרנט שלך ונסה שוב.";
    }
  }
  
  // Should never reach here, but just in case
  return "מצטער, לא הצלחתי לקבל תשובה מהשרת לאחר מספר נסיונות.";
};