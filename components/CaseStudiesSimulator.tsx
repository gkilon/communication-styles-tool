import React, { useState, useRef, useEffect } from 'react';
import { Scores } from '../types';
import { getSimulationResponse, getSimulationFeedback, SimulationMessage } from '../services/geminiService';

interface CaseStudiesSimulatorProps {
    scores: Scores;
}

export const CaseStudiesSimulator: React.FC<CaseStudiesSimulatorProps> = ({ scores }) => {
    const [targetColor, setTargetColor] = useState<string>('');
    const [scenario, setScenario] = useState<string>('');
    const [userInput, setUserInput] = useState<string>('');
    const [conversation, setConversation] = useState<SimulationMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [feedback, setFeedback] = useState<string>('');
    const [isListening, setIsListening] = useState(false);
    const [isSpeechSupported, setIsSpeechSupported] = useState(false);
    const [speechError, setSpeechError] = useState<string>('');

    const scrollRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [conversation, isLoading]);

    // Init SpeechRecognition with mobile-aware detection
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSpeechSupported(false);
            return;
        }
        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'he-IL';
            recognition.interimResults = false;

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setUserInput(prev => prev ? prev + ' ' + transcript : transcript);
                setSpeechError('');
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    setSpeechError('גישה למיקרופון נדחתה. אנא אפשר גישה בהגדרות הדפדפן.');
                } else if (event.error === 'network') {
                    setSpeechError('שגיאת רשת בזיהוי קולי. נסה שוב.');
                } else if (event.error === 'no-speech') {
                    setSpeechError('לא זוהה קול. נסה לדבר קרוב יותר למיקרופון.');
                } else {
                    setSpeechError('שגיאה: ' + event.error);
                }
            };

            recognitionRef.current = recognition;
            setIsSpeechSupported(true);
        } catch {
            setIsSpeechSupported(false);
        }
    }, []);

    const toggleListen = () => {
        setSpeechError('');
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                    setIsListening(true);
                } catch {
                    setSpeechError('לא ניתן להפעיל את המיקרופון. ודא שהדפדפן קיבל הרשאה.');
                }
            }
        }
    };

    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop current playing
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'he-IL';
            msg.rate = 1.0;
            window.speechSynthesis.speak(msg);
        }
    };

    const colors = [
        { name: 'אדום', desc: 'דומיננטי, ממוקד תוצאות, ישיר', bg: 'bg-red-900/40 border-red-500 text-red-100' },
        { name: 'צהוב', desc: 'חברותי, מלא התלהבות, יצירתי', bg: 'bg-yellow-900/40 border-yellow-500 text-yellow-100' },
        { name: 'ירוק', desc: 'רגיש, תומך, מחפש הרמוניה', bg: 'bg-green-900/40 border-green-500 text-green-100' },
        { name: 'כחול', desc: 'אנליטי, מחושב, יורד לפרטים', bg: 'bg-blue-900/40 border-blue-500 text-blue-100' },
    ];

    const handleStart = () => {
        if (!targetColor || !scenario.trim()) return;
        setIsStarted(true);
        setConversation([]);
        setFeedback('');
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;

        // Stop listening if user clicks send
        if (isListening) recognitionRef.current?.stop();

        const newUserMsg: SimulationMessage = { sender: 'user', text: userInput };
        const newHistory = [...conversation, newUserMsg];

        setConversation(newHistory);
        setUserInput('');
        setIsLoading(true);

        try {
            const result = await getSimulationResponse(scores, targetColor, scenario, conversation, newUserMsg.text);
            const newAiMsg: SimulationMessage = { sender: 'ai', text: result };
            setConversation([...newHistory, newAiMsg]);
        } catch (err) {
            setConversation([...newHistory, { sender: 'ai', text: "שגיאה בחיבור לסימולטור." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetFeedback = async () => {
        if (conversation.length === 0 || isLoading) return;
        setIsLoading(true);
        try {
            const result = await getSimulationFeedback(targetColor, scenario, conversation);
            setFeedback(result);
        } catch (err) {
            setFeedback("לא הצלחתי לייצר משוב.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setIsStarted(false);
        setConversation([]);
        setFeedback('');
        setUserInput('');
        window.speechSynthesis.cancel();
    };

    const renderMarkdownText = (text: string) => {
        const marked = (window as any).marked;
        if (marked) {
            let html = '';
            try {
                html = typeof marked.parse === 'function' ? marked.parse(text) : marked(text);
            } catch (e) {
                html = text.replace(/\n/g, '<br/>');
            }
            return <div className="prose prose-invert max-w-none prose-p:text-gray-200 text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <div className="whitespace-pre-wrap">{text}</div>;
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-xl">
                        <span className="text-3xl">🎭</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">סימולטור מציאותי</h3>
                        <p className="text-gray-400 text-sm font-medium">תרגול שיחה קולית וכתובה מול טיפוס תקשורת</p>
                    </div>
                </div>
                {isStarted && (
                    <button onClick={handleReset} className="text-xs text-gray-400 hover:text-white underline">סיים שיחה וסגור</button>
                )}
            </div>

            {!isStarted && (
                <div className="bg-gray-900/60 p-6 rounded-2xl border border-gray-700 space-y-6 animate-fade-in-up">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">1. בחר קולגה (צבע):</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {colors.map(c => (
                                <button
                                    key={c.name}
                                    onClick={() => setTargetColor(c.name)}
                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center ${targetColor === c.name ? c.bg + ' ring-2 ring-white scale-105' : 'bg-gray-800 border-gray-600 hover:border-gray-500 opacity-70'
                                        }`}
                                >
                                    <div className="font-bold mb-1">{c.name}</div>
                                    <div className="text-xs opacity-80">{c.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">2. הגדר את התרחיש (נושא השיחה, הקשר):</label>
                        <input
                            type="text"
                            value={scenario}
                            onChange={e => setScenario(e.target.value)}
                            className="w-full bg-gray-800 text-white rounded-xl p-4 border border-gray-600 focus:border-purple-500 outline-none"
                            placeholder="למשל: תכנון פרויקט חדש, פתרון קונפליקט מול לקוח..."
                        />
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={!targetColor || !scenario.trim()}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                    >
                        התחל שיחה 🚀
                    </button>
                </div>
            )}

            {isStarted && (
                <div className="flex flex-col h-full bg-gray-900/60 rounded-2xl border border-gray-700 overflow-hidden relative">

                    {/* Context Header */}
                    <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center px-4">
                        <div className="text-xs text-gray-400">
                            <span className="font-bold text-purple-400">דמות:</span> {targetColor} | <span className="font-bold text-purple-400">תרחיש:</span> {scenario}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
                        {conversation.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                                <span className="text-4xl mb-2">🎤</span>
                                <p>השיחה התחילה. שלח הודעה או דבר במיקרופון בשביל להתחיל!</p>
                            </div>
                        )}
                        {conversation.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                <div className={`relative max-w-[85%] p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tl-none' : 'bg-gray-800 text-gray-200 border border-gray-600 rounded-tr-none group'}`}>
                                    {msg.sender === 'user' ? (
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    ) : (
                                        <>
                                            <button onClick={() => speakText(msg.text)} className="absolute -left-12 top-2 p-2 bg-gray-800 border border-gray-600 rounded-full opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center w-10 h-10" title="הקרא בקול">🔊</button>
                                            {renderMarkdownText(msg.text)}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl rounded-tr-none flex gap-2">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}

                        {/* Feedback Area */}
                        {feedback && (
                            <div className="relative mt-6 p-6 bg-emerald-900/30 border border-emerald-500/50 rounded-2xl animate-fade-in-up mt-8 group">
                                <button onClick={() => speakText(feedback)} className="absolute -left-4 -top-4 p-3 bg-emerald-900 border border-emerald-500 rounded-full opacity-70 hover:opacity-100 transition-opacity shadow-lg flex justify-center items-center w-12 h-12" title="הקרא משוב">🔊</button>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-2xl">💡</span>
                                    <h4 className="text-emerald-400 font-bold text-xl">משוב המאמן:</h4>
                                </div>
                                {renderMarkdownText(feedback)}
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    {!feedback && (
                        <div className="bg-gray-800 p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={userInput}
                                        onChange={e => setUserInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                        className={`w-full bg-gray-900 text-white rounded-xl py-3 px-4 border border-gray-600 focus:border-purple-500 outline-none ${isSpeechSupported ? 'pr-14' : 'pr-4'}`}
                                        placeholder="הקלד כאן..."
                                        disabled={isLoading}
                                    />
                                    {isSpeechSupported && (
                                        <button
                                            onClick={toggleListen}
                                            className={`absolute right-2 top-1.5 bottom-1.5 px-3 rounded-lg transition-all text-xl ${
                                                isListening
                                                    ? 'bg-red-500/30 text-red-400 animate-pulse'
                                                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                            }`}
                                            title={isListening ? 'עצור האזנה' : 'דבר למיקרופון'}
                                        >
                                            {isListening ? '🔴' : '🎙️'}
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!userInput.trim() || isLoading}
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 transition-all"
                                >
                                    שלח
                                </button>
                            </div>
                            {!isSpeechSupported && (
                                <p className="text-xs text-gray-500 mt-2 text-right">
                                    💬 זיהוי קולי אינו נתמך בדפדפן זה. ניתן להקליד בלבד.
                                </p>
                            )}
                            {speechError && (
                                <p className="text-xs text-red-400 mt-2 text-right">⚠️ {speechError}</p>
                            )}

                            {conversation.length > 0 && (
                                <button
                                    onClick={handleGetFeedback}
                                    disabled={isLoading}
                                    className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-emerald-400 font-bold py-2 rounded-xl text-sm transition-all border border-gray-600"
                                >
                                    🔍 קבל משוב מדויק על השיחה וסיים
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
