import React, { useState, useEffect } from 'react';
import { validateAccessCode, getTeamByName, AccessValidationResult } from '../services/firebaseService';
import { UserSession } from '../types';
import { Users, User, ShieldCheck, KeyRound } from 'lucide-react';
import { useT } from '../i18n/useT';

interface PasswordScreenProps {
  onAuthenticate: (session: UserSession) => void;
  onAdminLogin?: (email: string, pass: string) => Promise<void>;
  hasDatabaseConnection?: boolean;
}

export const PasswordScreen: React.FC<PasswordScreenProps> = ({ 
  onAuthenticate, 
  onAdminLogin, 
  hasDatabaseConnection = true 
}) => {
  const { t } = useT();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'workshop'>('personal');
  
  // Personal Code State
  const [personalCode, setPersonalCode] = useState('');
  const [personalError, setPersonalError] = useState('');
  const [personalLoading, setPersonalLoading] = useState(false);

  // Workshop / Team State
  const [participantName, setParticipantName] = useState('');
  const [teamCodeOrName, setTeamCodeOrName] = useState('');
  const [workshopError, setWorkshopError] = useState('');
  const [workshopLoading, setWorkshopLoading] = useState(false);
  const [lockedTeamName, setLockedTeamName] = useState<string | null>(null);

  // Admin Mode State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Auto-detect link parameters (?code=... or ?team=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    const teamParam = params.get('team');

    // (No public team listing — joining requires a valid access code or a direct ?team= link the admin shared.)

    if (teamParam) {
      setActiveTab('workshop');
      setLockedTeamName(teamParam);
      setTeamCodeOrName(teamParam);
    } else if (codeParam) {
      // Auto validate the code
      setPersonalLoading(true);
      validateAccessCode(codeParam).then((res: AccessValidationResult) => {
        setPersonalLoading(false);
        if (res.valid) {
          if (res.type === 'team' || (res.teamName && res.teamName !== 'General')) {
            setActiveTab('workshop');
            setLockedTeamName(res.teamName || codeParam);
            setTeamCodeOrName(codeParam);
          } else {
            // Direct personal login!
            onAuthenticate({
              type: 'personal',
              accessCode: codeParam.toUpperCase(),
              teamName: res.teamName,
              companyName: res.companyName,
              logoUrl: res.logoUrl,
              orgContext: res.orgContext,
              knowledgeBase: res.knowledgeBase
            });
          }
        } else {
          setPersonalCode(codeParam);
          setPersonalError(res.message || t('password', 'invalidCode'));
        }
      });
    }
  }, []);

  // Handle Personal Submit
  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalError('');
    if (!personalCode.trim()) {
      setPersonalError(t('password', 'personalMissing'));
      return;
    }

    setPersonalLoading(true);
    try {
      const validation = await validateAccessCode(personalCode.trim());
      setPersonalLoading(false);

      if (validation.valid) {
        onAuthenticate({
          type: 'personal',
          accessCode: personalCode.trim().toUpperCase(),
          teamName: validation.teamName,
          companyName: validation.companyName,
          logoUrl: validation.logoUrl,
          orgContext: validation.orgContext,
          knowledgeBase: validation.knowledgeBase
        });
      } else {
        setPersonalError(validation.message || t('password', 'wrongCode'));
      }
    } catch (err: any) {
      setPersonalLoading(false);
      setPersonalError(t('password', 'codeCheckError'));
    }
  };

  // Handle Workshop Guest Submit
  const handleWorkshopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkshopError('');

    if (!participantName.trim()) {
      setWorkshopError(t('password', 'fullNameMissing'));
      return;
    }

    const teamToUse = lockedTeamName || teamCodeOrName.trim();
    if (!teamToUse) {
      setWorkshopError(t('password', 'workshopCodeMissing'));
      return;
    }

    setWorkshopLoading(true);
    try {
      // Validate the code — required unless we arrived via a locked (?team=) link the admin shared directly.
      let resolvedTeam = teamToUse;
      if (!lockedTeamName) {
        const val = await validateAccessCode(teamToUse);
        if (!val.valid) {
          setWorkshopLoading(false);
          setWorkshopError(val.message || t('password', 'invalidWorkshopCode'));
          return;
        }
        resolvedTeam = val.teamName || teamToUse;
      }

      // Fetch the team's co-branding/org context/knowledge base (needed even when
      // lockedTeamName came straight from a ?team= link, since that path skips validateAccessCode)
      const teamData = await getTeamByName(resolvedTeam);

      setWorkshopLoading(false);
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      onAuthenticate({
        type: 'team',
        displayName: participantName.trim(),
        teamName: resolvedTeam,
        participantId: guestId,
        accessCode: teamToUse.toUpperCase(),
        companyName: teamData?.companyName,
        logoUrl: teamData?.logoUrl,
        orgContext: teamData?.orgContext,
        knowledgeBase: teamData?.knowledgeBase
      });
    } catch (err) {
      setWorkshopLoading(false);
      setWorkshopError(t('password', 'joinError'));
    }
  };

  // Handle Admin Submit
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (!adminEmail || !adminPassword) {
      setAdminError(t('password', 'adminMissing'));
      return;
    }
    if (!onAdminLogin) return;

    setAdminLoading(true);
    try {
      await onAdminLogin(adminEmail, adminPassword);
    } catch (err: any) {
      setAdminError(t('password', 'adminWrong'));
    } finally {
      setAdminLoading(false);
    }
  };

  // Centered Professional Logo
  const Branding = () => (
    <div className="mb-8 flex flex-col items-center">
      <a 
        href="https://kilon-consulting.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="group transition-all duration-300 transform hover:scale-105 inline-block text-center"
      >
        <div className="flex items-baseline justify-center leading-none">
          <span className="text-gray-300 font-light" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', letterSpacing: '0.05em' }}>
            GILAD&nbsp;
          </span>
          <span className="text-white font-black" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', letterSpacing: '0.02em' }}>
            KILON
          </span>
          <span className="text-cyan-400 font-black" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.1rem)', lineHeight: 1, marginLeft: '3px' }}>
            .
          </span>
        </div>
        <div className="text-gray-500 font-semibold uppercase text-center" style={{ fontSize: '0.58rem', letterSpacing: '0.32em', marginTop: '8px', borderTop: '1px solid rgba(75,85,99,0.5)', paddingTop: '7px' }}>
          MANAGEMENT CONSULTING
        </div>
      </a>
    </div>
  );

  // Admin View
  if (isAdminMode) {
    return (
      <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl text-center max-w-md mx-auto animate-fade-in-up border border-gray-700">
        <Branding />
        <h2 className="text-2xl font-bold text-gray-200 mb-6 flex items-center justify-center gap-2">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
          <span>{t('password', 'adminTitle')}</span>
        </h2>
        <form onSubmit={handleAdminSubmit} className="space-y-4" autoComplete="off">
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500"
            placeholder={t('password', 'adminEmailPlaceholder')}
            dir="ltr"
          />
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500"
            placeholder={t('password', 'adminPasswordPlaceholder')}
            dir="ltr"
          />
          {adminError && <p className="text-red-400 text-sm font-bold">{adminError}</p>}
          <button
            type="submit"
            disabled={adminLoading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg"
          >
            {adminLoading ? t('password', 'adminConnecting') : t('password', 'adminSubmit')}
          </button>
        </form>
        <button 
          onClick={() => { setIsAdminMode(false); setAdminError(''); }} 
          className="mt-6 text-xs text-gray-500 hover:text-cyan-400 underline transition-colors"
        >
          {t('password', 'adminBack')}
        </button>
      </div>
    );
  }

  // Simplified Main View
  return (
    <div className="max-w-4xl w-full mx-auto animate-fade-in-up px-4 pb-12">
      <Branding />

      {/* Direct workshop join banner if team is pre-locked from URL */}
      {lockedTeamName && (
        <div className="mb-6 bg-cyan-900/40 border border-cyan-500/50 p-4 rounded-2xl text-center shadow-lg">
          <p className="text-cyan-300 font-bold text-lg">
            🎯 {t('password', 'invitedTo')} <span className="text-white font-black">{lockedTeamName}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">{t('password', 'invitedHint')}</p>
        </div>
      )}

      {/* Tab Switcher (Only if not locked to a specific team) */}
      {!lockedTeamName && (
        <div className="flex bg-gray-800/90 p-1.5 rounded-2xl max-w-md mx-auto mb-8 border border-gray-700 shadow-lg">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'personal'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t('password', 'tabPersonal')}</span>
          </button>
          <button
            onClick={() => setActiveTab('workshop')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'workshop'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('password', 'tabWorkshop')}</span>
          </button>
        </div>
      )}

      {/* TAB CONTENT: PERSONAL */}
      {activeTab === 'personal' && !lockedTeamName && (
        <div className="bg-gray-800/90 backdrop-blur-sm p-8 md:p-10 rounded-3xl border border-gray-700 shadow-2xl max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-cyan-400">
            <KeyRound className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{t('password', 'personalTitle')}</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            {t('password', 'personalSubtitle')}
          </p>

          <form onSubmit={handlePersonalSubmit} className="space-y-4" autoComplete="off">
            <div>
              <input
                type="text"
                value={personalCode}
                onChange={(e) => setPersonalCode(e.target.value)}
                placeholder={t('password', 'personalPlaceholder')}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500 text-lg font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-600"
                dir="ltr"
                autoFocus
              />
            </div>

            {personalError && (
              <p className="text-red-400 text-sm font-semibold bg-red-900/20 p-2.5 rounded-xl border border-red-500/30">
                {personalError}
              </p>
            )}

            <button
              type="submit"
              disabled={personalLoading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 px-8 rounded-xl transition-all text-lg shadow-xl active:scale-[0.99]"
            >
              {personalLoading ? t('password', 'checkingCode') : t('password', 'startPersonal')}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-700/60 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>{t('password', 'privacyNote')}</span>
          </div>
        </div>
      )}

      {/* TAB CONTENT: WORKSHOP / TEAM */}
      {(activeTab === 'workshop' || lockedTeamName) && (
        <div className="bg-gray-800/90 backdrop-blur-sm p-8 md:p-10 rounded-3xl border-2 border-cyan-500/40 shadow-2xl max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-cyan-400">
            <Users className="w-8 h-8" />
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            {lockedTeamName ? `${t('password', 'workshopTitleLocked')}${lockedTeamName}` : t('password', 'workshopTitle')}
          </h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            {t('password', 'workshopSubtitle')}
          </p>

          <form onSubmit={handleWorkshopSubmit} className="space-y-4 text-right" autoComplete="off">
            <div>
              <label className="block text-gray-400 text-xs mb-1.5 font-semibold mr-1">{t('password', 'fullNameLabel')}</label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder={t('password', 'fullNamePlaceholder')}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3.5 px-4 text-white text-right focus:ring-2 focus:ring-cyan-500 text-base"
                autoFocus
              />
            </div>

            {!lockedTeamName && (
              <div>
                <label className="block text-gray-400 text-xs mb-1.5 font-semibold mr-1">{t('password', 'workshopCodeLabel')}</label>
                <input
                  type="text"
                  value={teamCodeOrName}
                  onChange={(e) => setTeamCodeOrName(e.target.value)}
                  placeholder={t('password', 'workshopCodePlaceholder')}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3.5 px-4 text-white text-center focus:ring-2 focus:ring-cyan-500 text-base font-mono uppercase"
                  dir="ltr"
                />
              </div>
            )}

            {workshopError && (
              <p className="text-red-400 text-sm font-semibold bg-red-900/20 p-2.5 rounded-xl border border-red-500/30 text-center">
                {workshopError}
              </p>
            )}

            <button
              type="submit"
              disabled={workshopLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-4 px-8 rounded-xl transition-all text-lg shadow-xl active:scale-[0.99] mt-2"
            >
              {workshopLoading ? t('password', 'joining') : t('password', 'joinStart')}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-700/60 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>{t('password', 'noSignupNote')}</span>
          </div>
        </div>
      )}

      {/* Discreet Admin Link */}
      <div className="text-center mt-10">
        <button 
          onClick={() => { setIsAdminMode(true); setAdminError(''); }} 
          className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors py-2 px-4 rounded-lg hover:bg-gray-800/40"
        >
          {t('password', 'adminEntry')}
        </button>
      </div>
    </div>
  );
};

