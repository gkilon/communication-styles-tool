
import React, { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { getAllUsers, createTeam, getTeams } from '../services/firebaseService';
import { UserProfile, Team } from '../types';
import { ArrowLeftIcon } from './icons/Icons';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterTeam, setFilterTeam] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [createTeamStatus, setCreateTeamStatus] = useState<{msg: string, type: 'success' | 'error' | ''}>({msg:'', type:''});
  
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, teamsData] = await Promise.all([getAllUsers(), getTeams()]);
      setUsers(usersData);
      setTeams(teamsData);
    } catch (err: any) {
      console.error("Failed to load admin data", err);
      if (err.code === 'permission-denied' || err.message?.includes('permission-denied')) {
          setError('PERMISSION_DENIED');
      } else {
          setError(err.message || 'שגיאה לא ידועה בטעינת נתונים');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
      if (!newTeamName.trim()) return;
      setCreateTeamStatus({msg: 'יוצר...', type: ''});
      try {
          await createTeam(newTeamName.trim());
          setNewTeamName('');
          setCreateTeamStatus({msg: 'הצוות נוצר בהצלחה!', type: 'success'});
          loadData(); // Refresh
          setTimeout(() => setCreateTeamStatus({msg: '', type: ''}), 3000);
      } catch (e: any) {
          setCreateTeamStatus({msg: e.message || 'שגיאה ביצירת הצוות', type: 'error'});
          if (e.code === 'permission-denied') setError('PERMISSION_DENIED');
      }
  };

  // --- Render Helpers ---
  const getDominantColorInfo = (scores?: any) => {
    if (!scores) return null;
    const { a, b, c, d } = scores;
    const results = [
        { color: 'אדום', val: a + c, code: 'bg-rose-500' },
        { color: 'צהוב', val: a + d, code: 'bg-yellow-500' },
        { color: 'ירוק', val: b + d, code: 'bg-green-500' },
        { color: 'כחול', val: b + c, code: 'bg-indigo-500' }
    ];
    results.sort((x, y) => y.val - x.val);
    return results[0];
  };

  const renderDominantColorBadge = (scores?: any) => {
      const info = getDominantColorInfo(scores);
      if (!info) return 'טרם בוצע';
      return (
        <span className={`px-2 py-1 rounded text-xs text-white font-bold ${info.code}`}>
            {info.color}
        </span>
    );
  };

  const filteredUsers = filterTeam ? users.filter(u => u.team === filterTeam) : users;

  // --- ERROR VIEW: PERMISSION DENIED ---
  if (error === 'PERMISSION_DENIED') {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-6 dir-rtl">
            <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-lg shadow-2xl border-2 border-red-500">
                <div className="flex items-center gap-4 mb-6">
                    <span className="text-4xl">🛑</span>
                    <h1 className="text-3xl font-bold text-red-500">מסד הנתונים נעול</h1>
                </div>
                
                <p className="text-lg mb-6">
                    הצלחת להתחבר כמנהל, אך <strong>אין לך הרשאה לקרוא את הנתונים</strong> ב-Firebase Firestore.
                    זה קורה בדרך כלל כאשר ה-Rules מוגדרים במצב "Production" (חסימה מלאה) כברירת מחדל.
                </p>

                <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 mb-6">
                    <h3 className="text-xl font-bold text-cyan-400 mb-4">כיצד לתקן את זה (דקה עבודה):</h3>
                    <ol className="list-decimal list-inside space-y-3 text-gray-300">
                        <li>כנס ל-<strong>Firebase Console</strong>.</li>
                        <li>בתפריט הצד, בחר <strong>Firestore Database</strong>.</li>
                        <li>עבור ללשונית <strong>Rules</strong>.</li>
                        <li>שנה את השורה: <br/>
                            <code className="bg-black px-2 py-1 rounded text-red-300 font-mono text-sm inline-block mt-1">allow read, write: if false;</code>
                            <br/> ל- <br/>
                            <code className="bg-black px-2 py-1 rounded text-green-300 font-mono text-sm inline-block mt-1">allow read, write: if true;</code>
                        </li>
                        <li>לחץ על כפתור <strong>Publish</strong>.</li>
                    </ol>
                </div>

                <button 
                    onClick={loadData}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg mb-4 transition-all"
                >
                    ביצעתי, נסה לטעון שוב ↻
                </button>
                
                <button onClick={onBack} className="text-gray-400 hover:text-white underline text-sm block text-center w-full">
                    יציאה
                </button>
            </div>
        </div>
      );
  }

  // --- TEAM MAP ---
  const TeamMap = () => {
      if (!filterTeam || filteredUsers.length === 0) return null;

      return (
          <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 mb-8 animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-cyan-300">מפה צוותית: {filterTeam}</h3>
                  <div className="text-sm text-gray-400 flex gap-3">
                       <div className="flex gap-2">
                          <span className="w-3 h-3 bg-indigo-500 rounded-full"></span> כחול
                          <span className="w-3 h-3 bg-rose-500 rounded-full"></span> אדום
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span> ירוק
                          <span className="w-3 h-3 bg-yellow-500 rounded-full"></span> צהוב
                       </div>
                  </div>
              </div>

              <div className="relative w-full max-w-md mx-auto aspect-square bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-inner">
                  {/* Axes Labels */}
                  <div className="absolute top-2 left-2 text-xs text-indigo-400 font-bold opacity-50">מופנם/משימתי</div>
                  <div className="absolute top-2 right-2 text-xs text-rose-400 font-bold opacity-50">מוחצן/משימתי</div>
                  <div className="absolute bottom-2 left-2 text-xs text-green-400 font-bold opacity-50">מופנם/אנשים</div>
                  <div className="absolute bottom-2 right-2 text-xs text-yellow-400 font-bold opacity-50">מוחצן/אנשים</div>

                  {/* Center Crosshair */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-600/50"></div>
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-600/50"></div>

                  {/* Users Plot */}
                  {filteredUsers.map((u) => {
                      if (!u.scores) return null;
                      const { a, b, c, d } = u.scores;
                      const totalX = (a + b) || 1;
                      const totalY = (c + d) || 1;
                      
                      // X Axis: 0% (Left/Introvert) -> 100% (Right/Extrovert)
                      // A is Extrovert.
                      const xPos = (a / totalX) * 100;

                      // Y Axis: 0% (Top/Task) -> 100% (Bottom/People)
                      // D is People-oriented (Bottom-Right/Left)
                      const yPos = (d / totalY) * 100;

                      const domInfo = getDominantColorInfo(u.scores);
                      const dotColor = domInfo ? domInfo.code : 'bg-white';

                      return (
                          <div 
                            key={u.uid}
                            className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer ${dotColor} hover:scale-150 transition-transform z-10`}
                            style={{ left: `${xPos}%`, top: `${yPos}%` }}
                            title={`${u.displayName} (${Math.round(xPos)}%, ${Math.round(yPos)}%)`}
                          >
                              <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap z-20 border border-gray-600">
                                  {u.displayName}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )
  };

  // --- MAIN RENDER ---
  return (
    <div className="bg-gray-900 p-4 sm:p-8 min-h-screen animate-fade-in dir-rtl">
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="text-center sm:text-right">
                    <h2 className="text-3xl font-bold text-cyan-300">לוח בקרה - מנהל מערכת</h2>
                    <p className="text-gray-400 text-sm mt-1">מחובר כ: {auth.currentUser?.email}</p>
                </div>
                
                <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white border border-gray-600 px-4 py-2 rounded-lg text-sm">
                    <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                    <span>יציאה</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-r-4 border-cyan-500">
                    <div className="text-gray-400 text-sm">משתמשים</div>
                    <div className="text-4xl font-bold text-white">{loading ? '...' : users.length}</div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-r-4 border-purple-500">
                    <div className="text-gray-400 text-sm">הושלמו</div>
                    <div className="text-4xl font-bold text-white">{loading ? '...' : users.filter(u => u.scores).length}</div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-r-4 border-green-500">
                    <div className="text-gray-400 text-sm">צוותים</div>
                    <div className="text-4xl font-bold text-white">{loading ? '...' : teams.length}</div>
                </div>
            </div>

            {/* Create Team */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">הקמת צוות חדש</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <input 
                        type="text" 
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="שם הצוות (לדוגמה: מחלקת שיווק)"
                        className="flex-1 bg-gray-700 text-white border border-gray-600 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button 
                        onClick={handleCreateTeam}
                        disabled={!newTeamName.trim() || loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                        צור צוות
                    </button>
                </div>
                {createTeamStatus.msg && (
                    <p className={`mt-2 text-sm ${createTeamStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                        {createTeamStatus.msg}
                    </p>
                )}
            </div>

            {/* Data Table & Map */}
            <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-750">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-semibold text-white">סינון:</h3>
                        <select 
                            value={filterTeam} 
                            onChange={(e) => { setFilterTeam(e.target.value); setShowMap(false); }}
                            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">כל המשתמשים</option>
                            {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                    </div>
                    
                    {filterTeam && (
                        <button 
                            onClick={() => setShowMap(!showMap)}
                            className={`px-4 py-2 rounded-full font-bold transition-colors ${showMap ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-cyan-400 hover:bg-gray-600'}`}
                        >
                            {showMap ? 'הסתר מפה' : 'הצג מפה צוותית'}
                        </button>
                    )}
                </div>
                
                <div className="p-4">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400 animate-pulse">טוען נתונים...</div>
                    ) : showMap && filterTeam ? (
                        <TeamMap />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-gray-300">
                                <thead className="bg-gray-700 text-gray-200 uppercase text-sm">
                                    <tr>
                                        <th className="py-3 px-6">שם</th>
                                        <th className="py-3 px-6">צוות</th>
                                        <th className="py-3 px-6">אימייל</th>
                                        <th className="py-3 px-6">סטטוס</th>
                                        <th className="py-3 px-6">צבע ראשי</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {filteredUsers.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8">לא נמצאו משתמשים</td></tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.uid} className="hover:bg-gray-700/50 transition-colors">
                                                <td className="py-3 px-6 font-medium text-white">{user.displayName || 'ללא שם'}</td>
                                                <td className="py-3 px-6">{user.team}</td>
                                                <td className="py-3 px-6 text-sm text-gray-400 dir-ltr text-right">{user.email}</td>
                                                <td className="py-3 px-6">
                                                    {user.scores ? 
                                                        <span className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded-full border border-green-900">הושלם</span> : 
                                                        <span className="text-gray-500 text-xs bg-gray-700/50 px-2 py-1 rounded-full border border-gray-600">טרם התחיל</span>
                                                    }
                                                </td>
                                                <td className="py-3 px-6">
                                                    {renderDominantColorBadge(user.scores)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
