import React, { useState } from 'react';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';
import { ensureUserProfile } from '../services/firebaseService';
import { UserSession } from '../types';
import { KeyRound } from 'lucide-react';

interface AuthGateProps {
  session: UserSession;
  onDone: () => void; // called after the profile doc is written; App's onAuthStateChanged already updates `user`
}

// Shown once a valid access code has been entered, before the questionnaire —
// creates (or signs the person into) a real Firebase account so their AI coach
// and simulator progress can follow them back next time, from any device.
export const AuthGate: React.FC<AuthGateProps> = ({ session, onDone }) => {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(session.displayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const saveProfileAndFinish = async (uid: string, userEmail: string | null, name: string) => {
    await ensureUserProfile({
      uid,
      email: userEmail,
      displayName: name || 'משתתף',
      teamName: session.teamName
    });
    onDone();
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      await saveProfileAndFinish(u.uid, u.email, u.displayName || displayName);
    } catch (err: any) {
      console.error(err);
      setError('ההתחברות עם Google נכשלה. אפשר לנסות שוב או להשתמש באימייל וסיסמה למטה.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('נא למלא אימייל וסיסמה');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      setError('נא להזין שם');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        await saveProfileAndFinish(cred.user.uid, cred.user.email, displayName.trim());
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await saveProfileAndFinish(cred.user.uid, cred.user.email, cred.user.displayName || displayName);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('כבר יש חשבון עם האימייל הזה — עבור למסך "התחברות" למטה.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('אימייל או סיסמה שגויים.');
      } else if (err.code === 'auth/weak-password') {
        setError('הסיסמה קצרה מדי (לפחות 6 תווים).');
      } else {
        setError('משהו השתבש. נסה שוב.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('הזן קודם את כתובת האימייל שלך למעלה');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch {
      setError('שליחת קישור לאיפוס סיסמה נכשלה');
    }
  };

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm p-8 md:p-10 rounded-3xl border border-gray-700 shadow-2xl max-w-md mx-auto text-center animate-fade-in-up">
      <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-cyan-400">
        <KeyRound className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">כמעט שם</h2>
      <p className="text-gray-400 text-sm mb-6 leading-relaxed">
        רק צריך חשבון קטן כדי שהתוצאה והיועץ האישי יחכו לך גם בפעם הבאה.
      </p>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-bold py-3.5 rounded-xl transition-all shadow-lg mb-5 disabled:opacity-60"
      >
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.5-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 16.3 3 9.6 7.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 36.4 26.9 37 24 37c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 40.6 16.2 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.6l6.6 5.4C41.4 35.7 44 30.3 44 24c0-1.4-.1-2.5-.4-3.5z"/></svg>
        <span>המשך עם Google</span>
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-gray-700"></div>
        <span className="text-xs text-gray-500">או עם אימייל</span>
        <div className="flex-1 h-px bg-gray-700"></div>
      </div>

      <div className="flex bg-gray-900/60 p-1 rounded-xl mb-4 max-w-xs mx-auto">
        <button
          onClick={() => { setMode('signup'); setError(''); }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'signup' ? 'bg-cyan-600 text-white' : 'text-gray-400'}`}
        >
          משתתף/ת חדש/ה
        </button>
        <button
          onClick={() => { setMode('signin'); setError(''); }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'signin' ? 'bg-cyan-600 text-white' : 'text-gray-400'}`}
        >
          כבר יש לי חשבון
        </button>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-3" autoComplete="off">
        {mode === 'signup' && (
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="שם מלא"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל"
          dir="ltr"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          dir="ltr"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500"
        />

        {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
        {resetSent && <p className="text-green-400 text-xs font-bold">נשלח קישור לאיפוס סיסמה לאימייל שלך</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg disabled:opacity-60"
        >
          {loading ? 'רגע...' : mode === 'signup' ? 'צור חשבון והמשך' : 'התחבר/י'}
        </button>

        {mode === 'signin' && (
          <button type="button" onClick={handleForgotPassword} className="text-xs text-gray-500 hover:text-cyan-400 underline">
            שכחתי סיסמה
          </button>
        )}
      </form>

      <p className="text-[11px] text-gray-500 mt-5">
        בהמשך את/ה מאשר/ת את{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">מדיניות הפרטיות</a>
      </p>
    </div>
  );
};
