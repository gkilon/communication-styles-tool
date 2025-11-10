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
    // The endpoint for our Netlify function. Netlify automatically maps this path.
    const response = await fetch('/.netlify/functions/getAiCoachAdvice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Send the necessary data to the serverless function.
      body: JSON.stringify({ scores, userInput }),
    });

    if (!response.ok) {
      // Try to get a meaningful error message from the server function's response.
      const errorData = await response.json().catch(() => ({ error: 'תקלה בתקשורת עם השרת.' }));
      console.error(`Error from Netlify function (${response.status}):`, errorData.error);
      return `מצטער, חוויתי תקלה טכנית (${response.status}). אנא נסה שוב מאוחר יותר.`;
    }

    const data = await response.json();
    return data.text;

  } catch (error) {
    console.error("Error calling the Netlify function endpoint:", error);
    return "מצטער, חוויתי תקלה טכנית. אנא בדוק את חיבור האינטרנט שלך ונסה שוב.";
  }
};
