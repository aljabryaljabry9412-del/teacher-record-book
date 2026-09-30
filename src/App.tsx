import { useMemo, useRef, useState } from 'react';
import {
  Archive, BookOpen, Camera, Check, ChevronDown, Edit3, FileText, GraduationCap,
  Home, ImagePlus, MoreVertical, Plus, Search, Settings, Trash2, Users, X,
} from 'lucide-react';

type Tab = 'home' | 'students' | 'quiz' | 'attendance' | 'absence' | 'backup';
type Student = { id: number; name: string; grade: string; photo?: string };

const initialStudents: Student[] = [
  { id: 1, name: 'أحمد محمد علي', grade: 'الأول المتوسط' },
  { id: 2, name: 'إسراء خالد حسن', grade: 'الأول المتوسط' },
  { id: 3, name: 'باسم عبد الله', grade: 'الأول المتوسط' },
];

const normalizeArabic = (value: string) => value.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
const digits = (value: number | string) => String(value).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [school, setSchool] = useState('مدرسة النور النموذجية');
  const [teacher, setTeacher] = useState('الأستاذ محمد أحمد');
  const [subject, setSubject] = useState('اللغة العربية');
  const [stage, setStage] = useState('الأول المتوسط');
  const [division, setDivision] = useState('أ');
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState('');
  const [logo, setLogo] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const visibleStudents = useMemo(() => students.filter((student) => normalizeArabic(student.name).includes(normalizeArabic(search))), [students, search]);
  const updateStudent = (id: number, name: string) => setStudents((items) => items.map((item) => item.id === id ? { ...item, name } : item));
  const addStudent = () => {
    const name = window.prompt('اكتب اسم الطالب');
    if (name?.trim()) setStudents((items) => [...items, { id: Date.now(), name: name.trim(), grade: stage }].sort((a, b) => normalizeArabic(a.name).localeCompare(normalizeArabic(b.name), 'ar')));
  };
  const removeStudent = (id: number) => { if (window.confirm('هل تريد تأكيد حذف اسم الطالب؟')) setStudents((items) => items.filter((item) => item.id !== id)); };
  const chooseLogo = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) setLogo(URL.createObjectURL(file)); };

  const nav = [
    ['home', 'الرئيسية', Home], ['students', 'الأسماء والدرجات', Users], ['quiz', 'الاختبار اليومي', FileText],
    ['attendance', 'سجل الحضور', Check], ['absence', 'سجل الغياب', Archive], ['backup', 'النسخ الاحتياطي', Settings],
  ] as const;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={24} /></div><div><strong>سجل المدرس</strong><span>إدارة الصف بسهولة</span></div></div>
      <button className="icon-button" aria-label="الإعدادات"><Settings size={20} /></button>
    </header>
    <div className="fixed-context"><span>{stage}</span><b>الشعبة {division}</b><span className="online"><i /> يعمل دون إنترنت</span></div>
    <main className="content">
      {tab === 'home' && <HomePage {...{school, setSchool, teacher, setTeacher, subject, setSubject, stage, setStage, division, setDivision, logo, chooseLogo, fileRef, visibleStudents, search, setSearch, setTab, students, updateStudent, removeStudent, addStudent}} />}
      {tab === 'students' && <StudentsPage students={students} onAdd={addStudent} onUpdate={updateStudent} onRemove={removeStudent} />}
      {tab === 'quiz' && <Placeholder icon={<FileText />} title="الاختبار اليومي" text="اختر طالباً عشوائياً وسجل درجة الشفهي بسرعة." action="بدء الاختبار" />}
      {tab === 'attendance' && <Placeholder icon={<Check />} title="سجل الحضور" text="سجل حضور الطلاب وغيابهم لهذا اليوم." action="بدء تسجيل الحضور" />}
      {tab === 'absence' && <Placeholder icon={<Archive />} title="سجل الغياب" text="يمكنك استعراض سجلات الغياب حسب التاريخ." action="اختيار التاريخ" />}
      {tab === 'backup' && <Placeholder icon={<Settings />} title="النسخ الاحتياطي" text="احفظ بياناتك محلياً أو صدّرها كملف JSON." action="تصدير البيانات" />}
    </main>
    <nav className="bottom-nav">{nav.map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
  </div>;
}

type HomeProps = { school: string; setSchool: (v: string) => void; teacher: string; setTeacher: (v: string) => void; subject: string; setSubject: (v: string) => void; stage: string; setStage: (v: string) => void; division: string; setDivision: (v: string) => void; logo?: string; chooseLogo: (e: React.ChangeEvent<HTMLInputElement>) => void; fileRef: React.RefObject<HTMLInputElement | null>; visibleStudents: Student[]; search: string; setSearch: (v: string) => void; setTab: (v: Tab) => void; students: Student[]; updateStudent: (id: number, name: string) => void; removeStudent: (id: number) => void; addStudent: () => void; };
function HomePage(p: HomeProps) {
  return <div className="stack">
    <section className="hero-card"><div className="hero-copy"><span className="eyebrow">مرحباً بك</span><h1>أنجز سجلك<br /><em>بكل سهولة</em></h1><p>نظم أسماء طلابك ودرجاتهم وحضورهم في مكان واحد.</p></div><div className="hero-illustration"><BookOpen size={70} strokeWidth={1.3} /></div></section>
    <section className="card profile-card"><div className="section-title"><div><span className="eyebrow">بيانات السجل</span><h2>معلومات المدرسة</h2></div><button className="more-button"><MoreVertical size={19} /></button></div><div className="profile-row"><button className={'logo-upload ' + (p.logo ? 'has-logo' : '')} onClick={() => p.fileRef.current?.click()}>{p.logo ? <img src={p.logo} alt="شعار المدرسة" /> : <><ImagePlus size={25} /><small>إضافة شعار</small></>}</button><input ref={p.fileRef} type="file" accept="image/*" hidden onChange={p.chooseLogo} /><div className="fields"><label>اسم المدرسة<input value={p.school} onChange={(e) => p.setSchool(e.target.value)} /></label><label>اسم المدرس<input value={p.teacher} onChange={(e) => p.setTeacher(e.target.value)} /></label><label>اسم المادة<input value={p.subject} onChange={(e) => p.setSubject(e.target.value)} /></label></div></div></section>
    <section className="card"><div className="section-title"><div><span className="eyebrow">التنظيم الدراسي</span><h2>المرحلة والشعبة</h2></div><button className="add-button"><Plus size={17} /> إضافة</button></div><div className="study-grid"><label>المرحلة الدراسية<input value={p.stage} onChange={(e) => p.setStage(e.target.value)} /></label><label>الشعبة <span className="optional">اختياري</span><input value={p.division} onChange={(e) => p.setDivision(e.target.value)} /></label></div><div className="selected-pill"><span className="dot" /> {p.stage} <b>الشعبة {p.division}</b><ChevronDown size={17} /></div></section>
    <section className="card"><div className="section-title"><div><span className="eyebrow">الوصول السريع</span><h2>بحث عن طالب</h2></div><span className="count-badge">{digits(p.students.length)} طلاب</span></div><div className="search-box"><Search size={19} /><input value={p.search} onChange={(e) => p.setSearch(e.target.value)} placeholder="ابحث باسم الطالب..." /><kbd>⌘ K</kbd></div>{p.search && <div className="student-results">{p.visibleStudents.length ? p.visibleStudents.map((student) => <div className="student-result" key={student.id}><div className="avatar">{student.name.slice(0, 1)}</div><div><strong>{student.name}</strong><small>{student.grade}</small></div><button onClick={() => p.setTab('students')}><ChevronDown size={18} /></button></div>) : <p className="empty">لا توجد نتائج مطابقة</p>}</div>}</section>
  </div>;
}

function StudentsPage({ students, onAdd, onUpdate, onRemove }: { students: Student[]; onAdd: () => void; onUpdate: (id: number, name: string) => void; onRemove: (id: number) => void }) {
  return <div className="stack"><div className="page-heading"><div><span className="eyebrow">إدارة الصف</span><h1>الأسماء والدرجات</h1><p>أضف أسماء الطلاب وابدأ بتسجيل الدرجات.</p></div><button className="primary-button" onClick={onAdd}><Plus size={18} /> إضافة طالب</button></div><section className="card table-card"><div className="table-toolbar"><strong>قائمة الطلاب</strong><span>{digits(students.length)} طلاب</span></div><div className="student-list">{students.map((student, index) => <div className="list-row" key={student.id}><span className="serial">{digits(index + 1)}</span><div className="avatar small">{student.name.slice(0, 1)}</div><input value={student.name} onChange={(e) => onUpdate(student.id, e.target.value)} /><button className="delete-button" onClick={() => onRemove(student.id)}><Trash2 size={17} /></button></div>)}</div></section></div>;
}
function Placeholder({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action: string }) { return <div className="empty-page"><div className="empty-icon">{icon}</div><h1>{title}</h1><p>{text}</p><button className="primary-button"><Plus size={18} /> {action}</button></div>; }

export default App;
