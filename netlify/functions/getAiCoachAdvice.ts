
import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

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
    console.error("CRITICAL ERROR: API_KEY is missing in Netlify environment variables.");
    return {
      statusCode: 200,
      body: JSON.stringify({ text: "שגיאת שרת: מפתח API חסר. אנא ודא שהגדרת את API_KEY בממשק של Netlify." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    let bodyStr = event.body || "{}";
    if (event.isBase64Encoded) {
        try {
            bodyStr = Buffer.from(bodyStr, 'base64').toString('utf-8');
        } catch (e) {
            console.error("Failed to decode base64 body:", e);
        }
    }

    let body;
    try {
        body = JSON.parse(bodyStr);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return {
            statusCode: 400,
            body: JSON.stringify({ text: "שגיאה בעיבוד הנתונים שנשלחו לשרת." }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    const { scores, userInput } = body;

    if (!userInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ text: "לא התקבלה שאלה. אנא כתוב משהו." }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // 2. Calculate profile stats
    const safeScore = (val: any) => typeof val === 'number' ? val : Number(val) || 0;
    const red = safeScore(scores?.a) + safeScore(scores?.c);
    const yellow = safeScore(scores?.a) + safeScore(scores?.d);
    const green = safeScore(scores?.b) + safeScore(scores?.d);
    const blue = safeScore(scores?.b) + safeScore(scores?.c);
    
    const sorted = [
        { name: 'Red (Goal-Oriented)', val: red },
        { name: 'Yellow (Enthusiastic)', val: yellow },
        { name: 'Green (Supportive)', val: green },
        { name: 'Blue (Analytical)', val: blue }
    ].sort((x, y) => y.val - x.val);

    const dominant = sorted[0].name;
    const secondary = sorted[1].name;

    // 3. Initialize AI
    const ai = new GoogleGenAI({ apiKey });

    // 4. System Instruction
    const systemInstruction = `You are an expert communication coach based on the Jungian Color Model.
    
    User Profile:
    - Primary: ${dominant}
    - Secondary: ${secondary}
    
    Task: Provide insightful, practical advice to the user's question in Hebrew.
    
    Guidelines:
    - Be concise and direct.
    - Focus on "Color Energies" (Red, Yellow, Green, Blue).
    - Do NOT mention raw numbers.
    - Provide actionable steps.`;

    // 5. Generate with Robust Retry Logic
    const generateWithRetry = async (retries = 3) => {
        let lastError;
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Attempt ${i + 1} calling Gemini...`);
                
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: userInput, 
                    config: {
                        systemInstruction: systemInstruction,
                        temperature: 0.6, // Reduced for stability
                        maxOutputTokens: 800, // Limit length to ensure quick response and avoid timeout
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                        ]
                    }
                });
                
                // Check if response has text content
                // IMPORTANT: We throw here if text is missing to trigger the catch block and retry
                if (response.text && response.text.trim().length > 0) {
                    return response;
                }
                
                const finishReason = response.candidates?.[0]?.finishReason || 'UNKNOWN';
                console.warn(`Attempt ${i+1}: Empty response. Finish reason: ${finishReason}`);
                throw new Error(`Empty response from model (Reason: ${finishReason})`);

            } catch (error) {
                console.warn(`Attempt ${i + 1} failed:`, error);
                lastError = error;
                
                // If this was the last attempt, don't wait, just exit loop
                if (i === retries - 1) break;
                
                // Exponential backoff: 700ms, 1400ms
                await new Promise(r => setTimeout(r, 700 * Math.pow(2, i)));
            }
        }
        throw lastError;
    };

    const response = await generateWithRetry();
    
    // Final check before sending back
    if (!response?.text) {
         return {
            statusCode: 200,
            body: JSON.stringify({ text: "המערכת מתקשה לייצר תשובה כרגע עקב עומס. אנא נסה שוב בעוד רגע או נסח את השאלה אחרת." }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text }),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error: any) {
    console.error("Gemini API Final Error:", error);
    
    let errorMessage = "מצטער, חוויתי תקלה טכנית בתקשורת עם המודל.";
    const errStr = error.toString();

    if (errStr.includes("SAFETY")) {
        errorMessage = "התשובה נחסמה עקב הגדרות בטיחות. נסה לנסח מחדש.";
    } else if (errStr.includes("Empty response")) {
         errorMessage = "המערכת ניסתה לענות אך לא הצליחה לייצר תוכן. אנא נסה שנית.";
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: errorMessage }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
