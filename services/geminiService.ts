
import { Scores, UserProfile } from '../types';
import { GoogleGenAI } from "@google/genai";

/**
 * Calls the Gemini API directly from the frontend to get advice from the AI coach.
 */
export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  try {
    const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error("מפתח API חסר. אנא וודא שהגדרת את VITE_GEMINI_API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const sA = Number(scores?.a || 0);
    const sB = Number(scores?.b || 0);
    const sC = Number(scores?.c || 0);
    const sD = Number(scores?.d || 0);

    const r = sA + sC;
    const y = sA + sD;
    const g = sB + sD;
    const b = sB + sC;
    const colors = [{ n: 'אדום', v: r }, { n: 'צהוב', v: y }, { n: 'ירוק', v: g }, { n: 'כחול', v: b }].sort((m, n) => n.v - m.v);

    const systemInstruction = `אתה מאמן תקשורת אישי בכיר מבית Kilon Consulting. המשתמש בעל פרופיל תקשורת שבו הצבע הדומיננטי הוא ${colors[0].n} והצבע המשני הוא ${colors[1].n}.
    ענה על שאלות המשתמש בהתבסס על הפרופיל שלו בצורה מפורטת, אמפתית ופרקטית. השתמש בפורמט Markdown.
    חשוב: וודא שהתשובה שלך מלאה ומקיפה. אל תקטע את דבריך באמצע.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userInput,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      },
    });

    return response.text || "לא התקבלה תשובה.";
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `שגיאה: ${error.message}`;
  }
};

/**
 * Streams AI coach advice.
 */
export const getAiCoachAdviceStream = async (scores: Scores, userInput: string, onChunk: (chunk: string) => void): Promise<string> => {
  try {
    const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
    if (!apiKey) throw new Error("מפתח API חסר.");

    const ai = new GoogleGenAI({ apiKey });

    const sA = Number(scores?.a || 0);
    const sB = Number(scores?.b || 0);
    const sC = Number(scores?.c || 0);
    const sD = Number(scores?.d || 0);

    const r = sA + sC;
    const y = sA + sD;
    const g = sB + sD;
    const b = sB + sC;
    const colors = [{ n: 'אדום', v: r }, { n: 'צהוב', v: y }, { n: 'ירוק', v: g }, { n: 'כחול', v: b }].sort((m, n) => n.v - m.v);

    const systemInstruction = `אתה מאמן תקשורת אישי בכיר מבית Kilon Consulting. המשתמש בעל פרופיל תקשורת שבו הצבע הדומיננטי הוא ${colors[0].n} והצבע המשני הוא ${colors[1].n}.
    ענה על שאלות המשתמש בהתבסס על הפרופיל שלו בצורה מפורטת, אמפתית ופרקטית. השתמש בפורמט Markdown.`;

    const result = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: userInput,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      },
    });

    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text;
      fullText += chunkText;
      onChunk(fullText);
    }

    return fullText;
  } catch (error: any) {
    console.error("AI Stream Error:", error);
    throw error;
  }
};

/**
 * Calls the Gemini API directly for team dynamics analysis.
 */
export const getTeamAiAdvice = async (users: UserProfile[], challenge: string): Promise<string> => {
  try {
    if (!challenge.trim()) return "נא להזין אתגר לניתוח.";

    const validUsers = users.filter(u => u.scores);
    if (validUsers.length === 0) return "אין מספיק נתוני משתמשים עם תוצאות לביצוע ניתוח צוותי.";

    const teamStats = { red: 0, yellow: 0, green: 0, blue: 0, total: 0 };
    validUsers.forEach(u => {
      const s = u.scores!;
      const r = (s.a || 0) + (s.c || 0);
      const y = (s.a || 0) + (s.d || 0);
      const g = (s.b || 0) + (s.d || 0);
      const b = (s.b || 0) + (s.c || 0);

      const max = Math.max(r, y, g, b);
      if (max === r) teamStats.red++;
      else if (max === y) teamStats.yellow++;
      else if (max === g) teamStats.green++;
      else if (max === b) teamStats.blue++;
      teamStats.total++;
    });

    const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error("מפתח API חסר. אנא וודא שהגדרת את VITE_GEMINI_API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `אתה יועץ ארגוני בכיר מבית Kilon Consulting. נתח את אתגר הצוות הבא על בסיס מודל ארבעת הצבעים.
        נתוני הצוות (סה"כ ${teamStats.total} משתתפים):
        - אדום: ${teamStats.red}
        - צהוב: ${teamStats.yellow}
        - ירוק: ${teamStats.green}
        - כחול: ${teamStats.blue}

        האתגר שהוצג: "${challenge}"

        מבנה התשובה הנדרש (בעברית, פורמט Markdown):
        1. ניתוח דינמיקה: מדוע הרכב הצבעים הנוכחי חווה את האתגר הזה?
        2. נקודות עיוורון: מה הצוות מפספס?
        3. 3 המלצות פרקטיות ומידיות לשיפור המצב.
        חשוב: ענה בצורה מפורטת ומלאה. אל תעצור באמצע.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: challenge,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      },
    });

    return response.text || "לא התקבל ניתוח.";
  } catch (error: any) {
    console.error("Team AI Error:", error);
    return `שגיאה בניתוח הצוות: ${error.message}`;
  }
}

/**
 * Streams Team AI advice.
 */
export const getTeamAiAdviceStream = async (users: UserProfile[], challenge: string, onChunk: (chunk: string) => void): Promise<string> => {
    try {
        if (!challenge.trim()) return "נא להזין אתגר לניתוח.";

        const validUsers = users.filter(u => u.scores);
        if (validUsers.length === 0) return "אין מספיק נתוני משתמשים עם תוצאות לביצוע ניתוח צוותי.";

        const teamStats = { red: 0, yellow: 0, green: 0, blue: 0, total: 0 };
        validUsers.forEach(u => {
            const s = u.scores!;
            const r = (s.a || 0) + (s.c || 0);
            const y = (s.a || 0) + (s.d || 0);
            const g = (s.b || 0) + (s.d || 0);
            const b = (s.b || 0) + (s.c || 0);

            const max = Math.max(r, y, g, b);
            if (max === r) teamStats.red++;
            else if (max === y) teamStats.yellow++;
            else if (max === g) teamStats.green++;
            else if (max === b) teamStats.blue++;
            teamStats.total++;
        });

        const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
        if (!apiKey) throw new Error("מפתח API חסר.");

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `אתה יועץ ארגוני בכיר מבית Kilon Consulting. נתח את אתגר הצוות הבא על בסיס מודל ארבעת הצבעים.
        נתוני הצוות (סה"כ ${teamStats.total} משתתפים):
        - אדום: ${teamStats.red}
        - צהוב: ${teamStats.yellow}
        - ירוק: ${teamStats.green}
        - כחול: ${teamStats.blue}

        האתגר שהוצג: "${challenge}"

        מבנה התשובה הנדרש (בעברית, פורמט Markdown):
        1. ניתוח דינמיקה: מדוע הרכב הצבעים הנוכחי חווה את האתגר הזה?
        2. נקודות עיוורון: מה הצוות מפספס?
        3. 3 המלצות פרקטיות ומידיות לשיפור המצב.`;

        const result = await ai.models.generateContentStream({
            model: "gemini-2.0-flash",
            contents: challenge,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            },
        });

        let fullText = "";
        for await (const chunk of result.stream) {
            const chunkText = chunk.text;
            fullText += chunkText;
            onChunk(fullText);
        }

        return fullText;
    } catch (error: any) {
        console.error("Team AI Stream Error:", error);
        throw error;
    }
};

export interface SimulationMessage {
  sender: 'user' | 'ai';
  text: string;
}

/**
 * Calls the Gemini API for an interactive roleplay simulation (Dialogue mode).
 */
export const getSimulationResponse = async (scores: Scores, targetColor: string, scenario: string, history: SimulationMessage[], userInput: string): Promise<string> => {
  try {
    const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error("מפתח API חסר.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const sA = Number(scores?.a || 0);
    const sB = Number(scores?.b || 0);
    const sC = Number(scores?.c || 0);
    const sD = Number(scores?.d || 0);

    const r = sA + sC;
    const y = sA + sD;
    const g = sB + sD;
    const b = sB + sC;
    const colors = [{ n: 'אדום', v: r }, { n: 'צהוב', v: y }, { n: 'ירוק', v: g }, { n: 'כחול', v: b }].sort((m, n) => n.v - m.v);

    const systemInstruction = `אתה משחק תפקיד של עמית לעבודה בעל סגנון תקשורת מובהק בצבע ${targetColor}.
המשתמש שפונה אליך הוא במקור עם סגנון תקשורת שבו הצבע הדומיננטי הוא ${colors[0].n}.
התרחיש שאתם נמצאים בו כרגע הוא: "${scenario}".

חשוב מאוד: אל תיתן שום הסבר על התגובה שלך. פשוט תשחק את הדמות! ענה רק בתור הדמות, תגובה קצרה וטבעית כמו בשיחה מציאותית. שמור על התכונות של הצבע ה${targetColor}.`;

    const conversationLog = history.map(m => `${m.sender === 'user' ? 'משתמש' : 'אתה (הקולגה)'}: ${m.text}`).join('\n\n');
    const prompt = `היסטוריית השיחה עד כה:\n${conversationLog}\n\nהמשתמש כעת אומר:\n${userInput}\n\nהגב עכשיו מתוך הדמות (ללא הסברים מחוץ לדמות):`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      },
    });

    return response.text || "לא התקבלה תשובה מהסימולטור.";
  } catch (error: any) {
    console.error("Simulation AI Error:", error);
    return `שגיאה בסימולציה: ${error.message}`;
  }
};

/**
 * Gets feedback on the simulation conversation.
 */
export const getSimulationFeedback = async (targetColor: string, scenario: string, history: SimulationMessage[]): Promise<string> => {
  try {
    const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error("מפתח API חסר.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const conversationLog = history.map(m => `${m.sender === 'user' ? 'משתמש' : 'הקולגה (צבע ' + targetColor + ')'}: ${m.text}`).join('\n\n');

    const prompt = `קרא את השיחה הבאה שנערכה בסימולטור מקרי בוחן. התרחיש היה: "${scenario}". הקולגה היה בצבע "${targetColor}".

השיחה:
${conversationLog}

אנא כתוב משוב קצר, בונה וממוקד למשתמש. חשוב מאוד: הצג תמיד גם את החוזקות וגם את נקודות השיפור — לא רק ביקורת.
1. ✅ מה עבד בשיחה? (בהתאם לסגנון התקשורת של המשתמש — הצג את האינטואיציות הטובות ואת החוזקות שלו)
2. 🎯 מה ניתן לחדד? (היכן הגישה יצרה חיכוך עם הסגנון ה${targetColor}?)
3. 💡 טיפ אחד לפעם הבאה — המלצה פרקטית קצרה.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      },
    });

    return response.text || "לא ניתן היה לייצר משוב.";
  } catch (error: any) {
    console.error("Feedback AI Error:", error);
    return `שגיאה ביצירת המשוב: ${error.message}`;
  }
};

/**
 * Analyzes how the user's communication style affects their AI prompting.
 */
export const generatePromptAnalysis = async (scores: Scores, taskDescription: string, userPrompt: string): Promise<string> => {
  try {
    const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error("מפתח API חסר. אנא וודא שהגדרת את VITE_GEMINI_API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const sA = Number(scores?.a || 0);
    const sB = Number(scores?.b || 0);
    const sC = Number(scores?.c || 0);
    const sD = Number(scores?.d || 0);

    const r = sA + sC;
    const y = sA + sD;
    const g = sB + sD;
    const b = sB + sC;
    const colors = [{ n: 'אדום', v: r }, { n: 'צהוב', v: y }, { n: 'ירוק', v: g }, { n: 'כחול', v: b }].sort((m, n) => n.v - m.v);

    const mainColor = colors[0].n;

    const systemInstruction = `אתה מומחה להנדסת פרומפטים (Prompt Engineering) ויועץ תקשורת. המשתמש מנסה להפעיל סוכן AI (אותך) לביצוע המשימה: "${taskDescription}".
סגנון התקשורת האנושי של המשתמש מתאפיין בצבע ה${mainColor}.

לכל סגנון יש חוזקות וגם עיוורונות אופייניים בהנחיות ל-AI:
- אדומים: ישירים, מהירים, ממוקדי תוצאה — לפעמים קצרים מדי וחסרי קונטקסט לסוכן.
- כחולים: מדויקים, יסודיים, מובנים — לפעמים מעמיסים פרטים ואילוצים שמבלבלים.
- ירוקים: אמפתיים, שיתופיים, בעלי אינטליגנציה רגשית — לפעמים מפספסים מבנה ברור.
- צהובים: יצירתיים, אינטואיטיביים, בעלי חשיבה רחבה — לפעמים חסרי פוקוס ספציפי.

עליך לנתח את ה-Prompt הבא: "${userPrompt}"

החזר את הניתוח בפורמט Markdown הכולל:
1. ציון משוער (1-100) על יעילות ההנחיה לסוכן AI.
2. ניתוח: כיצד ה"צבע" של המשתמש בא לידי ביטוי — מה הוא הביא מהחוזקות שלו, ומה עלול להפריע לסוכן?
3. השלכה: איזו טעות קריטית ה-AI צפוי לעשות בגלל הפרומפט הזה במצבו הנוכחי.
4. שכתוב מומלץ: הצע פרומפט מיטבי עבור המשימה.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "אנא נתח את הפרומפט המצויין.",
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      },
    });

    return response.text || "לא התקבל ניתוח.";
  } catch (error: any) {
    console.error("AI Agent Simulator Error:", error);
    return `שגיאה בניתוח: ${error.message}`;
  }
};

/**
 * Transcribes audio using Gemini API — works on iOS and all browsers.
 */
export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
  try {
    const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
    if (!apiKey) throw new Error('מפתח API חסר.');

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: audioBase64,
              },
            },
            {
              text: 'תמלל את ההקלטה הבאה לעברית. החזר רק את הטקסט המתומלל, ללא כל הסבר. אם לא ניתן לתמלל, החזר מחרוזת ריקה.'
            }
          ],
        },
      ],
    });

    return (response.text || '').trim();
  } catch (error: any) {
    console.error('Transcription error:', error);
    throw new Error('שגיאה בתמלול: ' + error.message);
  }
};

/**
 * Translates text into a target language using Gemini.
 */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
  
  if (!apiKey) {
    throw new Error("מפתח API חסר. אנא וודא שהגדרת את VITE_GEMINI_API_KEY בסביבת העבודה.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: text,
      config: {
        systemInstruction: `You are a professional translator. 
        Translate the following text into ${targetLanguage}. 
        - Maintain the original tone, professionalism, and nuance.
        - Preserve ALL Markdown formatting (bold, lists, headers, etc.).
        - Return ONLY the translated text, with no explanations or extra tokens.
        - Even if the text contains intense emotions or direct language, translate it faithfully without filtering.
        - Ensure the translation feels native and high-quality.`,
        temperature: 0.3,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    });

    return result.text || "לא התקבלה תשובה.";
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

/**
 * Streams advice for a manager who is stuck in a situation.
 */
export const getStuckManagerAdviceStream = async (scores: Scores, situation: string, onChunk: (chunk: string) => void): Promise<string> => {
  try {
    const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined;
    if (!apiKey) throw new Error("מפתח API חסר.");

    const ai = new GoogleGenAI({ apiKey });

    const sA = Number(scores?.a || 0);
    const sB = Number(scores?.b || 0);
    const sC = Number(scores?.c || 0);
    const sD = Number(scores?.d || 0);

    const r = sA + sC;
    const y = sA + sD;
    const g = sB + sD;
    const b = sB + sC;
    const colors = [{ n: 'אדום', v: r }, { n: 'צהוב', v: y }, { n: 'ירוק', v: g }, { n: 'כחול', v: b }].sort((m, n) => n.v - m.v);

    const systemInstruction = `אתה יועץ מנהיגות ופסיכולוג ארגוני בכיר מבית Kilon Consulting. 
המשתמש שפונה אליך הוא מנהל שחווה כרגע הצפה רגשית, לחץ, קפאון או אובדן שליטה ("Amygdala Hijack"). 
סגנון התקשורת הדומיננטי שלו הוא ${colors[0].n} והמשני הוא ${colors[1].n}.

המצב הפנימי שהוא מתאר: "${situation}"

תפקידך הוא לשמש ככפתור חילוץ. עזור לו לחזור לשליטה ולתפקוד של קליפת המוח הקדם-מצחית (Prefrontal Cortex):
1. זיהוי ונרמול (Validation): שקף לו שמה שהוא חווה זו תגובת לחץ טבעית המאפיינת את סגנונו. למשל, במצב לחץ: אדום נוטה לתקוף/להתפוצץ, ירוק נוטה להימנע/לשתוק, כחול נוטה לקפוא/לחפור בפרטים, צהוב נוטה להתפזר/לברוח.
2. ויסות מיידי (Regulation): הצע פעולה קוגניטיבית או פיזית קצרה (נשימה, השהיה, שינוי מיקוד) המותאמת לו כדי לעצור את המחטף.
3. החזרת שליטה (Executive Function): הצע דרך פעולה אופרטיבית אחת, ברורה ושקולה להתמודדות עם המצב מתוך מודעות לסגנון שלו ולצבעים אחרים.
השתמש בשפה מרגיעה, מקצועית ואמפתית, בפורמט Markdown ברור ומסודר. אל תקטע את דבריך באמצע.`;

    const result = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: situation,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      },
    });

    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text;
      fullText += chunkText;
      onChunk(fullText);
    }

    return fullText;
  } catch (error: any) {
    console.error("Stuck Manager AI Stream Error:", error);
    throw error;
  }
};
