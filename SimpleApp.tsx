
import React, { useState, useMemo, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { PasswordScreen } from './components/PasswordScreen';
import AuthScreen from './components/AuthScreen';
import { Scores } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';
import { isFirebaseInitialized } from './firebaseConfig';
import { saveUserResults } from './services/firebaseService';

interface SimpleAppProps {
  onAdminLoginAttempt: (email: string, pass: string) => Promise<void>;
  user?: any;
}

const SimpleApp: React.FC<SimpleAppProps> = ({ onAdminLoginAttempt, user }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showTeamAuth, setShowTeamAuth] = useState(false);
  const [step, setStep] = useState<'intro' | 'questionnaire' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
        setIsAuthenticated(true);
        setShowTeamAuth(false);
    }
  }, [user]);

  const scores = useMemo<Scores | null>(() => {
    if (step !== 'results') return null;
    
    const newScores: Scores = { a: 0, b: 0, c: 0, d: 0 };
    let totalQuestions = 0;

    QUESTION_PAIRS.forEach(q => {
      const val = answers[q.id];
      if (val !== undefined && val > 0) {
        const [col1, col2] = q.columns;
        // Total points available per question is 5.
        // Scale 1-6 mapping to points:
        // 1 -> 5:0
        // 2 -> 4:1
        // 3 -> 3:2
        // 4 -> 2:3
        // 5 -> 1:4
        // 6 -> 0:5
        newScores[col1] += (6 - val); 
        newScores[col2] += (val - 1);
        totalQuestions++;
      }
    });

    // If no data, provide a completely neutral starting point
    if (totalQuestions === 0) return { a: 0, b: 0, c: 0, d: 0 };
    
    return newScores;
  }, [step, answers]);

  useEffect(() => {
    if (step === 'results' && scores && user) {
        saveUserResults(scores).catch(err => console.error("Firebase save error:", err));
    }
  }, [step, scores, user]);

  const handleSimpleAuthenticate = (password: string) => {
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
    setCurrentQuestionIndex(0);
    setStep('intro');
  };

  const handleEditAnswers = () => {
    setStep('questionnaire');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    handleReset();
    import('firebase/auth').then(({ signOut, getAuth }) => {
        const auth = getAuth();
        if (auth.currentUser) signOut(auth);
    });
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-8 font-sans dir-rtl flex flex-col items-center">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-12 relative">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-cyan-400 tracking-wide drop-shadow-lg py-4">
             שאלון סגנונות תקשורת
          </h1>
          <p className="text-gray-300 mt-2 text-xl font-light">גלה את פרופיל התקשורת שלך וקבל תובנות מבוססות AI</p>
          
          {isAuthenticated && (
            <div className="absolute top-0 left-0 flex flex-col items-end">
                <button 
                  onClick={handleLogout} 
                  className="text-sm text-gray-400 hover:text-white border border-gray-600 rounded px-4 py-2 bg-gray-800/50 transition-colors"
                >
                  יציאה
                </button>
            </div>
          )}
        </header>

        <main className="w-full flex justify-center">
            {!isAuthenticated ? (
                showTeamAuth ? (
                    <AuthScreen onLoginSuccess={() => {}} onBack={() => setShowTeamAuth(false)} />
                ) : (
                    <PasswordScreen 
                        onAuthenticate={handleSimpleAuthenticate} 
                        onAdminLogin={onAdminLoginAttempt}
                        onTeamLoginClick={() => setShowTeamAuth(true)}
                        hasDatabaseConnection={isFirebaseInitialized}
                    />
                )
            ) : (
                <div className="w-full">
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
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default SimpleApp;
