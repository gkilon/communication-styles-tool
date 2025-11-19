
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
    // Handle Base64 encoding (Netlify functions sometimes encode the body depending on gateway)
    let bodyStr = event.body || "{}";
    if (event.isBase64Encoded) {
        try {
            bodyStr = Buffer.from(bodyStr, 'base64').toString('utf-8');
        } catch (e) {
            console.error("Failed to decode base64 body:", e);
            // Proceed with raw body just in case
        }
    }

    let body;
    try {
        body = JSON.parse(bodyStr);
    } catch (e) {
        console.error("Failed to parse JSON body:", e);
        return {
            statusCode: 200, // Return 200 to show the friendly message in the chat
            body: JSON.stringify({ text: "שגיאה טכנית: נתוני הבקשה אינם תקינים (JSON Parse Error)." }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    const { scores, userInput } = body;

    if (!scores || !userInput) {
      return {
        statusCode: 200,
        body: JSON.stringify({ text: "חסרים נתונים לעיבוד הבקשה. אנא נסה שוב." }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // 2. Calculate simple profile stats with safety checks
    // Ensure values are numbers to prevent invalid prompt construction
    const safeScore = (val: any) => typeof val === 'number' ? val : Number(val) || 0;
    
    const a = safeScore(scores.a);
    const b = safeScore(scores.b);
    const c = safeScore(scores.c);
    const d = safeScore(scores.d);

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

    // 4. Minimal System Instruction
    const systemInstruction = `You are an expert DISC communication coach.
User Profile: Dominant=${dominant}, Secondary=${secondary}.
Scores: R=${red}, Y=${yellow}, G=${green}, B=${blue}.
Language: Hebrew.
Constraint: Answer in 2-3 sentences maximum. Be practical, encouraging, and direct.`;

    // 5. Timeout Logic (10 seconds - safe balance between speed and reliability)
    const timeoutMs = 10000; 
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    );

    const apiPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userInput,
        config: {
            systemInstruction: systemInstruction,
            maxOutputTokens: 250,
            temperature: 0.7,
        }
    });

    // Race: AI vs Clock
    // @ts-ignore
    const response = await Promise.race([apiPromise, timeoutPromise]);

    // Safely extract text
    let responseText = "";
    try {
        if (response && typeof response === 'object') {
             if ('text' in response) {
                 responseText = (response as any).text;
             } else if (typeof (response as any).text === 'function') {
                 responseText = (response as any).text();
             }
        }
    } catch (e) {
        console.warn("Error extracting text property:", e);
    }
    
    if (!responseText) {
        console.warn("AI Response text is empty", JSON.stringify(response));
        responseText = "מצטער, לא הצלחתי לייצר תשובה. ייתכן שהשאלה נחסמה על ידי מסנני הבטיחות או שהמודל לא החזיר תוכן.";
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
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: userMessage }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
