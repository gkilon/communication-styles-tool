import React, { useMemo, useState } from 'react';
import { generateCommunicationAssessmentReport } from '../services/geminiService';

type ColorKey = 'red' | 'yellow' | 'green' | 'blue';
type Item = { id: string; text: string };
type Shade = { id: string; name: string; description: string; items: Item[] };
type Scale = { id: ColorKey; name: string; hex: string; light: string; shades: Shade[] };

const SCALES: Scale[] = [
  { id: 'red', name: 'אדום', hex: '#D65B52', light: '#FCE9E7', shades: [
    { id: 'red1', name: 'תכליתיות ומיקוד במשימה', description: 'מכוון ליעד, להתקדמות ולביצוע יעיל', items: [
      {id:'r11',text:'כשיש כמה נושאים על השולחן, אני מחפש במה כדאי לטפל קודם כדי לייצר התקדמות ממשית.'},
      {id:'r12',text:'בדיון שמתארך, אני נוטה להחזיר את השיחה להחלטה או לפעולה שצריך לקדם.'},
      {id:'r13',text:'חשוב לי לדעת מה התוצאה המצופה לפני שנכנסים לעבודה.'},
      {id:'r14',text:'כשאני מזהה עיכוב, אני מעדיף לפעול כדי להסיר אותו ולא להמתין שהדברים יסתדרו.'},
      {id:'r15',text:'אני נוטה לקחת אחריות על קידום נושא גם כשהוא עדיין לא הוגדר במלואו.'},
      {id:'r16',text:'בשיחה מקצועית אני מחפש במהירות את הנקודה המרכזית ולא רוצה להתעכב על כל ההסתעפויות.'},
      {id:'r17',text:'כשיש פער בין התכנון לביצוע, חשוב לי להציף אותו ולדרוש התקדמות.'},
      {id:'r18',text:'כשאני ממוקד בתוצאה, לפעמים קשה לי לתת מקום לדיון שאינו מקדם החלטה או פעולה.'}
    ]},
    { id: 'red2', name: 'ישירות ואסרטיביות', description: 'מביע עמדה ברורה ומתמודד בגלוי עם מחלוקת', items: [
      {id:'r21',text:'כשאני חושב אחרת מאחרים, אני אומר זאת גם אם הדבר יוצר אי נוחות.'},
      {id:'r22',text:'אני מעדיף לומר במפורש מה מפריע לי במקום לצפות שהאחר יבין לבד.'},
      {id:'r23',text:'גם מול אדם בכיר ממני, אני מרגיש בנוח להציג עמדה שונה ולעמוד מאחוריה.'},
      {id:'r24',text:'כשאני חושב שהתקבלה החלטה שגויה, חשוב לי לערער עליה ולא רק לבצע.'},
      {id:'r25',text:'בשיחה טעונה אני נוטה לדבר באופן חד וברור ולא לעטוף את המסר.'},
      {id:'r26',text:'אני מעדיף להתמודד עם מחלוקת בזמן אמת ולא לדחות אותה לשיחה אחרת.'},
      {id:'r27',text:'כשגבול מקצועי נחצה, אני נוטה להבהיר זאת באופן מפורש.'},
      {id:'r28',text:'כשאני משוכנע בעמדה, אני עלול להישמע נחרץ גם לפני שבדקתי איך היא מתקבלת אצל האחר.'}
    ]}
  ]},
  { id: 'yellow', name: 'צהוב', hex: '#D9A52B', light: '#FBF3DC', shades: [
    { id: 'yellow1', name: 'יצירתיות וחדשנות', description: 'מייצר רעיונות, בוחן דרכים חדשות ונהנה משינוי', items: [
      {id:'y11',text:'כשאני נתקל בדרך עבודה מוכרת, אני מתחיל לחשוב איך אפשר לעשות אותה אחרת.'},
      {id:'y12',text:'אני נהנה להעלות רעיונות גם כשעדיין לא ברור איך בדיוק אפשר לממש אותם.'},
      {id:'y13',text:'כשעולה אפשרות לנסות משהו חדש, אני נמשך להתנסות ולגלות מה יקרה.'},
      {id:'y14',text:'אני נוטה לחבר בין רעיונות מתחומים שונים ולראות מה אפשר ליצור מהחיבור.'},
      {id:'y15',text:'בדיון קבוצתי אני מרבה להציע כיוונים שאחרים עדיין לא חשבו עליהם.'},
      {id:'y16',text:'שגרה מקצועית ממושכת גורמת לי לחפש הזדמנויות לרענון ולשינוי.'},
      {id:'y17',text:'אני מעדיף להשאיר מקום לאלתור ולגילוי גם כשיש תוכנית מסודרת.'},
      {id:'y18',text:'אני עלול להתלהב מכיוון חדש לפני שבדקתי עד הסוף מה יידרש כדי לממש אותו.'}
    ]},
    { id: 'yellow2', name: 'ראייה רחבה והשפעה', description: 'מזהה כיוונים, מגמות והזדמנויות ומחבר אנשים לרעיון', items: [
      {id:'y21',text:'בשיחה על משימה נקודתית, אני נוטה לחבר אותה לתמונה הרחבה ולכיוון שאליו רוצים להגיע.'},
      {id:'y22',text:'קל לי לדמיין לאן רעיון יכול להתפתח ולתאר לאחרים את האפשרויות.'},
      {id:'y23',text:'אני נוטה להכניס אנרגיה והתלהבות לשיחות שבהן צריך לרתום אנשים.'},
      {id:'y24',text:'חשוב לי שאנשים יתחברו לרעיון ולא רק יבינו מה מצופה מהם לעשות.'},
      {id:'y25',text:'אני נהנה להציג רעיון בפני קבוצה ולראות כיצד הוא מעורר תגובות.'},
      {id:'y26',text:'אני נוטה לזהות הזדמנויות וקשרים בין אנשים שיכולים לקדם מהלך.'},
      {id:'y27',text:'כשאני מאמין בכיוון מסוים, אני משקיע מאמץ ביצירת עניין והתלהבות סביבו.'},
      {id:'y28',text:'כשאני מתלהב מרעיון, לפעמים קשה לי להישאר לאורך זמן בשלב של הפרטים והמעקב.'}
    ]}
  ]},
  { id: 'green', name: 'ירוק', hex: '#4D9A72', light: '#E7F3EC', shades: [
    { id: 'green1', name: 'אמפתיה ורגישות לאנשים', description: 'קשוב לאנשים, מזהה צרכים ומתחשב בהשפעה עליהם', items: [
      {id:'g11',text:'במהלך שיחה אני שם לב לא רק למה שנאמר אלא גם למה שהאדם שמולי מרגיש.'},
      {id:'g12',text:'לפני מסר שעלול להיות לא פשוט, אני חושב כיצד הוא עשוי להישמע ולהתקבל.'},
      {id:'g13',text:'חשוב לי להבין מה אנשים צריכים כדי שיוכלו להיות מעורבים ולהצליח בעבודה.'},
      {id:'g14',text:'אני מבחין כשמישהו נשאר מחוץ לשיחה או מתקשה להביע את עמדתו.'},
      {id:'g15',text:'גם כשאני לא מסכים עם אדם, חשוב לי להבין מה עומד מאחורי העמדה שלו.'},
      {id:'g16',text:'אני נוטה להתאים את הקצב והטון שלי למצב הרגשי של האדם שמולי.'},
      {id:'g17',text:'כשאני נותן משוב, חשוב לי לשמור על כבודו ועל תחושת הערך של האדם.'},
      {id:'g18',text:'לפעמים אני משקיע כל כך הרבה באופן שבו מסר יתקבל, עד שאני דוחה את האמירה שלו.'}
    ]},
    { id: 'green2', name: 'שותפות וגמישות ביחסים', description: 'בונה אמון, מחפש שיתוף פעולה ומתאים את הדרך לנסיבות', items: [
      {id:'g21',text:'כשאני עובד עם אנשים שונים, אני מתאים את דרך התקשורת שלי למה שעוזר לכל אחד מהם.'},
      {id:'g22',text:'במחלוקת אני מחפש דרך להתקדם שלוקחת בחשבון את הצרכים של הצדדים.'},
      {id:'g23',text:'חשוב לי להגיע להבנה משותפת ולא רק לשכנע את האחר לקבל את עמדתי.'},
      {id:'g24',text:'אני נוטה לערב אנשים בתהליך כדי שירגישו שותפים ולא רק מבצעים.'},
      {id:'g25',text:'כשנוצר מתח בין אנשים, אני מנסה ליצור שיחה שתאפשר להם לחזור לעבוד יחד.'},
      {id:'g26',text:'כאשר הנסיבות משתנות, אני מוכן להתאים את הדרך גם אם התחלתי עם תוכנית ברורה.'},
      {id:'g27',text:'אני מעדיף לבנות הסכמה שתוכל להחזיק לאורך זמן על פני ניצחון מהיר בוויכוח.'},
      {id:'g28',text:'כשיש מתח, אני מעדיף לפעמים למצוא פשרה גם אם היא לא פותרת את שורש המחלוקת.'}
    ]}
  ]},
  { id: 'blue', name: 'כחול', hex: '#4C80B4', light: '#E8EFF8', shades: [
    { id: 'blue1', name: 'סדר, ארגון ושיטתיות', description: 'יוצר מבנה, מתכנן ופועל באופן עקבי ומאורגן', items: [
      {id:'b11',text:'לפני שמתחילים משימה מורכבת, חשוב לי להגדיר שלבים, אחריות ולוחות זמנים.'},
      {id:'b12',text:'אני מארגן משימות ומידע באופן שיטתי כדי שאפשר יהיה לעקוב אחר ההתקדמות.'},
      {id:'b13',text:'אני מקפיד לעבוד לפי תהליך ברור ולסגור משימות באופן מסודר.'},
      {id:'b14',text:'כשנכנסים לנושא חדש, אני מחפש קודם להבין את המבנה ואת סדר הפעולות.'},
      {id:'b15',text:'אני נוטה להכין את עצמי מראש לשיחות ולפגישות חשובות.'},
      {id:'b16',text:'חשוב לי לתעד החלטות והסכמות כדי למנוע אי הבנות בהמשך.'},
      {id:'b17',text:'כאשר כמה אנשים מעורבים במשימה, אני רוצה שתהיה בהירות לגבי תחומי האחריות.'},
      {id:'b18',text:'שינוי לא מתוכנן יכול להוציא אותי מריכוז ולהקשות עליי לשנות סדרי עדיפויות.'}
    ]},
    { id: 'blue2', name: 'העמקה, ניתוח ודיוק', description: 'בוחן מידע, יורד לפרטים ומגבש מסקנה שקולה', items: [
      {id:'b21',text:'לפני שאני מגבש עמדה, חשוב לי לבדוק את העובדות ועל מה המידע מבוסס.'},
      {id:'b22',text:'אני מבחין בפרטים קטנים שעשויים לשנות את ההבנה של מצב או את איכות התוצאה.'},
      {id:'b23',text:'כשעולה נושא מורכב, אני מעדיף לחשוב לעומק לפני שאני מגיב או מחליט.'},
      {id:'b24',text:'אני נוטה לשאול שאלות הבהרה לפני שאני מקבל הסבר או הצעה.'},
      {id:'b25',text:'כשמוצגת בפניי מסקנה, חשוב לי להבין כיצד הגיעו אליה.'},
      {id:'b26',text:'אני מעדיף להכיר את המורכבות של נושא לפני שאני מציג עמדה נחרצת.'},
      {id:'b27',text:'אני בודק אם יש סתירות או פערים בין חלקי המידע שמוצגים בפניי.'},
      {id:'b28',text:'לפעמים קשה לי לסגור החלטה כשאני מרגיש שעדיין חסר לי מידע.'}
    ]}
  ]}
];

const QUESTIONS = SCALES.flatMap(scale => scale.shades.flatMap(shade => shade.items.map(item => ({
  ...item, colorId: scale.id, shadeId: shade.id
}))));
const SCALE_LABELS = ['בכלל לא מתאר אותי', 'מתאר אותי מעט', 'מתאר אותי במידה בינונית', 'מתאר אותי במידה רבה', 'מתאר אותי מאוד'];
const scoreItems = (items: Item[], answers: Record<string, number>) => {
  const values = items.map(item => answers[item.id]).filter((v): v is number => v !== undefined);
  return values.length ? Math.round(((values.reduce((a,b)=>a+b,0) / values.length) - 1) * 25) : 0;
};

export const IndependentColorPrototype: React.FC = () => {
  const [started,setStarted] = useState(false);
  const [index,setIndex] = useState(0);
  const [answers,setAnswers] = useState<Record<string,number>>({});
  const [showResults,setShowResults] = useState(false);
  const [report,setReport] = useState('');
  const [reportError,setReportError] = useState('');
  const [generating,setGenerating] = useState(false);
  const [questions] = useState(() => [...QUESTIONS].sort(() => Math.random() - 0.5));
  const current = questions[index];
  const answered = Object.keys(answers).length;
  const results = useMemo(() => SCALES.map(scale => {
    const shades = scale.shades.map(shade => ({...shade,score:scoreItems(shade.items,answers)}));
    return {...scale,shades,score:Math.round(shades.reduce((sum,s)=>sum+s.score,0)/shades.length)};
  }),[answers]);
  const choose = (value:number) => setAnswers(prev=>({...prev,[current.id]:value}));
  const reset = () => {setAnswers({});setIndex(0);setShowResults(false);setStarted(false);setReport('');setReportError('');};
  const createReport = async () => {
    setGenerating(true);setReportError('');
    try {
      const answerDetails = questions.map(q=>({question:q.text,answer:answers[q.id],colorId:q.colorId,shadeId:q.shadeId}));
      const result = await generateCommunicationAssessmentReport(results.map(s=>({name:s.name,score:s.score,shades:s.shades.map(sh=>({name:sh.name,score:sh.score}))})),answerDetails);
      setReport(result);
    } catch(e:any) {
      setReportError(e?.message || 'לא הצלחנו להפיק את הדוח כרגע. אפשר לנסות שוב.');
    } finally {setGenerating(false);}
  };

  if(showResults) return <div dir="rtl" className="min-h-screen bg-[#101923] text-white px-4 py-8 sm:px-8"><div className="max-w-4xl mx-auto">
    <header className="text-center mb-8"><div className="text-sm tracking-widest text-cyan-300 font-semibold mb-3">מפת סגנונות התקשורת · סביבת ניסוי</div><h1 className="text-3xl sm:text-4xl font-bold mb-3">הפרופיל שלך</h1><p className="text-slate-300">הציונים מציגים שמונה מדדים עצמאיים; הם אינם מסתכמים ל-100% ואינם באים על חשבון זה של זה.</p></header>
    <div className="bg-white text-slate-900 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-7">
      {results.map(scale=><section key={scale.id}><div className="flex items-center justify-between gap-4 mb-3"><div><h2 className="text-xl font-bold">{scale.name}</h2><p className="text-sm text-slate-500">ציון צבע – ממוצע שני הגוונים</p></div><div className="text-3xl font-bold tabular-nums" style={{color:scale.hex}}>{scale.score}</div></div><div className="h-4 rounded-full bg-slate-100 overflow-hidden mb-4"><div className="h-full rounded-full" style={{width:scale.score+'%',backgroundColor:scale.hex}}/></div><div className="grid sm:grid-cols-2 gap-3">{scale.shades.map(sh=><div key={sh.id} className="rounded-2xl p-4" style={{backgroundColor:scale.light}}><div className="text-sm font-bold mb-1">{sh.name}</div><div className="text-2xl font-bold mb-1 tabular-nums" style={{color:scale.hex}}>{sh.score}</div><div className="text-xs text-slate-600 leading-relaxed">{sh.description}</div></div>)}</div></section>)}
      <section className="border-t border-slate-200 pt-6"><div className="flex items-center justify-between gap-3 flex-wrap"><div><h2 className="text-2xl font-bold">דוח אבחון אישי</h2><p className="text-sm text-slate-600 mt-1">ניתוח של דפוסי התשובה, החוזקות, האתגרים וכיווני ההתפתחות.</p></div><button onClick={createReport} disabled={generating} className="rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold px-5 py-3">{generating?'מנתח את הפרופיל…':report?'הפק דוח מחדש':'הפק דוח אבחון'}</button></div>
        {reportError&&<p className="mt-4 text-sm text-red-700 bg-red-50 rounded-xl p-3">{reportError}</p>}
        {generating&&<p className="mt-4 text-sm text-slate-500">המערכת בוחנת את השילובים בין המדדים ואת התשובות עצמן. התהליך עשוי להימשך מעט.</p>}
        {report&&<article className="mt-5 rounded-2xl bg-slate-50 p-5 sm:p-7 prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed">{report}</article>}
      </section>
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950 leading-relaxed"><strong>הערה מקצועית:</strong> זהו אבטיפוס מחקרי. הדוח מציע פרשנויות והשערות לפיתוח, ולא אבחון פסיכולוגי או מדידה מתוקפת.</div>
      <div className="flex flex-wrap gap-3 justify-center"><button onClick={()=>{setShowResults(false);setIndex(0);}} className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold">חזרה לתשובות</button><button onClick={reset} className="px-5 py-3 rounded-xl text-white font-semibold bg-slate-900">להתחיל מחדש</button></div>
    </div></div></div>;

  if(!started) return <div dir="rtl" className="min-h-screen bg-[#101923] text-white px-4 py-10 sm:px-8 flex items-center"><div className="max-w-3xl mx-auto w-full">
    <div className="text-center mb-8"><div className="text-sm tracking-widest text-cyan-300 font-semibold mb-4">סביבת ניסוי · לא המוצר הפעיל</div><h1 className="text-4xl sm:text-5xl font-bold mb-4">מפת סגנונות התקשורת</h1><p className="text-xl text-slate-300">ארבעה צבעים. שמונה גוונים. אין צורך לבחור רק אחד.</p></div>
    <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-9 shadow-2xl"><h2 className="text-xl font-bold mb-3">מה בודקים כאן?</h2><p className="text-slate-600 leading-relaxed mb-5">השאלון בוחן שמונה היבטים של התנהלות ותקשורת בעבודה. כל היגד מקבל דירוג עצמאי, כך שאפשר לזהות כמה נטיות חזקות במקביל.</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">{SCALES.map(s=><div key={s.id} className="rounded-2xl p-3 text-center" style={{backgroundColor:s.light}}><div className="w-9 h-9 rounded-full mx-auto mb-2" style={{backgroundColor:s.hex}}/><div className="font-bold text-slate-800">{s.name}</div></div>)}</div><div className="flex flex-wrap justify-between gap-3 text-sm text-slate-500 mb-6"><span>64 היגדים</span><span>כ-10–12 דקות</span><span>דירוג אישי, ללא תשובות נכונות</span></div><div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 mb-6">אבטיפוס בלבד. התוצאות והדוח מיועדים לבחינת המודל והניסוחים ואינם מדידה מתוקפת.</div><button onClick={()=>setStarted(true)} className="w-full rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-4 text-lg">מתחילים</button><a href="/" className="block text-center mt-4 text-sm text-slate-500 hover:text-cyan-700">חזרה לכלי הקיים</a></div></div></div>;

  return <div dir="rtl" className="min-h-screen bg-[#101923] text-white px-4 py-8 sm:px-8 flex items-center"><div className="max-w-2xl mx-auto w-full">
    <div className="flex items-center justify-between text-sm text-slate-400 mb-3"><span>שאלון סגנונות תקשורת</span><span>{index+1} מתוך {questions.length}</span></div><div className="h-2 rounded-full bg-slate-700 overflow-hidden mb-8"><div className="h-full bg-cyan-400" style={{width:((index+1)/questions.length*100)+'%'}}/></div>
    <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl"><div className="text-sm text-slate-500 mb-7">חשוב על ההתנהלות שלך בעבודה בתקופה האחרונה</div><h1 className="text-2xl sm:text-3xl font-bold leading-relaxed min-h-[140px]">{current.text}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-8">{SCALE_LABELS.map((label,i)=><button key={i} onClick={()=>choose(i+1)} className={`rounded-xl border-2 p-3 text-center transition-all ${answers[current.id]===i+1?'border-cyan-600 bg-cyan-50 text-cyan-900':'border-slate-200 hover:border-slate-400 text-slate-700'}`}><div className="text-xl font-bold mb-1">{i+1}</div><div className="text-xs leading-snug">{label}</div></button>)}</div>
      <div className="flex items-center justify-between gap-3 mt-9"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="px-5 py-3 rounded-xl border border-slate-300 text-slate-600 disabled:opacity-30">הקודם</button>{index<questions.length-1?<button disabled={!answers[current.id]} onClick={()=>setIndex(i=>i+1)} className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-30">הבא</button>:<button disabled={answered!==questions.length} onClick={()=>setShowResults(true)} className="px-6 py-3 rounded-xl bg-cyan-700 text-white font-bold disabled:opacity-30">לצפייה בפרופיל</button>}</div>
    </div><div className="text-center text-xs text-slate-500 mt-5">התשובות נשמרות בזיכרון הדפדפן במהלך ההתנסות בלבד.</div>
  </div></div>;
};

export default IndependentColorPrototype;
