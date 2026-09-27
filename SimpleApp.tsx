import React, { useState, useMemo, useEffect } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { PasswordScreen } from './components/PasswordScreen';
import { AuthGate } from './components/AuthGate';
import { BackgroundQuestionsScreen } from './components/BackgroundQuestionsScreen';
import { LanguageToggle } from './components/LanguageToggle';
import { Scores, BackgroundData, UserSession } from './types';
import { QUESTION_PAIRS } from './constants/questionnaireData';
import { isFirebaseInitialized, db } from './firebaseConfig';
import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { saveUserResults } from './services/firebaseService';
import { useLanguage } from './i18n/LanguageContext';
import { useT } from './i18n/useT';

interface SimpleAppProps {
  onAdminLoginAttempt: (email: string, pass: string) => Promise<void>;
  user?: any;
  isPreviewingAsAdmin?: boolean;
  onReturnToAdmin?: () => void;
}

const STORAGE_KEY_ANSWERS = 'comm_style_answers';
const STORAGE_KEY_STEP = 'comm_style_step';
const STORAGE_KEY_INDEX = 'comm_style_index';
const STORAGE_KEY_BG = 'comm_style_background';
const STORAGE_KEY_SESSION = 'comm_style_session';

const DEFAULT_BACKGROUND: BackgroundData = { gender: '', isManager: '', goal: '' };

const SimpleApp: React.FC<SimpleAppProps> = ({ onAdminLoginAttempt, user, isPreviewingAsAdmin, onReturnToAdmin }) => {
  const { dir } = useLanguage();
  const { t } = useT();

  // Session tracking (which code/team/org was entered — separate from "is there a
  // real Firebase account yet". A session can exist with no `user` in between the
  // code screen and the sign-up/sign-in screen.)
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SESSION);
    return saved ? JSON.parse(saved) : null;
  });

  // Persistence initialization for Progress
  const [step, setStep] = useState<'intro' | 'background' | 'questionnaire' | 'results'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STEP);
    // Guard: if saved step is 'background', reset to 'intro' to avoid getting stuck
    if (saved === 'background') return 'intro';
    return (saved as any) || 'intro';
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_INDEX);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ANSWERS);
    return saved ? JSON.parse(saved) : {};
  });

  const [backgroundData, setBackgroundData] = useState<BackgroundData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BG);
    return saved ? JSON.parse(saved) : DEFAULT_BACKGROUND;
  });

  // Save progress to localStorage whenever it changes (auth state itself lives in
  // Firebase now, not in localStorage — `user` coming from App.tsx is the source of truth)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(answers));
    // Don't persist 'background' step — always re-show from 'intro' on refresh
    if (step !== 'background') {
      localStorage.setItem(STORAGE_KEY_STEP, step);
    }
    localStorage.setItem(STORAGE_KEY_INDEX, currentQuestionIndex.toString());
    localStorage.setItem(STORAGE_KEY_BG, JSON.stringify(backgroundData));
    if (session) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    }
  }, [answers, step, currentQuestionIndex, backgroundData, session]);

  const scores = useMemo<Scores | null>(() => {
    if (step !== 'results') return null;

    const newScores: Scores = { a: 0, b: 0, c: 0, d: 0 };
    let totalQuestions = 0;

    QUESTION_PAIRS.forEach(q => {
      const val = answers[q.id];
      if (val !== undefined && val > 0) {
        const [col1, col2] = q.columns;
        newScores[col1] += (6 - val);
        newScores[col2] += (val - 1);
        totalQuestions++;
      }
    });

    if (totalQuestions === 0) return { a: 0, b: 0, c: 0, d: 0 };
    return newScores;
  }, [step, answers]);

  // Save to DB once the questionnaire is done — every participant now has a real
  // Firebase user (created in AuthGate), so this single path covers everyone.
  useEffect(() => {
    if (step === 'results' && scores && user) {
      saveUserResults(scores, backgroundData).catch(err => console.error("Firebase save error:", err));
    }
  }, [step, scores, user]);

  const handleAuthenticate = async (newSession: UserSession) => {
    // 1. Store the session (code/team info) right away so AuthGate has it
    setSession(newSession);

    // 2. Pull organizational context from Firebase and inject it into the session
    if (newSession.type === 'team' && newSession.teamName) {
      try {
        const q = query(collection(db, "teams"), where("name", "==", newSession.teamName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const teamDoc = querySnapshot.docs[0];
          const teamData = teamDoc.data();

          let updatedSession = { ...newSession };

          if (teamData.companyName) updatedSession.companyName = teamData.companyName;
          if (teamData.orgContext) updatedSession.orgContext = teamData.orgContext;
          if (teamData.knowledgeBase) updatedSession.knowledgeBase = teamData.knowledgeBase;
          if (teamData.logoUrl) updatedSession.logoUrl = teamData.logoUrl;

          // If the team belongs to a parent organization, pull its info too
          // (only for fields the team hasn't overridden itself)
          if (teamData.organizationId) {
            const orgDocRef = doc(db, "organizations", teamData.organizationId);
            const orgSnap = await getDoc(orgDocRef);
            if (orgSnap.exists()) {
              const orgData = orgSnap.data();
              if (!updatedSession.companyName && orgData.companyName) updatedSession.companyName = orgData.companyName;
              if (!updatedSession.orgContext && orgData.orgContext) updatedSession.orgContext = orgData.orgContext;
              if (!updatedSession.knowledgeBase && orgData.knowledgeBase) updatedSession.knowledgeBase = orgData.knowledgeBase;
              if (!updatedSession.logoUrl && orgData.logoUrl) updatedSession.logoUrl = orgData.logoUrl;
            }
          }

          setSession(updatedSession);
        }
      } catch (e) {
        console.error("Failed to load organizational context for team:", e);
      }
    }
  };

  // After intro, always show background questions first (if not returning to existing progress)
  const handleStart = () => {
    const hasAnswers = Object.keys(answers).length > 0;
    if (hasAnswers) {
      setStep('questionnaire');
    } else {
      setStep('background');
    }
  };

  const handleBackgroundComplete = (data: BackgroundData) => {
    setBackgroundData(data);
    setStep('questionnaire');
  };

  const handleSubmit = () => setStep('results');

  const handleReset = () => {
    if (!window.confirm(t('shell', 'resetConfirm'))) return;
    setAnswers({});
    setCurrentQuestionIndex(0);
    setBackgroundData(DEFAULT_BACKGROUND);
    setStep('intro');
    localStorage.removeItem(STORAGE_KEY_ANSWERS);
    localStorage.removeItem(STORAGE_KEY_STEP);
    localStorage.removeItem(STORAGE_KEY_INDEX);
    localStorage.removeItem(STORAGE_KEY_BG);
  };

  const handleEditAnswers = () => {
    setStep('questionnaire');
  };

  const handleLogout = () => {
    if (!window.confirm(t('shell', 'logoutConfirm'))) return;
    setSession(null);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    import('firebase/auth').then(({ signOut, getAuth }) => {
      const auth = getAuth();
      if (auth.currentUser) signOut(auth);
    });
  };

  // Gender-aware welcome text
  const isFemale = backgroundData.gender === 'female';
  const welcomeBackText = isFemale ? t('welcomeBack', 'titleFemale') : t('welcomeBack', 'titleMale');
  const continueText = isFemale ? t('welcomeBack', 'continueFemale') : t('welcomeBack', 'continueMale');
  const deleteText = isFemale ? t('welcomeBack', 'deleteFemale') : t('welcomeBack', 'deleteMale');

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-8 font-sans flex flex-col items-center overflow-y-auto pb-20" dir={dir}>
      <LanguageToggle />
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-10 relative">
          {/* Co-Branding Banner if present */}
          {session?.companyName && (
            <div className="flex flex-col items-center gap-3 mb-5">
              {session.logoUrl && (
                <img
                  src={session.logoUrl}
                  alt={session.companyName}
                  className="h-20 sm:h-24 max-w-[280px] object-contain drop-shadow-2xl"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="inline-flex items-center gap-3 bg-gray-800/90 border border-cyan-500/30 px-5 py-2 rounded-full shadow-lg">
                <span className="text-xs text-gray-400 font-semibold">{t('shell', 'workshopBadge')}</span>
                <span className="text-sm text-cyan-300 font-black">{session.companyName}</span>
              </div>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-cyan-400 tracking-wide drop-shadow-lg py-2">
             {t('shell', 'title')}
          </h1>
          <p className="text-gray-300 mt-1 text-lg font-light">{t('shell', 'subtitle')}</p>

          {!!user && (
            <div className="absolute top-0 left-0 flex items-center gap-2">
              <span className="text-[11px] text-gray-500 hidden sm:inline" dir="ltr">{user.email}</span>
              {isPreviewingAsAdmin && onReturnToAdmin && (
                <button
                  onClick={onReturnToAdmin}
                  className="text-xs text-cyan-300 hover:text-white border border-cyan-600/50 rounded px-3 py-1 bg-cyan-900/40 transition-colors font-bold"
                >
                  חזרה לניהול
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-3 py-1 bg-gray-800/50 transition-colors"
              >
                {t('common', 'logout')}
              </button>
            </div>
          )}
        </header>

        <main className="w-full flex justify-center">
          {!session ? (
            <PasswordScreen
              onAuthenticate={handleAuthenticate}
              onAdminLogin={onAdminLoginAttempt}
              hasDatabaseConnection={isFirebaseInitialized}
            />
          ) : !user ? (
            <AuthGate session={session} onDone={() => { /* onAuthStateChanged in App.tsx picks up the new user automatically */ }} />
          ) : (
            <div className="w-full">
              {step === 'intro' && (
                <div className="space-y-6">
                  {Object.keys(answers).length > 0 && (
                    <div className="max-w-md mx-auto bg-cyan-900/40 border border-cyan-500/50 p-6 rounded-2xl text-center mb-8 shadow-2xl animate-fade-in">
                      <h4 className="text-xl font-bold text-white mb-2">{welcomeBackText}</h4>
                      <p className="text-gray-300 mb-4 text-sm">{t('welcomeBack', 'body')}</p>
                      <div className="flex flex-col gap-3">
                        <button onClick={handleStart} className="w-full text-white bg-cyan-600 hover:bg-cyan-500 py-3 rounded-xl font-bold transition-all shadow-lg">{continueText}</button>
                        <button onClick={handleReset} className="w-full text-gray-400 border border-gray-700 hover:bg-gray-800 py-2 rounded-xl text-xs transition-all">{deleteText}</button>
                      </div>
                    </div>
                  )}
                  <IntroScreen onStart={handleStart} />
                </div>
              )}
              {step === 'background' && (
                <div className="w-full flex justify-center">
                  <BackgroundQuestionsScreen
                    data={backgroundData}
                    onChange={setBackgroundData}
                    onSubmit={() => handleBackgroundComplete(backgroundData)}
                  />
                </div>
              )}
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
                  backgroundData={backgroundData}
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
