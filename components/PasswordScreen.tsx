import React, { useState } from 'react';

interface PasswordScreenProps {
  onAuthenticate: (password: string) => boolean;
}

export const PasswordScreen: React.FC<PasswordScreenProps> = ({ onAuthenticate }) => {
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
    </div>
  );
};
