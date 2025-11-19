
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
    console.error("API_KEY is missing in environment variables.");
    return {
      statusCode: 200,
      body: JSON.stringify({ text: "שגיאת קונפיגורציה בשרת: חסר מפתח API." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    if (!event.body) throw new Error("No body provided");
    
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        throw new Error("Invalid JSON body");
    }

    const { scores, userInput } = body;

    if (!scores || !userInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ text: "חסרים נתונים לעיבוד הבקשה." }),
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

    // 4. Extremely Minimal System Instruction for Speed
    const systemInstruction = `You are an expert DISC communication coach.
User Profile: Dominant=${dominant}, Secondary=${secondary}.
Scores: R=${red}, Y=${yellow}, G=${green}, B=${blue}.
Language: Hebrew.
Constraint: Answer in 2-3 sentences maximum. Be practical and direct.`;

    // 5. Strict Timeout Logic (6 seconds)
    const timeoutMs = 6000;
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    );

    const apiPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userInput,
        config: {
            systemInstruction: systemInstruction,
            maxOutputTokens: 150,
            temperature: 0.7,
        }
    });

    // Race: AI vs Clock
    // @ts-ignore - Types for race result can be tricky with different AI SDK versions
    const response = await Promise.race([apiPromise, timeoutPromise]);

    // Safely extract text
    let responseText = "";
    try {
        if (response && typeof response === 'object') {
             // Try standard property access
             if ('text' in response) {
                 responseText = (response as any).text;
             }
             
             // Fallback: function call (older SDKs) or candidates check
             if (!responseText && typeof (response as any).text === 'function') {
                 responseText = (response as any).text();
             }
        }
    } catch (e) {
        console.warn("Error extracting text property:", e);
    }
    
    if (!responseText) {
        console.warn("AI Response text is empty or undefined", JSON.stringify(response));
        responseText = "מצטער, לא הצלחתי לייצר תשובה לשאלה זו (ייתכן שהתוכן נחסם). אנא נסה לנסח שוב.";
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: responseText }),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error: any) {
    console.error("AI Function Error:", error);
    
    let userMessage = "מצטער, חוויתי תקלה זמנית. אנא נסה שוב.";
    
    if (error.message === "TIMEOUT") {
        userMessage = "השרת עמוס כרגע והתשובה מתעכבת. אנא נסה שאלה קצרה יותר.";
    } else if (error.message && error.message.includes("Invalid JSON")) {
        userMessage = "שגיאה בעיבוד הנתונים שנשלחו.";
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: userMessage }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
