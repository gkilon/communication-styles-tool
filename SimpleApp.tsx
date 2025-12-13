
import React, { useState, useMemo, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { PasswordScreen } from './components/PasswordScreen';
import { AuthScreen } from './components/AuthScreen';
import { Scores } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';
import { isFirebaseInitialized } from './firebaseConfig';
import { saveUserResults } from './services/firebaseService';

interface SimpleAppProps {
  onAdminLoginAttempt: (email: string, pass: string) => Promise<void>;
  user?: any;
}

const SimpleApp: React.FC<SimpleAppProps> = ({ onAdminLoginAttempt, user }) => {
  // Authentication States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showTeamAuth, setShowTeamAuth] = useState(false);
  
  // App Flow States
  const [step, setStep] = useState<'intro' | 'questionnaire' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  
  // NOTE: Initialized as empty object to ensure user physically selects an answer
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Effect: If user is passed from parent (Firebase Auth), auto-authenticate
  useEffect(() => {
    if (user) {
        setIsAuthenticated(true);
        setShowTeamAuth(false); // Hide login screen if user just logged in
    } else {
        setIsAuthenticated(false);
    }
  }, [user]);

  // Removed the useEffect that auto-populated default answers.
  
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

  // Effect: Save results to Firebase if user is logged in and finished
  useEffect(() => {
    if (step === 'results' && scores && user) {
        saveUserResults(scores)
            .then(() => console.log("✅ Results saved to Firebase for user:", user.email))
            .catch(err => console.error("❌ Failed to save results:", err));
    }
  }, [step, scores, user]);

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
    // If using Firebase, we should sign out (App.tsx handles the actual auth state via listener)
    import('firebase/auth').then(({ signOut, getAuth }) => {
        const auth = getAuth();
        if (auth.currentUser) signOut(auth);
    });
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-8 font-sans dir-rtl flex flex-col items-center">
      {/* Increased max-width for larger desktop feel */}
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-12 relative">
          <div className="flex justify-center items-center relative py-4">
             {/* Increased header size */}
             <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-cyan-400 tracking-wide drop-shadow-lg">
                שאלון סגנונות תקשורת
             </h1>
          </div>
          <p className="text-gray-300 mt-2 text-xl sm:text-2xl font-light">גלה את פרופיל התקשורת שלך וקבל תובנות מבוססות AI</p>
          
          {isAuthenticated && (
            <div className="absolute top-0 left-0 flex flex-col items-end">
                {user && <span className="text-sm text-gray-400 mb-1 font-medium">{user.displayName || user.email}</span>}
                <button 
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded px-4 py-2 transition-all bg-gray-800/50"
                >
                יציאה
                </button>
            </div>
          )}
        </header>

        <main className="w-full flex justify-center">
            {!isAuthenticated ? (
                showTeamAuth ? (
                    <AuthScreen 
                        onLoginSuccess={() => { /* Handled by App.tsx listener */ }}
                        onBack={() => setShowTeamAuth(false)}
                    />
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
