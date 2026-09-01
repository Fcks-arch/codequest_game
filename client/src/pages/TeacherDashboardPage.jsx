import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import TeacherNav from '../components/TeacherNav';

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
  );
};

const Progress = ({ value }) => {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="progressbar">
      <i style={{ width: `${progress}%` }} />
    </div>
  );
};

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState('overview');
  const [data, setData] = useState({});
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const responses = await Promise.all([
        axios.get('/api/teacher/overview'),
        axios.get('/api/teacher/students'),
        axios.get('/api/teacher/analytics'),
        axios.get('/api/teacher/leaderboard'),
      ]);

      setData(responses[0].data || {});
      setStudents(responses[1].data || []);
      setAnalytics(responses[2].data || {});
      setLeaderboard(responses[3].data || []);
    } catch (error) {
      console.error('Failed to load teacher dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role !== 'instructor') {
      navigate('/quest');
      return;
    }

    loadDashboard();
  }, [user, navigate]);

  const openStudent = async (id) => {
    try {
      const response = await axios.get(
        `/api/teacher/students/${id}`
      );

      setSelected(response.data);
    } catch (error) {
      console.error('Failed to load student:', error);
    }
  };

  const stats = data.stats || {};
  const attentionStudents = data.attention || [];
  const recentStudents = data.recent || [];

  if (loading) {
    return (
      <div className="teacher-shell">
        <TeacherNav page={page} setPage={setPage} />

        <main className="teacher-main">
          <div className="teacher-loading">
            Loading Teacher Dashboard...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="teacher-shell">
      <TeacherNav
        page={page}
        setPage={setPage}
      />

      <main className="teacher-main">
        <header className="teacher-header">
          <div>
            <p className="dashboard-kicker">
              <GraduationCap size={17} strokeWidth={2.2} />
              <span>TEACHER DASHBOARD</span>
            </p>

            <h1>
              {page === 'overview' && 'Good day, Teacher'}
              {page === 'students' && 'Student Management'}
              {page === 'attention' &&
                'Students Needing Attention'}
              {page === 'analytics' &&
                'Learning Analytics'}
              {page === 'leaderboard' &&
                'Student Leaderboard'}
            </h1>

            <span>
              Monitor and guide your students through their
              CodeQuest journey.
            </span>
          </div>

          <div className="teacher-badge">
            <GraduationCap size={20} />
            <span>{user?.name || 'Teacher'}</span>
          </div>
        </header>

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
                  <span>Students Needing Attention</span>
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
                          {student.progress || 0}% progress
                          {' · '}
                          {student.struggles || 0} struggle flags
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
                  <span>Quick Class Summary</span>
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
                <span>Recent Student Activity</span>
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
                        {student.section || 'No section'}
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

        {page === 'students' && (
          <Students
            students={students}
            open={openStudent}
          />
        )}

        {page === 'attention' && (
          <Students
            students={students.filter((student) => {
              const progress =
                Number(student.progress) || 0;

              const attempts =
                Number(student.attempts) || 0;

              return (
                progress < 40 ||
                !student.last_login ||
                attempts >= 3
              );
            })}
            open={openStudent}
          />
        )}

        {page === 'analytics' && (
          <>
            <div className="teacher-panel">
              <h2 className="panel-title">
                <TrendingUp size={22} />
                <span>Learning Performance</span>
              </h2>

              {(analytics.modules || []).length > 0 ? (
                analytics.modules.map(
                  (module, index) => (
                    <div
                      className="module-row"
                      key={module.id || index}
                    >
                      <div>
                        <b>{module.title}</b>

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
                          score.type || 'Assessment'
                        ).toUpperCase()}
                      </span>
                    </h3>

                    <strong className="big-score">
                      {score.average || 0}%
                    </strong>

                    <p>
                      {score.attempts || 0} attempts recorded
                    </p>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {page === 'leaderboard' && (
          <div className="leaderboard-list">
            {leaderboard.length > 0 ? (
              leaderboard.map(
                (student, index) => (
                  <div
                    className="rank-card"
                    key={student.id || index}
                  >
                    <div className="rank">
                      {index === 0 ? (
                        <Trophy size={23} />
                      ) : (
                        <span>#{index + 1}</span>
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

      {selected && (
        <StudentModal
          data={selected}
          close={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Students({ students, open }) {
  const [search, setSearch] = useState('');

  const list = students.filter((student) => {
    const text =
      `${student.name || ''} ${student.section || ''}`
        .toLowerCase();

    return text.includes(search.toLowerCase());
  });

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
              Number(student.progress) || 0;

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
                  <b>{student.name}</b>
                </span>

                <span>
                  {student.section || '—'}
                </span>

                <span className="student-progress">
                  <Progress value={progress} />
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
            );
          })
        ) : (
          <p className="empty">
            No students found.
          </p>
        )}
      </div>
    </>
  );
}

function StudentModal({ data, close }) {
  const student = data.student || {};
  const lessons = data.lessons || [];
  const assessments = data.assessments || [];

  const getLessonIcon = (phase) => {
    if (phase === 'completed') {
      return (
        <CheckCircle2
          size={20}
          className="lesson-icon completed"
        />
      );
    }

    if (phase) {
      return (
        <PlayCircle
          size={20}
          className="lesson-icon active"
        />
      );
    }

    return (
      <Lock
        size={20}
        className="lesson-icon locked"
      />
    );
  };

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
        >
          <X size={21} />
        </button>

        <p className="student-profile-label">
          <User size={16} />
          <span>STUDENT PROFILE</span>
        </p>

        <h2>{student.name || 'Student'}</h2>

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

        <h3 className="modal-section-title">
          <BookOpen size={20} />
          <span>Lesson Activities</span>
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

                <b>{lesson.title}</b>

                <small>
                  {lesson.module || 'Lesson'}
                  {' · '}
                  Attempts:{' '}
                  {lesson.attempts || 0}
                </small>

                <em>
                  {lesson.phase || 'Not started'}
                </em>
              </div>
            ))
          ) : (
            <p className="empty">
              No lesson activity available.
            </p>
          )}
        </div>

        <h3 className="modal-section-title">
          <ClipboardList size={20} />
          <span>Assessment History</span>
        </h3>

        {assessments.length > 0 ? (
          assessments.map(
            (assessment, index) => {
              const total =
                Number(assessment.total) || 0;

              const score =
                Number(assessment.score) || 0;

              const percentage =
                total > 0
                  ? Math.round(
                      (score / total) * 100
                    )
                  : 0;

              return (
                <div
                  className="assessment-row"
                  key={
                    assessment.id || index
                  }
                >
                  <span>
                    {assessment.type ||
                      'Assessment'}
                  </span>

                  <b>
                    {score}/{total}
                  </b>

                  <strong>
                    {percentage}%
                  </strong>
                </div>
              );
            }
          )
        ) : (
          <p className="empty">
            No assessment history available.
          </p>
        )}
      </div>
    </div>
  );
}