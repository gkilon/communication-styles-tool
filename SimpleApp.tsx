
import React, { useState, useMemo, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { PasswordScreen } from './components/PasswordScreen';
import { Scores } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';

interface SimpleAppProps {
  onAdminLoginAttempt: (email: string, pass: string) => Promise<void>;
  user?: any;
}

const SimpleApp: React.FC<SimpleAppProps> = ({ onAdminLoginAttempt, user }) => {
  // State for "Shared Password" authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [step, setStep] = useState<'intro' | 'questionnaire' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // If firebase user is already logged in (e.g. Admin who clicked "Back"), allow access?
  // For simplicity, let's keep the password requirement unless we want to skip it.
  // For now: Strict simple mode -> always ask for password unless locally authenticated.

  useEffect(() => {
     const defaultAnswers: Record<string, number> = {};
     if (QUESTION_PAIRS) {
         QUESTION_PAIRS.forEach(q => { defaultAnswers[q.id] = 4; });
         setAnswers(prev => Object.keys(prev).length === 0 ? defaultAnswers : prev);
     }
  }, []);
  
  const scores = useMemo<Scores | null>(() => {
    if (step !== 'results') return null;
    const newScores: Scores = { a: 0, b: 0, c: 0, d: 0 };
    QUESTION_PAIRS.forEach(q => {
      const value = answers[q.id] ?? 4;
      const [col1, col2] = q.columns;
      newScores[col1] += (6 - value); 
      newScores[col2] += (value - 1);
    });
    return newScores;
  }, [step, answers]);

  const handleSimpleAuthenticate = (password: string) => {
    // The Simple Password
    if (password.toLowerCase() === 'inspire') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleStart = () => setStep('questionnaire');
  const handleSubmit = () => setStep('results');
  
  const handleReset = () => {
    setAnswers({});
    const defaultAnswers: Record<string, number> = {};
    QUESTION_PAIRS.forEach(q => { defaultAnswers[q.id] = 4; });
    setAnswers(defaultAnswers);
    setCurrentQuestionIndex(0);
    setStep('intro');
  };

  const handleEditAnswers = () => {
    setCurrentQuestionIndex(0);
    setStep('questionnaire');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    handleReset();
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-6 md:p-8 font-sans dir-rtl">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 relative">
          <div className="flex justify-center items-center relative">
             <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-400 tracking-wide">שאלון סגנונות תקשורת</h1>
          </div>
          <p className="text-gray-400 mt-2 text-lg">גלה את פרופיל התקשורת שלך וקבל תובנות מבוססות AI</p>
          
          {isAuthenticated && (
            <button 
              onClick={handleLogout}
              className="absolute top-0 left-0 text-xs sm:text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1 transition-all"
            >
              יציאה
            </button>
          )}
        </header>

        <main>
            {!isAuthenticated ? (
                <PasswordScreen 
                  onAuthenticate={handleSimpleAuthenticate} 
                  onAdminLogin={onAdminLoginAttempt}
                />
            ) : (
                <>
                    {step === 'intro' && <IntroScreen onStart={handleStart} />}
                    {step === 'questionnaire' && (
                        <QuestionnaireScreen 
                            answers={answers} 
                            setAnswers={setAnswers} 
                            onSubmit={handleSubmit}
                            currentQuestionIndex={currentQuestionIndex}
                            setCurrentQuestionIndex={setCurrentQuestionIndex}
                        />
                    )}
                    {step === 'results' && scores && (
                        <ResultsScreen 
                          scores={scores} 
                          onReset={handleReset} 
                          onEdit={handleEditAnswers}
                          onLogout={handleLogout}
                        />
                    )}
                </>
            )}
        </main>
      </div>
    </div>
  );
};

export default SimpleApp;
