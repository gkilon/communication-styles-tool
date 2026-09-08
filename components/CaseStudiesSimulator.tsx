import React, { useState, useRef, useEffect } from 'react';
import { Scores } from '../types';
import { getSimulationResponse, getSimulationFeedback, transcribeAudio, SimulationMessage } from '../services/geminiService';
import { useT } from '../i18n/useT';
import { useLanguage } from '../i18n/LanguageContext';

interface CaseStudiesSimulatorProps {
    scores: Scores;
}

export const CaseStudiesSimulator: React.FC<CaseStudiesSimulatorProps> = ({ scores }) => {
    const { t } = useT();
    const { lang, dir } = useLanguage();
    const [targetColor, setTargetColor] = useState<string>('');
    const [scenario, setScenario] = useState<string>('');
    const [relationship, setRelationship] = useState<string>('');
    const [userInput, setUserInput] = useState<string>('');
    const [conversation, setConversation] = useState<SimulationMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [feedback, setFeedback] = useState<string>('');
    const [isListening, setIsListening] = useState(false);
    const [isSpeechSupported, setIsSpeechSupported] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [speechError, setSpeechError] = useState<string>('');
    const [autoSpeak, setAutoSpeak] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [conversation, isLoading]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            try {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.lang = lang === 'en' ? 'en-US' : 'he-IL';
                recognition.interimResults = false;

                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setUserInput(prev => prev ? prev + ' ' + transcript : transcript);
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
                // fall through to MediaRecorder
            }
        }
    }, [lang]);

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
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                setIsTranscribing(true);
                setIsListening(false);
                try {
                    const base64 = await blobToBase64(blob);
                    const text = await transcribeAudio(base64, mimeType.split(';')[0]);
                    if (text) setUserInput(prev => prev ? prev + ' ' + text : text);
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

    const stopMediaRecorder = () => {
        mediaRecorderRef.current?.stop();
    };

    const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const toggleListen = () => {
        setSpeechError('');
        if (isListening) {
            if (isSpeechSupported) recognitionRef.current?.stop();
            else stopMediaRecorder();
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

    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = lang === 'en' ? 'en-US' : 'he-IL';
            msg.rate = 1.0;
            window.speechSynthesis.speak(msg);
        }
    };

    // Internal values stay Hebrew (the AI backend's few-shot examples and behavior matrix
    // are keyed by these exact Hebrew strings) — only the displayed label/description is translated.
    const colors = [
        { name: 'אדום', label: t('simulator', 'colorRed'), desc: t('simulator', 'colorRedDesc'), bg: 'bg-red-900/40 border-red-500 text-red-100' },
        { name: 'צהוב', label: t('simulator', 'colorYellow'), desc: t('simulator', 'colorYellowDesc'), bg: 'bg-yellow-900/40 border-yellow-500 text-yellow-100' },
        { name: 'ירוק', label: t('simulator', 'colorGreen'), desc: t('simulator', 'colorGreenDesc'), bg: 'bg-green-900/40 border-green-500 text-green-100' },
        { name: 'כחול', label: t('simulator', 'colorBlue'), desc: t('simulator', 'colorBlueDesc'), bg: 'bg-blue-900/40 border-blue-500 text-blue-100' },
    ];

    const relationships = [
        { value: 'מנהל', label: t('simulator', 'relManager'), desc: t('simulator', 'relManagerDesc') },
        { value: 'עובד', label: t('simulator', 'relEmployee'), desc: t('simulator', 'relEmployeeDesc') },
        { value: 'קולגה', label: t('simulator', 'relColleague'), desc: t('simulator', 'relColleagueDesc') },
        { value: 'לקוח', label: t('simulator', 'relClient'), desc: t('simulator', 'relClientDesc') },
    ];

    const handleStart = () => {
        if (!targetColor || !scenario.trim() || !relationship) return;
        setIsStarted(true);
        setConversation([]);
        setFeedback('');
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;

        if (isListening) recognitionRef.current?.stop();

        const newUserMsg: SimulationMessage = { sender: 'user', text: userInput };
        const newHistory = [...conversation, newUserMsg];

        setConversation(newHistory);
        setUserInput('');
        setIsLoading(true);

        try {
            const enrichedScenario = `${scenario} [יחס: הצד השני הוא ה${relationship} של המשתמש]`;
            const result = await getSimulationResponse(scores, targetColor, enrichedScenario, conversation, newUserMsg.text, lang);
            const newAiMsg: SimulationMessage = { sender: 'ai', text: result };
            setConversation([...newHistory, newAiMsg]);
            if (autoSpeak) speakText(result);
        } catch (err) {
            setConversation([...newHistory, { sender: 'ai', text: t('simulator', 'connectionError') }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetFeedback = async () => {
        if (conversation.length === 0 || isLoading) return;
        setIsLoading(true);
        try {
            const enrichedScenario = `${scenario} [יחס: הצד השני הוא ה${relationship} של המשתמש]`;
            const result = await getSimulationFeedback(scores, targetColor, enrichedScenario, conversation, lang);
            setFeedback(result);
        } catch (err) {
            setFeedback(t('simulator', 'feedbackError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setIsStarted(false);
        setConversation([]);
        setFeedback('');
        setUserInput('');
        setRelationship('');
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
        <div className="flex flex-col h-full relative" dir={dir}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-xl">
                        <span className="text-3xl">🎭</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">{t('simulator', 'title')}</h3>
                        <p className="text-gray-400 text-sm font-medium">{t('simulator', 'subtitle')}</p>
                    </div>
                </div>
                {isStarted && (
                    <button onClick={handleReset} className="text-xs text-gray-400 hover:text-white underline">{t('simulator', 'endConversation')}</button>
                )}
            </div>

            {!isStarted && (
                <div className="bg-gray-900/60 p-6 rounded-2xl border border-gray-700 space-y-6 animate-fade-in-up">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">{t('simulator', 'step1')}</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {colors.map(c => (
                                <button
                                    key={c.name}
                                    onClick={() => setTargetColor(c.name)}
                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center ${targetColor === c.name ? c.bg + ' ring-2 ring-white scale-105' : 'bg-gray-800 border-gray-600 hover:border-gray-500 opacity-70'}`}
                                >
                                    <div className="font-bold mb-1">{c.label}</div>
                                    <div className="text-xs opacity-80">{c.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">{t('simulator', 'step2')}</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {relationships.map(r => (
                                <button
                                    key={r.value}
                                    onClick={() => setRelationship(r.value)}
                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center ${relationship === r.value ? 'bg-purple-900/40 border-purple-500 text-purple-100 ring-2 ring-white scale-105' : 'bg-gray-800 border-gray-600 hover:border-gray-500 opacity-70 text-gray-300'}`}
                                >
                                    <div className="font-bold mb-1">{r.label}</div>
                                    <div className="text-xs opacity-80">{r.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">{t('simulator', 'step3')}</label>
                        <input
                            type="text"
                            value={scenario}
                            onChange={e => setScenario(e.target.value)}
                            className="w-full bg-gray-800 text-white rounded-xl p-4 border border-gray-600 focus:border-purple-500 outline-none"
                            placeholder={t('simulator', 'scenarioPlaceholder')}
                        />
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={!targetColor || !scenario.trim() || !relationship}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                    >
                        {t('simulator', 'startConversation')}
                    </button>
                </div>
            )}

            {isStarted && (
                <div className="flex flex-col h-full bg-gray-900/60 rounded-2xl border border-gray-700 overflow-hidden relative">
                    <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center px-4">
                        <div className="text-xs text-gray-400">
                            <span className="font-bold text-purple-400">{t('simulator', 'characterLabel')}</span> {colors.find(c => c.name === targetColor)?.label || targetColor} ({relationships.find(r => r.value === relationship)?.label || relationship}) | <span className="font-bold text-purple-400">{t('simulator', 'scenarioLabel')}</span> {scenario}
                        </div>
                        <button
                            onClick={() => { setAutoSpeak(v => { if (v) window.speechSynthesis.cancel(); return !v; }); }}
                            className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition-all ${autoSpeak ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-gray-700 border-gray-600 text-gray-400 hover:text-white'}`}
                            title={t('simulator', 'autoVoiceTitle')}
                        >
                            {autoSpeak ? t('simulator', 'voiceOn') : t('simulator', 'voiceOff')}
                        </button>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[min(65dvh,700px)]">
                        {conversation.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                                <span className="text-4xl mb-2">🎤</span>
                                <p>{t('simulator', 'conversationStarted')}</p>
                            </div>
                        )}
                        {conversation.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tl-none' : 'bg-gray-800 text-gray-200 border border-gray-600 rounded-tr-none'}`}>
                                    {msg.sender === 'user' ? (
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    ) : (
                                        <>
                                            {renderMarkdownText(msg.text)}
                                            <button
                                                onClick={() => speakText(msg.text)}
                                                className="mt-2 text-xs text-gray-500 hover:text-purple-400 transition-colors flex items-center gap-1"
                                                title={t('simulator', 'readAloudTitle')}
                                            >
                                                🔊 <span>{t('simulator', 'readAloud')}</span>
                                            </button>
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

                        {feedback && (
                            <div className="relative p-6 bg-emerald-900/30 border border-emerald-500/50 rounded-2xl animate-fade-in-up mt-8 group">
                                <button onClick={() => speakText(feedback)} className="absolute -left-4 -top-4 p-3 bg-emerald-900 border border-emerald-500 rounded-full opacity-70 hover:opacity-100 transition-opacity shadow-lg flex justify-center items-center w-12 h-12" title={t('simulator', 'readFeedbackTitle')}>🔊</button>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-2xl">💡</span>
                                    <h4 className="text-emerald-400 font-bold text-xl">{t('simulator', 'coachFeedback')}</h4>
                                </div>
                                {renderMarkdownText(feedback)}
                            </div>
                        )}
                    </div>

                    {!feedback && (
                        <div className="bg-gray-800 p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={userInput}
                                        onChange={e => setUserInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                        className={`w-full bg-gray-900 text-white rounded-xl py-3 px-4 ${dir === 'rtl' ? 'pr-14' : 'pl-14'} border border-gray-600 focus:border-purple-500 outline-none`}
                                        placeholder={isTranscribing ? t('simulator', 'convertingSpeech') : t('simulator', 'typeHere')}
                                        disabled={isLoading || isTranscribing}
                                    />
                                    <button
                                        onClick={toggleListen}
                                        disabled={isTranscribing || isLoading}
                                        className={`absolute ${dir === 'rtl' ? 'right-2' : 'left-2'} top-1.5 bottom-1.5 px-3 rounded-lg transition-all text-xl disabled:opacity-40 ${isListening ? 'bg-red-500/30 text-red-400 animate-pulse' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                        title={isListening ? t('simulator', 'stopRecording') : t('simulator', 'speakToMic')}
                                    >
                                        {isTranscribing ? '⏳' : isListening ? '🔴' : '🎙️'}
                                    </button>
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!userInput.trim() || isLoading || isTranscribing}
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 transition-all"
                                >
                                    {t('common', 'send')}
                                </button>
                            </div>
                            {isListening && !isSpeechSupported && (
                                <p className={`text-xs text-red-400 mt-2 ${dir === 'rtl' ? 'text-right' : 'text-left'} animate-pulse`}>🔴 {t('simulator', 'recording')}</p>
                            )}
                            {isTranscribing && (
                                <p className={`text-xs text-purple-400 mt-2 ${dir === 'rtl' ? 'text-right' : 'text-left'} animate-pulse`}>⏳ {t('simulator', 'convertingRecording')}</p>
                            )}
                            {speechError && (
                                <p className={`text-xs text-red-400 mt-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>⚠️ {speechError}</p>
                            )}

                            {conversation.length > 0 && (
                                <button
                                    onClick={handleGetFeedback}
                                    disabled={isLoading}
                                    className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-emerald-400 font-bold py-2 rounded-xl text-sm transition-all border border-gray-600"
                                >
                                    {t('simulator', 'getFeedback')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};