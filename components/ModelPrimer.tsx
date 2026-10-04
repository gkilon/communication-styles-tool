import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

type Lang = 'he' | 'en';

interface ColorInfo {
  key: 'red' | 'yellow' | 'green' | 'blue';
  name: string;
  nickname: string;
  speak: string;
  good: string;
  bad: string;
  useWhen: string;
  box: string;
  title: string;
}

const TEXT: Record<Lang, {
  button: string;
  buttonHint: string;
  intro: string;
  axesTitle: string;
  axis1: string;
  axis2: string;
  colorsTitle: string;
  speakLabel: string;
  goodLabel: string;
  badLabel: string;
  useWhenLabel: string;
  whyTitle: string;
  why: string;
  keepTitle: string;
  keep: string[];
  colors: Omit<ColorInfo, 'box' | 'title'>[];
}> = {
  he: {
    button: '📖 להכיר את המודל',
    buttonHint: 'קריאה של דקה: איך המודל עובד ומה אפשר לעשות איתו',
    intro:
      'המודל מבוסס על הטיפולוגיה של קארל גוסטב יונג. הוא מתאר העדפות, כלומר את הדרך שבה אנחנו נוטים להתנהל ולתקשר, ולא "מי אנחנו". לכל אחד יש את ארבע האנרגיות, רק במינונים שונים.',
    axesTitle: 'שני צירים יוצרים את ארבעת הצבעים',
    axis1: 'מופנמות מול מוחצנות: מאיפה שואבים אנרגיה ואיך מבטאים אותה. שקט, מתבונן ומעמיק, מול דברן, מעורב ובימתי.',
    axis2: 'משימה מול יחסים: איך מקבלים החלטות. חשיבה ומיקוד במשימה, מול רגש ומיקוד ביחסים.',
    colorsTitle: 'ארבעת הצבעים בקצרה',
    speakLabel: 'איך לדבר אליו:',
    goodLabel: 'ביום טוב:',
    badLabel: 'ביום רע:',
    useWhenLabel: 'מתי כדאי להיעזר בו:',
    whyTitle: 'למה זה חשוב',
    why: 'הבנה של הסגנון שלי מובילה למודעות עצמית וניהול עצמי. הבנה של הסגנון של האחר מובילה לניהול יחסים. ביחד זה נותן השפעה ושיתוף פעולה.',
    keepTitle: 'שלוש נקודות לזכור',
    keep: [
      'אין צבע טוב או רע. כל צבע הוא חוזקה, ובימים קשים הוא גם המלכודת.',
      'העדפה היא לא יכולת. אפשר לפעול גם בצבעים שפחות נוחים לנו.',
      'התקשורת היעילה היא בשפה של האחר: כדי לרתום מישהו, מדברים אליו בצבע שלו.'
    ],
    colors: [
      {
        key: 'red',
        name: 'אדום',
        nickname: 'המשימתי',
        speak: 'תכלס',
        good: 'ממוקד מטרה, נחוש, תכליתי, נועז ואוהב אתגרים.',
        bad: 'שתלטן, חסר סבלנות ולא מקשיב.',
        useWhen: 'כשצריך מיקוד, הובלה חזקה ומטרה ברורה.'
      },
      {
        key: 'yellow',
        name: 'צהוב',
        nickname: 'המלהיב',
        speak: 'ברעיונות',
        good: 'סוחף, יזם, כריזמטי ופתוח לשינוי.',
        bad: 'מפוזר, קופץ מנושא לנושא ומאבד פרטים.',
        useWhen: 'כשצריך פתרון יצירתי, חשיבה כמה צעדים קדימה והקלת אווירה.'
      },
      {
        key: 'green',
        name: 'ירוק',
        nickname: 'התומך',
        speak: 'באכפתיות ובשיתוף',
        good: 'מקשיב, אמפתי, סבלני ושחקן צוות.',
        bad: 'נמנע מקונפליקט, דוחה החלטות ולוקח דברים אישית.',
        useWhen: 'כשיש מורכבות בינאישית או בעיה אישית, וכשרוצים עבודת צוות טובה.'
      },
      {
        key: 'blue',
        name: 'כחול',
        nickname: 'המנתח',
        speak: 'בנתונים',
        good: 'שקול, מדויק, יסודי וחוקר.',
        bad: 'מרוחק, שאלותיו נתפסות כביקורתיות, ואיטי באי ודאות.',
        useWhen: 'כשצריך לרדת לשורש בעיה מורכבת ולבנות תהליך סדור.'
      }
    ]
  },
  en: {
    button: '📖 Get to know the model',
    buttonHint: 'A one-minute read: how the model works and what to do with it',
    intro:
      'The model builds on Carl Gustav Jung’s typology. It describes preferences, meaning the way we tend to act and communicate, not "who we are". Everyone has all four energies, in different doses.',
    axesTitle: 'Two axes create the four colors',
    axis1: 'Introversion vs. extraversion: where we draw energy from and how we express it. Quiet, observing and deep, vs. talkative, involved and expressive.',
    axis2: 'Task vs. relationships: how we make decisions. Thinking and task focus, vs. feeling and relationship focus.',
    colorsTitle: 'The four colors in brief',
    speakLabel: 'How to talk to them:',
    goodLabel: 'On a good day:',
    badLabel: 'On a bad day:',
    useWhenLabel: 'Bring them in when:',
    whyTitle: 'Why it matters',
    why: 'Understanding my own style builds self-awareness and self-management. Understanding the other person’s style builds relationship management. Together they create influence and cooperation.',
    keepTitle: 'Three things to remember',
    keep: [
      'No color is good or bad. Each is a strength, and on hard days it is also the trap.',
      'A preference is not an ability. We can work in colors that feel less natural.',
      'Effective communication speaks the other person’s language: to win someone over, talk to them in their color.'
    ],
    colors: [
      {
        key: 'red',
        name: 'Red',
        nickname: 'The Driver',
        speak: 'Get to the point',
        good: 'Goal-focused, determined, purposeful, bold and loves challenges.',
        bad: 'Controlling, impatient and doesn’t listen.',
        useWhen: 'you need focus, strong leadership and a clear goal.'
      },
      {
        key: 'yellow',
        name: 'Yellow',
        nickname: 'The Inspirer',
        speak: 'With ideas',
        good: 'Inspiring, entrepreneurial, charismatic and open to change.',
        bad: 'Scattered, jumps between topics and loses details.',
        useWhen: 'you need a creative solution, thinking several steps ahead, and lighter energy.'
      },
      {
        key: 'green',
        name: 'Green',
        nickname: 'The Supporter',
        speak: 'With care and collaboration',
        good: 'Listens, empathetic, patient and a team player.',
        bad: 'Avoids conflict, postpones decisions and takes things personally.',
        useWhen: 'there is interpersonal complexity, a personal issue, or you want good teamwork.'
      },
      {
        key: 'blue',
        name: 'Blue',
        nickname: 'The Analyst',
        speak: 'With data',
        good: 'Thoughtful, precise, thorough and inquisitive.',
        bad: 'Distant, questions can feel critical, and slow under uncertainty.',
        useWhen: 'you need to get to the root of a complex problem and build an orderly process.'
      }
    ]
  }
};

const STYLE: Record<ColorInfo['key'], { box: string; title: string }> = {
  red: { box: 'border-red-500/30 bg-red-500/10', title: 'text-red-300' },
  yellow: { box: 'border-yellow-500/30 bg-yellow-500/10', title: 'text-yellow-300' },
  green: { box: 'border-green-500/30 bg-green-500/10', title: 'text-green-300' },
  blue: { box: 'border-blue-500/30 bg-blue-500/10', title: 'text-blue-300' }
};

export const ModelPrimer: React.FC = () => {
  const { lang, dir } = useLanguage();
  const tx = TEXT[lang === 'en' ? 'en' : 'he'];
  const [open, setOpen] = useState(false);
  const align = dir === 'rtl' ? 'text-right' : 'text-left';

  return (
    // Excluded from the PDF export: it is a learning aid, not part of the personal report.
    <div data-html2canvas-ignore="true" className={`relative z-10 mb-8 ${align}`}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 bg-glass-light hover:bg-gray-800/70 border border-cyan-500/30 rounded-2xl px-5 py-4 transition-all"
      >
        <span className={align}>
          <span className="block text-lg font-bold text-white">{tx.button}</span>
          <span className="block text-xs text-gray-400 mt-0.5">{tx.buttonHint}</span>
        </span>
        <span className="text-cyan-400 text-xl shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 bg-gray-900/60 border border-gray-700 rounded-2xl p-5 sm:p-6 space-y-6 text-gray-300 leading-relaxed">
          <p>{tx.intro}</p>

          <div>
            <h4 className="text-white font-bold mb-2">{tx.axesTitle}</h4>
            <ul className="space-y-2 list-disc ps-5">
              <li>{tx.axis1}</li>
              <li>{tx.axis2}</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3">{tx.colorsTitle}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tx.colors.map(c => (
                <div key={c.key} className={`rounded-xl border p-4 ${STYLE[c.key].box}`}>
                  <div className={`font-black text-lg ${STYLE[c.key].title}`}>
                    {c.name} <span className="text-sm font-semibold text-gray-300">· {c.nickname}</span>
                  </div>
                  <p className="text-sm mt-2"><span className="text-white font-bold">{tx.speakLabel}</span> {c.speak}</p>
                  <p className="text-sm mt-1"><span className="text-white font-bold">{tx.goodLabel}</span> {c.good}</p>
                  <p className="text-sm mt-1"><span className="text-white font-bold">{tx.badLabel}</span> {c.bad}</p>
                  <p className="text-sm mt-1"><span className="text-white font-bold">{tx.useWhenLabel}</span> {c.useWhen}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-2">{tx.whyTitle}</h4>
            <p>{tx.why}</p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-2">{tx.keepTitle}</h4>
            <ul className="space-y-2 list-disc ps-5">
              {tx.keep.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
