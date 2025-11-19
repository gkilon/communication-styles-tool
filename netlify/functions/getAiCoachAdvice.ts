
import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

// --- Helper Types & Logic ---

interface Scores {
  a: number;
  b: number;
  c: number;
  d: number;
}

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
      body: JSON.stringify({ error: "מפתח ה-API אינו מוגדר בשרת." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    if (!event.body) {
      throw new Error("No body provided");
    }
    const { scores, userInput } = JSON.parse(event.body);

    if (!scores || !userInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing scores or userInput" }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // 2. Fast Profile Calculation
    // We calculate simple stats here to send to AI, instead of sending full analysis text.
    // This saves token processing time.
    const { a, b, c, d } = scores;
    const red = a + c;
    const yellow = a + d;
    const green = b + d;
    const blue = b + c;
    
    const sorted = [
        { name: 'Red (Dominant)', val: red },
        { name: 'Yellow (Influential)', val: yellow },
        { name: 'Green (Steady)', val: green },
        { name: 'Blue (Compliant)', val: blue }
    ].sort((x, y) => y.val - x.val);

    const dominant = sorted[0].name;
    const secondary = sorted[1].name;

    // 3. Initialize AI
    const ai = new GoogleGenAI({ apiKey });

    // 4. Highly Optimized System Instruction
    // Removed extensive background theory. The model knows DISC/Jung.
    const systemInstruction = `
      You are an expert communication coach using the DISC color model.
      User Profile: Dominant: ${dominant}, Secondary: ${secondary}.
      Scores: Red=${red}, Yellow=${yellow}, Green=${green}, Blue=${blue}.
      
      Task: Answer the user's question based on their profile.
      Language: Hebrew.
      Tone: Encouraging, practical, concise.
      Format: Markdown.
      Length: Keep it under 100 words unless asked for detailed analysis.
      
      Question: "${userInput}"
    `;

    // 5. Single Execution with strict Timeout race
    // Netlify limit is 10s. We cut off at 8s to return a graceful error instead of 504.
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT")), 8000)
    );

    const apiPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userInput, // The actual user input is in system prompt context mostly, but passing it here is standard
        config: {
            systemInstruction: systemInstruction,
            maxOutputTokens: 400, // Strict limit to ensure speed
            temperature: 0.7,
        }
    });

    // Race between API and Timer
    const response = await Promise.race([apiPromise, timeoutPromise]);

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text }),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error: any) {
    console.error("Error inside function:", error);
    
    let errorMessage = "אירעה שגיאה זמנית.";
    
    if (error.message === "TIMEOUT") {
        errorMessage = "השרת עמוס כרגע ולא הספיק לענות בזמן. אנא נסה שאלה קצרה יותר.";
    } else {
        errorMessage = "מצטער, חוויתי תקלה. אנא נסה שוב.";
    }

    return {
      statusCode: 200, // Return 200 with error text to display in chat bubble instead of crashing app
      body: JSON.stringify({ text: errorMessage }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
