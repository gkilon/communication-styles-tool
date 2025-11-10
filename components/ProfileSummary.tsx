import React, { useMemo } from 'react';
import { Scores, Profile } from '../types';
import { PROFILE_DESCRIPTIONS } from '../constants/profileDescriptions';
import { CheckCircleIcon, XCircleIcon } from './icons/Icons';

interface ProfileSummaryProps {
  scores: Scores;
}

const getDominantProfile = (scores: Scores): Profile => {
    const areas = {
      RED: scores.a * scores.c,
      BLUE: scores.b * scores.c,
      YELLOW: scores.a * scores.d,
      GREEN: scores.b * scores.d,
    };
    const dominantKey = Object.keys(areas).reduce((a, b) => areas[a as keyof typeof areas] > areas[b as keyof typeof areas] ? a : b);
    return PROFILE_DESCRIPTIONS[dominantKey];
};


export const ProfileSummary: React.FC<ProfileSummaryProps> = ({ scores }) => {
  const profile = useMemo(() => getDominantProfile(scores), [scores]);

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-2xl font-bold text-cyan-300 mb-4">ניתוח פרופיל (דומיננטי)</h3>
      <div className="flex-grow space-y-6">
        <div>
          <h4 className={`text-2xl font-semibold ${profile.color}`}>{profile.name}</h4>
          <p className="text-gray-300 mt-2">{profile.description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-lg font-bold text-gray-200 mb-3 flex items-center">
              <CheckCircleIcon className="w-6 h-6 ml-2" />
              חוזקות
            </h5>
            <ul className="space-y-2">
              {profile.strengths.map((s, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-gray-400 mt-1 ml-2">✓</span>
                  <span className="text-gray-300">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-lg font-bold text-gray-200 mb-3 flex items-center">
              <XCircleIcon className="w-6 h-6 ml-2" />
              אזורים לפיתוח
            </h5>
            <ul className="space-y-2">
              {profile.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-gray-400 mt-1 ml-2">✗</span>
                  <span className="text-gray-300">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};