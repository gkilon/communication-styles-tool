
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import SimpleApp from './SimpleApp';
import { AdminDashboard } from './components/AdminDashboard';
import { auth, isFirebaseInitialized } from './firebaseConfig';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getUserProfile, createUserProfile } from './services/firebaseService';
import { UserProfile } from './types';

type AppView = 'simple' | 'admin' | 'loading';

// Error Boundary Component
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
          <button 
            onClick={() => window.location.reload()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-full transition-all"
          >
            רענן עמוד
          </button>
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
     if (!isFirebaseInitialized || !auth) {
         setView('simple');
         return;
     }
     
     const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            try {
                // If user is logged in via Firebase, check if Admin
                const profile = await getUserProfile(currentUser.uid);
                if (profile?.role === 'admin') {
                    setView('admin');
                } else {
                    // Even if logged in as user, in "Simple Mode" we mostly just show the app
                    setView('simple');
                }
            } catch (e) {
                console.error("Error fetching profile", e);
                setView('simple');
            }
        } else {
            setView('simple');
        }
     });
     
     return () => unsubscribe();
  }, []);

  const handleAdminLogin = async (email: string, pass: string) => {
      if (!auth) return;

      try {
          await signInWithEmailAndPassword(auth, email, pass);
          // The auth listener will switch the view to 'admin' automatically
      } catch (error: any) {
          console.log("Login failed, checking if hardcoded admin needs creation...", error.code);
          // Special Case: If it's the hardcoded admin and it doesn't exist yet, create it.
          if ((error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') && email === 'admin@manager.com') {
              try {
                  const cred = await createUserWithEmailAndPassword(auth, email, pass);
                  await createUserProfile(cred.user.uid, {
                      email,
                      displayName: 'System Admin',
                      team: 'Management',
                      role: 'admin'
                  });
                  console.log("Admin user created automatically.");
              } catch (createError) {
                  console.error("Failed to auto-create admin", createError);
                  alert("שגיאה ביצירת משתמש מנהל ראשוני.");
              }
          } else {
              alert("פרטי התחברות שגויים.");
          }
      }
  };

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
    setView('simple');
  };

  const renderContent = () => {
    switch (view) {
      case 'admin':
        return <AdminDashboard onBack={handleSignOut} />;
      case 'simple':
        return (
          <SimpleApp 
            onAdminLoginAttempt={handleAdminLogin}
            user={user} // Pass user if exists, but not required
          />
        );
      case 'loading':
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">טוען...</div>;
      default:
        return <div className="text-white">Error</div>;
    }
  };

  return (
    <ErrorBoundary>
       {renderContent()}
    </ErrorBoundary>
  );
};
