
import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const handler: Handler = async (event: HandlerEvent) => {
  // 1. Check Method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error (API Key)" }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    if (!event.body) throw new Error("No body provided");
    
    const { scores, userInput } = JSON.parse(event.body);

    if (!scores || !userInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing data" }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // 2. Calculate simple profile stats
    const { a, b, c, d } = scores;
    const red = a + c;
    const yellow = a + d;
    const green = b + d;
    const blue = b + c;
    
    const sorted = [
        { name: 'Red', val: red },
        { name: 'Yellow', val: yellow },
        { name: 'Green', val: green },
        { name: 'Blue', val: blue }
    ].sort((x, y) => y.val - x.val);

    const dominant = sorted[0].name;
    const secondary = sorted[1].name;

    // 3. Initialize AI
    const ai = new GoogleGenAI({ apiKey });

    // 4. Minimal System Instruction for Speed
    const systemInstruction = `Role: DISC Communication Coach.
Profile: Dominant=${dominant}, Secondary=${secondary}.
Scores: Red=${red}, Yellow=${yellow}, Green=${green}, Blue=${blue}.
Lang: Hebrew.
Task: Answer briefly and practically. Max 60 words.`;

    // 5. Strict Timeout Logic (5.5 seconds) to beat Netlify's 10s limit
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT")), 5500)
    );

    const apiPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userInput,
        config: {
            systemInstruction: systemInstruction,
            maxOutputTokens: 200, // Lower token limit for speed
            temperature: 0.7,
        }
    });

    // Race: AI vs Clock
    const response = await Promise.race([apiPromise, timeoutPromise]);

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text }),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error: any) {
    console.error("Function Error:", error);
    
    // If timeout or other error, return a friendly message instead of 500/504
    let userMessage = "מצטער, חוויתי תקלה זמנית. אנא נסה שוב.";
    
    if (error.message === "TIMEOUT") {
        userMessage = "השרת עמוס מדי כרגע. אנא נסה שאלה קצרה יותר.";
    }

    return {
      statusCode: 200, // Return 200 so the UI handles it gracefully
      body: JSON.stringify({ text: userMessage }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
