import React, { useEffect, useState } from 'react';
import axios from 'axios';

import {
  Plus,
  Copy,
  Users,
  GraduationCap,
  X
} from 'lucide-react';

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState([]);

  const [showCreate, setShowCreate] = useState(false);

  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');

  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadClasses = async () => {
    try {
      const { data } = await axios.get('/api/teacher/classes');
      setClasses(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not load classes.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const createClass = async e => {
    e.preventDefault();

    if (!className.trim()) {
      setError('Enter a class name.');
      return;
    }

    try {
      const { data } = await axios.post(
        '/api/teacher/classes',
        {
          class_name: className,
          section
        }
      );

      setClasses(prev => [data, ...prev]);

      setClassName('');
      setSection('');

      setShowCreate(false);

      setMessage(
        `Class created. Code: ${data.class_code}`
      );

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not create class.'
      );
    }
  };

  const copyCode = async code => {
    await navigator.clipboard.writeText(code);

    setMessage(
      `Class code ${code} copied.`
    );
  };

  const openClass = async cls => {
    try {
      const { data } = await axios.get(
        `/api/teacher/classes/${cls.id}/students`
      );

      setSelectedClass(cls);
      setStudents(data);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not load students.'
      );
    }
  };

  return (
    <div className="teacher-classes-page">

      <div className="teacher-page-heading">
        <div>
          <span className="quiz-maker-kicker">
            CLASS MANAGEMENT
          </span>

          <h2>My Classes</h2>

          <p>
            Create classes and give students a unique
            CodeQuest class code.
          </p>
        </div>

        <button
          className="quiz-publish-btn"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={18} />
          Create class
        </button>
      </div>


      {message && (
        <div className="quiz-alert success">
          {message}
        </div>
      )}

      {error && (
        <div className="quiz-alert error">
          {error}
        </div>
      )}


      {loading ? (
        <div className="class-empty">
          Loading classes...
        </div>
      ) : classes.length === 0 ? (
        <div className="class-empty">
          <GraduationCap size={40} />

          <h3>No classes yet</h3>

          <p>
            Create your first class to start
            separating your students by section.
          </p>
        </div>
      ) : (

        <div className="teacher-class-grid">

          {classes.map(cls => (
            <div
              className="teacher-class-card"
              key={cls.id}
            >

              <div className="teacher-class-icon">
                <GraduationCap size={25} />
              </div>

              <h3>
                {cls.class_name}
              </h3>

              {cls.section && (
                <span className="teacher-class-section">
                  Section {cls.section}
                </span>
              )}

              <div className="class-code-box">
                <small>CLASS CODE</small>

                <strong>
                  {cls.class_code}
                </strong>

                <button
                  onClick={() =>
                    copyCode(cls.class_code)
                  }
                  title="Copy class code"
                >
                  <Copy size={17} />
                </button>
              </div>

              <div className="teacher-class-footer">

                <span>
                  <Users size={16} />
                  {cls.student_count || 0} students
                </span>

                <button
                  className="class-view-btn"
                  onClick={() =>
                    openClass(cls)
                  }
                >
                  View class
                </button>

              </div>

            </div>
          ))}

        </div>
      )}


      {showCreate && (
        <div className="teacher-modal-backdrop">

          <div className="teacher-modal">

            <button
              className="modal-close"
              onClick={() =>
                setShowCreate(false)
              }
            >
              <X size={20} />
            </button>

            <h2>Create a class</h2>

            <p>
              Students will use the generated
              class code to join.
            </p>

            <form onSubmit={createClass}>

              <label>
                Class name
              </label>

              <input
                value={className}
                onChange={e =>
                  setClassName(e.target.value)
                }
                placeholder="e.g. Programming 1"
              />

              <label>
                Section
              </label>

              <input
                value={section}
                onChange={e =>
                  setSection(e.target.value)
                }
                placeholder="e.g. BSIT 4B"
              />

              <button
                className="quiz-publish-btn"
                type="submit"
              >
                Create class
              </button>

            </form>

          </div>

        </div>
      )}


      {selectedClass && (
        <div className="teacher-modal-backdrop">

          <div className="teacher-modal teacher-modal-large">

            <button
              className="modal-close"
              onClick={() =>
                setSelectedClass(null)
              }
            >
              <X size={20} />
            </button>

            <span className="quiz-maker-kicker">
              {selectedClass.class_code}
            </span>

            <h2>
              {selectedClass.class_name}
            </h2>

            <p>
              {students.length} students enrolled
            </p>

            <div className="student-class-list">

              {students.length === 0 ? (
                <div className="class-empty">
                  No students have joined yet.
                </div>
              ) : (

                students.map(student => (
                  <div
                    className="class-student-row"
                    key={student.id}
                  >

                    <div>
                      <strong>
                        {student.name}
                      </strong>

                      <span>
                        {student.email}
                      </span>
                    </div>

                    <span>
                      Level {student.level || 1}
                    </span>

                  </div>
                ))

              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}