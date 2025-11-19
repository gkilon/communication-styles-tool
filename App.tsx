
import React, { useState, useMemo, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { AuthScreen } from './components/AuthScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { PasswordScreen } from './components/PasswordScreen';
import { Scores } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';
import { auth, isFirebaseInitialized } from './firebaseConfig';
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

  const switchToTeamMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'team');
    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-6 md:p-8 font-sans flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-grow">
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
      
      <footer className="mt-12 text-center text-sm text-gray-600 border-t border-gray-800 pt-6 pb-4">
        <p className="mb-2">גרסה אישית</p>
        <button 
            onClick={switchToTeamMode} 
            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-400 hover:text-white px-3 py-1.5 rounded transition-all"
        >
           כניסה למנהלים / גרסת ארגון (עבור ל-?mode=team)
        </button>
      </footer>
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
  const [forceSimpleMode, setForceSimpleMode] = useState(false);

  const [step, setStep] = useState<AppStep>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    let unsubscribe = () => {};
    
    try {
        if (!isFirebaseInitialized) {
            throw new Error("Firebase initialization failed or keys are missing.");
        }

        if (!auth) {
            throw new Error("Auth object is not initialized");
        }
        
        if (typeof onAuthStateChanged !== 'function') {
            throw new Error("Firebase Auth functions are not available");
        }

        unsubscribe = onAuthStateChanged(auth, 
            async (currentUser) => {
                setUser(currentUser);
                if (currentUser) {
                    // Temporary check: allow all logged in users to see admin panel for setup
                    // In production, you would check a specific claim or email list
                    setIsAdmin(true); 
                } else {
                    setIsAdmin(false);
                }
                setAuthLoading(false);
            },
            (error) => {
                console.error("Firebase Auth Error:", error);
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

  const switchToPersonalMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    window.location.href = url.toString();
  };

  if (forceSimpleMode) {
      return <SimpleApp />;
  }

  if (initError) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center text-white p-6 font-sans" dir="rtl">
              <div className="bg-gray-800 p-8 rounded-lg shadow-2xl border border-red-500 max-w-lg text-center">
                  <h2 className="text-3xl font-bold text-red-500 mb-4">נדרשת הגדרת מערכת</h2>
                  <p className="text-lg mb-4">
                      המערכת מוגדרת למצב "מלא" (Login & Database), אך החיבור ל-Firebase נכשל.
                  </p>
                  <div className="bg-gray-900 p-4 rounded text-left text-sm text-gray-300 mb-6 font-mono ltr-text overflow-x-auto">
                      <p className="mb-2 border-b border-gray-700 pb-1">Status:</p>
                      Firebase Init Failed.<br/>
                      Please check VITE_FIREBASE_API_KEY in Netlify settings.
                  </div>
                  <p className="text-gray-400 mb-6 text-sm">
                      בינתיים, ניתן להשתמש במערכת במצב אישי.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button 
                        onClick={() => setForceSimpleMode(true)}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full transition-colors border border-gray-500"
                    >
                        הפעל במצב אישי
                    </button>
                     <button 
                        onClick={switchToPersonalMode}
                        className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-full transition-colors"
                    >
                        חזור לכתובת הרגילה
                    </button>
                  </div>
              </div>
          </div>
      );
  }

  if (authLoading) {
      return <div className="min-h-screen flex items-center justify-center text-white">טוען נתוני משתמש...</div>;
  }

  if (step === 'admin') {
      return <AdminDashboard onBack={() => setStep('intro')} />;
  }

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-6 md:p-8 font-sans flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-grow">
        <header className="text-center mb-8 relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-400 tracking-wide">שאלון סגנונות תקשורת</h1>
          <p className="text-gray-400 mt-2 text-lg">גלה את פרופיל התקשורת שלך וקבל תובנות מבוססות AI</p>
          <p className="text-cyan-600 text-sm font-bold mt-1 bg-cyan-900/20 inline-block px-3 py-1 rounded-full border border-cyan-900/50">גרסת ארגון</p>
          
          {user && (
             <div className="absolute top-0 left-0 flex gap-2 text-sm items-center z-20">
                 <button onClick={handleLogout} className="text-gray-400 hover:text-white underline">התנתק</button>
                 {isAdmin && (
                     <button onClick={() => setStep('admin')} className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 border border-yellow-500/50 px-3 py-1.5 rounded-md transition-all font-bold ml-2 text-sm shadow-sm">
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
       <footer className="mt-12 text-center text-xs text-gray-600 border-t border-gray-800 pt-4">
        <p>גרסת ארגון | <button onClick={switchToPersonalMode} className="text-gray-500 hover:text-cyan-400 underline ml-1">
           יציאה לגרסה האישית (הסר mode=team)
        </button></p>
      </footer>
    </div>
  );
};

// Main App Component
export const App: React.FC = () => {
  return USE_FIREBASE_MODE ? <AuthenticatedApp /> : <SimpleApp />;
};
