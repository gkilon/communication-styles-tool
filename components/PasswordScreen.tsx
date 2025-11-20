
import React, { useState } from 'react';

interface PasswordScreenProps {
  onAuthenticate: (password: string) => boolean;
  onAdminLogin?: (email: string, pass: string) => Promise<void>;
}

export const PasswordScreen: React.FC<PasswordScreenProps> = ({ onAuthenticate, onAdminLogin }) => {
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
      setIsAdminMode(!isAdminMode);
      setError('');
      setPassword('');
      setEmail('');
  };

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-md mx-auto animate-fade-in-up border border-gray-700">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
          {isAdminMode ? 'כניסת מנהל מערכת' : 'כניסה לשאלון'}
      </h2>
      <p className="text-gray-400 mb-6 text-sm">
        {isAdminMode 
            ? 'הזן פרטי מנהל לצפייה בנתונים' 
            : 'הזן את סיסמת הגישה כדי להתחיל'}
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {isAdminMode && (
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-full py-3 px-4 text-white text-center placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="אימייל מנהל"
                dir="ltr"
                autoFocus
            />
        )}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-full py-3 px-4 text-white text-center placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
          placeholder={isAdminMode ? "סיסמה" : "הכנס סיסמה"}
          dir="ltr"
        />
        
        {error && <p className="text-red-400 text-sm">{error}</p>}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:scale-100"
        >
          {loading ? 'בודק...' : (isAdminMode ? 'התחבר' : 'כניסה')}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-700">
        <button 
            onClick={toggleMode}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline"
        >
            {isAdminMode ? 'חזרה לכניסת משתמשים רגילה' : 'כניסת מנהל'}
        </button>
      </div>
    </div>
  );
};
