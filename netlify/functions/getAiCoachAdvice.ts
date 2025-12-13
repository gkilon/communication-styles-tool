
import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Buffer } from "buffer";

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
        // --- TEAM MODE LOGIC (Enhanced Persona) ---
        const { red, yellow, green, blue, total } = teamStats || { red:0, yellow:0, green:0, blue:0, total:0 };
        
        // We construct a highly specific prompt to force a detailed consultancy report
        systemInstruction = `אתה יועץ ארגוני בכיר, פסיכולוג צוותים ומומחה לדינמיקה קבוצתית, המתמחה במודל הצבעים של יונג (Insights Discovery / DISC).
        
        **הנתונים שבידך - הרכב הצוות (סה"כ ${total} חברים):**
        - ${red} אדומים (דומיננטיים, משימתיים, נחושים, ישירים).
        - ${yellow} צהובים (משפיעים, יצירתיים, חברתיים, אופטימיים).
        - ${green} ירוקים (יציבים, תומכים, מכילים, שונאי סיכון).
        - ${blue} כחולים (אנליטיים, מדויקים, זהירים, שיטתיים).

        **המשימה:**
        המשתמש הציג אתגר צוותי: "${userInput}".
        עליך לספק ניתוח מעמיק, אסטרטגי ומקצועי של האתגר *אך ורק* דרך הפריזמה של הרכב הצוות הספציפי הזה.

        **הנחיות קריטיות ליצירת התשובה (חובה בעברית):**
        1. **הימנע מקלישאות.** אל תיתן עצות גנריות. תפור את התשובה למספרים הספציפיים למעלה.
        2. **עומק ואורך:** התשובה צריכה להיות מפורטת, כמו דוח ייעוץ שנכתב על ידי מומחה. השתמש ב-350 עד 600 מילים.
        3. **טון:** מקצועי מאוד, אמפתי, אך ישיר ומניע לפעולה.

        **מבנה התשובה הנדרש (השתמש בכותרות מודגשות):**

        ### 1. ניתוח ה-DNA של הצוות מול האתגר
        הסבר פסיכולוגי-ארגוני: מדוע *דווקא ההרכב הזה* מתקשה באתגר הספציפי הזה?
        (לדוגמה: אם יש הרבה אדומים - האם יש יותר מדי אגו בחדר? אם יש הרבה ירוקים - האם יש הימנעות מקונפליקט הכרחי? אם חסרים כחולים - האם יש בלאגן בנתונים?)
        *התייחס מפורשות לכמויות הצבעים בצוות.*

        ### 2. הקול החסר (The Missing Voice)
        זהה את הצבע/הסגנון שנמצא במיעוט או חסר בצוות. הסבר איזה מחיר הצוות משלם על כך בהתמודדות עם האתגר הנוכחי, ומי צריך "להיכנס לנעליים" של הצבע החסר.

        ### 3. תוכנית פעולה אסטרטגית
        הצע 3-4 צעדים קונקרטיים לפתרון, מחולקים לקטגוריות:
        *   **תקשורת וניהול ישיבות:** איך לשנות את השיח?
        *   **תהליכים ומבנה:** איזה שינוי נוהלי נדרש?
        *   **היבט רגשי/תרבותי:** איך לרתום את האנשים?

        ### 4. שורת המחץ למנהל
        משפט מחץ אחד, חד ומדויק, שיתמצת את השינוי המחשבתי הנדרש מהמנהל כדי לצלוח את המשבר.
        `;

    } else {
        // --- INDIVIDUAL MODE LOGIC (Standard Persona) ---
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
            temperature: 0.8, // Higher creativity for the consultant persona
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
