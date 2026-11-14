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
  Download,
  Sparkles,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Building2,
  Menu,
  MessageSquare,
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
  INITIAL_CAPSULES,
  INITIAL_REQUESTS,
  INITIAL_RADAR_ALERTS,
} from './data/seedData';
import { askCatchyTutor, generateCapsuleFromInput } from './lib/gemini';
import { supabase, signInWithGoogle, signInOrSignUp, signOutUser } from './lib/supabase';

type StudentSection = 'home' | 'capsules' | 'library' | 'help' | 'profile';

// חומרי הלימוד הרשמיים של משרד החינוך (התוכנית החדשה)
const OFFICIAL_MINISTRY_MATERIALS: StudyMaterial[] = [
  {
    id: 'gov-mat-1',
    subject: 'מתמטיקה 5 יח׳',
    topic: 'חשבון דיפרנציאלי ואינטגרלי (שאלון 582)',
    title: 'חקירת פונקציות טריגונומטריות ומעריכיות לפי התוכנית החדשה',
    type: 'summary',
    difficulty: 'מתקדם',
    content: 'סיכום רשמי המותאם לרפורמת הבגרויות: דגש על יישומים הנדסיים, אסימפטוטות אנכיות ואופקיות, וגזירת פונקציות מורכבות תוך שימוש בכלל השרשרת.',
    solutionSteps: 'שלב 1: מציאת תחום ההגדרה.\nשלב 2: גזירה והשוואה לאפס למציאת נקודות קיצון.\nשלב 3: בדיקת תחומי עלייה וירידה וסרטוט סכמטי.',
    status: 'approved',
    searchCount: 1420,
  },
  {
    id: 'gov-mat-2',
    subject: 'פיזיקה 5 יח׳',
    topic: 'אלקטרומגנטיות ומעגלי זרם (התוכנית החדשה)',
    title: 'חוק פאראדיי והשראה אלקטרומגנטית',
    type: 'summary',
    difficulty: 'מתקדם',
    content: 'חומר עזר רשמי מטעם פיקוח על הוראת הפיזיקה: שטף מגנטי, שינוי בשדה מגנטי לאורך הזמן, וכיוון הזרם המושרה על פי חוק לנץ.',
    solutionSteps: 'שלב 1: חישוב השטף ההתחלתי והסופי $\\Phi = B \\cdot A \\cdot \\cos(\\alpha)$.\nשלב 2: הפעלת חוק פאראדיי $\\mathcal{E} = -\\frac{d\\Phi}{dt}$.\nשלב 3: קביעת סימן וקקטור זרם לפי לנץ.',
    status: 'approved',
    searchCount: 980,
  },
  {
    id: 'gov-mat-3',
    subject: 'אנגלית 5 יח׳',
    topic: 'Module E & G — Literature & Bridging Text',
    title: 'מדריך כתיבת חיבור טיעון (Argumentative Essay) מתקדם',
    type: 'summary',
    difficulty: 'בינוני',
    content: 'תבנית עבודה רשמית לבחינת הבגרות באנגלית: פסקת מבוא הכוללת Thesis Statement ברור, פסקאות גוף עם ראיות ונימוקים, ופסקת סיכום מסכמת.',
    solutionSteps: '1. הצגת טענת הנגד והפרכתה בקצרה.\n2. חיזוק הטיעון המרכזי באמצעות דוגמה מעולם התוכן.\n3. שמירה על אוצר מילים תקני ברמה גבוהה (C1).',
    status: 'approved',
    searchCount: 1150,
  }
];

async function resolveVerifiedUserRole(userId: string, email: string): Promise<UserRole> {
  const lowerEmail = email.toLowerCase().trim();

  if (lowerEmail === 'yanivasraf45@gmail.com') {
    return 'admin';
  }

  const { data: staffData } = await supabase
    .from('approved_staff')
    .select('role')
    .eq('email', lowerEmail)
    .maybeSingle();

  if (staffData?.role && ['student', 'tutor', 'admin'].includes(staffData.role)) {
    return staffData.role as UserRole;
  }

  if (lowerEmail.endsWith('.ac.il') || lowerEmail.includes('tutor')) {
    return 'tutor';
  }

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // מצב וידג'ט צף לתלמיד בכל המסכים
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [floatingChatInput, setFloatingChatInput] = useState('');
  const [isFloatingChatLoading, setIsFloatingChatLoading] = useState(false);
  const [floatingChatHistory, setFloatingChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: 'שלום! אני Catchy AI. אני זמין עבורך כאן בכל רגע לעזור בכל שאלה או תרגיל.',
    },
  ]);

  // צאט AI ניהולי מלא למנהל בית הספר
  const [adminChatInput, setAdminChatInput] = useState('');
  const [isAdminChatLoading, setIsAdminChatLoading] = useState(false);
  const [adminChatHistory, setAdminChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: 'שלום אדוני המנהל. אני יועץ ה-AI הניהולי שלך. אשמח לסייע לך בניתוח נתוני בית הספר, תכנון תגבורים, והמלצות פדגוגיות לפי נתוני משרד החינוך.',
    },
  ]);

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
          academicInstitution: verifiedRole === 'tutor' ? 'אוניברסיטה / מכללה אקדמית' : undefined,
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

  const [materials] = useState<StudyMaterial[]>(OFFICIAL_MINISTRY_MATERIALS);
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
    return saved ? JSON.parse(saved) : { 'gov-mat-1': 'completed' };
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('catchup_v2_favorites');
    return saved ? JSON.parse(saved) : ['gov-mat-1'];
  });

  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'tutor' | 'admin' | 'student'>('admin');
  const [newStaffSchool, setNewStaffSchool] = useState('אמית ישיבה תיכונית שדרות');
  const [staffMsg, setStaffMsg] = useState('');

  const [tutorAiInput, setTutorAiInput] = useState('');
  const [tutorAiOutput, setTutorAiOutput] = useState('');
  const [isTutorAiLoading, setIsTutorAiLoading] = useState(false);

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

  const handleGrantPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail.trim()) return;
    setStaffMsg('');
    const { error } = await supabase.from('approved_staff').upsert({
      email: newStaffEmail.trim().toLowerCase(),
      role: newStaffRole,
      school: newStaffSchool,
    });

    if (error) {
      setStaffMsg('שגיאה: ' + error.message);
    } else {
      setStaffMsg(`המייל ${newStaffEmail} הוגדר בהצלחה כתפקיד: ${newStaffRole}.`);
      setNewStaffEmail('');
    }
  };

  const handleExportSchoolData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ school: currentUser?.school, requests, materials: OFFICIAL_MINISTRY_MATERIALS, capsules }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CatchUp_School_Report_${currentUser?.school || 'Data'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFloatingChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floatingChatInput.trim()) return;
    const text = floatingChatInput;
    setFloatingChatHistory((prev) => [...prev, { sender: 'user', text }]);
    setFloatingChatInput('');
    setIsFloatingChatLoading(true);
    const reply = await askCatchyTutor(text, 'כללי');
    setFloatingChatHistory((prev) => [...prev, { sender: 'ai', text: reply }]);
    setIsFloatingChatLoading(false);
  };

  const handleAdminChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim()) return;
    const text = adminChatInput;
    setAdminChatHistory((prev) => [...prev, { sender: 'user', text }]);
    setAdminChatInput('');
    setIsAdminChatLoading(true);
    const reply = await askCatchyTutor(`אתה עוזר ניהולי בכיר למנהל בית ספר. השב מקצועית לשאלה הבאה: ${text}`, 'ניהול בית ספר');
    setAdminChatHistory((prev) => [...prev, { sender: 'ai', text: reply }]);
    setIsAdminChatLoading(false);
  };

  const handleTutorAiHelp = async () => {
    if (!tutorAiInput.trim()) return;
    setIsTutorAiLoading(true);
    const prompt = `אתה עוזר פדגוגי חכם לסטודנטים חונכים. הכן הסבר קצר של 3 שלבים והמחשה פשוטה עבור התלמיד בנושא הבא: ${tutorAiInput}`;
    const reply = await askCatchyTutor(prompt, 'חונכות אקדמית');
    setTutorAiOutput(reply);
    setIsTutorAiLoading(false);
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
      uploaderName: `${currentUser.name} (${currentUser.role === 'admin' ? 'מנהל/ת' : currentUser.grade || 'תלמיד/ה'})`,
      sourceType: capImage ? 'photo' : 'voice_note',
      aiSummary: result.aiSummary,
      keyFormulas: result.keyFormulas,
      solvedExample: result.solvedExample,
      quickQuiz: result.quickQuiz,
    };

    setCapsules([created, ...capsules]);
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
      (matchingCapsule ? `ב-${matchingCapsule.lessonDate} הועלה סיכום שיעור מהכיתה בנושא "${matchingCapsule.topic}". ` : '') +
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

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4" dir="rtl">
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
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs">
            פלטפורמת השלמת פערים לבתי ספר • משרד החינוך
          </span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-l from-sky-500 via-blue-600 to-teal-500" />

            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-extrabold text-slate-900">כניסה למערכת CatchUp</h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  התחבר באמצעות Google או באמצעות אימייל וסיסמה. כל חומרי משרד החינוך מעודכנים אוטומטית במערכת.
                </p>
              </div>

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
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                    <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.05 21.2 7.24 24 12 24Z" />
                    <path fill="#FBBC05" d="M5.02 14.03c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.17H1.01C.37 7.45 0 8.88 0 10.39s.37 2.94 1.01 4.22l4.01-3.14Z" />
                    <path fill="#EA4335" d="M12 4.75c1.79 0 3.41.62 4.68 1.82l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.05 2.8 1.01 6.86l4.01 3.14c.98-2.95 3.73-5.25 6.98-5.25Z" />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'מעביר לגוגל...' : 'המשך עם Google'}</span>
              </button>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="px-3 text-xs text-slate-400 font-medium">או התחבר באמצעות אימייל</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleEmailLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">כתובת אימייל</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com / university.ac.il"
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
          CatchUp • מותאם לתוכנית הלימודים החדשה של משרד החינוך
        </div>
      </div>
    );
  }

  const role = currentUser.role;
  const isSuperAdmin = currentUser.email.toLowerCase() === 'yanivasraf45@gmail.com';
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
      ? { label: 'סטודנט חונך אקדמי', classes: 'bg-teal-50 text-teal-700 border-teal-200', logoBg: 'bg-teal-600' }
      : { label: isSuperAdmin ? 'מנהל מערכת ראשי (Super Admin)' : `הנהלת בי״ס • ${currentUser.school}`, classes: 'bg-indigo-50 text-indigo-700 border-indigo-200', logoBg: 'bg-indigo-600' };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex flex-col relative" dir="rtl">
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
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
          </div>

          {role === 'student' && (
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'home', label: 'ראשי' },
                { id: 'capsules', label: 'שיעורים מהכיתה' },
                { id: 'library', label: 'סיכומים ותרגילים (משרד החינוך)' },
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
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-xl"
              >
                <User className="w-3.5 h-3.5 text-sky-600" />
                <span>{currentUser.name}</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">התנתק</span>
            </button>

            {role === 'student' && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {role === 'student' && mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1.5 shadow-md">
            {[
              { id: 'home', label: 'ראשי' },
              { id: 'capsules', label: 'שיעורים מהכיתה' },
              { id: 'library', label: 'סיכומים ותרגילים (משרד החינוך)' },
              { id: 'help', label: 'עזרה אישית' },
              { id: 'profile', label: 'הפרופיל שלי' },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => {
                  setSection(nav.id as StudentSection);
                  setSelectedCapsule(null);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-right px-3 py-2 rounded-xl text-sm font-medium transition ${
                  section === nav.id ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {role === 'student' && (
          <>
            {section === 'home' && (
              <div className="space-y-6 sm:space-y-8">
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                  <div className="h-1.5 bg-sky-500" />
                  <div className="p-5 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">שלום {currentUser.name} 👋</h1>
                        <p className="text-slate-600 text-sm sm:text-base mt-1">
                          כל תוכנית הלימודים החדשה של משרד החינוך מובנית ומעודכנת כאן עבורך:
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
                          <h2 className="font-bold text-lg text-slate-900">סיכומים ותרגילים רשמיים</h2>
                          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                            כל חומרי הלימוד הרשמיים של משרד החינוך בתוכנית החדשה עם פתרונות שלב-אחר-שלב.
                          </p>
                        </div>
                        <div className="mt-5">
                          <button
                            onClick={() => setSection('library')}
                            className="w-full bg-white hover:bg-teal-50/60 text-teal-900 border border-teal-300 text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            פתח חומרי משרד החינוך
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">השלמת שיעורים מהכיתה</h1>
                    <p className="text-sm text-slate-600">בחר שיעור שפספסת ולמד אותו ב-4 שלבים קצרים.</p>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    העלה צילום לוח
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
                      <p className="text-xs text-slate-500 mt-1">הוכן ע״י {selectedCapsule.uploaderName}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200/70">
                        <div className="text-xs font-bold text-sky-800 mb-1">שלב 1 מתוך 4 • מה נלמד היום</div>
                        <p className="text-sm text-slate-800 leading-relaxed">{selectedCapsule.aiSummary}</p>
                      </div>

                      <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200/70">
                        <div className="text-xs font-bold text-teal-800 mb-2">שלב 2 מתוך 4 • נוסחאות וכללים</div>
                        <ul className="space-y-1.5">
                          {selectedCapsule.keyFormulas.map((formula, idx) => (
                            <li key={idx} className="text-sm bg-white border border-teal-100 px-3 py-2 rounded-lg text-slate-800">
                              {formula}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="text-xs font-bold text-slate-700 mb-1">שלב 3 מתוך 4 • דוגמה פתורה</div>
                        <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{selectedCapsule.solvedExample}</p>
                      </div>

                      <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-2.5">
                        <div className="text-xs font-bold text-amber-800">שלב 4 מתוך 4 • בדיקה עצמית</div>
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
                      <div key={cap.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="text-xs text-sky-700 font-semibold mb-1">{cap.subject} • {cap.lessonDate}</div>
                          <h3 className="font-bold text-lg text-slate-900 mb-2">{cap.topic}</h3>
                          <p className="text-sm text-slate-600 line-clamp-2">{cap.aiSummary}</p>
                        </div>
                        <button
                          onClick={() => setSelectedCapsule(cap)}
                          className="mt-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                        >
                          צפה בסיכום (10 דק׳)
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'library' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">סיכומים ותרגילים רשמיים (משרד החינוך)</h1>
                  <p className="text-sm text-slate-600">כל החומרים הרשמיים בתוכנית החדשה מוטענים ומוכנים עבורך במערכת.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="חפש נושא בתוכנית הלימודים..."
                      className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {['הכל', 'מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳'].map((subj) => (
                      <button
                        key={subj}
                        onClick={() => setSubjectFilter(subj)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                          subjectFilter === subj ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                              {item.subject} • רשמי משרד החינוך
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 mt-1">{item.title}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setFavorites((prev) => (prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]))
                              }
                              className={`p-2 rounded-xl border text-xs ${isFav ? 'bg-amber-50 border-amber-200 text-amber-500' : 'border-slate-200 text-slate-400'}`}
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                            <button
                              onClick={() =>
                                setProgressMap((prev) => ({ ...prev, [item.id]: isDone ? 'in_progress' : 'completed' }))
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                                isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {isDone ? 'הושלם' : 'סמן כהושלם'}
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                          {item.content}
                        </div>

                        {item.solutionSteps && (
                          <div>
                            <button
                              onClick={() => setOpenSolutions((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="text-sm font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                            >
                              {isOpen ? <><ChevronUp className="w-4 h-4" /> הסתר פתרון</> : <><ChevronDown className="w-4 h-4" /> הצג פתרון שלב-אחר-שלב</>}
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
                        className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-1.5 bg-sky-50 text-sky-900"
                      >
                        <option>מתמטיקה 5 יח׳</option>
                        <option>פיזיקה 5 יח׳</option>
                        <option>אנגלית 5 יח׳</option>
                      </select>
                    </div>

                    <div className="h-64 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      {chatHistory.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                            m.sender === 'user' ? 'bg-sky-600 text-white mr-8' : 'bg-white border border-slate-200 text-slate-800 ml-6'
                          }`}
                        >
                          {m.text}
                        </div>
                      ))}
                      {isChatLoading && <div className="text-xs text-slate-400">כותב תשובה...</div>}
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleAskAI(); }} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="שאל שאלה בלשון חופשית..."
                      className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-sky-500"
                    />
                    <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white px-4 rounded-xl flex items-center justify-center">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">2. בקש שיעור עם סטודנט חונך</h2>
                    <p className="text-xs text-slate-500 mt-0.5">המערכת תצרף לסטודנט רקע אוטומטי על הפערים שלך.</p>
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1">נושא ממוקד</label>
                      <input
                        type="text"
                        required
                        placeholder="למשל: אינטגרלים"
                        value={reqTopic}
                        onChange={(e) => setReqTopic(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">מועדף</label>
                      <input
                        type="text"
                        required
                        value={reqTime}
                        onChange={(e) => setReqTime(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">טלפון / וואטסאפ</label>
                      <input
                        type="text"
                        required
                        placeholder="050-0000000"
                        value={reqContact}
                        onChange={(e) => setReqContact(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>

                    <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl text-sm transition">
                      שלח בקשה לסטודנט החונך
                    </button>
                  </form>

                  {createdClinicalPreview && (
                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-slate-800 space-y-1">
                      <div className="font-bold text-teal-900">הבקשה נשלחה בהצלחה!</div>
                      <p className="leading-relaxed">{createdClinicalPreview}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {section === 'profile' && (
              <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <h1 className="text-xl font-bold text-slate-900">הפרופיל האישי</h1>
                <p className="text-sm text-slate-600">מחובר באמצעות: {currentUser.email}</p>
                <div className="p-3 bg-sky-50 rounded-xl text-xs text-sky-900 font-medium">
                  מוסד לימודים: {currentUser.school} • דרגת פעילות: {currentUser.xp} XP
                </div>
                <button onClick={() => setSection('home')} className="w-full bg-sky-600 text-white py-2.5 rounded-xl text-sm font-semibold">
                  חזרה למסך הראשי
                </button>
              </div>
            )}
          </>
        )}

        {/* ----------------- ממשק סטודנט חונך ----------------- */}
        {role === 'tutor' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="h-1.5 bg-teal-600" />
              <div className="p-6">
                <h1 className="text-2xl font-bold text-slate-900">שלום {currentUser.name} • מוקד חונכות אקדמית</h1>
                <p className="text-sm text-slate-600 mt-1">
                  צפה בכל השיעורים והבקשות של התלמידים, השבץ לבחירתך, והשתמש בכלי ה-AI להכנת ההסבר.
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">בקשות תלמידים ממתינות לחונך</h2>
                {requests.map((req) => (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">{req.subject}</span>
                      <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
                        {req.status === 'open' ? 'ממתינה לחונך' : 'בטיפול'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{req.topic}</h3>
                      <p className="text-xs text-slate-500">{req.studentName} (כיתה {req.studentGrade}) • מועד: {req.preferredTime}</p>
                    </div>
                    <div className="p-3 bg-teal-50/60 rounded-xl text-xs text-slate-800">
                      <strong>תיק קליני (רקע):</strong> {req.clinicalBrief}
                    </div>
                    <div className="pt-2 flex justify-between items-center text-xs">
                      <span>טלפון: {req.studentContact}</span>
                      <button
                        onClick={() =>
                          setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'in_progress' } : r)))
                        }
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl transition"
                      >
                        קח בקשה לטיפול
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-teal-700">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="text-lg font-bold text-slate-900">כלי AI חכם להעברת החומר לתלמיד</h2>
                </div>
                <p className="text-xs text-slate-600">הזן נושא לימודי שאתה הולך ללמד, וקבל מיד מבנה הסבר מומלץ והמחשה פשוטה:</p>
                <input
                  type="text"
                  placeholder="למשל: חוק השני של ניוטון"
                  value={tutorAiInput}
                  onChange={(e) => setTutorAiInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm"
                />
                <button
                  onClick={handleTutorAiHelp}
                  disabled={isTutorAiLoading}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  {isTutorAiLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>צור מבנה הסבר לחונכות</span>
                </button>
                {tutorAiOutput && (
                  <div className="p-4 rounded-xl bg-slate-50 border text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                    {tutorAiOutput}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ממשק מנהל בית ספר / אדמין ----------------- */}
        {role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="h-1.5 bg-indigo-600" />
              <div className="p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {isSuperAdmin ? 'ממשק מנהל מערכת ראשי (Super Admin)' : `רדאר ניהול • ${currentUser.school}`}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {isSuperAdmin
                      ? 'שליטה מלאה בכל משתמשי המערכת, מתן הרשאות וקישור מיילים כתלמיד או כמנהל.'
                      : 'צפייה בנתוני התלמידים בבית הספר שלך בלבד, ייצוא דוחות וצאט AI ניהולי.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportSchoolData}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs"
                  >
                    ייצא נתונים לקובץ (Export)
                  </button>
                </div>
              </div>
            </div>

            {/* ניהול הרשאות למנהל ראשי (שיוך מייל לתלמיד/מנהל/חונך) */}
            {isSuperAdmin && (
              <div className="bg-white border border-indigo-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-indigo-900">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold">שיוך ומתן הרשאות למשתמשים במערכת (כולל גישת תלמיד למנהל)</h2>
                </div>
                <p className="text-xs text-slate-600">הזן כתובת מייל, בחר האם להגדירו כמנהל בית ספר, סטודנט חונך או תלמיד, והענק הרשאה:</p>
                <form onSubmit={handleGrantPermission} className="grid sm:grid-cols-4 gap-3">
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-300 text-sm"
                    dir="ltr"
                  />
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as 'tutor' | 'admin' | 'student')}
                    className="p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="admin">מנהל בית ספר</option>
                    <option value="student">תלמיד (גם למנהל)</option>
                    <option value="tutor">סטודנט חונך</option>
                  </select>
                  <input
                    type="text"
                    placeholder="שם בית הספר"
                    value={newStaffSchool}
                    onChange={(e) => setNewStaffSchool(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm">
                    שמור הרשאה
                  </button>
                </form>
                {staffMsg && <p className="text-xs font-medium text-emerald-700">{staffMsg}</p>}
              </div>
            )}

            {/* צאט AI ניהולי מלא למנהל בית הספר */}
            <div className="bg-white border border-indigo-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-indigo-900">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold">צאט AI ניהולי לבית הספר (ייעוץ והחלטות)</h2>
              </div>
              <p className="text-xs text-slate-600">התכתב חופשי עם יועץ ה-AI הניהולי כדי לקבל תוכניות עבודה, עצות פדגוגיות ודרכי ייעול וסדר בבית הספר שלך:</p>
              
              <div className="h-64 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                {adminChatHistory.map((m, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-indigo-600 text-white mr-8' : 'bg-white border border-slate-200 text-slate-800 ml-6'}`}>
                    {m.text}
                  </div>
                ))}
                {isAdminChatLoading && <div className="text-xs text-slate-400">יועץ ה-AI מעבד תשובה...</div>}
              </div>

              <form onSubmit={handleAdminChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={adminChatInput}
                  onChange={(e) => setAdminChatInput(e.target.value)}
                  placeholder="שאל שאלה ניהולית (למשל: אילו תגבורים כדאי לפתוח לקראת הבגרויות?)..."
                  className="flex-1 text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
                <button type="submit" className="bg-indigo-600 text-white px-5 rounded-xl">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {radarAlerts.map((alert) => (
                <div key={alert.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-md">{alert.subject}</span>
                    <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">{alert.stuckPercentage}% מתקשים</span>
                  </div>
                  <h3 className="font-bold text-slate-900">{alert.topic}</h3>
                  <p className="text-xs text-slate-500">{alert.studentsAffected} תלמידים מושפעים</p>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed">{alert.recommendation}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h2 className="text-lg font-bold text-slate-900">חומרי הלימוד הרשמיים המוטענים במערכת (משרד החינוך)</h2>
              <div className="divide-y divide-slate-100">
                {materials.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">{m.subject} • תוכנית חדשה • סטטוס: <strong className="text-emerald-600">פעיל ומאושר</strong></div>
                      <div className="text-sm font-semibold text-slate-900">{m.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* וידג'ט צף קבוע בצד ימין למטה עבור תלמידים בכל המסכים */}
      {role === 'student' && (
        <div className="fixed bottom-6 right-6 z-50">
          {!isFloatingChatOpen && (
            <button
              onClick={() => setIsFloatingChatOpen(true)}
              className="w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-xl flex items-center justify-center transition transform hover:scale-105 active:scale-95 group"
              title="פתח את Catchy AI"
            >
              <Sparkles className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>
          )}

          {isFloatingChatOpen && (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-80 sm:w-96 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-sky-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">C</div>
                  <div>
                    <h3 className="font-bold text-sm">Catchy AI • עוזר לימודי אישי</h3>
                    <p className="text-[10px] text-sky-100">זמין תמיד לכל שאלה שלך</p>
                  </div>
                </div>
                <button onClick={() => setIsFloatingChatOpen(false)} className="text-white hover:bg-sky-700 p-1.5 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-72 overflow-y-auto p-4 space-y-3 bg-slate-50 text-sm">
                {floatingChatHistory.map((m, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl whitespace-pre-line ${m.sender === 'user' ? 'bg-sky-600 text-white mr-6' : 'bg-white border border-slate-200 text-slate-800 ml-6'}`}>
                    {m.text}
                  </div>
                ))}
                {isFloatingChatLoading && <div className="text-xs text-slate-400">Catchy חושב על תשובה...</div>}
              </div>

              <form onSubmit={handleFloatingChatSubmit} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={floatingChatInput}
                  onChange={(e) => setFloatingChatInput(e.target.value)}
                  placeholder="שאל שאלה על כל תרגיל או נושא..."
                  className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-sky-500"
                />
                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-2.5 rounded-xl text-xs flex items-center justify-center">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* מודאל העלאת שיעור מהכיתה (לתלמיד/מנהל) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">העלאת סיכום שיעור מהכיתה</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
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
                  placeholder="למשל: נגזרות של פונקציות מעריכיות"
                  value={capTopic}
                  onChange={(e) => setCapTopic(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">צילום לוח / מחברת (אופציונלי)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full text-xs text-slate-600 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:font-semibold file:bg-sky-50 file:text-sky-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">הערות או סיכום קצר</label>
                <textarea
                  rows={3}
                  placeholder="מה הוסבר היום בכיתה?"
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
                {isCreatingCapsule ? 'מייצר סיכום בעזרת AI...' : 'פרסם סיכום למערכת'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}