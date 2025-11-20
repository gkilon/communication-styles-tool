
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
    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-md mx-auto animate-fade-in-up border border-gray-700">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
          {isAdminMode ? 'כניסת מנהל מערכת' : 'כניסה לשאלון'}
      </h2>
      <p className="text-gray-400 mb-6 text-sm">
        {isAdminMode 
            ? 'הזן פרטי מנהל (אימייל וסיסמה)' 
            : 'הזן את סיסמת הגישה כדי להתחיל'}
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
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:scale-100"
        >
          {loading ? 'מתחבר...' : (isAdminMode ? 'כניסת מנהל' : 'כניסה')}
        </button>
      </form>

      {/* Team Member Login Option */}
      {hasDatabaseConnection && !isAdminMode && (
          <div className="mt-6 border-t border-gray-700 pt-4">
              <p className="text-gray-400 text-xs mb-2">חלק מארגון?</p>
              <button
                  onClick={onTeamLoginClick}
                  className="w-full bg-transparent border border-cyan-600 text-cyan-400 hover:bg-cyan-900/30 font-bold py-2 px-4 rounded-full text-sm transition-all"
              >
                  עובד חברה / חבר צוות? כנס כאן
              </button>
          </div>
      )}

      <div className="mt-6 pt-2">
        <button 
            onClick={toggleMode}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline"
        >
            {isAdminMode ? 'חזרה לשאלון' : 'כניסת מנהל'}
        </button>
      </div>
    </div>
  );
};
