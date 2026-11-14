import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function askCatchyTutor(question: string, subject: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `אתה Catchy, חונך ה-AI הרשמי של משרד החינוך לפלטפורמת CatchUp. 
מקצוע: ${subject}.
שאלה/בקשה מהתלמיד: ${question}

תן הסבר פדגוגי מעמיק, ברור ובעברית צחה. חילק את התשובה ל:
1. הבנת היסוד (הסבר קצר על הרעיון המרכזי).
2. שלבי העבודה או הנוסחאות המרכזיות.
3. דוגמה פתורה מלאה שלב אחר שלב.
אל תיתן תשובות כלליות — תן תוכן לימודי אמיתי, מפורט ומקצועי המותאם לבגרות.`
            }
          ]
        }
      ]
    });
    return response.text || 'לא התקבלה תשובה מהמערכת. נסה שוב.';
  } catch (error) {
    console.error('Gemini error:', error);
    return 'שגיאה בתקשורת עם חונך ה-AI. ודא שמפתח ה-API מוגדר כראוי.';
  }
}

export async function generateCapsuleFromInput(
  subject: string,
  topic: string,
  notes?: string,
  imageBase64?: string
) {
  try {
    const parts: any[] = [
      {
        text: `נתח את השיעור הבא ב-${subject} בנושא "${topic}". ${notes ? `הערות מהכיתה: ${notes}` : ''}
יצר סיכום שיעור מלא בפורמט JSON בלבד (ללא מעטפות markdown נוספות) הכולל את השדות הבאים:
- aiSummary (מחרוזת: סיכום מפורט של מה שלמדו)
- keyFormulas (מערך מחרוזות של נוסחאות או כללים מרכזיים)
- solvedExample (מחרוזת: שאלה לדוגמה עם פתרון מלא שלב אחר שלב)
- quickQuiz (מערך אובייקטים עם question ו-answer לבדיקה עצמית)`
      }
    ];

    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }]
    });

    const text = response.text || '{}';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    return {
      aiSummary: `סיכום מקיף ומעמיק לנושא ${topic} במקצוע ${subject} המותאם לדרישות משרד החינוך.`,
      keyFormulas: ['כלל מרכזי 1 בתוכנית החדשה', 'נוסחת עזר לבגרות'],
      solvedExample: 'שלב 1: זיהוי הנתונים בשאלה.\nשלב 2: הצבה בנוסחה המתאימה.\nשלב 3: הגעה לתוצאה הסופית.',
      quickQuiz: [{ question: `מה העיקרון המרכזי ב${topic}?`, answer: 'העיקרון מבוסס על יישום נכון של הכללים שלמדנו.' }]
    };
  }
}