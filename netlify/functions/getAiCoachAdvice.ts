
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
      statusCode: 200, // Return 200 to client so it can display the text gracefully
      body: JSON.stringify({ text: "שגיאת שרת: מפתח API חסר בהגדרות. אנא ודא שהגדרת את API_KEY בממשק של Netlify." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    // Handle Base64 encoding (common in Netlify functions)
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

    // 2. Calculate profile stats for context
    const safeScore = (val: any) => typeof val === 'number' ? val : Number(val) || 0;
    const red = safeScore(scores?.a) + safeScore(scores?.c);
    const yellow = safeScore(scores?.a) + safeScore(scores?.d);
    const green = safeScore(scores?.b) + safeScore(scores?.d);
    const blue = safeScore(scores?.b) + safeScore(scores?.c);
    
    // Sort colors by value to determine hierarchy
    const sorted = [
        { name: 'Red (Goal-Oriented / Driving)', val: red },
        { name: 'Yellow (Enthusiastic / Expressive)', val: yellow },
        { name: 'Green (Supportive / Amiable)', val: green },
        { name: 'Blue (Analytical / Precise)', val: blue }
    ].sort((x, y) => y.val - x.val);

    const dominant = sorted[0].name;
    const secondary = sorted[1].name;

    // 3. Initialize AI
    const ai = new GoogleGenAI({ apiKey });

    // 4. System Instruction - Updated for Jungian Model
    // Explicitly mentioning "Don't timeout" strategy in system prompt logic (conciseness where possible while deep)
    const systemInstruction = `You are an expert communication coach based on the Jungian Color Model (similar to Insights Discovery).
    
    User Profile Analysis:
    - Primary Color Energy: ${dominant}
    - Secondary Color Energy: ${secondary}
    - Contextual intensities (internal use only): Red=${red}, Yellow=${yellow}, Green=${green}, Blue=${blue}
    
    Task: Provide insightful advice to the user's question.
    Language: Hebrew only.
    Tone: Professional, empathetic, practical.
    
    Guidelines:
    - This is NOT DISC. Do not use DISC terminology.
    - Focus on the "Color Energies" (Red, Yellow, Green, Blue) as described in Jungian typology.
    - Do NOT mention the specific raw score numbers (e.g., "Your score is 45") in your final response. Use terms like "High", "Moderate", or "Low" instead.
    - Analyze the user's situation deeply through the lens of their specific color blend.
    - Provide concrete, actionable steps.
    - Be concise and direct to ensure a quick response. Avoid fluff.`;

    // Helper function for retries
    const generateWithRetry = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Attempt ${i + 1} calling Gemini...`);
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: userInput, 
                    config: {
                        systemInstruction: systemInstruction,
                        temperature: 0.7,
                        // Reduced max tokens to 1000 to prevent Netlify function timeouts (10s limit)
                        // Hebrew characters take more tokens, but 1000 is plenty for a good answer.
                        maxOutputTokens: 1000, 
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                        ]
                    }
                });
                return response;
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed:`, error);
                if (i === retries - 1) throw error;
                // Exponential backoff: 500ms, 1000ms
                await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
            }
        }
    };

    // 5. Call Gemini API with retry
    try {
        const response = await generateWithRetry();
        const responseText = response?.text;

        if (!responseText) {
            console.warn("Empty response text received from Gemini Model.");
            // Check if blocked
            if (response?.candidates?.[0]?.finishReason) {
                 console.warn("Finish Reason:", response.candidates[0].finishReason);
            }
            
            return {
                statusCode: 200,
                body: JSON.stringify({ text: "המערכת לא הצליחה לייצר תשובה (חסימת תוכן או תשובה ריקה). נסה לנסח את השאלה מחדש." }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ text: responseText }),
          headers: { 'Content-Type': 'application/json' },
        };
    } catch (innerError: any) {
         console.error("Inner Gemini Generate Error after retries:", innerError);
         throw innerError;
    }

  } catch (error: any) {
    console.error("Gemini API Global Error:", error);
    
    let errorMessage = "מצטער, חוויתי תקלה טכנית בתקשורת עם המודל.";
    
    // Extract more details if possible
    const errStr = error.toString();
    if (errStr.includes("403") || errStr.includes("API key")) {
        errorMessage = "שגיאת הרשאה: מפתח ה-API אינו תקין או שפג תוקפו.";
    } else if (errStr.includes("429") || errStr.includes("Resource has been exhausted")) {
        errorMessage = "עומס על המערכת: אנא נסה שוב בעוד מספר שניות.";
    } else if (errStr.includes("SAFETY")) {
        errorMessage = "התשובה נחסמה עקב הגדרות בטיחות. נסה לנסח מחדש.";
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: errorMessage }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
