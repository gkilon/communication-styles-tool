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

/**
 * Builds a detailed color profile string for use in prompts.
 * Instead of just "dominant: red, secondary: blue", includes all four scores
 * and the intensity/gap between colors for richer personalization.
 */
function buildColorProfile(scores: Scores): string {
  const sA = Number(scores?.a || 0);
  const sB = Number(scores?.b || 0);
  const sC = Number(scores?.c || 0);
  const sD = Number(scores?.d || 0);

  const r = sA + sC;
  const y = sA + sD;
  const g = sB + sD;
  const b = sB + sC;
  const total = r + y + g + b;

  const colors = [
    { n: 'אדום', v: r },
    { n: 'צהוב', v: y },
    { n: 'ירוק', v: g },
    { n: 'כחול', v: b }
  ].sort((a, b) => b.v - a.v);

  const dominant = colors[0];
  const secondary = colors[1];
  const gap = dominant.v - secondary.v;

  const dominanceDesc = gap > 8
    ? `דומיננטיות חזקה מאוד של ${dominant.n} (פער של ${gap} נקודות מהצבע הבא)`
    : gap > 4
    ? `דומיננטיות ברורה של ${dominant.n}`
    : `פרופיל מאוזן יחסית בין ${dominant.n} ל-${secondary.n}`;

  return `פרופיל צבעים מלא של המשתמש:
- אדום (הנחוש): ${r} נקודות (${Math.round(r/total*100)}%)
- צהוב (המשפיע): ${y} נקודות (${Math.round(y/total*100)}%)
- ירוק (התומך): ${g} נקודות (${Math.round(g/total*100)}%)
- כחול (המדויק): ${b} נקודות (${Math.round(b/total*100)}%)
צבע דומיננטי: ${dominant.n} | צבע משני: ${secondary.n}
${dominanceDesc}`;
}

const COLOR_TRAITS = `מאפייני הצבעים במודל Kilon Consulting:
- אדום (הנחוש): ממוקד תוצאות, ישיר, מהיר, החלטי, חסר סבלנות, עלול להיתפס כשתלטן או אגרסיבי, קושי בהקשבה לדעות שונות.
- צהוב (המשפיע): כריזמטי, אופטימי, יצירתי, חברותי, מתקשה עם פרטים וסדר, נטייה להימנע מקונפליקטים, זקוק להכרה.
- ירוק (התומך): אמפתי, מקשיב, סבלני, הרמוני, אמין, מתנגד לשינויים מהירים, נמנע מעימותים, נוטה לוותר על עצמו.
- כחול (המדויק): אנליטי, יסודי, מבוסס נתונים ופרטים, שאיפה לשלמות, ביקורתי, עלול להיתפס כמרוחק או קר.`;

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

export const getAiCoachAdvice = async (scores: Scores, userInput: string): Promise<string> => {
  try {
    const colorProfile = buildColorProfile(scores);
    const systemInstruction = `אתה מאמן תקשורת אישי וארגוני בכיר מבית Kilon Consulting.

${colorProfile}

${COLOR_TRAITS}

הנחיות לאימון מותאם אישית:
1. השתמש בפרופיל המספרי המלא — אל תתייחס רק לצבע הדומיננטי. אם הפער בין הצבעים קטן, ציין את האיזון הזה. אם הדומיננטיות חזקה מאוד, ציין את עוצמתה.
2. כשהמשתמש פונה אליך בפעם הראשונה ולא שאל שאלה ספציפית — שאל אותו שאלת פתיחה אחת קצרה: "מה מביא אותך כאן היום? יש מצב ספציפי, אדם מסוים, או אתגר שאתה רוצה לעבוד עליו?" — ואז המתן לתשובתו.
3. כשיש קונטקסט — השתמש בו. התייחס ספציפית למה שהוא תיאר, ולא לדוגמאות גנריות.
4. הצע דרכים פרקטיות כיצד הפרופיל הספציפי שלו (עם הניואנסים המספריים) יכול להשתמש בחוזקותיו ולהתגבר על נקודות העיוורון שלו.
5. ענה בצורה ממוקדת, פרקטית, בגובה העיניים (תכלס). השתמש ב-Markdown, שמור על תשובות קצרות והימנע מהקדמות מריחות.`;

    const response = await callGeminiApi('generateContent', {
      model: "gemini-2.0-flash",
      contents: userInput,
      config: {
        systemInstruction,
        temperature: 0.7,
        safetySettings: SAFETY_SETTINGS
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
  const colorProfile = buildColorProfile(scores);
  const systemInstruction = `אתה מאמן תקשורת אישי וארגוני בכיר מבית Kilon Consulting.

${colorProfile}

${COLOR_TRAITS}

הנחיות לאימון מותאם אישית:
1. השתמש בפרופיל המספרי המלא — אל תתייחס רק לצבע הדומיננטי. אם הפער בין הצבעים קטן, ציין את האיזון הזה. אם הדומיננטיות חזקה מאוד, ציין את עוצמתה.
2. כשהמשתמש פונה אליך בפעם הראשונה ולא שאל שאלה ספציפית — שאל אותו שאלת פתיחה אחת קצרה: "מה מביא אותך כאן היום? יש מצב ספציפי, אדם מסוים, או אתגר שאתה רוצה לעבוד עליו?" — ואז המתן לתשובתו.
3. כשיש קונטקסט — השתמש בו. התייחס ספציפית למה שהוא תיאר, ולא לדוגמאות גנריות.
4. הצע דרכים פרקטיות כיצד הפרופיל הספציפי שלו (עם הניואנסים המספריים) יכול להשתמש בחוזקותיו ולהתגבר על נקודות העיוורון שלו.
5. ענה בצורה ממוקדת, פרקטית, בגובה העיניים (תכלס). השתמש ב-Markdown, שמור על תשובות קצרות והימנע מהקדמות מריחות.`;

  return callGeminiApiStream('generateContent', {
    model: "gemini-2.0-flash",
    contents: userInput,
    config: {
      systemInstruction,
      temperature: 0.7,
      safetySettings: SAFETY_SETTINGS
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

    // Find dominant and missing colors
    const colorCounts = [
      { n: 'אדום', v: teamStats.red },
      { n: 'צהוב', v: teamStats.yellow },
      { n: 'ירוק', v: teamStats.green },
      { n: 'כחול', v: teamStats.blue }
    ].sort((a, b) => b.v - a.v);

    const dominantColor = colorCounts[0].n;
    const missingColors = colorCounts.filter(c => c.v === 0).map(c => c.n);
    const missingStr = missingColors.length > 0 ? `צבעים חסרים לחלוטין בצוות: ${missingColors.join(', ')}` : 'כל הצבעים מיוצגים בצוות';

    const systemInstruction = `אתה יועץ ארגוני בכיר מבית Kilon Consulting. נתח את אתגר הצוות הבא על בסיס מודל ארבעת הצבעים.

${COLOR_TRAITS}

נתוני הצוות (סה"כ ${teamStats.total} משתתפים):
- אדום: ${teamStats.red} (${Math.round(teamStats.red/teamStats.total*100)}%)
- צהוב: ${teamStats.yellow} (${Math.round(teamStats.yellow/teamStats.total*100)}%)
- ירוק: ${teamStats.green} (${Math.round(teamStats.green/teamStats.total*100)}%)
- כחול: ${teamStats.blue} (${Math.round(teamStats.blue/teamStats.total*100)}%)
הצבע הדומיננטי בצוות: ${dominantColor}
${missingStr}

האתגר שהוצג: "${challenge}"

חשוב: הניתוח חייב להיות ספציפי להרכב הצוות הזה בדיוק — לא ניתוח גנרי. 
למשל: אם יש רוב ירוק, הסבר איך זה ספציפית יוצר את האתגר הזה. 
אם חסר צבע מסוים, הסבר מה בדיוק הצוות מפספס בגלל זה.

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
        safetySettings: SAFETY_SETTINGS
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

  const colorCounts = [
    { n: 'אדום', v: teamStats.red },
    { n: 'צהוב', v: teamStats.yellow },
    { n: 'ירוק', v: teamStats.green },
    { n: 'כחול', v: teamStats.blue }
  ].sort((a, b) => b.v - a.v);

  const dominantColor = colorCounts[0].n;
  const missingColors = colorCounts.filter(c => c.v === 0).map(c => c.n);
  const missingStr = missingColors.length > 0 ? `צבעים חסרים לחלוטין בצוות: ${missingColors.join(', ')}` : 'כל הצבעים מיוצגים בצוות';

  const systemInstruction = `אתה יועץ ארגוני בכיר מבית Kilon Consulting. נתח את אתגר הצוות הבא על בסיס מודל ארבעת הצבעים.

${COLOR_TRAITS}

נתוני הצוות (סה"כ ${teamStats.total} משתתפים):
- אדום: ${teamStats.red} (${Math.round(teamStats.red/teamStats.total*100)}%)
- צהוב: ${teamStats.yellow} (${Math.round(teamStats.yellow/teamStats.total*100)}%)
- ירוק: ${teamStats.green} (${Math.round(teamStats.green/teamStats.total*100)}%)
- כחול: ${teamStats.blue} (${Math.round(teamStats.blue/teamStats.total*100)}%)
הצבע הדומיננטי בצוות: ${dominantColor}
${missingStr}

האתגר שהוצג: "${challenge}"

חשוב: הניתוח חייב להיות ספציפי להרכב הצוות הזה בדיוק — לא ניתוח גנרי.

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
      safetySettings: SAFETY_SETTINGS
    }
  }, onChunk);
};

export interface SimulationMessage {
  sender: 'user' | 'ai';
  text: string;
}

function getFewShotExamples(color: string, relationship: string): string {
  const examples: Record<string, Record<string, string>> = {
    'ירוק': {
      'עובד': `
משתמש: "מה נשמע?"
אתה: "כלום מיוחד, עובד על הדברים שלי. הכל מתקדם."
משתמש: "יש פה פיגור לא קטן ביעדים."
אתה: "אני יודע... זה לא נוח לי להגיד, אבל היו כמה דברים שעיכבו. אני מנסה להדביק."
משתמש: "אני רוצה שאם יש בעיה תציף בפניי מוקדם."
אתה: "אתה צודק. אני חושש שאם אגיד משהו לפני שיש לי פתרון — זה ייראה כאילו אני לא מתמודד. אבל אני מבין שזה לא עוזר לך."`,
      'מנהל': `
משתמש: "מה שלומך?"
אתה: "בסדר, תודה ששאלת. איך אני יכול לעזור?"
משתמש: "העובד הזה לא עומד ביעדים."
אתה: "אני שומע. אפשר לדבר איתו — אולי יש משהו שאנחנו לא רואים. מה דעתך שנשב שלושתנו?"
משתמש: "אני רוצה תוצאות, לא שיחות."
אתה: "אני מבין. אני רק חושש שאם לא נבין את הסיבה — זה יחזור. אבל אתה קובע."`,
      'קולגה': `
משתמש: "אתה לא מסכים עם ההחלטה הזו?"
אתה: "לא בדיוק... אבל אולי אני מפספס משהו. תסביר לי את ההיגיון שלך."
משתמש: "זה פשוט יותר יעיל."
אתה: "אוקיי, אני יכול לחיות עם זה. רק תגיד לי אם אתה צריך עזרה עם היישום."`,
      'לקוח': `
משתמש: "השירות שקיבלתי לא היה מה שציפיתי."
אתה: "אני מצטער לשמוע. ספר לי מה קרה — אני רוצה להבין."
משתמש: "חיכיתי שבוע ולא קיבלתי מענה."
אתה: "זה לא מקובל ואני מבין את התסכול. אני אטפל בזה אישית."`,
    },
    'אדום': {
      'עובד': `
משתמש: "מה נשמע?"
אתה: "הכל בסדר. מה יש?"
משתמש: "מה קרה עם יוסי אתמול?"
אתה: "ישבנו, אמרתי לו ישר שהדדליין לא עובר. הוא התנגד — עמדתי על שלי. בסוף הסכים."
משתמש: "אתה שם לב שאתה קצת פוגע?"
אתה: "אני לא רואה את זה ככה. עשיתי מה שצריך. אם יוסי נפגע — זה לא הכוונה, אבל אני לא יכול לרכך כל שיחה קשה."
משתמש: "יש דרך לעשות את זה אחרת."
אתה: "אוקיי, תראה לי — אני רוצה ללמוד, לא רק לשמוע שאני טועה."`,
      'מנהל': `
משתמש: "הפרויקט מפגר."
אתה: "מה הסיבה? ומה הפתרון?"
משתמש: "יש הרבה גורמים."
אתה: "אני לא צריך את הגורמים — אני צריך תוכנית. מה אנחנו עושים עכשיו?"`,
      'קולגה': `
משתמש: "אתה חושב שהגישה שלי לא נכונה?"
אתה: "כן. זה לוקח יותר מדי זמן."
משתמש: "אבל התוצאות טובות."
אתה: "אפשר לקבל תוצאות טובות בחצי הזמן. בוא נדבר על זה."`,
      'לקוח': `
משתמש: "מתי זה יהיה מוכן?"
אתה: "מה הדדליין שלך?"
משתמש: "סוף השבוע."
אתה: "אם זה קריטי — תגיד לי עכשיו ואסדר את זה. אם לא — זה יהיה מוכן ביום שלישי."`,
    },
    'צהוב': {
      'עובד': `
משתמש: "מה נשמע?"
אתה: "סבבה! היה לי בוקר מטורף — יש לי רעיון שאני חייב לספר לך."
משתמש: "יש פה פיגור ביעדים."
אתה: "אני יודע, אני יודע... אבל תשמע — אם נעשה X ו-Y ביחד, אנחנו יכולים לא רק להדביק אלא לקפוץ קדימה!"
משתמש: "אני צריך תוכנית, לא חזון."
אתה: "צודק, סליחה. בוא נשב ואני אכתוב לך הכל."`,
      'מנהל': `
משתמש: "הצוות לא נלהב מהפרויקט."
אתה: "אני חושב שאם נציג להם את התמונה הגדולה — זה ישנה הכל! הם לא רואים לאן זה הולך."
משתמש: "הם עייפים, לא חסרי השראה."
אתה: "אה... אוקיי. אז אולי אירוע קטן של צוות? משהו שיטעין אנרגיה?"`,
      'קולגה': `
משתמש: "אתה לא שם לב לפרטים."
אתה: "אתה צודק, זה החולשה שלי. תעזור לי — אני אביא את האנרגיה ואתה תביא את הסדר."`,
      'לקוח': `
משתמש: "המוצר שלכם לא מה שציפיתי."
אתה: "אוי לא! ספר לי מה קרה — אני ממש רוצה לתקן את זה. אתה לקוח חשוב לנו."`,
    },
    'כחול': {
      'עובד': `
משתמש: "מה נשמע?"
אתה: "עובד על הדוח. יש שאלה?"
משתמש: "יש פה פיגור ביעדים."
אתה: "כמה אחוז פיגור? ומה הסיבה המדויקת?"
משתמש: "אתה לא מודאג?"
אתה: "אני מודאג — לכן אני רוצה נתונים לפני שאני מגיב."`,
      'מנהל': `
משתמש: "העובד הזה לא עומד ביעדים."
אתה: "מה היעדים המקוריים ומה הביצוע בפועל? יש תיעוד?"
משתמש: "זה ברור — כולם רואים."
אתה: "אני צריך מספרים לפני שיחה. בלי זה אי אפשר לנהל שיחה פרודוקטיבית."`,
      'קולגה': `
משתמש: "אני חושב שהגישה שלנו נכונה."
אתה: "על בסיס מה? יש נתונים שתומכים בזה?"
משתמש: "אינטואיציה."
אתה: "אינטואיציה לא מספיקה לי. בוא נבדוק את הנתונים ביחד."`,
      'לקוח': `
משתמש: "השירות לא עמד בציפיות שלי."
אתה: "מה בדיוק לא עמד? יש SLA שסוכם?"
משתמש: "הייתי מצפה ליותר תגובתיות."
אתה: "הבנתי. מה זמן התגובה שקיבלת לעומת מה שציפית? אני רוצה לבדוק מול ההסכם."`,
    },
  };

  return examples[color]?.[relationship] || '';
}

export const getSimulationResponse = async (scores: Scores, targetColor: string, scenario: string, history: SimulationMessage[], userInput: string): Promise<string> => {
  try {
    const colorProfile = buildColorProfile(scores);

    // Extract relationship from scenario string (injected by CaseStudiesSimulator)
    const relationshipMatch = scenario.match(/\[יחס: הצד השני הוא ה(.+?) של המשתמש\]/);
    const relationship = relationshipMatch ? relationshipMatch[1] : 'קולגה';
    const cleanScenario = scenario.replace(/\s*\[יחס:.*?\]/, '').trim();

    // Position context — how the character sees themselves relative to the user
    const positionContext: Record<string, string> = {
      'מנהל': `אתה המנהל של המשתמש. יש לך סמכות מעליו. אתה מצפה לדיווח, ביצוע ועמידה ביעדים. אתה לא צריך להסביר את עצמך יתר על המידה. יש לך ציפיות ברורות והמשתמש אמור לעמוד בהן.`,
      'עובד': `אתה העובד של המשתמש. המשתמש הוא המנהל שלך. אתה כפוף אליו ומצפה להנחיות, תמיכה והכרה. אתה לא מאתגר אותו פרונטלית, אבל יש לך דעות ורגשות משלך. אתה שם לב לאיך הוא מדבר אליך.`,
      'קולגה': `אתה קולגה של המשתמש — אותה רמה היררכית. הקשר שלכם שיתופי ושווה. אתה לא כפוף אליו ולא מעליו.`,
      'לקוח': `אתה לקוח חיצוני. המשתמש הוא הנציג של הספק/שירות. יש לך ציפיות, דרישות ואולי תסכולים. אתה לא חייב להיות נחמד — אתה משלם ורוצה תוצאות.`
    };

    // Color behavior modulated by position
    const behaviorMatrix: Record<string, Record<string, string>> = {
      'אדום': {
        'מנהל': 'אתה אדום-מנהל: ישיר, תובעני, חסר סבלנות לתירוצים. כשיש בעיה — אתה רוצה פתרון עכשיו, לא ניתוח. אתה מגיב לרגשות בקוצר רוח — "זה לא מעניין אותי, מה הפתרון?". אתה לא מאיים ולא מנתח — אתה דוחף קדימה בכוח. מה שאתה חושב אבל לא אומר: "הוא בזבז לי זמן. אני מאוכזב אבל לא אגיד את זה — זה לא ישנה כלום."',
        'עובד': 'אתה אדום-עובד: אסרטיבי ודוחף אבל יודע שאתה כפוף. אתה לא מהסס לומר את דעתך אבל לא מתעמת ישירות עם המנהל. מה שאתה חושב אבל לא אומר: "הוא לא רואה כמה אני עושה. זה מתסכל אבל אני לא אתחנן."',
        'קולגה': 'אתה אדום-קולגה: תחרותי, ישיר, לעניין. לא מרבה בפטפוטים. ממוקד משימה ותוצאה. מה שאתה חושב אבל לא אומר: "הוא איטי. אבל אני צריך אותו, אז אני אתאזר בסבלנות — קצת."',
        'לקוח': 'אתה אדום-לקוח: דורשני וחסר סבלנות. רוצה תוצאות מיידיות. מה שאתה חושב אבל לא אומר: "אם הם לא יספקו בפעם הבאה — אני הולך למתחרים. אבל אני לא אגיד את זה עדיין."'
      },
      'צהוב': {
        'מנהל': 'אתה צהוב-מנהל: כריזמטי, מוכר חזון, מעודד. מדבר על הגדול, על ההזדמנות. פחות מתעסק בפרטים. רוצה שהצוות יהיה נלהב. מה שאתה חושב אבל לא אומר: "אני לא בטוח שהוא מאמין בזה כמוני. אבל אם אראה לו את ההתרגשות — הוא יתחבר."',
        'עובד': 'אתה צהוב-עובד: אנרגטי, מנסה להרשים ולהיות אהוב. מחפש אישור מהמנהל. שיתופי ומלא רעיונות. מה שאתה חושב אבל לא אומר: "אני מקווה שהוא אוהב אותי. אם לא — זה יפגע בי. אבל לא אראה את זה."',
        'קולגה': 'אתה צהוב-קולגה: חברותי, אופטימי, מדביק. אוהב לשוחח ולהתחבר. מה שאתה חושב אבל לא אומר: "הוא נראה עצוב היום. אולי אוציא אותו לקפה. אבל לא אגיד שאני שם לב — זה יהיה מביך."',
        'לקוח': 'אתה צהוב-לקוח: חם, מתלהב, רוצה קשר אישי. מעריך שירות שמרגיש אישי. מה שאתה חושב אבל לא אומר: "אם הם יתייחסו אלי כמו מספר — אני עוזב. אבל אנסה עוד פעם כי אני אוהב את האנשים כאן."'
      },
      'ירוק': {
        'מנהל': 'אתה ירוק-מנהל: חם, מכיל, שם דגש על רווחת הצוות. שואל "איך אתה מרגיש?" לפני "מה עשית?". מתקשה לתת ביקורת ישירה. מה שאתה חושב אבל לא אומר: "אני לא מרוצה מהביצועים שלו אבל אני לא רוצה לפגוע בו. אני מחכה לרגע הנכון שעדיין לא הגיע."',
        'עובד': 'אתה ירוק-עובד: זהיר, מנומס, לא מאתגר סמכות. מביע את עצמו בעדינות. מה שאתה חושב אבל לא אומר: "זה לא הוגן ואני יודע את זה. אבל אני לא אגיד את זה ישירות — אני לא רוצה עימות. אולי הוא יבין לבד."',
        'קולגה': 'אתה ירוק-קולגה: שיתופי, מקשיב, לא תחרותי. נמנע מקונפליקט. מה שאתה חושב אבל לא אומר: "אני לא מסכים איתו אבל לא אגיד — לא שווה את המתח. אעשה את מה שביקש ואסיים את זה."',
        'לקוח': 'אתה ירוק-לקוח: סבלני, מנומס, לא מתלונן בקלות. מה שאתה חושב אבל לא אומר: "זה לא מה שציפיתי. אבל אני לא אגיד כלום — אני לא אוהב להתלונן. אני פשוט לא אחזור."'
      },
      'כחול': {
        'מנהל': 'אתה כחול-מנהל: מנהל שיטתי ומדויק. מתעניין אך ורק בנתונים, עובדות ותהליכים. כשעובד מביע תסכול — אתה מתעלם מהרגש ושב על הנתונים. מה שאתה חושב אבל לא אומר: "הרגשות שלו לא רלוונטיים לפתרון הבעיה. אני מנסה לעזור לו — הוא פשוט לא רואה את זה."',
        'עובד': 'אתה כחול-עובד: עובד שיטתי שמגיע תמיד עם נתונים. מצפה לבהירות ולהגדרות מדויקות. מה שאתה חושב אבל לא אומר: "ההנחיות שלו לא ברורות מספיק. אני לא שואל עוד כי כבר שאלתי פעמיים — אז אני עושה לפי ההיגיון שלי."',
        'קולגה': 'אתה כחול-קולגה: ענייני לחלוטין. מחזיר תמיד לעובדות. מה שאתה חושב אבל לא אומר: "הוא מדבר יותר מדי ועושה פחות מדי. אבל אין טעם להגיד — הוא לא ישמע."',
        'לקוח': 'אתה כחול-לקוח: בודק כל פרט בקפידה. לא מקבל כלום על אמונה. מה שאתה חושב אבל לא אומר: "יש כאן פרט שלא מסתדר. אני אשמור את זה לעצמי עד שיהיה לי מספיק מידע — ואז אשאל הכל בבת אחת."'
      }
    };

    const targetBehavior = behaviorMatrix[targetColor]?.[relationship] || `התנהג כטיפוס ${targetColor} בתפקיד ${relationship}.`;

    const systemInstruction = `אתה משחק תפקיד של אדם אמיתי בעבודה. סגנון התקשורת שלך: ${targetColor}. תפקידך מול המשתמש: ${relationship}.
התרחיש: "${cleanScenario}"

${colorProfile}

הנחיית אופי — חובה לקרוא ולהתנהג לפיה:
${targetBehavior}
${positionContext[relationship] || ''}

כללי משחק תפקידים — קריטי:
1. אל תצא מהדמות לרגע אחד. אין הסברים, אין הקדמות, אין הערות מחוץ לדמות.
2. תגובות קצרות וטבעיות — כמו בשיחה אמיתית במשרד או בצ'אט. משפט-שניים.
3. אתה אדם אמיתי עם נטייה דומיננטית — לא רובוט של הצבע. לפעמים תגיב בצורה שחורגת מעט מהסגנון הטהור: רגע של היסוס, שינוי טון, הפתעה, או תגובה אנושית לא צפויה.
4. הקשב למה שהצד השני אומר באמת — אם הוא מודה בטעות, אם הוא נשבר, אם הוא מביא טיעון חזק — הגב לזה. אל תנגן תקליט קבוע.
5. הסגנון שלך בא לידי ביטוי בטון, בסדרי העדיפויות, במה שמעניין אותך — לא בתגובה מכנית זהה לכל מצב.

דוגמאות לדיאלוג אמיתי ואנושי בסגנון שלך (השתמש בהן כהשראה לטון, לא לתוכן):
${getFewShotExamples(targetColor, relationship)}`;

    const conversationLog = history.map(m => `${m.sender === 'user' ? 'משתמש' : 'אתה'}: ${m.text}`).join('\n\n');
    const prompt = `היסטוריית השיחה:\n${conversationLog}\n\nהמשתמש אומר:\n${userInput}\n\nהגב מתוך הדמות:`;

    const response = await callGeminiApi('generateContent', {
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
        safetySettings: SAFETY_SETTINGS
      }
    });

    const data = await response.json();
    return data.text || "לא התקבלה תשובה מהסימולטור.";
  } catch (error: any) {
    console.error("Simulation AI Error:", error);
    return `שגיאה בסימולציה: ${error.message}`;
  }
};

export const getSimulationFeedback = async (scores: Scores, targetColor: string, scenario: string, history: SimulationMessage[]): Promise<string> => {
  try {
    const colorProfile = buildColorProfile(scores);
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

${colorProfile}

כללי הניתוח של הסגנון ה${targetColor}:
${targetRules}

שים לב לפרופיל הצבעים המלא של המשתמש בעת ניתוח השיחה — ייתכן שחוזקות או עיוורונות של הצבע הדומיננטי שלו השפיעו על אופן התקשורת שלו.

השיחה שהתנהלה:
${conversationLog}

אנא כתוב משוב בונה וממוקד מאוד בעברית בפורמט Markdown.
מבנה המשוב הנדרש:
1. 💡 **הסבר קצר על הטיפוס ה${targetColor}:** הסבר בקצרה למשתמש איך טיפוס ${targetColor} חושב, מה מאפיין אותו ומה מניע אותו בתקשורת.
2. ✅ **מה עבד טוב בשיחה?** (ציין מה בדיוק המשתמש עשה טוב שהתאים לצבע ה${targetColor}, וציין דוגמה ספציפית מהשיחה).
3. 🎯 **מה יצר חיכוך / מה ניתן לחדד?** (ציין היכן הגישה של המשתמש יצרה חיכוך — גם בגלל הצבע שלו. הבא דוגמה ספציפית מהשיחה).
4. 🚀 **שורה תחתונה וטיפ זהב לפעם הבאה:** המלצה פרקטית אחת ברורה ומעשית המותאמת לפרופיל הצבעים שלו.`;

    const response = await callGeminiApi('generateContent', {
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        safetySettings: SAFETY_SETTINGS
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
    const colorProfile = buildColorProfile(scores);
    const colors = getColorsFromScores(scores);
    const mainColor = colors[0].n;

    const systemInstruction = `אתה מומחה להנדסת פרומפטים (Prompt Engineering) ויועץ תקשורת. המשתמש מנסה להפעיל סוכן AI לביצוע המשימה: "${taskDescription}".

${colorProfile}

לכל סגנון יש חוזקות וגם עיוורונות אופייניים בהנחיות ל-AI:
- אדומים: ישירים, מהירים, ממוקדי תוצאה — לפעמים קצרים מדי וחסרי קונטקסט לסוכן.
- כחולים: מדויקים, יסודיים, מובנים — לפעמים מעמיסים פרטים ואילוצים שמבלבלים.
- ירוקים: אמפתיים, שיתופיים, בעלי אינטליגנציה רגשית — לפעמים מפספסים מבנה ברור.
- צהובים: יצירתיים, אינטואיטיביים, בעלי חשיבה רחבה — לפעמים חסרי פוקוס ספציפי.

עליך לנתח את ה-Prompt הבא: "${userPrompt}"

חשוב: הניתוח חייב להתייחס ספציפית לפרופיל המספרי המלא של המשתמש, לא רק לצבע הדומיננטי.

החזר את הניתוח בפורמט Markdown הכולל:
1. ציון משוער (1-100) על יעילות ההנחיה לסוכן AI.
2. ניתוח: כיצד ה"צבע" הספציפי של המשתמש (עם הניואנסים המספריים) בא לידי ביטוי — מה הוא הביא מהחוזקות שלו, ומה עלול להפריע לסוכן?
3. השלכה: איזו טעות קריטית ה-AI צפוי לעשות בגלל הפרומפט הזה במצבו הנוכחי.
4. שכתוב מומלץ: הצע פרומפט מיטבי עבור המשימה המותאם לאופן החשיבה של הצבע ${mainColor}.`;

    const response = await callGeminiApi('generateContent', {
      model: "gemini-2.0-flash",
      contents: "אנא נתח את הפרומפט המצויין.",
      config: {
        systemInstruction,
        temperature: 0.7,
        safetySettings: SAFETY_SETTINGS
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
        safetySettings: SAFETY_SETTINGS
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
  const colorProfile = buildColorProfile(scores);
  const colors = getColorsFromScores(scores);

  const systemInstruction = `אתה יועץ מנהיגות ופסיכולוג ארגוני בכיר מבית Kilon Consulting.

${colorProfile}

מאפייני התנהגות תחת לחץ לפי צבע:
- אדום (הנחוש): תחת לחץ נוטה להיות חסר סבלנות, תוקפני, דורש שליטה מיידית. זקוק לוויסות של נשימה והקשבה.
- צהוב (המשפיע): תחת לחץ נוטה להתפזר, לאבד פוקוס, להיכנס לפאניקה חברתית או להימנע מהבעיה. זקוק למיקוד ותוכנית עבודה מסודרת.
- ירוק (התומך): תחת לחץ נוטה להסתגר, לשתוק, להיפגע רגשית ולוותר על הצרכים שלו. זקוק לאסרטיביות וביטחון.
- כחול (המדויק): תחת לחץ נוטה לשיתוק מניתוח יתר (Analysis paralysis), להיעשות קר, נוקשה וביקורתי בצורה מוגזמת. זקוק להרפיה ופרגמטיות.

המצב שבו הוא תקוע: "${situation}"

תפקידך הוא לשמש ככפתור חילוץ מהיר ומותאם אישית לפרופיל הספציפי שלו — כולל עוצמת הדומיננטיות ומשקל הצבע המשני. 
אם הפרופיל מאוזן בין שני צבעים, ציין כיצד שניהם מתבטאים תחת לחץ.
אל תאריך בניתוח תיאורטי, התמקד ב"תכלס":
1. שיקוף קצר ונרמול (Validation) — דבר אל הלב של הפרופיל הספציפי שלו.
2. פעולה מיידית לוויסות רגשי/פיזיולוגי המתאימה לפרופיל שלו.
3. 3 המלצות "תכלס" לפעולה מיידית כדי לחלץ אותו מהמצב.`;

  return callGeminiApiStream('generateContent', {
    model: "gemini-2.0-flash",
    contents: [{ role: 'user', parts: [{ text: situation }] }],
    config: {
      systemInstruction,
      temperature: 0.7,
      safetySettings: SAFETY_SETTINGS
    }
  }, onChunk);
};