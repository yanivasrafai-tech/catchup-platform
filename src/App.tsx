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
  Server,
  Users,
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

// מאגר מקיף של כל חומרי הלימוד לפי 7 קטגוריות משרד החינוך (התוכנית החדשה)
const ALL_MINISTRY_SUBJECTS_MATERIALS: StudyMaterial[] = [
  // 1. מקצועות ליבה
  {
    id: 'mat-core-1',
    subject: 'מתמטיקה 5 יח׳',
    topic: 'חשבון דיפרנציאלי ואינטגרלי',
    title: 'חקירת פונקציות מעריכיות ולוגריתמיות (שאלון 582)',
    type: 'summary',
    difficulty: 'מתקדם',
    content: 'סיכום רשמי: מציאת תחום הגדרה, נקודות קיצון, אסימפטוטות אנכיות ואופקיות, וסרטוט גרף מדויק לפי רפורמת הבגרויות.',
    solutionSteps: '1. תחום הגדרה: דרישת חיוביות לוגריתם ושונה מאפס במכנה.\n2. גזירה לפי כלל המכפלה והשרשרת.\n3. מציאת נקודות קיצון והכרעה.',
    status: 'approved',
    searchCount: 2400,
  },
  {
    id: 'eng-core-1',
    subject: 'אנגלית 5 יח׳',
    topic: 'Literature & Bridging Text',
    title: 'ניתוח יצירה ספרותית והשוואתה לטקסט חיצוני (Module E/G)',
    type: 'summary',
    difficulty: 'מתקדם',
    content: 'מדריך כתיבה מתקדם הכולל מילות קישור תקניות, מבנה פסקת טיעון והתייחסות למושגים ספרותיים (Higher-Order Thinking Skills).',
    solutionSteps: '1. הצגת טענת המפתח (Thesis).\n2. הבאת ראיות מתוך הטקסט.\n3. ניתוח והסבר הקשר.',
    status: 'approved',
    searchCount: 1950,
  },
  {
    id: 'civ-core-1',
    subject: 'אזרחות',
    topic: 'הגישה הדמוקרטית והמדינה היהודית',
    title: 'עקרונות הדמוקרטיה וזכויות אדם ואזרח',
    type: 'summary',
    difficulty: 'בינוני',
    content: 'סיכום מלא של סוגיות הליבה באזרחות: מתח בין אופי המדינה לזכויות מיעוטים, עקרון שלטון העם, והכרזת העצמאות.',
    solutionSteps: '1. זיהוי הזכות או העקרון המופיע באירוע.\n2. הצגת ההגדרה המדויקת.\n3. יישום מלא על נתוני האירוע בשאלה.',
    status: 'approved',
    searchCount: 1620,
  },
  {
    id: 'hist-core-1',
    subject: 'היסטוריה',
    topic: 'לאומיות באירופה ובניית הבית המשותף',
    title: 'צמיחת התנועות הלאומיות במאה ה-19 והעלייה הראשונה והשנייה',
    type: 'summary',
    difficulty: 'בינוני',
    content: 'סיכום היסטורי מקיף: הגורמים לצמיחת הלאומיות המודרנית, מאפייני התנועות, והקשיים של העולים לארץ ישראל.',
    solutionSteps: '1. פירוט הגורמים (גורמי תרבות, פוליטיקה ותיעוש).\n2. השוואה בין דפוסי פעולה.\n3. סיכום השלכות היסטוריות.',
    status: 'approved',
    searchCount: 1400,
  },
  {
    id: 'hebr-core-1',
    subject: 'הבעה ולשון עברית',
    topic: 'הבנת הנקרא ותחביר',
    title: 'מערכת השורשים, גזרות הפועל ותחביר משפט ייחודי',
    type: 'summary',
    difficulty: 'בינוני',
    content: 'הכנה מלאה לבגרות בלשון: ניתוח מבנה הפועל, זיהוי פסוקיות, כללי פיסוק מתקדמים וכתיבת תשובון טיעון תקני.',
    solutionSteps: '1. בידוד שורש ובניין.\n2. בדיקת התאמה בין נושא ונשוא.\n3. הוכחת תפקיד תחבירי במשפט.',
    status: 'approved',
    searchCount: 1800,
  },
  {
    id: 'bible-core-1',
    subject: 'תנ"ך / מקרא',
    topic: 'חוק ומשפט במקרא ובנביא ראשון',
    title: 'סוגיות מוסר וחברה בספרי נביאים וספרי חוק',
    type: 'summary',
    difficulty: 'בינוני',
    content: 'סיכום פרקי הלימוד בתנ"ך: השוואה בין חוק מקראי לחוק המזרח הקדום, ותפיסת הצדק החברתי בנביאי ישראל.',
    solutionSteps: '1. קריאת הפסוקים והבנת הפירוש המילולי.\n2. השוואה למקורות חיצוניים.\n3. הסקת מסקנות ערכיות.',
    status: 'approved',
    searchCount: 1100,
  },
  {
    id: 'lit-core-1',
    subject: 'ספרות',
    topic: 'שירה וסיפור קצר',
    title: 'ניתוח יצירות שירה עברית מודרנית וסיפורת',
    type: 'summary',
    difficulty: 'בינוני',
    content: 'ניתוח מוטיבים מרכזיים, אמצעים אמנותיים (מטפורות, דימויים ואלגוריות) ביצירות חובה לבגרות.',
    solutionSteps: '1. זיהוי הדובר והסיטואציה בשיר.\n2. איתור אמצעים אומנותיים מרכזיים.\n3. חיבור למשמעות הכללית.',
    status: 'approved',
    searchCount: 950,
  },

  // 2. מקצועות תורניים
  {
    id: 'jew-1',
    subject: 'תורה שבעל פה (תושב"ע)',
    topic: 'משנה וגמרא',
    title: 'סוגיות מרכזיות במסכת ברכות ובבא מציעא',
    type: 'summary',
    difficulty: 'מתקדם',
    content: 'ביאור עומק למבנה הסוגיה התלמודית, מושגי יסוד הלכתיים, וכללי פסיקה מרכזיים.',
    solutionSteps: '1. הבנת המחלוקת במשנה.\n2. קושיית הגמרא ותירוצה.\n3. פסיקת הלכה למעשה.',
    status: 'approved',
    searchCount: 600,
  },

  // 3. מדעים
  {
    id: 'sci-phys-1',
    subject: 'פיזיקה 5 יח׳',
    topic: 'מכניקה ואלקטרומגנטיות',
    title: 'קינמטיקה, חוקי ניוטון ושדות מגנטיים',
    type: 'summary',
    difficulty: 'מתקדם',
    content: 'סיכום פיזיקלי מתקדם: תנועה שוות תאוצה, תנועה מעגלית, חוק שימור התנע וחוק פאראדיי.',
    solutionSteps: '1. תרשים כוחות מלא במערכת צירים.\n2. בניית משוואות תנועה לפי חוקי ניוטון.\n3. פתרון אלגברי ובדיקת יחידות מידה.',
    status: 'approved',
    searchCount: 2100,
  },
  {
    id: 'sci-bio-1',
    subject: 'ביולוגיה',
    topic: 'התא וגנטיקה',
    title: 'מבנה התא, תהליכי מטבוליזם ותורשה מנדליאנית',
    type: 'summary',
    difficulty: 'מתקדם',
    content: 'סיכום תהליכים ביולוגיים: נשימה תאית, פוטוסינתזה, שכפול DNA ויצירת חלבונים.',
    solutionSteps: '1. ניתוח גרפים של קצב אנזימטי.\n2. בניית טבלאות פונט בבעיות גנטיות.\n3. הסקת מסקנות מניסויים.',
    status: 'approved',
    searchCount: 1300,
  },
  {
    id: 'sci-cs-1',
    subject: 'מדעי המחשב / רובוטיקה',
    topic: 'תכנות מונחה עצמים ומבני נתונים',
    title: 'אלגוריתמים מתקדמים, עצים ומחלקות ב-C# / Python',
    type: 'summary',
    difficulty: 'מתקדם',
    content: 'עבודה עם עצים בינאריים, רקורסיה, מחלקות וירושה, וניתוח סיבוכיות זמן ריצה.',
    solutionSteps: '1. הגדרת מבנה המחלקה.\n2. מימוש פונקציות רקורסיביות.\n3. בדיקת מקרי קצה.',
    status: 'approved',
    searchCount: 1750,
  },

  // 4. מדעי החברה
  {
    id: 'soc-psych-1',
    subject: 'פסיכולוגיה',
    topic: 'תהליכים קוגניטיביים ומוטיבציה',
    title: 'גישות פסיכולוגיות מרכזיות ומנגנוני הגנה',
    type: 'summary',
    difficulty: 'בינוני',
    content: 'הכרת הגישה הפסיכודינמית, ההתנהגותית וההומניסטית, וניתוח מחקרים אמפיריים.',
    solutionSteps: '1. זיהוי הגישה התאורטית.\n2. התאמת המושגים לאירוע הבוחן.\n3. ניתוח ביקורתי.',
    status: 'approved',
    searchCount: 820,
  },

  // 5. טכנולוגיים
  {
    id: 'tech-elec-1',
    subject: 'הנדסת אלקטרוניקה ומחשבים',
    topic: 'מערכות ספרתיות ומיקרו-בקרים',
    title: 'שערים לוגיים, אלגברה בוליאנית ותכנון מעגלים',
    type: 'summary',
    difficulty: 'מתקדם',
    content: 'תכנון מעגלים קומבינטוריים וספרתיים, מפת קרנו, ומימוש מערכות בקרה ממוחשבות.',
    solutionSteps: '1. בניית טבלת אמת.\n2. צמצום ביטויים אלגבריים.\n3. שרטוט המעגל הלוגי.',
    status: 'approved',
    searchCount: 710,
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

  // וידג'ט צף חכם לתלמיד בכל המסכים
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [floatingChatInput, setFloatingChatInput] = useState('');
  const [isFloatingChatLoading, setIsFloatingChatLoading] = useState(false);
  const [floatingChatHistory, setFloatingChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: 'שלום! אני Catchy AI. אני זמין עבורך כאן בכל רגע לעזור בכל שאלה או תרגיל מכל מקצועות הלימוד.',
    },
  ]);

  // צאט AI ניהולי מלא למנהל
  const [adminChatInput, setAdminChatInput] = useState('');
  const [isAdminChatLoading, setIsAdminChatLoading] = useState(false);
  const [adminChatHistory, setAdminChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: 'שלום אדוני המנהל. אני יועץ ה-AI הניהולי שלך. אשמח לסייע לך בניתוח נתוני בית הספר, תכנון תגבורים לקראת הבגרויות, והמלצות פדגוגיות.',
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

  const [materials] = useState<StudyMaterial[]>(ALL_MINISTRY_SUBJECTS_MATERIALS);
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
    return saved ? JSON.parse(saved) : { 'mat-core-1': 'completed' };
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('catchup_v2_favorites');
    return saved ? JSON.parse(saved) : ['mat-core-1'];
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

  const handleExportSystemData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ system: "CatchUp Super Admin", materials: ALL_MINISTRY_SUBJECTS_MATERIALS, requests }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CatchUp_SuperAdmin_System_Report.json`);
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
    const prompt = `אתה עוזר פדגוגי חכם לסטודנטים חונכים. הכן מבנה הסבר פדגוגי מלא, שלבי לימוד והמחשה פשוטה עבור התלמיד בנושא הבא: ${tutorAiInput}`;
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

    try {
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
      setShowUploadModal(false);
      setCapTopic('');
      setCapNotes('');
      setCapImage('');
      setSelectedCapsule(created);
    } catch (err) {
      console.error('Failed to create capsule:', err);
    } finally {
      setIsCreatingCapsule(false);
    }
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
                  התחבר באמצעות Google או באמצעות אימייל וסיסמה. כל מקצועות משרד החינוך מעודכנים אוטומטית במערכת.
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
      : isSuperAdmin
      ? { label: 'מנהל מערכת ראשי (Super Admin)', classes: 'bg-purple-50 text-purple-700 border-purple-200', logoBg: 'bg-purple-600' }
      : { label: `הנהלת בי״ס • ${currentUser.school}`, classes: 'bg-indigo-50 text-indigo-700 border-indigo-200', logoBg: 'bg-indigo-600' };

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
                { id: 'library', label: 'כל מקצועות משרד החינוך' },
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
              { id: 'library', label: 'כל מקצועות משרד החינוך' },
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
        {/* ----------------- ממשק תלמיד בלבד ----------------- */}
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
                          כל תוכנית הלימודים הרשמית של משרד החינוך מובנית ומעודכנת כאן עבורך:
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
                          <h2 className="font-bold text-lg text-slate-900">כל מקצועות משרד החינוך</h2>
                          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                            כל מקצועות הליבה, מדעים, מדעי הרוח והטכנולוגיה עם הסברים, סרטונים ותרגולים לבגרות.
                          </p>
                        </div>
                        <div className="mt-5">
                          <button
                            onClick={() => setSection('library')}
                            className="w-full bg-white hover:bg-teal-50/60 text-teal-900 border border-teal-300 text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            פתח את כל המקצועות
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
                        <div className="text-xs font-bold text-sky-800 mb-1">ניתוח ופתרון ה-AI</div>
                        <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{selectedCapsule.aiSummary}</p>
                      </div>

                      <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200/70">
                        <div className="text-xs font-bold text-teal-800 mb-2">נוסחאות וכללים מרכזיים</div>
                        <ul className="space-y-1.5">
                          {selectedCapsule.keyFormulas.map((formula, idx) => (
                            <li key={idx} className="text-sm bg-white border border-teal-100 px-3 py-2 rounded-lg text-slate-800">
                              {formula}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="text-xs font-bold text-slate-700 mb-1">פתרון מלא שלב אחר שלב</div>
                        <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{selectedCapsule.solvedExample}</p>
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
                          צפה בסיכום ובפתרון (AI)
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
                  <h1 className="text-2xl font-bold text-slate-900">כל מקצועות משרד החינוך (התוכנית החדשה)</h1>
                  <p className="text-sm text-slate-600">כל המקצועות הרשמיים, כולל סיכומים, סרטוני הסבר ותרגולים מלאים.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="חפש מקצוע או נושא..."
                      className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {['הכל', 'מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳', 'אזרחות', 'היסטוריה', 'הבעה ולשון עברית', 'תנ"ך / מקרא', 'ספרות', 'תורה שבעל פה (תושב"ע)', 'ביולוגיה', 'מדעי המחשב / רובוטיקה', 'פסיכולוגיה', 'הנדסת אלקטרוניקה ומחשבים'].map((subj) => (
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
                              {item.subject} • תוכנית משרד החינוך החדשה
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
                              {isOpen ? <><ChevronUp className="w-4 h-4" /> הסתר פתרון ותרגול</> : <><ChevronDown className="w-4 h-4" /> הצג פתרון ותרגול שלב-אחר-שלב</>}
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
                        <p className="text-xs text-slate-500">הסברים מיידיים ועמוקים לבגרות</p>
                      </div>
                      <select
                        value={chatSubject}
                        onChange={(e) => setChatSubject(e.target.value)}
                        className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-1.5 bg-sky-50 text-sky-900"
                      >
                        <option>מתמטיקה 5 יח׳</option>
                        <option>פיזיקה 5 יח׳</option>
                        <option>אנגלית 5 יח׳</option>
                        <option>אזרחות</option>
                        <option>היסטוריה</option>
                        <option>ביולוגיה</option>
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
                      {isChatLoading && <div className="text-xs text-slate-400">Catchy מנסח הסבר פדגוגי מלא...</div>}
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleAskAI(); }} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="שאל שאלה בלשון חופשית על כל נושא..."
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
                        <option>אזרחות</option>
                        <option>היסטוריה</option>
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
                  צפה בכל השיעורים והבקשות של התלמידים, השבץ לבחירתך, והשתמש בכלי ה-AI ליצירת מערכי הסבר עמוקים לתלמיד.
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
                  <h2 className="text-lg font-bold text-slate-900">כלי AI חכם להכנת מערכי הסבר לחונכות</h2>
                </div>
                <p className="text-xs text-slate-600">הזן נושא לימודי וקבל מיד הסבר פדגוגי עמוק עם דוגמאות להמחשה:</p>
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
                  <span>צור מבנה הסבר מקיף לחונכות</span>
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

        {/* ----------------- ממשק מנהל מערכת ראשי (Super Admin) בלבד (נקי לחלוטין) ----------------- */}
        {role === 'admin' && isSuperAdmin && (
          <div className="space-y-6">
            <div className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="h-1.5 bg-purple-600" />
              <div className="p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Server className="w-6 h-6 text-purple-600" />
                    <span>ניהול מערכת ראשי (Super Admin Dashboard)</span>
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    מסך בקרה ייעודי לניהול תשתיות, משתמשים, הרשאות רוחביות וייצוא נתונים מערכתי.
                  </p>
                </div>
                <button
                  onClick={handleExportSystemData}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  ייצוא נתוני מערכת מלאים
                </button>
              </div>
            </div>

            {/* ניהול הרשאות למשתמשים (שיוך תפקיד ומייל) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-purple-900">
                <Users className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold">ניהול הרשאות משתמשים וקישור תפקידים</h2>
              </div>
              <p className="text-xs text-slate-600">הזן כתובת מייל, בחר האם להגדירו כמנהל בית ספר, סטודנט חונך או תלמיד:</p>
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
                  <option value="student">תלמיד</option>
                  <option value="tutor">סטודנט חונך</option>
                </select>
                <input
                  type="text"
                  placeholder="שם בית הספר"
                  value={newStaffSchool}
                  onChange={(e) => setNewStaffSchool(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-300 text-sm"
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl text-sm">
                  שמור הרשאה
                </button>
              </form>
              {staffMsg && <p className="text-xs font-medium text-emerald-700">{staffMsg}</p>}
            </div>

            {/* צאט AI ניהולי מלא למנהל */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold">יועץ AI ניהולי לפיתוח המערכת</h2>
              </div>
              <p className="text-xs text-slate-600">התכתב חופשי עם יועץ ה-AI לקבלת המלצות ארכיטקטוניות, פדגוגיות ודרכי ייעול:</p>
              
              <div className="h-64 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                {adminChatHistory.map((m, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-purple-600 text-white mr-6' : 'bg-white border border-slate-200 text-slate-800 ml-6'}`}>
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
                  placeholder="שאל שאלה ניהולית או טכנולוגית..."
                  className="flex-1 text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-purple-500"
                />
                <button type="submit" className="bg-purple-600 text-white px-5 rounded-xl">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* וידג'ט צף קבוע בצד ימין למטה עבור תלמידים בלבד */}
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
                {isFloatingChatLoading && <div className="text-xs text-slate-400">Catchy חושב על תשובה מקיפה...</div>}
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

      {/* מודאל העלאת שיעור מהכיתה */}
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
                  <option>אזרחות</option>
                  <option>היסטוריה</option>
                  <option>ביולוגיה</option>
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
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                {isCreatingCapsule && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isCreatingCapsule ? 'מייצר סיכום בעזרת AI...' : 'פרסם סיכום למערכת'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}