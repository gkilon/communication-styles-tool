import React, { useState, useMemo, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { PasswordScreen } from './components/PasswordScreen';
import { Scores } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';

type AppStep = 'intro' | 'questionnaire' | 'results';

const STORAGE_KEY = 'comm_style_app_state_v1';

interface SavedState {
  isAuthenticated: boolean;
  step: AppStep;
  currentQuestionIndex: number;
  answers: Record<string, number>;
}

const App: React.FC = () => {
  // Helper function to load state from LocalStorage
  const loadState = (): SavedState | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load state from local storage", e);
    }
    return null;
  };

  const savedData = loadState();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    savedData?.isAuthenticated ?? false
  );
  
  const [step, setStep] = useState<AppStep>(
    savedData?.step ?? 'intro'
  );
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(
    savedData?.currentQuestionIndex ?? 0
  );
  
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    if (savedData?.answers) {
      return savedData.answers;
    }
    const initialAnswers: Record<string, number> = {};
    QUESTION_PAIRS.forEach(q => {
      initialAnswers[q.id] = 4; // Default to a side, no middle option.
    });
    return initialAnswers;
  });

  // Effect to save state whenever it changes
  useEffect(() => {
    const stateToSave: SavedState = {
      isAuthenticated,
      step,
      currentQuestionIndex,
      answers
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [isAuthenticated, step, currentQuestionIndex, answers]);
  
  const scores = useMemo<Scores | null>(() => {
    if (step !== 'results') return null;

    const newScores: Scores = { a: 0, b: 0, c: 0, d: 0 };
    QUESTION_PAIRS.forEach(q => {
      const value = answers[q.id];
      const [col1, col2] = q.columns;
      
      const score1 = 6 - value; 
      const score2 = value - 1;
      
      newScores[col1] += score1;
      newScores[col2] += score2;
    });
    return newScores;
  }, [step, answers]);

  const handleStart = () => setStep('questionnaire');
  
  const handleSubmit = () => setStep('results');

  const handleReset = () => {
    // Clear local storage on reset
    localStorage.removeItem(STORAGE_KEY);
    
    const initialAnswers: Record<string, number> = {};
    QUESTION_PAIRS.forEach(q => {
      initialAnswers[q.id] = 4; // Default to a side, no middle option.
    });
    setAnswers(initialAnswers);
    setCurrentQuestionIndex(0);
    setStep('intro');
    // We keep isAuthenticated true so they don't have to re-enter password just to restart quiz
    // If you want to force re-login, uncomment the line below and set isAuthenticated to false in the state update
    // setIsAuthenticated(false); 
  };

  const handleEditAnswers = () => {
    setCurrentQuestionIndex(0);
    setStep('questionnaire');
  };
  
  const handleAuthenticate = (password: string): boolean => {
    if (password === 'inspire') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return <IntroScreen onStart={handleStart} />;
      case 'questionnaire':
        return <QuestionnaireScreen 
                  answers={answers} 
                  setAnswers={setAnswers} 
                  onSubmit={handleSubmit}
                  currentQuestionIndex={currentQuestionIndex}
                  setCurrentQuestionIndex={setCurrentQuestionIndex}
                />;
      case 'results':
        return scores ? <ResultsScreen scores={scores} onReset={handleReset} onEdit={handleEditAnswers} /> : null;
      default:
        return <IntroScreen onStart={handleStart} />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-400 tracking-wide">שאלון סגנונות תקשורת</h1>
          <p className="text-gray-400 mt-2 text-lg">גלה את פרופיל התקשורת שלך וקבל תובנות מבוססות AI</p>
        </header>
        <main>
          {isAuthenticated ? renderStep() : <PasswordScreen onAuthenticate={handleAuthenticate} />}
        </main>
      </div>
    </div>
  );
};

export default App;