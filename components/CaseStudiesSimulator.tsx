import React, { useState } from 'react';
import { Scores } from '../types';
import { getSimulationResponse } from '../services/geminiService';

interface CaseStudiesSimulatorProps {
    scores: Scores;
}

export const CaseStudiesSimulator: React.FC<CaseStudiesSimulatorProps> = ({ scores }) => {
    const [targetColor, setTargetColor] = useState<string>('');
    const [scenario, setScenario] = useState<string>('');
    const [userInput, setUserInput] = useState<string>('');
    const [response, setResponse] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const colors = [
        { name: 'אדום', desc: 'דומיננטי, ממוקד תוצאות, ישיר', bg: 'bg-red-900/40 border-red-500 text-red-100', hover: 'hover:bg-red-800' },
        { name: 'צהוב', desc: 'חברותי, מלא התלהבות, יצירתי', bg: 'bg-yellow-900/40 border-yellow-500 text-yellow-100', hover: 'hover:bg-yellow-800' },
        { name: 'ירוק', desc: 'רגיש, תומך, מחפש הרמוניה', bg: 'bg-green-900/40 border-green-500 text-green-100', hover: 'hover:bg-green-800' },
        { name: 'כחול', desc: 'אנליטי, מחושב, יורד לפרטים', bg: 'bg-blue-900/40 border-blue-500 text-blue-100', hover: 'hover:bg-blue-800' },
    ];

    const handleSimulate = async () => {
        if (!targetColor || !scenario.trim() || !userInput.trim() || isLoading) return;
        setIsLoading(true);
        setResponse('');

        try {
            const result = await getSimulationResponse(scores, targetColor, scenario, userInput);
            setResponse(result);
        } catch (err) {
            setResponse("שגיאה בחיבור לסימולטור.");
        } finally {
            setIsLoading(false);
        }
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
            return <div className="prose prose-invert max-w-none prose-p:text-gray-200" dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <div className="whitespace-pre-wrap">{text}</div>;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-500/20 p-2 rounded-xl">
                    <span className="text-3xl">🎭</span>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white">סימולטור מקרי בוחן</h3>
                    <p className="text-gray-400 text-sm font-medium">התאמן על תקשורת עם סגנונות שונים בזמן אמת</p>
                </div>
            </div>

            <div className="bg-gray-900/60 p-6 rounded-2xl border border-gray-700 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">1. בחר עם מי תרצה להתמודד (הקולגה):</label>
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
                    <label className="block text-sm font-bold text-gray-300 mb-2">2. הגדר את התרחיש (לדוגמה: בקשת העלאת שכר, מתן פידבק שלילי):</label>
                    <input
                        type="text"
                        value={scenario}
                        onChange={e => setScenario(e.target.value)}
                        className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-600 focus:border-purple-500 outline-none"
                        placeholder="נושא השיחה..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">3. מה המשפט הראשון שתגיד לו?</label>
                    <textarea
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-600 focus:border-purple-500 outline-none min-h-[80px]"
                        placeholder="היי, רציתי לדבר איתך על..."
                    />
                </div>

                <button
                    onClick={handleSimulate}
                    disabled={!targetColor || !scenario || !userInput || isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                >
                    {isLoading ? 'מעבד תגובה...' : 'הפעל סימולציה 🚀'}
                </button>

                {response && (
                    <div className="mt-6 p-6 bg-slate-800 border-2 border-purple-500/40 rounded-2xl animate-fade-in-up">
                        <h4 className="text-purple-400 font-bold mb-3">תגובת הסימולטור:</h4>
                        {renderMarkdownText(response)}
                    </div>
                )}
            </div>
        </div>
    );
};
