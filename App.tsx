
import React, { useState, useMemo, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { AuthScreen } from './components/AuthScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { PasswordScreen } from './components/PasswordScreen';
import { Scores } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { saveUserResults, getUserProfile } from './services/firebaseService';
import { USE_FIREBASE_MODE } from './config';

type AppStep = 'intro' | 'questionnaire' | 'results' | 'admin';

// גרסה פשוטה של האפליקציה (ללא Firebase), מוטמעת כאן למניעת בעיות ייבוא
const SimpleApp: React.FC = () => {
  // State with Robust LocalStorage initialization
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem('cs_auth') === 'true';
    } catch {
      return false;
    }
  });
  
  const [step, setStep] = useState<'intro' | 'questionnaire' | 'results'>(() => {
    try {
      const saved = localStorage.getItem('cs_step');
      return (saved as 'intro' | 'questionnaire' | 'results') || 'intro';
    } catch {
      return 'intro';
    }
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cs_index');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    let initialAnswers: Record<string, number> = {};
    
    // Try to load from storage safely
    try {
      const saved = localStorage.getItem('cs_answers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          initialAnswers = parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse answers from storage", e);
    }

    // Ensure all questions have a default value (4) if missing
    // This prevents "controlled input" warnings and UI glitches
    const mergedAnswers = { ...initialAnswers };
    QUESTION_PAIRS.forEach(q => {
      if (typeof mergedAnswers[q.id] !== 'number') {
        mergedAnswers[q.id] = 4;
      }
    });
    
    return mergedAnswers;
  });

  // Persistence Effects - Safe writes
  useEffect(() => {
    try {
      localStorage.setItem('cs_auth', isAuthenticated.toString());
    } catch (e) { console.error("LocalStorage write error", e); }
  }, [isAuthenticated]);

  useEffect(() => {
    try {
      localStorage.setItem('cs_step', step);
    } catch (e) { console.error("LocalStorage write error", e); }
  }, [step]);

  useEffect(() => {
    try {
      localStorage.setItem('cs_index', currentQuestionIndex.toString());
    } catch (e) { console.error("LocalStorage write error", e); }
  }, [currentQuestionIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('cs_answers', JSON.stringify(answers));
    } catch (e) { console.error("LocalStorage write error", e); }
  }, [answers]);
  
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
  };

  const handleReset = () => {
    // Clear LocalStorage safely
    try {
      localStorage.removeItem('cs_step');
      localStorage.removeItem('cs_index');
      localStorage.removeItem('cs_answers');
    } catch (e) { console.error("LocalStorage clear error", e); }

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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-400 tracking-wide">שאלון סגנונות תקשורת</h1>
          <p className="text-gray-400 mt-2 text-lg">גלה את פרופיל התקשורת שלך וקבל תובנות מבוססות AI</p>
        </header>

        <main>
            {!isAuthenticated ? (
                <PasswordScreen onAuthenticate={handleAuthenticate} />
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

// This component contains the complex logic with Authentication and Firebase
const AuthenticatedApp: React.FC = () => {
  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initError, setInitError] = useState(false);

  const [step, setStep] = useState<AppStep>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Listen to Firebase Auth State
  useEffect(() => {
    let unsubscribe = () => {};
    
    try {
        if (!auth) {
            throw new Error("Auth object is null");
        }

        unsubscribe = onAuthStateChanged(auth, 
            async (currentUser) => {
                setUser(currentUser);
                if (currentUser) {
                    const emailIsAdmin = currentUser.email?.toLowerCase().includes('admin');
                    
                    getUserProfile(currentUser.uid).then(profile => {
                        if (emailIsAdmin || profile?.role === 'admin') {
                            setIsAdmin(true);
                        } else {
                            setIsAdmin(false);
                        }
                    }).catch(() => {
                        setIsAdmin(!!emailIsAdmin);
                    });
                } else {
                    setIsAdmin(false);
                }
                setAuthLoading(false);
            },
            (error) => {
                console.error("Firebase Auth Error (falling back to simple mode):", error);
                setInitError(true);
                setAuthLoading(false);
            }
        );
    } catch (e) {
        console.error("Failed to initialize auth listener:", e);
        setInitError(true);
        setAuthLoading(false);
    }

    return () => unsubscribe();
  }, []);

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

  const handleStart = () => setStep('questionnaire');
  
  const handleSubmit = async () => {
    setStep('results');
    // Save to Firebase
    if (user) {
        const calculatedScores = { a: 0, b: 0, c: 0, d: 0 };
        QUESTION_PAIRS.forEach(q => {
          const value = answers[q.id] ?? 4;
          const [col1, col2] = q.columns;
          calculatedScores[col1] += (6 - value);
          calculatedScores[col2] += (value - 1);
        });
        
        try {
            await saveUserResults(calculatedScores);
        } catch (e) {
            console.error("Failed to save results to cloud", e);
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
  
  const handleLogout = () => {
      signOut(auth);
      handleReset();
  };

  if (initError) {
      return <SimpleApp />;
  }

  if (authLoading) {
      return <div className="min-h-screen flex items-center justify-center text-white">טוען מערכת...</div>;
  }

  if (step === 'admin') {
      return <AdminDashboard onBack={() => setStep('intro')} />;
  }

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-400 tracking-wide">שאלון סגנונות תקשורת</h1>
          <p className="text-gray-400 mt-2 text-lg">גלה את פרופיל התקשורת שלך וקבל תובנות מבוססות AI</p>
          
          {user && (
             <div className="absolute top-0 left-0 flex gap-2 text-sm items-center">
                 <button onClick={handleLogout} className="text-gray-400 hover:text-white underline">התנתק</button>
                 {isAdmin && (
                     <button onClick={() => setStep('admin')} className="text-yellow-400 hover:text-yellow-300 font-bold ml-2 border border-yellow-500 px-3 py-1 rounded transition-colors">
                         לוח מנהל
                     </button>
                 )}
             </div>
          )}
        </header>

        <main>
          {!user ? (
              <AuthScreen onLoginSuccess={() => setStep('intro')} />
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

// Main App Component
const App: React.FC = () => {
  return USE_FIREBASE_MODE ? <AuthenticatedApp /> : <SimpleApp />;
};

export default App;
