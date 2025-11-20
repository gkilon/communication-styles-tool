
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
            const normalizedEmail = currentUser.email?.toLowerCase() || '';
            
            // --- CRITICAL FIX ---
            // If the email matches the admin email, FORCE entry to Admin Dashboard.
            // This bypasses the Firestore 'getUserProfile' check which might fail due to permissions.
            if (normalizedEmail === 'admin@manager.com') {
                setView('admin');
                
                // Try to repair profile in background, but don't block UI
                getUserProfile(currentUser.uid).then(profile => {
                    if (!profile) {
                        createUserProfile(currentUser.uid, {
                            email: normalizedEmail,
                            displayName: 'System Admin',
                            team: 'Management',
                            role: 'admin'
                        }).catch(err => console.warn("Background profile creation failed:", err));
                    }
                }).catch(() => { /* Ignore DB errors here, Dashboard will handle them */ });
                
                return; 
            }

            // For regular users, we still check the profile
            try {
                const profile = await getUserProfile(currentUser.uid);
                if (profile?.role === 'admin') {
                    setView('admin');
                } else {
                    setView('simple');
                }
            } catch (e: any) {
                console.error("Error checking user profile", e);
                // If regular user fails DB check, go to simple view
                setView('simple');
            }
        } else {
            // Not logged in
            setView('simple');
        }
     });
     
     return () => unsubscribe();
  }, []);

  const handleAdminLogin = async (email: string, pass: string) => {
      if (!auth) return;
      const normalizedEmail = email.toLowerCase().trim();

      try {
          await signInWithEmailAndPassword(auth, normalizedEmail, pass);
          // Note: We don't need to setView here manually. 
          // The onAuthStateChanged listener above will detect the login 
          // and route to 'admin' automatically because of the email check.
      } catch (error: any) {
          console.log("Login process error:", error.code);
          
          // Check if user needs to be created (Backdoor)
          const isUserNotFound = error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential';
          
          if (isUserNotFound && normalizedEmail === 'admin@manager.com') {
              try {
                  const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
                  // Force view update just in case listener is slow
                  if (cred.user) setView('admin');
              } catch (createError: any) {
                  alert("שגיאה ביצירת משתמש מנהל: " + createError.message);
              }
          } else {
              alert("שגיאה בהתחברות: " + (error.code === 'auth/wrong-password' ? 'סיסמה שגויה' : error.message));
          }
      }
  };

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
    // Listener will handle view change to 'simple'
  };

  const renderContent = () => {
    switch (view) {
      case 'admin':
        return <AdminDashboard onBack={handleSignOut} />;
      case 'simple':
        return (
          <SimpleApp 
            onAdminLoginAttempt={handleAdminLogin}
            user={user} 
          />
        );
      case 'loading':
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-lg">טוען מערכת...</div>;
      default:
        return <div className="text-white">Error State</div>;
    }
  };

  return (
    <ErrorBoundary>
       {renderContent()}
    </ErrorBoundary>
  );
};
