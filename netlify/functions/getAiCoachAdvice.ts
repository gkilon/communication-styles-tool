
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

    // 4. System Instruction - Updated for deeper analysis and no length limit
    const systemInstruction = `You are an expert DISC communication coach based on Jungian psychology.
    User Profile Analysis:
    - Dominant Style: ${dominant}
    - Secondary Style: ${secondary}
    - Raw Scores: Red=${red}, Yellow=${yellow}, Green=${green}, Blue=${blue}
    
    Task: Provide comprehensive, deep, and insightful advice to the user's question.
    Language: Hebrew only.
    Tone: Professional, empathetic, practical, and thorough.
    
    Guidelines:
    - Analyze the user's situation deeply through the lens of their specific color blend.
    - Provide concrete, actionable steps or strategies.
    - Use specific examples to illustrate your points.
    - Do NOT be brief. Elaborate as much as necessary to provide high value.
    - Address both their strengths and potential blind spots in the answer.`;

    // 5. Call Gemini API
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userInput, 
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
                maxOutputTokens: 2000, // Increased limit for deeper answers
                // Safety settings to prevent blocking Hebrew content
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        const responseText = response.text;

        if (!responseText) {
            console.warn("Empty response text received from Gemini Model.");
            
            return {
                statusCode: 200,
                body: JSON.stringify({ text: "המערכת לא הצליחה לייצר תשובה לשאלה זו. נסה לנסח את השאלה מחדש." }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ text: responseText }),
          headers: { 'Content-Type': 'application/json' },
        };
    } catch (innerError: any) {
         console.error("Inner Gemini Generate Error:", innerError);
         throw innerError;
    }

  } catch (error: any) {
    console.error("Gemini API Global Error:", error);
    
    let errorMessage = "מצטער, חוויתי תקלה טכנית בתקשורת עם המודל.";
    
    // Extract more details if possible
    if (error.toString().includes("403") || error.toString().includes("API key")) {
        errorMessage = "שגיאת הרשאה: מפתח ה-API אינו תקין או שפג תוקפו.";
    } else if (error.toString().includes("429")) {
        errorMessage = "עומס על המערכת: אנא נסה שוב בעוד מספר שניות.";
    } else if (error.toString().includes("SAFETY")) {
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
