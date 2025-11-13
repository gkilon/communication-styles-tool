import React, { useState, useMemo } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { PasswordScreen } from './components/PasswordScreen';
import { Scores } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';

type AppStep = 'intro' | 'questionnaire' | 'results';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [step, setStep] = useState<AppStep>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const initialAnswers: Record<string, number> = {};
    QUESTION_PAIRS.forEach(q => {
      initialAnswers[q.id] = 3.5; // Start in the middle
    });
    return initialAnswers;
  });
  
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
     const initialAnswers: Record<string, number> = {};
    QUESTION_PAIRS.forEach(q => {
      initialAnswers[q.id] = 3.5; // Start in the middle
    });
    setAnswers(initialAnswers);
    setCurrentQuestionIndex(0);
    setStep('intro');
  };

  const handleEditAnswers = () => {
    setCurrentQuestionIndex(0);
    setStep('questionnaire');
  };
  
  const handleAuthenticate = (password: string): boolean => {
    if (password === 'Admin2024') {
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