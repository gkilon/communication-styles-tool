
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

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, onBack }) => {
  // Default to Sign Up (false) as requested for workshop participants
  const [isLogin, setIsLogin] = useState(false);
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
                const foundTeam = teamsData.find(t => t.name.toLowerCase() === teamParam.toLowerCase());
                if (foundTeam) {
                    // Filter list to ONLY show the target team to prevent mistakes during workshops
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
             setError("חובה לבחור צוות כדי להצטרף לסדנה");
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
      if (err.code === 'auth/email-already-in-use') msg = "המייל הזה כבר קיים במערכת. נסו להתחבר במקום להירשם.";
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
          setError("החיבור נכשל: המערכת לא הוגדרה כראוי.");
          setLoading(false);
          return;
      }

      if (!isLogin && !selectedTeam) {
          setError("להרשמה דרך גוגל, חובה לבחור צוות תחילה.");
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
          if (err.code === 'auth/popup-closed-by-user') msg = "ההתחברות בוטלה.";
          setError(msg);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="bg-gray-800 p-8 md:p-12 rounded-3xl shadow-2xl text-center max-w-lg w-full mx-auto animate-fade-in-up border border-gray-700 relative">
      
      {onBack && (
        <button 
            onClick={onBack}
            className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors"
        >
            <ArrowLeftIcon className="w-6 h-6 rotate-180" />
        </button>
      )}

      <h2 className="text-3xl md:text-4xl font-extrabold text-cyan-300 mb-2">
        {isLogin ? 'ברוכים השבים' : 'משתמש חדש? בוא נתחיל'}
      </h2>
      <p className="text-gray-400 mb-8 text-lg">
        {isLogin ? 'התחברות לחשבון קיים' : 'יצירת חשבון והצטרפות לצוות'}
      </p>

      {/* TEAM SELECTION - CRITICAL FOR WORKSHOPS */}
      {!isLogin && (
        <div className="mb-8 text-right bg-cyan-900/10 p-5 rounded-2xl border border-cyan-500/30 shadow-inner">
            <label className="block text-cyan-400 text-base mb-2 pr-1 font-bold">בחירת הצוות שלך:</label>
            <select
                value={selectedTeam}
                onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    setError('');
                }}
                disabled={isTeamLocked}
                className={`w-full bg-gray-900 border-2 border-cyan-500/50 rounded-xl py-4 px-5 text-white text-lg focus:ring-4 focus:ring-cyan-500/20 shadow-lg transition-all ${isTeamLocked ? 'opacity-90 cursor-not-allowed' : 'cursor-pointer hover:border-cyan-400'}`}
            >
                {!isTeamLocked && <option value="" disabled>-- בחר צוות מהרשימה --</option>}
                {teams.map(team => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                ))}
            </select>
            {isTeamLocked && <p className="text-xs text-cyan-500/70 mt-3 text-center font-medium italic">הצוות הוגדר מראש עבור הקישור שקיבלת</p>}
        </div>
      )}

      {/* Primary Action Button Area */}
      <div className="space-y-4 mb-8">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-gray-900 hover:bg-gray-100 font-extrabold text-xl py-5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 border-b-4 border-gray-300"
          >
              {loading ? (
                <span className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <GoogleIcon className="w-7 h-7" />
                  <span>{isLogin ? 'כניסה עם Google' : 'הרשמה מהירה עם Google'}</span>
                </>
              )}
          </button>
          
          <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-gray-700 flex-1"></div>
              <span className="text-gray-500 text-xs font-bold px-2">או ידנית עם אימייל</span>
              <div className="h-px bg-gray-700 flex-1"></div>
          </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5 text-right">
        {!isLogin && (
            <div>
                <label className="block text-gray-400 text-sm mb-1 pr-1">שם מלא</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-4 px-5 text-white text-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="איך קוראים לך?"
                />
            </div>
        )}

        <div>
            <label className="block text-gray-400 text-sm mb-1 pr-1">כתובת אימייל</label>
            <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl py-4 px-5 text-white text-lg focus:ring-2 focus:ring-cyan-500 text-left"
            style={{direction: 'ltr'}}
            placeholder="email@domain.com"
            />
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-1 pr-1">סיסמה</label>
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl py-4 px-5 text-white text-lg focus:ring-2 focus:ring-cyan-500 text-left"
             style={{direction: 'ltr'}}
            placeholder="******"
            />
        </div>

        {error && (
            <div className="text-red-300 text-sm text-center bg-red-900/30 p-4 rounded-xl border border-red-500/30 animate-shake">
                {error}
            </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-extrabold py-5 px-8 rounded-2xl text-2xl transition-all shadow-[0_10px_20px_rgba(6,182,212,0.3)] mt-6 disabled:opacity-50 transform hover:-translate-y-1 active:translate-y-0 border-b-4 border-blue-900"
        >
          {loading ? 'מעבד...' : (isLogin ? 'התחבר' : 'צור חשבון והתחל בשאלון')}
        </button>
      </form>

      <div className="mt-10 text-lg text-gray-400 flex flex-col sm:flex-row justify-center items-center gap-2 border-t border-gray-700 pt-8">
        <span>{isLogin ? 'משתמש חדש בסדנה?' : 'כבר רשום במערכת?'}</span>
        <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-cyan-400 underline hover:text-cyan-300 font-extrabold decoration-2 underline-offset-4"
        >
            {isLogin ? 'צור חשבון חדש' : 'התחבר מכאן'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
