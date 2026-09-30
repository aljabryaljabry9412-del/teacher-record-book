import { useCallback, useEffect, useState } from 'react';
import { Check, CircleAlert, FastForward, RotateCcw, SkipForward } from 'lucide-react';
import { getEligibleStudents, getQuizProgress, saveDailyQuizResult, type QuizAttempt } from '../lib/dailyQuiz';
import { digits } from '../lib';
import type { Student } from '../lib';

type Props = { classroomId: string; academicYear: string; students: Student[] };

export function DailyQuizTab({ classroomId, academicYear, students }: Props) {
  const [attempt, setAttempt] = useState<QuizAttempt>(1);
  const [queue, setQueue] = useState<Student[]>([]);
  const [current, setCurrent] = useState<Student | null>(null);
  const [score, setScore] = useState('');
  const [unprepared, setUnprepared] = useState(false);
  const [progress, setProgress] = useState({ total: students.length, completed: 0, remaining: students.length, finished: false });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (nextAttempt = attempt) => {
    const [eligible, status] = await Promise.all([getEligibleStudents(classroomId, nextAttempt), getQuizProgress(classroomId, nextAttempt)]);
    setQueue(eligible);
    setProgress(status);
    setCurrent((old) => old && eligible.some((student) => student.id === old.id) ? old : null);
  }, [attempt, classroomId]);

  useEffect(() => { void refresh(); }, [refresh, students.length]);

  const chooseNext = () => {
    if (!queue.length) { setMessage('اكتملت درجات جميع الطلاب في هذه الجولة.'); return; }
    const random = queue[Math.floor(Math.random() * queue.length)];
    setCurrent(random); setScore(''); setUnprepared(false); setMessage('');
  };

  const save = async (skipped = false) => {
    if (!current || busy) return;
    const value = score === '' ? null : Number(score);
    if (!skipped && (value === null || !Number.isFinite(value) || value < 0 || value > 100)) {
      setMessage('أدخل درجة صحيحة من ٠ إلى ١٠٠.'); return;
    }
    setBusy(true);
    try {
      await saveDailyQuizResult({ classroomId, academicYear, studentId: current.id, attempt, score: skipped ? null : value, skipped, unprepared });
      setMessage(skipped ? 'تم تخطي الطالب.' : 'تم حفظ الدرجة وإضافتها إلى سجل الدرجات.');
      await refresh();
      setCurrent(null); setScore(''); setUnprepared(false);
    } finally { setBusy(false); }
  };

  const changeAttempt = async (value: QuizAttempt) => { setAttempt(value); setCurrent(null); setMessage(''); const status = await getQuizProgress(classroomId, value); setProgress(status); };

  return <div className="stack daily-quiz">
    <div className="page-heading"><div><span className="eyebrow">تقييم سريع</span><h1>الاختبار اليومي</h1><p>اختر طالباً عشوائياً وسجل درجة الشفهي دون تكرار.</p></div><div className="quiz-progress">{digits(progress.completed)} / {digits(progress.total)}</div></div>
    <section className="card quiz-rounds"><strong>الجولة الحالية</strong><div className="round-buttons">{([1, 2, 3, 4] as QuizAttempt[]).map((item) => <button key={item} className={attempt === item ? 'selected' : ''} onClick={() => void changeAttempt(item)}>{item === 1 ? 'شفهي ١ — فصل ١' : item === 2 ? 'شفهي ٢ — فصل ١' : item === 3 ? 'شفهي ١ — فصل ٢' : 'شفهي ٢ — فصل ٢'}</button>)}</div><div className="progress-line"><span style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} /></div><small>متبقّي {digits(progress.remaining)} طالب</small></section>
    <section className="card quiz-card">{current ? <><div className="quiz-student-avatar">{current.fullName.slice(0, 1)}</div><h2>{current.fullName}</h2><p className="quiz-hint">اكتب درجة الشفهي للطالب</p><input className="quiz-score" type="number" min="0" max="100" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} autoFocus placeholder="٠٠" /><label className="unprepared-check"><input type="checkbox" checked={unprepared} onChange={(e) => setUnprepared(e.target.checked)} /> الطالب غير محضر ❎</label><div className="quiz-actions"><button className="skip-button" onClick={() => void save(true)} disabled={busy}><SkipForward size={17} /> تخطي</button><button className="primary-button" onClick={() => void save()} disabled={busy}><Check size={17} /> حفظ والانتقال</button></div></> : <><div className="empty-icon"><RotateCcw /></div><h2>{progress.finished ? 'اكتملت الجولة' : 'جاهز للاختبار؟'}</h2><p>{message || 'سيظهر اسم طالب عشوائي عند الضغط على الزر.'}</p><button className="primary-button" onClick={chooseNext} disabled={progress.finished}><FastForward size={17} /> الاسم التالي</button></>}</section>
    {message && !current && <div className="quiz-message"><CircleAlert size={16} /> {message}</div>}
  </div>;
}
