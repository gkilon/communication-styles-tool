
import React, { useState, useMemo, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { AuthScreen } from './components/AuthScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { Scores } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';
import { auth, isFirebaseInitialized } from './firebaseConfig';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { saveUserResults, getUserProfile } from './services/firebaseService';

type AppStep = 'intro' | 'questionnaire' | 'results' | 'admin';

// --- Authenticated Mode Component (With Firebase) ---
const AuthenticatedApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initError, setInitError] = useState(false);

  const [step, setStep] = useState<AppStep>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    QUESTION_PAIRS.forEach(q => initial[q.id] = 4);
    return initial;
  });

  // Auth Listener
  useEffect(() => {
    // If config is completely missing, show error immediately
    if (!isFirebaseInitialized) {
        setInitError(true);
        setAuthLoading(false);
        return;
    }

    if (!auth) {
        setInitError(true);
        setAuthLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, 
        async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const profile = await getUserProfile(currentUser.uid);
                    // Check if user is admin based on DB role
                    setIsAdmin(profile?.role === 'admin');

                    if (profile?.scores) {
                        // Optional: Auto-redirect to results if already done
                        // setStep('results'); 
                    }
                } catch (e) {
                    console.error("Error fetching profile", e);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
                setStep('intro');
            }
            setAuthLoading(false);
        },
        (error) => {
            console.error("Auth Error:", error);
            setInitError(true);
            setAuthLoading(false);
        }
    );

    return () => unsubscribe();
  }, []);

  const scores = useMemo<Scores | null>(() => {
    const newScores: Scores = { a: 0, b: 0, c: 0, d: 0 };
    QUESTION_PAIRS.forEach(q => {
      const value = answers[q.id] ?? 4;
      const [col1, col2] = q.columns;
      newScores[col1] += (6 - value);
      newScores[col2] += (value - 1);
    });
    return newScores;
  }, [answers]);

  const handleStart = () => setStep('questionnaire');
  
  const handleSubmit = async () => {
    if (scores && user) {
        await saveUserResults(scores);
    }
    setStep('results');
  };

  const handleLogout = async () => {
      await signOut(auth);
      window.location.reload();
  };

  // Loading State
  if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      );
  }

  // Error State (Configuration Missing)
  if (initError) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
             <div className="bg-gray-800 p-8 rounded-lg max-w-md text-center shadow-2xl border border-gray-700">
                 <h2 className="text-2xl text-red-400 mb-4 font-bold">שגיאת חיבור למסד הנתונים</h2>
                 <p className="mb-6 text-gray-300">
                    לא הצלחנו להתחבר ל-Firebase. 
                    <br /><br />
                    אנא פתח את הקובץ <code>firebaseConfig.ts</code> וודא שהדבקת שם את מפתחות ההתחברות הנכונים (API Key וכו').
                 </p>
             </div>
          </div>
      );
  }

  // Login Screen
  if (!user) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col">
            <div className="max-w-md mx-auto w-full mt-10">
                <AuthScreen onLoginSuccess={() => {}} />
            </div>
        </div>
      );
  }

  // Main Authenticated UI
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8 font-sans">
       <div className="max-w-6xl mx-auto">
          <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-gray-800 pb-4">
            <div>
                <h1 className="text-2xl font-bold text-cyan-400">שאלון סגנונות תקשורת</h1>
                <p className="text-gray-400 text-sm">מחובר כ: {user.displayName || user.email}</p>
            </div>
            <div className="flex gap-3">
                {isAdmin && (
                    <button 
                        onClick={() => setStep(step === 'admin' ? 'intro' : 'admin')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                        {step === 'admin' ? 'חזרה לשאלון' : 'ניהול צוות'}
                    </button>
                )}
                <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                    התנתק
                </button>
            </div>
          </header>

          <main>
            {step === 'admin' ? (
                <AdminDashboard onBack={() => setStep('intro')} />
            ) : (
                <>
                    {step === 'intro' && <IntroScreen onStart={handleStart} />}
                    
                    {step === 'questionnaire' && (
                        <div className="max-w-3xl mx-auto">
                             <QuestionnaireScreen 
                                answers={answers} 
                                setAnswers={setAnswers} 
                                onSubmit={handleSubmit}
                                currentQuestionIndex={currentQuestionIndex}
                                setCurrentQuestionIndex={setCurrentQuestionIndex}
                            />
                        </div>
                    )}

                    {step === 'results' && scores && (
                        <ResultsScreen 
                            scores={scores} 
                            onReset={() => {
                                const resetAnswers: Record<string, number> = {};
                                QUESTION_PAIRS.forEach(q => resetAnswers[q.id] = 4);
                                setAnswers(resetAnswers);
                                setCurrentQuestionIndex(0);
                                setStep('intro');
                            }} 
                            onEdit={() => {
                                setCurrentQuestionIndex(0);
                                setStep('questionnaire');
                            }} 
                        />
                    )}
                </>
            )}
          </main>
       </div>
    </div>
  );
};

// --- Main App Entry Point ---
export const App: React.FC = () => {
  // Force Authenticated App
  return (
    <React.StrictMode>
        <AuthenticatedApp />
    </React.StrictMode>
  );
};
