import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function askCatchyTutor(question: string, subject: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `אתה Catchy, חונך ה-AI הרשמי של משרד החינוך למתמטיקה ומדעים 5 יח"ל. 
מקצוע: ${subject}.
שאלה/תרגיל מהתלמיד: ${question}

תן הסבר פדגוגי מעמיק, אמיתי ופתרון מלא שלב אחר שלב בעברית צחה. אל תיתן תשובות כלליות — פתור בדיוק את מה שהתלמיד שאל.`
            }
          ]
        }
      ]
    });
    return response.text || 'לא התקבלה תשובה מהמערכת. נסה שוב.';
  } catch (error: any) {
    console.error('Gemini error:', error);
    return `שגיאה בתקשורת עם חונך ה-AI: ${error?.message || 'אנא בדוק את מפתח ה-API'}`;
  }
}

export async function generateCapsuleFromInput(
  subject: string,
  topic: string,
  notes?: string,
  imageBase64?: string
) {
  const parts: any[] = [
    {
      text: `אתה מורה פרטי מומחה לבגרויות 5 יח"ל ב-${subject}. 
התלמיד העלה צילום או שאלה אמיתית בנושא "${topic}". ${notes ? `הערות מהכיתה: ${notes}` : ''}

נתח את התמונה או השאלה באופן דינמי לחלוטין. אם יש בתמונה שרטוט או תרגיל ספציפי (כמו בטריגונומטריה, גאומטריה או חקר פונקציות), פתור אותו במלואו, אל תמציא סיכומים כלליים!

החזר ניתוח מפורט שישמש כסיכום שיעור הכולל:
1. הסבר כתוב ומעמיק על הנושא או ניתוח מפורט של השאלה.
2. נוסחאות וכללים מרכזיים.
3. פתרון מלא שלב אחר שלב.
4. שאלת בדיקה עצמית עם תשובה.`
    }
  ];

  if (imageBase64) {
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts }]
  });

  const realAiText = response.text || 'לא התקבל ניתוח מה-AI.';

  return {
    aiSummary: realAiText,
    keyFormulas: [`ניתוח דינמי מאת Gemini לנושא: ${topic}`],
    solvedExample: realAiText,
    quickQuiz: [
      {
        question: `בדיקה עצמית על ${topic}`,
        answer: 'עיין בהסבר המלא של ה-AI שהתקבל למעלה.'
      }
    ]
  };
}