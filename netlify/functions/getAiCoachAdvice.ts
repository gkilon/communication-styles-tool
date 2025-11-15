
import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

// --- Analysis Logic (copied from services/analysisService.ts for self-containment) ---

interface Scores {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface Analysis {
  general: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
}

const colorData = {
  red: {
    name: "אדום",
    adjective: "הנחוש",
    general: "מנהיגות טבעית, נחישות ומיקוד במטרה. אתה מונחה תוצאות, אוהב אתגרים ולא חושש לקבל החלטות מהירות.",
    strengths: ["יכולת הנעת תהליכים", "החלטיות תחת לחץ", "תקשורת ישירה ויעילה", "חתירה למטרה"],
    weaknesses: ["חוסר סבלנות", "עלול להיתפס כשתלטן או אגרסיבי", "קושי בהקשבה לדעות שונות", "התמקדות ב'מה' על חשבון ה'איך'"],
    recommendation_focus: "לשלב את הנחישות עם הקשבה פעילה ואמפתיה"
  },
  yellow: {
    name: "צהוב",
    adjective: "המשפיע",
    general: "כריזמה, אופטימיות ויכולת להלהיב אחרים. אתה יצירתי, חברותי ושואב אנרגיה מאינטראקציה חברתית.",
    strengths: ["יצירת קשרים והשפעה חברתית", "הנעה באמצעות חזון והתלהבות", "חשיבה יצירתית וראיית התמונה הגדולה", "יצירת אווירה חיובית"],
    weaknesses: ["קושי בהתמודדות עם פרטים וסדר", "נטייה להימנע מקונפליקטים", "אופטימיות יתר שעלולה להוביל לחוסר תכנון", "זקוק להכרה ומשוב חיובי"],
    recommendation_focus: "לתרגם את הרעיונות הגדולים לתוכניות עבודה מעשיות"
  },
  green: {
    name: "ירוק",
    adjective: "התומך",
    general: "יציבות, הרמוניה וחשיבות עליונה ליחסים בינאישיים. אתה איש צוות מעולה, סבלני, יודע להקשיב ומהווה עוגן של תמיכה.",
    strengths: ["יכולת הקשבה ואמפתיה", "אמינות ויציבות", "גישור ופתרון קונפליקטיפ", "יצירת סביבת עבודה תומכת והרמונית"],
    weaknesses: ["הימנעות מקונפליקטים ועימותים", "התנגדות לשינויים פתאומיים", "קושי בקבלת החלטות מהירות", "נטייה לוותר על צרכים אישיים למען הקבוצה"],
    recommendation_focus: "להביע את דעתך ועמדותיך באופן אסרטיבי ומכבד"
  },
  blue: {
    name: "כחול",
    adjective: "המדויק",
    general: "חשיבה אנליטית, יסודיות ושאיפה לאיכות ללא פשרות. אתה מבוסס נתונים, מקפיד על פרטים, נהלים וסדר.",
    strengths: ["תכנון וארגון מעולים", "דיוק ותשומת לב לפרטים", "חשיבה לוגית ואנליטית", "שמירה על סטנדרטים גבוהים"],
    weaknesses: ["ביקורתיות יתר (עצמית וכלפי אחרים)", "שיתוק כתוצאה מעודף ניתוח (Analysis paralysis)", "עלול להיתפס כקר, מרוחק ופסימי", "קושי בגמישות ובאילתור"],
    recommendation_focus: "לאזן בין השאיפה לשלמות לבין הצורך להתקדם ולהיות פרגמטי"
  }
};

type Color = keyof typeof colorData;

const generateProfileAnalysis = (scores: Scores): Analysis => {
  const { a, b, c, d } = scores;
  const colorScores = { red: a + c, yellow: a + d, green: b + d, blue: b + c };
  const totalScore = Object.values(colorScores).reduce((sum, score) => sum + score, 0);

  if (totalScore === 0) {
    return {
      general: "לא ניתן היה לקבוע פרופיל דומיננטי. ייתכן שהתשובות היו מאוזנות לחלוטין.",
      strengths: "היכולת לראות את כל הצדדים באופן שווה.",
      weaknesses: "קושי בקבלת החלטה על נתיב פעולה מועדף.",
      recommendations: "נסה לבחון באילו מצבים אתה מרגיש יותר בנוח כדי לזהות נטיות טבעיות."
    };
  }

  const sortedColors = (Object.keys(colorScores) as Color[]).sort((colorA, colorB) => colorScores[colorB] - colorScores[colorA]);
  const [dominant, secondary, , weakest] = sortedColors;
  const dominantData = colorData[dominant];
  const secondaryData = colorData[secondary];
  const weakestData = colorData[weakest];
  const dominantPercentage = Math.round((colorScores[dominant] / totalScore) * 100);
  const secondaryPercentage = Math.round((colorScores[secondary] / totalScore) * 100);

  let general = `הפרופיל שלך מראה דומיננטיות של הסגנון ה${dominantData.name} (${dominantData.adjective}), המהווה כ-${dominantPercentage}% מהתמהיל. זה אומר שהנטייה הטבעית שלך היא לכיוון של ${dominantData.general.toLowerCase()}`;
  if (secondaryPercentage > 20) {
    general += ` הסגנון המשני הבולט שלך הוא ה${secondaryData.name} (${secondaryData.adjective}), התורם כ-${secondaryPercentage}% לפרופיל. שילוב זה מעניק לך גישה ייחודית.`;
  } else {
    general += " הפרופיל שלך ממוקד מאוד, מה שהופך את סגנון התקשורת שלך לעקבי וצפוי עבור אחרים."
  }
  
  let strengths = `החוזקות הבולטות שלך נובעות מהסגנון ה${dominantData.name}. אתה מצטיין ב${dominantData.strengths[0]} וב${dominantData.strengths[1]}.`;
  if (secondaryPercentage > 20) {
      strengths += ` הסגנון ה${secondaryData.name} מוסיף לכך ${secondaryData.strengths[0]} ו${secondaryData.strengths[1]}.`;
  }

  let weaknesses = `כל חוזקה מגיעה עם "צד צל". הדומיננטיות של סגנון ה${dominantData.name} עלולה להוביל לעיתים ל${dominantData.weaknesses[0]} או ${dominantData.weaknesses[1]}.`;
  weaknesses += ` המינון הנמוך יחסית של הסגנון ה${weakestData.name} בפרופיל שלך מצביע על כך שתכונות כמו ${weakestData.strengths[0]} ו${weakestData.strengths[1]} אינן הנטייה הטבעית שלך, ודורשות ממך מאמץ מודע יותר.`

  let recommendations = `כדי למקסם את הפוטנציאל שלך, התמקד ב${dominantData.recommendation_focus.toLowerCase()}.`;
  recommendations += ` המלצה מרכזית עבורך היא להגביר את המודעות לאיכויות של הסגנון ה${weakestData.name}. לדוגמה, נסה באופן יזום ${weakestData.recommendation_focus.toLowerCase()}, גם אם זה מרגיש פחות טבעי.`
  
  return { general, strengths, weaknesses, recommendations };
};


// --- Netlify Function Handler ---

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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "מפתח ה-API אינו מוגדר בשרת." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Request body is missing" }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
    const { scores, userInput } = JSON.parse(event.body);

    if (!scores || !userInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing scores or userInput in request" }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const maxScore = 15 * 5;

    // Generate the textual analysis to enrich the prompt
    const analysis = generateProfileAnalysis(scores);

    const systemInstruction = `
      אתה "אינספייר", מאמן אישי ויועץ ארגוני מומחה ברמה עולמית, המתמחה בסגנונות תקשורת על פי מודל ארבעת הצבעים של יונג.
      המשתמש שאתה מדבר איתו סיים שאלון, וזהו תיאור פרופיל התקשורת המלא שלו. השתמש בכל המידע הבא כדי לספק לו את הייעוץ המדויק והאישי ביותר.

      ### חלק א': ניתוח מילולי של פרופיל המשתמש (ההקשר החשוב ביותר):
      - **ניתוח כללי:** ${analysis.general}
      - **חוזקות עיקריות:** ${analysis.strengths}
      - **אזורים לפיתוח:** ${analysis.weaknesses}

      ### חלק ב': נתונים גולמיים של המשתמש (לעיון נוסף):
      - נטייה למוחצנות (סגנונות אדום/צהוב): ציון ${scores.a} מתוך ${maxScore}.
      - נטייה למופנמות (סגנונות כחול/ירוק): ציון ${scores.b} מתוך ${maxScore}.
      - נטייה למשימתיות (סגנונות אדום/כחול): ציון ${scores.c} מתוך ${maxScore}.
      - נטייה לאנושיות (סגנונות צהוב/ירוק): ציון ${scores.d} מתוך ${maxScore}.

      ### חלק ג': מאגר הידע שלך על מודל הצבעים (השתמש בידע זה כדי להעשיר את תשובותיך):
      **1. ארכיטיפים של הצבעים:**
      - **אדום (הקפטן):** מנהיג, ישיר, תחרותי, ממוקד מטרה. שואל "מה?".
      - **צהוב (הכוכב):** חברותי, יצירתי, אופטימי, משפיע. שואל "מי?".
      - **ירוק (הדיפלומט):** תומך, סבלני, מהימן, איש צוות. שואל "איך?".
      - **כחול (הפרופסור):** אנליטי, דייקן, מאורגן, שקול. שואל "למה?".

      **2. תקשורת יעילה עם כל סגנון:**
      - **עם אדום:** היה ישיר, תמציתי וממוקד בתוצאות. הצג אפשרויות, לא בעיות.
      - **עם צהוב:** היה חם, ידידותי והתמקד בחזון וברעיונות הגדולים. תן להם לדבר.
      - **עם ירוק:** היה סבלני, בנה אמון והדגש ביטחון ויציבות. שאל לדעתם.
      - **עם כחול:** היה מאורגן, מדויק ומגובה בנתונים. תן להם זמן לחשוב.

      **3. טיפים להתפתחות עבור כל סגנון:**
      - **אדום:** תרגל הקשבה פעילה, למד להאציל סמכויות, הראה הערכה לאחרים.
      - **צהוב:** התמקד בניהול זמן, שים לב לפרטים, תרגם רעיונות למשימות.
      - **ירוק:** למד להגיד 'לא', קבל החלטות מהר יותר, היה פתוח יותר לשינויים.
      - **כחול:** למד לקבל החלטות עם 80% מהמידע, היה פתוח יותר לרגשות, חגוג הצלחות.
      
      ### חלק ד': הנחיות כלליות לתשובותיך (חובה לעקוב):
      1. **זהות:** אתה 'אינספייר', מאמן מומחה. אל תזכיר שאתה מודל שפה או AI.
      2. **הקשר:** אל תחזור על הניתוח המילולי או הציונים המספריים. השתמש במידע זה כרקע בלבד כדי להבין את המשתמש לעומק.
      3. **מיקוד:** ענה על שאלת המשתמש באופן ישיר, מקצועי, מעשי ומעצים. ספק צעדים קונקרטיים לפעולה.
      4. **שפה:** השתמש בעברית עשירה, קולחת וחיובית.
      5. **מבנה:** עצב את התשובות ב-Markdown לקריאות נוחה (כותרות, רשימות, הדגשות וכו').
      6. **אינטגרציה:** כאשר אתה עונה, בסס את תשובתך על **השילוב הייחודי** של הצבעים בפרופיל המשתמש. לדוגמה, אם הוא אדום-כחול, הדגש איך הנחישות שלו יכולה להיתמך על ידי תכנון מדוקדק. אם הוא שואל על עבודה עם מישהו אחר, השתמש בידע מ"תקשורת יעילה עם כל סגנון".
      7. **סגנון:** גש ישר לעניין. אל תתחיל את התשובה בברכת שלום ("שלום לך") או פתיחה דומה. ספק את התשובה ישירות.
    `;
    
    const generateWithRetry = async (retries = 5, delay = 500) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: userInput,
              config: {
                  systemInstruction: systemInstruction,
              }
          });
          return response;
        } catch (error: any) {
          const errorMessage = error.message || String(error);
          const isOverloaded = errorMessage.includes('overloaded') || errorMessage.includes('503');

          if (isOverloaded && i < retries - 1) {
            console.log(`Model overloaded. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
            await new Promise(res => setTimeout(res, delay));
            delay *= 2; // Exponential backoff
          } else {
            throw error;
          }
        }
      }
      throw new Error("Failed to get response from AI after multiple retries.");
    };

    const response = await generateWithRetry();

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text }),
      headers: { 'Content-Type': 'application/json' },
    };

  } catch (error: any) {
    console.error("שגיאה בפונקציית Netlify (Node.js):", error);
    let userFriendlyError = "אירעה שגיאה פנימית בשרת.";
    
    const errorMessage = error.message || String(error);

    if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
        userFriendlyError = "מצטער, נראה שיש עומס על שירות ה-AI כרגע. אנא נסה שוב בעוד מספר דקות.";
    } else if (errorMessage.includes('API key not valid') || errorMessage.includes('permission denied')) {
        userFriendlyError = "מפתח ה-API שסופק אינו תקין או שאין לו הרשאות מתאימות. אנא ודא שהמפתח נכון ופעיל בחשבון Google AI Studio שלך.";
    } else if (errorMessage.includes('billing')) {
        userFriendlyError = "אירעה בעיית חיוב. אנא ודא שהחיוב (Billing) מופעל עבור פרויקט ה-Google Cloud המשויך למפתח ה-API שלך.";
    } else if (errorMessage.includes('User location is not supported')) {
        userFriendlyError = "המיקום שממנו אתה מנסה לגשת אינו נתמך כרגע על ידי ה-API.";
    } else {
         userFriendlyError = `אירעה שגיאה לא צפויה בעת התקשורת עם שירות ה-AI. פרטי השגיאה: ${errorMessage}`;
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: userFriendlyError }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
