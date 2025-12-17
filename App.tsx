
import React, { useState, useEffect, ReactNode, ErrorInfo, Component } from 'react';
import SimpleApp from './SimpleApp';
import { AdminDashboard } from './components/AdminDashboard';
import { auth, isFirebaseInitialized } from './firebaseConfig';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getUserProfile } from './services/firebaseService';

type AppView = 'simple' | 'admin' | 'loading';

interface ErrorBoundaryProps {
  // Making children optional to resolve TypeScript "missing children" errors in complex conditional JSX
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Fixed ErrorBoundary: Explicitly extend Component and declare state to ensure 'this.state' and 'this.props' are recognized
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declaring state as a class property for better TypeScript compatibility
  override state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  override render() {
    // Correctly accessing state and props
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">אירעה שגיאה בטעינה</h1>
          <button onClick={() => window.location.reload()} className="bg-cyan-600 px-6 py-2 rounded-full">נסה שוב</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('loading');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
     // Failsafe: if Firebase isn't initialized or stuck, show simple app after 2 seconds
     const timer = setTimeout(() => {
       if (view === 'loading') setView('simple');
     }, 2000);

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
    setView('simple');
  };

  return (
    // Fixed: ErrorBoundary usage now compatible with children prop requirements
    <ErrorBoundary>
       {view === 'admin' ? (
         <AdminDashboard onBack={handleSignOut} />
       ) : view === 'simple' ? (
         <SimpleApp onAdminLoginAttempt={handleAdminLogin} user={user} />
       ) : (
         <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
           <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="animate-pulse">טוען מערכת...</p>
           </div>
         </div>
       )}
    </ErrorBoundary>
  );
};
