
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { createUserProfile } from '../services/firebaseService';

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [adminCode, setAdminCode] = useState(''); // New state for admin code
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        if (!name || !team) {
            setError("נא למלא שם מלא ושם צוות");
            setLoading(false);
            return;
        }

        // קביעת תפקיד המשתמש לפי קוד המנהל
        // שימוש בטיפוס מפורש כדי למנוע שגיאות TypeScript
        const role: 'user' | 'admin' = (adminCode === 'inspire') ? 'admin' : 'user';

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // שמירת הפרטים הנוספים במסד הנתונים
        await createUserProfile(userCredential.user.uid, {
            email,
            displayName: name,
            team: team,
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

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-md mx-auto animate-fade-in-up border border-gray-700">
      <h2 className="text-2xl font-bold text-cyan-300 mb-6">
        {isLogin ? 'כניסה למערכת' : 'הרשמה לצוות'}
      </h2>
      
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
                    <label className="block text-gray-400 text-sm mb-1 pr-2">שם צוות / ארגון</label>
                    <input
                        type="text"
                        value={team}
                        onChange={(e) => setTeam(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-cyan-500"
                        placeholder="מכירות / הנהלה / סייבר"
                    />
                </div>
            </>
        )}

        <div>
            <label className="block text-gray-400 text-sm mb-1 pr-2">אימייל</label>
            <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white ltr-text focus:ring-2 focus:ring-cyan-500"
            placeholder="your@email.com"
            required
            />
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-1 pr-2">סיסמה</label>
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-cyan-500"
            placeholder="******"
            required
            />
        </div>

        {!isLogin && (
            <div>
                <label className="block text-gray-400 text-xs mb-1 pr-2">קוד מנהל (אופציונלי)</label>
                <input
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-cyan-500 placeholder-gray-500"
                    placeholder="הזן קוד רק אם אתה מנהל"
                />
                <p className="text-xs text-gray-500 pr-2 mt-1">משתמשים רגילים יכולים להשאיר שדה זה ריק.</p>
            </div>
        )}

        {error && <p className="text-red-400 text-sm text-center bg-red-900/30 p-2 rounded">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all shadow-lg mt-4 disabled:opacity-50"
        >
          {loading ? 'טוען...' : (isLogin ? 'התחבר' : 'הירשם והתחל')}
        </button>
      </form>

      <div className="mt-6 text-sm text-gray-400">
        {isLogin ? 'עדיין אין לך חשבון? ' : 'כבר נרשמת? '}
        <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-cyan-400 underline hover:text-cyan-300"
        >
            {isLogin ? 'הירשם כאן' : 'התחבר כאן'}
        </button>
      </div>
    </div>
  );
};
