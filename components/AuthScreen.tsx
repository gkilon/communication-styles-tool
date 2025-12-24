
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, isFirebaseInitialized } from '../firebaseConfig';
import { createUserProfile, getTeams, ensureGoogleUserProfile } from '../services/firebaseService';
import { Team } from '../types';
import { ArrowLeftIcon, GoogleIcon } from './icons/Icons';

interface AuthScreenProps {
  onLoginSuccess: () => void;
  onBack?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Team selection
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isTeamLocked, setIsTeamLocked] = useState(false);
  
  const [adminCode, setAdminCode] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch teams on mount
  useEffect(() => {
     const fetchTeams = async () => {
        if (!isFirebaseInitialized) return;
        try {
            let teamsData = await getTeams();
            
            // Check for URL parameter 'team' to lock/filter view
            const urlParams = new URLSearchParams(window.location.search);
            const teamParam = urlParams.get('team');
            
            if (teamParam) {
                const foundTeam = teamsData.find(t => t.name === teamParam);
                if (foundTeam) {
                    // Filter list to only show the target team to prevent mistakes
                    setTeams([foundTeam]);
                    setSelectedTeam(foundTeam.name);
                    setIsTeamLocked(true);
                } else {
                    setTeams(teamsData);
                }
            } else {
                setTeams(teamsData);
            }
        } catch (e) {
            console.error("Failed to load teams", e);
        }
    };
    fetchTeams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isFirebaseInitialized) {
        setError("שגיאה: הגדרות Firebase חסרות. לא ניתן להתחבר.");
        setLoading(false);
        return;
    }

    try {
      if (isLogin) {
        // התחברות
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // הרשמה
        const role: 'user' | 'admin' = (adminCode === 'inspire') ? 'admin' : 'user';

        if (!name) {
            setError("נא למלא שם מלא");
            setLoading(false);
            return;
        }

        if (role === 'user' && !selectedTeam) {
             setError("חובה לבחור צוות אליו אתה משתייך");
             setLoading(false);
             return;
        }
        
        const teamToSave = role === 'admin' ? 'Management' : selectedTeam;

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await createUserProfile(userCredential.user.uid, {
            email,
            displayName: name,
            team: teamToSave,
            role: role
        });
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      let msg = "אירעה שגיאה. נא לנסות שוב.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') msg = "פרטים שגויים.";
      if (err.code === 'auth/email-already-in-use') msg = "המייל הזה כבר קיים במערכת.";
      if (err.code === 'auth/weak-password') msg = "הסיסמה חייבת להכיל לפחות 6 תווים.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setError('');
      setLoading(true);

      if (!isFirebaseInitialized) {
          setError("החיבור נכשל: המערכת לא הוגדרה כראוי (משתני סביבה חסרים).");
          setLoading(false);
          return;
      }

      // If registering (not logging in), enforce Team selection for regular users
      if (!isLogin && !selectedTeam) {
          setError("להרשמה דרך גוגל, חובה לבחור צוות מהרשימה תחילה.");
          setLoading(false);
          return;
      }

      try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          
          const teamToUse = (!isLogin && selectedTeam) ? selectedTeam : 'General';
          await ensureGoogleUserProfile(result.user, teamToUse);
          
          onLoginSuccess();
      } catch (err: any) {
          console.error("Google login error details:", err);
          let msg = "שגיאה בהתחברות עם Google.";
          if (err.code === 'auth/popup-closed-by-user') msg = "ההתחברות בוטלה על ידי המשתמש.";
          setError(msg);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="bg-gray-800 p-8 md:p-12 rounded-2xl shadow-2xl text-center max-w-lg w-full mx-auto animate-fade-in-up border border-gray-700 relative">
      
      {onBack && (
        <button 
            onClick={onBack}
            className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors"
        >
            <ArrowLeftIcon className="w-6 h-6 rotate-180" />
        </button>
      )}

      <h2 className="text-3xl md:text-4xl font-extrabold text-cyan-300 mb-2">
        {isLogin ? 'ברוכים הבאים' : 'הצטרפות לצוות'}
      </h2>
      <p className="text-gray-400 mb-8 text-lg">
        {isLogin ? 'התחברות למערכת הארגונית' : 'הרשמה וזיהוי צוותי'}
      </p>

      {/* TEAM SELECTION */}
      {!isLogin && (
        <div className="mb-8 text-right bg-gray-900/40 p-5 rounded-xl border border-cyan-500/20 shadow-inner">
            <label className="block text-cyan-400 text-base mb-2 pr-1 font-bold">בחירת צוות {isTeamLocked ? '(נעול לסדנה)' : ''}</label>
            <select
                value={selectedTeam}
                onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    setError('');
                }}
                disabled={isTeamLocked}
                className={`w-full bg-gray-700 border border-cyan-500/50 rounded-xl py-4 px-5 text-white text-lg focus:ring-2 focus:ring-cyan-500 shadow-md transition-all ${isTeamLocked ? 'opacity-90 cursor-not-allowed bg-gray-800' : 'cursor-pointer hover:bg-gray-650'}`}
            >
                {!isTeamLocked && <option value="" disabled>-- בחר את הצוות שלך --</option>}
                {teams.map(team => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                ))}
            </select>
            {isTeamLocked && <p className="text-[10px] text-gray-500 mt-2 text-center">הצוות הוגדר באופן אוטומטי עבור סדנה זו</p>}
        </div>
      )}

      {/* Primary Action Button - More Prominent */}
      {!isLogin && (
          <div className="space-y-4 mb-8">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white text-gray-800 hover:bg-gray-100 font-extrabold text-xl py-5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_15px_rgba(255,255,255,0.1)] active:scale-95"
              >
                  {loading ? (
                    <span className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <GoogleIcon className="w-7 h-7" />
                      <span>הירשם והתחל עם Google</span>
                    </>
                  )}
              </button>
              
              <div className="flex items-center gap-4">
                  <div className="h-px bg-gray-700 flex-1"></div>
                  <span className="text-gray-500 text-xs font-bold px-2">או הרשמה במייל</span>
                  <div className="h-px bg-gray-700 flex-1"></div>
              </div>
          </div>
      )}

      {isLogin && (
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-gray-800 hover:bg-gray-100 font-bold text-lg py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors mb-8 shadow-md"
          >
              <GoogleIcon className="w-6 h-6" />
              <span>התחבר עם Google</span>
          </button>
      )}

      {isLogin && (
          <div className="flex items-center gap-4 mb-8">
              <div className="h-px bg-gray-600 flex-1"></div>
              <span className="text-gray-500 text-sm font-medium">או במייל</span>
              <div className="h-px bg-gray-600 flex-1"></div>
          </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5 text-right">
        {!isLogin && (
            <div>
                <label className="block text-gray-300 text-sm mb-1 pr-1 font-medium">שם מלא</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 px-5 text-white text-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="השם שלך"
                />
            </div>
        )}

        <div>
            <label className="block text-gray-300 text-sm mb-1 pr-1 font-medium">אימייל</label>
            <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 px-5 text-white text-lg focus:ring-2 focus:ring-cyan-500 text-left"
            style={{direction: 'ltr'}}
            placeholder="email@company.com"
            />
        </div>

        <div>
            <label className="block text-gray-300 text-sm mb-1 pr-1 font-medium">סיסמה</label>
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 px-5 text-white text-lg focus:ring-2 focus:ring-cyan-500 text-left"
             style={{direction: 'ltr'}}
            placeholder="******"
            />
        </div>

        {error && <p className="text-red-300 text-base text-center bg-red-900/40 p-3 rounded-lg border border-red-800/50 animate-shake">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold py-5 px-8 rounded-xl text-xl transition-all shadow-xl mt-8 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0"
        >
          {loading ? 'מבצע פעולה...' : (isLogin ? 'התחבר למערכת' : 'הירשם והתחל בשאלון')}
        </button>
      </form>

      <div className="mt-8 text-base text-gray-400 flex justify-center gap-2 border-t border-gray-700 pt-6">
        <span>{isLogin ? 'משתמש חדש?' : 'כבר רשום?'}</span>
        <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-cyan-400 underline hover:text-cyan-300 font-extrabold"
        >
            {isLogin ? 'צור חשבון והצטרף לצוות' : 'עבור להתחברות'}
        </button>
      </div>
    </div>
  );
};
