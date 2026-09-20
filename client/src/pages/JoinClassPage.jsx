import React, { useEffect, useState } from 'react';
import axios from 'axios';

import {
  UsersRound,
  Plus,
  LogOut
} from 'lucide-react';
import QuestNav from '../components/QuestNav'
export default function JoinClassPage() {

  const [classCode, setClassCode] = useState('');
  const [classes, setClasses] = useState([]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadClasses = async () => {
    try {
      const { data } =
        await axios.get('/api/classes');

      setClasses(data);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not load your classes.'
      );
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const joinClass = async e => {
    e.preventDefault();

    if (!classCode.trim()) {
      setError('Enter your teacher\'s class code.');
      return;
    }

    try {
      const { data } =
        await axios.post(
          '/api/classes/join',
          {
            class_code:
              classCode.trim().toUpperCase()
          }
        );

      setMessage(
        `Joined ${data.class.class_name} successfully.`
      );

      setClassCode('');

      loadClasses();

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not join class.'
      );
    }
  };


  const leaveClass = async id => {

    if (
      !window.confirm(
        'Leave this class?'
      )
    ) return;

    try {

      await axios.delete(
        `/api/classes/${id}/leave`
      );

      setClasses(prev =>
        prev.filter(cls =>
          cls.id !== id
        )
      );

      setMessage(
        'You left the class.'
      );

    } catch (err) {

      setError(
        err.response?.data?.message ||
        'Could not leave class.'
      );

    }
  };


  return (
    <div className="student-classes-page">

      <QuestNav />

      <div className="student-class-hero">

        <div>
          <span className="w3-kicker">
            MY CLASSES
          </span>

          <h1>
            Join your teacher's class
          </h1>

          <p>
            Enter the class code provided by
            your teacher to access your section's
            quizzes and learning activities.
          </p>
        </div>

        <UsersRound size={42} />

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


      <form
        className="join-class-card"
        onSubmit={joinClass}
      >

        <label>
          Class code
        </label>

        <div className="join-code-row">

          <input
            value={classCode}
            onChange={e =>
              setClassCode(
                e.target.value.toUpperCase()
              )
            }
            placeholder="KQ-91D7BC"
            maxLength={9}
          />

          <button
            type="submit"
            className="quiz-publish-btn"
          >
            <Plus size={18} />
            Join class
          </button>

        </div>

      </form>


      <section className="student-my-classes">

        <h2>
          My Classes
        </h2>

        {classes.length === 0 ? (

          <div className="class-empty">
            You have not joined a class yet.
          </div>

        ) : (

          <div className="student-class-grid">

            {classes.map(cls => (

              <div
                className="student-class-card"
                key={cls.id}
              >

                <UsersRound size={24} />

                <h3>
                  {cls.class_name}
                </h3>

                <p>
                  {cls.section || 'No section'}
                </p>

                <span>
                  Teacher: {cls.teacher_name}
                </span>

                <strong>
                  {cls.class_code}
                </strong>

                <button
                  className="class-leave-btn"
                  onClick={() =>
                    leaveClass(cls.id)
                  }
                >
                  <LogOut size={15} />
                  Leave class
                </button>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}