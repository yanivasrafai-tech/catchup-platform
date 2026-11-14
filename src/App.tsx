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
  ShieldCheck,
  GraduationCap,
  Building2,
  BookOpen,
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
import { supabase, isSupabaseConfigured, triggerRealGoogleOAuth, signOutSupabase } from './lib/supabase';

type StudentSection = 'home' | 'capsules' | 'library' | 'help' | 'profile';

function detectRoleFromEmail(email: string): UserRole {
  const lower = email.trim().toLowerCase();
  if (lower.endsWith('@edu.gov.il') || lower.includes('principal') || lower.includes('admin')) {
    return 'admin';
  }
  if (
    lower.endsWith('.ac.il') ||
    lower.includes('@openu') ||
    lower.includes('@post.bgu') ||
    lower.includes('@campus.technion') ||
    lower.includes('@mail.tau')
  ) {
    return 'tutor';
  }
  return 'student';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('catchup_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [authModal, setAuthModal] = useState<'none' | 'google' | 'moe'>('none');
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginRoleChoice, setLoginRoleChoice] = useState<UserRole>('student');
  const [loginSchool, setLoginSchool] = useState('אמית ישיבה תיכונית שדרות');
  const [loginInstitutionCode, setLoginInstitutionCode] = useState('');
  const [loginGrade, setLoginGrade] = useState('י״א');
  const [loginAcademic, setLoginAcademic] = useState('האוניברסיטה הפתוחה / מכללת ספיר');
  const [moeIdNumber, setMoeIdNumber] = useState('');
  const [moeUserType, setMoeUserType] = useState<'student' | 'admin'>('student');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user && !currentUser) {
        const email = user.email || '';
        const detectedRole = detectRoleFromEmail(email);
        setCurrentUser({
          name: user.user_metadata?.full_name || email.split('@')[0],
          email,
          role: detectedRole,
          authProvider: 'google',
          school: 'אמית ישיבה תיכונית שדרות',
          grade: 'י״א',
          subjects: ['מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳'],
          xp: 120,
        });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email || '';
        const detectedRole = detectRoleFromEmail(email);
        setCurrentUser((prev) =>
          prev || {
            name: session.user.user_metadata?.full_name || email.split('@')[0],
            email,
            role: detectedRole,
            authProvider: 'google',
            school: 'אמית ישיבה תיכונית שדרות',
            grade: 'י״א',
            subjects: ['מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳'],
            xp: 120,
          }
        );
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('catchup_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('catchup_auth_user');
    }
  }, [currentUser]);

  const [section, setSection] = useState<StudentSection>('home');

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
  const [reqContact, setReqContact] = useState('052-3688248');
  const [createdClinicalPreview, setCreatedClinicalPreview] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('מתמטיקה 5 יח׳');
  const [newTopic, setNewTopic] = useState('');
  const [newType, setNewType] = useState<'summary' | 'exercise' | 'video'>('summary');
  const [newContent, setNewContent] = useState('');

  const handleStartGoogleLogin = async () => {
    setAuthError('');
    if (isSupabaseConfigured) {
      const res = await triggerRealGoogleOAuth();
      if (res.ok) return;
    }
    setAuthModal('google');
  };

  const handleCompleteGoogleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginName.trim() || !loginEmail.trim()) {
      setAuthError('נא למלא שם מלא וכתובת מייל.');
      return;
    }
    if (loginRoleChoice === 'admin' && loginInstitutionCode.trim().length < 4) {
      setAuthError('לכניסת הנהלת בית ספר נדרש סמל מוסד תקין (לדוגמה: 614354).');
      return;
    }

    setCurrentUser({
      name: loginName.trim(),
      email: loginEmail.trim(),
      role: loginRoleChoice,
      authProvider: 'google',
      school: loginSchool,
      institutionCode: loginRoleChoice === 'admin' ? loginInstitutionCode.trim() : undefined,
      grade: loginRoleChoice === 'student' ? loginGrade : undefined,
      academicInstitution: loginRoleChoice === 'tutor' ? loginAcademic : undefined,
      subjects: ['מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳'],
      xp: 150,
    });
    setAuthModal('none');
    setSection('home');
  };

  const handleCompleteMoeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginName.trim() || moeIdNumber.trim().length < 5) {
      setAuthError('נא להזין שם מלא ומספר זהות / קוד משתמש משרד החינוך.');
      return;
    }
    if (moeUserType === 'admin' && loginInstitutionCode.trim().length < 4) {
      setAuthError('לכניסת צוות ניהול נדרש סמל מוסד משרד החינוך (לדוגמה: 614354).');
      return;
    }

    setCurrentUser({
      name: loginName.trim(),
      email: `${moeIdNumber.trim()}@edu.gov.il`,
      role: moeUserType,
      authProvider: 'moe',
      school: loginSchool,
      institutionCode: loginInstitutionCode.trim() || '614354',
      grade: moeUserType === 'student' ? loginGrade : undefined,
      subjects: ['מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳'],
      xp: 150,
    });
    setAuthModal('none');
    setSection('home');
  };

  const handleLogout = async () => {
    await signOutSupabase();
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex flex-col justify-between p-4 sm:p-6" dir="rtl">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white font-extrabold text-lg flex items-center justify-center shadow-sm">
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

            <div className="p-7 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-extrabold text-slate-900">כניסה למערכת CatchUp</h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  התחבר עם חשבון Google או עם הזדהות משרד החינוך. המערכת מזהה אוטומטית את סביבת העבודה שלך.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleStartGoogleLogin}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold py-3.5 px-4 rounded-2xl transition flex items-center justify-center gap-3 shadow-xs"
                >
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
                  <span>המשך עם Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthError('');
                    setAuthModal('moe');
                  }}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3.5 px-4 rounded-2xl transition flex items-center justify-center gap-3 shadow-xs"
                >
                  <ShieldCheck className="w-5 h-5 text-sky-100" />
                  <span>הזדהות אחידה • משרד החינוך</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="text-xs font-semibold text-slate-500 text-center">
                  המערכת מפרידה אוטומטית בין 3 סביבות עבודה:
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-100">
                    <BookOpen className="w-4 h-4 text-sky-600 mx-auto mb-1" />
                    <div className="text-xs font-bold text-slate-800">תלמיד/ה</div>
                    <div className="text-[11px] text-slate-500">השלמת שיעורים</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-100">
                    <GraduationCap className="w-4 h-4 text-teal-600 mx-auto mb-1" />
                    <div className="text-xs font-bold text-slate-800">סטודנט חונך</div>
                    <div className="text-[11px] text-slate-500">תגבור ותיק קליני</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-100">
                    <Building2 className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                    <div className="text-xs font-bold text-slate-800">הנהלת בי״ס</div>
                    <div className="text-[11px] text-slate-500">רדאר פערים</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 pb-2">
          CatchUp • מותאם לתוכנית הלימודים של משרד החינוך
        </div>

        {authModal === 'google' && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-slate-900">כניסה באמצעות חשבון Google</span>
                <button onClick={() => setAuthModal('none')} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCompleteGoogleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">שם מלא</label>
                  <input
                    type="text"
                    required
                    placeholder="לדוגמה: יניב אסרף"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">כתובת Gmail / מוסדית</label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={loginEmail}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLoginEmail(val);
                      setLoginRoleChoice(detectRoleFromEmail(val));
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">סוג משתמש במערכת</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'student', label: 'תלמיד/ה' },
                      { id: 'tutor', label: 'סטודנט חונך' },
                      { id: 'admin', label: 'הנהלת בי״ס' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLoginRoleChoice(opt.id as UserRole)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                          loginRoleChoice === opt.id
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {loginRoleChoice === 'student' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">בית ספר</label>
                      <input
                        type="text"
                        value={loginSchool}
                        onChange={(e) => setLoginSchool(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">שכבה</label>
                      <select
                        value={loginGrade}
                        onChange={(e) => setLoginGrade(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                      >
                        <option value="י׳">י׳</option>
                        <option value="י״א">י״א</option>
                        <option value="י״ב">י״ב</option>
                      </select>
                    </div>
                  </div>
                )}

                {loginRoleChoice === 'tutor' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">מוסד לימודים אקדמי</label>
                    <input
                      type="text"
                      value={loginAcademic}
                      onChange={(e) => setLoginAcademic(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                )}

                {loginRoleChoice === 'admin' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">שם בית הספר</label>
                      <input
                        type="text"
                        value={loginSchool}
                        onChange={(e) => setLoginSchool(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">סמל מוסד</label>
                      <input
                        type="text"
                        placeholder="614354"
                        value={loginInstitutionCode}
                        onChange={(e) => setLoginInstitutionCode(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                  </div>
                )}

                {authError && <p className="text-xs text-rose-600 font-medium">{authError}</p>}

                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-xl text-sm transition"
                >
                  המשך למערכת
                </button>
              </form>
            </div>
          </div>
        )}

        {authModal === 'moe' && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-xl">
              <div className="bg-sky-700 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-bold text-base">הזדהות אחידה — משרד החינוך</span>
                </div>
                <button onClick={() => setAuthModal('none')} className="text-sky-100 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCompleteMoeLogin} className="p-6 space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMoeUserType('student')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                      moeUserType === 'student'
                        ? 'bg-sky-50 text-sky-800 border-sky-500'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    כניסת תלמיד/ה
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoeUserType('admin')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                      moeUserType === 'admin'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-500'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    כניסת הנהלת בית ספר
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">שם מלא</label>
                  <input
                    type="text"
                    required
                    placeholder="שם פרטי ומשפחה"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    קוד משתמש משרד החינוך / ת״ז
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="הזן מספר זיהוי"
                    value={moeIdNumber}
                    onChange={(e) => setMoeIdNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">בית ספר</label>
                    <input
                      type="text"
                      value={loginSchool}
                      onChange={(e) => setLoginSchool(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  {moeUserType === 'student' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">שכבה</label>
                      <select
                        value={loginGrade}
                        onChange={(e) => setLoginGrade(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                      >
                        <option value="י׳">י׳</option>
                        <option value="י״א">י״א</option>
                        <option value="י״ב">י״ב</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">סמל מוסד</label>
                      <input
                        type="text"
                        placeholder="614354"
                        value={loginInstitutionCode}
                        onChange={(e) => setLoginInstitutionCode(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                  )}
                </div>

                {authError && <p className="text-xs text-rose-600 font-medium">{authError}</p>}

                <button
                  type="submit"
                  className="w-full bg-sky-700 hover:bg-sky-800 text-white font-semibold py-3 rounded-xl text-sm transition"
                >
                  אמת והיכנס למערכת
                </button>
              </form>
            </div>
          </div>
        )}
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
      ? {
          label: `תלמיד/ה • שכבת ${currentUser.grade || 'י״א'}`,
          classes: 'bg-sky-50 text-sky-700 border-sky-200',
          logoBg: 'bg-sky-600',
        }
      : role === 'tutor'
      ? {
          label: `סטודנט חונך • ${currentUser.academicInstitution || 'אקדמיה'}`,
          classes: 'bg-teal-50 text-teal-700 border-teal-200',
          logoBg: 'bg-teal-600',
        }
      : {
          label: `הנהלת בית ספר • סמל מוסד ${currentUser.institutionCode || '614354'}`,
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          logoBg: 'bg-indigo-600',
        };

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
            <div
              className={`w-9 h-9 rounded-xl ${roleBadge.logoBg} text-white font-extrabold text-lg flex items-center justify-center shadow-xs`}
            >
              C
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">CatchUp</span>
              <span
                className={`hidden md:inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border mr-2.5 ${roleBadge.classes}`}
              >
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
              title="התנתק והחלף משתמש"
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
                          <button
                            onClick={() => setShowUploadModal(true)}
                            className="w-full text-xs text-sky-700 hover:text-sky-900 py-1 font-medium"
                          >
                            היית בשיעור? העלה צילום לוח לחברים
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

                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">שיעורים אחרונים מהכיתה שלך</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        סיכומי 10 דקות שהוכנו מצילומי לוח והקלטות של תלמידים בכיתה
                      </p>
                    </div>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 border border-sky-200 px-3 py-2 rounded-xl flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      העלה שיעור מהיום
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {capsules.map((cap) => (
                      <div
                        key={cap.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <span className="font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md">
                              {cap.subject}
                            </span>
                            <span>{cap.lessonDate}</span>
                            <span>• הועלה ע״י {cap.uploaderName}</span>
                          </div>
                          <div className="font-bold text-slate-900">{cap.topic}</div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedCapsule(cap);
                            setSection('capsules');
                          }}
                          className="shrink-0 bg-sky-50 hover:bg-sky-600 text-sky-800 hover:text-white border border-sky-200 text-xs font-semibold px-4 py-2 rounded-xl transition"
                        >
                          קרא סיכום (10 דק׳)
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === 'capsules' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">השלמת שיעורים מהכיתה</h1>
                    <p className="text-sm text-slate-600">
                      בחר שיעור שפספסת כדי ללמוד אותו ב-4 שלבים קצרים, או שתף צילום לוח מהיום.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    העלה צילום לוח / סיכום מהיום
                  </button>
                </div>

                {selectedCapsule ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <button
                        onClick={() => setSelectedCapsule(null)}
                        className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
                      >
                        <ArrowRight className="w-4 h-4" />
                        חזרה לרשימת השיעורים
                      </button>
                      <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">
                        {selectedCapsule.subject} • {selectedCapsule.lessonDate}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedCapsule.topic}</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        הוכן עבור כיתה {selectedCapsule.grade} ({selectedCapsule.school}) מתוך שיתוף של{' '}
                        {selectedCapsule.uploaderName}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200/70">
                        <div className="text-xs font-bold text-sky-800 mb-1">שלב 1 מתוך 4 • מה נלמד היום בכיתה</div>
                        <p className="text-sm text-slate-800 leading-relaxed">{selectedCapsule.aiSummary}</p>
                      </div>

                      <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200/70">
                        <div className="text-xs font-bold text-teal-800 mb-2">
                          שלב 2 מתוך 4 • נוסחאות וכללים חשובים
                        </div>
                        <ul className="space-y-1.5">
                          {selectedCapsule.keyFormulas.map((formula, idx) => (
                            <li
                              key={idx}
                              className="text-sm bg-white border border-teal-100 px-3 py-2 rounded-lg text-slate-800"
                            >
                              {formula}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="text-xs font-bold text-slate-700 mb-1">שלב 3 מתוך 4 • דוגמה פתורה מהלוח</div>
                        <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                          {selectedCapsule.solvedExample}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-2.5">
                        <div className="text-xs font-bold text-amber-800">
                          שלב 4 מתוך 4 • בדיקה עצמית (לחץ על השאלה לתשובה)
                        </div>
                        {selectedCapsule.quickQuiz.map((q, idx) => (
                          <details key={idx} className="bg-white border border-amber-100 rounded-lg p-3 text-sm">
                            <summary className="font-semibold cursor-pointer text-slate-900">{q.question}</summary>
                            <p className="mt-2 text-emerald-700 text-sm font-medium">{q.answer}</p>
                          </details>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {capsules.map((cap) => (
                      <div
                        key={cap.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-sky-300 transition shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span className="font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md">
                              {cap.subject}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {cap.lessonDate}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg text-slate-900 mb-2">{cap.topic}</h3>
                          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{cap.aiSummary}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500">מאת: {cap.uploaderName}</span>
                          <button
                            onClick={() => setSelectedCapsule(cap)}
                            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                          >
                            התחל השלמה
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'library' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">סיכומים, תרגילים וסרטונים</h1>
                  <p className="text-sm text-slate-600">סנן לפי מקצוע ובחר נושא ללמידה</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="חפש נושא..."
                      className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {['הכל', 'מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳'].map((subj) => (
                      <button
                        key={subj}
                        onClick={() => setSubjectFilter(subj)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                          subjectFilter === subj
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {visibleMaterials.map((item) => {
                    const isDone = progressMap[item.id] === 'completed';
                    const isFav = favorites.includes(item.id);
                    const isOpen = Boolean(openSolutions[item.id]);

                    return (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                              <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                                {item.subject}
                              </span>
                              <span>{item.topic}</span>
                              {item.type === 'video' && (
                                <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-medium">
                                  סרטון הסבר
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setFavorites((prev) =>
                                  prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                                )
                              }
                              className={`p-2 rounded-xl border text-xs ${
                                isFav
                                  ? 'bg-amber-50 border-amber-200 text-amber-500'
                                  : 'border-slate-200 text-slate-400 hover:text-slate-600'
                              }`}
                              title="שמור למועדפים"
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>

                            <button
                              onClick={() =>
                                setProgressMap((prev) => ({
                                  ...prev,
                                  [item.id]: isDone ? 'in_progress' : 'completed',
                                }))
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                                isDone
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {isDone ? 'הושלם' : 'סמן כהושלם'}
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                          {item.content}
                        </div>

                        {item.videoUrl && (
                          <a
                            href={item.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900"
                          >
                            <PlayCircle className="w-4 h-4" />
                            פתח סרטון הסבר
                          </a>
                        )}

                        {item.solutionSteps && (
                          <div>
                            <button
                              onClick={() =>
                                setOpenSolutions((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                              }
                              className="text-sm font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                            >
                              {isOpen ? (
                                <>
                                  <ChevronUp className="w-4 h-4" /> הסתר פתרון
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" /> הצג פתרון שלב-אחר-שלב
                                </>
                              )}
                            </button>
                            {isOpen && (
                              <div className="mt-3 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                                {item.solutionSteps}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {section === 'help' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">1. שאל את Catchy (חונך AI)</h2>
                        <p className="text-xs text-slate-500">הסברים מיידיים בעברית פשוטה</p>
                      </div>
                      <select
                        value={chatSubject}
                        onChange={(e) => setChatSubject(e.target.value)}
                        className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-1.5 bg-sky-50/60 text-sky-900"
                      >
                        <option>מתמטיקה 5 יח׳</option>
                        <option>פיזיקה 5 יח׳</option>
                        <option>אנגלית 5 יח׳</option>
                      </select>
                    </div>

                    <div className="h-72 overflow-y-auto bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
                      {chatHistory.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                            m.sender === 'user'
                              ? 'bg-sky-600 text-white mr-8'
                              : 'bg-white border border-slate-200 text-slate-800 ml-6'
                          }`}
                        >
                          {m.text}
                        </div>
                      ))}
                      {isChatLoading && <div className="text-xs text-slate-400">כותב תשובה...</div>}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAskAI('הסבר לי בפשטות את הנושא')}
                        className="text-xs bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/70 px-3 py-1.5 rounded-xl font-medium"
                      >
                        הסבר לי בפשטות
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAskAI('תן לי דוגמה פתורה')}
                        className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/70 px-3 py-1.5 rounded-xl font-medium"
                      >
                        תן לי דוגמה פתורה
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAskAI('בחן אותי ב-3 שאלות')}
                        className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70 px-3 py-1.5 rounded-xl font-medium"
                      >
                        בחן אותי
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAskAI();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="כתוב כאן שאלה..."
                        className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="submit"
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 rounded-xl flex items-center justify-center"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">2. בקש שיעור עם סטודנט חונך</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      המערכת תצרף לסטודנט רקע אוטומטי על הנושאים שפספסת כדי שתתחילו ישר לתרגל.
                    </p>
                  </div>

                  <form onSubmit={handleSendTutorRequest} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">מקצוע</label>
                      <select
                        value={reqSubject}
                        onChange={(e) => setReqSubject(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                      >
                        <option>מתמטיקה 5 יח׳</option>
                        <option>פיזיקה 5 יח׳</option>
                        <option>אנגלית 5 יח׳</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        באיזה נושא אתה צריך עזרה?
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="למשל: משוואות טריגונומטריות"
                        value={reqTopic}
                        onChange={(e) => setReqTopic(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">מתי נוח לך?</label>
                      <input
                        type="text"
                        required
                        value={reqTime}
                        onChange={(e) => setReqTime(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        מספר טלפון / וואטסאפ ליצירת קשר
                      </label>
                      <input
                        type="text"
                        required
                        value={reqContact}
                        onChange={(e) => setReqContact(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl text-sm transition"
                    >
                      שלח בקשה לסטודנט
                    </button>
                  </form>

                  {createdClinicalPreview && (
                    <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-slate-800 space-y-1">
                      <div className="font-bold text-teal-900">הבקשה נשלחה! זהו התיק הקליני שצורף לסטודנט:</div>
                      <p className="leading-relaxed">{createdClinicalPreview}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {section === 'profile' && (
              <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <h1 className="text-xl font-bold text-slate-900">הפרופיל הלימודי שלי</h1>
                <div className="text-xs text-sky-800 bg-sky-50 border border-sky-200 px-3 py-2 rounded-xl">
                  מחובר באמצעות: <strong>{currentUser.authProvider === 'moe' ? 'הזדהות משרד החינוך' : 'חשבון Google'}</strong> ({currentUser.email})
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">שם מלא</label>
                  <input
                    type="text"
                    value={currentUser.name}
                    onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">בית ספר</label>
                  <input
                    type="text"
                    value={currentUser.school}
                    onChange={(e) => setCurrentUser({ ...currentUser, school: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">שכבת גיל</label>
                  <select
                    value={currentUser.grade || 'י״א'}
                    onChange={(e) => setCurrentUser({ ...currentUser, grade: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="י׳">כיתה י׳</option>
                    <option value="י״א">כיתה י״א</option>
                    <option value="י״ב">כיתה י״ב</option>
                  </select>
                </div>
                <button
                  onClick={() => setSection('home')}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  שמור וחזור למסך הראשי
                </button>
              </div>
            )}
          </>
        )}

        {role === 'tutor' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="h-1.5 bg-teal-600" />
              <div className="p-6">
                <h1 className="text-2xl font-bold text-slate-900">
                  שלום {currentUser.name} • מוקד חונכות סטודנטים
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  לכל בקשת תלמיד מצורף אוטומטית <strong>תיק קליני</strong> המפרט מה פספס ואיפה נתקע — כדי שתתחילו ישר לתרגל.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-lg">
                        {req.subject}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                          req.status === 'open'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : req.status === 'in_progress'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {req.status === 'open' ? 'ממתינה לחונך' : req.status === 'in_progress' ? 'בטיפול' : 'הושלמה'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{req.topic}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {req.studentName} (כיתה {req.studentGrade}) • מועד מועדף: {req.preferredTime}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200/70 space-y-1">
                      <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        תיק קליני אוטומטי (רקע לפני שיעור):
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{req.clinicalBrief}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">טלפון: {req.studentContact}</span>
                    {req.status === 'open' && (
                      <button
                        onClick={() =>
                          setRequests((prev) =>
                            prev.map((r) =>
                              r.id === req.id ? { ...r, status: 'in_progress', assignedTutor: currentUser.name } : r
                            )
                          )
                        }
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                      >
                        קח בקשה לטיפול
                      </button>
                    )}
                    {req.status === 'in_progress' && (
                      <button
                        onClick={() =>
                          setRequests((prev) =>
                            prev.map((r) => (r.id === req.id ? { ...r, status: 'completed' } : r))
                          )
                        }
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                      >
                        סמן שהושלם
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="h-1.5 bg-indigo-600" />
              <div className="p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    רדאר התרעה מוקדמת — {currentUser.school}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    זיהוי מוקדם (אנונימי) של נושאים שבהם תלמידים מתקשים <strong>לפני</strong> מועד המבחן.
                  </p>
                </div>
                <div className="flex gap-3 text-center">
                  <div className="bg-indigo-50/70 border border-indigo-100 px-4 py-2 rounded-xl">
                    <div className="text-lg font-bold text-indigo-900">142</div>
                    <div className="text-xs text-slate-600">תלמידים פעילים</div>
                  </div>
                  <div className="bg-indigo-50/70 border border-indigo-100 px-4 py-2 rounded-xl">
                    <div className="text-lg font-bold text-indigo-900">{approvedMaterials.length}</div>
                    <div className="text-xs text-slate-600">תכנים מאושרים</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {radarAlerts.map((alert) => (
                <div key={alert.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                      {alert.subject} • {alert.grade}
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-md ${
                        alert.severity === 'critical'
                          ? 'bg-rose-50 text-rose-700'
                          : alert.severity === 'warning'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {alert.stuckPercentage}% מתקשים
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">{alert.topic}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {alert.studentsAffected} תלמידים • {alert.timeframe}
                    </p>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500'
                          : alert.severity === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${alert.stuckPercentage}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                    {alert.recommendation}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900 mb-4">הוספת חומר לימודי</h2>
                <form onSubmit={handleAddMaterial} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="כותרת"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option>מתמטיקה 5 יח׳</option>
                      <option>פיזיקה 5 יח׳</option>
                      <option>אנגלית 5 יח׳</option>
                    </select>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option value="summary">סיכום</option>
                      <option value="exercise">תרגיל</option>
                      <option value="video">סרטון</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="נושא"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <textarea
                    rows={3}
                    required
                    placeholder="תוכן הסיכום או השאלה..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm"
                  >
                    פרסם למערכת
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900">אישור וניהול תכנים</h2>
                <div className="divide-y divide-slate-100">
                  {materials.map((m) => (
                    <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500">
                          {m.subject} •{' '}
                          <span
                            className={
                              m.status === 'approved'
                                ? 'text-emerald-600 font-semibold'
                                : 'text-amber-600 font-semibold'
                            }
                          >
                            {m.status === 'approved' ? 'מאושר' : 'ממתין לבדיקה'}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900">{m.title}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {m.status !== 'approved' && (
                          <button
                            onClick={() =>
                              setMaterials((prev) =>
                                prev.map((x) => (x.id === m.id ? { ...x, status: 'approved' } : x))
                              )
                            }
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            title="אשר"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setMaterials((prev) => prev.filter((x) => x.id !== m.id))}
                          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-rose-600"
                          title="מחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">העלאת שיעור מהיום לכיתה</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              צלם את הלוח או כתוב כמה מילים על מה שנלמד — המערכת תיצור מיד סיכום מסודר לחברים שהפסידו.
            </p>
            <form onSubmit={handleCreateCapsule} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">מקצוע</label>
                <select
                  value={capSubject}
                  onChange={(e) => setCapSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option>מתמטיקה 5 יח׳</option>
                  <option>פיזיקה 5 יח׳</option>
                  <option>אנגלית 5 יח׳</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">נושא השיעור</label>
                <input
                  type="text"
                  required
                  placeholder="למשל: משוואות טריגונומטריות"
                  value={capTopic}
                  onChange={(e) => setCapTopic(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">צילום לוח / מחברת</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full text-xs text-slate-600 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:font-semibold file:bg-sky-50 file:text-sky-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">סיכום קצר במילים שלך</label>
                <textarea
                  rows={3}
                  placeholder="מה המורה הדגיש היום בשיעור?"
                  value={capNotes}
                  onChange={(e) => setCapNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingCapsule}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                {isCreatingCapsule ? 'מכין סיכום מסודר...' : 'צור סיכום שיעור לכיתה'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}