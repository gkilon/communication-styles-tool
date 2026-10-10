import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import type { Scores, BackgroundData } from '../types';
import { getProfileFacts } from '../services/analysisService';

export type MemoryCategory = 'work' | 'values' | 'patterns' | 'focus';
export type MemorySource = 'questionnaire' | 'user' | 'advisor';

export interface MemoryItem {
  id: string;
  text: string;
  category: MemoryCategory;
  source: MemorySource;
  updatedAt: string;
}

export interface CoachMemory {
  items: MemoryItem[];
  loaded: boolean;
  saveFailed: boolean;
  addItem: (text: string, category: MemoryCategory) => void;
  updateItem: (id: string, text: string) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
}

export const MAX_ITEMS = 30;
export const MAX_TEXT = 200;

// Hebrew labels, used when the list is handed to the advisor.
const CATEGORY_HE: Record<MemoryCategory, string> = {
  work: 'מי אתה בעבודה',
  values: 'מה חשוב לך',
  patterns: 'דפוסים שזוהו',
  focus: 'על מה עובדים עכשיו'
};

/** The list as plain lines for the advisor's prompt. */
export const memoryToPromptLines = (items: MemoryItem[]): string[] =>
  items.map(i => `${CATEGORY_HE[i.category]}: ${i.text}`);

const GOAL_LABELS: Record<string, { he: string; en: string }> = {
  self_learn: { he: 'ללמוד על עצמי ועל סגנון התקשורת שלי', en: 'to learn about myself and my communication style' },
  management: { he: 'לקבל כלים מעשיים לניהול, מנהיגות והנעה', en: 'to get practical tools for management, leadership and motivation' },
  teamwork: { he: 'לשפר את עבודת הצוות והממשקים הבינאישיים', en: 'to improve teamwork and interpersonal interfaces' },
  influence: { he: 'להבין כיצד להשפיע טוב יותר על אחרים', en: 'to understand how to influence others better' }
};

// Bump when the seeded wording changes, so existing accounts get the new lines.
const SEED_VERSION = 2;

/**
 * Plain-language lines about the person, built from the questionnaire (opening questions +
 * the profile). They are an initial hypothesis, marked as coming from the questionnaire, and
 * replaced when it is retaken. Each line is one short sentence, worded without gendered forms.
 */
export const buildSeedItems = (scores: Scores, bg: BackgroundData | null | undefined, lang: 'he' | 'en'): MemoryItem[] => {
  const he = lang === 'he';
  const now = new Date().toISOString();
  const items: MemoryItem[] = [];
  const add = (id: string, category: MemoryCategory, text: string) =>
    items.push({ id, text: text.slice(0, MAX_TEXT), category, source: 'questionnaire', updatedAt: now });

  const f = getProfileFacts(scores, lang);

  // Who you are at work
  if (bg?.isManager === 'yes') {
    add('q-role', 'work', he
      ? 'בתפקיד ניהולי: הסגנון שלך משפיע ישירות על האופן שבו הצוות חווה אותך'
      : 'In a management role: your style directly shapes how your team experiences you');
  } else if (bg?.isManager === 'no') {
    add('q-role', 'work', he
      ? 'בתפקיד לא ניהולי: הסגנון שלך נראה בעיקר מול עמיתים ומול הממונים עליך'
      : 'In a non-management role: your style shows mostly with peers and with the people you report to');
  }

  if (f) {
    if (f.shape === 'strong') {
      add('q-across', 'work', he
        ? `מי שעובד איתך פוגש נטייה אחת בולטת: ${f.dom.adjective}. זה הופך אותך לעקבי ולקל לזיהוי`
        : `People working with you meet one prominent tendency: ${f.dom.adjective}. It makes you consistent and easy to read`);
    } else if (f.shape === 'twoStyles') {
      add('q-across', 'work', he
        ? `יש לך שני סגנונות כמעט שווים, ${f.dom.adjective} ו${f.sec.adjective}, ואחרים לא תמיד יודעים איזה מהם יופיע`
        : `You have two almost equal styles, ${f.dom.adjective} and ${f.sec.adjective}, and others don't always know which will show up`);
    } else if (f.shape === 'balanced') {
      add('q-across', 'work', he
        ? 'ארבע האנרגיות נוכחות אצלך בעוצמה דומה, ולכן יש לך גמישות לעבור בין סגנונות לפי הסיטואציה'
        : 'All four energies are present at similar strength, so you can move between styles depending on the situation');
    } else {
      add('q-across', 'work', he
        ? `מי שעובד איתך פוגש קודם כל את הצד ${f.dom.adjective}, ולצידו את הצד ${f.sec.adjective}`
        : `People working with you meet the ${f.dom.adjective} side first, and the ${f.sec.adjective} side beside it`);
    }
  }

  // What matters to you
  if (bg?.goal) {
    const label = GOAL_LABELS[bg.goal];
    add('q-goal', 'values', he
      ? `מטרה שציינת בשאלון: ${label ? label.he : bg.goal}`
      : `Goal stated in the questionnaire: ${label ? label.en : bg.goal}`);
  }

  if (f) {
    const needs = f.shape === 'twoStyles'
      ? (he ? `${f.dom.notes.needs}, ובמקביל ${f.sec.notes.needs}` : `${f.dom.notes.needs}, and at the same time ${f.sec.notes.needs}`)
      : f.dom.notes.needs;
    add('q-needs', 'values', he ? `כדי להיות במיטבך חשוב לך: ${needs}` : `To be at your best you need: ${needs}`);
    add('q-speak', 'values', he ? `מה שעובד איתך בשיחה: ${f.dom.notes.speak}` : `What works when talking with you: ${f.dom.notes.speak}`);

    // Patterns
    const strengths = f.dom.strengths.slice(0, 3);
    add('q-strength', 'patterns', he
      ? `חוזקות טבעיות: ${strengths[0]}, ${strengths[1]} ו${strengths[2]}`
      : `Natural strengths: ${strengths[0]}, ${strengths[1]} and ${strengths[2]}`);

    if (f.shape === 'balanced') {
      add('q-pressure', 'patterns', he
        ? 'בלי נטייה מובילה, בלחץ יכול להיות קשה להחליט איזה סגנון מתאים לרגע'
        : 'With no leading tendency, under pressure it can be hard to decide which style fits the moment');
    } else {
      add('q-pressure', 'patterns', he
        ? `בלחץ, הסגנון שלך עלול להיראות כך: ${f.dom.notes.pressure}`
        : `Under pressure, your style can look like this: ${f.dom.notes.pressure}`);
    }

    if (f.shape === 'twoStyles') {
      add('q-tension', 'patterns', he
        ? `מתח פנימי אפשרי בין הצד ${f.dom.adjective} לצד ${f.sec.adjective}, שעלול להיראות כחוסר עקביות מול אחרים`
        : `A possible inner tension between the ${f.dom.adjective} side and the ${f.sec.adjective} side, which can look like inconsistency to others`);
    } else if (f.shape === 'strong' || f.shape === 'moderate') {
      add('q-tension', 'patterns', he
        ? `הצד האחר של החוזקה שלך: ${f.dom.weaknesses[0]}; ${f.dom.weaknesses[1]}`
        : `The other side of your strength: ${f.dom.weaknesses[0]}; ${f.dom.weaknesses[1]}`);
    }

    add('q-effort', 'patterns', f.shape === 'balanced'
      ? (he ? `אזור פיתוח קל, פחות אוטומטי אצלך: ${f.weak.strengths[0]}; ${f.weak.strengths[1]}` : `A mild development area, less automatic for you: ${f.weak.strengths[0]}; ${f.weak.strengths[1]}`)
      : (he ? `מה שדורש ממך מאמץ מודע: ${f.weak.strengths[0]}; ${f.weak.strengths[1]}` : `What takes conscious effort: ${f.weak.strengths[0]}; ${f.weak.strengths[1]}`));

    // What to work on
    add('q-focus1', 'focus', he ? `כיוון פיתוח ראשון: ${f.dom.recommendation_focus}` : `First development direction: ${f.dom.recommendation_focus}`);
    add('q-focus2', 'focus', he
      ? `ובהמשך: ${f.weak.recommendation_focus}, גם כשזה לא מרגיש טבעי`
      : `Then: ${f.weak.recommendation_focus}, even when it doesn't feel natural`);
  }
  return items;
};

const seedSignature = (scores: Scores, bg: BackgroundData | null | undefined, lang: string) =>
  JSON.stringify([SEED_VERSION, scores?.a, scores?.b, scores?.c, scores?.d, bg?.isManager || '', bg?.goal || '', lang]);

const getUid = (): string | null => (auth && auth.currentUser ? auth.currentUser.uid : null);

const cleanItems = (raw: any): MemoryItem[] =>
  (Array.isArray(raw) ? raw : [])
    .filter(i => i && typeof i.text === 'string' && i.text.trim() && typeof i.id === 'string')
    .map(i => ({
      id: i.id,
      text: String(i.text).slice(0, MAX_TEXT),
      category: (['work', 'values', 'patterns', 'focus'].includes(i.category) ? i.category : 'patterns') as MemoryCategory,
      source: (['questionnaire', 'user', 'advisor'].includes(i.source) ? i.source : 'user') as MemorySource,
      updatedAt: typeof i.updatedAt === 'string' ? i.updatedAt : ''
    }))
    .slice(0, MAX_ITEMS);

/**
 * "What I know about you": a short, plain list about the user that the advisor uses in the
 * conversations. It lives in the user's own account (users/{uid}/coach_profile/main), is
 * private (not even admins can read it) and the user can read, edit, delete and add to it.
 * The color model is only one of its sources.
 */
export function useCoachMemory(scores: Scores, backgroundData: BackgroundData | null | undefined, lang: 'he' | 'en'): CoachMemory {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const sigRef = useRef('');
  const itemsRef = useRef<MemoryItem[]>([]);
  itemsRef.current = items;

  const persist = async (next: MemoryItem[], sig: string) => {
    const uid = getUid();
    if (!uid || !db) return;
    try {
      await setDoc(doc(db, 'users', uid, 'coach_profile', 'main'), {
        items: next,
        seedSig: sig,
        updatedAt: new Date().toISOString()
      });
      setSaveFailed(false);
    } catch (err) {
      console.error('Error saving advisor profile:', err);
      setSaveFailed(true);
    }
  };

  const apply = (next: MemoryItem[]) => {
    setItems(next);
    itemsRef.current = next;
    persist(next, sigRef.current);
  };

  // Load once; seed from the questionnaire, and refresh those lines if the questionnaire changed.
  useEffect(() => {
    const sig = seedSignature(scores, backgroundData, lang);
    sigRef.current = sig;
    const uid = getUid();
    let cancelled = false;
    (async () => {
      let current: MemoryItem[] = [];
      let storedSig = '';
      let existed = false;
      if (uid && db) {
        try {
          const snap = await getDoc(doc(db, 'users', uid, 'coach_profile', 'main'));
          if (snap.exists()) {
            existed = true;
            const data = snap.data() as any;
            current = cleanItems(data.items);
            storedSig = typeof data.seedSig === 'string' ? data.seedSig : '';
          }
        } catch (err) {
          console.error('Error loading advisor profile:', err);
        }
      }
      if (cancelled) return;
      if (!existed || storedSig !== sig) {
        const kept = current.filter(i => i.source !== 'questionnaire');
        current = [...buildSeedItems(scores, backgroundData, lang), ...kept].slice(0, MAX_ITEMS);
        setItems(current);
        itemsRef.current = current;
        persist(current, sig);
      } else {
        setItems(current);
        itemsRef.current = current;
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores?.a, scores?.b, scores?.c, scores?.d, backgroundData?.isManager, backgroundData?.goal, lang]);

  const addItem = (text: string, category: MemoryCategory) => {
    const t = text.trim().slice(0, MAX_TEXT);
    if (!t || itemsRef.current.length >= MAX_ITEMS) return;
    const item: MemoryItem = {
      id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      text: t,
      category,
      source: 'user',
      updatedAt: new Date().toISOString()
    };
    apply([...itemsRef.current, item]);
  };

  // An item the user edits becomes theirs and is no longer replaced when the questionnaire is retaken.
  const updateItem = (id: string, text: string) => {
    const t = text.trim().slice(0, MAX_TEXT);
    if (!t) return;
    apply(itemsRef.current.map(i => (i.id === id ? { ...i, text: t, source: 'user' as MemorySource, updatedAt: new Date().toISOString() } : i)));
  };

  const removeItem = (id: string) => apply(itemsRef.current.filter(i => i.id !== id));

  const clearAll = () => apply([]);

  return { items, loaded, saveFailed, addItem, updateItem, removeItem, clearAll };
}
