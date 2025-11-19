
import React, { useState, useEffect } from 'react';
import { SimpleApp } from './SimpleApp';
import { AuthScreen } from './components/AuthScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { auth, isFirebaseInitialized } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserProfile } from './services/firebaseService';
import { UserProfile } from './types';

type AppView = 'simple' | 'auth' | 'admin' | 'team_app' | 'loading';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('simple');
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Refactored useEffect for auth listener
  useEffect(() => {
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
                    setView('team_app');
                }
            } else {
                setUserProfile(null);
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
            <AuthScreen onLoginSuccess={() => { /* View update handled by auth listener */ }} />
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
        return <div>Error: Unknown state</div>;
    }
  };

  return (
    <React.StrictMode>
       {renderContent()}
    </React.StrictMode>
  );
};
