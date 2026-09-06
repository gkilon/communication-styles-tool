export interface QuestionPair {
  id: string;
  pair: [string, string];
  descriptions: [string, string]; // New field for short definitions
  columns: [keyof Scores, keyof Scores];
}

export interface Scores {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface Profile {
  name: string;
  color: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
}

export interface BackgroundData {
  gender: 'male' | 'female' | 'other' | '';
  isManager: 'yes' | 'no' | '';
  goal: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  team: string; // This will now refer to the Team Name
  teamId?: string;
  role: 'user' | 'admin';
  completedAt?: string; // ISO Date string
  scores?: Scores;
  backgroundData?: BackgroundData;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  companyName?: string;
  logoUrl?: string;
  orgContext?: string; // Short cultural & DNA description
  knowledgeBase?: string; // Diagnostic materials, surveys, leadership framework
  updatedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  organizationId?: string; // Parent Organization. When set, unset fields below fall back to the org's.
  companyName?: string;
  logoUrl?: string;
  orgContext?: string; // Short cultural & DNA description — overrides the org's if set
  knowledgeBase?: string; // Diagnostic materials, surveys, leadership framework — overrides the org's if set
  updatedAt?: string;
}

export interface UserSession {
  type: 'personal' | 'team';
  teamName?: string;
  companyName?: string;
  logoUrl?: string;
  orgContext?: string;
  knowledgeBase?: string;
  displayName?: string;
  participantId?: string;
  accessCode?: string;
}