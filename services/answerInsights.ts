export type QuestionnaireAnswers = Record<string, number>;

type InsightGroup = {
  id: string;
  he: { low: string; high: string; mixed: string; lessFirst: string; lessSecond: string };
  en: { low: string; high: string; mixed: string; lessFirst: string; lessSecond: string };
  items: { id: string; reverse?: boolean }[];
};

// These are practical reading aids based on the wording of existing items, not new color scores.
const GROUPS: InsightGroup[] = [
  {
    id: 'expression',
    he: {
      low: 'בתשובות שלך עולה נטייה להיות נוכח ומביע בשיחה: ליזום, להשתתף ולשתף מחשבות בקול.',
      high: 'בתשובות שלך עולה נטייה לסגנון שקט ומתבונן יותר: להקשיב, לשמור מרחב אישי ולהעדיף אינטראקציה פחות מוחצנת.',
      mixed: 'בתשובות שלך יש שילוב בין נוכחות והבעה לבין הקשבה ואיפוק. כדי להבין אותו, חשוב להבחין באילו היבטים בחרת יותר בכל צד — ולא להסיק מכך אוטומטית שאתה גמיש בכל מצב.', lessFirst: 'הצד של יוזמה והבעה פחות בולט בתשובות שלך.', lessSecond: 'הצד של הקשבה ואיפוק פחות בולט בתשובות שלך.'
    },
    en: {
      low: 'Your answers suggest a more outward, expressive presence in conversation: initiating, participating, and sharing thoughts aloud.',
      high: 'Your answers suggest a quieter, more observant style: listening, preserving personal space, and preferring less outwardly expressive interaction.',
      mixed: 'Your answers combine outward expression with listening and restraint. To understand that pattern, it helps to distinguish which aspects you chose on each side rather than assuming you are flexible in every situation.', lessFirst: 'Initiative and outward expression are less prominent in your answers.', lessSecond: 'Listening and restraint are less prominent in your answers.'
    },
    items: ['ab1','ab2','ab3','ab4','ab5','ab8','ab9'].map(id => ({ id }))
  },
  {
    id: 'assertiveness',
    he: {
      low: 'בתשובות שלך עולה נטייה לעמוד על שלך ולהביע עמדה גם כשיש חיכוך.',
      high: 'בתשובות שלך עולה נטייה לשמור על הרמוניה, להתגמש ולהתאים את עצמך לעמדות ולצרכים של אחרים.',
      mixed: 'ניכרת בתשובות שלך תנועה בין עמידה על שלך לבין התאמה לאחרים. כדי לדייק, צריך להסתכל על סוג ההתנהגות: ביטוי עמדה, התעקשות על עקרונות, או בחירה להימנע מחיכוך — אלה לא בדיוק אותו דבר.', lessFirst: 'עמידה על עמדה והתעקשות פחות בולטות בתשובות האלה.', lessSecond: 'התאמה לאחרים ושמירה על הרמוניה פחות בולטות בתשובות האלה.'
    },
    en: {
      low: 'Your answers suggest a tendency to stand your ground and express your position even when there is friction.',
      high: 'Your answers suggest a tendency to preserve harmony, adapt, and accommodate other people’s positions and needs.',
      mixed: 'Your answers move between standing your ground and accommodating others. To interpret this accurately, distinguish expressing a view, insisting on principles, and avoiding friction; these are related but not identical behaviors.', lessFirst: 'Standing your ground and insisting on a position are less prominent in these answers.', lessSecond: 'Accommodating others and preserving harmony are less prominent in these answers.'
    },
    items: ['ab10','ab13','ab15','cd4','cd5','cd14'].map(id => ({ id }))
  },
  {
    id: 'structure',
    he: {
      low: 'בתשובות שלך עולה העדפה לתכנון, למבנה ולדרך עבודה מוגדרת.',
      high: 'בתשובות שלך עולה העדפה לחופש פעולה, לספונטניות ולהתאמה תוך כדי תנועה.',
      mixed: 'בתשובות שלך מופיעים גם תכנון ומבנה וגם פתיחות לשינוי. זה לא בהכרח אומר ששני הצדדים שווים: יש הבדל בין לתכנן מראש, לאהוב סדר, ולהיצמד לתוכנית כשהנסיבות משתנות.', lessFirst: 'תכנון, סדר ומבנה פחות בולטים בתשובות האלה.', lessSecond: 'ספונטניות והתאמה תוך כדי תנועה פחות בולטות בתשובות האלה.'
    },
    en: {
      low: 'Your answers suggest a preference for planning, structure, and a defined way of working.',
      high: 'Your answers suggest a preference for freedom, spontaneity, and adapting as you go.',
      mixed: 'Your answers include both planning and structure and openness to change. That does not mean the two sides are equal: planning ahead, liking order, and sticking to a plan when circumstances change are different things.', lessFirst: 'Planning, order, and structure are less prominent in these answers.', lessSecond: 'Spontaneity and adapting as you go are less prominent in these answers.'
    },
    items: [
      { id: 'cd6' }, { id: 'cd10' }, { id: 'cd12' }
    ]
  },
  {
    id: 'peopleTask',
    he: {
      low: 'בתשובות שלך עולה דגש על משימה, שיטות ותוצאות, לצד נטייה לענייניות ולעבודה עצמאית יותר.',
      high: 'בתשובות שלך עולה דגש על אנשים, קשרים ושיתוף פעולה, לצד נגישות ועניין באינטראקציה עם אחרים.',
      mixed: 'בתשובות שלך מופיעים גם שיקולי משימה וגם שיקולי אנשים, אבל השאלות נוגעות להתנהגויות שונות: תעדוף תוצאה, נגישות לאחרים, עבודה עצמאית ושיתוף פעולה. כדאי לקרוא את הבחירות בכל היבט בנפרד.', lessFirst: 'תעדוף משימה, שיטות ועבודה עצמאית פחות בולטים בתשובות האלה.', lessSecond: 'תעדוף אנשים, נגישות ושיתוף פעולה פחות בולטים בתשובות האלה.'
    },
    en: {
      low: 'Your answers suggest an emphasis on tasks, methods, and results, alongside a more businesslike and independent approach.',
      high: 'Your answers suggest an emphasis on people, relationships, and collaboration, alongside approachability and interest in interaction.',
      mixed: 'Your answers include both task considerations and people considerations, but the items cover different behaviors: prioritizing outcomes, approachability, independent work, and collaboration. It is useful to read each aspect separately.', lessFirst: 'Task, methods, and independent work are less prominent in these answers.', lessSecond: 'People, approachability, and collaboration are less prominent in these answers.'
    },
    items: ['cd7','cd8','cd11','cd15'].map(id => ({ id }))
  }
];

export interface AnswerInsight {
  id: string;
  text: string;
  strength: number;
  direction: 'first' | 'second' | 'mixed';
}

export function deriveAnswerInsights(answers: QuestionnaireAnswers | null | undefined, lang: 'he' | 'en' = 'he'): AnswerInsight[] {
  if (!answers) return [];
  const he = lang === 'he';
  const output: AnswerInsight[] = [];

  for (const group of GROUPS) {
    const values = group.items
      .map(item => {
        const raw = answers[item.id];
        if (typeof raw !== 'number' || raw < 1 || raw > 6) return null;
        return item.reverse ? 7 - raw : raw;
      })
      .filter((v): v is number => v !== null);

    if (values.length < 3) continue;
    const lowCount = values.filter(v => v <= 2).length;
    const highCount = values.filter(v => v >= 5).length;
    const firstCount = values.filter(v => v <= 3).length;
    const secondCount = values.filter(v => v >= 4).length;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const hasBoth = values.length <= 3 ? lowCount >= 1 && highCount >= 1 : lowCount >= 2 && highCount >= 2;

    let text: string | null = null;
    const leansFirst = mean <= 3.35 && firstCount > secondCount;
    const leansSecond = mean >= 3.65 && secondCount > firstCount;
    if (leansFirst) text = (he ? group.he : group.en).low;
    else if (leansSecond) text = (he ? group.he : group.en).high;
    else if (hasBoth) text = (he ? group.he : group.en).mixed;

    if (text) {
      const direction: AnswerInsight['direction'] = leansFirst ? 'first' : leansSecond ? 'second' : 'mixed';
      const sideDifference = Math.abs(firstCount - secondCount);
      const lessVisible = sideDifference >= 2
        ? (he ? group.he : group.en)[firstCount < secondCount ? 'lessFirst' : 'lessSecond']
        : '';
      const strength = Math.abs(mean - 3.5) + Math.max(lowCount, highCount) * 0.08;
      output.push({ id: group.id, text: lessVisible ? text + ' ' + lessVisible : text, strength, direction });
    }
  }

  return output.sort((a, b) => b.strength - a.strength).slice(0, 3);
}

