export type UserRole = 'student' | 'tutor' | 'admin';
export type AuthProviderType = 'google' | 'moe';

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  authProvider: AuthProviderType;
  school: string;
  institutionCode?: string;
  grade?: string;
  academicInstitution?: string;
  subjects: string[];
  xp: number;
}

export interface StudyMaterial {
  id: string;
  subject: string;
  topic: string;
  title: string;
  type: 'summary' | 'exercise' | 'video';
  difficulty?: 'קל' | 'בינוני' | 'רמת בגרות';
  content: string;
  solutionSteps?: string;
  videoUrl?: string;
  status: 'draft' | 'pending' | 'approved';
  searchCount: number;
}

export interface LiveCapsule {
  id: string;
  subject: string;
  topic: string;
  school: string;
  grade: string;
  lessonDate: string;
  uploaderName: string;
  sourceType: 'photo' | 'voice_note';
  aiSummary: string;
  keyFormulas: string[];
  solvedExample: string;
  quickQuiz: { question: string; answer: string }[];
}

export interface TutoringRequest {
  id: string;
  studentName: string;
  studentGrade: string;
  studentContact: string;
  subject: string;
  topic: string;
  preferredTime: string;
  clinicalBrief: string;
  status: 'open' | 'in_progress' | 'completed';
  assignedTutor?: string;
  createdAt: string;
}

export interface RadarAlert {
  id: string;
  school: string;
  grade: string;
  subject: string;
  topic: string;
  stuckPercentage: number;
  studentsAffected: number;
  severity: 'critical' | 'warning' | 'watch';
  recommendation: string;
  timeframe: string;
}