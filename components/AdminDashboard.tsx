import React, { useEffect, useState, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  getAllUsers,
  createTeam,
  getTeams,
  updateUserTeam,
  deleteUserProfile,
  updateUserDisplayName,
  getAccessCodes,
  createAccessCode,
  updateOrganizationDetails,
  deleteTeam,
  deleteAccessCode,
  getOrganizations,
  createOrganization,
  deleteOrganization,
  AccessCodeRecord
} from '../services/firebaseService';
import { UserProfile, Team, Organization, Scores } from '../types';
import { ArrowLeftIcon } from './icons/Icons';
import { TeamAiCoach } from './TeamAiCoach';
import { KeyRound, Copy, Check, Plus, Building2, BookOpen, Upload, Sparkles, Save, FileText, Trash2, Users, Settings as SettingsIcon, Pencil, X, ArrowUpDown } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
  onPreviewAsUser?: () => void;
}

type AdminTab = 'participants' | 'organizations' | 'settings';

// Random, hard-to-guess access code (no look-alike characters like 0/O or 1/I).
const generateStrongCode = (): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onPreviewAsUser }) => {
  const [tab, setTab] = useState<AdminTab>('participants');

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCodeRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Participants tab filters
  const [filterOrgId, setFilterOrgId] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [showMap, setShowMap] = useState(false);
  // Combined map: pick any set of teams, across any organizations, and see
  // everyone from all of them together on one map — fully independent of
  // the org/team quick-filter above.
  const [combinedTeamNames, setCombinedTeamNames] = useState<string[]>([]);
  const [showCombinedMap, setShowCombinedMap] = useState(false);
  const [quickMapTeamId, setQuickMapTeamId] = useState('');
  // Fully custom map: hand-pick individual users, regardless of team/org —
  // including people with no team at all.
  const [customUserIds, setCustomUserIds] = useState<string[]>([]);
  const [customMapTitle, setCustomMapTitle] = useState('');
  const [customUserSearch, setCustomUserSearch] = useState('');
  const [showCustomMap, setShowCustomMap] = useState(false);

  // Access code creation (lives on the Participants tab — it's what's used daily)
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeOrgId, setNewCodeOrgId] = useState('');
  const [newCodeTeamId, setNewCodeTeamId] = useState('');
  const [newCodeLimit, setNewCodeLimit] = useState(50);
  const [codeStatus, setCodeStatus] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Organizations tab
  const [newOrgName, setNewOrgName] = useState('');
  const [createOrgStatus, setCreateOrgStatus] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });
  const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<string>('');
  const [orgCompanyName, setOrgCompanyName] = useState('');
  const [orgLogoUrl, setOrgLogoUrl] = useState('');
  const [orgOrgContext, setOrgOrgContext] = useState('');
  const [orgKnowledgeBase, setOrgKnowledgeBase] = useState('');
  const [orgKnowledgeStatus, setOrgKnowledgeStatus] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });
  const orgLogoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamOrgId, setNewTeamOrgId] = useState('');
  const [createTeamStatus, setCreateTeamStatus] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  // Settings tab
  const [qPassword, setQPassword] = useState('');
  const [savePassStatus, setSavePassStatus] = useState('');

  useEffect(() => {
    loadData();
    fetchCurrentPassword();
  }, []);

  const fetchCurrentPassword = async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "access"));
      if (snap.exists()) setQPassword((snap.data() as any).questionnairePassword || 'inspire');
    } catch (e) {
      console.warn("Failed to fetch current password settings");
    }
  };

  const handleUpdatePassword = async () => {
    if (!qPassword.trim()) return;
    setSavePassStatus('שומר...');
    try {
      await setDoc(doc(db, "settings", "access"), { questionnairePassword: qPassword.trim() }, { merge: true });
      setSavePassStatus('הסיסמה עודכנה בהצלחה!');
      setTimeout(() => setSavePassStatus(''), 3000);
    } catch (e) {
      setSavePassStatus('שגיאה בעדכון הסיסמה');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, teamsData, codesData, orgsData] = await Promise.all([
        getAllUsers(),
        getTeams(),
        getAccessCodes(),
        getOrganizations()
      ]);
      setUsers(usersData);
      setTeams(teamsData);
      setAccessCodes(codesData);
      setOrganizations(orgsData);
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

  // ---------- Access codes ----------

  const handleCreateAccessCode = async () => {
    if (!newCodeName.trim() || !newCodeOrgId) return;
    setCodeStatus({ msg: 'יוצר קוד...', type: '' });
    try {
      const org = organizations.find(o => o.id === newCodeOrgId);
      const team = newCodeTeamId ? teams.find(t => t.id === newCodeTeamId) : undefined;
      await createAccessCode({
        code: newCodeName.trim(),
        organizationId: newCodeOrgId,
        teamId: newCodeTeamId || undefined,
        teamName: team?.name || org?.name,
        dailyLimit: Number(newCodeLimit) || 50,
        type: newCodeTeamId ? 'team' : 'personal'
      });
      setNewCodeName('');
      setNewCodeTeamId('');
      setCodeStatus({ msg: 'קוד הרישיון נוצר בהצלחה!', type: 'success' });
      loadData();
      setTimeout(() => setCodeStatus({ msg: '', type: '' }), 3000);
    } catch (err: any) {
      setCodeStatus({ msg: err.message || 'שגיאה ביצירת קוד', type: 'error' });
    }
  };

  const copyCodeLink = (code: string) => {
    const url = `${window.location.origin}/?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopiedCodeId(code);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleDeleteAccessCode = async (codeId: string) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את קוד הגישה "${codeId}"?`)) return;
    try {
      await deleteAccessCode(codeId);
      loadData();
    } catch (e: any) {
      alert("שגיאה במחיקת הקוד: " + (e.message || 'נסה שוב'));
    }
  };

  // ---------- Organizations ----------

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;
    setCreateOrgStatus({ msg: 'יוצר...', type: '' });
    try {
      await createOrganization(newOrgName.trim());
      setNewOrgName('');
      setCreateOrgStatus({ msg: 'הארגון נוצר בהצלחה!', type: 'success' });
      loadData();
      setTimeout(() => setCreateOrgStatus({ msg: '', type: '' }), 3000);
    } catch (e: any) {
      setCreateOrgStatus({ msg: e.message || 'שגיאה ביצירת הארגון', type: 'error' });
    }
  };

  const handleSelectOrgForEdit = (orgId: string) => {
    setSelectedOrgForEdit(orgId);
    setOrgKnowledgeStatus({ msg: '', type: '' });
    const found = organizations.find(o => o.id === orgId);
    if (found) {
      setOrgCompanyName(found.companyName || '');
      setOrgLogoUrl(found.logoUrl || '');
      setOrgOrgContext(found.orgContext || '');
      setOrgKnowledgeBase(found.knowledgeBase || '');
    } else {
      setOrgCompanyName('');
      setOrgLogoUrl('');
      setOrgOrgContext('');
      setOrgKnowledgeBase('');
    }
  };

  const handleSaveOrganization = async () => {
    if (!selectedOrgForEdit) return;
    setOrgKnowledgeStatus({ msg: 'שומר ידע ארגוני ומיתוג...', type: '' });
    try {
      await updateOrganizationDetails(selectedOrgForEdit, {
        companyName: orgCompanyName.trim(),
        logoUrl: orgLogoUrl.trim(),
        orgContext: orgOrgContext.trim(),
        knowledgeBase: orgKnowledgeBase.trim()
      });
      setOrgKnowledgeStatus({ msg: 'הידע הארגוני, המיתוג והחומרים נשמרו בהצלחה!', type: 'success' });
      loadData();
      setTimeout(() => setOrgKnowledgeStatus({ msg: '', type: '' }), 4000);
    } catch (err: any) {
      setOrgKnowledgeStatus({ msg: err.message || 'שגיאה בשמירת הידע הארגוני', type: 'error' });
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    const teamsUnder = teams.filter(t => t.organizationId === orgId);
    const warning = teamsUnder.length > 0
      ? `לארגון "${orgName}" יש ${teamsUnder.length} צוותים משויכים. מחיקת הארגון לא תמחק אותם, אבל הם יישארו בלי מיתוג/הקשר. להמשיך?`
      : `האם אתה בטוח שברצונך למחוק את הארגון "${orgName}"?`;
    if (!window.confirm(warning)) return;
    try {
      await deleteOrganization(orgId);
      if (selectedOrgForEdit === orgId) setSelectedOrgForEdit('');
      loadData();
    } catch (e: any) {
      alert("שגיאה במחיקת הארגון: " + (e.message || 'נסה שוב'));
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 160;
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setOrgLogoUrl(canvas.toDataURL('image/png'));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleKnowledgeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setOrgKnowledgeBase(prev => {
          const header = `\n\n--- תוכן מסמך אבחון: ${file.name} ---\n`;
          return prev ? `${prev}${header}${content}` : `${header}${content}`;
        });
      }
    };
    reader.readAsText(file);
  };

  // ---------- Teams ----------

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !newTeamOrgId) return;
    setCreateTeamStatus({ msg: 'יוצר...', type: '' });
    try {
      await createTeam(newTeamName.trim(), newTeamOrgId);
      setNewTeamName('');
      setCreateTeamStatus({ msg: 'הצוות נוצר בהצלחה!', type: 'success' });
      loadData();
      setTimeout(() => setCreateTeamStatus({ msg: '', type: '' }), 3000);
    } catch (e: any) {
      setCreateTeamStatus({ msg: e.message || 'שגיאה ביצירת הצוות', type: 'error' });
      if (e.code === 'permission-denied') setError('PERMISSION_DENIED');
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את הצוות "${teamName}"?`)) return;
    try {
      await deleteTeam(teamId);
      if (filterTeam === teamName) setFilterTeam('');
      loadData();
    } catch (e: any) {
      alert("שגיאה במחיקת הצוות: " + (e.message || 'נסה שוב'));
    }
  };

  // ---------- Participants ----------

  const handleMoveUser = async (userId: string, newTeam: string) => {
    if (!window.confirm(`האם להעביר את המשתמש לצוות "${newTeam}"?`)) return;
    setUpdatingUserId(userId);
    try {
      await updateUserTeam(userId, newTeam);
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, team: newTeam } : u));
    } catch (e) {
      alert("שגיאה בהעברת המשתמש");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleStartEditUser = (user: UserProfile) => {
    setEditingUserId(user.uid);
    setEditingDisplayName(user.displayName || '');
  };

  const handleSaveUserName = async (userId: string) => {
    const cleanName = editingDisplayName.trim();
    if (!cleanName) { alert('יש להזין שם משתמש'); return; }
    setUpdatingUserId(userId);
    try {
      await updateUserDisplayName(userId, cleanName);
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, displayName: cleanName } : u));
      setEditingUserId(null);
      setEditingDisplayName('');
    } catch (e: any) {
      alert('שגיאה בעדכון שם המשתמש: ' + (e.message || 'נסה שוב'));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, displayName: string) => {
    if (!window.confirm(`האם למחוק לצמיתות את "${displayName || 'המשתמש'}"? הפעולה לא ניתנת לביטול (התוצאות והשיוך לצוות יימחקו).`)) return;
    setUpdatingUserId(userId);
    try {
      await deleteUserProfile(userId);
      setUsers(prev => prev.filter(u => u.uid !== userId));
    } catch (e: any) {
      alert("שגיאה במחיקת המשתמש: " + (e.message || 'נסה שוב'));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getDominantColorInfo = (scores?: Scores) => {
    if (!scores) return null;
    const { a, b, c, d } = scores;
    const results = [
      { color: 'אדום', val: (a || 0) + (c || 0), code: 'bg-rose-500', border: 'border-rose-300' },
      { color: 'צהוב', val: (a || 0) + (d || 0), code: 'bg-yellow-400', border: 'border-yellow-200' },
      { color: 'ירוק', val: (b || 0) + (d || 0), code: 'bg-green-500', border: 'border-green-300' },
      { color: 'כחול', val: (b || 0) + (c || 0), code: 'bg-indigo-500', border: 'border-indigo-300' }
    ];
    results.sort((x, y) => y.val - x.val);
    return results[0];
  };

  const renderDominantColorBadge = (scores?: any) => {
    const info = getDominantColorInfo(scores);
    if (!info) return <span className="text-gray-600 italic">לא נקבע</span>;
    return (
      <span className={`px-2 py-1 rounded text-xs text-white font-bold ${info.code}`}>
        {info.color}
      </span>
    );
  };

  // Teams scoped to the selected org (for the participants-tab filter and the
  // access-code form) — an org must be picked first, team choices narrow from there.
  const teamsInFilterOrg = filterOrgId ? teams.filter(t => t.organizationId === filterOrgId) : teams;
  const teamsInCodeOrg = newCodeOrgId ? teams.filter(t => t.organizationId === newCodeOrgId) : [];

  const filteredUsers = users.filter(u => {
    if (filterTeam && u.team !== filterTeam) return false;
    if (filterOrgId) {
      const orgTeamNames = teams.filter(t => t.organizationId === filterOrgId).map(t => t.name);
      if (!orgTeamNames.includes(u.team)) return false;
    }
    const q = participantSearch.trim().toLocaleLowerCase();
    if (q && !(u.displayName || '').toLocaleLowerCase().includes(q) && !(u.email || '').toLocaleLowerCase().includes(q)) return false;
    return true;
  });
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return newestFirst ? tb - ta : ta - tb;
  });

  const toggleCombinedTeam = (teamName: string) => {
    setCombinedTeamNames(prev => prev.includes(teamName) ? prev.filter(n => n !== teamName) : [...prev, teamName]);
  };

  const combinedUsers = users.filter(u => combinedTeamNames.includes(u.team) && !!u.scores);

  const toggleCustomUser = (uid: string) => {
    setCustomUserIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const customUsers = users.filter(u => customUserIds.includes(u.uid));

  const customUserSearchResults = users.filter(u => {
    if (!customUserSearch.trim()) return true;
    const q = customUserSearch.trim().toLowerCase();
    return (u.displayName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  }).sort((a, b) => {
    const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return newestFirst ? tb - ta : ta - tb;
  });

  if (error === 'PERMISSION_DENIED') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 dir-rtl">
        <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-lg shadow-2xl border-2 border-red-500 text-center">
          <div className="flex flex-col items-center gap-4 mb-6">
            <span className="text-6xl">🛑</span>
            <h1 className="text-3xl font-bold text-red-500">מסד הנתונים נעול</h1>
          </div>
          <p className="text-lg mb-6">הצלחת להתחבר כמנהל, אך אין לך הרשאה לקרוא את הנתונים ב-Firebase. בדוק את ה-Rules בקונסול.</p>
          <button onClick={loadData} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-xl mb-4 transition-all">נסה שוב ↻</button>
          <button onClick={onBack} className="text-gray-400 hover:text-white underline text-sm block">יציאה מהמערכת</button>
        </div>
      </div>
    );
  }

  const TeamMap: React.FC<{ mapUsers: UserProfile[]; title: string }> = ({ mapUsers, title }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [showParticipantNames, setShowParticipantNames] = useState(true);
    const validUsers = mapUsers.filter(u => u.scores);
    if (validUsers.length === 0) return null;

    const profiles = validUsers.map(u => {
      const { a, b, c, d } = u.scores!;
      const horizontalTotal = (a + b) || 1;
      const verticalTotal = (c + d) || 1;
      const x = (a / horizontalTotal) * 100;
      const y = (d / verticalTotal) * 100;
      const distanceFromCenter = Math.min(1, Math.hypot((x - 50) / 50, (y - 50) / 50));
      return { user: u, x, y, distanceFromCenter, dominant: getDominantColorInfo(u.scores) };
    });

    const colorMeta: Record<string, { strength: string; gap: string; implication: string; action: string; code: string }> = {
      'אדום': { strength: 'הנעה לביצוע, החלטיות, מיקוד בתוצאות ויכולת לקדם החלטות.', gap: 'עשוי להיות פחות טבעי לצוות לייצר דחיפות, להציב גבולות, לתעדף ולסגור החלטות.', implication: 'נושאים עלולים להישאר בדיון זמן רב, או שלא יהיה ברור מי לוקח אחריות ומניע קדימה.', action: 'להגדיר בעלות ברורה על החלטות, אבני דרך, סדרי עדיפויות ומעקב ביצוע.', code: 'bg-rose-500' },
      'צהוב': { strength: 'יצירת קשרים, תקשורת פתוחה, השפעה, אנרגיה והעלאת רעיונות.', gap: 'עשוי להיות פחות טבעי לצוות לייצר התלהבות, לרתום אחרים, לחשוב בקול רם ולפתוח אפשרויות.', implication: 'הצוות עלול להתכנס מהר מדי לפתרונות מוכרים, או להתקשות לרתום ממשקים ושותפים.', action: 'לפנות מקום לסיעור מוחות, לשיתוף בעלי עניין ולהצגת ההיגיון והערך של מהלכים.', code: 'bg-yellow-400' },
      'ירוק': { strength: 'הקשבה, יציבות, סבלנות, התחשבות ובניית אמון ושיתוף פעולה.', gap: 'עשוי להיות פחות טבעי לצוות לעצור ולהקשיב, לזהות השפעה על אנשים ולבנות הסכמות.', implication: 'אנשים או ממשקים עלולים להרגיש שלא רואים אותם; מחלוקות עשויות להישאר מתחת לפני השטח.', action: 'לבדוק מי מושפע מהחלטה, להזמין קולות שונים ולתת מקום לשיחה על מתחים וצרכים.', code: 'bg-green-500' },
      'כחול': { strength: 'חשיבה אנליטית, דיוק, תכנון, בדיקת עובדות, איכות וזיהוי סיכונים.', gap: 'עשוי להיות פחות טבעי לצוות להעמיק בפרטים, לבחון נתונים, לתכנן ולבדוק הנחות.', implication: 'הצוות עלול להתקדם על בסיס הנחות לא בדוקות, לפספס סיכונים או לגלות מאוחר מדי פערי איכות.', action: 'להגדיר נקודות בקרה, לבדוק נתונים והנחות, ולתת זמן לחשיבה ולתכנון לפני ביצוע.', code: 'bg-indigo-500' }
    };

    const colorCounts = ['אדום', 'צהוב', 'ירוק', 'כחול'].map(color => ({
      color,
      count: profiles.filter(p => p.dominant?.color === color).length
    })).sort((a, b) => b.count - a.count);
    const represented = colorCounts.filter(c => c.count > 0);
    const leadingColors = represented.slice(0, 2);
    const missingColors = colorCounts.filter(c => c.count === 0);
    const underrepresentedColors = colorCounts.filter(c => c.count > 0 && c.count / profiles.length < 0.15);
    const averageDistance = profiles.reduce((sum, p) => sum + p.distanceFromCenter, 0) / profiles.length;
    const centerLabel = averageDistance < 0.35
      ? 'בממוצע, הנקודות קרובות למרכז: רבים מהפרופילים משלבים כמה סגנונות.'
      : averageDistance < 0.65
        ? 'יש בצוות שילוב בין פרופילים מגוונים לבין פרופילים בעלי סגנון מובהק יותר.'
        : 'בממוצע, הנקודות נוטות לקצוות: רבים מהפרופילים מציגים סגנון מובהק יותר.';
    const averageX = profiles.reduce((sum, p) => sum + p.x, 0) / profiles.length;
    const averageY = profiles.reduce((sum, p) => sum + p.y, 0) / profiles.length;
    const horizontalFocus = averageX > 57 ? 'נטייה יחסית ליוזמה, השפעה ונוכחות כלפי חוץ' : averageX < 43 ? 'נטייה יחסית לעיבוד שקט, התבוננות והעמקה' : 'איזון יחסי בין יוזמה ונוכחות כלפי חוץ לבין עיבוד והתבוננות';
    const verticalFocus = averageY < 43 ? 'נטייה יחסית למשימה, תוצאות וחשיבה שיטתית' : averageY > 57 ? 'נטייה יחסית לאנשים, יחסים ושיתוף פעולה' : 'איזון יחסי בין מיקוד במשימה לבין מיקוד באנשים וביחסים';
    const strengths = leadingColors.map(c => ({ text: colorMeta[c.color].strength }));
    const gaps = missingColors.map(c => ({ ...colorMeta[c.color] }));
    const lighterGaps = underrepresentedColors.map(c => ({ ...colorMeta[c.color] }));
    const diversityText = averageDistance < 0.35
      ? 'הקרבה למרכז מצביעה על פרופילים שמשלבים כמה סגנונות. זה עשוי לאפשר גמישות והתאמה לאנשים ולמצבים שונים. כדאי לבדוק האם הגמישות אכן באה לידי ביטוי, או שלעתים קשה לצוות לבחור כיוון פעולה ברור.'
      : averageDistance < 0.65
        ? 'יש שונות ברמת המובהקות של הסגנונות. פרופילים מגוונים יכולים לתווך בין גישות, בעוד פרופילים מובהקים עשויים להביא חדות ועוצמה. האתגר הוא להפוך את ההבדלים להשלמה ולא לחיכוך.'
        : 'פרופילים שנוטים לקצוות עשויים להביא קול ברור, מומחיות וסגנון פעולה מובחן. לצד זאת, הפערים בדרך קבלת ההחלטות, בתקשורת ובקצב עלולים להיות מורגשים יותר ולדרוש תרגום הדדי.';
    const primaryWatchouts = [
      ...gaps.map(g => ({ title: 'יכולת שעשויה להיות פחות זמינה לצוות', text: g.gap, implication: g.implication, action: g.action })),
      ...lighterGaps.map(g => ({ title: 'יכולת שעשויה לדרוש מאמץ מודע יותר', text: g.gap, implication: g.implication, action: g.action }))
    ];
    const watchouts = primaryWatchouts.length ? primaryWatchouts : [
      { title: 'אין פער בולט בייצוג הצבעים', text: 'כל ארבעת הסגנונות מופיעים לפחות במידה מסוימת.', implication: 'ייצוג במפה אינו מבטיח שהצוות משתמש בסגנון בזמן הנכון או נותן לו מקום בדיון.', action: 'בדקו באילו מצבים כל סגנון בא לידי ביטוי, ובאילו מצבים הוא נעלם.' }
    ];
    const leadingText = leadingColors.length
      ? 'בולטות במיוחד בחלוקת הפרופילים היכולות המתוארות להלן. ההתפלגות המספרית מוצגת בנפרד במפה.'
      : 'לא בולטת נטייה קבוצתית אחת בהרכב.';

    const handleExportPdf = async () => {
      if (!reportRef.current || exportingPdf) return;
      setExportingPdf(true);
      try {
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');
        const canvas = await html2canvas(reportRef.current, {
          scale: 2, backgroundColor: '#111827', useCORS: true, logging: false,
          windowWidth: Math.max(reportRef.current.scrollWidth, 900)
        });
        const imageData = canvas.toDataURL('image/jpeg', 0.94);
        const pageWidth = 210;
        const margin = 7;
        const imageWidth = pageWidth - margin * 2;
        const imageHeight = (canvas.height / canvas.width) * imageWidth;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageWidth, Math.max(280, imageHeight + margin * 2)] });
        pdf.addImage(imageData, 'JPEG', margin, margin, imageWidth, imageHeight, undefined, 'FAST');
        pdf.save('team-map-' + new Date().toISOString().slice(0, 10) + '.pdf');
      } catch (err) {
        console.error('PDF export failed:', err);
        alert('לא הצלחנו ליצור את קובץ ה־PDF. נסה שוב או רענן את העמוד.');
      } finally {
        setExportingPdf(false);
      }
    };

    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 mb-8 animate-fade-in-up">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <h3 className="text-xl font-bold text-cyan-300">מפה דינמית: {title}</h3>
          <label className="inline-flex items-center gap-2 text-sm text-gray-200 cursor-pointer select-none">
            <input type="checkbox" checked={showParticipantNames} onChange={e => setShowParticipantNames(e.target.checked)} className="w-4 h-4 accent-cyan-500" />
            הצג שמות ליד הנקודות
          </label>
          <button onClick={handleExportPdf} disabled={exportingPdf} className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all">
            <FileText className="w-4 h-4" />
            {exportingPdf ? 'מכין PDF...' : 'הורדת מפה וניתוח כ־PDF'}
          </button>
        </div>

        <div ref={reportRef} className="bg-gray-900 text-white rounded-xl p-5 sm:p-7 space-y-5" dir="rtl">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <h3 className="text-2xl font-bold text-cyan-300">מפת סגנונות התקשורת — {title}</h3>
              <p className="text-sm text-gray-400 mt-1">{profiles.length} משתתפים | ניתוח הרכב צוותי</p>
            </div>
            <div className="text-xs text-gray-300 flex flex-wrap gap-3"><span>🔵 כחול</span><span>🔴 אדום</span><span>🟢 ירוק</span><span>🟡 צהוב</span></div>
          </div>

          <div className="relative w-full max-w-lg mx-auto aspect-square bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-600 shadow-2xl" dir="ltr">
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-rose-900/30 border-b border-l border-gray-700/50"></div>
            <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-indigo-900/30 border-b border-gray-700/50"></div>
            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-yellow-900/30 border-l border-gray-700/50"></div>
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-green-900/30"></div>
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-500/70 transform -translate-x-1/2"></div>
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-500/70 transform -translate-y-1/2"></div>
            <div className="absolute top-3 left-3 text-white font-bold text-xs z-20">כחול</div>
            <div className="absolute top-3 right-3 text-white font-bold text-xs z-20">אדום</div>
            <div className="absolute bottom-3 left-3 text-white font-bold text-xs z-20">ירוק</div>
            <div className="absolute bottom-3 right-3 text-white font-bold text-xs z-20">צהוב</div>
            {profiles.map(({ user, x, y, dominant }) => (
              <div key={user.uid} className={'absolute w-5 h-5 rounded-full border-2 ' + (dominant ? dominant.border : 'border-white') + ' shadow-lg transform -translate-x-1/2 -translate-y-1/2 ' + (dominant ? dominant.code : 'bg-gray-400')} style={{ left: x + '%', top: y + '%' }}>
                {showParticipantNames && <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-950 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap shadow-xl border border-gray-600">{user.displayName || 'משתתף'}</div>}
              </div>
            ))}
          </div>

          <section className="space-y-3">
            <h4 className="text-xl font-bold text-cyan-300">תמונת מצב</h4>
            <p className="text-sm leading-7 text-gray-200">{leadingText} במבט על מיקום הנקודות: {horizontalFocus}; {verticalFocus}. {centerLabel}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['אדום', 'צהוב', 'ירוק', 'כחול'].map(color => {
                const item = colorCounts.find(c => c.color === color)!;
                return <div key={color} className="rounded-lg bg-gray-800 p-3 border border-gray-700">
                  <div className="text-xs text-gray-400">{color}</div>
                  <div className="text-xl font-bold text-white">{item.count} <span className="text-xs font-normal text-gray-400">({Math.round(item.count / profiles.length * 100)}%)</span></div>
                  <div className="h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden"><div className={'h-full ' + colorMeta[color].code} style={{ width: (item.count / profiles.length * 100) + '%' }}></div></div>
                </div>;
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xl font-bold text-emerald-300">חוזקות צוותיות אפשריות</h4>
            {strengths.length ? <ul className="list-disc pr-5 space-y-2 text-sm leading-6 text-gray-200">
              {strengths.map((s, index) => <li key={index}>{s.text}</li>)}
            </ul> : <p className="text-sm text-gray-300">לא בולט סגנון דומיננטי אחד בהרכב.</p>}
            <p className="text-xs text-gray-400">אלו משאבים שההרכב עשוי להביא איתו; הם אינם מבטיחים שכך הצוות פועל בפועל.</p>
          </section>

          <section className="space-y-3">
            <h4 className="text-xl font-bold text-amber-300">מה עלול להיות חסר — ומה עשויות להיות ההשלכות?</h4>
            {watchouts.map((item, index) => <div key={index} className="bg-gray-800 rounded-lg p-3 border border-gray-700 space-y-1">
              <div className="font-bold text-sm text-amber-200">{item.title}</div>
              <p className="text-sm text-gray-200">{item.text}</p>
              <p className="text-sm text-gray-300"><strong>השלכה אפשרית:</strong> {item.implication}</p>
              <p className="text-sm text-cyan-200"><strong>מה מנהל/ת או HR יכולים לעשות:</strong> {item.action}</p>
            </div>)}
          </section>

          <section className="space-y-2">
            <h4 className="text-xl font-bold text-cyan-300">גיוון מול מובהקות אישית</h4>
            <p className="text-sm leading-7 text-gray-200">{diversityText}</p>
            <p className="text-xs text-gray-400">ככל שנקודה קרובה יותר למרכז, הפרופיל מגוון יותר ומשלב בין סגנונות. ככל שהיא נוטה לקצה של אחד הרבעים, הסגנון המיוצג בו מובהק יותר.</p>
          </section>

          <section className="space-y-2 border-t border-gray-700 pt-4">
            <h4 className="text-xl font-bold text-cyan-300">מפת חשיבה אסטרטגית — מה יעזור לנו לממש את מטרות השנה?</h4>
            <p className="text-sm leading-7 text-gray-300">מומלץ להציב לצד המפה את 2–3 המטרות המרכזיות של הצוות לשנה הקרובה, ולבחון את ההרכב לאורן:</p>
            <ol className="list-decimal pr-5 space-y-3 text-sm leading-7 text-gray-200">
              <li><strong>מה נדרש מאיתנו כדי להצליח?</strong> אילו יכולות, דפוסי עבודה והתנהגויות יהיו קריטיים למימוש המטרות השנה — למשל קבלת החלטות מהירה, חדשנות, דיוק, שיתוף פעולה או הובלת שינוי?</li>
              <li><strong>על מה נוכל להישען?</strong> אילו מהיכולות האלה כבר קיימות אצלנו כחוזקה צוותית, ואיך נרתום אותן באופן מכוון לטובת המטרות?</li>
              <li><strong>מה עלול לעכב אותנו?</strong> אילו יכולות פחות זמינות בהרכב, או דורשות מאמץ מודע יותר? באילו יעדים, ממשקים או שלבים בתהליך החוסר הזה עלול להיות משמעותי במיוחד?</li>
              <li><strong>איך נשלים את הפער?</strong> מה נפתח בתוך הצוות, אילו שגרות או תפקידים נגדיר, ממי נבקש שותפות, ואיפה נכון להיעזר ביכולת חיצונית?</li>
              <li><strong>מה נתחיל לעשות אחרת כבר ברבעון הקרוב?</strong> בחרו התנהגות או שגרת עבודה אחת שתגדיל את הסיכוי לממש את המטרות, הגדירו לה בעלים וסימן הצלחה.</li>
            </ol>
          </section>

          <p className="text-xs text-gray-500 border-t border-gray-700 pt-3">
            הניתוח הוא השערה לדיון המבוססת על מפת הסגנונות והצבע הדומיננטי של המשתתפים, ולא מדידה של יכולת, ביצועים או התאמה לתפקיד. צבע שפחות מיוצג אינו מעיד שאין לאנשים בצוות יכולת לפעול כך; הוא רק עשוי לדרוש יותר מודעות ומאמץ מכוון.
          </p>
        </div>
        <TeamAiCoach users={mapUsers} teamName={title} />
      </div>
    );
  };

  const TabButton: React.FC<{ id: AdminTab; label: string; icon: React.ReactNode }> = ({ id, label, icon }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
        tab === id ? 'bg-cyan-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-gray-900 p-4 sm:p-8 min-h-screen animate-fade-in dir-rtl text-right">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-cyan-300">לוח בקרה מנהלים</h2>
            <p className="text-gray-400 text-sm mt-1 italic">ניהול משתתפים, ארגונים והגדרות מערכת</p>
            <p className="text-xs text-gray-500 mt-1">מחובר כ: <span className="text-cyan-400 font-bold" dir="ltr">{auth.currentUser?.email || '—'}</span></p>
          </div>
          <div className="flex items-center gap-2">
            {onPreviewAsUser && (
              <button onClick={onPreviewAsUser} className="flex items-center gap-2 text-cyan-300 hover:text-white border border-cyan-600/50 hover:bg-cyan-600 px-4 py-2 rounded-lg text-sm bg-cyan-900/30 transition-all font-bold">
                <span>בדוק כמשתמש</span>
              </button>
            )}
            <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white border border-gray-600 px-4 py-2 rounded-lg text-sm bg-gray-800">
              <ArrowLeftIcon className="w-4 h-4 rotate-180" />
              <span>התנתקות</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <TabButton id="participants" label="משתתפים וגישה" icon={<Users className="w-4 h-4" />} />
          <TabButton id="organizations" label="ארגונים ומיתוג" icon={<Building2 className="w-4 h-4" />} />
          <TabButton id="settings" label="הגדרות מערכת" icon={<SettingsIcon className="w-4 h-4" />} />
        </div>

        {tab === 'participants' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border-r-4 border-cyan-500">
                <div className="text-gray-400 text-sm mb-1">סה"כ רשומים</div>
                <div className="text-4xl font-black text-white">{loading ? '...' : users.length}</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border-r-4 border-purple-500">
                <div className="text-gray-400 text-sm mb-1">סיימו שאלון</div>
                <div className="text-4xl font-black text-white">{loading ? '...' : users.filter(u => u.scores).length}</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border-r-4 border-green-500">
                <div className="text-gray-400 text-sm mb-1">ארגונים פעילים</div>
                <div className="text-4xl font-black text-white">{loading ? '...' : organizations.length}</div>
              </div>
            </div>

            {/* Access code creation */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-8 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-cyan-400" />
                  <span>יצירת קוד גישה</span>
                </h3>
                <span className="text-xs text-gray-400">כל קוד חייב להיות משויך לארגון; שיוך לצוות ספציפי בתוכו אופציונלי</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value.toUpperCase())}
                    placeholder="קוד (לפחות 8 תווים)"
                    className="flex-1 min-w-0 bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => setNewCodeName(generateStrongCode())}
                    className="px-3 rounded-xl border border-cyan-600/50 text-cyan-300 hover:bg-cyan-600 hover:text-white text-xs font-bold transition-all whitespace-nowrap"
                    title="יצירת קוד אקראי וחזק"
                  >
                    אקראי
                  </button>
                </div>
                <select
                  value={newCodeOrgId}
                  onChange={(e) => { setNewCodeOrgId(e.target.value); setNewCodeTeamId(''); }}
                  className="bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                  <option value="">-- בחר ארגון --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <select
                  value={newCodeTeamId}
                  onChange={(e) => setNewCodeTeamId(e.target.value)}
                  disabled={!newCodeOrgId}
                  className="bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm disabled:opacity-40"
                >
                  <option value="">כל הארגון (בלי צוות ספציפי)</option>
                  {teamsInCodeOrg.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  onClick={handleCreateAccessCode}
                  disabled={!newCodeName.trim() || !newCodeOrgId || loading}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>צור קוד</span>
                </button>
              </div>
              {codeStatus.msg && (
                <p className={`mb-4 text-xs font-bold ${codeStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{codeStatus.msg}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {accessCodes.map(c => {
                  const org = organizations.find(o => o.id === c.organizationId);
                  return (
                    <div key={c.id || c.code} className="bg-gray-900/60 p-3.5 rounded-xl border border-gray-700 flex items-center justify-between group hover:border-cyan-500/50 transition-all">
                      <div className="overflow-hidden">
                        <div className="text-white font-bold font-mono truncate">{c.code}</div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {org?.name || 'ארגון לא ידוע'}{c.teamName ? ` — ${c.teamName}` : ''} · {c.dailyLimit}/יום
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => copyCodeLink(c.code)}
                          className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-all text-xs font-bold border border-cyan-600/30 flex items-center gap-1"
                        >
                          {copiedCodeId === c.code ? <><Check className="w-3.5 h-3.5" /> הועתק</> : <><Copy className="w-3.5 h-3.5" /> קישור</>}
                        </button>
                        <button
                          onClick={() => handleDeleteAccessCode(c.id || c.code)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="מחק קוד גישה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {accessCodes.length === 0 && <p className="text-gray-500 text-xs italic col-span-3">טרם נוצרו קודי גישה.</p>}
              </div>
            </div>

            {/* Combined map — pick any teams, across any organizations, no restriction */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-8 border border-purple-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">מפה משולבת (בחירה חופשית של צוותים)</h3>
                {combinedTeamNames.length > 0 && (
                  <button onClick={() => { setCombinedTeamNames([]); setShowCombinedMap(false); }} className="text-xs text-gray-400 hover:text-white underline">נקה בחירה</button>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">בחר צוות יחיד לבניית מפה מיידית, או שלב כמה צוותים ממספר ארגונים למפה אחת.</p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select value={quickMapTeamId} onChange={e => { const team = teams.find(t => t.id === e.target.value); setQuickMapTeamId(e.target.value); if (team) { setCombinedTeamNames([team.name]); setShowCombinedMap(true); } else { setCombinedTeamNames([]); setShowCombinedMap(false); } }} className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-3 text-sm">
                  <option value="">-- בחר צוות לבניית מפה אוטומטית --</option>
                  {teams.map(t => { const org = organizations.find(o => o.id === t.organizationId); const count = users.filter(u => u.team === t.name && u.scores).length; return <option key={t.id} value={t.id}>{t.name}{org ? ` · ${org.name}` : ''} ({count} בעלי אבחון)</option>; })}
                </select>
                <span className="text-xs text-gray-400 self-center">הבחירה תאתר אוטומטית את חברי הצוות שמילאו שאלון.</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {teams.map(t => {
                  const parentOrg = organizations.find(o => o.id === t.organizationId);
                  const active = combinedTeamNames.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleCombinedTeam(t.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${active ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-purple-500/50'}`}
                    >
                      {t.name}{parentOrg ? <span className="opacity-60 font-normal"> · {parentOrg.name}</span> : ''}
                    </button>
                  );
                })}
                {teams.length === 0 && <p className="text-gray-500 text-xs italic">אין עדיין צוותים במערכת.</p>}
              </div>
              <button
                onClick={() => setShowCombinedMap(true)}
                disabled={combinedTeamNames.length === 0}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all"
              >
                הצג מפה משולבת ({combinedUsers.length} משתתפים)
              </button>
              {showCombinedMap && combinedTeamNames.length > 0 && (
                <div className="mt-6">
                  <TeamMap mapUsers={combinedUsers} title={combinedTeamNames.join(' + ')} />
                </div>
              )}
            </div>

            {/* Fully custom map — hand-pick individual people, unassigned included */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-8 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">מפה מותאמת אישית (בחירת משתתפים בודדים)</h3>
                {customUserIds.length > 0 && (
                  <button onClick={() => { setCustomUserIds([]); setShowCustomMap(false); }} className="text-xs text-gray-400 hover:text-white underline">נקה בחירה</button>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">שליטה מלאה ברמת המשתמש — סמן כל אחד בנפרד, כולל משתתפים שלא משויכים לשום צוות. אפשר לחפש, למיין ולערוך שמות גם כאן.</p>

              <input
                type="text"
                value={customUserSearch}
                onChange={(e) => setCustomUserSearch(e.target.value)}
                placeholder="חיפוש לפי שם או אימייל..."
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="text-xs text-gray-400 self-center">{newestFirst ? 'מוצגים החדשים ביותר קודם' : 'מוצגים הוותיקים ביותר קודם'}</div>
                <button onClick={() => setNewestFirst(v => !v)} className="sm:mr-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-cyan-300 text-xs font-bold"><ArrowUpDown className="w-3.5 h-3.5" />{newestFirst ? 'חדשים קודם' : 'ותיקים קודם'}</button>
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-700 rounded-xl divide-y divide-gray-700/60 mb-4">
                {customUserSearchResults.length === 0 ? (
                  <p className="text-gray-500 text-xs italic p-4">לא נמצאו משתתפים.</p>
                ) : (
                  customUserSearchResults.map(u => {
                    const checked = customUserIds.includes(u.uid);
                    return (
                      <label key={u.uid} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-cyan-900/20' : 'hover:bg-gray-700/30'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleCustomUser(u.uid)} className="w-4 h-4 accent-cyan-500" />
                        <div className="overflow-hidden flex-1 min-w-0">
                          {editingUserId === u.uid ? <div className="flex items-center gap-2"><input value={editingDisplayName} onChange={e => setEditingDisplayName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveUserName(u.uid); if (e.key === 'Escape') setEditingUserId(null); }} className="min-w-0 flex-1 bg-gray-900 border border-cyan-600 rounded-lg px-2 py-1 text-sm text-white" /><button onClick={() => handleSaveUserName(u.uid)} disabled={updatingUserId === u.uid} className="text-green-400"><Check className="w-4 h-4" /></button><button onClick={() => setEditingUserId(null)} className="text-gray-400"><X className="w-4 h-4" /></button></div> : <><div className="text-sm text-white font-medium truncate">{u.displayName || 'משתמש ללא שם'}</div><div className="text-[11px] text-gray-500 truncate">{u.team || 'ללא צוות'}{u.scores ? ` · ${u.completedAt ? new Date(u.completedAt).toLocaleDateString('he-IL') : 'השלים שאלון'}` : ' · טרם מילא שאלון'}</div></>}
                        </div>
                        {editingUserId !== u.uid && <button type="button" onClick={() => handleStartEditUser(u)} title="ערוך שם משתתף" className="p-1 text-gray-500 hover:text-cyan-300"><Pencil className="w-3.5 h-3.5" /></button>}
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="text"
                  value={customMapTitle}
                  onChange={(e) => setCustomMapTitle(e.target.value)}
                  placeholder="שם לקבוצה (אופציונלי, לתצוגה בלבד)"
                  className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={() => setShowCustomMap(true)}
                  disabled={customUserIds.length === 0}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all whitespace-nowrap"
                >
                  הצג מפה ({customUserIds.length} נבחרו)
                </button>
              </div>

              {showCustomMap && customUserIds.length > 0 && (
                <div className="mt-6">
                  <TeamMap mapUsers={customUsers} title={customMapTitle.trim() || 'קבוצה מותאמת אישית'} />
                </div>
              )}
            </div>

            {/* Data Table & Map */}
            <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
              <div className="p-6 border-b border-gray-700 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-750">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-bold text-white">סינון:</h3>
                  <select
                    value={filterOrgId}
                    onChange={(e) => { setFilterOrgId(e.target.value); setFilterTeam(''); setShowMap(false); }}
                    className="bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-500 font-medium text-sm"
                  >
                    <option value="">-- כל הארגונים --</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <select
                    value={filterTeam}
                    onChange={(e) => { setFilterTeam(e.target.value); setShowMap(!!e.target.value); }}
                    disabled={!filterOrgId}
                    className="bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-500 font-medium text-sm disabled:opacity-40"
                  >
                    <option value="">כל הארגון</option>
                    {teamsInFilterOrg.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                {filterTeam && (
                  <button
                    onClick={() => setShowMap(!showMap)}
                    className={`px-6 py-2 rounded-full font-bold transition-all text-sm shadow-md ${showMap ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-cyan-400 hover:bg-gray-600'}`}
                  >
                    {showMap ? 'הצג רשימת שמות' : 'הצג מפת צוות'}
                  </button>
                )}
              </div>

              <div className="px-6 pt-5 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <input
                  value={participantSearch}
                  onChange={e => setParticipantSearch(e.target.value)}
                  placeholder="חיפוש לפי שם או דוא״ל..."
                  className="w-full sm:max-w-xs bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => setNewestFirst(v => !v)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-cyan-300 hover:border-cyan-500 text-sm font-bold"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {newestFirst ? 'החדשים ביותר קודם' : 'הוותיקים ביותר קודם'}
                </button>
              </div>
              <div className="p-0">
                {loading ? (
                  <div className="text-center py-20 text-gray-500 animate-pulse font-bold text-xl">טוען נתונים...</div>
                ) : showMap && filterTeam ? (
                  <div className="p-6"><TeamMap mapUsers={filteredUsers} title={filterTeam} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead className="bg-gray-900/50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-4 px-6">שם המשתתף</th>
                          <th className="py-4 px-6">צוות נוכחי</th>
                          <th className="py-4 px-6">תאריך מילוי</th>
                          <th className="py-4 px-6">סטטוס שאלון</th>
                          <th className="py-4 px-6">תוצאה דומיננטית</th>
                          <th className="py-4 px-6"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {sortedUsers.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-12 text-gray-500 font-medium">לא נמצאו משתמשים התואמים לסינון</td></tr>
                        ) : (
                          sortedUsers.map((user) => (
                            <tr key={user.uid} className="hover:bg-gray-700/30 transition-colors group">
                              <td className="py-4 px-6 min-w-[210px]">
                                {editingUserId === user.uid ? (
                                  <div className="flex items-center gap-2">
                                    <input autoFocus value={editingDisplayName} onChange={e => setEditingDisplayName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveUserName(user.uid); if (e.key === 'Escape') setEditingUserId(null); }} className="w-full min-w-0 bg-gray-900 border border-cyan-600 rounded-lg px-2 py-1.5 text-sm text-white outline-none" />
                                    <button onClick={() => handleSaveUserName(user.uid)} disabled={updatingUserId === user.uid} title="שמור שם" className="text-green-400 hover:text-green-300 disabled:opacity-40"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingUserId(null)} title="ביטול" className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="min-w-0"><div className="font-bold text-white group-hover:text-cyan-300 transition-colors">{user.displayName || 'משתמש ללא שם'}</div><div className="text-[10px] text-gray-500 dir-ltr text-right">{user.email}</div></div>
                                    <button onClick={() => handleStartEditUser(user)} title="ערוך שם" className="shrink-0 p-1 text-gray-500 hover:text-cyan-300 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={user.team}
                                    onChange={(e) => handleMoveUser(user.uid, e.target.value)}
                                    disabled={updatingUserId === user.uid}
                                    className={`bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500 transition-all text-cyan-200 ${updatingUserId === user.uid ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}`}
                                  >
                                    {teams.map(t => {
                                      const parentOrg = organizations.find(o => o.id === t.organizationId);
                                      return <option key={t.id} value={t.name}>{t.name}{parentOrg ? ` (${parentOrg.name})` : ''}</option>;
                                    })}
                                    {teams.every(t => t.name !== user.team) && <option value={user.team}>{user.team}</option>}
                                  </select>
                                  {updatingUserId === user.uid && <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>}
                                </div>
                              </td>
                              <td className="py-4 px-6 text-xs text-gray-300 whitespace-nowrap">{user.completedAt ? new Date(user.completedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : <span className="text-gray-600">—</span>}</td>
                              <td className="py-4 px-6">
                                {user.scores
                                  ? <span className="text-green-400 text-[10px] bg-green-900/20 px-2 py-1 rounded-full border border-green-800/50 font-bold uppercase tracking-tight">בוצע</span>
                                  : <span className="text-gray-500 text-[10px] bg-gray-900/50 px-2 py-1 rounded-full border border-gray-700 font-medium uppercase tracking-tight">טרם מולא</span>}
                              </td>
                              <td className="py-4 px-6">{renderDominantColorBadge(user.scores)}</td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => handleDeleteUser(user.uid, user.displayName)}
                                  disabled={updatingUserId === user.uid}
                                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30"
                                  title="מחק משתמש"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
          </>
        )}

        {tab === 'organizations' && (
          <>
            {/* Create + list organizations */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border-2 border-purple-500/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">ניהול ארגונים</h3>
                  <p className="text-xs text-gray-400">ארגון מחזיק את כל המיתוג, ההקשר התרבותי וה-Knowledge Base. צוותים בתוכו הם רק תוויות לחלוקה למפת צוות.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="שם הארגון (לדוגמה: בנק הפועלים)"
                  className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleCreateOrganization}
                  disabled={!newOrgName.trim() || loading}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-black py-3 px-8 rounded-xl disabled:opacity-50 transition-all shadow-lg"
                >
                  צור ארגון
                </button>
              </div>
              {createOrgStatus.msg && (
                <p className={`mb-4 text-sm font-bold ${createOrgStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{createOrgStatus.msg}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {organizations.map(org => {
                  const teamCount = teams.filter(t => t.organizationId === org.id).length;
                  return (
                    <div key={org.id} className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex items-center justify-between group hover:border-purple-500/50 transition-all">
                      <div className="overflow-hidden">
                        <div className="text-white font-bold truncate">{org.name}</div>
                        <div className="text-[11px] text-gray-400 truncate">{teamCount} צוותים</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSelectOrgForEdit(org.id)}
                          className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-all text-xs font-bold border border-purple-600/30"
                        >
                          ערוך
                        </button>
                        <button
                          onClick={() => handleDeleteOrganization(org.id, org.name)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="מחק ארגון"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {organizations.length === 0 && <p className="text-gray-500 text-sm italic">טרם נוצרו ארגונים.</p>}
              </div>

              {/* Org editor — the ONLY place branding/context/knowledge base is edited */}
              {selectedOrgForEdit ? (
                <div className="space-y-6 pt-4 border-t border-gray-700/80">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-xs font-bold mb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        <span>שם החברה / הארגון הממותג:</span>
                      </label>
                      <input
                        type="text"
                        value={orgCompanyName}
                        onChange={(e) => setOrgCompanyName(e.target.value)}
                        placeholder="למשל: בנק הפועלים / צ'ק פוינט / שטראוס"
                        className="w-full bg-gray-900 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-xs font-bold mb-1.5">לוגו החברה:</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={orgLogoUrl}
                          onChange={(e) => setOrgLogoUrl(e.target.value)}
                          placeholder="הדבק קישור, או העלה קובץ ←"
                          className="flex-1 bg-gray-900 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500"
                          dir="ltr"
                        />
                        <input type="file" ref={orgLogoInputRef} onChange={handleLogoFileUpload} accept="image/*" className="hidden" />
                        <button
                          type="button"
                          onClick={() => orgLogoInputRef.current?.click()}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-3 rounded-xl flex items-center gap-1.5 transition-all border border-gray-600 whitespace-nowrap"
                        >
                          <Upload className="w-3.5 h-3.5" /> <span>העלה</span>
                        </button>
                        {orgLogoUrl && (
                          <div className="w-12 h-12 bg-white/10 rounded-xl p-1 flex items-center justify-center border border-gray-700 overflow-hidden flex-shrink-0">
                            <img src={orgLogoUrl} alt="Logo" className="max-h-full max-w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-xs font-bold mb-1.5 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-yellow-400" />
                      <span>הקשר ותרבות ארגונית (דגשים קצרים ל-AI):</span>
                    </label>
                    <input
                      type="text"
                      value={orgOrgContext}
                      onChange={(e) => setOrgOrgContext(e.target.value)}
                      placeholder="למשל: סביבת עבודה בלחץ גבוה, דגש על שיתוף פעולה בין פיתוח למכירות..."
                      className="w-full bg-gray-900 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-gray-300 text-xs font-bold flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-green-400" />
                        <span>ערכים, תרבות וחומרי רקע (Knowledge Base):</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleKnowledgeFileUpload} accept=".txt,.md,.json" className="hidden" />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs py-1 px-3 rounded-lg flex items-center gap-1.5 transition-all border border-gray-600"
                        >
                          <Upload className="w-3.5 h-3.5" /> <span>טען קובץ (.txt / .md)</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={6}
                      value={orgKnowledgeBase}
                      onChange={(e) => setOrgKnowledgeBase(e.target.value)}
                      placeholder="הדבק כאן ערכי החברה, עמוד 'אודות', חזון ותרבות ארגונית..."
                      className="w-full bg-gray-900 text-white border border-gray-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-purple-500 leading-relaxed font-mono"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">💡 כל הצוותים תחת הארגון הזה יורשים את הטקסט הזה אוטומטית.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <button
                      onClick={handleSaveOrganization}
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                    >
                      <Save className="w-4 h-4" /> <span>שמור</span>
                    </button>
                    {orgKnowledgeStatus.msg && (
                      <p className={`text-sm font-bold ${orgKnowledgeStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{orgKnowledgeStatus.msg}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 bg-gray-900/40 rounded-xl border border-gray-800">
                  <p className="text-sm">בחר "ערוך" באחד הארגונים למעלה כדי להגדיר לוגו, הקשר וחומרי רקע.</p>
                </div>
              )}
            </div>

            {/* Create + list teams */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-8 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-400" /> צוותים (למפת צוות בלבד)</h3>
              <p className="text-xs text-gray-400 mb-4">צוות לא מחזיק מיתוג משלו — הוא רק מאפשר לסנן את מפת הצוות של הארגון לפי תת-קבוצה (מחלקה, סדנה וכו').</p>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="שם הצוות (לדוגמה: פיתוח)"
                  className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <select
                  value={newTeamOrgId}
                  onChange={(e) => setNewTeamOrgId(e.target.value)}
                  className="bg-gray-900 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                  <option value="">-- בחר ארגון (חובה) --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim() || !newTeamOrgId || loading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 px-8 rounded-xl disabled:opacity-50 transition-all shadow-lg"
                >
                  צור צוות
                </button>
              </div>
              {createTeamStatus.msg && (
                <p className={`mb-4 text-sm font-bold ${createTeamStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{createTeamStatus.msg}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {teams.map(team => {
                  const parentOrg = organizations.find(o => o.id === team.organizationId);
                  return (
                    <div key={team.id} className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex items-center justify-between group hover:border-cyan-500/50 transition-all">
                      <div className="overflow-hidden">
                        <div className="text-white font-bold truncate">{team.name}</div>
                        <div className="text-[11px] text-purple-300 font-medium truncate">{parentOrg?.name || '—'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/?team=${encodeURIComponent(team.name)}`;
                            navigator.clipboard.writeText(url);
                            alert(`הקישור לצוות "${team.name}" הועתק ללוח!`);
                          }}
                          className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all text-xs font-bold border border-cyan-600/30"
                        >
                          קישור
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {teams.length === 0 && <p className="text-gray-500 text-sm italic">טרם נוצרו צוותים.</p>}
              </div>
            </div>
          </>
        )}

        {tab === 'settings' && (
          <div className="max-w-md bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> הגדרות גישה</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">סיסמת שאלון אישי (ברירת מחדל)</label>
                <input
                  type="text"
                  value={qPassword}
                  onChange={(e) => setQPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  placeholder="לדוגמה: inspire"
                />
              </div>
              <button
                onClick={handleUpdatePassword}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-xl transition-all text-sm"
              >
                עדכן סיסמה
              </button>
              {savePassStatus && <p className="text-cyan-400 text-center text-xs font-bold animate-pulse">{savePassStatus}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
