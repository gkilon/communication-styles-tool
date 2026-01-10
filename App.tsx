
import React, { useState, useEffect, ReactNode, ErrorInfo, Component } from 'react';
import SimpleApp from './SimpleApp';
import { AdminDashboard } from './components/AdminDashboard';
import { auth, isFirebaseInitialized } from './firebaseConfig';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getUserProfile } from './services/firebaseService';

type AppView = 'simple' | 'admin' | 'loading';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Fix: Ensure Component generic types are passed so 'this.props' is correctly typed
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Component Crash:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    // Fix for line 35: Accessing children from this.props now works with correct generics
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center" dir="rtl">
          <div className="bg-gray-800 p-8 rounded-2xl border-2 border-red-500 shadow-2xl max-w-md">
              <h1 className="text-3xl font-bold text-red-500 mb-4">אופס! משהו השתבש</h1>
              <p className="text-gray-300 mb-6">חלה שגיאה בטעינת האפליקציה. ייתכן שקובץ חסר או פגום.</p>
              <pre className="bg-black/50 p-4 rounded text-xs text-red-300 overflow-auto mb-6 text-left" dir="ltr">
                  {error?.message}
              </pre>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-3 rounded-full transition-all"
              >
                נסה לטעון מחדש
              </button>
          </div>
        </div>
      );
    }
    return children;
  }
}

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('loading');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
     // Failsafe timer to exit loading state even if Firebase is slow
     const timer = setTimeout(() => {
       if (view === 'loading') setView('simple');
     }, 3000);

     if (!isFirebaseInitialized) {
         setView('simple');
         clearTimeout(timer);
         return;
     }
     
     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            try {
                const profile = await getUserProfile(currentUser.uid);
                if (profile?.role === 'admin' || currentUser.email === 'admin@manager.com') {
                    setView('admin');
                } else {
                    setView('simple');
                }
            } catch (e) {
                console.error("Profile load error:", e);
                setView('simple');
            }
        } else {
            setView('simple');
        }
        clearTimeout(timer);
     });
     
     return () => {
       unsubscribe();
       clearTimeout(timer);
     };
  }, []);

  const handleAdminLogin = async (email: string, pass: string) => {
      try {
          await signInWithEmailAndPassword(auth, email, pass);
      } catch (error: any) {
          alert("שגיאה בהתחברות: " + error.message);
      }
  };

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
    setUser(null);
    setView('simple');
  };

  return (
    <ErrorBoundary>
       {view === 'admin' ? (
         <AdminDashboard onBack={handleSignOut} />
       ) : view === 'simple' ? (
         <SimpleApp onAdminLoginAttempt={handleAdminLogin} user={user} />
       ) : (
         <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white" dir="rtl">
           <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-cyan-500 rounded-full animate-pulse opacity-50"></div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-cyan-400 animate-pulse mb-1">טוען מערכת...</p>
                <p className="text-sm text-gray-500">אנחנו מכינים את הסביבה שלך</p>
              </div>
           </div>
         </div>
       )}
    </ErrorBoundary>
  );
};
