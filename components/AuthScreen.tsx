
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
  // participants are mostly new: default to Registration (false)
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isTeamLocked, setIsTeamLocked] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     const fetchTeams = async () => {
        try {
            let teamsData = await getTeams();
            const urlParams = new URLSearchParams(window.location.search);
            const teamParam = urlParams.get('team');
            
            if (teamParam) {
                const foundTeam = teamsData.find(t => t.name.toLowerCase() === teamParam.toLowerCase());
                if (foundTeam) {
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

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name || !selectedTeam) {
            setError("חובה למלא שם ולבחור צוות");
            setLoading(false);
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(userCredential.user.uid, {
            email,
            displayName: name,
            team: selectedTeam,
            role: 'user'
        });
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError("שגיאה בפעולה. וודא שהפרטים תקינים והמייל לא בשימוש.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      if (!isLogin && !selectedTeam) {
          setError("חובה לבחור צוות לפני הרשמה עם Google");
          return;
      }
      setLoading(true);
      try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          await ensureGoogleUserProfile(result.user, selectedTeam || 'General');
          onLoginSuccess();
      } catch (err) {
          setError("שגיאה בהתחברות עם Google");
          setLoading(false);
      }
  };

  return (
    <div className="bg-gray-800 p-8 md:p-12 rounded-3xl shadow-2xl text-center max-w-lg w-full mx-auto animate-fade-in-up border border-gray-700 relative">
      {onBack && (
        <button onClick={onBack} className="absolute top-6 left-6 text-gray-400 hover:text-white transition-all">
            <ArrowLeftIcon className="w-6 h-6 rotate-180" />
        </button>
      )}

      <h2 className="text-3xl font-black text-cyan-300 mb-2">
        {isLogin ? 'כניסה למשתתף רשום' : 'רישום לסדנה / צוות'}
      </h2>
      <p className="text-gray-400 mb-8 font-medium">
        {isLogin ? 'ברוכים השבים! הכנסו לחשבון' : 'שלום! בוא נקים עבורך פרופיל'}
      </p>

      {!isLogin && (
        <div className="mb-8 text-right bg-cyan-900/20 p-5 rounded-2xl border-2 border-cyan-500/30">
            <label className="block text-cyan-400 text-sm mb-2 font-black">הצוות שלך בסדנה:</label>
            <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                disabled={isTeamLocked}
                className={`w-full bg-gray-900 border border-cyan-500/50 rounded-xl py-4 px-4 text-white text-lg focus:ring-4 focus:ring-cyan-500/20 shadow-inner ${isTeamLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                {!isTeamLocked && <option value="" disabled>-- רשימת צוותים --</option>}
                {teams.map(team => <option key={team.id} value={team.name}>{team.name}</option>)}
            </select>
        </div>
      )}

      <div className="space-y-4 mb-8">
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-gray-900 font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-xl hover:bg-gray-100 transition-all active:scale-95"
          >
              <GoogleIcon className="w-6 h-6" />
              <span>{isLogin ? 'כניסה עם Google' : 'הרשמה מהירה עם Google'}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-px bg-gray-700 flex-1"></div>
            <span className="text-gray-600 text-[10px] font-bold uppercase">או ידנית</span>
            <div className="h-px bg-gray-700 flex-1"></div>
          </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {!isLogin && (
            <div className="group">
                <label className="block text-gray-500 text-xs mr-2 mb-1">שם מלא</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 transition-all"
                    placeholder="ישראל ישראלי"
                />
            </div>
        )}
        <div className="group">
            <label className="block text-gray-500 text-xs mr-2 mb-1">אימייל</label>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 px-4 text-white text-left focus:ring-2 focus:ring-cyan-500 transition-all"
                placeholder="name@email.com"
                dir="ltr"
            />
        </div>
        <div className="group">
            <label className="block text-gray-500 text-xs mr-2 mb-1">סיסמה</label>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 px-4 text-white text-left focus:ring-2 focus:ring-cyan-500 transition-all"
                placeholder="******"
                dir="ltr"
            />
        </div>
        
        {error && <p className="text-red-400 text-sm font-bold text-center bg-red-900/20 p-3 rounded-lg border border-red-500/20">{error}</p>}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 rounded-xl text-xl shadow-2xl mt-4 transition-all transform active:scale-95 border-b-4 border-blue-800"
        >
          {loading ? 'מעבד...' : (isLogin ? 'התחבר עכשיו' : 'צור חשבון והתחל')}
        </button>
      </form>

      <div className="mt-10 pt-8 border-t border-gray-700 text-gray-400">
        <p className="mb-3 text-sm">{isLogin ? 'משתמש חדש בסדנה?' : 'כבר פתחת חשבון קודם?'}</p>
        <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="w-full py-3 px-4 border-2 border-cyan-500/30 rounded-xl text-cyan-400 font-black hover:bg-cyan-500/10 transition-all text-lg"
        >
            {isLogin ? 'עבור להרשמה (חדש כאן)' : 'יש לי כבר חשבון - שלח אותי לכניסה'}
        </button>
      </div>
    </div>
  );
};
