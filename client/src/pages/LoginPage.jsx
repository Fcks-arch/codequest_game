import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Ico } from '../components/UI';

export default function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth();

  const navigate = useNavigate();

  const [mode, setMode] = useState('login');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    section: '',
    role: 'student',
    teacherCode: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [attemptsRemaining, setAttemptsRemaining] = useState(6);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
    useEffect(() => {
  if (lockoutSeconds <= 0) return;

  const timer = setInterval(() => {
    setLockoutSeconds((seconds) => Math.max(0, seconds - 1));
  }, 1000);

  return () => clearInterval(timer);
}, [lockoutSeconds]);

  const handle = async () => {
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await login(form.email, form.password);

        navigate(user.role === 'instructor' ? '/teacher' : '/island/1');
      } else {
        const user = await register(
          form.name,
          form.email,
          form.password,
          form.section,
          form.role,
          form.teacherCode
        );

        navigate(user.role === 'instructor' ? '/teacher' : '/');
      }
    }  catch (err) {
  const status = err.response?.status;
  const data = err.response?.data;

  if (mode === 'login') {
    if (status === 429) {
      // Backend says the login limit has been reached.
      setAttemptsRemaining(0);

      const retryAfter = Number(
        data?.retryAfterSeconds ??
        err.response?.headers?.['retry-after'] ??
        60
      );

      setLockoutSeconds(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter
          : 60
      );
    } else if (status === 401) {
      // Incorrect email or password.
      setAttemptsRemaining((remaining) =>
        Math.max(0, remaining - 1)
      );
    }
  }

  setError(data?.message || 'Something went wrong.');
} finally {
  setLoading(false);
}

  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const user = await loginWithGoogle(
        credentialResponse.credential
      );

      navigate(user.role === 'instructor' ? '/teacher' : user.newAccount ? '/island/1' : '/');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Google sign-in failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setAttemptsRemaining(6);
    setLockoutSeconds(0);
    setError('');
    setForm({
      name: '',
      email: '',
      password: '',
      section: '',
      role: 'student',
      teacherCode: ''
      
    });
  };

  return (
    <main className="landing-page">

      <div className="landing-scene" aria-hidden="true">
        <img
          className="landing-scene__bg"
          src="/assets/background.png"
          alt=""
        />
        <div className="landing-scene__veil" />
      </div>

      <nav className="landing-nav">
        <Link to="/" className="brand brand--medieval">
          <span className="brand__shield" aria-hidden="true">
            ⚔
          </span>
          CodeQuest
        </Link>

        <Link to="/" className="landing-login">
          Back to the realm
        </Link>
      </nav>

      <div className="login-shell">
        <div className="login-card">

          <p className="login-eyebrow">
            Enter the gate
          </p>

          <h2 className="login-title">
            {mode === 'login'
              ? 'Welcome back, knight'
              : 'Join the quest'}
          </h2>

          <div className="google-signin-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() =>
                setError('Google sign-in was unsuccessful.')
              }
              width="308"
            />
          </div>

          <div className="login-divider">
            <div className="line" />
            <span>or</span>
            <div className="line" />
          </div>

          {/* SIGNUP ONLY */}
          {mode === 'register' && (
            <>
              <label>Choose your account type</label>

              <div className="account-type-buttons">

                {/* STUDENT BUTTON */}
                <button
                  type="button"
                  className={`account-type-btn ${
                    form.role === 'student' ? 'active' : ''
                  }`}
                  onClick={() =>
                    setForm({
                      ...form,
                      role: 'student',
                      teacherCode: ''
                    })
                  }
                >
                  <span className="account-type-icon">
                    <Ico n="user" s={22} />
                  </span>

                  <span className="account-type-text">
                    <strong>Student</strong>
                    <small>Join as an adventurer</small>
                  </span>
                </button>

                {/* TEACHER BUTTON */}
                <button
                  type="button"
                  className={`account-type-btn ${
                    form.role === 'instructor'
                      ? 'active teacher-active'
                      : ''
                  }`}
                  onClick={() =>
                    setForm({
                      ...form,
                      role: 'instructor'
                    })
                  }
                >
                  <span className="account-type-icon">
                    <Ico n="graduationCap" s={22} />
                  </span>

                  <span className="account-type-text">
                    <strong>Teacher</strong>
                    <small>Quest Master</small>
                  </span>
                </button>

              </div>

              <label>Full name</label>

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value
                  })
                }
                placeholder="Maria Santos"
              />

              <label>Section</label>

              <input
                value={form.section}
                onChange={(e) =>
                  setForm({
                    ...form,
                    section: e.target.value
                  })
                }
                placeholder="BSIT 1-A"
              />

              {/* TEACHER CODE ONLY FOR TEACHERS */}
              {form.role === 'instructor' && (
                <>
                  <label>Private teacher code</label>

                  <input
                    value={form.teacherCode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        teacherCode: e.target.value
                      })
                    }
                    type="password"
                    placeholder="Enter teacher code"
                  />
                </>
              )}
            </>
          )}

          <label>Email</label>

          <input
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value
              })
            }
            type="email"
            placeholder="maria@ispsc.edu.ph"
          />

          <label>Password</label>

          <div className="login-password-wrap">

            <input
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value
                })
              }
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
            />

            <button
              type="button"
              className="login-eye-toggle"
              onClick={() =>
                setShowPassword((v) => !v)
              }
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
            >
              <Ico
                n={showPassword ? 'eyeOff' : 'eye'}
                s={17}
              />
            </button>

          </div>

          {mode === 'login' && (
            <p
              style={{
                textAlign: 'right',
                margin: '8px 0 0'
              }}
            >
              <Link
                to="/forgot-password"
                style={{
                  fontSize: 12,
                  color: '#2b5aab',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                Forgot password?
              </Link>
            </p>
          )}

          
{mode === 'login' && (
  <div
    style={{
      marginTop: 12,
      marginBottom: 12,
      fontSize: 13,
      color: lockoutSeconds > 0 ? '#b42318' : '#555',
      textAlign: 'center'
    }}
    aria-live="polite"
  >
    {lockoutSeconds > 0 ? (
      <strong>
        Login temporarily locked. Try again in{' '}
        {String(Math.floor(lockoutSeconds / 60)).padStart(2, '0')}:
        {String(lockoutSeconds % 60).padStart(2, '0')}
      </strong>
    ) : (
      <span>
        Failed login attempts remaining: {attemptsRemaining} of 6
      </span>
    )}
  </div>
)}

{error && (
  <div className="login-error" role="alert">
    {error}
  </div>
)}


          <button
  className="login-submit"
  onClick={handle}
  disabled={loading || (mode === 'login' && lockoutSeconds > 0)}
>
            {loading
              ? 'Please wait…'
              : mode === 'login'
                ? 'Log in'
                : 'Create account'}
          </button>

          <p className="login-foot">
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}

            <button onClick={switchMode}>
              {mode === 'login'
                ? 'Sign up'
                : 'Log in'}
            </button>
          </p>

        </div>
      </div>

    </main>
  );
}