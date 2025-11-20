
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

// Helper to generate friendly error messages
const getFriendlyErrorMessage = (error: any): string => {
    const code = error.code || '';
    const message = error.message || '';
    
    if (code === 'permission-denied' || message.includes('permission-denied')) {
        return `🛑 שגיאת הרשאות מסד נתונים (Firestore):
המסד נתונים מוגדר כ'נעול' (Production Mode).

כיצד לתקן:
1. כנס ל-Firebase Console -> Firestore Database
2. עבור ללשונית 'Rules'
3. שנה את 'allow read, write: if false;' ל-'if true;'
4. לחץ Publish`;
    }
    
    if (code === 'auth/email-already-in-use') return "המייל הזה כבר קיים במערכת.";
    if (code === 'auth/wrong-password') return "סיסמה שגויה.";
    if (code === 'auth/user-not-found') return "משתמש לא נמצא.";
    if (code === 'auth/operation-not-allowed') {
        return `🛑 פעולה נדרשת ב-Firebase Console:
1. כנס ל-Build -> Authentication
2. בחר ב-Sign-in method
3. הפעל את 'Email/Password' (לחץ על Enable)`;
    }

    return `שגיאה כללית: ${code || message}`;
};

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
            } catch (e: any) {
                console.error("Error fetching profile", e);
                // If permission denied happens in the background (e.g. after refresh), alert the user
                if (e.code === 'permission-denied' || e.message?.includes('permission-denied')) {
                     alert(getFriendlyErrorMessage(e));
                }
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
      const normalizedEmail = email.toLowerCase().trim();

      try {
          // 1. Attempt standard login
          const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
          
          // 2. VALIDATE FIRESTORE ACCESS IMMEDIATELY
          // This ensures we catch 'permission-denied' right here and now, 
          // instead of waiting for onAuthStateChanged which fails silently.
          try {
              const profile = await getUserProfile(userCredential.user.uid);
              
              // REPAIR LOGIC: If admin logs in successfully but has no profile, create it.
              if (!profile && normalizedEmail === 'admin@manager.com') {
                  await createUserProfile(userCredential.user.uid, {
                      email: normalizedEmail,
                      displayName: 'System Admin',
                      team: 'Management',
                      role: 'admin'
                  });
                  console.log("Admin profile repaired/created.");
              }
          } catch (dbError: any) {
              // If we get permission denied here, THROW it so the outer catch block handles it
              if (dbError.code === 'permission-denied' || dbError.message?.includes('permission-denied')) {
                  throw dbError;
              }
              console.warn("Profile check failed but continuing:", dbError);
          }

      } catch (error: any) {
          console.log("Login process error:", error.code);
          
          // If it's a permission error (from step 2), show the fix instructions
          if (error.code === 'permission-denied' || error.message?.includes('permission-denied')) {
              alert(getFriendlyErrorMessage(error));
              return;
          }

          // If the error is that the user doesn't exist, try to create them (Admin Backdoor)
          const isUserNotFound = error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential';
          
          if (isUserNotFound && normalizedEmail === 'admin@manager.com') {
              try {
                  console.log("Admin user not found, attempting to create...");
                  const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
                  
                  await createUserProfile(cred.user.uid, {
                      email: normalizedEmail,
                      displayName: 'System Admin',
                      team: 'Management',
                      role: 'admin'
                  });
                  
              } catch (createError: any) {
                  console.error("Failed to auto-create admin", createError);
                  alert(getFriendlyErrorMessage(createError));
              }
          } else {
              alert("שגיאה בהתחברות: " + (error.code === 'auth/wrong-password' ? 'סיסמה שגויה' : error.message));
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
