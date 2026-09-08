
import { QuestionPair } from '../types';

export interface BilingualQuestionPair {
  id: string;
  pair: { he: [string, string]; en: [string, string] };
  descriptions: { he: [string, string]; en: [string, string] };
  columns: ['a', 'b'] | ['c', 'd'];
}

export const QUESTION_PAIRS_I18N: BilingualQuestionPair[] = [
  // A vs B (Extrovert vs Introvert axes)
  {
    id: 'ab1',
    pair: { he: ['דברן', 'שקט'], en: ['Talkative', 'Quiet'] },
    descriptions: { he: ['יוזם שיחה, משתף במחשבות', 'מאזין, שומר מחשבות לעצמו'], en: ['Starts conversations, shares thoughts openly', 'Listens, keeps thoughts to themself'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab2',
    pair: { he: ['מעורב', 'מתבונן'], en: ['Involved', 'Observant'] },
    descriptions: { he: ['משתתף פעיל במתרחש', 'בוחן את הדברים מהצד'], en: ['Actively participates in what\u2019s happening', 'Watches things from the sidelines'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab3',
    pair: { he: ['חברותי', 'מרוחק'], en: ['Sociable', 'Reserved'] },
    descriptions: { he: ['יוצר קשרים בקלות וחמימות', 'שומר על דיסטנס ופרטיות'], en: ['Builds connections easily and warmly', 'Keeps distance and privacy'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab4',
    pair: { he: ['בימתי', 'אינטימי'], en: ['Performer', 'Intimate'] },
    descriptions: { he: ['אוהב קהל ותשומת לב', 'מעדיף שיחות אחד על אחד'], en: ['Enjoys an audience and attention', 'Prefers one-on-one conversations'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab5',
    pair: { he: ['מביע בחופשיות', 'אינו מרבה במילים'], en: ['Freely expressive', 'Reserved with words'] },
    descriptions: { he: ['משתף רגשות ודעות בגלוי', 'שקול ומאופק בהבעה'], en: ['Shares feelings and opinions openly', 'Measured and restrained in expression'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab6',
    pair: { he: ['נועז', 'זהיר'], en: ['Bold', 'Cautious'] },
    descriptions: { he: ['לוקח סיכונים, פורץ דרך', 'מחשב צעדים, נמנע מטעויות'], en: ['Takes risks, breaks new ground', 'Calculates steps, avoids mistakes'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab7',
    pair: { he: ['עושה', 'חושב'], en: ['Doer', 'Thinker'] },
    descriptions: { he: ['פועל מהר, לומד תוך כדי תנועה', 'מתכנן לעומק לפני ביצוע'], en: ['Acts fast, learns on the move', 'Plans deeply before acting'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab8',
    pair: { he: ['מוחצן', 'מופנם'], en: ['Extroverted', 'Introverted'] },
    descriptions: { he: ['שואב אנרגיה מאנשים ופעילות', 'מטעין מצברים בזמן לבד'], en: ['Draws energy from people and activity', 'Recharges when alone'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab9',
    pair: { he: ['מדבר', 'מקשיב'], en: ['Speaks', 'Listens'] },
    descriptions: { he: ['מוביל את השיחה', 'נותן מקום לאחרים'], en: ['Leads the conversation', 'Makes room for others'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab10',
    pair: { he: ['מבטא', 'מבליע (שומר בבטן)'], en: ['Vents', 'Holds back'] },
    descriptions: { he: ['מוציא החוצה מה שמפריע', 'מעדיף להימנע מעימות'], en: ['Lets out what\u2019s bothering them', 'Prefers to avoid confrontation'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab11',
    pair: { he: ['נלהב', 'רגוע'], en: ['Enthusiastic', 'Calm'] },
    descriptions: { he: ['מלא אנרגיה והתרגשות', 'שלו, יציב ונינוח'], en: ['Full of energy and excitement', 'Peaceful, steady and relaxed'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab12',
    pair: { he: ['קצר רוח', 'סבלני'], en: ['Impatient', 'Patient'] },
    descriptions: { he: ['רוצה תוצאות כאן ועכשיו', 'מוכן לתהליכים ארוכים'], en: ['Wants results here and now', 'Comfortable with long processes'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab13',
    pair: { he: ['מוביל', 'משתלב'], en: ['Leads', 'Blends in'] },
    descriptions: { he: ['לוקח פיקוד והובלה', 'זורם עם הקבוצה'], en: ['Takes charge and leads', 'Flows with the group'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab14',
    pair: { he: ['מהיר', 'איטי'], en: ['Fast', 'Slow'] },
    descriptions: { he: ['קצב חיים ועבודה גבוה', 'קצב מדוד ורגוע'], en: ['High-paced life and work', 'Measured, relaxed pace'] },
    columns: ['a', 'b']
  },
  {
    id: 'ab15',
    pair: { he: ['וכחן', 'שואף להרמוניה'], en: ['Confrontational', 'Harmony-seeking'] },
    descriptions: { he: ['לא חושש מעימותים וחיכוך', 'מחפש הסכמה ושלום בית'], en: ['Not afraid of conflict and friction', 'Seeks agreement and peace'] },
    columns: ['a', 'b']
  },

  // C vs D (Task vs People axes)
  {
    id: 'cd1',
    pair: { he: ['פורמלי', 'בלתי פורמלי'], en: ['Formal', 'Informal'] },
    descriptions: { he: ['מקפיד על כללים ורשמיות', 'משוחרר, אישי ופתוח'], en: ['Sticks to rules and formality', 'Relaxed, personal and open'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd2',
    pair: { he: ['אנליטי', 'אינטואיטיבי'], en: ['Analytical', 'Intuitive'] },
    descriptions: { he: ['מסתמך על נתונים ועובדות', 'מסתמך על תחושת בטן'], en: ['Relies on data and facts', 'Relies on gut feeling'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd3',
    pair: { he: ['ממוקד בפרטים', 'רואה את התמונה הגדולה'], en: ['Detail-focused', 'Sees the big picture'] },
    descriptions: { he: ['יורד לרזולוציות הקטנות', 'מתמקד בחזון ובכיוון הכללי'], en: ['Drills down into fine detail', 'Focuses on vision and overall direction'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd4',
    pair: { he: ['מתעקש', 'מוותר'], en: ['Insists', 'Yields'] },
    descriptions: { he: ['עומד על עקרונותיו', 'גמיש ומוכן להתפשר'], en: ['Stands by their principles', 'Flexible and willing to compromise'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd5',
    pair: { he: ['עומד על שלו', 'משתלב'], en: ['Stands their ground', 'Adapts'] },
    descriptions: { he: ['אסרטיבי בדעותיו', 'מתאים עצמו לסביבה'], en: ['Assertive with their opinions', 'Adapts to the surroundings'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd6',
    pair: { he: ['מחושב', 'ספונטני'], en: ['Calculated', 'Spontaneous'] },
    descriptions: { he: ['מתכנן צעדים מראש', 'פועל לפי הרגע'], en: ['Plans steps in advance', 'Acts in the moment'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd7',
    pair: { he: ['מכוון משימה', 'מכוון יחסי אנוש'], en: ['Task-oriented', 'People-oriented'] },
    descriptions: { he: ['התוצאה והיעד מעל הכל', 'האנשים והקשרים מעל הכל'], en: ['The result and goal above all', 'People and relationships above all'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd8',
    pair: { he: ['מרוחק', 'נגיש'], en: ['Distant', 'Approachable'] },
    descriptions: { he: ['ענייני ומקצועי נטו', 'חם ומזמין לאינטראקציה'], en: ['Strictly businesslike and professional', 'Warm and inviting to interact with'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd9',
    pair: { he: ['מאופק', 'אימפולסיבי'], en: ['Restrained', 'Impulsive'] },
    descriptions: { he: ['שולט ברגשותיו ובתגובותיו', 'מגיב מהבטן ומהר'], en: ['Controls their emotions and reactions', 'Reacts fast, from the gut'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd10',
    pair: { he: ['מובנה', 'לא מובנה'], en: ['Structured', 'Unstructured'] },
    descriptions: { he: ['אוהב סדר, שיטה וארגון', 'אוהב חופש ואילתור'], en: ['Loves order, method and organization', 'Loves freedom and improvisation'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd11',
    pair: { he: ['מתבדל', 'מעורב עם הבריות'], en: ['Independent', 'Involved with others'] },
    descriptions: { he: ['עובד עצמאית ובנפרד', 'עובד בצוות ובשיתוף'], en: ['Works independently and apart', 'Works as part of a team'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd12',
    pair: { he: ['נוקשה', 'גמיש'], en: ['Rigid', 'Flexible'] },
    descriptions: { he: ['נצמד לנהלים ולתוכנית', 'משתנה בהתאם לנסיבות'], en: ['Sticks to procedures and the plan', 'Adapts to circumstances'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd13',
    pair: { he: ['שכלתני', 'רגשני'], en: ['Rational', 'Emotional'] },
    descriptions: { he: ['מונע מהראש ומההיגיון', 'מונע מהלב ומהרגש'], en: ['Driven by the head and logic', 'Driven by the heart and feeling'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd14',
    pair: { he: ['דעתן', 'מתפשר'], en: ['Opinionated', 'Accommodating'] },
    descriptions: { he: ['מביע דעה נחרצת', 'מוכן לקבל דעת אחרים'], en: ['States a firm opinion', 'Willing to accept others\u2019 opinions'] },
    columns: ['c', 'd']
  },
  {
    id: 'cd15',
    pair: { he: ['מחשיב נהלים ושיטות', 'מחשיב אנשים ויחסים'], en: ['Values procedures & methods', 'Values people & relationships'] },
    descriptions: { he: ['הדרך והתהליך חשובים', 'האווירה והאנשים חשובים'], en: ['The path and process matter', 'The atmosphere and people matter'] },
    columns: ['c', 'd']
  }
];

/** Backwards-compatible Hebrew-only view, used by the scoring logic which only needs id/columns. */
export const QUESTION_PAIRS: QuestionPair[] = QUESTION_PAIRS_I18N.map(q => ({
  id: q.id,
  pair: q.pair.he,
  descriptions: q.descriptions.he,
  columns: q.columns
}));
