import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

import {
  Users,
  Activity,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  BarChart3,
  Search,
  Trophy,
  User,
  GraduationCap,
  Zap,
  Star,
  CheckCircle2,
  PlayCircle,
  Lock,
  X,
  ClipboardList,
  Eye,
  Plus,
  Copy,
  Trash2,
  Edit,
  Power,
  Save,
  BookMarked,
  Check,
  ChevronDown,
  Archive,
  ArchiveRestore,
  FileText,
  Settings,
  Mail,
  Camera,
  Download,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import TeacherNav from '../components/TeacherNav'


// ============================================================
// QUESTION TYPES
// ============================================================

const QUESTION_TYPES = [
  {
    value: 'mcq',
    label: 'Multiple Choice'
  },
  {
    value: 'true_false',
    label: 'True / False'
  },
  {
    value: 'complete_code',
    label: 'Complete the Code'
  }
];

const ALLOWED_QUESTION_TYPES = QUESTION_TYPES.map((type) => type.value)


// ============================================================
// REPORT TYPES
// ============================================================

const REPORT_TYPES = [
  {
    value: 'class_overview',
    label: 'Class Overview',
    description: 'Summary of enrollment, average progress, and completion across a class.'
  },
  {
    value: 'student_progress',
    label: 'Student Progress',
    description: 'Per-student breakdown of lessons completed, XP, level, and streak.'
  },
  {
    value: 'quiz_performance',
    label: 'Quiz Performance',
    description: 'Scores, attempt counts, and averages for every quiz you have published.'
  },
  {
    value: 'attention_list',
    label: 'Students Needing Attention',
    description: 'Students flagged as struggling, inactive, or with repeated failed attempts.'
  }
]


// ============================================================
// STAT CARD
// ============================================================

const Card = ({ icon: Icon, value, label, note }) => {
  return (
    <div className="teacher-stat">
      <div className="stat-icon">
        <Icon size={26} strokeWidth={2.2} />
      </div>

      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{note}</small>
      </div>
    </div>
  )
}


// ============================================================
// PROGRESS BAR
// ============================================================

const Progress = ({ value }) => {
  const progress = Math.max(
    0,
    Math.min(100, Number(value) || 0)
  )

  return (
    <div className="progressbar">
      <i style={{ width: `${progress}%` }} />
    </div>
  )
}


// ============================================================
// MAIN TEACHER DASHBOARD
// ============================================================

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [page, setPage] = useState('overview')

  const [data, setData] = useState({})
  const [students, setStudents] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [leaderboard, setLeaderboard] = useState([])

  const [selected, setSelected] = useState(null)

  const [loading, setLoading] = useState(true)

  const [quizzes, setQuizzes] = useState([])

  // Class Management state
  const [classes, setClasses] = useState([])
  const [showCreateClass, setShowCreateClass] = useState(false)
  const [className, setClassName] = useState('')
  const [classSection, setClassSection] = useState('')
  const [selectedClass, setSelectedClass] = useState(null)
  const [classStudents, setClassStudents] = useState([])
  const [classLoading, setClassLoading] = useState(false)
  const [classSaving, setClassSaving] = useState(false)
  const [classError, setClassError] = useState('')
  const [classMessage, setClassMessage] = useState('')

  // Profile Management state
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')

  // Reports state
  const [reportType, setReportType] = useState('class_overview')
  const [reportClassId, setReportClassId] = useState('')
  const [reportFormat, setReportFormat] = useState('pdf')
  const [reportGenerating, setReportGenerating] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [reportError, setReportError] = useState('')


  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard = async () => {
    try {
      setLoading(true)

      const responses = await Promise.all([
        axios.get('/api/teacher/overview'),
        axios.get('/api/teacher/students'),
        axios.get('/api/teacher/analytics'),
        axios.get('/api/teacher/leaderboard'),
        axios.get('/api/teacher/quizzes'),
      ])

      setData(responses[0].data || {})
      setStudents(responses[1].data || [])
      setAnalytics(responses[2].data || {})
      setLeaderboard(responses[3].data || [])
      setQuizzes(responses[4].data || [])
    } catch (error) {
      console.error(
        'Failed to load teacher dashboard:',
        error
      )
    } finally {
      setLoading(false)
    }
  }


  // ==========================================================
  // CLASS MANAGEMENT
  // ==========================================================

  const loadClasses = async () => {
    try {
      setClassLoading(true)
      setClassError('')
      const { data } = await axios.get('/api/teacher/classes')
      setClasses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load classes:', error)
      setClassError(
        error.response?.data?.message ||
        'Could not load your classes.'
      )
    } finally {
      setClassLoading(false)
    }
  }

  const createClass = async (event) => {
    event.preventDefault()
    setClassError('')
    setClassMessage('')

    if (!className.trim()) {
      setClassError('Enter a class name.')
      return
    }

    if (!classSection.trim()) {
      setClassError('Enter the class section.')
      return
    }

    try {
      setClassSaving(true)

      const { data } = await axios.post(
        '/api/teacher/classes',
        {
          class_name: className.trim(),
          section: classSection.trim(),
        }
      )

      setClasses((prev) => [data, ...prev])
      setClassName('')
      setClassSection('')
      setShowCreateClass(false)
      setClassMessage('Class created successfully.')
    } catch (error) {
      console.error('Failed to create class:', error)
      setClassError(
        error.response?.data?.message ||
        'Could not create the class.'
      )
    } finally {
      setClassSaving(false)
    }
  }

  const copyClassCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setClassMessage('Class code copied.')
    } catch (error) {
      console.error('Could not copy class code:', error)
      setClassError('Could not copy the class code.')
    }
  }

  const openClass = async (cls) => {
    setClassError('')
    setSelectedClass(cls)
    setClassStudents([])

    try {
      const { data } = await axios.get(
        `/api/teacher/classes/${cls.id}/students`
      )
      setClassStudents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load class students:', error)
      setClassError(
        error.response?.data?.message ||
        'Could not load students for this class.'
      )
    }
  }


  // ==========================================================
  // PROFILE MANAGEMENT
  // ==========================================================

  const loadProfile = async () => {
    try {
      setProfileLoading(true)
      setProfileError('')

      const { data } = await axios.get('/api/auth/profile')

      setProfile(data)
      setProfileForm({
        name: data.name || '',
        email: data.email || ''
      })
    } catch (error) {
      console.error('Failed to load profile:', error)
      setProfileError(
        error.response?.data?.message ||
        'Could not load your profile.'
      )
    } finally {
      setProfileLoading(false)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setProfileError('')
    setProfileMessage('')

    if (!profileForm.name.trim()) {
      setProfileError('Enter your name.')
      return
    }

    if (!profileForm.email.trim()) {
      setProfileError('Enter your email address.')
      return
    }

    try {
      setProfileSaving(true)

      // authController.updateProfile returns { message, user },
      // unlike getProfile/getMe which return the user row directly.
      const { data } = await axios.put('/api/auth/profile', {
        name: profileForm.name.trim(),
        email: profileForm.email.trim()
      })

      const updated = data?.user || data
      setProfile(updated)
      setProfileEditing(false)
      setProfileMessage('Profile updated successfully.')
    } catch (error) {
      console.error('Failed to update profile:', error)
      setProfileError(
        error.response?.data?.message ||
        'Could not update your profile.'
      )
    } finally {
      setProfileSaving(false)
    }
  }

  const cancelProfileEdit = () => {
    setProfileEditing(false)
    setProfileError('')

    if (profile) {
      setProfileForm({
        name: profile.name || '',
        email: profile.email || ''
      })
    }
  }


  // ==========================================================
  // REPORTS
  // ==========================================================

  const generateReport = async () => {
    setReportError('')
    setReportMessage('')

    try {
      setReportGenerating(true)

      const response = await axios.get(
        '/api/teacher/reports/generate',
        {
          params: {
            type: reportType,
            class_id: reportClassId || undefined,
            format: reportFormat
          },
          responseType: 'blob'
        }
      )

      const mime =
        reportFormat === 'pdf'
          ? 'application/pdf'
          : 'text/csv'

      const blob = new Blob([response.data], { type: mime })
      const url = window.URL.createObjectURL(blob)

      const stamp = new Date().toISOString().slice(0, 10)
      const extension = reportFormat === 'pdf' ? 'pdf' : 'csv'

      const link = document.createElement('a')
      link.href = url
      link.download = `${reportType}-${stamp}.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)

      setReportMessage('Report generated and downloaded.')
    } catch (error) {
      console.error('Failed to generate report:', error)
      setReportError(
        error.response?.data?.message ||
        'Could not generate the report. Please try again.'
      )
    } finally {
      setReportGenerating(false)
    }
  }


  // ==========================================================
  // AUTH / INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (!user) {
      return
    }

    if (user.role !== 'instructor') {
      navigate('/quest')
      return
    }

    loadDashboard()
  }, [user, navigate])

  useEffect(() => {
    if (
      user?.role === 'instructor' &&
      (page === 'classes' || page === 'reports')
    ) {
      loadClasses()
    }
  }, [user, page])

  useEffect(() => {
    if (user?.role === 'instructor' && page === 'profile') {
      loadProfile()
    }
  }, [user, page])


  // ==========================================================
  // OPEN STUDENT
  // ==========================================================

  const openStudent = async (id) => {
    try {
      const response = await axios.get(
        `/api/teacher/students/${id}`
      )

      setSelected(response.data)
    } catch (error) {
      console.error(
        'Failed to load student:',
        error
      )
    }
  }


  const stats = data.stats || {}
  const attentionStudents = data.attention || []
  const recentStudents = data.recent || []
  const profileInitial =
    (profile?.name || user?.name || 'T').trim().charAt(0).toUpperCase()


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="teacher-shell">
        <TeacherNav
          page={page}
          setPage={setPage}
        />

        <main className="teacher-main">
          <div className="teacher-loading">
            Loading Teacher Dashboard...
          </div>
        </main>
      </div>
    )
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="teacher-shell">

      <TeacherNav
        page={page}
        setPage={setPage}
      />

      <main className="teacher-main">

        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="teacher-header">

          <div>

            <p className="dashboard-kicker">
              <GraduationCap
                size={17}
                strokeWidth={2.2}
              />

              <span>TEACHER DASHBOARD</span>
            </p>

            <h1>
              {page === 'overview' &&
                'Good day, Teacher'}

              {page === 'students' &&
                'Student Management'}

              {page === 'attention' &&
                'Students Needing Attention'}

              {page === 'analytics' &&
                'Learning Analytics'}

              {page === 'leaderboard' &&
                'Student Leaderboard'}

              {page === 'quizzes' &&
                'Quiz Maker'}

              {page === 'classes' &&
                'Class Management'}

              {page === 'reports' &&
                'Reports'}

              {page === 'profile' &&
                'My Profile'}
            </h1>

            <span>
              Monitor and guide your students through
              their CodeQuest journey.
            </span>

          </div>

          <button
            type="button"
            className="teacher-badge teacher-badge--link"
            onClick={() => setPage('profile')}
          >
            <GraduationCap size={20} />
            <span>
              {user?.name || 'Teacher'}
            </span>
          </button>

        </header>


        {/* ====================================================
            OVERVIEW
            ==================================================== */}

        {page === 'overview' && (
          <>

            <section className="teacher-stats">

              <Card
                icon={Users}
                value={stats.totalStudents || 0}
                label="TOTAL STUDENTS"
                note="Enrolled students"
              />

              <Card
                icon={Activity}
                value={stats.activeStudents || 0}
                label="ACTIVE THIS WEEK"
                note="Recent activity"
              />

              <Card
                icon={TrendingUp}
                value={`${stats.averageProgress || 0}%`}
                label="AVERAGE PROGRESS"
                note="Class completion"
              />

              <Card
                icon={BookOpen}
                value={stats.completedLessons || 0}
                label="LESSONS COMPLETED"
                note={`${stats.totalLessons || 0} lessons available`}
              />

            </section>


            <section className="teacher-grid">

              <div className="teacher-panel danger-panel">

                <h2 className="panel-title">

                  <AlertTriangle size={22} />

                  <span>
                    Students Needing Attention
                  </span>

                </h2>

                {attentionStudents.length > 0 ? (

                  attentionStudents.map((student) => (

                    <button
                      type="button"
                      className="attention-item"
                      key={student.id}
                      onClick={() =>
                        openStudent(student.id)
                      }
                    >

                      <div className="attention-icon">
                        <User size={19} />
                      </div>

                      <div>
                        <b>{student.name}</b>

                        <small>
                          {student.progress || 0}%
                          progress
                          {' · '}
                          {student.struggles || 0}
                          {' '}
                          struggle flags
                        </small>
                      </div>

                      <span className="attention-view">
                        <Eye size={17} />
                      </span>

                    </button>

                  ))

                ) : (

                  <p className="empty">
                    Everyone is progressing well.
                  </p>

                )}

              </div>


              <div className="teacher-panel">

                <h2 className="panel-title">

                  <BarChart3 size={22} />

                  <span>
                    Quick Class Summary
                  </span>

                </h2>

                <div className="summary-list">

                  <div>
                    <span>Total Students</span>
                    <strong>
                      {stats.totalStudents || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Active Students</span>
                    <strong>
                      {stats.activeStudents || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Average Progress</span>
                    <strong>
                      {stats.averageProgress || 0}%
                    </strong>
                  </div>

                  <div>
                    <span>Students Needing Help</span>
                    <strong>
                      {attentionStudents.length}
                    </strong>
                  </div>

                </div>

              </div>

            </section>


            <section className="teacher-panel">

              <h2 className="panel-title">

                <Activity size={22} />

                <span>
                  Recent Student Activity
                </span>

              </h2>

              <div className="student-table">

                {recentStudents.length > 0 ? (

                  recentStudents.map((student) => (

                    <button
                      type="button"
                      key={student.id}
                      onClick={() =>
                        openStudent(student.id)
                      }
                    >

                      <span className="table-student">

                        <User size={17} />

                        {student.name}

                      </span>

                      <span>
                        {student.section ||
                          'No section'}
                      </span>

                      <span className="icon-value">

                        <Zap size={16} />

                        {student.xp || 0}

                      </span>

                      <span className="icon-value">

                        <Star size={16} />

                        Lv. {student.level || 1}

                      </span>

                      <span>

                        {student.last_activity
                          ? new Date(
                              student.last_activity
                            ).toLocaleDateString()
                          : 'No activity'}

                      </span>

                    </button>

                  ))

                ) : (

                  <p className="empty">
                    No recent student activity.
                  </p>

                )}

              </div>

            </section>

          </>
        )}


        {/* ====================================================
            CLASS MANAGEMENT
            ==================================================== */}

        {page === 'classes' && (
          <section className="teacher-classes-page">
            <div className="teacher-page-heading">
              <div>
                <span className="quiz-maker-kicker">
                  YOUR CLASSES
                </span>
                <h2>Manage your classes</h2>
                <p>
                  Create classes and share the class code with
                  students so you can monitor their progress.
                </p>
              </div>

              <button
                type="button"
                className="quiz-publish-btn"
                onClick={() => {
                  setClassError('')
                  setClassMessage('')
                  setShowCreateClass(true)
                }}
              >
                <Plus size={18} />
                Create class
              </button>
            </div>

            {classMessage && (
              <div className="quiz-alert success">
                <Check size={18} />
                {classMessage}
              </div>
            )}

            {classError && (
              <div className="quiz-alert error">
                {classError}
              </div>
            )}

            {classLoading ? (
              <div className="teacher-panel">
                <p className="empty">Loading classes...</p>
              </div>
            ) : classes.length > 0 ? (
              <div className="teacher-class-grid">
                {classes.map((cls) => (
                  <div
                    className="teacher-class-card"
                    key={cls.id}
                  >
                    <div className="teacher-class-icon">
                      <GraduationCap size={25} />
                    </div>

                    <div className="teacher-class-main">
                      <h3>
                        {cls.class_name || cls.name || 'Class'}
                      </h3>
                      <span className="teacher-class-section">
                        Section: {cls.section || '—'}
                      </span>
                    </div>

                    <div className="class-code-box">
                      <small>CLASS CODE</small>
                      <strong>
                        {cls.class_code || cls.code || '—'}
                      </strong>
                    </div>

                    <div className="teacher-class-footer">
                      <span className="icon-value">
                        <Users size={16} />
                        {cls.student_count || cls.students_count || 0}
                        {' '}
                        students
                      </span>

                      <div>
                        <button
                          type="button"
                          className="class-view-btn"
                          onClick={() => openClass(cls)}
                        >
                          <Eye size={16} />
                          View students
                        </button>

                        {(cls.class_code || cls.code) && (
                          <button
                            type="button"
                            className="class-view-btn"
                            onClick={() =>
                              copyClassCode(
                                cls.class_code || cls.code
                              )
                            }
                            title="Copy class code"
                          >
                            <Copy size={16} />
                            Copy code
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="teacher-panel class-empty">
                <GraduationCap size={32} />
                <strong>No classes yet</strong>
                <span>
                  Create your first class to start organizing
                  students.
                </span>
                <button
                  type="button"
                  className="quiz-add-btn"
                  onClick={() => setShowCreateClass(true)}
                >
                  <Plus size={17} />
                  Create class
                </button>
              </div>
            )}
          </section>
        )}

        {/* ====================================================
            MY PROFILE
            ==================================================== */}

        {page === 'profile' && (
          <section className="teacher-profile-page">
            {profileMessage && (
              <div className="quiz-alert success">
                <Check size={18} />
                {profileMessage}
              </div>
            )}

            {profileError && (
              <div className="quiz-alert error">
                {profileError}
              </div>
            )}

            {profileLoading ? (
              <div className="teacher-panel">
                <p className="empty">Loading your profile...</p>
              </div>
            ) : (
              <div className="teacher-profile-grid">

                <div className="teacher-panel teacher-profile-summary">
                  <div className="teacher-profile-avatar">
                    {profileInitial}
                  </div>

                  <h2>{profile?.name || user?.name || 'Teacher'}</h2>

                  <span className="teacher-profile-role">
                    <GraduationCap size={14} />
                    Instructor
                  </span>

                  {(profile?.email || user?.email) && (
                    <span className="teacher-profile-email">
                      <Mail size={14} />
                      {profile?.email || user?.email}
                    </span>
                  )}

                </div>

                <div className="teacher-panel teacher-profile-editor">
                  <h2 className="panel-title">
                    <Settings size={20} />
                    <span>Account Details</span>
                  </h2>

                  <form
                    className="teacher-profile-form"
                    onSubmit={saveProfile}
                  >
                    <div className="quiz-field">
                      <label>Full name</label>
                      <input
                        value={profileForm.name}
                        disabled={!profileEditing}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            name: event.target.value
                          }))
                        }
                        placeholder="e.g. Jim-mar Dela Cruz"
                      />
                    </div>

                    <div className="quiz-field">
                      <label>Email address</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        disabled={!profileEditing}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            email: event.target.value
                          }))
                        }
                        placeholder="you@ispsc.edu.ph"
                      />
                    </div>

                    <div className="quiz-builder-actions teacher-profile-actions">
                      {profileEditing ? (
                        <>
                          <button
                            type="button"
                            className="quiz-add-btn"
                            onClick={cancelProfileEdit}
                            disabled={profileSaving}
                          >
                            <X size={16} />
                            Cancel
                          </button>

                          <button
                            type="submit"
                            className="quiz-publish-btn"
                            disabled={profileSaving}
                          >
                            <Save size={16} />
                            {profileSaving ? 'Saving...' : 'Save changes'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="quiz-publish-btn"
                          onClick={() => {
                            setProfileMessage('')
                            setProfileEditing(true)
                          }}
                        >
                          <Edit size={16} />
                          Edit profile
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ====================================================
            REPORTS
            ==================================================== */}

        {page === 'reports' && (
          <section className="teacher-reports-page">
            <div className="teacher-page-heading">
              <div>
                <span className="quiz-maker-kicker">
                  CLASS REPORTS
                </span>
                <h2>Generate a report</h2>
                <p>
                  Choose what you want to report on, optionally
                  narrow it to one class, and download it as a
                  file you can share or print.
                </p>
              </div>

              <div className="teacher-reports-icon">
                <FileText size={24} />
              </div>
            </div>

            {reportMessage && (
              <div className="quiz-alert success">
                <Check size={18} />
                {reportMessage}
              </div>
            )}

            {reportError && (
              <div className="quiz-alert error">
                {reportError}
              </div>
            )}

            <div className="teacher-panel report-type-grid">
              {REPORT_TYPES.map((type) => (
                <button
                  type="button"
                  key={type.value}
                  className={`report-type-card ${
                    reportType === type.value ? 'is-selected' : ''
                  }`}
                  onClick={() => setReportType(type.value)}
                >
                  <span className="report-type-check">
                    {reportType === type.value && <Check size={14} />}
                  </span>
                  <strong>{type.label}</strong>
                  <span>{type.description}</span>
                </button>
              ))}
            </div>

            <div className="teacher-panel report-controls">
              <div className="quiz-field">
                <label>Class</label>
                <div className="quiz-select-wrap">
                  <select
                    value={reportClassId}
                    onChange={(event) =>
                      setReportClassId(event.target.value)
                    }
                  >
                    <option value="">All classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name || cls.name || 'Class'}
                        {cls.section ? ` — ${cls.section}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={17} />
                </div>
              </div>

              <div className="quiz-field">
                <label>Format</label>
                <div className="report-format-toggle">
                  <button
                    type="button"
                    className={reportFormat === 'pdf' ? 'active' : ''}
                    onClick={() => setReportFormat('pdf')}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    className={reportFormat === 'csv' ? 'active' : ''}
                    onClick={() => setReportFormat('csv')}
                  >
                    CSV
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="quiz-publish-btn report-generate-btn"
                onClick={generateReport}
                disabled={reportGenerating}
              >
                <Download size={17} />
                {reportGenerating ? 'Generating...' : 'Generate report'}
              </button>
            </div>
          </section>
        )}

        {/* ====================================================
            STUDENTS
            ==================================================== */}

        {page === 'students' && (
          <Students
            students={students}
            open={openStudent}
          />
        )}


        {/* ====================================================
            ATTENTION
            ==================================================== */}

        {page === 'attention' && (

          <Students
            students={students.filter((student) => {

              const progress =
                Number(student.progress) || 0

              const attempts =
                Number(student.attempts) || 0

              return (
                progress < 40 ||
                !student.last_login ||
                attempts >= 3
              )
            })}
            open={openStudent}
          />

        )}


        {/* ====================================================
            ANALYTICS
            ==================================================== */}

        {page === 'analytics' && (
          <>

            <div className="teacher-panel">

              <h2 className="panel-title">

                <TrendingUp size={22} />

                <span>
                  Learning Performance
                </span>

              </h2>

              {(analytics.modules || []).length > 0 ? (

                analytics.modules.map(
                  (module, index) => (

                    <div
                      className="module-row"
                      key={module.id || index}
                    >

                      <div>

                        <b>
                          {module.title}
                        </b>

                        <small>
                          Average attempts:{' '}
                          {module.attempts || 0}
                        </small>

                      </div>

                      <Progress
                        value={module.completion}
                      />

                      <strong>
                        {module.completion || 0}%
                      </strong>

                    </div>

                  )
                )

              ) : (

                <p className="empty">
                  No analytics data available yet.
                </p>

              )}

            </div>


            <div className="assessment-grid">

              {(analytics.scores || []).map(
                (score, index) => (

                  <div
                    className="teacher-panel"
                    key={score.type || index}
                  >

                    <h3 className="assessment-title">

                      <ClipboardList size={20} />

                      <span>
                        {String(
                          score.type ||
                          'Assessment'
                        ).toUpperCase()}
                      </span>

                    </h3>

                    <strong className="big-score">
                      {score.average || 0}%
                    </strong>

                    <p>
                      {score.attempts || 0}
                      {' '}
                      attempts recorded
                    </p>

                  </div>

                )
              )}

            </div>

          </>
        )}


        {/* ====================================================
            QUIZ MAKER
            ==================================================== */}

        {page === 'quizzes' && (

          <QuizManager
            quizzes={quizzes}
            setQuizzes={setQuizzes}
          />

        )}


        {/* ====================================================
            LEADERBOARD
            ==================================================== */}

        {page === 'leaderboard' && (

          <div className="leaderboard-list">

            {leaderboard.length > 0 ? (

              leaderboard.map(
                (student, index) => (

                  <div
                    className="rank-card"
                    key={
                      student.id || index
                    }
                  >

                    <div className="rank">

                      {index === 0 ? (

                        <Trophy size={23} />

                      ) : (

                        <span>
                          #{index + 1}
                        </span>

                      )}

                    </div>


                    <span className="leaderboard-student">

                      <User size={18} />

                      <span>

                        {student.name}

                        <small>
                          {student.section ||
                            'No section'}
                        </small>

                      </span>

                    </span>


                    <strong className="icon-value">

                      <Star size={17} />

                      Lv. {student.level || 1}

                    </strong>


                    <em className="icon-value">

                      <Zap size={17} />

                      {student.xp || 0} XP

                    </em>

                  </div>

                )
              )

            ) : (

              <div className="teacher-panel">

                <p className="empty">
                  No leaderboard data available yet.
                </p>

              </div>

            )}

          </div>

        )}

      </main>


      {/* ======================================================
          CREATE CLASS MODAL
          ====================================================== */}

      {showCreateClass && (
        <div
          className="teacher-modal-backdrop"
          onClick={() => setShowCreateClass(false)}
        >
          <form
            className="teacher-modal"
            onSubmit={createClass}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowCreateClass(false)}
              aria-label="Close create class"
            >
              <X size={20} />
            </button>

            <p className="student-profile-label">
              <GraduationCap size={16} />
              <span>CREATE CLASS</span>
            </p>

            <h2>Create a new class</h2>
            <p>
              Give the class a name and section. A unique class
              code will be generated for your students.
            </p>

            <div className="quiz-field">
              <label>Class name</label>
              <input
                value={className}
                onChange={(event) =>
                  setClassName(event.target.value)
                }
                placeholder="e.g. Programming 1"
                autoFocus
              />
            </div>

            <div className="quiz-field">
              <label>Section</label>
              <input
                value={classSection}
                onChange={(event) =>
                  setClassSection(event.target.value)
                }
                placeholder="e.g. BSIT 4B"
              />
            </div>

            <div className="quiz-builder-actions">
              <button
                type="button"
                className="quiz-add-btn"
                onClick={() => setShowCreateClass(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="quiz-publish-btn"
                disabled={classSaving}
              >
                <Save size={18} />
                {classSaving ? 'Creating...' : 'Create class'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================
          CLASS STUDENTS MODAL
          ====================================================== */}

      {selectedClass && (
        <div
          className="teacher-modal-backdrop"
          onClick={() => setSelectedClass(null)}
        >
          <div
            className="teacher-modal teacher-modal-large"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedClass(null)}
              aria-label="Close class students"
            >
              <X size={20} />
            </button>

            <p className="student-profile-label">
              <Users size={16} />
              <span>CLASS STUDENTS</span>
            </p>

            <h2>
              {selectedClass.class_name ||
                selectedClass.name ||
                'Class'}
            </h2>

            <p>
              Section: {selectedClass.section || '—'}
              {' · '}
              Code:{' '}
              {selectedClass.class_code ||
                selectedClass.code ||
                '—'}
            </p>

            <div className="student-class-list">
              {classStudents.length > 0 ? (
                classStudents.map((student) => (
                  <div
                    className="class-student-row"
                    key={student.id}
                  >
                    <span className="table-student">
                      <User size={17} />
                      <strong>{student.name}</strong>
                    </span>

                    <span>
                      {student.email || '—'}
                    </span>

                    <span>
                      {Number(student.progress) || 0}%
                    </span>

                    <span className="icon-value">
                      <Zap size={15} />
                      {student.xp || 0} XP
                    </span>
                  </div>
                ))
              ) : (
                <p className="empty">
                  No students have joined this class yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          STUDENT MODAL
          ====================================================== */}

      {selected && (

        <StudentModal
          data={selected}
          close={() =>
            setSelected(null)
          }
        />

      )}

    </div>
  )
}


// ============================================================
// STUDENTS
// ============================================================

function Students({ students, open }) {

  const [search, setSearch] = useState('')

  const list = students.filter((student) => {

    const text =
      `${student.name || ''} ${
        student.section || ''
      }`.toLowerCase()

    return text.includes(
      search.toLowerCase()
    )
  })

  return (
    <>

      <div className="teacher-toolbar">

        <div className="search-box">

          <Search size={19} />

          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

        <span>
          {list.length} student
          {list.length !== 1 ? 's' : ''}
        </span>

      </div>


      <div className="teacher-panel student-panel">

        <div className="student-head">

          <span>STUDENT</span>
          <span>SECTION</span>
          <span>PROGRESS</span>
          <span>XP / LEVEL</span>
          <span>STATUS</span>

        </div>


        {list.length > 0 ? (

          list.map((student) => {

            const progress =
              Number(student.progress) || 0

            return (

              <button
                type="button"
                className="student-row"
                key={student.id}
                onClick={() =>
                  open(student.id)
                }
              >

                <span className="table-student">

                  <User size={18} />

                  <b>
                    {student.name}
                  </b>

                </span>


                <span>
                  {student.section || '—'}
                </span>


                <span className="student-progress">

                  <Progress
                    value={progress}
                  />

                  {progress}%

                </span>


                <span className="xp-level">

                  <span className="icon-value">

                    <Zap size={15} />

                    {student.xp || 0}

                  </span>

                  <span className="icon-value">

                    <Star size={15} />

                    Lv.{student.level || 1}

                  </span>

                </span>


                <span className="student-status">

                  {progress < 40 ? (

                    <>

                      <AlertTriangle size={16} />

                      Needs help

                    </>

                  ) : progress < 75 ? (

                    <>

                      <Activity size={16} />

                      In Progress

                    </>

                  ) : (

                    <>

                      <CheckCircle2 size={16} />

                      Doing Well

                    </>

                  )}

                </span>

              </button>

            )
          })

        ) : (

          <p className="empty">
            No students found.
          </p>

        )}

      </div>

    </>
  )
}


// ============================================================
// STUDENT MODAL
// ============================================================

function StudentModal({ data, close }) {

  const student = data.student || {}
  const lessons = data.lessons || []
  const assessments = data.assessments || []


  const getLessonIcon = (phase) => {

    if (phase === 'completed') {

      return (
        <CheckCircle2
          size={20}
          className="lesson-icon completed"
        />
      )

    }

    if (phase) {

      return (
        <PlayCircle
          size={20}
          className="lesson-icon active"
        />
      )

    }

    return (
      <Lock
        size={20}
        className="lesson-icon locked"
      />
    )
  }


  return (

    <div
      className="modal-backdrop"
      onClick={close}
    >

      <div
        className="student-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <button
          type="button"
          className="close"
          onClick={close}
          aria-label="Close student profile"
        >
          <X size={21} />
        </button>


        <p className="student-profile-label">

          <User size={16} />

          <span>
            STUDENT PROFILE
          </span>

        </p>


        <h2>
          {student.name || 'Student'}
        </h2>


        <div className="profile-stats">

          <span>

            <Star size={17} />

            Level {student.level || 1}

          </span>


          <span>

            <Zap size={17} />

            {student.xp || 0} XP

          </span>


          <span>

            <Activity size={17} />

            {student.streak || 0} streak

          </span>

        </div>


        {/* ==================================================
            LESSON ACTIVITIES
            ================================================== */}

        <h3 className="modal-section-title">

          <BookOpen size={20} />

          <span>
            Lesson Activities
          </span>

        </h3>


        <div className="lesson-list">

          {lessons.length > 0 ? (

            lessons.map((lesson) => (

              <div key={lesson.id}>

                <span className="lesson-status-icon">

                  {getLessonIcon(
                    lesson.phase
                  )}

                </span>

                <b>
                  {lesson.title}
                </b>

                <small>

                  {lesson.module ||
                    'Lesson'}

                  {' · '}

                  Attempts:{' '}

                  {lesson.attempts || 0}

                </small>

                <em>
                  {lesson.phase ||
                    'Not started'}
                </em>

              </div>

            ))

          ) : (

            <p className="empty">
              No lesson activity available.
            </p>

          )}

        </div>


        {/* ==================================================
            ASSESSMENT HISTORY
            ================================================== */}

        <h3 className="modal-section-title">

          <ClipboardList size={20} />

          <span>
            Assessment History
          </span>

        </h3>


        {assessments.length > 0 ? (

          assessments.map(
            (assessment, index) => {

              const total =
                Number(
                  assessment.total
                ) || 0

              const score =
                Number(
                  assessment.score
                ) || 0

              const percentage =
                total > 0
                  ? Math.round(
                      (score / total) * 100
                    )
                  : 0


              return (

                <div
                  className="assessment-row"
                  key={
                    assessment.id ||
                    index
                  }
                >

                  <span>

                    {assessment.title ||
                      assessment.type ||
                      'Assessment'}

                  </span>


                  <b>
                    {score}/{total}
                  </b>


                  <strong>
                    {percentage}%
                  </strong>

                </div>

              )
            }
          )

        ) : (

          <p className="empty">
            No assessment history available.
          </p>

        )}

      </div>

    </div>
  )
}


// ============================================================
// QUIZ MANAGER
// ============================================================

function createBlankQuestion() {
  return {
    question: '',
    question_type: 'mcq',
    language: 'java',

    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'a',

    starter_code: '',
    code_hint: '',

    // Used by "Complete the Code".
    // Example:
    // [
    //   {
    //     id: 1,
    //     answer: 'age',
    //     options: ['age', 'int', 'String', 'print']
    //   }
    // ]
    code_blanks: [
      {
        id: 1,
        answer: '',
        options: ['', '', '', '']
      }
    ],

    points: 1
  }
}

function normalizeBlankOptions(blank) {
  const options = Array.isArray(blank?.options)
    ? blank.options.slice(0, 4)
    : []

  while (options.length < 4) {
    options.push('')
  }

  return options
}

function getBlankCount(template) {
  if (!template) return 0
  const matches = template.match(/____/g)
  return matches ? matches.length : 0
}

function syncCodeBlanks(template, existingBlanks = []) {
  const count = getBlankCount(template)

  if (count === 0) {
    return existingBlanks.length
      ? existingBlanks
      : [
          {
            id: 1,
            answer: '',
            options: ['', '', '', '']
          }
        ]
  }

  return Array.from({ length: count }, (_, index) => {
    const existing = existingBlanks[index]

    return {
      id: index + 1,
      answer: existing?.answer || '',
      options: normalizeBlankOptions(existing)
    }
  })
}

function getQuestionTypeLabel(type) {
  return (
    QUESTION_TYPES.find((item) => item.value === type)?.label ||
    'Question'
  )
}

function QuizManager({
  quizzes,
  setQuizzes
}) {
  const [lessons, setLessons] = useState([])
  const [classes, setClasses] = useState([])

  const [title, setTitle] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [classIds, setClassIds] = useState([])
  const [editingQuizId, setEditingQuizId] = useState(null)

  const [questions, setQuestions] = useState([
    createBlankQuestion()
  ])

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [scoreViewer, setScoreViewer] = useState(null)
  const [scoresLoading, setScoresLoading] = useState(false)
  const [scoreSection, setScoreSection] = useState('all')

  // Archive view: 'active' shows live quizzes (the `quizzes` prop,
  // which the server already filters to non-archived), 'archived'
  // shows quizzes the teacher has archived instead of deleting
  // them, fetched lazily from its own endpoint.
  const [quizView, setQuizView] = useState('active')
  const [archivedQuizzes, setArchivedQuizzes] = useState([])
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [archivedLoaded, setArchivedLoaded] = useState(false)

  // ==========================================================
  // LOAD ARCHIVED QUIZZES (lazy — only once the Archived tab
  // is opened, then cached until an archive/restore changes it)
  // ==========================================================

  const loadArchivedQuizzes = async () => {
    try {
      setArchivedLoading(true)
      setError('')

      const { data } = await axios.get(
        '/api/teacher/quizzes/archived'
      )

      setArchivedQuizzes(Array.isArray(data) ? data : [])
      setArchivedLoaded(true)
    } catch (err) {
      console.error('Failed to load archived quizzes:', err)

      setError(
        err.response?.data?.message ||
        'Could not load archived quizzes.'
      )
    } finally {
      setArchivedLoading(false)
    }
  }

  useEffect(() => {
    if (quizView === 'archived') {
      loadArchivedQuizzes()
    }
  }, [quizView])

  // ==========================================================
  // LOAD LESSONS + TEACHER CLASSES
  // ==========================================================

  useEffect(() => {
    axios.get('/api/lessons')
      .then(({ data }) => {
        setLessons(
          Array.isArray(data)
            ? data
            : []
        )
      })
      .catch((err) => {
        console.error('Failed to load lessons:', err)
        setLessons([])
      })

    axios.get('/api/teacher/classes')
      .then(({ data }) => {
        setClasses(
          Array.isArray(data)
            ? data
            : []
        )
      })
      .catch((err) => {
        console.error('Failed to load teacher classes:', err)
        setClasses([])
      })
  }, [])

  // ==========================================================
  // CLOSE SCORE MODAL WITH ESCAPE
  // ==========================================================

  useEffect(() => {
    if (!scoreViewer) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setScoreViewer(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [scoreViewer])

  const toggleClass = (id) => {
    const value = String(id)
    setClassIds((prev) =>
      prev.some((item) => String(item) === value)
        ? prev.filter((item) => String(item) !== value)
        : [...prev, id]
    )
  }

  const getQuizClassIds = (quiz) => {
    const raw = quiz?.class_ids

    if (Array.isArray(raw)) return raw

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      } catch {
        return raw.split(',').map((item) => item.trim()).filter(Boolean)
      }
    }

    if (Array.isArray(quiz?.classes)) {
      return quiz.classes
        .map((item) => item.id ?? item.class_id)
        .filter(Boolean)
    }

    if (quiz?.class_id) return [quiz.class_id]
    return []
  }

  // ==========================================================
  // UPDATE QUESTION
  // ==========================================================

  const updateQuestion = (index, key, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q

        const next = {
          ...q,
          [key]: value
        }

        // When switching to Complete the Code, give the teacher
        // a usable starter template and one blank.
        if (
          key === 'question_type' &&
          value === 'complete_code'
        ) {
          if (!next.starter_code?.trim()) {
            next.starter_code = 'System.out.println(____);'
          }

          next.code_blanks = syncCodeBlanks(
            next.starter_code,
            next.code_blanks
          )
        }

        return next
      })
    )
  }

  const updateCodeTemplate = (index, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q

        return {
          ...q,
          starter_code: value,
          code_blanks: syncCodeBlanks(
            value,
            q.code_blanks
          )
        }
      })
    )
  }

  const updateCodeBlank = (
    questionIndex,
    blankIndex,
    key,
    value
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q

        const blanks = [...(q.code_blanks || [])]

        const current = blanks[blankIndex] || {
          id: blankIndex + 1,
          answer: '',
          options: ['', '', '', '']
        }

        if (key === 'options') {
          blanks[blankIndex] = {
            ...current,
            options: value
          }
        } else {
          blanks[blankIndex] = {
            ...current,
            [key]: value
          }
        }

        return {
          ...q,
          code_blanks: blanks
        }
      })
    )
  }

  // ==========================================================
  // ADD QUESTION
  // ==========================================================

  const addQuestion = () => {
    if (questions.length >= 20) return

    setQuestions((prev) => [
      ...prev,
      createBlankQuestion()
    ])
  }

  // ==========================================================
  // REMOVE QUESTION
  // ==========================================================

  const removeQuestion = (index) => {
    if (questions.length === 1) return

    setQuestions((prev) =>
      prev.filter((_, i) => i !== index)
    )
  }

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateQuestion = (q, index) => {
    if (!q.question.trim()) {
      return `Question ${index + 1}: write the question first.`
    }

    // Complete the Code uses selectable tokens.
    if (q.question_type === 'complete_code') {
      const template = q.starter_code?.trim() || ''
      const blankCount = getBlankCount(template)

      if (!template) {
        return `Question ${index + 1}: add a code template.`
      }

      if (blankCount === 0) {
        return `Question ${index + 1}: put at least one ____ blank in the code template.`
      }

      if ((q.code_blanks || []).length !== blankCount) {
        return `Question ${index + 1}: click "Detect blanks" after changing the template.`
      }

      for (let b = 0; b < blankCount; b++) {
        const blank = q.code_blanks[b]
        const answer = String(blank?.answer || '').trim()
        const options = normalizeBlankOptions(blank)
          .map((item) => String(item || '').trim())
          .filter(Boolean)

        if (!answer) {
          return `Question ${index + 1}, blank ${b + 1}: enter the correct token.`
        }

        if (options.length < 2) {
          return `Question ${index + 1}, blank ${b + 1}: provide at least two choices.`
        }

        const normalized = options.map((item) =>
          item.toLowerCase()
        )

        if (
          new Set(normalized).size !== normalized.length
        ) {
          return `Question ${index + 1}, blank ${b + 1}: choices must be unique.`
        }

        if (
          !normalized.includes(answer.toLowerCase())
        ) {
          return `Question ${index + 1}, blank ${b + 1}: the correct token must be one of the choices.`
        }
      }

      return ''
    }

    // True / False questions.
    if (q.question_type === 'true_false') {
      if (
        !['a', 'b'].includes(q.correct_answer) ||
        !q.option_a?.trim() ||
        !q.option_b?.trim()
      ) {
        return `Question ${index + 1}: provide True and False choices and select the correct answer.`
      }

      return ''
    }

    // Multiple choice.
    if (
      !q.option_a?.trim() ||
      !q.option_b?.trim() ||
      !q.option_c?.trim() ||
      !q.option_d?.trim()
    ) {
      return `Question ${index + 1}: complete all four choices.`
    }

    return ''
  }

  // ==========================================================
  // BUILD PAYLOAD
  // ==========================================================

  const buildPayloadQuestions = () =>
    questions.map((q) => {
      const clean = {
        ...q,
        question: q.question.trim(),
        language: q.language || 'java',
        points: Number(q.points) || 1
      }

      if (q.question_type === 'complete_code') {
        clean.starter_code =
          q.starter_code?.trim() || ''

        clean.code_blanks = (
          q.code_blanks || []
        ).map((blank, index) => ({
          id: index + 1,
          answer: String(blank.answer || '').trim(),
          options: normalizeBlankOptions(blank)
            .map((option) => String(option || '').trim())
            .filter(Boolean)
        }))
      }

      return clean
    })

  // ==========================================================
  // CREATE QUIZ
  // ==========================================================

  const createQuiz = async (event) => {
    event.preventDefault()

    setMessage('')
    setError('')

    if (!title.trim()) {
      setError('Give your quiz a title.')
      return
    }

    if (!classIds.length) {
      setError('Select at least one class before publishing the quiz.')
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const validationError = validateQuestion(
        questions[i],
        i
      )

      if (validationError) {
        setError(validationError)
        return
      }
    }

    const payloadQuestions = buildPayloadQuestions()

    try {
      setSaving(true)

      const { data } = await axios.post(
        '/api/teacher/quizzes',
        {
          title: title.trim(),
          lesson_id: lessonId || null,
          class_ids: classIds,
          questions: payloadQuestions
        }
      )

      const created = {
        id: data.id,
        title: title.trim(),
        lesson_id: lessonId || null,
        class_ids: classIds,
        class_names: classes
          .filter((cls) =>
            classIds.some((id) => String(id) === String(cls.id))
          )
          .map((cls) => cls.class_name || cls.name || 'Class'),
        lesson_title:
          lessons.find(
            (lesson) =>
              String(lesson.id) ===
              String(lessonId)
          )?.title || null,
        question_count: questions.length,
        attempt_count: 0,
        is_active: 1,
        is_archived: 0
      }

      setQuizzes((prev) => [
        created,
        ...prev
      ])

      setTitle('')
      setLessonId('')
      setClassIds([])
      setQuestions([
        createBlankQuestion()
      ])

      setMessage(
        'Quiz published. Students can now access it.'
      )
    } catch (err) {
      console.error('Failed to create quiz:', err)

      setError(
        err.response?.data?.message ||
        'Could not create the quiz.'
      )
    } finally {
      setSaving(false)
    }
  }

  // ==========================================================
  // EDIT EXISTING QUIZ
  // ==========================================================

  const editQuiz = async (quiz) => {
    setError('')
    setMessage('')

    try {
      setSaving(true)
      const { data } = await axios.get(
        `/api/teacher/quizzes/${quiz.id}`
      )

      const loaded = data?.quiz || data
      const loadedQuestions = Array.isArray(data?.questions)
        ? data.questions
        : Array.isArray(loaded?.questions)
          ? loaded.questions
          : []

      setEditingQuizId(quiz.id)
      setTitle(loaded?.title || quiz.title || '')
      setLessonId(loaded?.lesson_id ?? quiz.lesson_id ?? '')
      setClassIds(getQuizClassIds(loaded || quiz))
      setQuestions(
        loadedQuestions.length
          ? loadedQuestions.map((q) => ({
              ...createBlankQuestion(),
              ...q,
              // Old quizzes may use removed question types.
              // Fall back to multiple choice.
              question_type: ALLOWED_QUESTION_TYPES.includes(
                q.question_type
              )
                ? q.question_type
                : 'mcq',
              option_a: q.option_a || '',
              option_b: q.option_b || '',
              option_c: q.option_c || '',
              option_d: q.option_d || '',
              code_blanks: Array.isArray(q.code_blanks)
                ? q.code_blanks
                : (() => {
                    if (typeof q.code_blanks !== 'string') return []
                    try {
                      const parsed = JSON.parse(q.code_blanks)
                      return Array.isArray(parsed) ? parsed : []
                    } catch {
                      return []
                    }
                  })()
            }))
          : [createBlankQuestion()]
      )

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Failed to load quiz for editing:', err)
      setError(
        err.response?.data?.message ||
        'Could not load this quiz for editing.'
      )
    } finally {
      setSaving(false)
    }
  }

  const updateQuiz = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!editingQuizId) return

    if (!title.trim()) {
      setError('Give your quiz a title.')
      return
    }

    if (!classIds.length) {
      setError('Select at least one class before saving the quiz.')
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const validationError = validateQuestion(questions[i], i)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    const payloadQuestions = buildPayloadQuestions()

    try {
      setSaving(true)
      const { data } = await axios.patch(
        `/api/teacher/quizzes/${editingQuizId}`,
        {
          title: title.trim(),
          lesson_id: lessonId || null,
          class_ids: classIds,
          questions: payloadQuestions
        }
      )

      const returnedQuiz = data?.quiz || data
      setQuizzes((prev) =>
        prev.map((item) =>
          item.id === editingQuizId
            ? {
                ...item,
                ...returnedQuiz,
                title: title.trim(),
                lesson_id: lessonId || null,
                class_ids: classIds,
                class_names: classes
                  .filter((cls) =>
                    classIds.some((id) => String(id) === String(cls.id))
                  )
                  .map((cls) => cls.class_name || cls.name || 'Class'),
                question_count: questions.length
              }
            : item
        )
      )

      cancelEdit()
      setMessage('Quiz updated successfully.')
    } catch (err) {
      console.error('Failed to update quiz:', err)
      setError(
        err.response?.data?.message ||
        'Could not update the quiz.'
      )
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditingQuizId(null)
    setTitle('')
    setLessonId('')
    setClassIds([])
    setQuestions([createBlankQuestion()])
  }

  // ==========================================================
  // TOGGLE QUIZ
  // ==========================================================

  const toggleQuiz = async (id) => {
    try {
      const { data } = await axios.patch(
        `/api/teacher/quizzes/${id}/toggle`
      )

      setQuizzes((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                is_active: data.is_active
              }
            : q
        )
      )
    } catch (err) {
      console.error('Failed to toggle quiz:', err)

      setError(
        err.response?.data?.message ||
        'Could not change quiz access.'
      )
    }
  }

  // ==========================================================
  // ARCHIVE QUIZ
  // Replaces plain deletion as the default "remove it from my
  // active list" action. Archived quizzes keep their student
  // results and can be restored, or permanently deleted from
  // the Archived tab. Moves the quiz from the active list
  // (the `quizzes` prop) into the locally-held archived list.
  // ==========================================================

  const archiveQuiz = async (quiz) => {
    setError('')

    try {
      await axios.patch(
        `/api/teacher/quizzes/${quiz.id}/archive`
      )

      setQuizzes((prev) =>
        prev.filter((q) => q.id !== quiz.id)
      )

      setArchivedQuizzes((prev) => [
        { ...quiz, is_archived: 1 },
        ...prev.filter((q) => q.id !== quiz.id)
      ])

      setMessage('Quiz archived. Students can no longer see it.')
    } catch (err) {
      console.error('Failed to archive quiz:', err)

      setError(
        err.response?.data?.message ||
        'Could not archive this quiz.'
      )
    }
  }

  // ==========================================================
  // RESTORE ARCHIVED QUIZ
  // Moves the quiz back out of the archived list into the
  // active list.
  // ==========================================================

  const restoreQuiz = async (quiz) => {
    setError('')

    try {
      await axios.patch(
        `/api/teacher/quizzes/${quiz.id}/restore`
      )

      setArchivedQuizzes((prev) =>
        prev.filter((q) => q.id !== quiz.id)
      )

      setQuizzes((prev) => [
        { ...quiz, is_archived: 0 },
        ...prev.filter((q) => q.id !== quiz.id)
      ])

      setMessage('Quiz restored to your active list.')
    } catch (err) {
      console.error('Failed to restore quiz:', err)

      setError(
        err.response?.data?.message ||
        'Could not restore this quiz.'
      )
    }
  }

  // ==========================================================
  // PERMANENTLY DELETE QUIZ
  // Only reachable from the Archived tab, as a final step.
  // ==========================================================

  const deleteQuiz = async (id) => {
    if (
      !window.confirm(
        'Permanently delete this quiz? Student results for this quiz will also be removed. This cannot be undone.'
      )
    ) {
      return
    }

    try {
      await axios.delete(
        `/api/teacher/quizzes/${id}`
      )

      setQuizzes((prev) =>
        prev.filter((q) => q.id !== id)
      )

      setArchivedQuizzes((prev) =>
        prev.filter((q) => q.id !== id)
      )
    } catch (err) {
      console.error('Failed to delete quiz:', err)

      setError(
        err.response?.data?.message ||
        'Could not delete quiz.'
      )
    }
  }

  // ==========================================================
  // VIEW QUIZ SCORES
  // ==========================================================

  const viewQuizScores = async (quiz) => {
    setError('')
    setScoreSection('all')

    setScoreViewer({
      quiz,
      results: [],
      summary: null
    })

    setScoresLoading(true)

    try {
      const { data } = await axios.get(
        `/api/teacher/quizzes/${quiz.id}/scores`
      )

      setScoreViewer({
        ...data,
        quiz: data.quiz || quiz
      })
    } catch (err) {
      console.error('Failed to load quiz scores:', err)

      setScoreViewer(null)

      setError(
        err.response?.data?.message ||
        'Could not load quiz scores.'
      )
    } finally {
      setScoresLoading(false)
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  // ==========================================================
  // SCORES: SECTION FILTER
  // ==========================================================

  const getResultSection = (result) =>
    String(result?.section || '').trim() || 'No section'

  const scoreResults = Array.isArray(scoreViewer?.results)
    ? scoreViewer.results
    : []

  const sectionOptions = [
    ...new Set(scoreResults.map(getResultSection))
  ].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

  const filteredResults =
    scoreSection === 'all'
      ? scoreResults
      : scoreResults.filter(
          (result) =>
            getResultSection(result) === scoreSection
        )

  const filteredPercentages = filteredResults.map(
    (result) => Number(result.percentage) || 0
  )

  const scoreSummary =
    scoreSection === 'all' && scoreViewer?.summary
      ? scoreViewer.summary
      : {
          attempts: filteredResults.length,
          average: filteredPercentages.length
            ? Math.round(
                filteredPercentages.reduce(
                  (sum, value) => sum + value,
                  0
                ) / filteredPercentages.length
              )
            : 0,
          highest: filteredPercentages.length
            ? Math.max(...filteredPercentages)
            : 0
        }

  // `quizzes` (the prop) already holds only active quizzes —
  // the server's listTeacher excludes archived ones. Archived
  // quizzes live in their own lazily-loaded state above.
  const activeQuizzes = quizzes
  const visibleQuizzes =
    quizView === 'archived' ? archivedQuizzes : activeQuizzes

  return (
    <div className="quiz-maker">

      {/* ======================================================
          INTRO
          ====================================================== */}

      <div className="quiz-maker-intro">
        <div>
          <span className="quiz-maker-kicker">
            W3SCHOOLS-STYLE QUIZ BUILDER
          </span>

          <h2>
            Create a quiz your students can take after a lesson.
          </h2>

          <p>
            Build multiple-choice, true / false, or
            <strong> Complete the Code </strong>
            questions where students select the correct
            tokens to fill the blanks.
          </p>
        </div>

        <div className="quiz-maker-logo">
          <BookMarked size={25} />
          <span>Quiz</span>
        </div>
      </div>

      {/* ======================================================
          ALERTS
          ====================================================== */}

      {message && (
        <div className="quiz-alert success">
          <Check size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="quiz-alert error">
          {error}
        </div>
      )}

      {/* ======================================================
          QUIZ BUILDER
          ====================================================== */}

      <form
        className="quiz-builder-card"
        onSubmit={editingQuizId ? updateQuiz : createQuiz}
      >

        <div className="quiz-builder-top">
          <div className="quiz-field quiz-title-field">
            <label>Quiz title</label>

            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="e.g. Java Variables Quiz"
            />
          </div>

          <div className="quiz-field quiz-class-selector-field">
            <label>
              Classes <span>(select one or more)</span>
            </label>

            <div className="quiz-class-selector">
              {classes.length ? (
                classes.map((cls) => {
                  const selectedClass = classIds.some(
                    (id) => String(id) === String(cls.id)
                  )
                  const label = cls.class_name || cls.name || 'Class'
                  const section = cls.section ? ` — ${cls.section}` : ''

                  return (
                    <label
                      className={`quiz-class-option ${
                        selectedClass ? 'is-selected' : ''
                      }`}
                      key={cls.id}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClass}
                        onChange={() => toggleClass(cls.id)}
                      />
                      <span className="quiz-class-check">
                        {selectedClass && <Check size={14} />}
                      </span>
                      <span>
                        <strong>{label}</strong>
                        {section && <small>{section}</small>}
                      </span>
                    </label>
                  )
                })
              ) : (
                <span className="quiz-class-empty">
                  No classes available. Create a class first.
                </span>
              )}
            </div>

            <small className="quiz-selection-summary">
              {classIds.length
                ? `${classIds.length} class${classIds.length === 1 ? '' : 'es'} selected`
                : 'Select at least one class. The quiz will be visible to students enrolled in any selected class.'}
            </small>
          </div>

          <div className="quiz-field">
            <label>
              Lesson <span>(optional)</span>
            </label>

            <div className="quiz-select-wrap">
              <select
                value={lessonId}
                onChange={(e) =>
                  setLessonId(e.target.value)
                }
              >
                <option value="">
                  No lesson linked
                </option>

                {lessons.map((lesson) => (
                  <option
                    key={lesson.id}
                    value={lesson.id}
                  >
                    {lesson.title}
                  </option>
                ))}
              </select>

              <ChevronDown size={17} />
            </div>
          </div>
        </div>

        {/* ====================================================
            QUESTIONS HEADER
            ==================================================== */}

        <div className="quiz-builder-heading">
          <div>
            <span className="quiz-section-number">
              01
            </span>

            <div>
              <h3>Questions</h3>

              <p>
                Choose a question type for each question.
              </p>
            </div>
          </div>

          <span className="question-count">
            {questions.length}/20
          </span>
        </div>

        {/* ====================================================
            QUESTIONS
            ==================================================== */}

        <div className="question-stack">
          {questions.map((q, index) => {
            const blankCount =
              getBlankCount(q.starter_code)

            const syncedBlanks =
              q.code_blanks || []

            return (
              <div
                className="quiz-question-card"
                key={index}
              >

                {/* Question header */}
                <div className="quiz-question-header">
                  <div className="quiz-question-number">
                    {index + 1}
                  </div>

                  <input
                    className="question-input"
                    value={q.question}
                    onChange={(e) =>
                      updateQuestion(
                        index,
                        'question',
                        e.target.value
                      )
                    }
                    placeholder="Write your question here..."
                  />

                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="icon-danger"
                      onClick={() =>
                        removeQuestion(index)
                      }
                      title="Remove question"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>

                {/* Question type */}
                <div className="quiz-question-type-row">
                  <div className="quiz-field">
                    <label>Question type</label>

                    <div className="quiz-select-wrap">
                      <select
                        value={q.question_type}
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            'question_type',
                            e.target.value
                          )
                        }
                      >
                        {QUESTION_TYPES.map(
                          (type) => (
                            <option
                              key={type.value}
                              value={type.value}
                            >
                              {type.label}
                            </option>
                          )
                        )}
                      </select>

                      <ChevronDown size={17} />
                    </div>
                  </div>

                  {q.question_type === 'complete_code' && (
                    <div className="quiz-field">
                      <label>Language</label>

                      <div className="quiz-select-wrap">
                        <select
                          value={
                            q.language || 'java'
                          }
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              'language',
                              e.target.value
                            )
                          }
                        >
                          <option value="java">
                            Java
                          </option>
                          <option value="javascript">
                            JavaScript
                          </option>
                          <option value="python">
                            Python
                          </option>
                          <option value="c">
                            C
                          </option>
                        </select>

                        <ChevronDown size={17} />
                      </div>
                    </div>
                  )}
                </div>

                {/* ==================================================
                    COMPLETE THE CODE
                    ================================================== */}

                {q.question_type === 'complete_code' && (
                  <div className="code-completion-editor">

                    <div className="code-completion-heading">
                      <div>
                        <strong>
                          Complete the Code
                        </strong>

                        <p>
                          Use <code>____</code> for every
                          blank. Students will choose tokens
                          instead of typing or executing code.
                        </p>
                      </div>

                      <span>
                        {blankCount} blank
                        {blankCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <label className="code-template-label">
                      Code template
                    </label>

                    <textarea
                      className="code-template-input"
                      value={
                        q.starter_code || ''
                      }
                      onChange={(e) =>
                        updateCodeTemplate(
                          index,
                          e.target.value
                        )
                      }
                      placeholder={
                        'System.out.println(____);'
                      }
                      rows={5}
                      spellCheck="false"
                    />

                    <div className="code-template-actions">
                      <button
                        type="button"
                        className="quiz-add-btn"
                        onClick={() =>
                          updateCodeTemplate(
                            index,
                            q.starter_code || ''
                          )
                        }
                      >
                        <Check size={16} />
                        Detect blanks
                      </button>

                      <span>
                        Put <code>____</code> exactly where
                        students must choose a token.
                      </span>
                    </div>

                    {blankCount > 0 && (
                      <div className="code-blank-list">
                        {syncedBlanks
                          .slice(0, blankCount)
                          .map(
                            (
                              blank,
                              blankIndex
                            ) => (
                              <div
                                className="code-blank-card"
                                key={
                                  blank.id ||
                                  blankIndex
                                }
                              >
                                <div className="code-blank-title">
                                  <span>
                                    Blank{' '}
                                    {blankIndex + 1}
                                  </span>

                                  <code>
                                    ____
                                  </code>
                                </div>

                                <div className="code-blank-answer">
                                  <label>
                                    Correct token
                                  </label>

                                  <input
                                    value={
                                      blank.answer ||
                                      ''
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateCodeBlank(
                                        index,
                                        blankIndex,
                                        'answer',
                                        e.target.value
                                      )
                                    }
                                    placeholder={
                                      'e.g. "Hello World"'
                                    }
                                  />
                                </div>

                                <div className="code-choice-grid">
                                  {normalizeBlankOptions(
                                    blank
                                  ).map(
                                    (
                                      option,
                                      optionIndex
                                    ) => (
                                      <label
                                        key={
                                          optionIndex
                                        }
                                      >
                                        <span>
                                          Choice{' '}
                                          {String.fromCharCode(
                                            65 +
                                              optionIndex
                                          )}
                                        </span>

                                        <input
                                          value={
                                            option
                                          }
                                          onChange={(
                                            e
                                          ) => {
                                            const options =
                                              normalizeBlankOptions(
                                                blank
                                              )

                                            options[
                                              optionIndex
                                            ] =
                                              e.target.value

                                            updateCodeBlank(
                                              index,
                                              blankIndex,
                                              'options',
                                              options
                                            )
                                          }}
                                          placeholder={
                                            optionIndex ===
                                            0
                                              ? 'Correct token'
                                              : 'Distractor'
                                          }
                                        />
                                      </label>
                                    )
                                  )}
                                </div>

                                <div className="code-answer-note">
                                  <Check size={14} />

                                  Correct answer:{' '}

                                  <strong>
                                    {blank.answer?.trim() ||
                                      'Not set'}
                                  </strong>
                                </div>
                              </div>
                            )
                          )}
                      </div>
                    )}

                    {blankCount === 0 && (
                      <div className="code-completion-empty">
                        <ClipboardList size={22} />

                        <strong>
                          Add a blank to your code
                        </strong>

                        <span>
                          Example:
                          {' '}
                          <code>
                            const ____ = 10;
                          </code>
                        </span>
                      </div>
                    )}

                    <div className="code-preview">
                      <div className="code-preview-header">
                        <span>Student preview</span>
                        <span>
                          No code editor
                        </span>
                      </div>

                      <pre>
                        {(q.starter_code || '')
                          .split('____')
                          .map(
                            (part, partIndex) => (
                              <React.Fragment
                                key={partIndex}
                              >
                                {part}

                                {partIndex <
                                  blankCount && (
                                  <mark>
                                    blank
                                  </mark>
                                )}
                              </React.Fragment>
                            )
                          )}
                      </pre>
                    </div>

                    <div className="coding-field">
                      <label>
                        Hint <span>(optional)</span>
                      </label>

                      <input
                        value={
                          q.code_hint || ''
                        }
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            'code_hint',
                            e.target.value
                          )
                        }
                        placeholder="Give students a small hint..."
                      />
                    </div>
                  </div>
                )}

                {/* ==================================================
                    TRUE / FALSE
                    ================================================== */}

                {q.question_type === 'true_false' && (
                  <>
                    <div className="quiz-options-grid">
                      {[
                        ['a', 'True'],
                        ['b', 'False']
                      ].map(
                        ([letter, text]) => (
                          <label
                            className={
                              `quiz-option-editor ${
                                q.correct_answer ===
                                letter
                                  ? 'is-correct'
                                  : ''
                              }`
                            }
                            key={letter}
                          >
                            <span className="option-letter">
                              {letter.toUpperCase()}
                            </span>

                            <input
                              value={
                                q[
                                  `option_${letter}`
                                ] || text
                              }
                              onChange={(e) =>
                                updateQuestion(
                                  index,
                                  `option_${letter}`,
                                  e.target.value
                                )
                              }
                            />

                            <button
                              type="button"
                              className="correct-toggle"
                              onClick={() =>
                                updateQuestion(
                                  index,
                                  'correct_answer',
                                  letter
                                )
                              }
                              title="Mark as correct"
                            >
                              {q.correct_answer ===
                                letter && (
                                <Check size={15} />
                              )}
                            </button>
                          </label>
                        )
                      )}
                    </div>

                    <p className="answer-note">
                      <Check size={14} />
                      Correct answer:{' '}
                      <strong>
                        {q.correct_answer === 'a'
                          ? 'TRUE'
                          : 'FALSE'}
                      </strong>
                    </p>
                  </>
                )}

                {/* ==================================================
                    MULTIPLE CHOICE
                    ================================================== */}

                {q.question_type === 'mcq' && (
                  <>
                    <div className="quiz-options-grid">
                      {[
                        'a',
                        'b',
                        'c',
                        'd'
                      ].map((letter) => (
                        <label
                          className={
                            `quiz-option-editor ${
                              q.correct_answer ===
                              letter
                                ? 'is-correct'
                                : ''
                            }`
                          }
                          key={letter}
                        >
                          <span className="option-letter">
                            {letter.toUpperCase()}
                          </span>

                          <input
                            value={
                              q[
                                `option_${letter}`
                              ] || ''
                            }
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                `option_${letter}`,
                                e.target.value
                              )
                            }
                            placeholder={
                              `Option ${letter.toUpperCase()}`
                            }
                          />

                          <button
                            type="button"
                            className="correct-toggle"
                            onClick={() =>
                              updateQuestion(
                                index,
                                'correct_answer',
                                letter
                              )
                            }
                            title="Mark as correct"
                          >
                            {q.correct_answer ===
                              letter && (
                              <Check size={15} />
                            )}
                          </button>
                        </label>
                      ))}
                    </div>

                    <p className="answer-note">
                      <Check size={14} />
                      Correct answer:{' '}
                      <strong>
                        {q.correct_answer.toUpperCase()}
                      </strong>
                    </p>
                  </>
                )}

              </div>
            )
          })}
        </div>

        {/* ====================================================
            BUILDER ACTIONS
            ==================================================== */}

        <div className="quiz-builder-actions">
          <button
            type="button"
            className="quiz-add-btn"
            onClick={addQuestion}
            disabled={
              questions.length >= 20
            }
          >
            <Plus size={18} />
            Add question
          </button>

          {editingQuizId && (
            <button
              type="button"
              className="quiz-add-btn"
              onClick={cancelEdit}
              disabled={saving}
            >
              <X size={18} />
              Cancel edit
            </button>
          )}

          <button
            type="submit"
            className="quiz-publish-btn"
            disabled={saving}
          >
            <Save size={18} />
            {saving
              ? (editingQuizId ? 'Saving...' : 'Publishing...')
              : (editingQuizId ? 'Save changes' : 'Publish quiz')}
          </button>
        </div>
      </form>

      {/* ======================================================
          QUIZ LIBRARY
          ====================================================== */}

      <section className="quiz-library">
        <div className="quiz-library-heading">
          <div>
            <span className="quiz-maker-kicker">
              YOUR QUIZZES
            </span>

            <h2>
              Quiz Library
            </h2>
          </div>

          <span>
            {visibleQuizzes.length}{' '}
            {visibleQuizzes.length === 1
              ? 'quiz'
              : 'quizzes'}
          </span>
        </div>

        <div className="quiz-view-tabs">
          <button
            type="button"
            className={`quiz-view-tab ${
              quizView === 'active' ? 'active' : ''
            }`}
            onClick={() => setQuizView('active')}
          >
            Active
            <em>{activeQuizzes.length}</em>
          </button>

          <button
            type="button"
            className={`quiz-view-tab ${
              quizView === 'archived' ? 'active' : ''
            }`}
            onClick={() => setQuizView('archived')}
          >
            <Archive size={14} />
            Archived
            <em>
              {archivedLoaded ? archivedQuizzes.length : '—'}
            </em>
          </button>
        </div>

        {quizView === 'archived' && archivedLoading ? (
          <div className="quiz-empty">
            <ClipboardList size={30} />
            <strong>Loading archived quizzes...</strong>
          </div>
        ) : visibleQuizzes.length ? (
          <div className="quiz-library-list">
            {visibleQuizzes.map((quiz) => (
              <div
                className={
                  `quiz-library-item ${
                    !Number(quiz.is_active)
                      ? 'is-locked'
                      : ''
                  } ${
                    Number(quiz.is_archived) === 1
                      ? 'is-archived'
                      : ''
                  }`
                }
                key={quiz.id}
              >
                <div className="quiz-library-icon">
                  <ClipboardList size={21} />
                </div>

                <div className="quiz-library-main">
                  <strong>
                    {quiz.title}
                  </strong>

                  <span>
                    {Array.isArray(quiz.class_names) && quiz.class_names.length
                      ? quiz.class_names.join(', ')
                      : (quiz.class_name || 'No class')}
                    {' · '}
                    {quiz.lesson_title ||
                      'General quiz'}
                    {' · '}
                    {quiz.question_count || 0}
                    {' '}
                    questions
                    {' · '}
                    {quiz.attempt_count || 0}
                    {' '}
                    attempts
                  </span>
                </div>

                {Number(quiz.is_archived) === 1 ? (
                  <span className="quiz-status archived">
                    <Archive size={12} />
                    Archived
                  </span>
                ) : (
                  <span
                    className={
                      `quiz-status ${
                        Number(quiz.is_active)
                          ? 'published'
                          : 'blocked'
                      }`
                    }
                  >
                    {Number(quiz.is_active)
                      ? 'Published'
                      : 'Blocked'}
                  </span>
                )}

                {quizView === 'active' ? (
                  <>
                    <button
                      type="button"
                      className="quiz-action"
                      onClick={() => editQuiz(quiz)}
                      title="Edit quiz"
                    >
                      <Edit size={16} />
                      Edit
                    </button>

                    <button
                      type="button"
                      className="quiz-view-scores-btn"
                      onClick={() =>
                        viewQuizScores(quiz)
                      }
                      title="View student scores"
                    >
                      <Eye size={16} />
                      View Scores
                    </button>

                    <button
                      type="button"
                      className="quiz-action"
                      onClick={() =>
                        toggleQuiz(quiz.id)
                      }
                    >
                      <Power size={16} />

                      {Number(quiz.is_active)
                        ? 'Block'
                        : 'Allow'}
                    </button>

                    <button
                      type="button"
                      className="quiz-action archive"
                      onClick={() =>
                        archiveQuiz(quiz)
                      }
                      title="Move to archive"
                    >
                      <Archive size={16} />
                      Archive
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="quiz-view-scores-btn"
                      onClick={() =>
                        viewQuizScores(quiz)
                      }
                      title="View student scores"
                    >
                      <Eye size={16} />
                      View Scores
                    </button>

                    <button
                      type="button"
                      className="quiz-action restore"
                      onClick={() =>
                        restoreQuiz(quiz)
                      }
                      title="Restore to active quizzes"
                    >
                      <ArchiveRestore size={16} />
                      Restore
                    </button>

                    <button
                      type="button"
                      className="quiz-action delete"
                      onClick={() =>
                        deleteQuiz(quiz.id)
                      }
                      title="Permanently delete"
                    >
                      <Trash2 size={16} />
                      Delete permanently
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="quiz-empty">
            <ClipboardList size={30} />

            <strong>
              {quizView === 'archived'
                ? 'Nothing archived'
                : 'No quizzes yet'}
            </strong>

            <span>
              {quizView === 'archived'
                ? 'Quizzes you archive will show up here.'
                : 'Create your first quiz above.'}
            </span>
          </div>
        )}
      </section>

      {/* ======================================================
          QUIZ SCORE MODAL
          ====================================================== */}

      {scoreViewer && (
        <div
          className="quiz-score-modal-backdrop"
          onClick={() =>
            setScoreViewer(null)
          }
        >
          <div
            className="quiz-score-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="quiz-score-modal-close"
              onClick={() =>
                setScoreViewer(null)
              }
              aria-label="Close quiz scores"
            >
              <X size={20} />
            </button>

            <div className="quiz-score-modal-header">
              <div>
                <span className="quiz-maker-kicker">
                  QUIZ RESULTS
                </span>

                <h2>
                  {scoreViewer.quiz?.title ||
                    'Quiz Scores'}
                </h2>

                <p>
                  {scoreViewer.quiz?.lesson_title ||
                    'General quiz'}
                </p>
              </div>

              <div className="quiz-score-modal-icon">
                <ClipboardList size={25} />
              </div>
            </div>

            {!scoresLoading &&
              scoreViewer.summary && (
                <div className="quiz-score-summary">
                  <div>
                    <span>ATTEMPTS</span>

                    <strong>
                      {scoreSummary.attempts || 0}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {scoreSection === 'all'
                        ? 'CLASS AVERAGE'
                        : 'SECTION AVERAGE'}
                    </span>

                    <strong>
                      {scoreSummary.average || 0}%
                    </strong>
                  </div>

                  <div>
                    <span>HIGHEST SCORE</span>

                    <strong>
                      {scoreSummary.highest || 0}%
                    </strong>
                  </div>
                </div>
              )}

            {!scoresLoading && sectionOptions.length > 1 && (
              <div className="quiz-score-sections">
                <button
                  type="button"
                  className={`quiz-score-section-tab ${
                    scoreSection === 'all' ? 'active' : ''
                  }`}
                  onClick={() => setScoreSection('all')}
                >
                  All sections
                  <em>{scoreResults.length}</em>
                </button>

                {sectionOptions.map((section) => (
                  <button
                    type="button"
                    key={section}
                    className={`quiz-score-section-tab ${
                      scoreSection === section ? 'active' : ''
                    }`}
                    onClick={() => setScoreSection(section)}
                  >
                    {section}
                    <em>
                      {
                        scoreResults.filter(
                          (result) =>
                            getResultSection(result) === section
                        ).length
                      }
                    </em>
                  </button>
                ))}
              </div>
            )}

            {scoresLoading ? (
              <div className="quiz-score-loading">
                Loading scores...
              </div>
            ) : scoreResults.length ? (
              <div className="quiz-score-table">
                <div className="quiz-score-table-head">
                  <span>STUDENT</span>
                  <span>SECTION</span>
                  <span>SCORE</span>
                  <span>DATE</span>
                </div>

                {filteredResults.map((result) => (
                  <div
                    className="quiz-score-table-row"
                    key={result.id}
                  >
                    <span className="quiz-score-student">
                      <User size={17} />
                      <strong>{result.name}</strong>
                    </span>

                    <span>{result.section || '—'}</span>

                    <strong>
                      {result.score}/{result.total}
                    </strong>

                    <span>
                      {result.taken_at
                        ? new Date(result.taken_at).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="quiz-score-empty">
                <ClipboardList size={30} />

                <strong>
                  No scores yet
                </strong>

                <span>
                  Students have not taken this quiz.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}