import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, BookOpen, Check, FileText, GraduationCap, Home, ImagePlus, Plus, Search, Settings, Trash2, Users } from 'lucide-react';
import { GradesTable } from './components/GradesTable';
import { DailyQuizTab } from './components/DailyQuizTab';
import { AttendanceTab } from './components/AttendanceTab';
import { db, seedDatabase, addStudent, deleteStudent, normalizeArabic, digits, type SchoolProfile, type Classroom, type Student } from './lib';
import { loadActiveState } from './lib/localState';
import './dailyQuiz.css';
import './attendance.css';

type Tab = 'home' | 'students' | 'quiz' | 'attendance' | 'absence' | 'backup';
type State = { profile: SchoolProfile; classroom: Classroom; students: Student[] };

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [state, setState] = useState<State | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState<string>();
  const logoRef = useRef<HTMLInputElement>(null);

  const reload = async () => { const next = await loadActiveState(); if (next) setState(next); };
  useEffect(() => { seedDatabase().then(reload).finally(() => setLoading(false)); }, []);
  const matches = useMemo(() => state?.students.filter(s => normalizeArabic(s.fullName).includes(normalizeArabic(search))) ?? [], [state, search]);

  const updateProfile = async (patch: Partial<SchoolProfile>) => { if (!state) return; const profile = { ...state.profile, ...patch, updatedAt: new Date().toISOString() }; await db.profiles.put(profile); setState({ ...state, profile }); };
  const updateClassroom = async (patch: Partial<Classroom>) => { if (!state) return; const classroom = { ...state.classroom, ...patch, updatedAt: new Date().toISOString() }; await db.classrooms.put(classroom); setState({ ...state, classroom }); };
  const add = async () => { if (!state) return; const name = prompt('اكتب اسم الطالب'); if (name?.trim()) { await addStudent(state.classroom.id, name); await reload(); } };
  const remove = async (id: string) => { if (state && confirm('هل تريد تأكيد حذف اسم الطالب؟')) { await deleteStudent(id, state.classroom.id); await reload(); } };
  const rename = async (student: Student, fullName: string) => { await db.students.put({ ...student, fullName: fullName.trim(), normalizedName: normalizeArabic(fullName), updatedAt: new Date().toISOString() }); await reload(); };
  const uploadLogo = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => void updateProfile({ logoDataUrl: String(reader.result) }); reader.readAsDataURL(file); };

  if (loading) return <div className="empty-page">جاري التحميل...</div>;
  if (!state) return <div className="empty-page">تعذر تحميل البيانات المحلية.</div>;
  const nav = [['home','الرئيسية',Home],['students','الأسماء والدرجات',Users],['quiz','الاختبار اليومي',FileText],['attendance','سجل الحضور',Check],['absence','سجل الغياب',Archive],['backup','النسخ الاحتياطي',Settings]] as const;

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><GraduationCap size={24}/></div><div><strong>سجل المدرس</strong><span>إدارة الصف بسهولة</span></div></div><button className="icon-button"><Settings size={20}/></button></header>
    <div className="fixed-context"><span>{state.classroom.stage}</span><b>الشعبة {state.classroom.division}</b><span className="online"><i/> يعمل دون إنترنت</span></div>
    <main className="content">
      {tab === 'home' && <HomePage state={state} logo={logo ?? state.profile.logoDataUrl} logoRef={logoRef} uploadLogo={uploadLogo} updateProfile={updateProfile} updateClassroom={updateClassroom} search={search} setSearch={setSearch} matches={matches} setTab={setTab} add={add}/>} 
      {tab === 'students' && <StudentsPage state={state} add={add} rename={rename} remove={remove}/>} 
      {tab === 'quiz' && <DailyQuizTab classroomId={state.classroom.id} academicYear={state.classroom.academicYear} students={state.students}/>} 
      {tab === 'attendance' && <AttendanceTab classroomId={state.classroom.id} students={state.students}/>} 
      {tab === 'absence' && <AbsenceLog classroomId={state.classroom.id} students={state.students}/>} 
      {tab === 'backup' && <Placeholder icon={<Settings/>} title="النسخ الاحتياطي" text="سيتم إضافة التصدير والاستيراد في الخطوة التالية."/>}
    </main>
    <nav className="bottom-nav">{nav.map(([id,label,Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
  </div>;
}

function HomePage({ state, logo, logoRef, uploadLogo, updateProfile, updateClassroom, search, setSearch, matches, setTab, add }: any) {
  return <div className="stack"><section className="hero-card"><div><span className="eyebrow">مرحباً بك</span><h1>أنجز سجلك<br/><em>بكل سهولة</em></h1><p>نظم أسماء طلابك ودرجاتهم وحضورهم في مكان واحد.</p></div><div className="hero-illustration"><BookOpen size={70}/></div></section>
    <section className="card"><div className="section-title"><div><span className="eyebrow">بيانات السجل</span><h2>معلومات المدرسة</h2></div></div><div className="profile-row"><button className={'logo-upload '+(logo?'has-logo':'')} onClick={() => logoRef.current?.click()}>{logo?<img src={logo} alt="شعار المدرسة"/>:<><ImagePlus size={25}/><small>إضافة شعار</small></>}</button><input ref={logoRef} type="file" accept="image/*" hidden onChange={uploadLogo}/><div className="fields"><label>اسم المدرسة<input value={state.profile.schoolName} onChange={(e: any)=>void updateProfile({schoolName:e.target.value})}/></label><label>اسم المدرس<input value={state.profile.teacherName} onChange={(e: any)=>void updateProfile({teacherName:e.target.value})}/></label><label>اسم المادة<input value={state.profile.subjectName} onChange={(e: any)=>void updateProfile({subjectName:e.target.value})}/></label></div></div></section>
    <section className="card"><div className="section-title"><div><span className="eyebrow">التنظيم الدراسي</span><h2>المرحلة والشعبة</h2></div><button className="add-button" onClick={add}><Plus size={17}/> إضافة طالب</button></div><div className="study-grid"><label>المرحلة الدراسية<input value={state.classroom.stage} onChange={(e:any)=>void updateClassroom({stage:e.target.value})}/></label><label>الشعبة<input value={state.classroom.division} onChange={(e:any)=>void updateClassroom({division:e.target.value})}/></label></div></section>
    <section className="card"><div className="section-title"><div><span className="eyebrow">الوصول السريع</span><h2>بحث عن طالب</h2></div><span className="count-badge">{digits(state.students.length)} طلاب</span></div><div className="search-box"><Search size={19}/><input value={search} onChange={(e:any)=>setSearch(e.target.value)} placeholder="ابحث باسم الطالب..."/></div>{search&&<div className="student-results">{matches.length?matches.map((s:Student)=><div className="student-result" key={s.id}><div className="avatar">{s.fullName.slice(0,1)}</div><strong>{s.fullName}</strong><button onClick={()=>setTab('students')}>عرض</button></div>):<p className="empty">لا توجد نتائج مطابقة</p>}</div>}</section></div>;
}

function StudentsPage({ state, add, rename, remove }: any) { return <div className="stack"><div className="page-heading"><div><span className="eyebrow">إدارة الصف</span><h1>الأسماء والدرجات</h1><p>أدخل الدرجات واحفظها تلقائياً.</p></div><button className="primary-button" onClick={add}><Plus size={18}/> إضافة طالب</button></div><GradesTable students={state.students} classroomId={state.classroom.id} academicYear={state.classroom.academicYear}/><section className="card"><div className="table-toolbar"><strong>تعديل الأسماء</strong><span>{digits(state.students.length)} طالب</span></div>{state.students.map((s:Student)=><div className="list-row" key={s.id}><span className="serial">{digits(s.serialNumber)}</span><input value={s.fullName} onChange={(e:any)=>void rename(s,e.target.value)}/><button className="delete-button" onClick={()=>void remove(s.id)}><Trash2 size={17}/></button></div>)}</section></div>; }

function AbsenceLog({ classroomId, students }: { classroomId: string; students: Student[] }) { return <div className="stack"><div className="page-heading"><div><span className="eyebrow">التقارير</span><h1>سجل الغياب</h1><p>استخدم سجل الحضور لعرض تقرير اليوم وحفظه محلياً.</p></div></div><AttendanceTab classroomId={classroomId} students={students}/></div>; }
function Placeholder({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="empty-page"><div className="empty-icon">{icon}</div><h1>{title}</h1><p>{text}</p></div>; }
