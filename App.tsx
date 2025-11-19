
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { SimpleApp } from './SimpleApp';
import { AuthScreen } from './components/AuthScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { auth, isFirebaseInitialized } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserProfile } from './services/firebaseService';
import { UserProfile } from './types';

type AppView = 'simple' | 'auth' | 'admin' | 'team_app' | 'loading';

// Error Boundary Component to catch crashes (White Screen of Death)
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center dir-rtl">
          <h1 className="text-3xl font-bold text-red-500 mb-4">שגיאה בטעינת האפליקציה</h1>
          <p className="mb-4 text-lg">נתקלנו בבעיה לא צפויה. אנא נסו לרענן את העמוד.</p>
          
          <div className="bg-black/50 p-4 rounded-lg text-left text-sm font-mono text-red-300 mb-6 w-full max-w-lg overflow-auto dir-ltr">
             {this.state.error?.toString() || "Unknown Error"}
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-full transition-all"
          >
            רענן עמוד (Reload)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('simple');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
     // If Firebase isn't configured or auth is invalid, skip auth check
     if (!isFirebaseInitialized || !auth) {
         setIsAuthChecking(false);
         return;
     }
     
     try {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const profile = await getUserProfile(currentUser.uid);
                    setUserProfile(profile);
                    if (profile?.role === 'admin') {
                        setView('admin');
                    } else {
                        setView('team_app');
                    }
                } catch (e) {
                    console.error("Error fetching user profile", e);
                    // Fallback to team app if profile fetch fails but auth works
                    setView('team_app');
                }
            } else {
                setUserProfile(null);
                // We remain in whatever view we were, or let user manually navigate
                // Logic: If we were in team_app/admin and logged out, we usually want to go to simple or auth.
                // But here we let the explicit SignOut handler manage view state to 'simple'.
            }
            setIsAuthChecking(false);
        });
        
        return () => unsubscribe();
     } catch (error) {
        console.error("Auth listener setup failed:", error);
        setIsAuthChecking(false);
     }
  }, []);

  const handleSwitchToTeamLogin = () => {
    if (!isFirebaseInitialized) {
      alert("מערכת ניהול הצוותים אינה זמינה כרגע (בעיית חיבור ל-Firebase).");
      return;
    }
    setView('auth');
  };

  const handleBackToSimple = () => {
    setView('simple');
  };

  const handleSignOut = async () => {
    if (isFirebaseInitialized && auth) {
      await signOut(auth);
      setUserProfile(null);
      setView('simple');
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'simple':
        return (
          <SimpleApp 
            isTeamMode={false} 
            onSwitchToTeamLogin={handleSwitchToTeamLogin} 
          />
        );
      case 'auth':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4 animate-fade-in-up">
            <button 
              onClick={handleBackToSimple}
              className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <span>← חזרה לשאלון אישי</span>
            </button>
            <AuthScreen onLoginSuccess={() => { /* View updated by auth listener */ }} />
          </div>
        );
      case 'admin':
        return (
          <AdminDashboard onBack={handleSignOut} />
        );
      case 'team_app':
        return (
          <SimpleApp 
            isTeamMode={true} 
            userProfile={userProfile || undefined}
            onSignOut={handleSignOut}
          />
        );
      case 'loading':
        return <div className="text-white text-center mt-20">טוען...</div>;
      default:
        return <div className="text-white text-center">Error: Unknown state</div>;
    }
  };

  return (
    <ErrorBoundary>
       {renderContent()}
    </ErrorBoundary>
  );
};
