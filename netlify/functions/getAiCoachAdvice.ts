
import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key missing in environment variables.");
    return {
      statusCode: 200, 
      body: JSON.stringify({ text: "שגיאת שרת: מפתח API חסר." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    let bodyStr = event.body || "{}";
    if (event.isBase64Encoded) {
        bodyStr = Buffer.from(bodyStr, 'base64').toString('utf-8');
    }
    const body = JSON.parse(bodyStr);
    const { scores, userInput, mode, teamStats } = body; // mode: 'individual' | 'team'

    if (!userInput) {
      return { statusCode: 400, body: JSON.stringify({ text: "חסר קלט משתמש." }) };
    }

    const ai = new GoogleGenAI({ apiKey });
    let systemInstruction = "";
    let prompt = userInput;
    
    // Helper to ensure numbers are actually numbers
    const safeScore = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    if (mode === 'team') {
        // --- TEAM MODE LOGIC ---
        const { red, yellow, green, blue, total } = teamStats || { red:0, yellow:0, green:0, blue:0, total:0 };
        
        systemInstruction = `You are an expert Organizational Psychologist and Team Dynamics Consultant specialized in the Jungian Color Model.
        
        Team Composition Data:
        - Total Members: ${total}
        - Red (Dominant/Driver): ${red} members
        - Yellow (Influencing/Expressive): ${yellow} members
        - Green (Stable/Supportive): ${green} members
        - Blue (Analytical/Compliant): ${blue} members

        Your Goal:
        Analyze the user's input (the Team's Challenge) through the lens of this specific personality mix.
        
        Guidelines:
        1. **Hebrew Language Only.**
        2. **Tone:** Professional, strategic, yet practical.
        3. **Structure:**
           - **Analysis:** Analyze why this specific mix struggles (or succeeds) with this challenge.
           - **Blind Spots:** What is this team likely missing due to its composition?
           - **Action Plan (Categorized):**
             * **Communication:** How should they talk about this?
             * **Process & Execution:** What structural changes are needed?
             * **Team Culture:** How to maintain morale while solving this?
        4. Do NOT just list the colors. Connect the dots between the *mix* and the *challenge*.
        `;

    } else {
        // --- INDIVIDUAL MODE LOGIC ---
        const red = safeScore(scores?.a) + safeScore(scores?.c);
        const yellow = safeScore(scores?.a) + safeScore(scores?.d);
        const green = safeScore(scores?.b) + safeScore(scores?.d);
        const blue = safeScore(scores?.b) + safeScore(scores?.c);
        
        const sorted = [
            { name: 'Red', val: red },
            { name: 'Yellow', val: yellow },
            { name: 'Green', val: green },
            { name: 'Blue', val: blue }
        ].sort((x, y) => y.val - x.val);

        const dominant = sorted[0].name;
        const secondary = sorted[1].name;

        systemInstruction = `You are an expert communication coach based on the Jungian Color Model.
        User Profile: Primary: ${dominant}, Secondary: ${secondary}.
        Task: Provide insightful, practical advice to the user's question in Hebrew.
        Guidelines:
        - No greetings. Start directly.
        - Max 3 paragraphs.
        - Focus on Color Energies.
        - Professional yet encouraging tone.`;
    }

    // Call AI - Simplified content structure for stability
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 1500,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
        }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text || "שגיאה ביצירת תשובה." }),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
      statusCode: 200, // Return 200 to handle gracefully on client
      body: JSON.stringify({ text: "שגיאה זמנית בשרת ה-AI. אנא נסה שוב." }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
