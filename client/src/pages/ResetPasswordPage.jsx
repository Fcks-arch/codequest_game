import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Ico } from '../components/UI'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handle = async () => {
    setError('')
    if (!token) return setError('This reset link is missing its token.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    setLoading(true)
    try {
      await axios.post('/api/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
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
        <Link to="/login" className="landing-login">Back to login</Link>
      </nav>

      <div className="login-shell">
        <div className="login-card">
          <p className="login-eyebrow">Forge a new key</p>
          <h2 className="login-title">Set a new password</h2>

          {done ? (
            <div className="login-error" style={{ background:'rgba(34,197,94,.12)', color:'#15803d', borderColor:'rgba(34,197,94,.3)' }}>
              Password updated. Taking you to login…
            </div>
          ) : (
            <>
              <label>New password</label>
              <div className="login-password-wrap">
                <input value={password} onChange={e => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••" />
                <button type="button" className="login-eye-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <Ico n={showPassword ? 'eyeOff' : 'eye'} s={17} />
                </button>
              </div>

              <label>Confirm password</label>
              <div className="login-password-wrap">
                <input value={confirm} onChange={e => setConfirm(e.target.value)}
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••" />
                <button type="button" className="login-eye-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <Ico n={showPassword ? 'eyeOff' : 'eye'} s={17} />
                </button>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button className="login-submit" onClick={handle} disabled={loading}>
                {loading ? 'Saving…' : 'Reset password'}
              </button>
            </>
          )}

          <p className="login-foot">
            <Link to="/login" style={{ color:'#2b5aab', fontWeight:600, textDecoration:'none' }}>Back to login</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
