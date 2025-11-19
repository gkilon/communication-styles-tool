
import React, { useState, useMemo, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { PasswordScreen } from './components/PasswordScreen';
import { Scores, UserProfile } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';
import { saveUserResults } from './services/firebaseService';
import { isFirebaseInitialized } from './firebaseConfig';

interface SimpleAppProps {
  isTeamMode: boolean;
  userProfile?: UserProfile;
  onSwitchToTeamLogin?: () => void;
  onSignOut?: () => void;
}

export const SimpleApp: React.FC<SimpleAppProps> = ({ 
  isTeamMode, 
  userProfile, 
  onSwitchToTeamLogin, 
  onSignOut 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(isTeamMode);
  const [step, setStep] = useState<'intro' | 'questionnaire' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Reset state when switching modes
  useEffect(() => {
    setIsAuthenticated(isTeamMode);
    setStep('intro');
    setAnswers({});
    setCurrentQuestionIndex(0);
  }, [isTeamMode]);

  // Initialize default answers
  useEffect(() => {
     const defaultAnswers: Record<string, number> = {};
     QUESTION_PAIRS.forEach(q => {
       defaultAnswers[q.id] = 4;
     });
     setAnswers(defaultAnswers);
  }, []);
  
  const scores = useMemo<Scores | null>(() => {
    if (step !== 'results') return null;

    const newScores: Scores = { a: 0, b: 0, c: 0, d: 0 };
    QUESTION_PAIRS.forEach(q => {
      const value = answers[q.id] ?? 4;
      const [col1, col2] = q.columns;
      
      const score1 = 6 - value; 
      const score2 = value - 1;
      
      newScores[col1] += score1;
      newScores[col2] += score2;
    });
    return newScores;
  }, [step, answers]);

  const handleAuthenticate = (password: string) => {
    if (password.toLowerCase() === 'inspire') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleStart = () => setStep('questionnaire');
  
  const handleSubmit = async () => {
    setStep('results');
    
    // Save to Firebase if in Team Mode
    if (isTeamMode && scores && isFirebaseInitialized) {
      try {
        await saveUserResults(scores);
      } catch (e) {
        console.error("Failed to save results automatically", e);
      }
    }
  };

  const handleReset = () => {
    const resetAnswers: Record<string, number> = {};
    QUESTION_PAIRS.forEach(q => {
      resetAnswers[q.id] = 4; 
    });
    setAnswers(resetAnswers);
    setCurrentQuestionIndex(0);
    setStep('intro');
  };

  const handleEditAnswers = () => {
    setCurrentQuestionIndex(0);
    setStep('questionnaire');
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 relative">
          <div className="flex justify-center items-center relative">
             <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-400 tracking-wide">שאלון סגנונות תקשורת</h1>
          </div>
          <p className="text-gray-400 mt-2 text-lg">גלה את פרופיל התקשורת שלך וקבל תובנות מבוססות AI</p>
          
          {isTeamMode && userProfile && (
            <div className="mt-4 bg-cyan-900/30 inline-block px-4 py-1 rounded-full border border-cyan-700/50">
                <span className="text-cyan-300 text-sm ml-2">מחובר כ: {userProfile.displayName}</span>
                <span className="text-gray-400 text-sm">| צוות: {userProfile.team}</span>
            </div>
          )}
          
          {isTeamMode && onSignOut && (
            <button 
              onClick={onSignOut}
              className="absolute top-0 left-0 text-xs sm:text-sm text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1 transition-all"
            >
              יציאה
            </button>
          )}
        </header>

        <main>
            {!isAuthenticated ? (
                <PasswordScreen 
                  onAuthenticate={handleAuthenticate} 
                  onSwitchToTeamLogin={onSwitchToTeamLogin}
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
                        <ResultsScreen scores={scores} onReset={handleReset} onEdit={handleEditAnswers} />
                    )}
                </>
            )}
        </main>
      </div>
    </div>
  );
};
