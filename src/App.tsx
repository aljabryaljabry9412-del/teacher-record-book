import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, BookOpen, Check, ChevronDown, FileText, GraduationCap,
  Home, ImagePlus, MoreVertical, Plus, Search, Settings, Trash2, Users,
} from 'lucide-react';
import { GradesTable } from './components/GradesTable';
import { DailyQuizTab } from './components/DailyQuizTab';
import { AttendanceTab } from './components/AttendanceTab';
import {
  db,
  seedDatabase,
  addStudent,
  deleteStudent,
  normalizeArabic,
  digits,
  type SchoolProfile,
  type Classroom,
  type Student as DbStudent,
} from './lib';
import { loadActiveState } from './lib/localState';
import './styles.css';
import './dailyQuiz.css';
import './attendance.css';

type Tab = 'home' | 'students' | 'quiz' | 'attendance' | 'absence' | 'backup';
type AppState = { profile: SchoolProfile; classroom: Classroom; students: DbStudent[] } | null;

function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [appState, setAppState] = useState<AppState>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [logo, setLogo] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await seedDatabase();
        const state = await loadActiveState();
        if (state) {
          setAppState(state);
          if (state.profile.logoDataUrl) setLogo(state.profile.logoDataUrl);
        }
      } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const visibleStudents = useMemo(() => {
    if (!appState) return [];
    return appState.students.filter((student) =>
      normalizeArabic(student.fullName).includes(normalizeArabic(search))
    );
  }, [appState, search]);

  const handleUpdateProfile = async (updates: Partial<SchoolProfile>) => {
    if (!appState) return;
    const updated = { ...appState.profile, ...updates, updatedAt: new Date().toISOString() };
    await db.profiles.put(updated);
    setAppState({ ...appState, profile: updated });
  };

  const handleUpdateClassroom = async (updates: Partial<Classroom>) => {
    if (!appState) return;
    const updated = { ...appState.classroom, ...updates, updatedAt: new Date().toISOString() };
    await db.classrooms.put(updated);
    setAppState({ ...appState, classroom: updated });
  };

  const handleAddStudent = async () => {
    if (!appState) return;
    const name = window.prompt('اكتب اسم الطالب');
    if (name?.trim()) {
      await addStudent(appState.classroom.id, name);
      const newState = await loadActiveState();
      if (newState) setAppState(newState);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!appState || !window.confirm('هل تريد تأكيد حذف اسم الطالب؟')) return;
    await deleteStudent(studentId, appState.classroom.id);
    const newState = await loadActiveState();
    if (newState) setAppState(newState);
  };

  const handleUpdateStudentName = async (studentId: string, fullName: string) => {
    if (!appState) return;
    const student = appState.students.find((s) => s.id === studentId);
    if (!student) return;

    await db.students.put({
      ...student,
      fullName: fullName.trim(),
      normalizedName: normalizeArabic(fullName),
      updatedAt: new Date().toISOString(),
    });

    const newState = await loadActiveState();
    if (newState) setAppState(newState);
  };

  const chooseLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !appState) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setLogo(dataUrl);
      await handleUpdateProfile({ logoDataUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const nav = [
    ['home', 'الرئيسية', Home],
    ['students', 'الأسماء والدرجات', Users],
    ['quiz', 'الاختبار اليومي', FileText],
    ['attendance', 'سجل الحضور', Check],
    ['absence', 'سجل الغياب', Archive],
    ['backup', 'النسخ الاحتياطي', Settings],
  ] as const;

  if (loading) {
    return (
      <div className="app-shell">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!appState) {
    return (
      <div className="app-shell">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>حدث خطأ في تحميل البيانات</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><GraduationCap size={24} /></div>
          <div>
            <strong>سجل المدرس</strong>
            <span>إدارة الصف بسهولة</span>
          </div>
        </div>
        <button className="icon-button" aria-label="الإعدادات">
          <Settings size={20} />
        </button>
      </header>

      <div className="fixed-context">
        <span>{appState.classroom.stage}</span>
        <b>الشعبة {appState.classroom.division}</b>
        <span className="online"><i /> يعمل دون إنترنت</span>
      </div>

      <main className="content">
        {tab === 'home' && (
          <HomePage
            profile={appState.profile}
            classroom={appState.classroom}
            onProfileUpdate={handleUpdateProfile}
            onClassroomUpdate={handleUpdateClassroom}
            logo={logo}
            chooseLogo={chooseLogo}
            fileRef={fileRef}
            visibleStudents={visibleStudents}
            search={search}
            setSearch={setSearch}
            setTab={setTab}
            allStudents={appState.students}
            onAddStudent={handleAddStudent}
          />
        )}

        {tab === 'students' && (
          <StudentsPage
            students={appState.students}
            classroomId={appState.classroom.id}
            academicYear={appState.classroom.academicYear}
            onAdd={handleAddStudent}
            onUpdate={handleUpdateStudentName}
            onRemove={handleRemoveStudent}
          />
        )}

        {tab === 'quiz' && (
          <DailyQuizTab
            classroomId={appState.classroom.id}
            academicYear={appState.classroom.academicYear}
            students={appState.students}
          />
        )}

        {tab === 'attendance' && (
          <AttendanceTab
            classroomId={appState.classroom.id}
            students={appState.students}
          />
        )}

        {tab === 'absence' && (
          <AbsenceLog classroomId={appState.classroom.id} students={appState.students} />
        )}

        {tab === 'backup' && (
          <Placeholder
            icon={<Settings />}
            title="النسخ الاحتياطي"
            text="احفظ بياناتك محلياً أو صدّرها كملف JSON."
            action="تصدير البيانات"
          />
        )}
      </main>

      <nav className="bottom-nav">
        {nav.map(([id, label, Icon]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

interface HomePageProps {
  profile: SchoolProfile;
  classroom: Classroom;
  onProfileUpdate: (updates: Partial<SchoolProfile>) => Promise<void>;
  onClassroomUpdate: (updates: Partial<Classroom>) => Promise<void>;
  logo?: string;
  chooseLogo: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  visibleStudents: DbStudent[];
  search: string;
  setSearch: (v: string) => void;
  setTab: (v: Tab) => void;
  allStudents: DbStudent[];
  onAddStudent: () => void;
}

function HomePage(p: HomePageProps) {
  return (
    <div className="stack">
      {/* بطاقة البطل */}
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">مرحباً بك</span>
          <h1>أنجز سجلك<br /><em>بكل سهولة</em></h1>
          <p>نظم أسماء طلابك ودرجاتهم وحضورهم في مكان واحد.</p>
        </div>
        <div className="hero-illustration"><BookOpen size={70} strokeWidth={1.3} /></div>
      </section>

      {/* بطاقة معلومات المدرسة */}
      <section className="card profile-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">بيانات السجل</span>
            <h2>معلومات المدرسة</h2>
          </div>
          <button className="more-button" aria-label="خيارات إضافية">
            <MoreVertical size={19} />
          </button>
        </div>

        <div className="profile-row">
          <button
            className={'logo-upload ' + (p.logo ? 'has-logo' : '')}
            onClick={() => p.fileRef.current?.click()}
            aria-label="تحميل الشعار"
          >
            {p.logo ? (
              <img src={p.logo} alt="شعار المدرسة" />
            ) : (
              <>
                <ImagePlus size={25} />
                <small>إضافة شعار</small>
              </>
            )}
          </button>
          <input
            ref={p.fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={p.chooseLogo}
            aria-label="اختيار ملف الشعار"
          />

          <div className="fields">
            <label>
              اسم المدرسة
              <input
                value={p.profile.schoolName}
                onChange={(e) => p.onProfileUpdate({ schoolName: e.target.value })}
                placeholder="أدخل اسم المدرسة"
              />
            </label>
            <label>
              اسم المدرس
              <input
                value={p.profile.teacherName}
                onChange={(e) => p.onProfileUpdate({ teacherName: e.target.value })}
                placeholder="أدخل اسم المدرس"
              />
            </label>
            <label>
              اسم المادة
              <input
                value={p.profile.subjectName}
                onChange={(e) => p.onProfileUpdate({ subjectName: e.target.value })}
                placeholder="أدخل اسم المادة"
              />
            </label>
          </div>
        </div>
      </section>

      {/* بطاقة المرحلة والشعبة */}
      <section className="card">
        <div className="section-title">
          <div>
            <span className="eyebrow">التنظيم الدراسي</span>
            <h2>المرحلة والشعبة</h2>
          </div>
          <button className="add-button" onClick={p.onAddStudent} aria-label="إضافة طالب">
            <Plus size={17} /> إضافة
          </button>
        </div>

        <div className="study-grid">
          <label>
            المرحلة الدراسية
            <input
              value={p.classroom.stage}
              onChange={(e) => p.onClassroomUpdate({ stage: e.target.value })}
              placeholder="مثال: الأول المتوسط"
            />
          </label>
          <label>
            الشعبة <span className="optional">اختياري</span>
            <input
              value={p.classroom.division}
              onChange={(e) => p.onClassroomUpdate({ division: e.target.value })}
              placeholder="مثال: أ"
            />
          </label>
        </div>

        <div className="selected-pill">
          <span className="dot" /> {p.classroom.stage} <b>الشعبة {p.classroom.division}</b>
          <ChevronDown size={17} />
        </div>
      </section>

      {/* بطاقة البحث السريع عن الطلاب */}
      <section className="card">
        <div className="section-title">
          <div>
            <span className="eyebrow">الوصول السريع</span>
            <h2>بحث عن طالب</h2>
          </div>
          <span className="count-badge">{digits(p.allStudents.length)} طلاب</span>
        </div>

        <div className="search-box">
          <Search size={19} />
          <input
            value={p.search}
            onChange={(e) => p.setSearch(e.target.value)}
            placeholder="ابحث باسم الطالب..."
            aria-label="بحث الطالب"
          />
          <kbd>⌘ K</kbd>
        </div>

        {p.search && (
          <div className="student-results">
            {p.visibleStudents.length ? (
              p.visibleStudents.map((student) => (
                <div className="student-result" key={student.id}>
                  <div className="avatar">{student.fullName.slice(0, 1)}</div>
                  <div>
                    <strong>{student.fullName}</strong>
                    <small>#{digits(student.serialNumber)}</small>
                  </div>
                  <button
                    onClick={() => {
                      p.setSearch('');
                      p.setTab('students');
                    }}
                    aria-label="الذهاب إلى سجل الطالب"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="empty">لا توجد نتائج مطابقة</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

interface StudentsPageProps {
  students: DbStudent[];
  classroomId: string;
  academicYear: string;
  onAdd: () => void;
  onUpdate: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

function StudentsPage({ students, classroomId, academicYear, onAdd, onUpdate, onRemove }: StudentsPageProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grades'>('grades');

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">إدارة الصف</span>
          <h1>الأسماء والدرجات</h1>
          <p>أضف أسماء الطلاب وسجل درجاتهم وتابع تقدمهم.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={18} /> إضافة طالب
        </button>
      </div>

      {viewMode === 'list' ? (
        <section className="card table-card">
          <div className="table-toolbar">
            <strong>قائمة الطلاب</strong>
            <span>{digits(students.length)} طالب</span>
          </div>

          <div className="student-list">
            {students.map((student) => (
              <div className="list-row" key={student.id}>
                <span className="serial">{digits(student.serialNumber)}</span>
                <div className="avatar small">{student.fullName.slice(0, 1)}</div>
                <input
                  value={student.fullName}
                  onChange={(e) => onUpdate(student.id, e.target.value)}
                  placeholder="اسم الطالب"
                />
                <button className="delete-button" onClick={() => onRemove(student.id)} aria-label="حذف الطالب">
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <GradesTable students={students} classroomId={classroomId} academicYear={academicYear} />
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
        <button
          onClick={() => setViewMode('list')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: viewMode === 'list' ? '#173b5f' : '#e8f0f3',
            color: viewMode === 'list' ? '#fff' : '#2b5a7e',
            border: 'none',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          قائمة الأسماء
        </button>
        <button
          onClick={() => setViewMode('grades')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: viewMode === 'grades' ? '#173b5f' : '#e8f0f3',
            color: viewMode === 'grades' ? '#fff' : '#2b5a7e',
            border: 'none',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          جدول الدرجات
        </button>
      </div>
    </div>
  );
}

interface AbsenceLogProps {
  classroomId: string;
  students: DbStudent[];
}

function AbsenceLog({ classroomId, students }: AbsenceLogProps) {
  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">التقارير</span>
          <h1>سجل الغياب</h1>
          <p>استعرض سجلات الغياب والملاحظات حسب الطالب أو التاريخ.</p>
        </div>
      </div>

      <section className="card">
        <div className="section-title">
          <span className="eyebrow">جاري التطوير</span>
          <h2>سيتم إضافة سجل الغياب المفصل قريباً</h2>
        </div>
        <p style={{ color: '#8a9aa4', marginTop: '16px' }}>
          قريباً: عرض سجل الغياب التاريخي، والملاحظات، وتقارير الغياب المتكررة.
        </p>
      </section>
    </div>
  );
}

interface PlaceholderProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: string;
}

function Placeholder({ icon, title, text, action }: PlaceholderProps) {
  return (
    <div className="empty-page">
      <div className="empty-icon">{icon}</div>
      <h1>{title}</h1>
      <p>{text}</p>
      <button className="primary-button">
        <Plus size={18} /> {action}
      </button>
    </div>
  );
}

export default App;
