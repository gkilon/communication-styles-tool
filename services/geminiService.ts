import { GoogleGenAI } from "@google/genai";
import { Scores } from '../types';

// REFINED function for the ongoing chat
export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "שגיאה: מפתח ה-API של Gemini אינו מוגדר. לא ניתן לקבל ייעוץ מהמאמן הדיגיטלי.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const maxScore = 15 * 5;

  const systemInstruction = `
    אתה מאמן אישי ויועץ ארגוני מומחה, המתמחה בסגנונות תקשורת על פי מודל ארבעת הצבעים.
    המשתמש שאתה מדבר איתו סיים שאלון, וזהו תיאור פרופיל התקשורת המלא שלו:
    - נטייה למוחצנות (סגנונות אדום/צהוב): ציון ${scores.a} מתוך ${maxScore}.
    - נטייה למופנמות (סגנונות כחול/ירוק): ציון ${scores.b} מתוך ${maxScore}.
    - נטייה למשימתיות (סגנונות אדום/כחול): ציון ${scores.c} מתוך ${maxScore}.
    - נטייה לאנושיות (סגנונות צהוב/ירוק): ציון ${scores.d} מתוך ${maxScore}.
    
    אל תזכיר את הציונים המספריים בתשובותיך. השתמש במידע זה רק כדי להבין את הפרופיל שלו לעומק.

    כשאתה עונה על שאלות המשתמש, עליך לספק תשובות מקצועיות, מעשיות ומעצימות בעברית, בשפה קולחת ופשוטה.
    בסס את תשובותיך על **השילוב והאיזון** בין כל ארבעת הצבעים בפרופיל שלו, ולא רק על הסגנון הדומיננטי.
    לדוגמה, אם הוא שואל על עבודת צוות, התייחס לאופן שבו הנטיות השונות באישיותו (למשל, הנטייה שלו לתמוך באנשים לצד הנטייה שלו לנתח מידע) יכולות לתרום או להפריע.
    
    התשובות צריכות להיות מעוצבות ב-Markdown לקריאות נוחה.
    היה חיובי, תומך וממוקד בפתרונות.
    אל תזכיר שאתה מודל שפה או AI. דבר כמאמן מומחה.
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        // FIX: Per @google/genai guidelines, for a single user prompt with system instructions, `contents` can be a simple string.
        contents: userInput,
        config: {
            systemInstruction: systemInstruction,
        }
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "מצטער, חוויתי תקלה טכנית. אנא נסה שוב מאוחר יותר.";
  }
};