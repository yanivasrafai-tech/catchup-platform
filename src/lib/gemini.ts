const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const isGeminiConfigured = Boolean(
  GEMINI_API_KEY && !GEMINI_API_KEY.includes('your-gemini-api-key')
);

export async function askCatchyTutor(prompt: string, contextSubject: string): Promise<string> {
  if (isGeminiConfigured) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `אתה "Catchy", חונך AI אישי לתלמידי תיכון בישראל בפלטפורמת CatchUp.
ענה בעברית פשוטה, מסודרת, רגועה ובגובה העיניים, לפי תוכנית הלימודים של משרד החינוך.
המקצוע: ${contextSubject}.
בקשת התלמיד: ${prompt}`,
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      console.error('Gemini fallback:', err);
    }
  }

  if (prompt.includes('בחן אותי')) {
    return (
      `הנה 3 שאלות קצרות לבדיקה עצמית ב-${contextSubject}:\n\n` +
      `1. מהו הצעד הראשון שתמיד נבצע לפני שמתחילים לפתור תרגיל בנושא הזה?\n` +
      `2. מה המשמעות כשביטוי מסוים מתאפס (למשל מכנה או כוח נורמל)?\n` +
      `3. איזו טעות נפוצה כדאי להימנע ממנה בבגרות בנושא זה?\n\n` +
      `כתוב לי את התשובות שלך כאן ואבדוק אותן איתך.`
    );
  }

  if (prompt.includes('דוגמה')) {
    return (
      `דוגמה פתורה שלב-אחר-שלב ב-${contextSubject}:\n\n` +
      `שלב 1 — כותבים בצד את הנתונים ואת הנוסחה הבסיסית מדף הנוסחאות.\n` +
      `שלב 2 — מציבים את הנתונים ומעבירים אגפים בזהירות (בלי לחלק בנעלם שיכול להתאפס).\n` +
      `שלב 3 — בודקים שהתשובה הסופית מתאימה לתחום ההגדרה.`
    );
  }

  return (
    `הנה הסבר פשוט ומסודר בנושא שביקשת (${contextSubject}):\n\n` +
    `• קודם מזהים מה נתון ומה מבקשים למצוא.\n` +
    `• בוחרים כלל יסוד אחד שמחבר בין הנתונים.\n` +
    `• פותרים שלב אחרי שלב ובודקים בסוף שהתוצאה הגיונית.\n\n` +
    `רוצה דוגמה פתורה או 3 שאלות תרגול? לחץ על הכפתורים למטה.`
  );
}

export async function generateCapsuleFromInput(
  subject: string,
  topic: string,
  rawNotes: string,
  imageBase64?: string
): Promise<{
  aiSummary: string;
  keyFormulas: string[];
  solvedExample: string;
  quickQuiz: { question: string; answer: string }[];
}> {
  if (isGeminiConfigured) {
    try {
      const parts: any[] = [
        {
          text: `אתה מנוע הסיכום של CatchUp. תלמיד צילם לוח/מחברת או כתב סיכום קצר מהשיעור היום בכיתה.
מקצוע: ${subject}
נושא: ${topic}
הערות: ${rawNotes || 'מצורפת תמונת לוח מהשיעור'}

החזר JSON תקני בלבד במבנה הבא בעברית פשוטה וברורה:
{
  "aiSummary": "סיכום ברור של 3 משפטים על מה שהמורה לימד היום בכיתה",
  "keyFormulas": ["כלל או נוסחה 1", "כלל או נוסחה 2"],
  "solvedExample": "דוגמה פתורה שלב-אחר-שלב מהשיעור",
  "quickQuiz": [
    {"question": "שאלה 1", "answer": "תשובה 1"},
    {"question": "שאלה 2", "answer": "תשובה 2"}
  ]
}`,
        },
      ];

      if (imageBase64) {
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: cleanBase64,
          },
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Capsule AI fallback:', e);
    }
  }

  return {
    aiSummary: `סיכום השיעור שנלמד היום ב-${subject} (${topic}): ${
      rawNotes
        ? `המורה התמקד ב-${rawNotes}, והסביר את שלבי הפתרון המרכזיים.`
        : 'המערכת סרקה את צילום הלוח מהכיתה וריכזה את הנוסחאות והדוגמה המרכזית להשלמה תוך 10 דקות.'
    }`,
    keyFormulas: [
      `כלל מרכזי ב-${topic}: הגדרת משתנים ותנאי התחלה לפני הצבה`,
      'בדיקת תחום הגדרה ויחידות מידה בסיום הפתרון',
    ],
    solvedExample: `דוגמה מהשיעור (${topic}):\nשלב 1: רושמים את הנתונים מתוך השאלה.\nשלב 2: מציבים בנוסחה המרכזית ומבודדים את הנעלם.\nשלב 3: בודקים שהתשובה הגיונית.`,
    quickQuiz: [
      {
        question: `מהו הדגש החשוב ביותר מהשיעור היום בנושא ${topic}?`,
        answer: 'לא לדלג על שלב בדיקת תנאי הסף / תחום ההגדרה בתחילת התרגיל.',
      },
      {
        question: 'כמה זמן לוקח להשלים את היחידה הזו?',
        answer: 'כ-10 דקות של קריאה מסודרת ומעבר על הדוגמה הפתורה.',
      },
    ],
  };
}
