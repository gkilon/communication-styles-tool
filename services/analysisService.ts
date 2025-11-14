import { Scores } from '../types';

interface Analysis {
  general: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
}

// Data store for color characteristics
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
};

type Color = keyof typeof colorData;

export const generateProfileAnalysis = (scores: Scores): Analysis => {
  const { a, b, c, d } = scores;

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
    return {
      general: "לא ניתן היה לקבוע פרופיל דומיננטי. ייתכן שהתשובות היו מאוזנות לחלוטין.",
      strengths: "היכולת לראות את כל הצדדים באופן שווה.",
      weaknesses: "קושי בקבלת החלטה על נתיב פעולה מועדף.",
      recommendations: "נסה לבחון באילו מצבים אתה מרגיש יותר בנוח כדי לזהות נטיות טבעיות."
    };
  }

  const sortedColors = (Object.keys(colorScores) as Color[]).sort((colorA, colorB) => colorScores[colorB] - colorScores[colorA]);
  
  const [dominant, secondary, tertiary, weakest] = sortedColors;
  const dominantData = colorData[dominant];
  const secondaryData = colorData[secondary];
  const weakestData = colorData[weakest];

  const dominantPercentage = Math.round((colorScores[dominant] / totalScore) * 100);
  const secondaryPercentage = Math.round((colorScores[secondary] / totalScore) * 100);

  // --- Generate Analysis Texts Dynamically ---

  // 1. General Analysis
  let general = `הפרופיל שלך מראה דומיננטיות של הסגנון ה${dominantData.name} (${dominantData.adjective}), המהווה כ-${dominantPercentage}% מהתמהיל. זה אומר שהנטייה הטבעית שלך היא לכיוון של ${dominantData.general.toLowerCase()}`;
  if (secondaryPercentage > 20) { // Add secondary color analysis if it's significant
    general += ` הסגנון המשני הבולט שלך הוא ה${secondaryData.name} (${secondaryData.adjective}), התורם כ-${secondaryPercentage}% לפרופיל. שילוב זה מעניק לך גישה ייחודית: `;
    if ((dominant === 'red' && secondary === 'yellow') || (dominant === 'yellow' && secondary === 'red')) {
        general += "אתה מנהיג כריזמטי שיודע להניע אנשים הן באמצעות הצבת יעדים ברורים והן באמצעות יצירת התלהבות וחזון משותף.";
    } else if ((dominant === 'red' && secondary === 'blue') || (dominant === 'blue' && secondary === 'red')) {
        general += "אתה מנהל אסטרטגי ויעיל, המשלב בין חתירה נחושה לתוצאות לבין תכנון מדוקדק ומבוסס נתונים.";
    } else if ((dominant === 'red' && secondary === 'green') || (dominant === 'green' && secondary === 'red')) {
        general += "אתה מנהיג מכיל, המצליח לאזן בין הצורך להשיג יעדים לבין הדאגה לרווחתם של חברי הצוות ויצירת סביבה תומכת.";
    } else if ((dominant === 'yellow' && secondary === 'green') || (dominant === 'green' && secondary === 'yellow')) {
        general += "אתה 'הדבק' החברתי, המצטיין ביצירת אווירה חיובית, שיתוף פעולה והרמוניה בקבוצה, תוך שימוש ביכולות בינאישיות גבוהות.";
    } else if ((dominant === 'yellow' && secondary === 'blue') || (dominant === 'blue' && secondary === 'yellow')) {
        general += "אתה פותר בעיות יצירתי, המסוגל לחשוב מחוץ לקופסה ולהציע רעיונות חדשניים, וגם לנתח אותם בצורה לוגית ומסודרת.";
    } else if ((dominant === 'blue' && secondary === 'green') || (dominant === 'green' && secondary === 'blue')) {
        general += "אתה איש צוות אמין ומסור, המשלב בין יסודיות ושאיפה לאיכות לבין סבלנות, יציבות ונכונות לתמוך ולסייע לאחרים.";
    }
  } else {
    general += " הפרופיל שלך ממוקד מאוד, מה שהופך את סגנון התקשורת שלך לעקבי וצפוי עבור אחרים."
  }
  
  // 2. Strengths Analysis
  let strengths = `החוזקות הבולטות שלך נובעות מהסגנון ה${dominantData.name}. אתה מצטיין ב${dominantData.strengths[0]} וב${dominantData.strengths[1]}.`;
  if (secondaryPercentage > 20) {
      strengths += ` הסגנון ה${secondaryData.name} מוסיף לכך ${secondaryData.strengths[0]} ו${secondaryData.strengths[1]}, מה שהופך אותך לאדם ש`;
      if ((dominant === 'red' && secondary === 'blue') || (dominant === 'blue' && secondary === 'red')) {
        strengths += "יודע להוביל פרויקטים מורכבים מתחילתם ועד סופם, משלב הרעיון ועד לביצוע המדויק.";
      } else if ((dominant === 'yellow' && secondary === 'green') || (dominant === 'green' && secondary === 'yellow')) {
        strengths += "מצטיין בבניית צוותים מגובשים ובשמירה על מורל גבוה, גם בתקופות מאתגרות.";
      } else {
        strengths += "מפגין גמישות ומסוגל להתאים את עצמו למגוון רחב של אנשים ומצבים.";
      }
  }

  // 3. Weaknesses/Development Areas Analysis
  let weaknesses = `כל חוזקה מגיעה עם "צד צל". הדומיננטיות של סגנון ה${dominantData.name} עלולה להוביל לעיתים ל${dominantData.weaknesses[0]} או ${dominantData.weaknesses[1]}.`;
  if (secondaryPercentage > 20) {
      weaknesses += ` השילוב עם הסגנון ה${secondaryData.name} יכול ליצור נקודת עיוורון ספציפית, כמו ${secondaryData.weaknesses[0]}.`
  }
  weaknesses += ` בנוסף, המינון הנמוך יחסית של הסגנון ה${weakestData.name} בפרופיל שלך מצביע על כך שתכונות כמו ${weakestData.strengths[0]} ו${weakestData.strengths[1]} אינן הנטייה הטבעית שלך, ודורשות ממך מאמץ מודע יותר.`

  // 4. Recommendations Analysis
  let recommendations = `כדי למקסם את הפוטנציאל שלך, התמקד ב${dominantData.recommendation_focus.toLowerCase()}.`;
  if (secondaryPercentage > 20) {
    recommendations += ` במקביל, נסה לאמץ כלים מהסגנון ה${secondaryData.name} על ידי ${secondaryData.recommendation_focus.toLowerCase()}.`
  }
  recommendations += ` המלצה מרכזית עבורך היא להגביר את המודעות לאיכויות של הסגנון ה${weakestData.name}. לדוגמה, נסה באופן יזום ${weakestData.recommendation_focus.toLowerCase()}, גם אם זה מרגיש פחות טבעי. זה ירחיב את מגוון הכלים שלך ויהפוך אותך לאיש תקשורת שלם ומאוזן יותר.`

  return { general, strengths, weaknesses, recommendations };
};
