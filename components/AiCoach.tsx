
import React, { useState, useRef, useEffect } from 'react';
import { Scores, BackgroundData } from '../types';
import { getAiCoachAdviceStream, transcribeAudio, redeemAccessCode } from '../services/geminiService';
import { SparklesIcon } from './icons/Icons';
import { useT } from '../i18n/useT';
import { useLanguage } from '../i18n/LanguageContext';
import type { Message, CoachArchive, CoachMode } from './useCoachArchive';
import type { CoachMemory } from './useCoachMemory';
import { memoryToPromptLines } from './useCoachMemory';
import { CoachMemoryPanel } from './CoachMemoryPanel';

interface AiCoachProps {
  scores: Scores;
  backgroundData?: BackgroundData | null;
  // The conversation state lives in the parent (ResultsScreen) so it survives switching tabs.
  conversation: Message[];
  setConversation: React.Dispatch<React.SetStateAction<Message[]>>;
  userInput: string;
  setUserInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  // Saved conversations (archive) — see useCoachArchive.
  archive: CoachArchive;
  // How this conversation runs (feedback / consult); null = the advisor decides.
  mode: CoachMode | null;
  setMode: React.Dispatch<React.SetStateAction<CoachMode | null>>;
  // "What I know about you" — the user's own, editable picture, used by the advisor.
  memory: CoachMemory;
}

export type { Message };

// Two kinds of conversation: "feedback" = a question about myself that gets a detailed
// answer; "consult" = a guided consulting conversation that ends in action directions.
const FEEDBACK_STARTERS_HE = [
  "מהן נקודות העיוורון שלי ואיך להימנע מהן במצבי לחץ?",
  "מהן החוזקות המרכזיות שלי, ואיפה כדאי לי להשתמש בהן יותר?",
  "מהם המנופים המרכזיים שלי להתפתחות ולהשפעה בארגון?"
];

const CONSULT_STARTERS_HE = [
  "יש לי קושי מול עובד או מול הצוות שלי",
  "יש לי קושי מול קולגה",
  "יש לי קושי מול המנהל שלי",
  "יש לי קושי עם עומס המשימות שלי"
];

const FEEDBACK_STARTERS_EN = [
  "What are my blind spots, and how do I avoid them under pressure?",
  "What are my main strengths, and where should I use them more?",
  "What are my main levers for development and for influence in the organization?"
];

const CONSULT_STARTERS_EN = [
  "I'm struggling with an employee or with my team",
  "I'm struggling with a colleague",
  "I'm struggling with my manager",
  "I'm struggling with my workload"
];

const HEADER_TEXT = {
  he: {
    title: 'דבר עם Kilon, היועץ האישי שלך',
    subtitle: 'יועץ AI שמכיר אותך, ומייעץ בשיטה של Kilon.',
    placeholder: 'כתוב או דבר: שאל מה שבא לך, או ספר על הדילמה שלך...',
    memoryTitle: 'מה אני יודע עליך',
    memoryOpen: 'קרא וערוך',
    memoryEmpty: 'עדיין אין כאן כלום',
    feedbackTitle: 'Kilon, תן לי פידבק',
    feedbackSub: 'שאלה על עצמי, ותשובה מפורטת',
    consultTitle: 'אני רוצה להתייעץ',
    consultSub: 'שיחה שמובילה יחד לכיווני פעולה',
    freeFeedback: '✍️ שאל שאלה על עצמך',
    freeConsult: '✍️ יש לי התייעצות אחרת',
    needsCodeText: 'כדי להשתמש ביועץ צריך קוד גישה. הזן את הקוד שקיבלת ושלח שוב את ההודעה.',
    needsCodeButton: 'הפעל',
    codePlaceholder: 'קוד גישה',
    codeAccepted: 'הקוד התקבל. אפשר לשלוח את ההודעה.',
    archive: 'שיחות קודמות',
    newChat: 'שיחה חדשה',
    noChats: 'עדיין אין שיחות שמורות. כל שיחה נשמרת אוטומטית.',
    deleteConfirm: 'למחוק את השיחה הזו לצמיתות?',
    saveFailed: 'השמירה האוטומטית של השיחה נכשלה. השיחה תישאר רק כל עוד הדף פתוח.'
  },
  en: {
    title: 'Talk to Kilon, your personal advisor',
    subtitle: 'An AI advisor who knows you and advises the Kilon way.',
    placeholder: 'Type or speak: ask anything, or tell me about your dilemma...',
    memoryTitle: 'What I know about you',
    memoryOpen: 'Read and edit',
    memoryEmpty: 'Nothing here yet',
    feedbackTitle: 'Kilon, give me feedback',
    feedbackSub: 'A question about myself, and a detailed answer',
    consultTitle: 'I want to consult',
    consultSub: 'A conversation that leads together to action directions',
    freeFeedback: '✍️ Ask a question about yourself',
    freeConsult: '✍️ I have a different topic to consult about',
    needsCodeText: 'An access code is needed to use the advisor. Enter the code you received, then send your message again.',
    needsCodeButton: 'Activate',
    codePlaceholder: 'Access code',
    codeAccepted: 'Code accepted. You can send your message now.',
    archive: 'Past conversations',
    newChat: 'New conversation',
    noChats: 'No saved conversations yet. Every conversation is saved automatically.',
    deleteConfirm: 'Delete this conversation permanently?',
    saveFailed: "Auto-saving this conversation failed. It will only stay while this page is open."
  }
};

// Plain text -> safe HTML (used only if the markdown renderer is unavailable).
const plainToHtml = (s: string) =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&#39;')
   .replace(/\n/g, '<br />');

const AiMessageContent: React.FC<{ text: string }> = ({ text }) => {
  const { dir } = useLanguage();
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const renderMarkdown = () => {
      const marked = (window as any).marked;
      try {
        if (marked) {
          const parsed = typeof marked.parse === 'function' ? marked.parse(text) : (typeof marked === 'function' ? marked(text) : text);
          setHtmlContent(parsed);
        } else {
          setHtmlContent(plainToHtml(text));
        }
      } catch (error) {
        setHtmlContent(plainToHtml(text));
      }
    };
    renderMarkdown();
  }, [text]);

  if (!text) return null;

  return (
    <div
      className={`max-w-none text-gray-200 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ps-5 [&_ol]:mb-3 [&_li]:mb-1.5 [&_strong]:text-white [&_strong]:font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
      dir={dir}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export const AiCoach: React.FC<AiCoachProps> = ({ scores, backgroundData, conversation, setConversation, userInput, setUserInput, isLoading, setIsLoading, archive, mode, setMode, memory }) => {
  const { t } = useT();
  const { lang, dir } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

  // The account has no valid access code yet (e.g. it joined through a team link): ask for one.
  const [needsCode, setNeedsCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeAccepted, setCodeAccepted] = useState(false);

  // Voice input (same approach as the dialogue simulator): browser speech recognition when
  // available, otherwise record audio and transcribe it through the AI service.
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const ht = HEADER_TEXT[lang === 'en' ? 'en' : 'he'];
  const feedbackStarters = lang === 'en' ? FEEDBACK_STARTERS_EN : FEEDBACK_STARTERS_HE;
  const consultStarters = lang === 'en' ? CONSULT_STARTERS_EN : CONSULT_STARTERS_HE;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, isLoading]);

  const addToInput = (text: string) => setUserInput(prev => (prev ? prev + ' ' + text : text));

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = lang === 'en' ? 'en-US' : 'he-IL';
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        addToInput(event.results[0][0].transcript);
        setSpeechError('');
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') setSpeechError(t('simulator', 'micDenied'));
        else if (event.error === 'network') setSpeechError(t('simulator', 'networkError'));
        else if (event.error === 'no-speech') setSpeechError(t('simulator', 'noSpeech'));
        else setSpeechError(t('simulator', 'genericError') + ' ' + event.error);
      };
      recognitionRef.current = recognition;
      setIsSpeechSupported(true);
    } catch {
      // fall back to recording + transcription
    }
  }, [lang]);

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const startMediaRecorder = async () => {
    setSpeechError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(tr => tr.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setIsTranscribing(true);
        setIsListening(false);
        try {
          const base64 = await blobToBase64(blob);
          const text = await transcribeAudio(base64, mimeType.split(';')[0]);
          if (text) addToInput(text);
          else setSpeechError(t('simulator', 'noSpeechRetry'));
        } catch (err: any) {
          setSpeechError(err.message || t('simulator', 'transcriptionError'));
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch {
      setSpeechError(t('simulator', 'micAccessError'));
    }
  };

  const toggleListen = () => {
    setSpeechError('');
    if (isListening) {
      if (isSpeechSupported) recognitionRef.current?.stop();
      else mediaRecorderRef.current?.stop();
      return;
    }
    if (isSpeechSupported) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setSpeechError(t('simulator', 'micStartError'));
      }
    } else {
      startMediaRecorder();
    }
  };

  const updateLastAi = (fn: (msg: Message) => Message) => {
    setConversation(prev => {
      const list = [...prev];
      const i = list.length - 1;
      if (i >= 0 && list[i].sender === 'ai') list[i] = fn(list[i]);
      return list;
    });
  };

  const handleSendMessage = async (messageText?: string, startMode?: CoachMode) => {
    const text = messageText || userInput;
    if (!text.trim() || isLoading) return;

    // A conversation opened from one of the two entry cards runs in that mode from then on.
    const activeMode: CoachMode | null = startMode ?? mode;
    if (startMode) setMode(startMode);

    // Everything said so far (without failed replies) goes to the model as context.
    const history = conversation.filter(m => !m.isError);
    // If the profile changed since this conversation was last saved, the advisor mentions it once.
    const profileChange = archive.profileChange;

    setConversation(prev => [...prev, { sender: 'user', text }, { sender: 'ai', text: '' }]);
    setUserInput('');
    setIsLoading(true);

    try {
      await getAiCoachAdviceStream(scores, text, (chunk) => {
        updateLastAi(m => ({ ...m, text: chunk }));
      }, backgroundData, lang, history, profileChange ? profileChange.previous : null, activeMode, memoryToPromptLines(memory.items));
      if (profileChange) archive.clearProfileChange();
    } catch (error: any) {
      console.error("AI Coach interaction failed:", error);
      if (error?.needsCode) {
        // Take the failed turn back out of the conversation, keep the text for a retry.
        setConversation(prev => prev.slice(0, -2));
        setUserInput(text);
        setCodeAccepted(false);
        setNeedsCode(true);
        return;
      }
      updateLastAi(m => m.text ? m : {
        ...m,
        isError: true,
        text: error?.message || (lang === 'en'
          ? "Sorry, there was an error connecting to the AI service. Please check your internet connection and try again."
          : "מצטער, חלה שגיאה בחיבור לשרת ה-AI. וודא שחיבור האינטרנט תקין ונסה שוב.")
      });
    } finally {
      setIsLoading(false);
    }
  };

  const chatList = archive.chats.length === 0 ? (
    <p className="text-gray-400 text-sm p-3">{ht.noChats}</p>
  ) : (
    archive.chats.map(c => (
      <div
        key={c.id}
        className={`flex items-center gap-1 rounded-xl px-2 py-0.5 ${c.id === archive.activeId ? 'bg-cyan-900/30 border border-cyan-700/60' : 'border border-transparent hover:bg-gray-800/70'}`}
      >
        <button
          onClick={() => { archive.openChat(c.id); setShowArchive(false); }}
          disabled={isLoading}
          className={`flex-1 min-w-0 ${dir === 'rtl' ? 'text-right' : 'text-left'} py-2 disabled:opacity-50`}
        >
          <span className="block text-sm text-gray-100 truncate">{c.title}</span>
          <span className="block text-xs text-gray-500">
            {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </span>
        </button>
        <button
          onClick={() => { if (window.confirm(ht.deleteConfirm)) archive.removeChat(c.id); }}
          className="text-gray-500 hover:text-red-400 px-1.5 py-2 transition-colors"
          title="🗑️"
        >
          🗑️
        </button>
      </div>
    ))
  );

  return (
    <div className="flex flex-col md:flex-row gap-5 h-full" dir={dir}>
      {/* Side panel (desktop): the conversation history, like a chat app's sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 self-start bg-gray-900/60 border border-gray-700 rounded-2xl p-3 md:max-h-[820px]">
        <button
          onClick={() => archive.newChat()}
          disabled={isLoading || conversation.length === 0}
          className="w-full text-sm font-bold bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-300 px-3 py-2.5 rounded-xl border border-cyan-700/60 transition-all disabled:opacity-40"
        >
          ➕ {ht.newChat}
        </button>

        <button
          onClick={() => setShowMemory(true)}
          className={`mt-3 w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} bg-gray-800/70 hover:bg-gray-800 border border-gray-700 hover:border-cyan-700/60 rounded-xl p-3 transition-all`}
        >
          <div className="text-sm font-bold text-white">🧠 {ht.memoryTitle}</div>
          {memory.items.length === 0 ? (
            <div className="text-xs text-gray-500 mt-1">{ht.memoryEmpty}</div>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {memory.items.slice(0, 3).map(i => (
                <li key={i.id} className="text-xs text-gray-400 truncate">• {i.text}</li>
              ))}
            </ul>
          )}
          <div className="text-xs font-bold text-cyan-400 mt-2">{ht.memoryOpen} ←</div>
        </button>

        <div className="mt-4 mb-1 px-1 text-xs font-bold text-gray-400">{ht.archive}</div>
        <div className="overflow-y-auto flex-1 space-y-1">{chatList}</div>
      </aside>

      <div className="flex flex-col h-full flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-cyan-500/20 p-2 rounded-xl">
          <SparklesIcon className="w-8 h-8 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">{ht.title}</h3>
          <p className="text-gray-400 text-sm font-medium">{ht.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setShowMemory(true)}
          className="md:hidden text-sm font-bold bg-gray-800/80 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-xl border border-gray-700 transition-all"
        >
          🧠 {ht.memoryTitle}
        </button>
        <button
          onClick={() => setShowArchive(v => !v)}
          className="md:hidden text-sm font-bold bg-gray-800/80 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-xl border border-gray-700 transition-all"
        >
          🗂️ {ht.archive}{archive.chats.length > 0 ? ` (${archive.chats.length})` : ''}
        </button>
        {conversation.length > 0 && mode && (
          <span className={`text-xs font-bold px-3 py-2 rounded-xl border ${mode === 'feedback' ? 'text-cyan-300 border-cyan-700/60 bg-cyan-900/20' : 'text-violet-300 border-violet-600/60 bg-violet-900/20'}`}>
            {mode === 'feedback' ? ht.feedbackTitle : ht.consultTitle}
          </span>
        )}
        {conversation.length > 0 && (
          <button
            onClick={() => { archive.newChat(); setShowArchive(false); }}
            disabled={isLoading}
            className="md:hidden text-sm font-bold bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-300 px-3 py-2 rounded-xl border border-cyan-700/60 transition-all disabled:opacity-40"
          >
            ➕ {ht.newChat}
          </button>
        )}
      </div>

      {showArchive && (
        <div className="md:hidden mb-4 bg-gray-900/70 border border-gray-700 rounded-2xl p-2 max-h-64 overflow-y-auto">
          {chatList}
        </div>
      )}

      {needsCode && (
        <div className={`mb-3 bg-amber-900/20 border border-amber-600/40 rounded-2xl p-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
          <p className="text-sm text-amber-200 mb-3">{ht.needsCodeText}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder={ht.codePlaceholder}
              dir="ltr"
              className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-xl py-2.5 px-3 text-white text-center font-mono uppercase focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={async () => {
                if (!codeInput.trim() || codeBusy) return;
                setCodeBusy(true);
                setCodeError('');
                const r = await redeemAccessCode(codeInput);
                setCodeBusy(false);
                if (r.ok) {
                  setNeedsCode(false);
                  setCodeInput('');
                  setCodeAccepted(true);
                } else {
                  setCodeError(r.error || '');
                }
              }}
              disabled={codeBusy || !codeInput.trim()}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold px-4 rounded-xl transition-all"
            >
              {codeBusy ? '...' : ht.needsCodeButton}
            </button>
          </div>
          {codeError && <p className="text-xs text-red-400 mt-2">⚠️ {codeError}</p>}
        </div>
      )}
      {codeAccepted && !needsCode && (
        <p className={`text-xs text-green-400 mb-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>✅ {ht.codeAccepted}</p>
      )}

      {archive.saveFailed && (
        <p className={`text-xs text-red-400 mb-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>⚠️ {ht.saveFailed}</p>
      )}

      <div
        ref={scrollRef}
        className="bg-gray-900/80 rounded-2xl h-[65dvh] min-h-[440px] max-h-[720px] overflow-y-auto mb-6 border border-gray-700/50 p-6 shadow-inner scroll-smooth"
      >
        {conversation.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-dashed border-gray-700">
                <p className="text-gray-400 mb-4 font-medium italic">{t('aiCoach', 'greeting')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ── Feedback: a question about myself → a detailed answer ── */}
                  <div className="rounded-2xl border border-cyan-700/50 bg-cyan-900/10 p-4 flex flex-col gap-2">
                    <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                      <div className="text-lg font-black text-cyan-300">{ht.feedbackTitle}</div>
                      <div className="text-xs text-gray-400">{ht.feedbackSub}</div>
                    </div>
                    {feedbackStarters.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(q, 'feedback')}
                        className={`${dir === 'rtl' ? 'text-right' : 'text-left'} text-sm bg-gray-800 hover:bg-gray-700 hover:text-cyan-400 text-gray-300 p-3 rounded-xl transition-all border border-gray-700 shadow-sm`}
                      >
                        {q}
                      </button>
                    ))}
                    <button
                      onClick={() => { setMode('feedback'); inputRef.current?.focus(); }}
                      className={`${dir === 'rtl' ? 'text-right' : 'text-left'} text-sm font-bold bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-300 p-3 rounded-xl transition-all border border-cyan-700/60 shadow-sm`}
                    >
                      {ht.freeFeedback}
                    </button>
                  </div>

                  {/* ── Consult: a guided conversation → action directions ── */}
                  <div className="rounded-2xl border border-violet-600/50 bg-violet-900/10 p-4 flex flex-col gap-2">
                    <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                      <div className="text-lg font-black text-violet-300">{ht.consultTitle}</div>
                      <div className="text-xs text-gray-400">{ht.consultSub}</div>
                    </div>
                    {consultStarters.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(q, 'consult')}
                        className={`${dir === 'rtl' ? 'text-right' : 'text-left'} text-sm bg-gray-800 hover:bg-gray-700 hover:text-violet-300 text-gray-300 p-3 rounded-xl transition-all border border-gray-700 shadow-sm`}
                      >
                        {q}
                      </button>
                    ))}
                    <button
                      onClick={() => { setMode('consult'); inputRef.current?.focus(); }}
                      className={`${dir === 'rtl' ? 'text-right' : 'text-left'} text-sm font-bold bg-violet-900/30 hover:bg-violet-900/50 text-violet-300 p-3 rounded-xl transition-all border border-violet-600/60 shadow-sm`}
                    >
                      {ht.freeConsult}
                    </button>
                  </div>
                </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {conversation.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div
                className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                  msg.sender === 'user'
                  ? 'bg-gradient-to-br from-cyan-700 to-blue-800 text-white rounded-tl-none'
                  : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tr-none'
                }`}
              >
                {msg.sender === 'ai' ? (
                   <AiMessageContent text={msg.text} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          ))}

           {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl rounded-tr-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                    <span className="text-xs text-gray-500 mr-2 font-bold uppercase tracking-wider">{t('aiCoach', 'processing')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={ht.placeholder}
          className={`w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-4 ${dir === 'rtl' ? 'pr-14 pl-24' : 'pl-14 pr-24'} text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all shadow-lg`}
          disabled={isLoading || isTranscribing}
        />
        <button
          onClick={toggleListen}
          disabled={isTranscribing || isLoading}
          className={`absolute ${dir === 'rtl' ? 'right-2' : 'left-2'} top-2 bottom-2 px-3 rounded-xl transition-all text-xl disabled:opacity-40 ${isListening ? 'bg-red-500/30 text-red-400 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
          title={isListening ? t('simulator', 'stopRecording') : t('simulator', 'speakToMic')}
        >
          {isTranscribing ? '⏳' : isListening ? '🔴' : '🎙️'}
        </button>
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || isTranscribing || !userInput.trim()}
          className={`absolute ${dir === 'rtl' ? 'left-2' : 'right-2'} top-2 bottom-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 rounded-xl transition-all disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md`}
        >
          {isLoading ? '...' : t('common', 'send')}
        </button>
      </div>
      {isListening && !isSpeechSupported && (
        <p className={`text-xs text-red-400 mt-2 ${dir === 'rtl' ? 'text-right' : 'text-left'} animate-pulse`}>🔴 {t('simulator', 'recording')}</p>
      )}
      {isTranscribing && (
        <p className={`text-xs text-cyan-400 mt-2 ${dir === 'rtl' ? 'text-right' : 'text-left'} animate-pulse`}>⏳ {t('simulator', 'convertingRecording')}</p>
      )}
      {speechError && (
        <p className={`text-xs text-red-400 mt-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>⚠️ {speechError}</p>
      )}
      </div>

      {showMemory && (
        <CoachMemoryPanel memory={memory} lang={lang === 'en' ? 'en' : 'he'} dir={dir} onClose={() => setShowMemory(false)} />
      )}
    </div>
  );
};
