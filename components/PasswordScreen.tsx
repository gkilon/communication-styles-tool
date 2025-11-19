
import React, { useState } from 'react';

interface PasswordScreenProps {
  onAuthenticate: (password: string) => boolean;
  onSwitchToTeamLogin?: () => void;
}

export const PasswordScreen: React.FC<PasswordScreenProps> = ({ onAuthenticate, onSwitchToTeamLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAuthenticate(password);
    if (!success) {
      setError('סיסמה שגויה. אנא נסה שנית.');
      setPassword('');
    } else {
      setError('');
    }
  };

  const handleReload = () => {
      window.location.reload();
  };

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-md mx-auto animate-fade-in-up">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">כניסה לשאלון</h2>
      <p className="text-gray-300 mb-6">
        כדי לגשת לשאלון, יש להזין את סיסמת הגישה.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-full py-3 px-4 text-white text-center placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
          placeholder="סיסמה"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 duration-300 shadow-lg"
        >
          כניסה
        </button>
      </form>

      <div className="mt-10 pt-6 border-t border-gray-700 flex flex-col gap-4">
        <button 
            onClick={handleReload}
            className="w-full py-2 px-4 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-all text-sm"
        >
            מחיקת נתונים והתחלה מחדש
        </button>

        {onSwitchToTeamLogin && (
            <button 
                onClick={onSwitchToTeamLogin}
                className="text-sm text-cyan-500 hover:text-cyan-300 transition-colors underline mt-2"
            >
                כניסה לגרסת צוות / ניהול (Firebase)
            </button>
        )}
      </div>
    </div>
  );
};
