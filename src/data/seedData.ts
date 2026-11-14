import { StudyMaterial, LiveCapsule, TutoringRequest, RadarAlert } from '../types';

export const INITIAL_MATERIALS: StudyMaterial[] = [
  {
    id: 'mat-1',
    subject: 'מתמטיקה 5 יח׳',
    topic: 'משוואות טריגונומטריות',
    title: 'סיכום: זהויות טריגונומטריות ופתרון משוואות',
    type: 'summary',
    content:
      'כדי לפתור משוואות טריגונומטריות ב-5 יחידות, מביאים קודם את כל הביטויים לאותה פונקציה ולאותה זווית:\n\n' +
      '• זהות פיתגורס הבסיסית: sin²(x) + cos²(x) = 1\n' +
      '• זווית כפולה בסינוס: sin(2x) = 2sin(x)cos(x)\n' +
      '• זווית כפולה בקוסינוס: cos(2x) = 1 - 2sin²(x)\n\n' +
      'כלל ברזל לבגרות: לא מצמצמים בביטוי שיכול להתאפס (כמו sin(x)), אלא מוציאים גורם משותף כדי לא לאבד פתרונות.',
    status: 'approved',
    searchCount: 148,
  },
  {
    id: 'mat-2',
    subject: 'מתמטיקה 5 יח׳',
    topic: 'משוואות טריגונומטריות',
    title: 'תרגיל לתרגול: משוואה עם זהות פיתגורס',
    type: 'exercise',
    difficulty: 'רמת בגרות',
    content: 'פתור את המשוואה בתחום 0 ≤ x ≤ 2π:\n2cos²(x) + 3sin(x) - 3 = 0',
    solutionSteps:
      'שלב 1: ממירים את cos²(x) לביטוי עם sin(x) בעזרת הזהות cos²(x) = 1 - sin²(x).\n' +
      'שלב 2: מציבים במשוואה ומסדרים: 2sin²(x) - 3sin(x) + 1 = 0.\n' +
      'שלב 3: פותרים משוואה ריבועית עבור t = sin(x) ומקבלים: t₁ = 1, t₂ = 0.5.\n' +
      'שלב 4: מוצאים את הזוויות בתחום: x = π/2, x = π/6, x = 5π/6.',
    status: 'approved',
    searchCount: 132,
  },
  {
    id: 'mat-3',
    subject: 'פיזיקה 5 יח׳',
    topic: 'תנועה מעגלית',
    title: 'סיכום: כוח צנטריפטלי, תדירות וזמן מחזור',
    type: 'summary',
    content:
      'בתנועה מעגלית קצובה גודל המהירות קבוע, אך הכיוון משתנה בכל רגע — ולכן פועלת תאוצה לכיוון מרכז המעגל:\n\n' +
      '• תאוצה רדיאלית: a_R = v² / R = ω² · R\n' +
      '• החוק השני של ניוטון: ΣF_R = m · a_R\n' +
      '• קשר בין מהירות קווית לזוויתית: v = ω · R = (2πR) / T\n\n' +
      'טיפ חשוב: כוח צנטריפטלי הוא לא כוח נפרד בשרטוט, אלא שקול הכוחות האמיתיים (מתיחות, נורמל, כבידה או חיכוך) הפועלים למרכז.',
    status: 'approved',
    searchCount: 194,
  },
  {
    id: 'mat-4',
    subject: 'פיזיקה 5 יח׳',
    topic: 'תנועה מעגלית',
    title: 'סרטון הסבר: מטוטלת קונית וסיבוב על משטח משופע',
    type: 'video',
    content: 'הסבר ממוקד של 8 דקות על פירוק כוחות במטוטלת קונית ומציאת המהירות המקסימלית בלי החלקה.',
    videoUrl: 'https://www.youtube.com/watch?v=bpFK2VCRHUs',
    status: 'approved',
    searchCount: 115,
  },
  {
    id: 'mat-5',
    subject: 'אנגלית 5 יח׳',
    topic: 'Module G - חיבור טיעון',
    title: 'תבנית מסודרת לכתיבת Opinion Essay',
    type: 'summary',
    content:
      'חיבור ב-Module G כולל 120–140 מילים ומחולק ל-4 פסקאות ברורות:\n' +
      '1. פתיחה: הצגת הנושא והבעת עמדה ברורה (I firmly believe that...).\n' +
      '2. טיעון ראשון + דוגמה (First and foremost, ... For instance, ...).\n' +
      '3. טיעון שני + הסבר (Furthermore, ... Consequently, ...).\n' +
      '4. סיכום: חזרה על העמדה במילים אחרות (In conclusion, ...).',
    status: 'approved',
    searchCount: 89,
  },
  {
    id: 'mat-6',
    subject: 'מתמטיקה 5 יח׳',
    topic: 'חקירת פונקציה רציונלית',
    title: 'טיוטה לבדיקה: אסימפטוטות אנכיות וחורים בפונקציה',
    type: 'summary',
    content: 'סיכום שהועלה על ידי חונך וממתין לאישור לפני פרסום לכלל התלמידים.',
    status: 'pending',
    searchCount: 12,
  },
];

export const INITIAL_CAPSULES: LiveCapsule[] = [
  {
    id: 'cap-1',
    subject: 'פיזיקה 5 יח׳',
    topic: 'תנועה מעגלית אנכית — נקודה עליונה ותחתונה',
    school: 'אמית ישיבה תיכונית שדרות',
    grade: 'י״א',
    lessonDate: '12/11/2026',
    uploaderName: 'אברהם כ. (י״א 2)',
    sourceType: 'photo',
    aiSummary:
      'המורה פתר היום בכיתה את שאלת "הקרונית בלולאה" והדגיש את התנאי להשלמת סיבוב מלא: בנקודה העליונה הנורמל מתאפס (N = 0), ולכן כוח הכובד לבדו מספק את התאוצה הרדיאלית. בנוסף תרגלנו חישוב מתיחות חוט בנקודה התחתונה.',
    keyFormulas: [
      'בנקודה עליונה (תנאי סף): mg = m · v_min² / R  =>  v_min = √(gR)',
      'בנקודה תחתונה: T - mg = m · v² / R',
      'שימור אנרגיה בין תחתית לשיא: ½mv_bottom² = ½mv_top² + mg(2R)',
    ],
    solvedExample:
      'שאלה מהלוח: כדור קשור לחוט באורך R = 1.6m מסתובב במישור אנכי. מהי המהירות המינימלית בשיא?\n' +
      'פתרון: מציבים N = 0 בשיא: mg = mv²/R  =>  v = √(10 · 1.6) = 4 m/s.',
    quickQuiz: [
      {
        question: 'מה שווה כוח הנורמל בשיא הגובה במהירות המינימלית להשלמת סיבוב?',
        answer: 'הנורמל שווה לאפס (N = 0) — רגע לפני ניתוק מהמסילה.',
      },
      {
        question: 'היכן המתיחות בחוט גדולה יותר: בשיא הגובה או בתחתית המסלול?',
        answer: 'בתחתית המסלול, כי שם המתיחות מתגברת גם על כוח הכובד וגם מספקת תאוצה למעלה.',
      },
    ],
  },
  {
    id: 'cap-2',
    subject: 'מתמטיקה 5 יח׳',
    topic: 'משוואות טריגונומטריות עם זווית כפולה',
    school: 'אמית ישיבה תיכונית שדרות',
    grade: 'י״א',
    lessonDate: '12/11/2026',
    uploaderName: 'מעיין ל. (י״א 1)',
    sourceType: 'voice_note',
    aiSummary:
      'השיעור התמקד במעבר ממשוואה שמכילה גם cos(2x) וגם sin(x) למשוואה ריבועית. המורה הדגישה לבחור בזהות cos(2x) = 1 - 2sin²(x) כדי להישאר עם סינוס בלבד.',
    keyFormulas: [
      'cos(2x) = 1 - 2sin²(x)',
      'sin(x) = sin(α)  =>  x = α + 2πk  או  x = π - α + 2πk',
    ],
    solvedExample:
      'דוגמה מהמחברת: cos(2x) + sin(x) = 0\n' +
      'מציבים זהות: 1 - 2sin²(x) + sin(x) = 0  =>  2sin²(x) - sin(x) - 1 = 0.\n' +
      'מקבלים sin(x) = 1 או sin(x) = -0.5 ומוצאים את הפתרונות בתחום.',
    quickQuiz: [
      {
        question: 'איזו זהות של cos(2x) נבחר אם מופיע במשוואה גם cos(x)?',
        answer: 'נבחר בזהות cos(2x) = 2cos²(x) - 1 כדי להישאר עם פונקציה אחת.',
      },
    ],
  },
];

export const INITIAL_REQUESTS: TutoringRequest[] = [
  {
    id: 'req-101',
    studentName: 'יהלי מ.',
    studentGrade: 'י״א',
    studentContact: '052-8419203',
    subject: 'מתמטיקה 5 יח׳',
    topic: 'משוואות טריגונומטריות',
    preferredTime: 'היום בין 17:00 ל-19:00',
    clinicalBrief:
      'התלמיד הפסיד שיעור ב-12/11 (משוואות טריגונומטריות) עקב צו ראשון. מתקשה בהמרת זהויות פיתגורס (sin²x + cos²x = 1) ובהעברת אגפים. מומלץ להתחיל ישירות מתרגול 2 זהויות בסיסיות לפני משוואות זווית כפולה.',
    status: 'open',
    createdAt: 'לפני 25 דקות',
  },
  {
    id: 'req-102',
    studentName: 'שירה ד.',
    studentGrade: 'י״א',
    studentContact: '054-7120944',
    subject: 'פיזיקה 5 יח׳',
    topic: 'תנועה מעגלית אנכית',
    preferredTime: 'מחר אחה״צ (16:30)',
    clinicalBrief:
      'התלמידה קראה את סיכום השיעור מ-12/11, אך נתקעה בחישוב שימור אנרגיה בין תחתית הלולאה לשיא הגובה. מומלץ לחזק את הקשר v_min = √(gR) ולפתור יחד שאלת בגרות אחת.',
    status: 'open',
    createdAt: 'לפני שעה',
  },
  {
    id: 'req-103',
    studentName: 'טל ר.',
    studentGrade: 'י״ב',
    studentContact: '050-9938122',
    subject: 'אנגלית 5 יח׳',
    topic: 'Module G - חיבור טיעון',
    preferredTime: 'יום ראשון בערב',
    clinicalBrief:
      'התלמיד עבר על תבנית החיבור ומבקש משוב על פסקת פתיחה ומילות קישור לקראת מתכונת.',
    status: 'in_progress',
    assignedTutor: 'עומר לוי (סטודנט להנדסת תוכנה)',
    createdAt: 'אתמול',
  },
];

export const INITIAL_RADAR_ALERTS: RadarAlert[] = [
  {
    id: 'rad-1',
    school: 'אמית ישיבה תיכונית שדרות',
    grade: 'י״א 5 יח׳',
    subject: 'פיזיקה',
    topic: 'תנועה מעגלית אנכית (תנאי ניתוק)',
    stuckPercentage: 64,
    studentsAffected: 27,
    severity: 'critical',
    timeframe: 'ב-48 השעות האחרונות',
    recommendation:
      '64% מתלמידי המגמה נתקעו בכתיבת משוואת הכוחות בשיא הגובה. מומלץ להקדיש 15 דקות חזרה בכיתה לפני המבחן.',
  },
  {
    id: 'rad-2',
    school: 'תיכוני שדרות',
    grade: 'י״א 5 יח׳',
    subject: 'מתמטיקה',
    topic: 'משוואות טריגונומטריות — זווית כפולה',
    stuckPercentage: 48,
    studentsAffected: 41,
    severity: 'warning',
    timeframe: 'ב-72 השעות האחרונות',
    recommendation:
      'עלייה בבקשות השלמה עקב היעדרויות צו ראשון. מומלץ לשלוח לכיתה את סיכום השיעור של 10 הדקות.',
  },
  {
    id: 'rad-3',
    school: 'אמית ישיבה תיכונית שדרות',
    grade: 'י״ב 5 יח׳',
    subject: 'אנגלית',
    topic: 'Module G - כתיבת טיעון',
    stuckPercentage: 29,
    studentsAffected: 19,
    severity: 'watch',
    timeframe: 'השבוע האחרון',
    recommendation:
      'מגמה חיובית: 71% מהתלמידים שפתחו את התבנית השלימו את התרגול בהצלחה.',
  },
];
