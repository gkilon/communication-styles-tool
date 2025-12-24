
import React, { useState } from 'react';

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
  hasDatabaseConnection = false
}) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // For admin only
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isAdminMode) {
        // Admin Login (Firebase)
        if (!email || !password) {
            setError('אנא מלא אימייל וסיסמה');
            setLoading(false);
            return;
        }
        if (onAdminLogin) {
            try {
                await onAdminLogin(email, password);
                // Success is handled by parent view switch
            } catch (err: any) {
                console.error(err);
                setError('פרטי התחברות שגויים');
            }
        }
    } else {
        // Simple User Login (Shared Password)
        const success = onAuthenticate(password);
        if (!success) {
          setError('סיסמה שגויה.');
          setPassword('');
        }
    }
    setLoading(false);
  };

  const toggleMode = () => {
      const newMode = !isAdminMode;
      setIsAdminMode(newMode);
      setError('');
      
      // Clear fields when switching modes
      setEmail('');
      setPassword('');
  };

  return (
    <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-md mx-auto animate-fade-in-up border border-gray-700">
      
      {/* Team Member Login Option - HIGHLIGHTED AS PRIMARY */}
      {hasDatabaseConnection && !isAdminMode && (
          <div className="mb-8 p-4 bg-cyan-900/20 rounded-xl border border-cyan-500/30">
              <p className="text-cyan-300 text-sm mb-3 font-bold">חלק מארגון או סדנה?</p>
              <button
                  onClick={onTeamLoginClick}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold py-4 px-4 rounded-xl text-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse hover:animate-none"
              >
                  כניסת חבר צוות / משתתף סדנה
              </button>
              <p className="text-gray-500 text-xs mt-2 italic">שמירת תוצאות וניתוח צוותי</p>
          </div>
      )}

      <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-gray-700 flex-1"></div>
          <span className="text-gray-500 text-xs font-medium">{hasDatabaseConnection && !isAdminMode ? 'או' : ''} {isAdminMode ? 'ניהול' : 'כניסה אישית'}</span>
          <div className="h-px bg-gray-700 flex-1"></div>
      </div>

      <h2 className="text-2xl font-bold text-gray-200 mb-2">
          {isAdminMode ? 'כניסת מנהל מערכת' : 'כניסה מהירה'}
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        {isAdminMode 
            ? 'הזן פרטי מנהל (אימייל וסיסמה)' 
            : 'הזן את סיסמת הגישה לשאלון אישי'}
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        
        {isAdminMode && (
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-full py-3 px-4 text-white text-center placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="אימייל מנהל"
                dir="ltr"
                autoComplete="off"
            />
        )}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-full py-3 px-4 text-white text-center placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
          placeholder="סיסמה"
          dir="ltr"
          autoComplete="new-password"
        />
        
        {error && <p className="text-red-400 text-sm">{error}</p>}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-full text-lg transition-all shadow-lg disabled:opacity-50"
        >
          {loading ? 'מתחבר...' : 'כניסה'}
        </button>
      </form>

      <div className="mt-8 pt-4 border-t border-gray-700">
        <button 
            onClick={toggleMode}
            className="text-xs text-gray-500 hover:text-cyan-400 transition-colors underline"
        >
            {isAdminMode ? 'חזרה למסך כניסה' : 'כניסת מנהל (Admin)'}
        </button>
      </div>
    </div>
  );
};
