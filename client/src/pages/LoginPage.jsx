import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { Ico } from '../components/UI'

export default function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode]       = useState('login') // login | register
  const [form, setForm]       = useState({ name:'', email:'', password:'', section:'' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handle = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'login') {
        const user = await login(form.email, form.password)
        navigate(user.role === 'instructor' ? '/' : '/')
      } else {
        await register(form.name, form.email, form.password, form.section)
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(''); setLoading(true)
    try {
      const user = await loginWithGoogle(credentialResponse.credential)
      navigate(user.role === 'instructor' ? '/' : '/')
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="landing-page">
      <div className="landing-scene" aria-hidden="true">
        <img className="landing-scene__bg" src="/assets/background.png" alt="" />
        <div className="landing-scene__veil" />
      </div>

      <nav className="landing-nav">
        <Link to="/" className="brand brand--medieval">
          <span className="brand__shield" aria-hidden="true">⚔</span>
          CodeQuest
        </Link>
        <Link to="/" className="landing-login">Back to the realm</Link>
      </nav>

      <div className="login-shell">
        <div className="login-card">
          <p className="login-eyebrow">Enter the gate</p>
          <h2 className="login-title">
            {mode === 'login' ? 'Welcome back, knight' : 'Join the quest'}
          </h2>

          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in was unsuccessful.')}
            width="308"
          />

          <div className="login-divider">
            <div className="line" /><span>or</span><div className="line" />
          </div>

          {mode === 'register' && (
            <>
              <label>Full name</label>
              <input value={form.name} onChange={e => setForm({...form, name:e.target.value})}
                placeholder="Maria Santos" />
              <label>Section</label>
              <input value={form.section} onChange={e => setForm({...form, section:e.target.value})}
                placeholder="BSIT 1-A" />
            </>
          )}

          <label>Email</label>
          <input value={form.email} onChange={e => setForm({...form, email:e.target.value})}
            type="email" placeholder="maria@ispsc.edu.ph" />

          <label>Password</label>
          <div className="login-password-wrap">
            <input value={form.password} onChange={e => setForm({...form, password:e.target.value})}
              type={showPassword ? 'text' : 'password'} placeholder="••••••••" />
            <button type="button" className="login-eye-toggle"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <Ico n={showPassword ? 'eyeOff' : 'eye'} s={17} />
            </button>
          </div>

          {mode === 'login' && (
            <p style={{ textAlign:'right', margin:'8px 0 0' }}>
              <Link to="/forgot-password" style={{ fontSize:12, color:'#2b5aab', fontWeight:600, textDecoration:'none' }}>
                Forgot password?
              </Link>
            </p>
          )}

          {error && <div className="login-error">{error}</div>}

          <button className="login-submit" onClick={handle} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          <p className="login-foot">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
