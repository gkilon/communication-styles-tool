export type QuestionnaireAnswers = Record<string, number>;

type InsightGroup = {
  id: string;
  he: { low: string; high: string; mixed: string };
  en: { low: string; high: string; mixed: string };
  items: { id: string; reverse?: boolean }[];
};

// These are practical reading aids based on the wording of existing items, not new color scores.
const GROUPS: InsightGroup[] = [
  {
    id: 'expression',
    he: {
      low: 'בתשובות שלך עולה נטייה להיות נוכח ומביע בשיחה: ליזום, להשתתף ולשתף מחשבות בקול.',
      high: 'בתשובות שלך עולה נטייה לסגנון שקט ומתבונן יותר: להקשיב, לשמור מרחב אישי ולהעדיף אינטראקציה פחות מוחצנת.',
      mixed: 'בתשובות שלך יש שילוב בין נוכחות והבעה לבין הקשבה ואיפוק. נראה שהסגנון שלך משתנה לפי סוג האינטראקציה, ולא נע בכיוון אחד בלבד.'
    },
    en: {
      low: 'Your answers suggest a more outward, expressive presence in conversation: initiating, participating, and sharing thoughts aloud.',
      high: 'Your answers suggest a quieter, more observant style: listening, preserving personal space, and preferring less outwardly expressive interaction.',
      mixed: 'Your answers combine outward expression with listening and restraint. Your style may vary by interaction rather than leaning in only one direction.'
    },
    items: ['ab1','ab2','ab3','ab4','ab5','ab8','ab9'].map(id => ({ id }))
  },
  {
    id: 'assertiveness',
    he: {
      low: 'בתשובות שלך עולה נטייה לעמוד על שלך ולהביע עמדה גם כשיש חיכוך.',
      high: 'בתשובות שלך עולה נטייה לשמור על הרמוניה, להתגמש ולהתאים את עצמך לעמדות ולצרכים של אחרים.',
      mixed: 'ניכרת אצלך נטייה לעמוד על שלך, לצד בחירות שמצביעות גם על גמישות או רצון לשמור על היחסים. זה לא בהכרח אומר שאתה גם וגם; ייתכן שאתה ברור בעמדתך, אך בוחר מתי וכיצד להתעקש.'
    },
    en: {
      low: 'Your answers suggest a tendency to stand your ground and express your position even when there is friction.',
      high: 'Your answers suggest a tendency to preserve harmony, adapt, and accommodate other people’s positions and needs.',
      mixed: 'You show a lean toward standing your ground, alongside choices that suggest flexibility or a wish to preserve relationships. This does not simply mean you are both; you may be clear about your position while choosing when and how to insist on it.'
    },
    items: ['ab10','ab13','ab15','cd4','cd5','cd14'].map(id => ({ id }))
  },
  {
    id: 'structure',
    he: {
      low: 'בתשובות שלך עולה העדפה לתכנון, למבנה ולדרך עבודה מוגדרת.',
      high: 'בתשובות שלך עולה העדפה לחופש פעולה, לספונטניות ולהתאמה תוך כדי תנועה.',
      mixed: 'בתשובות שלך מופיעים גם צורך במבנה וגם העדפה לגמישות. ייתכן שאתה רוצה מסגרת ברורה, אך לא בהכרח להיצמד אליה בכל מצב.'
    },
    en: {
      low: 'Your answers suggest a preference for planning, structure, and a defined way of working.',
      high: 'Your answers suggest a preference for freedom, spontaneity, and adapting as you go.',
      mixed: 'Your answers show both a need for structure and a preference for flexibility. You may value a clear framework without wanting to follow it rigidly in every situation.'
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
      mixed: 'בתשובות שלך יש שילוב בין דגש על משימה ושיטות לבין חשיבות ליחסים ולאנשים. נראה ששני הצדדים רלוונטיים לך, בהתאם להקשר.'
    },
    en: {
      low: 'Your answers suggest an emphasis on tasks, methods, and results, alongside a more businesslike and independent approach.',
      high: 'Your answers suggest an emphasis on people, relationships, and collaboration, alongside approachability and interest in interaction.',
      mixed: 'Your answers combine a focus on tasks and methods with an appreciation for relationships and people. Both sides may matter to you depending on the context.'
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
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const hasBoth = values.length <= 3 ? lowCount >= 1 && highCount >= 1 : lowCount >= 2 && highCount >= 2;

    let text: string | null = null;
    if (mean <= 2.8 && lowCount >= 2) text = (he ? group.he : group.en).low;
    else if (mean >= 4.2 && highCount >= 2) text = (he ? group.he : group.en).high;
    else if (hasBoth) text = (he ? group.he : group.en).mixed;

    if (text) {
      const direction: AnswerInsight['direction'] = mean <= 2.8 && lowCount >= 2 ? 'first' : mean >= 4.2 && highCount >= 2 ? 'second' : 'mixed';
      const strength = Math.abs(mean - 3.5) + Math.max(lowCount, highCount) * 0.08;
      output.push({ id: group.id, text, strength, direction });
    }
  }

  return output.sort((a, b) => b.strength - a.strength).slice(0, 3);
}

