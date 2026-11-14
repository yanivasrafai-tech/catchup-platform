import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Star,
  Send,
  Search,
  PlayCircle,
  Camera,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Trash2,
  FileText,
  ArrowRight,
  User,
  LogOut,
  Loader2,
} from 'lucide-react';
import {
  UserRole,
  UserProfile,
  StudyMaterial,
  LiveCapsule,
  TutoringRequest,
  RadarAlert,
} from './types';
import {
  INITIAL_MATERIALS,
  INITIAL_CAPSULES,
  INITIAL_REQUESTS,
  INITIAL_RADAR_ALERTS,
} from './data/seedData';
import { askCatchyTutor, generateCapsuleFromInput } from './lib/gemini';
import { supabase, signInWithGoogle, signInOrSignUp, signOutUser } from './lib/supabase';

type StudentSection = 'home' | 'capsules' | 'library' | 'help' | 'profile';

async function resolveVerifiedUserRole(userId: string, email: string): Promise<UserRole> {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileData?.role && ['student', 'tutor', 'admin'].includes(profileData.role)) {
    return profileData.role as UserRole;
  }

  const lower = email.toLowerCase();
  if (lower.endsWith('@edu.gov.il') || lower.includes('admin')) return 'admin';
  if (lower.endsWith('.ac.il') || lower.includes('tutor')) return 'tutor';
  return 'student';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [section, setSection] = useState<StudentSection>('home');

  useEffect(() => {
    let isMounted = true;

    async function syncSession(sessionUser: any) {
      if (!sessionUser) {
        if (isMounted) {
          setCurrentUser(null);
          setIsAuthChecking(false);
        }
        return;
      }

      const email = sessionUser.email || '';
      const verifiedRole = await resolveVerifiedUserRole(sessionUser.id, email);

      if (isMounted) {
        setCurrentUser({
          name: sessionUser.user_metadata?.full_name || email.split('@')[0],
          email,
          role: verifiedRole,
          authProvider: 'email',
          school: 'אמית ישיבה תיכונית שדרות',
          grade: verifiedRole === 'student' ? 'י״א' : undefined,
          academicInstitution: verifiedRole === 'tutor' ? 'סגל אקדמי' : undefined,
          institutionCode: verifiedRole === 'admin' ? '614354' : undefined,
          subjects: ['מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳'],
          xp: 120,
        });
        setIsAuthChecking(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session?.user || null);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const [materials, setMaterials] = useState<StudyMaterial[]>(() => {
    const saved = localStorage.getItem('catchup_v2_materials');
    return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
  });

  const [capsules, setCapsules] = useState<LiveCapsule[]>(() => {
    const saved = localStorage.getItem('catchup_v2_capsules');
    return saved ? JSON.parse(saved) : INITIAL_CAPSULES;
  });

  const [requests, setRequests] = useState<TutoringRequest[]>(() => {
    const saved = localStorage.getItem('catchup_v2_requests');
    return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
  });

  const [radarAlerts] = useState<RadarAlert[]>(INITIAL_RADAR_ALERTS);

  const [progressMap, setProgressMap] = useState<Record<string, 'in_progress' | 'completed'>>(() => {
    const saved = localStorage.getItem('catchup_v2_progress');
    return saved ? JSON.parse(saved) : { 'mat-1': 'completed' };
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('catchup_v2_favorites');
    return saved ? JSON.parse(saved) : ['mat-1'];
  });

  useEffect(() => localStorage.setItem('catchup_v2_materials', JSON.stringify(materials)), [materials]);
  useEffect(() => localStorage.setItem('catchup_v2_capsules', JSON.stringify(capsules)), [capsules]);
  useEffect(() => localStorage.setItem('catchup_v2_requests', JSON.stringify(requests)), [requests]);
  useEffect(() => localStorage.setItem('catchup_v2_progress', JSON.stringify(progressMap)), [progressMap]);
  useEffect(() => localStorage.setItem('catchup_v2_favorites', JSON.stringify(favorites)), [favorites]);

  const [subjectFilter, setSubjectFilter] = useState<string>('הכל');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openSolutions, setOpenSolutions] = useState<Record<string, boolean>>({});

  const [selectedCapsule, setSelectedCapsule] = useState<LiveCapsule | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [capSubject, setCapSubject] = useState('מתמטיקה 5 יח׳');
  const [capTopic, setCapTopic] = useState('');
  const [capNotes, setCapNotes] = useState('');
  const [capImage, setCapImage] = useState('');
  const [isCreatingCapsule, setIsCreatingCapsule] = useState(false);

  const [chatSubject, setChatSubject] = useState('מתמטיקה 5 יח׳');
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: 'שלום! אני Catchy. כתוב לי כאן איזה נושא או תרגיל לא מובן לך, ואסביר לך אותו בעברית פשוטה צעד אחר צעד.',
    },
  ]);

  const [reqSubject, setReqSubject] = useState('מתמטיקה 5 יח׳');
  const [reqTopic, setReqTopic] = useState('');
  const [reqTime, setReqTime] = useState('היום אחה״צ (17:00–19:00)');
  const [reqContact, setReqContact] = useState('');
  const [createdClinicalPreview, setCreatedClinicalPreview] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('מתמטיקה 5 יח׳');
  const [newTopic, setNewTopic] = useState('');
  const [newType, setNewType] = useState<'summary' | 'exercise' | 'video'>('summary');
  const [newContent, setNewContent] = useState('');

  const handleGoogleLogin = async () => {
    setAuthError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setIsGoogleLoading(false);
      setAuthError(err?.message || 'שגיאה בהתחברות עם Google.');
    }
  };

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!emailInput.trim() || !passInput.trim()) {
      setAuthError('נא להזין אימייל וסיסמה.');
      return;
    }
    setIsLoggingIn(true);
    try {
      await signInOrSignUp(emailInput.trim(), passInput);
    } catch (err: any) {
      setIsLoggingIn(false);
      setAuthError(err?.message || 'שגיאה בהתחברות. ודא שהסיסמה באורך 6 תווים לפחות.');
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
    setSelectedCapsule(null);
    setSection('home');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCapImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capTopic.trim() || !currentUser) return;
    setIsCreatingCapsule(true);

    const result = await generateCapsuleFromInput(capSubject, capTopic, capNotes, capImage || undefined);

    const created: LiveCapsule = {
      id: `cap-${Date.now()}`,
      subject: capSubject,
      topic: capTopic,
      school: currentUser.school,
      grade: currentUser.grade || 'י״א',
      lessonDate: new Date().toLocaleDateString('he-IL'),
      uploaderName: `${currentUser.name} (${currentUser.grade || 'תלמיד/ה'})`,
      sourceType: capImage ? 'photo' : 'voice_note',
      aiSummary: result.aiSummary,
      keyFormulas: result.keyFormulas,
      solvedExample: result.solvedExample,
      quickQuiz: result.quickQuiz,
    };

    setCapsules([created, ...capsules]);
    setCurrentUser((p) => (p ? { ...p, xp: p.xp + 50 } : null));
    setIsCreatingCapsule(false);
    setShowUploadModal(false);
    setCapTopic('');
    setCapNotes('');
    setCapImage('');
    setSelectedCapsule(created);
  };

  const handleAskAI = async (preset?: string) => {
    const text = preset || chatInput;
    if (!text.trim()) return;
    setChatHistory((prev) => [...prev, { sender: 'user', text }]);
    if (!preset) setChatInput('');
    setIsChatLoading(true);
    const reply = await askCatchyTutor(text, chatSubject);
    setChatHistory((prev) => [...prev, { sender: 'ai', text: reply }]);
    setIsChatLoading(false);
  };

  const handleSendTutorRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTopic.trim() || !currentUser) return;

    const matchingCapsule = capsules.find((c) => c.subject === reqSubject);
    const clinicalBrief =
      `רקע לימודי אוטומטי: ${currentUser.name} (כיתה ${currentUser.grade || 'י״א'}, ${currentUser.school}) ביקש/ה עזרה ב-${reqSubject} בנושא "${reqTopic}". ` +
      (matchingCapsule
        ? `ב-${matchingCapsule.lessonDate} הועלה סיכום שיעור מהכיתה בנושא "${matchingCapsule.topic}". `
        : '') +
      `מומלץ להתחיל ישירות מתרגול יסודות הנושא "${reqTopic}" למשך 10 דקות ללא צורך בהסבר מקדים.`;

    const newRequest: TutoringRequest = {
      id: `req-${Date.now()}`,
      studentName: currentUser.name,
      studentGrade: currentUser.grade || 'י״א',
      studentContact: reqContact,
      subject: reqSubject,
      topic: reqTopic,
      preferredTime: reqTime,
      clinicalBrief,
      status: 'open',
      createdAt: 'עכשיו',
    };

    setRequests([newRequest, ...requests]);
    setCreatedClinicalPreview(clinicalBrief);
    setReqTopic('');
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTopic.trim() || !newContent.trim()) return;
    const item: StudyMaterial = {
      id: `mat-${Date.now()}`,
      subject: newSubject,
      topic: newTopic,
      title: newTitle,
      type: newType,
      difficulty: 'בינוני',
      content: newContent,
      status: 'approved',
      searchCount: 1,
    };
    setMaterials([item, ...materials]);
    setNewTitle('');
    setNewTopic('');
    setNewContent('');
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center" dir="rtl">
        <div className="flex items-center gap-2.5 text-slate-600 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
          <span>מאמת פרטי התחברות...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex flex-col justify-between p-4 sm:p-6" dir="rtl">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white font-extrabold text-lg flex items-center justify-center shadow-xs">
              C
            </div>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">CatchUp</span>
          </div>
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
            פלטפורמת השלמת פערים לבתי ספר
          </span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-l from-sky-500 via-blue-600 to-teal-500" />

            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-extrabold text-slate-900">כניסה למערכת CatchUp</h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  התחבר באמצעות Google או באמצעות אימייל וסיסמה.
                </p>
              </div>

              {/* כפתור התחברות עם Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 border border-slate-300 font-semibold py-3.5 px-4 rounded-2xl transition flex items-center justify-center gap-3 shadow-xs text-sm"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.05 21.2 7.24 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.02 14.03c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.17H1.01C.37 7.45 0 8.88 0 10.39s.37 2.94 1.01 4.22l4.01-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.79 0 3.41.62 4.68 1.82l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.05 2.8 1.01 6.86l4.01 3.14c.98-2.95 3.73-5.25 6.98-5.25Z"
                    />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'מעביר לגוגל...' : 'המשך עם Google'}</span>
              </button>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="px-3 text-xs text-slate-400 font-medium">או התחבר באמצעות אימייל</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* טופס התחברות עם אימייל וסיסמה */}
              <form onSubmit={handleEmailLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">כתובת אימייל</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">סיסמה (6 תווים לפחות)</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500"
                    dir="ltr"
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-relaxed">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold py-3.5 px-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-xs text-sm"
                >
                  {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isLoggingIn ? 'מתחבר למערכת...' : 'התחבר / הירשם עם אימייל'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 pb-2">
          CatchUp • מותאם לתוכנית הלימודים של משרד החינוך
        </div>
      </div>
    );
  }

  const role = currentUser.role;
  const approvedMaterials = materials.filter((m) => m.status === 'approved');
  const visibleMaterials = approvedMaterials.filter((m) => {
    const matchSubj = subjectFilter === 'הכל' || m.subject === subjectFilter;
    const matchText =
      !searchQuery ||
      m.title.includes(searchQuery) ||
      m.topic.includes(searchQuery) ||
      m.content.includes(searchQuery);
    return matchSubj && matchText;
  });

  const completedCount = Object.values(progressMap).filter((s) => s === 'completed').length;

  const roleBadge =
    role === 'student'
      ? { label: `תלמיד/ה • שכבת ${currentUser.grade || 'י״א'}`, classes: 'bg-sky-50 text-sky-700 border-sky-200', logoBg: 'bg-sky-600' }
      : role === 'tutor'
      ? { label: 'סטודנט חונך', classes: 'bg-teal-50 text-teal-700 border-teal-200', logoBg: 'bg-teal-600' }
      : { label: 'הנהלת בית ספר', classes: 'bg-indigo-50 text-indigo-700 border-indigo-200', logoBg: 'bg-indigo-600' };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex flex-col" dir="rtl">
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (role === 'student') setSection('home');
              setSelectedCapsule(null);
            }}
            className="flex items-center gap-2.5 text-right"
          >
            <div className={`w-9 h-9 rounded-xl ${roleBadge.logoBg} text-white font-extrabold text-lg flex items-center justify-center shadow-xs`}>
              C
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">CatchUp</span>
              <span className={`hidden md:inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border mr-2.5 ${roleBadge.classes}`}>
                {roleBadge.label}
              </span>
            </div>
          </button>

          {role === 'student' && (
            <nav className="flex items-center gap-1 sm:gap-1.5">
              {[
                { id: 'home', label: 'ראשי' },
                { id: 'capsules', label: 'שיעורים מהכיתה' },
                { id: 'library', label: 'סיכומים ותרגילים' },
                { id: 'help', label: 'עזרה אישית' },
              ].map((nav) => (
                <button
                  key={nav.id}
                  onClick={() => {
                    setSection(nav.id as StudentSection);
                    setSelectedCapsule(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
                    section === nav.id
                      ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {nav.label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {role === 'student' && (
              <button
                onClick={() => setSection('profile')}
                title="הפרופיל שלי"
                className="flex items-center gap-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-xl"
              >
                <User className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">{currentUser.name}</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>התנתק</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {role === 'student' && (
          <>
            {section === 'home' && (
              <div className="space-y-8">
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                  <div className="h-1.5 bg-sky-500" />
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold text-slate-900">שלום {currentUser.name} 👋</h1>
                        <p className="text-slate-600 text-sm sm:text-base mt-1">
                          בחר פעולה אחת פשוטה כדי להשלים חומר או להתקדם בלימודים:
                        </p>
                      </div>
                      <div className="text-xs text-slate-600 bg-sky-50/70 border border-sky-100 px-3.5 py-2 rounded-xl">
                        {currentUser.school} • שכבת {currentUser.grade || 'י״א'} •{' '}
                        <strong className="text-sky-800">{completedCount} נושאים הושלמו</strong>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mt-6">
                      <div className="border border-sky-200/80 rounded-2xl p-5 flex flex-col justify-between bg-sky-50/35 hover:border-sky-400 transition">
                        <div>
                          <div className="w-8 h-8 rounded-xl bg-sky-600 text-white text-sm font-bold flex items-center justify-center mb-3 shadow-xs">
                            1
                          </div>
                          <h2 className="font-bold text-lg text-slate-900">הפסדתי שיעור</h2>
                          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                            קבל סיכום מסודר של 10 דקות בדיוק על מה שהמורה לימד היום בכיתה שלך.
                          </p>
                        </div>
                        <div className="mt-5 space-y-2">
                          <button
                            onClick={() => setSection('capsules')}
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            השלם שיעור עכשיו
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="border border-teal-200/80 rounded-2xl p-5 flex flex-col justify-between bg-teal-50/30 hover:border-teal-400 transition">
                        <div>
                          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white text-sm font-bold flex items-center justify-center mb-3 shadow-xs">
                            2
                          </div>
                          <h2 className="font-bold text-lg text-slate-900">סיכומים ותרגילים</h2>
                          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                            עבור על סיכומי החומר לבגרות ותרגל שאלות עם פתרונות שלב-אחר-שלב.
                          </p>
                        </div>
                        <div className="mt-5">
                          <button
                            onClick={() => setSection('library')}
                            className="w-full bg-white hover:bg-teal-50/60 text-teal-900 border border-teal-300 text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            פתח חומרי לימוד
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="border border-amber-200/80 rounded-2xl p-5 flex flex-col justify-between bg-amber-50/30 hover:border-amber-400 transition">
                        <div>
                          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white text-sm font-bold flex items-center justify-center mb-3 shadow-xs">
                            3
                          </div>
                          <h2 className="font-bold text-lg text-slate-900">עזרה אישית</h2>
                          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                            שאל שאלה בעברית פשוטה את חונך ה-AI או תאם שיעור קצר עם סטודנט חונך.
                          </p>
                        </div>
                        <div className="mt-5">
                          <button
                            onClick={() => setSection('help')}
                            className="w-full bg-white hover:bg-amber-50/60 text-amber-950 border border-amber-300 text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            קבל עזרה אישית
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {section === 'capsules' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-slate-900">השלמת שיעורים מהכיתה</h1>
                <div className="grid md:grid-cols-2 gap-4">
                  {capsules.map((cap) => (
                    <div key={cap.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="text-xs text-sky-700 font-semibold mb-1">{cap.subject} • {cap.lessonDate}</div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">{cap.topic}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2">{cap.aiSummary}</p>
                      </div>
                      <button
                        onClick={() => setSelectedCapsule(cap)}
                        className="mt-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                      >
                        צפה בסיכום
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'library' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-slate-900">סיכומים ותרגילים</h1>
                <div className="space-y-4">
                  {visibleMaterials.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs">
                      <div className="text-xs text-sky-700 font-semibold">{item.subject} • {item.topic}</div>
                      <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-800 whitespace-pre-line">{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'help' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900 mb-3">שאל את Catchy (חונך AI)</h2>
                <div className="h-60 overflow-y-auto bg-slate-50 border rounded-xl p-4 space-y-3 mb-3">
                  {chatHistory.map((m, idx) => (
                    <div key={idx} className={`p-3 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-sky-600 text-white mr-8' : 'bg-white border text-slate-800 ml-6'}`}>
                      {m.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleAskAI(); }} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="שאל שאלה..."
                    className="flex-1 p-3 rounded-xl border border-slate-300 text-sm"
                  />
                  <button type="submit" className="bg-sky-600 text-white px-5 rounded-xl">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {section === 'profile' && (
              <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <h1 className="text-xl font-bold text-slate-900">הפרופיל שלי</h1>
                <p className="text-sm text-slate-600">מחובר באמצעות: {currentUser.email}</p>
                <button onClick={() => setSection('home')} className="w-full bg-sky-600 text-white py-2.5 rounded-xl text-sm font-semibold">
                  חזרה לדף הראשי
                </button>
              </div>
            )}
          </>
        )}

        {role === 'tutor' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">מוקד חונכות סטודנטים</h1>
            {requests.map((req) => (
              <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <div className="font-bold text-slate-900">{req.subject} — {req.topic}</div>
                <p className="text-xs text-slate-600">{req.studentName} (כיתה {req.studentGrade}) • {req.preferredTime}</p>
                <div className="p-3 bg-teal-50 rounded-xl text-xs text-slate-800">
                  <strong>תיק קליני:</strong> {req.clinicalBrief}
                </div>
              </div>
            ))}
          </div>
        )}

        {role === 'admin' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">רדאר ניהול בי״ס</h1>
            <div className="grid md:grid-cols-3 gap-4">
              {radarAlerts.map((alert) => (
                <div key={alert.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
                  <div className="font-bold text-slate-900">{alert.topic}</div>
                  <p className="text-xs text-slate-600">{alert.stuckPercentage}% מתקשים ({alert.studentsAffected} תלמידים)</p>
                  <p className="text-xs bg-slate-50 p-2.5 rounded-xl">{alert.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}