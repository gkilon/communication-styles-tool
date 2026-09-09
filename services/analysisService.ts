import { Scores, BackgroundData } from '../types';

interface Analysis {
  general: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  quickStrength: string;
  quickWeakness: string;
  quickRecommendation: string;
}

type Lang = 'he' | 'en';

// Data store for color characteristics — Hebrew and English content generated in parallel
// (not translated after the fact) so the whole report is authored natively in the chosen language.
const colorData = {
  he: {
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
      strengths: ["יכולת הקשבה ואמפתיה", "אמינות ויציבות", "גישור ופתרון קונפליקטים", "יצירת סביבת עבודה תומכת והרמונית"],
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
  },
  en: {
    red: {
      name: "Red",
      adjective: "driven",
      general: "natural leadership, determination and a sharp focus on goals. You're results-oriented, enjoy a challenge, and aren't afraid to make fast decisions.",
      strengths: ["driving processes forward", "decisiveness under pressure", "direct, efficient communication", "relentless goal pursuit"],
      weaknesses: ["impatience", "can come across as controlling or aggressive", "difficulty listening to differing opinions", "focusing on the 'what' at the expense of the 'how'"],
      recommendation_focus: "pair your determination with active listening and empathy"
    },
    yellow: {
      name: "Yellow",
      adjective: "influential",
      general: "charisma, optimism, and a knack for energizing others. You're creative, sociable, and draw energy from social interaction.",
      strengths: ["building connections and social influence", "motivating through vision and enthusiasm", "creative, big-picture thinking", "creating a positive atmosphere"],
      weaknesses: ["struggling with details and order", "a tendency to avoid conflict", "excessive optimism that can lead to under-planning", "needing recognition and positive feedback"],
      recommendation_focus: "translate big ideas into concrete, actionable plans"
    },
    green: {
      name: "Green",
      adjective: "supportive",
      general: "stability, harmony, and a deep value for interpersonal relationships. You're an excellent team player — patient, a great listener, and an anchor of support for others.",
      strengths: ["listening and empathy", "reliability and steadiness", "mediating and resolving conflict", "creating a supportive, harmonious work environment"],
      weaknesses: ["avoiding conflict and confrontation", "resistance to sudden change", "difficulty making fast decisions", "a tendency to set aside personal needs for the group"],
      recommendation_focus: "voice your opinions and positions assertively and respectfully"
    },
    blue: {
      name: "Blue",
      adjective: "precise",
      general: "analytical thinking, thoroughness, and an uncompromising pursuit of quality. You're data-driven, and careful about details, procedures and order.",
      strengths: ["excellent planning and organization", "precision and attention to detail", "logical, analytical thinking", "upholding high standards"],
      weaknesses: ["excessive criticism (of self and others)", "analysis paralysis from overthinking", "can come across as cold, distant or pessimistic", "difficulty with flexibility and improvisation"],
      recommendation_focus: "balance the pursuit of perfection with the need to move forward pragmatically"
    }
  }
} as const;

type Color = keyof typeof colorData.he;

const EDGE_CASE: Record<Lang, Analysis> = {
  he: {
    general: "לא ניתן היה לקבוע פרופיל דומיננטי. ייתכן שהתשובות היו מאוזנות לחלוטין.",
    strengths: "היכולת לראות את כל הצדדים באופן שווה.",
    weaknesses: "קושי בקבלת החלטה על נתיב פעולה מועדף.",
    recommendations: "נסה לבחון באילו מצבים אתה מרגיש יותר בנוח כדי לזהות נטיות טבעיות.",
    quickStrength: "רואה את כל הצדדים באופן שווה",
    quickWeakness: "קושי בהעדפת נתיב פעולה ברור",
    quickRecommendation: "לשים לב באילו מצבים אתה מרגיש הכי בנוח"
  },
  en: {
    general: "We couldn't determine a dominant profile. Your answers may have been perfectly balanced.",
    strengths: "The ability to see all sides equally.",
    weaknesses: "Difficulty committing to a preferred course of action.",
    recommendations: "Try noticing which situations feel most comfortable to you, to identify your natural tendencies.",
    quickStrength: "Sees all sides equally",
    quickWeakness: "Difficulty settling on a clear course of action",
    quickRecommendation: "Notice which situations feel most comfortable to you"
  }
};

// Combined-pair descriptions, keyed by an order-independent pair key (e.g. "red-yellow")
const COMBO_GENERAL: Record<string, { he: string; en: string }> = {
  'red-yellow': {
    he: "אתה מנהיג כריזמטי שיודע להניע אנשים הן דרך הצבת יעדים ברורים והן דרך יצירת התלהבות וחזון משותף. האנרגיה שאתה משדר מושכת אחרים לפעולה, ובה בעת אתה מסוגל לשמור על כיוון ומיקוד.",
    en: "You're a charismatic leader who moves people both by setting clear goals and by creating enthusiasm and shared vision. The energy you project pulls others into action, while you still keep everyone focused and on course."
  },
  'red-blue': {
    he: "אתה מנהל אסטרטגי ויעיל, המשלב נחישות ואוריינטציה לתוצאות עם תכנון מדוקדק ורציונלי. המפה שלך מצביעה על יכולת נדירה להיות גם רוח הגב וגם השכל המנחה.",
    en: "You're a strategic, effective manager who pairs determination and results-orientation with careful, rational planning. Your map points to a rare ability to be both the driving force and the guiding mind."
  },
  'red-green': {
    he: "אתה מנהיג מכיל — כזה שמשיג תוצאות מבלי לרמוס אנשים. המפה שלך חושפת שילוב ייחודי של עוצמה ורגישות, שיכול להיות מנוף עצום בניהול צוותים.",
    en: "You're an inclusive leader — one who gets results without steamrolling people. Your map reveals a unique combination of drive and sensitivity that can be a huge asset in leading teams."
  },
  'yellow-green': {
    he: "אתה ה'דבק' החברתי בכל סביבה — אדם שיוצר אווירה, מחזק קשרים ומניע שיתוף פעולה. המפה שלך מגלה שהאינטליגנציה הרגשית שלך היא כלי עצמה.",
    en: "You're the social glue in any environment — someone who sets the tone, strengthens relationships, and drives collaboration. Your map shows that your emotional intelligence is a genuine source of power."
  },
  'yellow-blue': {
    he: "אתה פותר בעיות יצירתי עם ראש אנליטי — שני נדירים שבדרך כלל לא נמצאים יחד. המפה שלך מראה שאתה יכול לחשוב מחוץ לקופסה וגם לבדוק את הרעיון לפני שמוציאים אותו לפועל.",
    en: "You're a creative problem-solver with an analytical mind — two traits that rarely come together. Your map shows you can think outside the box and also pressure-test the idea before putting it into action."
  },
  'blue-green': {
    he: "אתה איש צוות אמין ומסור, המשלב בין יסודיות ושאיפה לאיכות לבין סבלנות ורצון אמיתי לתמוך באחרים. המפה שלך מצביעה על עוגן יציב בכל סביבת עבודה.",
    en: "You're a reliable, devoted team player who pairs thoroughness and a drive for quality with patience and a genuine desire to support others. Your map points to a steady anchor in any work environment."
  }
};

const COMBO_STRENGTHS: Record<string, { he: string; en: string }> = {
  'red-blue': {
    he: "השילוב הזה מאפשר לך להוביל פרויקטים מורכבים מקצה לקצה — מהרעיון הראשוני ועד לביצוע המדויק — מה שהופך אותך לנכס בכל צוות.",
    en: "This combination lets you lead complex projects end to end — from the initial idea through precise execution — which makes you an asset on any team."
  },
  'yellow-green': {
    he: "שני הצדדים גם יחד מאפשרים לך לבנות אמון בצורה מהירה ואמיתית — אנשים מרגישים שאתה 'בשבילם', וזה פותח דלתות שלוגיקה בלבד לא תפתח.",
    en: "Together, both sides let you build genuine trust quickly — people feel you're truly on their side, which opens doors that logic alone never could."
  }
};

const GENERIC_COMBO_STRENGTH = {
  he: "הגמישות הנובעת מהשילוב הזה מאפשרת לך להתאים את עצמך למגוון רחב של אנשים ומצבים, ולהיות אפקטיבי גם כשהנסיבות משתנות.",
  en: "The flexibility this combination gives you lets you adapt to a wide range of people and situations, and stay effective even as circumstances shift."
};

function comboKey(a: Color, b: Color): string {
  return [a, b].sort().join('-');
}

// Deterministic, hand-written phrasing tailored to the two background answers that matter most
// (role + stated goal) — picked instantly with no AI call, so the report always reflects these
// answers even if the AI service is slow, rate-limited, or unavailable.
type GoalId = 'self_learn' | 'management' | 'teamwork' | 'influence';

function buildGoalFocusedAddendum(
  dominantAdjective: string,
  weakestAdjective: string,
  isManager: boolean | null,
  goal: GoalId | null,
  lang: Lang
): string {
  if (!goal && isManager === null) return '';

  const managerClause = (he: string, en: string) => (lang === 'he' ? he : en);

  const byGoal: Record<GoalId, { he: string; en: string }> = {
    self_learn: {
      he: `מכיוון שציינת שהמטרה שלך היא בעיקר להכיר את עצמך טוב יותר — הדרך הכי ישירה להתקדם היא לשים לב, במשך שבוע-שבועיים, לרגעים שבהם הנטייה שלך להיות ${dominantAdjective} "נדלקת" אוטומטית, ולשאול את עצמך אם זו הייתה הבחירה הכי מודעת עבורך באותו רגע.`,
      en: `Since you said your main goal is self-understanding, the most direct way to grow is to spend a week or two simply noticing the moments your tendency to be ${dominantAdjective} kicks in automatically, and asking yourself whether that was actually the most deliberate choice in the moment.`
    },
    management: {
      he: `מכיוון שציינת שאתה מחפש כלים מעשיים לניהול, הפרופיל שלך — עם הנטייה ל${dominantAdjective} — הוא בדיוק מה שיעזור לך להוביל, אבל שים לב: ${managerClause('כמנהל/ת, אותה נטייה יכולה ליצור לחץ סביבתי אם אינך מאזן אותה עם', 'as a manager, that same tendency can create pressure on your team if it isn\'t balanced with')} התנהגות ${weakestAdjective} יותר, במיוחד לפני קבלת החלטות שמשפיעות על הצוות.`,
      en: `Since you said you're looking for practical management tools, your profile — with its tendency to be ${dominantAdjective} — is exactly what will help you lead, but as a manager, that same tendency can pressure your team if it isn't balanced with more ${weakestAdjective} behavior, especially before decisions that affect the team.`
    },
    teamwork: {
      he: `מכיוון שציינת שהמטרה שלך היא לשפר את עבודת הצוות, שווה לזכור: הנטייה שלך להיות ${dominantAdjective} בולטת מאוד מול חברי צוות שהנטייה הדומיננטית שלהם שונה משלך — הצעד הראשון הוא פשוט לזהות מי בצוות שלך נוטה יותר להיות ${weakestAdjective}, ולהתאים את אופן הפנייה אליו בהתאם.`,
      en: `Since you said your goal is improving teamwork, it's worth remembering: your tendency to be ${dominantAdjective} stands out most against teammates whose dominant tendency differs from yours — the first step is simply noticing who on your team leans more ${weakestAdjective}, and adjusting how you approach them accordingly.`
    },
    influence: {
      he: `מכיוון שציינת שהמטרה שלך היא להשפיע טוב יותר על אחרים, כדאי לדעת: הנטייה שלך להיות ${dominantAdjective} משפיעה הכי חזק על אנשים שדומים לך בסגנון - אבל מול מי שנוטה להיות ${weakestAdjective}, אותה גישה בדיוק עלולה לפעול נגדך. ההשפעה האמיתית מתחילה כשאתה מתאים את הניסוח לסגנון של מי שמולך, לא רק לסגנון שלך.`,
      en: `Since you said your goal is influencing others more effectively, it helps to know: your tendency to be ${dominantAdjective} lands strongest with people who share your style — but with someone who leans ${weakestAdjective}, that exact same approach can work against you. Real influence starts when you adapt your framing to the other person's style, not just your own.`
    }
  };

  let text = (goal && byGoal[goal]) ? byGoal[goal][lang] : '';

  if (!text && isManager !== null) {
    text = isManager
      ? (lang === 'he'
        ? `כמנהל/ת, כדאי לזכור שהנטייה שלך להיות ${dominantAdjective} משפיעה ישירות על האופן שבו הצוות שלך חווה אותך.`
        : `As a manager, it's worth remembering that your tendency to be ${dominantAdjective} directly shapes how your team experiences you.`)
      : (lang === 'he'
        ? `בתפקיד לא-ניהולי, הנטייה שלך להיות ${dominantAdjective} באה לידי ביטוי בעיקר מול עמיתים ומול הממונים עליך.`
        : `In a non-managerial role, your tendency to be ${dominantAdjective} shows up mainly with peers and with the people you report to.`);
  }

  return text;
}

export const generateProfileAnalysis = (scores: Scores, lang: Lang = 'he', backgroundData?: BackgroundData | null): Analysis => {
  const { a, b, c, d } = scores;
  const T = colorData[lang];

  // Calculate scores for each of the four colors based on the two axes
  const colorScores = {
    red: a + c,    // Extrovert + Task
    yellow: a + d, // Extrovert + People
    green: b + d,  // Introvert + People
    blue: b + c    // Introvert + Task
  };

  const totalScore = Object.values(colorScores).reduce((sum, score) => sum + score, 0);

  // Handle the edge case of a perfectly balanced score (or zero scores) to avoid division by zero
  if (totalScore === 0) {
    return EDGE_CASE[lang];
  }

  const sortedColors = (Object.keys(colorScores) as Color[]).sort((colorA, colorB) => colorScores[colorB] - colorScores[colorA]);

  const [dominant, secondary, , weakest] = sortedColors;
  const dominantData = T[dominant];
  const secondaryData = T[secondary];
  const weakestData = T[weakest];

  const secondaryPercentage = Math.round((colorScores[secondary] / totalScore) * 100);
  const pairKey = comboKey(dominant, secondary);

  // --- Generate Analysis Texts Dynamically ---

  // 1. General Analysis — trait-led, color name kept to a single small mention
  let general = lang === 'he'
    ? `הפרופיל שלך מראה נטייה ברורה וחזקה להיות ${dominantData.adjective} (במודל המקצועי: סגנון ${dominantData.name} דומיננטי). המשמעות היא ש${dominantData.general} המפה המשולבת שלך מגלה כיצד הנטיות הללו מתבטאות בפועל בצמתי ההתנהגות השונים.`
    : `Your profile shows a clear, strong tendency to be ${dominantData.adjective} (in the professional model: a dominant ${dominantData.name} style). This means ${dominantData.general} Your combined map reveals how these tendencies actually play out at key behavioral moments.`;

  if (secondaryPercentage > 20) {
    general += lang === 'he'
      ? ` לצד זה, יש בך גם מידה משמעותית של האופי ה${secondaryData.adjective}. השילוב הזה מעניק לך גישה ייחודית: `
      : ` Alongside this, you also carry a significant measure of the ${secondaryData.adjective} character. This combination gives you a distinctive approach: `;
    const combo = COMBO_GENERAL[pairKey];
    if (combo) general += combo[lang];
  } else {
    general += lang === 'he'
      ? ` הפרופיל שלך ממוקד ביותר — נטייה אחת בולטת בבירור על פני האחרות. זה הופך את סגנון התקשורת שלך לעקבי ומזוהה, ומאפשר לסביבה שלך לדעת למה לצפות ממך.`
      : ` Your profile is highly focused — one tendency clearly stands out over the others. This makes your communication style consistent and recognizable, letting the people around you know what to expect from you.`;
  }

  // Goal/role-tailored addendum — deterministic (no AI call), so this always reflects the
  // background-question answers instantly and reliably, regardless of AI service load/quota.
  const goalAddendum = buildGoalFocusedAddendum(
    dominantData.adjective,
    weakestData.adjective,
    backgroundData?.isManager === 'yes' ? true : backgroundData?.isManager === 'no' ? false : null,
    (backgroundData?.goal as GoalId) || null,
    lang
  );
  if (goalAddendum) general += ' ' + goalAddendum;

  // 2. Strengths Analysis — deeper, map-oriented, no color naming
  let strengths = lang === 'he'
    ? `החוזקות הטבעיות שלך: ${dominantData.strengths.slice(0, 3).join(', ')}. `
    : `Your natural strengths: ${dominantData.strengths.slice(0, 3).join(', ')}. `;
  strengths += lang === 'he'
    ? `אלה אינן רק תכונות — הן מתבטאות בהתנהגות יומיומית ומשפיעות על האופן שבו אחרים חווים אותך בשיחה, בישיבה, ובמצבי לחץ. `
    : `These aren't just traits — they show up in everyday behavior and shape how others experience you in conversation, in meetings, and under pressure. `;
  if (secondaryPercentage > 20) {
    strengths += lang === 'he'
      ? `הצד ה${secondaryData.adjective} שבך מעשיר את הפרופיל ב${secondaryData.strengths[0]} וב${secondaryData.strengths[1]}. `
      : `The ${secondaryData.adjective} side of you enriches the profile with ${secondaryData.strengths[0]} and ${secondaryData.strengths[1]}. `;
    const combo = COMBO_STRENGTHS[pairKey];
    strengths += combo ? combo[lang] : GENERIC_COMBO_STRENGTH[lang];
  }

  // 3. Weaknesses/Development Areas Analysis — deeper, candid but constructive, no color naming
  let weaknesses = lang === 'he'
    ? `כל סגנון חזק מגיע עם 'צד צל'. הנטייה שלך להיות ${dominantData.adjective} עלולה להוביל ל${dominantData.weaknesses[0]} ול${dominantData.weaknesses[1]} — לא כישלון, אלא דפוס אוטומטי שפועל מתחת לרדאר. `
    : `Every strong style comes with a "shadow side." Your tendency to be ${dominantData.adjective} can lead to ${dominantData.weaknesses[0]} and ${dominantData.weaknesses[1]} — not a failure, but an automatic pattern running under the radar. `;
  weaknesses += lang === 'he'
    ? `חשוב להכיר בכך שהחוזקה הגדולה ביותר, כשהיא מופעלת בעוצמה יתרה, היא גם נקודת הפגיעות. `
    : `It's worth recognizing that your greatest strength, when overused, is also your point of vulnerability. `;
  if (secondaryPercentage > 20) {
    weaknesses += lang === 'he'
      ? `השילוב עם הצד ה${secondaryData.adjective} יכול להעצים נקודת עיוורון ספציפית: ${secondaryData.weaknesses[0]}. `
      : `Combined with the ${secondaryData.adjective} side, this can amplify one specific blind spot: ${secondaryData.weaknesses[0]}. `;
  }
  weaknesses += lang === 'he'
    ? `המפה המשולבת גם מגלה שהנטייה להיות ${weakestData.adjective} נמוכה יחסית אצלך — מה שאומר שתכונות כמו ${weakestData.strengths[0]} ו${weakestData.strengths[1]} לא מגיעות אליך באופן אוטומטי. זהו אזור פיתוח שדורש מאמץ מודע, אך גם מסמן לאן הצמיחה הגדולה ביותר שלך יכולה להגיע.`
    : `Your combined map also reveals that the tendency to be ${weakestData.adjective} is relatively low for you — meaning traits like ${weakestData.strengths[0]} and ${weakestData.strengths[1]} don't come to you automatically. This is a development area that takes conscious effort, but it also marks where your biggest growth can happen.`;

  // 4. Recommendations Analysis — no color naming
  let recommendations = lang === 'he'
    ? `ההמלצה הראשונה עבורך: ${dominantData.recommendation_focus}. `
    : `Your first recommendation: ${dominantData.recommendation_focus}. `;
  recommendations += lang === 'he'
    ? `נסה לשאול את עצמך בשיחות מפתח: "איך מישהו ${weakestData.adjective} היה מתייחס לרגע הזה?" — לאו דווקא כדי לשנות את עצמך, אלא כדי להרחיב את ה'תפריט' שלך. `
    : `In key conversations, try asking yourself: "How would someone ${weakestData.adjective} approach this moment?" — not to change who you are, but to expand your own "menu" of options. `;
  if (secondaryPercentage > 20) {
    recommendations += lang === 'he'
      ? `הכוח של הפרופיל שלך טמון בשילוב שבין הצד ה${dominantData.adjective} לצד ה${secondaryData.adjective} שבך. נסה לאמץ גם כלים מהצד הזה: ${secondaryData.recommendation_focus}. `
      : `The strength of your profile lies in the combination between your ${dominantData.adjective} side and your ${secondaryData.adjective} side. Try picking up tools from that side too: ${secondaryData.recommendation_focus}. `;
  }
  recommendations += lang === 'he'
    ? `ההמלצה המרכזית: ${weakestData.recommendation_focus}, גם כשזה לא מרגיש טבעי. זה יהפוך אותך מ'מומחה בסגנון שלי' לאדם שיכול לדבר בשפה של כל סגנון — וזה ההבדל בין תקשורת טובה לתקשורת מצוינת.`
    : `The key recommendation: ${weakestData.recommendation_focus}, even when it doesn't feel natural. This is what turns you from "an expert in my own style" into someone who can speak the language of every style — and that's the difference between good communication and excellent communication.`;

  // Short one-line versions for the "at a glance" summary box — plain trait language, no color names
  const quickStrength = lang === 'he'
    ? `${dominantData.strengths[0]} ו${dominantData.strengths[1]}`
    : `${dominantData.strengths[0]} and ${dominantData.strengths[1]}`;
  const quickWeakness = lang === 'he'
    ? `${dominantData.weaknesses[0]}, ו${weakestData.strengths[0]} לא מגיע אליך באופן טבעי`
    : `${dominantData.weaknesses[0]}, and ${weakestData.strengths[0]} doesn't come naturally to you`;
  const quickRecommendation = lang === 'he'
    ? `${dominantData.recommendation_focus}, ולתרגל ${weakestData.recommendation_focus.charAt(0).toLowerCase()}${weakestData.recommendation_focus.slice(1)}`
    : `${dominantData.recommendation_focus}, and practice ${weakestData.recommendation_focus.charAt(0).toLowerCase()}${weakestData.recommendation_focus.slice(1)}`;

  return { general, strengths, weaknesses, recommendations, quickStrength, quickWeakness, quickRecommendation };
};
