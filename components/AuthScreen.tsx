
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebaseConfig';
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
  
  const [adminCode, setAdminCode] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch teams on mount
  useEffect(() => {
     const fetchTeams = async () => {
        try {
            const teamsData = await getTeams();
            setTeams(teamsData);
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
      try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          
          // בדיקה אם למשתמש יש פרופיל, אם לא - צור אחד
          // אם המשתמש כבר בחר צוות (בתהליך הרשמה) נשתמש בזה, אחרת ברירת מחדל 'כללי'
          const teamToUse = selectedTeam || 'General';
          await ensureGoogleUserProfile(result.user, teamToUse);
          
          onLoginSuccess();
      } catch (err: any) {
          console.error("Google login error", err);
          setError("שגיאה בהתחברות עם Google.");
          if (err.code === 'auth/popup-closed-by-user') {
              setError("ההתחברות בוטלה.");
          }
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-md mx-auto animate-fade-in-up border border-gray-700 w-full relative">
      
      {onBack && (
        <button 
            onClick={onBack}
            className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
        >
            <ArrowLeftIcon className="w-5 h-5 rotate-180" />
        </button>
      )}

      <h2 className="text-3xl font-bold text-cyan-300 mb-2">
        {isLogin ? 'כניסה למערכת' : 'הרשמה לצוות'}
      </h2>
      <p className="text-gray-400 mb-6 text-sm">
        {isLogin ? 'הזן את פרטי המשתמש שלך' : 'הצטרף לצוות הארגוני שלך'}
      </p>

      {/* Google Login Button */}
      <button 
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full bg-white text-gray-700 hover:bg-gray-100 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors mb-6 shadow-md"
      >
          {loading ? (
             <span className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              <GoogleIcon className="w-5 h-5" />
              <span>התחבר באמצעות Google</span>
            </>
          )}
      </button>

      <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-gray-600 flex-1"></div>
          <span className="text-gray-500 text-xs">או במייל</span>
          <div className="h-px bg-gray-600 flex-1"></div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {!isLogin && (
            <>
                <div>
                    <label className="block text-gray-400 text-sm mb-1 pr-2">שם מלא</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-cyan-500"
                        placeholder="ישראל ישראלי"
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1 pr-2">בחר צוות</label>
                    <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value="" disabled>-- בחר צוות מהרשימה --</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.name}>{team.name}</option>
                        ))}
                    </select>
                </div>
            </>
        )}

        <div>
            <label className="block text-gray-400 text-sm mb-1 pr-2">אימייל</label>
            <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white ltr-text focus:ring-2 focus:ring-cyan-500 text-left"
            style={{direction: 'ltr'}}
            placeholder="your@email.com"
            />
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-1 pr-2">סיסמה</label>
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-cyan-500 text-left"
             style={{direction: 'ltr'}}
            placeholder="******"
            />
        </div>

        {!isLogin && (
            <div className="border-t border-gray-700 pt-2 mt-2">
                <div className="relative">
                    <input
                        type="password"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-1 px-4 text-white text-xs focus:ring-1 focus:ring-cyan-500 placeholder-gray-600"
                        placeholder="קוד מנהל (להקמת מערכת בלבד)"
                    />
                </div>
            </div>
        )}

        {error && <p className="text-red-400 text-sm text-center bg-red-900/30 p-2 rounded border border-red-800">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all shadow-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'מעבד...' : (isLogin ? 'התחבר' : 'הירשם')}
        </button>
      </form>

      <div className="mt-6 text-sm text-gray-400 flex justify-center gap-1">
        <span>{isLogin ? 'עדיין אין לך חשבון?' : 'כבר נרשמת?'}</span>
        <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-cyan-400 underline hover:text-cyan-300 font-bold"
        >
            {isLogin ? 'הירשם לצוות' : 'התחבר'}
        </button>
      </div>
    </div>
  );
};
