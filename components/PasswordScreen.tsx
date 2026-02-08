
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseInitialized } from '../firebaseConfig';

interface PasswordScreenProps {
  onAuthenticate: (password: string) => boolean;
  onAdminLogin?: (email: string, pass: string) => Promise<void>;
  onTeamLoginClick?: () => void;
  hasDatabaseConnection?: boolean;
}

export const PasswordScreen: React.FC<PasswordScreenProps> = ({ 
  onAuthenticate, 
  onAdminLogin, 
  onTeamLoginClick,
  hasDatabaseConnection = true 
}) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remotePass, setRemotePass] = useState<string | null>(null);

  useEffect(() => {
    if (isFirebaseInitialized) {
      getDoc(doc(db, "settings", "access")).then(snap => {
        // Fix: Use type assertion to access questionnairePassword from unknown DocumentData
        if (snap.exists()) setRemotePass((snap.data() as any).questionnairePassword);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isAdminMode) {
        if (!email || !password) {
            setError('אנא מלא אימייל וסיסמה');
            setLoading(false);
            return;
        }
        if (onAdminLogin) {
            try {
                await onAdminLogin(email, password);
            } catch (err: any) {
                setError('פרטי התחברות שגויים');
            }
        }
    } else {
        let success = false;
        if (remotePass) {
            success = password.toLowerCase() === remotePass.toLowerCase();
        } else {
            success = onAuthenticate(password);
        }

        if (success) {
            onAuthenticate(password); 
        } else {
          setError('סיסמה שגויה.');
          setPassword('');
        }
    }
    setLoading(false);
  };

  const toggleMode = () => {
      setIsAdminMode(!isAdminMode);
      setError('');
      setEmail('');
      setPassword('');
  };

  // Updated Branding Component to match the new logo style
  const Branding = () => (
    <div className="mb-10 flex flex-col items-center">
      <a 
        href="https://kilon-consulting.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="group transition-all duration-300 transform hover:scale-105"
      >
        <div className="flex flex-col items-center">
          <div className="flex items-center text-2xl md:text-3xl tracking-tight">
            <span className="text-white font-light">GILAD</span>
            <span className="text-white font-black ml-2">KILON</span>
            <span className="text-cyan-500 font-black ml-1 leading-none text-3xl">.</span>
          </div>
          <div className="text-gray-500 text-[8px] md:text-[9px] font-bold tracking-[0.3em] uppercase mt-1 border-t border-gray-800 pt-1 w-full text-center">
            MANAGEMENT CONSULTING
          </div>
        </div>
      </a>
    </div>
  );

  if (isAdminMode) {
    return (
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-md mx-auto animate-fade-in-up border border-gray-700">
        <Branding />
        <h2 className="text-2xl font-bold text-gray-200 mb-6">כניסת מנהל מערכת</h2>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500"
              placeholder="אימייל מנהל"
              dir="ltr"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500"
            placeholder="סיסמת מנהל"
            dir="ltr"
          />
          {error && <p className="text-red-400 text-sm font-bold">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-xl transition-all"
          >
            {loading ? 'מתחבר...' : 'כניסת אדמין'}
          </button>
        </form>
        <button onClick={toggleMode} className="mt-6 text-xs text-gray-500 hover:text-cyan-400 underline transition-colors">חזרה למסך הראשי</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full mx-auto animate-fade-in-up px-4">
      <Branding />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* RIGHT SIDE: TEAM / WORKSHOP */}
        <div className="bg-gray-800/80 backdrop-blur-sm p-10 rounded-3xl border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col justify-between text-center transform transition-all hover:scale-[1.02]">
            <div>
              <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">👥</span>
              </div>
              <h3 className="text-white text-3xl font-black mb-4">כניסה צוותית</h3>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                הצטרף לצוות שלך בסדנה, שמור את התוצאות בענן וקבל ניתוח קבוצתי חכם.
              </p>
            </div>
            
            <button
                onClick={onTeamLoginClick}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-6 px-4 rounded-2xl text-2xl transition-all shadow-xl border-b-4 border-blue-900 active:translate-y-1 active:border-b-0"
            >
                כניסת חבר צוות
            </button>
            <p className="text-cyan-400 text-sm mt-4 font-bold animate-pulse">מומלץ עבור סדנאות מנהלים</p>
        </div>

        {/* LEFT SIDE: PERSONAL QUESTIONNAIRE */}
        <div className="bg-gray-800/50 p-10 rounded-3xl border border-gray-700 shadow-xl flex flex-col justify-between text-center">
            <div>
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">👤</span>
              </div>
              <h3 className="text-gray-200 text-2xl font-bold mb-4">שאלון אישי</h3>
              <p className="text-gray-500 text-base mb-8 leading-relaxed">
                מילוי השאלון באופן אנונימי ללא שמירה בענן.
                <br/>
                <span className="text-xs text-gray-600 mt-2 block italic">נדרשת סיסמת גישה למערכת</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500/50 text-xl placeholder:text-gray-800"
                placeholder="הקלד סיסמת גישה"
                dir="ltr"
              />
              {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
              <button
                type="submit"
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-xl transition-all text-xl border border-gray-600 shadow-lg"
              >
                התחל כשאלון אישי
              </button>
            </form>
            
            <button onClick={toggleMode} className="mt-6 text-[10px] text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors">Admin Dashboard</button>
        </div>

      </div>
    </div>
  );
};
