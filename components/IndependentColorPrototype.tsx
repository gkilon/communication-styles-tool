import React, { useMemo, useState } from 'react';

type ColorKey = 'red' | 'yellow' | 'green' | 'blue';
type Shade = { id: string; name: string; description: string; items: { id: string; text: string }[] };
type ColorScale = { id: ColorKey; name: string; hex: string; light: string; shades: Shade[] };

const SCALES: ColorScale[] = [
  { id: 'red', name: 'אדום', hex: '#D65B52', light: '#FCE9E7', shades: [
    { id: 'red1', name: 'תכליתיות ומיקוד במשימה', description: 'מכוון ליעד, להתקדמות ולביצוע יעיל', items: [
      { id: 'r11', text: 'כשאני מקדם משימה, חשוב לי להתמקד בעיקר ולהימנע מעיסוק מיותר במה שלא מקדם את התוצאה.' },
      { id: 'r12', text: 'במצבים של עומס, אני יודע לזהות מה הדבר החשוב ביותר ולקדם אותו קודם.' },
      { id: 'r13', text: 'אני מעדיף לסכם דיון בהחלטות ובצעדים מעשיים, כדי שאפשר יהיה להתקדם.' }
    ]},
    { id: 'red2', name: 'ישירות ואסרטיביות', description: 'מביע עמדה ברורה ומתמודד בגלוי עם מחלוקת', items: [
      { id: 'r21', text: 'כשאני חושב אחרת מאחרים, אני אומר זאת באופן ברור ומסביר את עמדתי.' },
      { id: 'r22', text: 'כשמשהו אינו מקובל עליי, אני מעדיף להעלות את הדברים בגלוי ולא להשאיר אותם מרומזים.' },
      { id: 'r23', text: 'גם בשיחה עם אדם בכיר ממני, אני מרגיש בנוח להציג עמדה שונה ולעמוד מאחוריה.' }
    ]}
  ]},
  { id: 'yellow', name: 'צהוב', hex: '#D9A52B', light: '#FBF3DC', shades: [
    { id: 'yellow1', name: 'יצירתיות וחדשנות', description: 'מייצר רעיונות, בוחן דרכים חדשות ונהנה משינוי', items: [
      { id: 'y11', text: 'כשאני נתקל בדרך עבודה מוכרת, אני נוטה לחשוב איך אפשר לעשות אותה אחרת או טוב יותר.' },
      { id: 'y12', text: 'אני נהנה להעלות רעיונות חדשים, גם לפני שברור לגמרי איך יהיה אפשר לממש אותם.' },
      { id: 'y13', text: 'כשעולה אפשרות לנסות גישה חדשה, אני נמשך להתנסות ולבדוק מה אפשר ללמוד ממנה.' }
    ]},
    { id: 'yellow2', name: 'ראייה רחבה וחזון', description: 'מזהה כיוונים, מגמות והזדמנויות מעבר לכאן ולעכשיו', items: [
      { id: 'y21', text: 'בשיחה על משימה נקודתית, אני נוטה לחבר אותה לתמונה הרחבה ולכיוון שאליו רוצים להגיע.' },
      { id: 'y22', text: 'אני מזהה לעיתים קרובות הזדמנויות או אפשרויות שאינן נמצאות עדיין על סדר היום.' },
      { id: 'y23', text: 'כשאני חושב על העתיד, קל לי לדמיין לאן דברים יכולים להתפתח ומה כדאי להתחיל לבנות כבר עכשיו.' }
    ]}
  ]},
  { id: 'green', name: 'ירוק', hex: '#4D9A72', light: '#E7F3EC', shades: [
    { id: 'green1', name: 'אמפתיה ורגישות לאנשים', description: 'קשוב לאנשים, מזהה צרכים ומתחשב בהשפעה עליהם', items: [
      { id: 'g11', text: 'במהלך שיחה, אני שם לב לא רק למה שנאמר אלא גם למה שהאדם שמולי מרגיש.' },
      { id: 'g12', text: 'לפני שאני מעביר מסר שעלול להיות לא פשוט, אני חושב כיצד הוא עשוי להישמע ולהתקבל אצל האדם שמולי.' },
      { id: 'g13', text: 'חשוב לי להבין מה אנשים צריכים כדי שיוכלו להיות מעורבים ולהצליח בעבודה.' }
    ]},
    { id: 'green2', name: 'גמישות והסתגלות', description: 'מתאים את הדרך לאנשים ולנסיבות משתנות', items: [
      { id: 'g21', text: 'כשאני עובד עם אנשים שונים, אני מתאים את דרך התקשורת שלי למה שעוזר לכל אחד מהם.' },
      { id: 'g22', text: 'כאשר הנסיבות משתנות, אני מוכן להתאים את הדרך גם אם התחלתי עם תוכנית ברורה.' },
      { id: 'g23', text: 'במחלוקת, אני מחפש דרך להתקדם שלוקחת בחשבון את הצרכים והאילוצים של הצדדים המעורבים.' }
    ]}
  ]},
  { id: 'blue', name: 'כחול', hex: '#4C80B4', light: '#E8EFF8', shades: [
    { id: 'blue1', name: 'סדר, ארגון ושיטתיות', description: 'יוצר מבנה, מתכנן ופועל באופן עקבי ומאורגן', items: [
      { id: 'b11', text: 'לפני שמתחילים משימה מורכבת, חשוב לי להגדיר שלבים, אחריות ולוחות זמנים.' },
      { id: 'b12', text: 'אני נוהג לארגן משימות ומידע באופן שיטתי כדי שאפשר יהיה לעקוב אחר ההתקדמות.' },
      { id: 'b13', text: 'אני מקפיד לעבוד לפי תהליך ברור ולסגור משימות באופן מסודר.' }
    ]},
    { id: 'blue2', name: 'העמקה, ניתוח ודיוק', description: 'בוחן מידע, יורד לפרטים ומגבש מסקנה שקולה', items: [
      { id: 'b21', text: 'לפני שאני מגבש עמדה, חשוב לי לבדוק את העובדות ולבחון על מה המידע מבוסס.' },
      { id: 'b22', text: 'אני מבחין בפרטים קטנים שעשויים לשנות את ההבנה של מצב או את איכות התוצאה.' },
      { id: 'b23', text: 'כשעולה נושא מורכב, אני מעדיף להתבונן בו ולחשוב לעומק לפני שאני מגיב או מחליט.' }
    ]}
  ]}
];

const QUESTIONS = SCALES.flatMap(scale => scale.shades.flatMap(shade => shade.items.map(item => ({
  ...item, colorId: scale.id, colorName: scale.name, colorHex: scale.hex, shadeId: shade.id, shadeName: shade.name
}))));
const SCALE_LABELS = ['בכלל לא מתאר אותי', 'מתאר אותי מעט', 'מתאר אותי במידה בינונית', 'מתאר אותי במידה רבה', 'מתאר אותי מאוד'];

const scoreItems = (items: { id: string }[], answers: Record<string, number>) => {
  const values = items.map(item => answers[item.id]).filter((v): v is number => v !== undefined);
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) - values.length) / (values.length * 4) * 100) : 0;
};

export const IndependentColorPrototype: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const current = QUESTIONS[index];
  const answered = Object.keys(answers).length;
  const results = useMemo(() => SCALES.map(scale => {
    const shades = scale.shades.map(shade => ({ ...shade, score: scoreItems(shade.items, answers) }));
    return { ...scale, shades, score: Math.round(shades.reduce((sum, shade) => sum + shade.score, 0) / shades.length) };
  }), [answers]);
  const choose = (value: number) => setAnswers(prev => ({ ...prev, [current.id]: value }));
  const reset = () => { setAnswers({}); setIndex(0); setShowResults(false); setStarted(false); };

  if (showResults) return (
    <div dir="rtl" className="min-h-screen bg-[#101923] text-white px-4 py-8 sm:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-sm tracking-widest text-cyan-300 font-semibold mb-3">מפת סגנונות התקשורת · אבטיפוס</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">הפרופיל שלך</h1>
          <p className="text-slate-300 max-w-2xl mx-auto">כל אחד מארבעת הצבעים נמדד בנפרד, ובתוכו שני גוונים. אפשר לקבל ציונים גבוהים בכמה צבעים ובכמה גוונים במקביל.</p>
        </div>
        <div className="bg-white text-slate-900 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-7">
          {results.map(scale => (
            <section key={scale.id}>
              <div className="flex items-center justify-between gap-4 mb-3">
                <div><h2 className="text-xl font-bold">{scale.name}</h2><p className="text-sm text-slate-500">ציון צבע – ממוצע שני הגוונים</p></div>
                <div className="text-3xl font-bold tabular-nums" style={{ color: scale.hex }}>{scale.score}</div>
              </div>
              <div className="h-4 rounded-full bg-slate-100 overflow-hidden mb-4"><div className="h-full rounded-full" style={{ width: scale.score + '%', backgroundColor: scale.hex }} /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                {scale.shades.map(shade => (
                  <div key={shade.id} className="rounded-2xl p-4" style={{ backgroundColor: scale.light }}>
                    <div className="text-sm font-bold mb-1">{shade.name}</div>
                    <div className="text-2xl font-bold mb-1 tabular-nums" style={{ color: scale.hex }}>{shade.score}</div>
                    <div className="text-xs text-slate-600 leading-relaxed">{shade.description}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950 leading-relaxed">
            <strong>חשוב:</strong> זהו אבטיפוס לבחינת ניסוחים וחוויית השאלון בלבד. שלושה היגדים לכל גוון אינם מספיקים כדי לקבוע תוקף או מהימנות. אין להשוות את הציונים לתוצאות המודל הישן.
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => { setShowResults(false); setIndex(0); }} className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold">חזרה לתשובות</button>
            <button onClick={reset} className="px-5 py-3 rounded-xl text-white font-semibold bg-slate-900">להתחיל מחדש</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!started) return (
    <div dir="rtl" className="min-h-screen bg-[#101923] text-white px-4 py-10 sm:px-8 flex items-center">
      <div className="max-w-3xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="text-sm tracking-widest text-cyan-300 font-semibold mb-4">סביבת ניסוי · לא המוצר הפעיל</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">מפת סגנונות התקשורת</h1>
          <p className="text-xl text-slate-300">ארבעה צבעים. שני גוונים בכל צבע. אין צורך לבחור רק אחד.</p>
        </div>
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-9 shadow-2xl">
          <h2 className="text-xl font-bold mb-3">מה בודקים כאן?</h2>
          <p className="text-slate-600 leading-relaxed mb-5">במקום להסיק את הצבעים משני צירים, כאן נמדדים בנפרד שמונה גוונים של התנהלות ותקשורת בעבודה. כל היגד מקבל דירוג עצמאי, ולכן אפשר לקבל ציונים גבוהים בכמה צבעים במקביל.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {SCALES.map(scale => <div key={scale.id} className="rounded-2xl p-3 text-center" style={{ backgroundColor: scale.light }}>
              <div className="w-9 h-9 rounded-full mx-auto mb-2" style={{ backgroundColor: scale.hex }} />
              <div className="font-bold text-slate-800">{scale.name}</div>
              <div className="text-xs text-slate-600 mt-1">{scale.shades.map(s => s.name).join(' · ')}</div>
            </div>)}
          </div>
          <div className="flex flex-wrap justify-between gap-3 text-sm text-slate-500 mb-6"><span>24 היגדים</span><span>כ-5 דקות</span><span>דירוג אישי, ללא תשובות נכונות</span></div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 mb-6">אבטיפוס בלבד: שלושה היגדים לכל גוון. התוצאות להמחשת הרעיון ואינן אבחון תקף.</div>
          <button onClick={() => setStarted(true)} className="w-full rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-4 text-lg">מתחילים</button>
          <a href="/" className="block text-center mt-4 text-sm text-slate-500 hover:text-cyan-700">חזרה לכלי הקיים</a>
        </div>
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#101923] text-white px-4 py-8 sm:px-8 flex items-center">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between text-sm text-slate-400 mb-3"><span>אבטיפוס · שמונה גוונים</span><span>{index + 1} מתוך {QUESTIONS.length}</span></div>
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden mb-8"><div className="h-full bg-cyan-400" style={{ width: ((index + 1) / QUESTIONS.length * 100) + '%' }} /></div>
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-3 h-10 rounded-full" style={{ backgroundColor: current.colorHex }} />
            <div><div className="text-sm font-bold" style={{ color: current.colorHex }}>{current.colorName} · {current.shadeName}</div><div className="text-xs text-slate-500">חשוב על ההתנהלות שלך בעבודה בתקופה האחרונה</div></div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-relaxed min-h-[120px]">{current.text}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-8">
            {SCALE_LABELS.map((label, i) => <button key={i} onClick={() => choose(i + 1)} className={`rounded-xl border-2 p-3 text-center transition-all ${answers[current.id] === i + 1 ? 'border-cyan-600 bg-cyan-50 text-cyan-900' : 'border-slate-200 hover:border-slate-400 text-slate-700'}`}>
              <div className="text-xl font-bold mb-1">{i + 1}</div><div className="text-xs leading-snug">{label}</div>
            </button>)}
          </div>
          <div className="flex items-center justify-between gap-3 mt-9">
            <button disabled={index === 0} onClick={() => setIndex(i => i - 1)} className="px-5 py-3 rounded-xl border border-slate-300 text-slate-600 disabled:opacity-30">הקודם</button>
            {index < QUESTIONS.length - 1
              ? <button disabled={!answers[current.id]} onClick={() => setIndex(i => i + 1)} className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-30">הבא</button>
              : <button disabled={answered !== QUESTIONS.length} onClick={() => setShowResults(true)} className="px-6 py-3 rounded-xl bg-cyan-700 text-white font-bold disabled:opacity-30">לצפייה בפרופיל</button>}
          </div>
        </div>
        <div className="text-center text-xs text-slate-500 mt-5">התשובות נשמרות בזיכרון הדפדפן במהלך ההתנסות בלבד ואינן נשלחות לשרת.</div>
      </div>
    </div>
  );
};

export default IndependentColorPrototype;
