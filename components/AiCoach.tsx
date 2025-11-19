
import React, { useState } from 'react';
import { Scores } from '../types';
import { getAiCoachAdvice } from '../services/geminiService';
import { SparklesIcon } from './icons/Icons';

interface AiCoachProps {
  scores: Scores;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const PRESET_QUESTIONS = [
  "איך אוכל לשפר את עבודת הצוות שלי?",
  "מה הדרך הטובה ביותר עבורי להשפיע על אחרים?",
  "תן לי טיפ להתמודדות עם קונפליקטים.",
  "כיצד אוכל למנף את החוזקות שלי כדי להתקדם בקריירה?"
];

const AiMessageContent: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  let htmlContent = '';
  const marked = (window as any).marked;

  try {
    // Check if marked is available and is a function
    if (marked && typeof marked.parse === 'function') {
        const result = marked.parse(text);
        // Ensure we got a string back (some versions might return a Promise if async is enabled)
        if (typeof result === 'string') {
            htmlContent = result;
        } else {
            // Fallback for Promise/unexpected return
            htmlContent = text.replace(/\n/g, '<br />');
        }
    } else if (marked && typeof marked === 'function') {
        // Older marked versions
        const result = marked(text);
        if (typeof result === 'string') {
             htmlContent = result;
        } else {
             htmlContent = text.replace(/\n/g, '<br />');
        }
    } else {
        // Marked not loaded
        htmlContent = text.replace(/\n/g, '<br />');
    }
  } catch (error) {
    console.warn("Error parsing AI coach markdown:", error);
    htmlContent = text.replace(/\n/g, '<br />');
  }

  return (
    <div
      className="prose prose-invert max-w-none prose-p:text-gray-200 prose-ul:text-gray-200 prose-li:text-gray-200"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};


export const AiCoach: React.FC<AiCoachProps> = ({ scores }) => {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || userInput;
    if (!text.trim() || isLoading) return;

    const newUserMessage: Message = { sender: 'user', text };
    setConversation(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const aiResponse = await getAiCoachAdvice(scores, text);
      // Ensure we always have a string, even if the service returns null/undefined somehow
      const safeResponse = aiResponse || "מצטער, התקבלה תשובה ריקה. אנא נסה שוב.";
      const newAiMessage: Message = { sender: 'ai', text: safeResponse };
      setConversation(prev => [...prev, newAiMessage]);
    } catch (error) {
      console.error("Component error:", error);
      const errorMessage: Message = { sender: 'ai', text: 'מצטער, התרחשה שגיאה בתקשורת. אנא נסה שוב.' };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold text-cyan-300 mb-4 flex items-center">
        <SparklesIcon className="w-8 h-8 ml-3 text-yellow-400" />
        מאמן ה-AI האישי שלך
      </h3>
      <p className="text-gray-400 mb-4">שאל שאלות וקבל ייעוץ מותאם אישית לפרופיל התקשורת שלך.</p>
      
      <div className="bg-gray-900 p-4 rounded-lg h-80 overflow-y-auto mb-4 border border-gray-700">
        {conversation.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>התחל שיחה או בחר שאלה מוכנה.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 w-full">
              {PRESET_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => handleSendMessage(q)} className="text-sm bg-gray-700 hover:bg-gray-600 p-2 rounded-md transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {conversation.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xl p-3 rounded-lg ${msg.sender === 'user' ? 'bg-cyan-800 text-white' : 'bg-gray-700 text-gray-200'}`}
              >
                {msg.sender === 'ai' ? (
                   <AiMessageContent text={msg.text} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
           {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-200 p-3 rounded-lg">
                <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-2 space-x-reverse">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="כתוב את שאלתך כאן..."
          className="flex-grow bg-gray-700 border border-gray-600 rounded-full py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={isLoading}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !userInput.trim()}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-full transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? 'חושב...' : 'שלח'}
        </button>
      </div>
    </div>
  );
};
