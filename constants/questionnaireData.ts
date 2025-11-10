
import { QuestionPair } from '../types';

export const QUESTION_PAIRS: QuestionPair[] = [
  // A vs B
  { id: 'ab1', pair: ['דברן', 'שקט'], columns: ['a', 'b'] },
  { id: 'ab2', pair: ['מעורב', 'מתבונן'], columns: ['a', 'b'] },
  { id: 'ab3', pair: ['חברותי', 'מרוחק'], columns: ['a', 'b'] },
  { id: 'ab4', pair: ['בימתי', 'אינטימי'], columns: ['a', 'b'] },
  { id: 'ab5', pair: ['מביע בחופשיות', 'אינו מרבה במילים'], columns: ['a', 'b'] },
  { id: 'ab6', pair: ['נועז', 'זהיר'], columns: ['a', 'b'] },
  { id: 'ab7', pair: ['עושה', 'חושב'], columns: ['a', 'b'] },
  { id: 'ab8', pair: ['מוחצן', 'מופנם'], columns: ['a', 'b'] },
  { id: 'ab9', pair: ['מדבר', 'מקשיב'], columns: ['a', 'b'] },
  { id: 'ab10', pair: ['מבטא', 'מבליע (שומר בבטן)'], columns: ['a', 'b'] },
  { id: 'ab11', pair: ['נלהב', 'רגוע'], columns: ['a', 'b'] },
  { id: 'ab12', pair: ['קצר רוח', 'סבלני'], columns: ['a', 'b'] },
  { id: 'ab13', pair: ['מוביל', 'משתלב'], columns: ['a', 'b'] },
  { id: 'ab14', pair: ['מהיר', 'איטי'], columns: ['a', 'b'] },
  { id: 'ab15', pair: ['וכחן', 'שואף להרמוניה'], columns: ['a', 'b'] },
  
  // C vs D
  { id: 'cd1', pair: ['פורמלי', 'בלתי פורמלי'], columns: ['c', 'd'] },
  { id: 'cd2', pair: ['אנליטי', 'אינטואיטיבי'], columns: ['c', 'd'] },
  { id: 'cd3', pair: ['ממוקד בפרטים', 'רואה את התמונה הגדולה'], columns: ['c', 'd'] },
  { id: 'cd4', pair: ['מתעקש', 'מוותר'], columns: ['c', 'd'] },
  { id: 'cd5', pair: ['עומד על שלו', 'משתלב'], columns: ['c', 'd'] },
  { id: 'cd6', pair: ['מחושב', 'ספונטני'], columns: ['c', 'd'] },
  { id: 'cd7', pair: ['מכוון משימה', 'מכוון יחסי אנוש'], columns: ['c', 'd'] },
  { id: 'cd8', pair: ['מרוחק', 'נגיש'], columns: ['c', 'd'] },
  { id: 'cd9', pair: ['מאופק', 'אימפולסיבי'], columns: ['c', 'd'] },
  { id: 'cd10', pair: ['מובנה', 'לא מובנה'], columns: ['c', 'd'] },
  { id: 'cd11', pair: ['מתבדל', 'מעורב עם הבריות'], columns: ['c', 'd'] },
  { id: 'cd12', pair: ['נוקשה', 'גמיש'], columns: ['c', 'd'] },
  { id: 'cd13', pair: ['שכלתני', 'רגשני'], columns: ['c', 'd'] },
  { id: 'cd14', pair: ['דעתן', 'מתפשר'], columns: ['c', 'd'] },
  { id: 'cd15', pair: ['מחשיב נהלים ושיטות', 'מחשיב אנשים ויחסים'], columns: ['c', 'd'] }
];

export const MAX_SCORE_PER_AXIS = 15 * 5; // 15 questions, max 5 points each
