import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Star,
  Send,
  Plus,
  Search,
  PlayCircle,
  Camera,
  UserCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Trash2,
  MessageSquare,
  GraduationCap,
  FileText,
  ArrowRight,
  User,
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

type StudentSection = 'home' | 'capsules' | 'library' | 'help' | 'profile';

export default function App() {
  const [role, setRole] = useState<UserRole>('student');
  const [section, setSection] = useState<StudentSection>('home');

  // פרופיל תלמיד
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('catchup_v2_profile');
    return saved
      ? JSON.parse(saved)
      : {
          name: 'יניב אסרף',
          email: 'yanivasraf45@gmail.com',
          role: 'student',
          school: 'אמית ישיבה תיכונית שדרות',
          grade: 'י״א',
          subjects: ['מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳'],
          xp: 150,
        };
  });

  // נתוני המערכת
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

  useEffect(() => localStorage.setItem('catchup_v2_profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('catchup_v2_materials', JSON.stringify(materials)), [materials]);
  useEffect(() => localStorage.setItem('catchup_v2_capsules', JSON.stringify(capsules)), [capsules]);
  useEffect(() => localStorage.setItem('catchup_v2_requests', JSON.stringify(requests)), [requests]);
  useEffect(() => localStorage.setItem('catchup_v2_progress', JSON.stringify(progressMap)), [progressMap]);
  useEffect(() => localStorage.setItem('catchup_v2_favorites', JSON.stringify(favorites)), [favorites]);

  // ספריית לימוד
  const [subjectFilter, setSubjectFilter] = useState<string>('הכל');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openSolutions, setOpenSolutions] = useState<Record<string, boolean>>({});

  // קפסולות שיעור חיות
  const [selectedCapsule, setSelectedCapsule] = useState<LiveCapsule | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [capSubject, setCapSubject] = useState('מתמטיקה 5 יח׳');
  const [capTopic, setCapTopic] = useState('');
  const [capNotes, setCapNotes] = useState('');
  const [capImage, setCapImage] = useState('');
  const [isCreatingCapsule, setIsCreatingCapsule] = useState(false);

  // חונך AI (Catchy)
  const [chatSubject, setChatSubject] = useState('מתמטיקה 5 יח׳');
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: 'שלום! אני Catchy. כתוב לי כאן איזה נושא או תרגיל לא מובן לך, ואסביר לך אותו בעברית פשוטה צעד אחר צעד.',
    },
  ]);

  // בקשת שיעור עם סטודנט + תיק קליני אוטומטי
  const [reqSubject, setReqSubject] = useState('מתמטיקה 5 יח׳');
  const [reqTopic, setReqTopic] = useState('');
  const [reqTime, setReqTime] = useState('היום אחה״צ (17:00–19:00)');
  const [reqContact, setReqContact] = useState('052-3688248');
  const [createdClinicalPreview, setCreatedClinicalPreview] = useState<string | null>(null);

  // ניהול תוכן (מנהל)
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('מתמטיקה 5 יח׳');
  const [newTopic, setNewTopic] = useState('');
  const [newType, setNewType] = useState<'summary' | 'exercise' | 'video'>('summary');
  const [newContent, setNewContent] = useState('');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCapImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capTopic.trim()) return;
    setIsCreatingCapsule(true);

    const result = await generateCapsuleFromInput(capSubject, capTopic, capNotes, capImage || undefined);

    const created: LiveCapsule = {
      id: `cap-${Date.now()}`,
      subject: capSubject,
      topic: capTopic,
      school: profile.school,
      grade: profile.grade,
      lessonDate: new Date().toLocaleDateString('he-IL'),
      uploaderName: `${profile.name} (${profile.grade})`,
      sourceType: capImage ? 'photo' : 'voice_note',
      aiSummary: result.aiSummary,
      keyFormulas: result.keyFormulas,
      solvedExample: result.solvedExample,
      quickQuiz: result.quickQuiz,
    };

    setCapsules([created, ...capsules]);
    setProfile((p) => ({ ...p, xp: p.xp + 50 }));
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
    if (!reqTopic.trim()) return;

    const matchingCapsule = capsules.find((c) => c.subject === reqSubject);
    const clinicalBrief =
      `רקע לימודי אוטומטי: ${profile.name} (כיתה ${profile.grade}, ${profile.school}) ביקש/ה עזרה ב-${reqSubject} בנושא "${reqTopic}". ` +
      (matchingCapsule
        ? `ב-${matchingCapsule.lessonDate} הועלה סיכום שיעור מהכיתה בנושא "${matchingCapsule.topic}". `
        : '') +
      `מומלץ להתחיל ישירות מתרגול יסודות הנושא "${reqTopic}" למשך 10 דקות ללא צורך בהסבר מקדים.`;

    const newRequest: TutoringRequest = {
      id: `req-${Date.now()}`,
      studentName: profile.name,
      studentGrade: profile.grade,
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col" dir="rtl">
      {/* סרגל עליון נקי ורגוע */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* לוגו */}
          <button
            onClick={() => {
              setRole('student');
              setSection('home');
            }}
            className="flex items-center gap-2.5 text-right"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center">
              C
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">CatchUp</span>
              <span className="hidden sm:inline text-xs text-slate-400 mr-2">השלמת חומר לימודי</span>
            </div>
          </button>

          {/* ניווט מרכזי לתלמיד (3 אפשרויות ברורות בלבד) */}
          {role === 'student' && (
            <nav className="flex items-center gap-1 sm:gap-2">
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    section === nav.id
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {nav.label}
                </button>
              ))}
            </nav>
          )}

          {/* מחליף תצוגה עדין (להדגמה בין תלמיד / סטודנט חונך / מנהל) */}
          <div className="flex items-center gap-2">
            <select
              aria-label="בחר תצוגת משתמש"
              value={role}
              onChange={(e) => {
                const nextRole = e.target.value as UserRole;
                setRole(nextRole);
                if (nextRole === 'student') setSection('home');
              }}
              className="text-xs font-medium bg-slate-100 hover:bg-slate-200/70 text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="student">תצוגה: תלמיד/ה</option>
              <option value="tutor">תצוגה: סטודנט חונך</option>
              <option value="admin">תצוגה: מנהל בית ספר</option>
            </select>

            {role === 'student' && (
              <button
                onClick={() => setSection('profile')}
                title="הפרופיל שלי"
                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                <User className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* תוכן מרכזי מרווח ונקי */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* ================================================================= */}
        {/* 1. ממשק תלמיד (STUDENT INTERFACE)                                  */}
        {/* ================================================================= */}
        {role === 'student' && (
          <>
            {/* מסך ראשי: 3 צעדים פשוטים שכל תלמיד מבין תוך שנייה */}
            {section === 'home' && (
              <div className="space-y-8">
                {/* פתיחה רגועה וברורה */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">
                        שלום {profile.name} 👋
                      </h1>
                      <p className="text-slate-600 text-sm sm:text-base mt-1">
                        בחר פעולה אחת פשוטה כדי להשלים חומר או להתקדם בלימודים:
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                      {profile.school} • שכבת {profile.grade} •{' '}
                      <strong className="text-slate-800">{completedCount} נושאים הושלמו</strong>
                    </div>
                  </div>

                  {/* 3 כרטיסי פעולה ראשיים - ממוספרים, נקיים, בלי רעש */}
                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    {/* פעולה 1 */}
                    <div className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between bg-slate-50/40 hover:border-blue-300 transition">
                      <div>
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mb-3">
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
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          השלם שיעור עכשיו
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="w-full text-xs text-slate-600 hover:text-blue-700 py-1 font-medium"
                        >
                          היית בשיעור? העלה צילום לוח לחברים
                        </button>
                      </div>
                    </div>

                    {/* פעולה 2 */}
                    <div className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between bg-slate-50/40 hover:border-blue-300 transition">
                      <div>
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center mb-3">
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
                          className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          פתח חומרי לימוד
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* פעולה 3 */}
                    <div className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between bg-slate-50/40 hover:border-blue-300 transition">
                      <div>
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center mb-3">
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
                          className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          קבל עזרה אישית
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* שיעורים אחרונים שהועלו מהכיתה */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">שיעורים אחרונים מהכיתה שלך</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        סיכומי 10 דקות שהוכנו מצילומי לוח והקלטות של תלמידים בכיתה
                      </p>
                    </div>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-lg flex items-center gap-1"
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
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
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
                          className="shrink-0 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 text-xs font-semibold px-4 py-2 rounded-lg transition"
                        >
                          קרא סיכום (10 דק׳)
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* מסך 2: שיעורים מהכיתה (קפסולת שיעור חיה + צפייה מודרכת שלב-אחר-שלב) */}
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
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    העלה צילום לוח / סיכום מהיום
                  </button>
                </div>

                {/* תצוגת קפסולה נבחרת צעד אחר צעד */}
                {selectedCapsule ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <button
                        onClick={() => setSelectedCapsule(null)}
                        className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
                      >
                        <ArrowRight className="w-4 h-4" />
                        חזרה לרשימת השיעורים
                      </button>
                      <span className="text-xs text-slate-500">
                        {selectedCapsule.subject} • {selectedCapsule.lessonDate}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedCapsule.topic}</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        הוכן עבור כיתה {selectedCapsule.grade} ({selectedCapsule.school}) מתוך שיתוף של {selectedCapsule.uploaderName}
                      </p>
                    </div>

                    {/* 4 שלבים מסודרים וברורים */}
                    <div className="space-y-5">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="text-xs font-bold text-blue-700 mb-1">שלב 1 מתוך 4 • מה נלמד היום בכיתה</div>
                        <p className="text-sm text-slate-800 leading-relaxed">{selectedCapsule.aiSummary}</p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="text-xs font-bold text-blue-700 mb-2">שלב 2 מתוך 4 • נוסחאות וכללים חשובים</div>
                        <ul className="space-y-1.5">
                          {selectedCapsule.keyFormulas.map((formula, idx) => (
                            <li
                              key={idx}
                              className="text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg text-slate-800"
                            >
                              {formula}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="text-xs font-bold text-blue-700 mb-1">שלב 3 מתוך 4 • דוגמה פתורה מהלוח</div>
                        <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                          {selectedCapsule.solvedExample}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                        <div className="text-xs font-bold text-blue-700">שלב 4 מתוך 4 • בדיקה עצמית (לחץ על השאלה לתשובה)</div>
                        {selectedCapsule.quickQuiz.map((q, idx) => (
                          <details key={idx} className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                            <summary className="font-semibold cursor-pointer text-slate-900">{q.question}</summary>
                            <p className="mt-2 text-emerald-700 text-sm">{q.answer}</p>
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
                        className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-300 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
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
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
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

            {/* מסך 3: ספריית סיכומים ותרגילים */}
            {section === 'library' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">סיכומים, תרגילים וסרטונים</h1>
                  <p className="text-sm text-slate-600">סנן לפי מקצוע ובחר נושא ללמידה</p>
                </div>

                {/* סינון נקי */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="חפש נושא..."
                      className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {['הכל', 'מתמטיקה 5 יח׳', 'פיזיקה 5 יח׳', 'אנגלית 5 יח׳'].map((subj) => (
                      <button
                        key={subj}
                        onClick={() => setSubjectFilter(subj)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                          subjectFilter === subj
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>

                {/* רשימת תכנים */}
                <div className="space-y-4">
                  {visibleMaterials.map((item) => {
                    const isDone = progressMap[item.id] === 'completed';
                    const isFav = favorites.includes(item.id);
                    const isOpen = Boolean(openSolutions[item.id]);

                    return (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                {item.subject}
                              </span>
                              <span>{item.topic}</span>
                              {item.type === 'video' && (
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">סרטון הסבר</span>
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
                              className={`p-2 rounded-lg border text-xs ${
                                isFav
                                  ? 'bg-amber-50 border-amber-200 text-amber-600'
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
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
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

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                          {item.content}
                        </div>

                        {item.videoUrl && (
                          <a
                            href={item.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
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
                              className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
                              <div className="mt-3 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
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

            {/* מסך 4: עזרה אישית (חונך AI + בקשת שיעור עם סטודנט) */}
            {section === 'help' && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* צד ימין: חונך AI בעברית פשוטה */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">1. שאל את Catchy (חונך AI)</h2>
                        <p className="text-xs text-slate-500">הסברים מיידיים בעברית פשוטה</p>
                      </div>
                      <select
                        value={chatSubject}
                        onChange={(e) => setChatSubject(e.target.value)}
                        className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50"
                      >
                        <option>מתמטיקה 5 יח׳</option>
                        <option>פיזיקה 5 יח׳</option>
                        <option>אנגלית 5 יח׳</option>
                      </select>
                    </div>

                    <div className="h-72 overflow-y-auto bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                      {chatHistory.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl text-sm whitespace-pre-line leading-relaxed ${
                            m.sender === 'user'
                              ? 'bg-blue-600 text-white mr-8'
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
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium"
                      >
                        הסבר לי בפשטות
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAskAI('תן לי דוגמה פתורה')}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium"
                      >
                        תן לי דוגמה פתורה
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAskAI('בחן אותי ב-3 שאלות')}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium"
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
                        className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl flex items-center justify-center"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* צד שמאל: בקשת שיעור עם סטודנט (תיק קליני אוטומטי מאחורי הקלעים) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
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
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-sm transition"
                    >
                      שלח בקשה לסטודנט
                    </button>
                  </form>

                  {createdClinicalPreview && (
                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-800 space-y-1">
                      <div className="font-bold text-blue-900">הבקשה נשלחה! זהו התיק הקליני שצורף לסטודנט:</div>
                      <p className="leading-relaxed">{createdClinicalPreview}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* מסך 5: הגדרת פרופיל תלמיד */}
            {section === 'profile' && (
              <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h1 className="text-xl font-bold text-slate-900">הפרופיל הלימודי שלי</h1>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">שם מלא</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">בית ספר</label>
                  <input
                    type="text"
                    value={profile.school}
                    onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">שכבת גיל</label>
                  <select
                    value={profile.grade}
                    onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="י׳">כיתה י׳</option>
                    <option value="י״א">כיתה י״א</option>
                    <option value="י״ב">כיתה י״ב</option>
                  </select>
                </div>
                <button
                  onClick={() => setSection('home')}
                  className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  שמור וחזור למסך הראשי
                </button>
              </div>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* 2. ממשק סטודנט חונך (TUTOR VIEW + תיק קליני אוטומטי)               */}
        {/* ================================================================= */}
        {role === 'tutor' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h1 className="text-2xl font-bold text-slate-900">בקשות תלמידים לעזרה</h1>
              <p className="text-sm text-slate-600 mt-1">
                לכל בקשה מצורף אוטומטית <strong>תיק קליני</strong> המפרט מה התלמיד פספס ואיפה נתקע — כדי שתתחילו ישר לתרגל.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded">
                        {req.subject}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded ${
                          req.status === 'open'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : req.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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

                    {/* תיק קליני אוטומטי רגוע ומסודר */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        תיק קליני אוטומטי (רקע לפני שיעור):
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{req.clinicalBrief}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">טלפון: {req.studentContact}</span>
                    {req.status === 'open' && (
                      <button
                        onClick={() =>
                          setRequests((prev) =>
                            prev.map((r) =>
                              r.id === req.id ? { ...r, status: 'in_progress', assignedTutor: 'את/ה' } : r
                            )
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
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

        {/* ================================================================= */}
        {/* 3. ממשק מנהל / משרד החינוך (רדאר התרעה מוקדמת + ניהול תוכן)        */}
        {/* ================================================================= */}
        {role === 'admin' && (
          <div className="space-y-6">
            {/* כותרת ומדדים */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">רדאר התרעה מוקדמת — {profile.school}</h1>
                <p className="text-sm text-slate-600 mt-1">
                  זיהוי מוקדם (אנונימי) של נושאים שבהם תלמידים מתקשים <strong>לפני</strong> מועד המבחן.
                </p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
                  <div className="text-lg font-bold text-slate-900">142</div>
                  <div className="text-xs text-slate-500">תלמידים פעילים</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
                  <div className="text-lg font-bold text-slate-900">{approvedMaterials.length}</div>
                  <div className="text-xs text-slate-500">תכנים מאושרים</div>
                </div>
              </div>
            </div>

            {/* מפת חום של פערים בזמן אמת */}
            <div className="grid md:grid-cols-3 gap-4">
              {radarAlerts.map((alert) => (
                <div key={alert.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
                      {alert.subject} • {alert.grade}
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded ${
                        alert.severity === 'critical'
                          ? 'bg-rose-50 text-rose-700'
                          : alert.severity === 'warning'
                          ? 'bg-amber-50 text-amber-700'
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

            {/* ניהול תוכן */}
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6">
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm"
                  >
                    פרסם למערכת
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">אישור וניהול תכנים</h2>
                <div className="divide-y divide-slate-100">
                  {materials.map((m) => (
                    <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500">
                          {m.subject} •{' '}
                          <span className={m.status === 'approved' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
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

      {/* מודל נקי להעלאת צילום לוח / סיכום מהכיתה */}
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
                  className="w-full text-xs text-slate-600 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700"
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm"
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
