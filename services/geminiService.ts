import { Scores, UserProfile } from '../types';

/**
 * Shared helper to call our Netlify Function backend.
 */
async function callGeminiApi(action: string, payload: any): Promise<any> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });

  if (!response.ok) {
    try {
      const err = await response.json();
      throw new Error(err.error || `Request failed with status ${response.status}`);
    } catch (e) {
      throw new Error(`Request failed with status ${response.status}`);
    }
  }

  return response;
}

/**
 * Shared helper for streaming responses from our Netlify Function.
 */
async function callGeminiApiStream(action: string, payload: any, onChunk: (chunk: string) => void): Promise<string> {
  const response = await callGeminiApi(action + 'Stream', payload);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Failed to get stream reader');

  let fullText = "";
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onChunk(fullText);
  }

  return fullText;
}

function getColorsFromScores(scores: Scores) {
  const sA = Number(scores?.a || 0);
  const sB = Number(scores?.b || 0);
  const sC = Number(scores?.c || 0);
  const sD = Number(scores?.d || 0);

  const r = sA + sC;
  const y = sA + sD;
  const g = sB + sD;
  const b = sB + sC;
  return [{ n: 'אדום', v: r }, { n: 'צהוב', v: y }, { n: 'ירוק', v: g }, { n: 'כחול', v: b }].sort((m, n) => n.v - m.v);
}

export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  try {
    const colors = getColorsFromScores(scores);
    const systemInstruction = `אתה מאמן תקשורת אישי וארגוני בכיר מבית Kilon Consulting. 
המשתמש שפונה אליך מאופיין במפת צבעים מוגדרת: צבע דומיננטי: ${colors[0].n}, צבע משני: ${colors[1].n}.

להלן מפת התכונות וההתנהגות של ארבעת הצבעים במודל Kilon Consulting:
- אדום (הנחוש): ממוקד תוצאות, ישיר, מהיר, החלטי, חסר סבלנות, עלול להיתפס כשתלטן או אגרסיבי, קושי בהקשבה לדעות שונות.
- צהוב (המשפיע): כריזמטי, אופטימי, יצירתי, חברותי, מתקשה עם פרטים וסדר, נטייה להימנע מקונפליקטים, זקוק להכרה.
- ירוק (התומך): אמפתי, מקשיב, סבלני, הרמוני, אמין, מתנגד לשינויים מהירים, נמנע מעימותים, נוטה לוותר על עצמו.
- כחול (המדויק): אנליטי, יסודי, מבוסס נתונים ופרטים, שאיפה לשלמות, ביקורתי, עלול להיתפס כמרוחק או קר.

הנחיות לאימון מותאם אישית:
1. התאם את העצות שאתה נותן בדיוק לפרופיל שלו (${colors[0].n} דומיננטי ו-${colors[1].n} משני) ולתוצאות השאלון שלו.
2. הצע לו דרכים פרקטיות כיצד להשתמש בחוזקות שלו כדי לשפר את התקשורת שלו עם סגנונות אחרים (למשל, איך אדום צריך לדבר עם ירוק, או איך כחול צריך לדבר עם צהוב).
3. הראה לו כיצד להתגבר על נקודות העיוורון הטבעיות של הצבע שלו.
4. ענה בצורה ממוקדת, פרקטית, בגובה העיניים וייחודית (תכלס). השתמש ב-Markdown, שמור על תשובות קצרות והימנע מהקדמות מריחות.`;

    const response = await callGeminiApi('generateContent', {
      model: "gemini-2.0-flash",
      contents: userInput,
      config: {
        systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    });

    const data = await response.json();
    return data.text || "לא התקבלה תשובה.";
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `שגיאה: ${error.message}`;
  }
};

export const getAiCoachAdviceStream = async (scores: Scores, userInput: string, onChunk: (chunk: string) => void): Promise<string> => {
    const colors = getColorsFromScores(scores);
    const systemInstruction = `אתה מאמן תקשורת אישי וארגוני בכיר מבית Kilon Consulting.
המשתמש שפונה אליך מאופיין במפת צבעים מוגדרת: צבע דומיננטי: ${colors[0].n}, צבע משני: ${colors[1].n}.

להלן מפת התכונות של ארבעת הצבעים במודל Kilon Consulting:
- אדום (הנחוש): ממוקד תוצאות, ישיר, מהיר, החלטי, חסר סבלנות, עלול להיתפס כשתלטן או אגרסיבי, קושי בהקשבה לדעות שונות.
- צהוב (המשפיע): כריזמטי, אופטימי, יצירתי, חברותי, מתקשה עם פרטים וסדר, נטייה להימנע מקונפליקטים, זקוק להכרה.
- ירוק (התומך): אמפתי, מקשיב, סבלני, הרמוני, אמין, מתנגד לשינויים מהירים, נמנע מעימותים, נוטה לוותר על עצמו.
- כחול (המדויק): אנליטי, יסודי, מבוסס נתונים ופרטים, שאיפה לשלמות, ביקורתי, עלול להיתפס כמרוחק או קר.

הנחיות לאימון מותאם אישית:
1. התאם את העצות שאתה נותן בדיוק לפרופיל שלו (${colors[0].n} דומיננטי ו-${colors[1].n} משני) ולתוצאות השאלון שלו.
2. הצע לו דרכים פרקטיות כיצד להשתמש בחוזקות שלו כדי לשפר את התקשורת שלו עם סגנונות אחרים.
3. הראה לו כיצד להתגבר על נקודות העיוורון הטבעיות של הצבע שלו.
4. ענה בצורה ממוקדת, פרקטית, בגובה העיניים וייחודית (תכלס). השתמש ב-Markdown, שמור על תשובות קצרות והימנע מהקדמות מריחות.`;

    return callGeminiApiStream('generateContent', {
      model: "gemini-2.0-flash",
      contents: userInput,
      config: {
        systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    }, onChunk);
};

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

    const systemInstruction = `אתה יועץ ארגוני בכיר מבית Kilon Consulting. נתח את אתגר הצוות הבא על בסיס מודל ארבעת הצבעים.
להלן מפת הצבעים המשמשת אותך לניתוח:
- אדום (הנחוש): ממוקד תוצאות, ישיר, מניע תהליכים, חסר סבלנות, עלול להיתפס כשתלטן או אגרסיבי, קושי בהקשבה לדעות שונות.
- צהוב (המשפיע): כריזמטי, אופטימי, יצירתי, חברותי, קושי עם פרטים וסדר, נטייה להימנע מקונפליקטים, זקוק להכרה.
- ירוק (התומך): יציב, אמפתי, סבלני, הרמוני, אמין, נמנע מעימותים, נוטה לוותר על עצמו, מתנגד לשינויים מהירים.
- כחול (המדויק): אנליטי, יסודי, מבוסס נתונים ופרטים, שאיפה לשלמות, ביקורתי, עלול להיתפס כמרוחק או קר.

נתוני הצוות (סה"כ ${teamStats.total} משתתפים):
- אדום: ${teamStats.red}
- צהוב: ${teamStats.yellow}
- ירוק: ${teamStats.green}
- כחול: ${teamStats.blue}

האתגר שהוצג: "${challenge}"

מבנה התשובה הנדרש (בעברית, פורמט Markdown):
1. ניתוח דינמיקה: מדוע הרכב הצבעים הנוכחי חווה את האתגר הזה? כיצד הצבע הדומיננטי בצוות והצבע החסר משפיעים על המצב?
2. נקודות עיוורון: מה הצוות מפספס בגלל הרכב הצבעים שלו?
3. 3 המלצות פרקטיות ומידיות לשיפור המצב המתאימות ספציפית לצבעים השונים בצוות.
חשוב: ענה בצורה מפורטת ומלאה. אל תעצור באמצע.`;

    const response = await callGeminiApi('generateContent', {
      model: "gemini-2.0-flash",
      contents: challenge,
      config: {
        systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    });

    const data = await response.json();
    return data.text || "לא התקבל ניתוח.";
  } catch (error: any) {
    console.error("Team AI Error:", error);
    return `שגיאה בניתוח הצוות: ${error.message}`;
  }
};

export const getTeamAiAdviceStream = async (users: UserProfile[], challenge: string, onChunk: (chunk: string) => void): Promise<string> => {
    const validUsers = users.filter(u => u.scores);
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

    const systemInstruction = `אתה יועץ ארגוני בכיר מבית Kilon Consulting. נתח את אתגר הצוות הבא על בסיס מודל ארבעת הצבעים.
להלן מפת הצבעים המשמשת אותך לניתוח:
- אדום (הנחוש): ממוקד תוצאות, ישיר, מניע תהליכים, חסר סבלנות, עלול להיתפס כשתלטן או אגרסיבי, קושי בהקשבה לדעות שונות.
- צהוב (המשפיע): כריזמטי, אופטימי, יצירתי, חברותי, קושי עם פרטים וסדר, נטייה להימנע מקונפליקטים, זקוק להכרה.
- ירוק (התומך): יציב, אמפתי, סבלני, הרמוני, אמין, נמנע מעימותים, נוטה לוותר על עצמו, מתנגד לשינויים מהירים.
- כחול (המדויק): אנליטי, יסודי, מבוסס נתונים ופרטים, שאיפה לשלמות, ביקורתי, עלול להיתפס כמרוחק או קר.

נתוני הצוות (סה"כ ${teamStats.total} משתתפים):
- אדום: ${teamStats.red}
- צהוב: ${teamStats.yellow}
- ירוק: ${teamStats.green}
- כחול: ${teamStats.blue}

האתגר שהוצג: "${challenge}"

מבנה התשובה הנדרש (בעברית, פורמט Markdown):
1. ניתוח דינמיקה: מדוע הרכב הצבעים הנוכחי חווה את האתגר הזה? כיצד הצבע הדומיננטי בצוות והצבע החסר משפיעים על המצב?
2. נקודות עיוורון: מה הצוות מפספס בגלל הרכב הצבעים שלו?
3. 3 המלצות פרקטיות ומידיות לשיפור המצב המתאימות ספציפית לצבעים השונים בצוות.`;

    return callGeminiApiStream('generateContent', {
      model: "gemini-2.0-flash",
      contents: challenge,
      config: {
        systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    }, onChunk);
};

export interface SimulationMessage {
  sender: 'user' | 'ai';
  text: string;
}

export const getSimulationResponse = async (scores: Scores, targetColor: string, scenario: string, history: SimulationMessage[], userInput: string): Promise<string> => {
  try {
    const colors = getColorsFromScores(scores);
    
    const colorBehaviors: Record<string, string> = {
      'אדום': 'התנהג כטיפוס אדום (הנחוש): דבר בצורה ישירה, קצרה, ממוקדת במטרה וחלקה. היה אסרטיבי, ממוקד תוצאות, ענייני מאוד (תכלס), ואולי מעט חסר סבלנות לפרטים קטנים או למילים רכות. השתמש במשפטים קצרים ומעשיים.',
      'צהוב': 'התנהג כטיפוס צהוב (המשפיע): דבר בצורה אנרגטית, חברותית, מתלהבת, פתוחה ויצירתית. השתמש בסימני קריאה, הבע רגש, התמקד בקשר האישי ובחזון הכללי, והימנע מצלילה לפרטים טכניים או סדר ונהלים.',
      'ירוק': 'התנהג כטיפוס ירוק (התומך): דבר בצורה אמפתית, סבלנית, שיתופית, נעימה ומכילה. שים דגש על הרמוניה, שאל לשלומו של המשתמש, הקשב וחשוב על יחסים בינאישיים מעולים. הימנע מעימותים או ישירות בוטה.',
      'כחול': 'התנהג כטיפוס כחול (המדויק): דבר בצורה אנליטית, יסודית, שקולה, מנומסת ומבוססת נתונים ופרטים. היה ענייני, מסודר, לוגי, והצג שאלות מדויקות. הימנע מביטויי רגש מוגזמים או מהבטחות לא מבוססות.'
    };
    const targetBehavior = colorBehaviors[targetColor] || `דבר בהתאם למאפייני סגנון ה-${targetColor}.`;

    const systemInstruction = `אתה משחק תפקיד של עמית לעבודה (קולגה) בעל סגנון תקשורת מובהק בצבע ${targetColor}.
המשתמש שפונה אליך הוא עם סגנון תקשורת שבו הצבע הדומיננטי הוא ${colors[0].n}.
התרחיש שאתם נמצאים בו כרגע הוא: "${scenario}".

הנחיית התנהגות קריטית עבורך:
${targetBehavior}

הנחיות טכניות למשחק תפקידים:
1. אל תיתן שום הסבר, הקדמה או הערה מחוץ לדמות!
2. ענה רק ובדיוק בתור הדמות.
3. שמור על תגובות קצרות, טבעיות ומציאותיות (תגובה אחת או שתיים קצרות, כמו בשיחה אמיתית במשרד או בצ'אט).`;

    const conversationLog = history.map(m => `${m.sender === 'user' ? 'משתמש' : 'אתה (הקולגה)'}: ${m.text}`).join('\n\n');
    const prompt = `היסטוריית השיחה עד כה:\n${conversationLog}\n\nהמשתמש כעת אומר:\n${userInput}\n\nהגב עכשיו מתוך הדמות (ללא הסברים מחוץ לדמות):`;

    const response = await callGeminiApi('generateContent', {
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    });

    const data = await response.json();
    return data.text || "לא התקבלה תשובה מהסימולטור.";
  } catch (error: any) {
    console.error("Simulation AI Error:", error);
    return `שגיאה בסימולציה: ${error.message}`;
  }
};

export const getSimulationFeedback = async (targetColor: string, scenario: string, history: SimulationMessage[]): Promise<string> => {
  try {
    const conversationLog = history.map(m => `${m.sender === 'user' ? 'משתמש' : 'הקולגה (צבע ' + targetColor + ')'}: ${m.text}`).join('\n\n');
    
    const colorFeedbackRules: Record<string, string> = {
      'אדום': 'זכור שטיפוס אדום (הנחוש) מעריך קצר ולעניין, ישירות, ביטחון ותכלס. הוא מתעצבן מגישושים ארוכים, היסוסים או רגשנות יתר. נתח האם המשתמש היה ענייני וישיר מספיק, או מרח את השיחה.',
      'צהוב': 'זכור שטיפוס צהוב (המשפיע) מעריך התלהבות, קשר אישי, יצירתיות ואנרגיה חיובית. הוא נרתע מפרטים יבשים, נהלים נוקשים או ביקורתיות. נתח האם המשתמש השתמש באנרגיה חיובית וחיזק את הקשר, או היה יבש מדי.',
      'ירוק': 'זכור שטיפוס ירוק (התומך) מעריך אמפתיה, הקשבה פעילה, סבלנות והסכמה הדדית. הוא נרתע מלחץ מוגזם, ישירות בוטה או תוקפנות. נתח האם המשתמש היה סבלני ומקשיב, או הפעיל לחץ אגרסיבי.',
      'כחול': 'זכור שטיפוס כחול (המדויק) מעריך עובדות, נתונים, סדר, לוגיקה ויסודיות. הוא נרתע מסיסמאות ללא כיסוי, חוסר דיוק או חביבות מוגזמת ולא עניינית. נתח האם המשתמש היה מדויק ולוגי, או דיבר בסיסמאות לא מבוססות.'
    };
    const targetRules = colorFeedbackRules[targetColor] || "";

    const prompt = `קרא את השיחה הבאה שנערכה בסימולטור מקרי בוחן. 
התרחיש: "${scenario}".
הקולגה איתו שוחח המשתמש הוא בעל סגנון תקשורת בצבע: "${targetColor}".

כללי הניתוח של הסגנון ה${targetColor}:
${targetRules}

השיחה שהתנהלה:
${conversationLog}

אנא כתוב משוב בונה וממוקד מאוד בעברית בפורמט Markdown. 
מבנה המשוב הנדרש:
1. 💡 **הסבר קצר על הטיפוס ה${targetColor}:** הסבר בקצרה למשתמש איך טיפוס ${targetColor} חושב, מה מאפיין אותו ומה מניע אותו בתקשורת.
2. ✅ **מה עבד טוב בשיחה?** (ציין מה בדיוק המשתמש עשה טוב שהתאים לצבע ה${targetColor}, תחת אילו תנאים הוא הצליח לייצר איתו חיבור, וציין דוגמה ספציפית מהשיחה).
3. 🎯 **מה יצר חיכוך / מה ניתן לחדד?** (ציין היכן הגישה של המשתמש יצרה חיכוך עם סגנון ה${targetColor}, למשל רגשנות יתר מול אדום, חוסר סבלנות מול ירוק, או דיבור בסיסמאות מול כחול. הבא דוגמה ספציפית מהשיחה).
4. 🚀 **שורה תחתונה וטיפ זהב לפעם הבאה:** המלצה פרקטית אחת ברורה ומעשית.`;

    const response = await callGeminiApi('generateContent', {
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
      }
    });

    const data = await response.json();
    return data.text || "לא ניתן היה לייצר משוב.";
  } catch (error: any) {
    console.error("Feedback AI Error:", error);
    return `שגיאה ביצירת המשוב: ${error.message}`;
  }
};

export const generatePromptAnalysis = async (scores: Scores, taskDescription: string, userPrompt: string): Promise<string> => {
  try {
    const colors = getColorsFromScores(scores);
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

    const response = await callGeminiApi('generateContent', {
      model: "gemini-2.0-flash",
      contents: "אנא נתח את הפרומפט המצויין.",
      config: {
        systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    });

    const data = await response.json();
    return data.text || "לא התקבל ניתוח.";
  } catch (error: any) {
    console.error("AI Agent Simulator Error:", error);
    return `שגיאה בניתוח: ${error.message}`;
  }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
  try {
    const response = await callGeminiApi('generateContent', {
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: 'תמלל את ההקלטה הבאה לעברית. החזר רק את הטקסט המתומלל, ללא כל הסבר.' }
          ]
        }
      ]
    });

    const data = await response.json();
    return (data.text || '').trim();
  } catch (error: any) {
    console.error('Transcription error:', error);
    throw new Error('שגיאה בתמלול: ' + error.message);
  }
};

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    const response = await callGeminiApi('generateContent', {
      model: "gemini-2.0-flash",
      contents: text,
      config: {
        systemInstruction: `You are a professional translator. Translate the following text into ${targetLanguage}.`,
        temperature: 0.3,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    });

    const data = await response.json();
    return data.text || "לא התקבלה תשובה.";
  } catch (error: any) {
    console.error("Translation error:", error);
    throw error;
  }
}

export const getStuckManagerAdviceStream = async (scores: Scores, situation: string, onChunk: (chunk: string) => void): Promise<string> => {
    const colors = getColorsFromScores(scores);
    const systemInstruction = `אתה יועץ מנהיגות ופסיכולוג ארגוני בכיר מבית Kilon Consulting. 
המנהל שפונה אליך מאופיין בצבע דומיננטי ${colors[0].n} ומשני ${colors[1].n}.

להלן מפת התכונות והתנהגות הלחץ של ארבעת הצבעים במותג Kilon Consulting:
- אדום (הנחוש): תחת לחץ נוטה להיות חסר סבלנות, תוקפני, דורש שליטה מיידית. זקוק לוויסות של נשימה והקשבה.
- צהוב (המשפיע): תחת לחץ נוטה להתפזר, לאבד פוקוס, להיכנס לפאניקה חברתית או להימנע מהבעיה. זקוק למיקוד ותוכנית עבודה מסודרת.
- ירוק (התומך): תחת לחץ נוטה להסתגר, לשתוק, להיפגע רגשית ולוותר על הצרכים שלו. זקוק לאסרטיביות וביטחון.
- כחול (המדויק): תחת לחץ נוטה לשיתוק מניתוח יתר (Analysis paralysis), להיעשות קר, נוקשה וביקורתי בצורה מוגזמת. זקוק להרפיה ופרגמטיות.

המצב שבו הוא תקוע: "${situation}"

תפקידך הוא לשמש ככפתור חילוץ מהיר ומותאם אישית לפרופיל שלו (${colors[0].n} ו-${colors[1].n}). אל תאריך בניתוח תיאורטי, התמקד ב"תכלס":
1. שיקוף קצר ונרמול (Validation) - דבר אל הלב של הפרופיל שלו.
2. פעולה מיידית לוויסות רגשי/פיזיולוגי המתאימה לפרופיל שלו.
3. 3 המלצות "תכלס" לפעולה מיידית כדי לחלץ אותו מהמצב.`;

    return callGeminiApiStream('generateContent', {
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: situation }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    }, onChunk);
};
