import React, { useMemo, useState } from 'react';

type ColorKey = 'red' | 'yellow' | 'green' | 'blue';
type Facet = { id: string; name: string; description: string; items: { id: string; text: string }[] };
type ColorScale = { id: ColorKey; name: string; hex: string; light: string; title: string; facets: Facet[] };

const SCALES: ColorScale[] = [
  {
    id: 'red', name: 'אדום', hex: '#D65B52', light: '#FCE9E7', title: 'יוזמה, ישירות והנעה',
    facets: [
      { id: 'initiative', name: 'יוזמה ולקיחת אחריות', description: 'לזהות מה צריך לקרות ולהתחיל לקדם אותו', items: [
        { id: 'r1', text: 'כשאני מזהה הזדמנות לשפר משהו, אני נוטה לקחת את הצעד הראשון כדי לקדם אותה.' },
        { id: 'r2', text: 'אני מאמין שאם משהו חשוב לי שיקרה, כדאי שאתחיל להזיז אותו בעצמי ולא אחכה שהנסיבות יסתדרו.' }
      ]},
      { id: 'directness', name: 'ישירות ובהירות', description: 'להגיד את הדברים באופן מפורש וברור', items: [
        { id: 'r3', text: 'חשוב לי שאנשים יבינו בדיוק מה אני חושב, גם כשעמדתי שונה משלהם.' },
        { id: 'r4', text: 'כשיש בעיה או אי-הסכמה, אני מעדיף לדבר עליה באופן גלוי וברור ולא להשאיר אותה בין השורות.' }
      ]},
      { id: 'leadership', name: 'הובלה ואסרטיביות', description: 'להביע עמדה, להשפיע ולעמוד מאחורי החלטות', items: [
        { id: 'r5', text: 'בקבוצה, אני נוטה לקחת אחריות על הכיוון ולעזור להחליט איך מתקדמים.' },
        { id: 'r6', text: 'גם מול אנשים חזקים או בכירים ממני, חשוב לי להשמיע את עמדתי ולעמוד מאחוריה.' }
      ]}
    ]
  },
  {
    id: 'yellow', name: 'צהוב', hex: '#D9A52B', light: '#FBF3DC', title: 'יצירתיות, גמישות והשפעה',
    facets: [
      { id: 'creativity', name: 'יצירתיות וחשיבה אפשרית', description: 'לפתוח כיוונים, רעיונות וחלופות', items: [
        { id: 'y1', text: 'כשמציגים בפניי בעיה, הראש שלי מתחיל מיד לייצר כמה דרכים שונות שאפשר לפתור אותה.' },
        { id: 'y2', text: 'אני נהנה לערער על הדרך המקובלת ולחשוב איך אפשר לעשות דברים אחרת.' }
      ]},
      { id: 'adaptability', name: 'גמישות והסתגלות', description: 'לשנות כיוון ולהתאים את הדרך לנסיבות', items: [
        { id: 'y3', text: 'כשמשהו לא עובד כפי שציפיתי, קל לי לשנות כיוון ולנסות דרך אחרת.' },
        { id: 'y4', text: 'גם אחרי שהתחלתי בתוכנית מסוימת, אני פתוח לשנות אותה כשעולה רעיון טוב יותר.' }
      ]},
      { id: 'influence', name: 'אנרגיה והשפעה', description: 'להכניס התלהבות, עניין ותנועה למפגש', items: [
        { id: 'y5', text: 'כשאני מתלהב מרעיון, אני מצליח בדרך כלל לגרום גם לאחרים להתעניין בו.' },
        { id: 'y6', text: 'אני אוהב להכניס לשיחות ולמפגשים אנרגיה, הומור והתלהבות.' }
      ]}
    ]
  },
  {
    id: 'green', name: 'ירוק', hex: '#4D9A72', light: '#E7F3EC', title: 'הקשבה, רגישות ושותפות',
    facets: [
      { id: 'listening', name: 'הקשבה ופתיחות', description: 'להבין נקודות מבט אחרות ולתת להן מקום', items: [
        { id: 'g1', text: 'גם כשאני בטוח בעמדתי, חשוב לי להבין מה האדם שמולי רואה אחרת.' },
        { id: 'g2', text: 'אני משתדל להקשיב עד הסוף לפני שאני מגבש תשובה או מציע פתרון.' }
      ]},
      { id: 'sensitivity', name: 'רגישות והתחשבות', description: 'לשים לב לאנשים ולהשפעת ההתנהלות עליהם', items: [
        { id: 'g3', text: 'אני שם לב לשינויים קטנים באווירה או בהתנהגות של אנשים, גם כשהם לא אומרים במפורש מה עובר עליהם.' },
        { id: 'g4', text: 'כשאני צריך להעביר מסר קשה, אני משקיע מחשבה באופן ובעיתוי כדי שהאדם שמולי יוכל לקבל אותו.' }
      ]},
      { id: 'partnership', name: 'שותפות ושיתוף פעולה', description: 'לבנות אמון ולקדם דברים יחד', items: [
        { id: 'g5', text: 'חשוב לי שאנשים המעורבים בהחלטה ירגישו שיש להם חלק אמיתי בעיצובה.' },
        { id: 'g6', text: 'אני משקיע ביצירת יחסי עבודה טובים, כי בעיניי הם בסיס להצלחה משותפת.' }
      ]}
    ]
  },
  {
    id: 'blue', name: 'כחול', hex: '#4C80B4', light: '#E8EFF8', title: 'חשיבה, דיוק ושיטתיות',
    facets: [
      { id: 'analysis', name: 'חשיבה אנליטית ובחינת מידע', description: 'לבסס עמדה על נתונים, עובדות והיגיון', items: [
        { id: 'b1', text: 'לפני שאני מגבש עמדה, חשוב לי לאסוף מידע ולבדוק מה העובדות תומכות בו.' },
        { id: 'b2', text: 'אני נוטה לפרק בעיה מורכבת לחלקים כדי להבין מה באמת עומד מאחוריה.' }
      ]},
      { id: 'precision', name: 'דיוק, פרטים ואיכות', description: 'לזהות פערים ולהקפיד על רמה מקצועית', items: [
        { id: 'b3', text: 'אני מבחין בפרטים קטנים שאחרים נוטים לפספס, במיוחד כשיש להם השפעה על התוצאה.' },
        { id: 'b4', text: 'חשוב לי שהתוצר יהיה מדויק ואיכותי, גם אם נדרשת השקעה נוספת כדי להגיע לשם.' }
      ]},
      { id: 'structure', name: 'תכנון, מבנה ושיטתיות', description: 'לייצר סדר, תכנון ובהירות בתהליך', items: [
        { id: 'b5', text: 'אני מעדיף להגדיר שלבים, אחריות ולוחות זמנים לפני שיוצאים לדרך.' },
        { id: 'b6', text: 'כשיש הרבה משימות במקביל, אני נוטה לארגן אותן בשיטה ברורה כדי לא לאבד שליטה.' }
      ]}
    ]
  }
];

const QUESTIONS = SCALES.flatMap(scale => scale.facets.flatMap(facet => facet.items.map(item => ({
  ...item, colorId: scale.id, colorName: scale.name, colorHex: scale.hex, facetId: facet.id, facetName: facet.name
}))));

const SCALE_LABELS = ['בכלל לא מתאר אותי', 'מתאר אותי מעט', 'מתאר אותי במידה בינונית', 'מתאר אותי במידה רבה', 'מתאר אותי מאוד'];

export const IndependentColorPrototype: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const current = QUESTIONS[index];
  const answered = Object.keys(answers).length;
  const results = useMemo(() => SCALES.map(scale => {
    const facets = scale.facets.map(facet => {
      const values = facet.items.map(item => answers[item.id]).filter((v): v is number => v !== undefined);
      const score = values.length ? Math.round((values.reduce((a, b) => a + b, 0) - values.length) / (values.length * 4) * 100) : 0;
      return { ...facet, score, count: values.length };
    });
    const score = Math.round(facets.reduce((sum, f) => sum + f.score, 0) / facets.length);
    return { ...scale, facets, score };
  }), [answers]);

  const choose = (value: number) => {
    setAnswers(prev => ({ ...prev, [current.id]: value }));
  };

  const reset = () => {
    setAnswers({});
    setIndex(0);
    setShowResults(false);
    setStarted(false);
  };

  if (showResults) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#101923] text-white px-4 py-8 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-sm tracking-widest text-cyan-300 font-semibold mb-3">מפת סגנונות התקשורת · אבטיפוס</div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">הפרופיל שלך</h1>
            <p className="text-slate-300 max-w-2xl mx-auto">ארבעת הצבעים נמדדים בנפרד. אין צורך לבחור בין אדום לירוק, או בין צהוב לכחול.</p>
          </div>
          <div className="bg-white text-slate-900 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-7">
            {results.map(scale => (
              <section key={scale.id}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-xl font-bold">{scale.name} · {scale.title}</h2>
                    <p className="text-sm text-slate-500">ציון כללי לצבע</p>
                  </div>
                  <div className="text-3xl font-bold tabular-nums" style={{ color: scale.hex }}>{scale.score}</div>
                </div>
                <div className="h-4 rounded-full bg-slate-100 overflow-hidden mb-4">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: scale.score + '%', backgroundColor: scale.hex }} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {scale.facets.map(facet => (
                    <div key={facet.id} className="rounded-2xl p-4" style={{ backgroundColor: scale.light }}>
                      <div className="text-sm font-bold mb-1">{facet.name}</div>
                      <div className="text-2xl font-bold mb-1 tabular-nums" style={{ color: scale.hex }}>{facet.score}</div>
                      <div className="text-xs text-slate-600 leading-relaxed">{facet.description}</div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950 leading-relaxed">
              <strong>חשוב:</strong> זהו אבטיפוס לבחינת חוויית השאלון והצגת התוצאות. בכל גוון יש כרגע שני היגדים בלבד, ולכן הציונים אינם אבחון תקף או מדד מהימן. אין להשוות אותם לתוצאות המודל הישן.
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={() => { setShowResults(false); setIndex(0); }} className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">חזרה לתשובות</button>
              <button onClick={reset} className="px-5 py-3 rounded-xl text-white font-semibold bg-slate-900 hover:bg-slate-700">להתחיל מחדש</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#101923] text-white px-4 py-10 sm:px-8 flex items-center">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-8">
            <div className="text-sm tracking-widest text-cyan-300 font-semibold mb-4">סביבת ניסוי · לא המוצר הפעיל</div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">מפת סגנונות התקשורת</h1>
            <p className="text-xl text-slate-300">ארבעה צבעים. הרבה גוונים. אין צורך לבחור רק אחד.</p>
          </div>
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-9 shadow-2xl">
            <h2 className="text-xl font-bold mb-3">מה בודקים כאן?</h2>
            <p className="text-slate-600 leading-relaxed mb-5">במקום למקם אותך על שני צירים מנוגדים, האבטיפוס מודד בנפרד 12 גוונים של התנהלות ותקשורת בעבודה. כל היגד מקבל דירוג עצמאי, ולכן אפשר לקבל ציונים גבוהים בכמה צבעים במקביל.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {SCALES.map(scale => (
                <div key={scale.id} className="rounded-2xl p-3 text-center" style={{ backgroundColor: scale.light }}>
                  <div className="w-9 h-9 rounded-full mx-auto mb-2" style={{ backgroundColor: scale.hex }} />
                  <div className="font-bold text-slate-800">{scale.name}</div>
                  <div className="text-xs text-slate-600 mt-1">{scale.title}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-between gap-3 text-sm text-slate-500 mb-6">
              <span>24 היגדים</span><span>כ-5 דקות</span><span>דירוג אישי, ללא תשובות נכונות</span>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 mb-6">אבטיפוס בלבד: שני היגדים לכל גוון. התוצאות להמחשת הרעיון ואינן אבחון תקף.</div>
            <button onClick={() => setStarted(true)} className="w-full rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-4 text-lg transition-colors">מתחילים</button>
            <a href="/" className="block text-center mt-4 text-sm text-slate-500 hover:text-cyan-700">חזרה לכלי הקיים</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#101923] text-white px-4 py-8 sm:px-8 flex items-center">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between text-sm text-slate-400 mb-3">
          <span>אבטיפוס · שאלון חדש</span><span>{index + 1} מתוך {QUESTIONS.length}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden mb-8"><div className="h-full bg-cyan-400 transition-all" style={{ width: ((index + 1) / QUESTIONS.length * 100) + '%' }} /></div>
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-3 h-10 rounded-full" style={{ backgroundColor: current.colorHex }} />
            <div>
              <div className="text-sm font-bold" style={{ color: current.colorHex }}>{current.colorName} · {current.facetName}</div>
              <div className="text-xs text-slate-500">חשוב על ההתנהלות שלך בעבודה בתקופה האחרונה</div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-relaxed min-h-[120px]">{current.text}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-8">
            {SCALE_LABELS.map((label, i) => (
              <button key={i} onClick={() => choose(i + 1)} className={`rounded-xl border-2 p-3 text-center transition-all ${answers[current.id] === i + 1 ? 'border-cyan-600 bg-cyan-50 text-cyan-900' : 'border-slate-200 hover:border-slate-400 text-slate-700'}`}>
                <div className="text-xl font-bold mb-1">{i + 1}</div>
                <div className="text-xs leading-snug">{label}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 mt-9">
            <button disabled={index === 0} onClick={() => setIndex(i => i - 1)} className="px-5 py-3 rounded-xl border border-slate-300 text-slate-600 disabled:opacity-30">הקודם</button>
            {index < QUESTIONS.length - 1 ? (
              <button disabled={!answers[current.id]} onClick={() => setIndex(i => i + 1)} className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-30">הבא</button>
            ) : (
              <button disabled={answered !== QUESTIONS.length} onClick={() => setShowResults(true)} className="px-6 py-3 rounded-xl bg-cyan-700 text-white font-bold disabled:opacity-30">לצפייה בפרופיל</button>
            )}
          </div>
        </div>
        <div className="text-center text-xs text-slate-500 mt-5">התשובות נשמרות בזיכרון הדפדפן במהלך ההתנסות בלבד ואינן נשלחות לשרת.</div>
      </div>
    </div>
  );
};

export default IndependentColorPrototype;
