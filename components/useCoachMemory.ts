import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import type { Scores, BackgroundData } from '../types';
import { getProfileFacts } from '../services/analysisService';
import { generateKnownAboutUser, updateKnownAboutUser } from '../services/geminiService';

// generated = my first draft from the questionnaire; user = the person edited it; learned = refined after conversations
export type MemorySource = 'generated' | 'user' | 'learned';

export interface MemoryChange { summary: string[]; at: string; }

export interface CoachMemory {
  /** The "what I know about you" text, written to the person in second person. */
  text: string;
  /** 'generated' until the user edits it or a conversation refines it. */
  source: MemorySource;
  loaded: boolean;
  generating: boolean;
  saveFailed: boolean;
  /** The questionnaire was retaken after the user edited the text: offer to update it. */
  refreshSuggested: boolean;
  /** What the advisor changed after the latest conversation (null if nothing, or dismissed). */
  lastChange: MemoryChange | null;
  /** The text as it was before that change, so the person can take the update back. */
  canUndo: boolean;
  learning: boolean;
  /** An update happened that the person hasn't looked at yet. */
  hasUnseenUpdate: boolean;
  learnFrom: (messages: { sender: 'user' | 'ai'; text: string; isError?: boolean }[]) => Promise<void>;
  undoLastChange: () => void;
  dismissChange: () => void;
  markSeen: () => void;
  saveText: (text: string) => void;
  appendSentence: (text: string) => void;
  regenerate: () => Promise<void>;
  dismissRefresh: () => void;
  clear: () => void;
}

export const MAX_TEXT = 2500;

const GOAL_LABELS: Record<string, { he: string; en: string }> = {
  self_learn: { he: 'ללמוד על עצמי ועל סגנון התקשורת שלי', en: 'to learn about myself and my communication style' },
  management: { he: 'לקבל כלים מעשיים לניהול, מנהיגות והנעה', en: 'to get practical tools for management, leadership and motivation' },
  teamwork: { he: 'לשפר את עבודת הצוות והממשקים הבינאישיים', en: 'to improve teamwork and interpersonal interfaces' },
  influence: { he: 'להבין כיצד להשפיע טוב יותר על אחרים', en: 'to understand how to influence others better' }
};

/**
 * The plain facts behind the first draft: the opening questions (role, goal) and what the
 * profile suggests. These are only the raw material — the paragraph the user reads is written
 * from them by the advisor, and the user can change it.
 */
export const buildFactLines = (scores: Scores, bg: BackgroundData | null | undefined, lang: 'he' | 'en'): string[] => {
  const he = lang === 'he';
  const lines: string[] = [];

  if (bg?.isManager === 'yes') lines.push(he ? 'בתפקיד ניהולי' : 'In a management role');
  else if (bg?.isManager === 'no') lines.push(he ? 'לא בתפקיד ניהולי' : 'Not in a management role');

  if (bg?.goal) {
    const label = GOAL_LABELS[bg.goal];
    lines.push(he
      ? `מטרה שציין בשאלון: ${label ? label.he : bg.goal}`
      : `Goal stated in the questionnaire: ${label ? label.en : bg.goal}`);
  }

  const f = getProfileFacts(scores, lang);
  if (f) {
    if (f.shape === 'strong') {
      lines.push(he ? `נטייה אחת בולטת בבירור: ${f.dom.adjective}` : `One clearly prominent tendency: ${f.dom.adjective}`);
    } else if (f.shape === 'twoStyles') {
      lines.push(he ? `שני סגנונות כמעט שווים: ${f.dom.adjective} ו${f.sec.adjective}` : `Two almost equal styles: ${f.dom.adjective} and ${f.sec.adjective}`);
    } else if (f.shape === 'balanced') {
      lines.push(he ? 'פרופיל מאוזן: אין סגנון שמוביל בבירור, והגמישות היא יתרון' : 'A balanced profile: no style clearly leads, and flexibility is an advantage');
    } else {
      lines.push(he ? `נטייה ברורה: ${f.dom.adjective}, ולצידה ${f.sec.adjective}` : `A clear tendency: ${f.dom.adjective}, with ${f.sec.adjective} beside it`);
    }
    lines.push(he ? `מה שהוא צריך מאחרים: ${f.dom.notes.needs}` : `What they need from others: ${f.dom.notes.needs}`);
    if (f.shape === 'twoStyles') {
      lines.push(he ? `ובמקביל, הצד השני שלו צריך: ${f.sec.notes.needs}` : `And at the same time, the other side needs: ${f.sec.notes.needs}`);
    }
    lines.push(he ? `מה שעובד בשיחה איתו: ${f.dom.notes.speak}` : `What works when talking with them: ${f.dom.notes.speak}`);
    lines.push(he ? `חוזקות טבעיות: ${f.dom.strengths.slice(0, 3).join(', ')}` : `Natural strengths: ${f.dom.strengths.slice(0, 3).join(', ')}`);
    if (f.shape !== 'balanced') {
      lines.push(he ? `בלחץ זה עלול להיראות כך: ${f.dom.notes.pressure}` : `Under pressure it can look like: ${f.dom.notes.pressure}`);
      lines.push(he ? `מה שדורש ממנו מאמץ מודע: ${f.weak.strengths.slice(0, 2).join('; ')}` : `What takes conscious effort: ${f.weak.strengths.slice(0, 2).join('; ')}`);
    }
    lines.push(he ? `כיוון פיתוח אפשרי: ${f.dom.recommendation_focus}` : `A possible development direction: ${f.dom.recommendation_focus}`);
  }
  return lines;
};

// Bump when the way the text is produced changes, so the first drafts get rewritten.
const SEED_VERSION = 4;

const seedSignature = (scores: Scores, bg: BackgroundData | null | undefined, lang: string) =>
  JSON.stringify([SEED_VERSION, scores?.a, scores?.b, scores?.c, scores?.d, bg?.isManager || '', bg?.goal || '', bg?.gender || '', lang]);

const getUid = (): string | null => (auth && auth.currentUser ? auth.currentUser.uid : null);

/**
 * "What I know about you": a short, human paragraph about the user that the advisor uses in the
 * conversations. It lives in the user's own account (users/{uid}/coach_profile/main), is private
 * (not even admins can read it), and the user can read, edit, add to and delete it.
 * The first draft is written from the questionnaire; the color model is only one of its sources.
 */
export function useCoachMemory(scores: Scores, backgroundData: BackgroundData | null | undefined, lang: 'he' | 'en'): CoachMemory {
  const [text, setText] = useState('');
  const [source, setSource] = useState<MemorySource>('generated');
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [refreshSuggested, setRefreshSuggested] = useState(false);
  const [lastChange, setLastChange] = useState<MemoryChange | null>(null);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [learning, setLearning] = useState(false);
  const [hasUnseenUpdate, setHasUnseenUpdate] = useState(false);
  const learningRef = useRef(false);
  const lastChangeRef = useRef<MemoryChange | null>(null);
  const previousTextRef = useRef<string | null>(null);

  const sigRef = useRef('');
  const textRef = useRef('');
  const sourceRef = useRef<MemorySource>('generated');
  const generatingRef = useRef(false);
  const scoresRef = useRef(scores);
  const bgRef = useRef(backgroundData);
  scoresRef.current = scores;
  bgRef.current = backgroundData;

  const persist = async (t: string, src: MemorySource, sig: string) => {
    const uid = getUid();
    if (!uid || !db) return;
    try {
      await setDoc(doc(db, 'users', uid, 'coach_profile', 'main'), {
        text: t,
        source: src,
        seedSig: sig,
        updatedAt: new Date().toISOString(),
        ...(previousTextRef.current !== null ? { previousText: previousTextRef.current } : {}),
        ...(lastChangeRef.current ? { lastChange: lastChangeRef.current } : {})
      });
      setSaveFailed(false);
    } catch (err) {
      console.error('Error saving advisor profile:', err);
      setSaveFailed(true);
    }
  };

  const apply = (t: string, src: MemorySource, sig: string, save = true) => {
    setText(t);
    textRef.current = t;
    setSource(src);
    sourceRef.current = src;
    if (save) persist(t, src, sig);
  };

  // Write a fresh draft from the questionnaire. If the AI isn't available, show a plain fallback
  // for now but don't save it, so the next visit tries again.
  const generate = async (userNotes: string[]) => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    const facts = buildFactLines(scoresRef.current, bgRef.current, lang);
    if (facts.length === 0) {
      generatingRef.current = false;
      setGenerating(false);
      return;
    }
    try {
      const written = await generateKnownAboutUser(facts, bgRef.current?.gender || '', userNotes, lang);
      apply(written.slice(0, MAX_TEXT), 'generated', sigRef.current);
      setRefreshSuggested(false);
    } catch (err) {
      console.warn('Could not write the advisor profile text:', err);
      const fallback = [...userNotes, ...facts.slice(0, 6)].join('. ') + '.';
      apply(fallback, 'generated', sigRef.current, false);
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  };

  useEffect(() => {
    const sig = seedSignature(scores, backgroundData, lang);
    sigRef.current = sig;
    const uid = getUid();
    let cancelled = false;
    (async () => {
      let hasText = false;
      let existingText = '';
      let existingSource: MemorySource = 'generated';
      let storedSig = '';
      let oldUserNotes: string[] = [];
      if (uid && db) {
        try {
          const snap = await getDoc(doc(db, 'users', uid, 'coach_profile', 'main'));
          if (snap.exists()) {
            const data = snap.data() as any;
            if (typeof data.text === 'string') {
              hasText = true;
              existingText = data.text;
              existingSource = data.source === 'user' ? 'user' : data.source === 'learned' ? 'learned' : 'generated';
              storedSig = typeof data.seedSig === 'string' ? data.seedSig : '';
              if (typeof data.previousText === 'string') { previousTextRef.current = data.previousText; setPreviousText(data.previousText); }
              if (data.lastChange && Array.isArray(data.lastChange.summary)) {
                lastChangeRef.current = { summary: data.lastChange.summary.map(String).slice(0, 3), at: String(data.lastChange.at || '') };
                setLastChange(lastChangeRef.current);
              }
            } else if (Array.isArray(data.items)) {
              // An earlier version kept a list; carry over only what the user wrote themselves.
              oldUserNotes = data.items
                .filter((i: any) => i && i.source === 'user' && typeof i.text === 'string' && i.text.trim())
                .map((i: any) => String(i.text));
            }
          }
        } catch (err) {
          console.error('Error loading advisor profile:', err);
        }
      }
      if (cancelled) return;
      if (hasText) {
        apply(existingText, existingSource, sig, false);
        if (storedSig !== sig && existingText.trim()) {
          if (existingSource === 'generated') await generate([]);
          else setRefreshSuggested(true);  // edited or refined by conversations: ask, never overwrite
        }
      } else {
        await generate(oldUserNotes);
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores?.a, scores?.b, scores?.c, scores?.d, backgroundData?.isManager, backgroundData?.goal, backgroundData?.gender, lang]);

  // Anything the user writes or edits becomes theirs and is never overwritten silently.
  const saveText = (t: string) => {
    previousTextRef.current = null;
    setPreviousText(null);
    lastChangeRef.current = null;
    setLastChange(null);
    apply(t.trim().slice(0, MAX_TEXT), 'user', sigRef.current);
    setRefreshSuggested(false);
  };

  const appendSentence = (t: string) => {
    const add = t.trim();
    if (!add) return;
    const base = textRef.current.trim();
    saveText(base ? `${base}\n\n${add}` : add);
  };

  // Rewrite from the questionnaire. If the text had been edited or refined, those words are carried in.
  const regenerate = async () => {
    await generate(sourceRef.current !== 'generated' && textRef.current.trim() ? [textRef.current.trim()] : []);
  };

  // After a conversation: refine the text with what was learned (if anything), and show what changed.
  const learnFrom = async (messages: { sender: 'user' | 'ai'; text: string; isError?: boolean }[]) => {
    if (learningRef.current || generatingRef.current) return;
    const current = textRef.current.trim();
    if (!current) return; // the person cleared it: don't write anything back
    const excerpt = messages
      .filter(m => !m.isError && m.text && m.text.trim())
      .slice(-16)
      .map(m => `${m.sender === 'user' ? (lang === 'he' ? 'המשתמש' : 'User') : 'Kilon'}: ${m.text.trim()}`)
      .join('\n\n')
      .slice(-6000);
    if (!excerpt) return;
    learningRef.current = true;
    setLearning(true);
    try {
      const result = await updateKnownAboutUser(current, excerpt, bgRef.current?.gender || '', lang);
      if (result.changed) {
        previousTextRef.current = current;
        setPreviousText(current);
        const change: MemoryChange = { summary: result.summary, at: new Date().toISOString() };
        lastChangeRef.current = change;
        setLastChange(change);
        setHasUnseenUpdate(true);
        apply(result.text.slice(0, MAX_TEXT), 'learned', sigRef.current);
      }
    } catch (err) {
      console.warn('Could not refine the advisor profile text:', err);
    } finally {
      learningRef.current = false;
      setLearning(false);
    }
  };

  // Take the latest update back.
  const undoLastChange = () => {
    if (previousTextRef.current === null) return;
    const back = previousTextRef.current;
    previousTextRef.current = null;
    setPreviousText(null);
    lastChangeRef.current = null;
    setLastChange(null);
    setHasUnseenUpdate(false);
    apply(back, sourceRef.current === 'generated' ? 'generated' : 'user', sigRef.current);
  };

  const dismissChange = () => {
    lastChangeRef.current = null;
    setLastChange(null);
    setHasUnseenUpdate(false);
    persist(textRef.current, sourceRef.current, sigRef.current);
  };

  const markSeen = () => setHasUnseenUpdate(false);

  const dismissRefresh = () => {
    setRefreshSuggested(false);
    // remember that we asked for this questionnaire, so we don't ask again until it changes
    persist(textRef.current, sourceRef.current, sigRef.current);
  };

  const clear = () => {
    previousTextRef.current = null;
    setPreviousText(null);
    lastChangeRef.current = null;
    setLastChange(null);
    setHasUnseenUpdate(false);
    apply('', 'user', sigRef.current);
    setRefreshSuggested(false);
  };

  return {
    text, source, loaded, generating, saveFailed, refreshSuggested,
    lastChange, canUndo: previousText !== null, learning, hasUnseenUpdate,
    learnFrom, undoLastChange, dismissChange, markSeen,
    saveText, appendSentence, regenerate, dismissRefresh, clear
  };
}
