
import React, { useEffect, useState } from 'react';
import { getAllUsers } from '../services/firebaseService';
import { UserProfile } from '../types';
import { ArrowLeftIcon } from './icons/Icons';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (error) {
        console.error("Failed to load admin data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // פונקציית עזר לזיהוי הצבע הדומיננטי
  const getDominantColor = (scores?: any) => {
    if (!scores) return 'טרם בוצע';
    const { a, b, c, d } = scores;
    const results = [
        { color: 'אדום', val: a + c, code: 'bg-rose-500' },
        { color: 'צהוב', val: a + d, code: 'bg-yellow-500' },
        { color: 'ירוק', val: b + d, code: 'bg-green-500' },
        { color: 'כחול', val: b + c, code: 'bg-indigo-500' }
    ];
    results.sort((x, y) => y.val - x.val);
    return (
        <span className={`px-2 py-1 rounded text-xs text-white font-bold ${results[0].code}`}>
            {results[0].color}
        </span>
    );
  };

  const handleCopyTeamLink = () => {
      const baseUrl = window.location.origin + window.location.pathname;
      // מסיר סלאש אחרון אם קיים כדי למנוע כפילות
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const teamUrl = `${cleanBaseUrl}?mode=team`;
      
      navigator.clipboard.writeText(teamUrl).then(() => {
          setCopySuccess('הקישור הועתק!');
          setTimeout(() => setCopySuccess(''), 3000);
      }).catch(err => {
          console.error('Failed to copy: ', err);
      });
  };

  // סינון לפי צוות
  const filteredUsers = filterTeam 
    ? users.filter(u => u.team.toLowerCase().includes(filterTeam.toLowerCase())) 
    : users;

  // רשימת צוותים ייחודית
  const teams = Array.from(new Set(users.map(u => u.team))).filter(Boolean);

  return (
    <div className="bg-gray-900 p-4 sm:p-8 min-h-screen animate-fade-in">
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="text-center sm:text-right">
                    <h2 className="text-3xl font-bold text-cyan-300">לוח בקרה - ניהול צוותים</h2>
                    <p className="text-gray-400 text-sm mt-1">צפה בנתונים ונהל משתמשים</p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleCopyTeamLink} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                        {copySuccess || 'העתק קישור הרשמה לצוות'}
                    </button>

                    <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white border border-gray-600 px-4 py-2 rounded-lg text-sm">
                        <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                        <span>חזרה</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-r-4 border-cyan-500">
                    <div className="text-gray-400 text-sm">סה"כ משתמשים</div>
                    <div className="text-4xl font-bold text-white">{users.length}</div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-r-4 border-purple-500">
                    <div className="text-gray-400 text-sm">שאלונים שהושלמו</div>
                    <div className="text-4xl font-bold text-white">{users.filter(u => u.scores).length}</div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-r-4 border-green-500">
                    <div className="text-gray-400 text-sm">צוותים פעילים</div>
                    <div className="text-4xl font-bold text-white">{teams.length}</div>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">רשימת משתתפים</h3>
                    <select 
                        value={filterTeam} 
                        onChange={(e) => setFilterTeam(e.target.value)}
                        className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-cyan-500"
                    >
                        <option value="">כל הצוותים</option>
                        {teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-gray-300">
                        <thead className="bg-gray-700 text-gray-200 uppercase text-sm">
                            <tr>
                                <th className="py-3 px-6">שם</th>
                                <th className="py-3 px-6">צוות</th>
                                <th className="py-3 px-6">אימייל</th>
                                <th className="py-3 px-6">סטטוס</th>
                                <th className="py-3 px-6">פרופיל ראשי</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-8">טוען נתונים...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8">לא נמצאו משתמשים</td></tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="py-3 px-6 font-medium text-white">{user.displayName || 'ללא שם'}</td>
                                        <td className="py-3 px-6">{user.team}</td>
                                        <td className="py-3 px-6 text-sm">{user.email}</td>
                                        <td className="py-3 px-6">
                                            {user.scores ? 
                                                <span className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded-full">הושלם</span> : 
                                                <span className="text-gray-500 text-xs bg-gray-700/50 px-2 py-1 rounded-full">טרם התחיל</span>
                                            }
                                        </td>
                                        <td className="py-3 px-6">
                                            {getDominantColor(user.scores)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};
