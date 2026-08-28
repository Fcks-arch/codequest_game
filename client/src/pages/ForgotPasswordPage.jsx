import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLink, setResetLink] = useState('')
  const [message, setMessage] = useState('')

  const handle = async () => {
    setError(''); setMessage(''); setResetLink(''); setLoading(true)
    try {
      const res = await axios.post('/api/auth/forgot-password', { email })
      setMessage(res.data.message || 'If that email is registered, a reset link has been created.')
      if (res.data.resetLink) setResetLink(res.data.resetLink)
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
          <p className="login-eyebrow">Lost your key</p>
          <h2 className="login-title">Recover your password</h2>

          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="maria@ispsc.edu.ph" />

          {error && <div className="login-error">{error}</div>}

          {message && !error && (
            <div className="login-error" style={{ background:'rgba(34,197,94,.12)', color:'#15803d', borderColor:'rgba(34,197,94,.3)' }}>
              {message}
            </div>
          )}

          {resetLink && (
            <div className="login-error" style={{ background:'rgba(43,90,171,.1)', color:'#1e3f7a', borderColor:'rgba(43,90,171,.3)', wordBreak:'break-all' }}>
              No email is set up yet, so here's your link directly:<br />
              <Link to={resetLink.replace(window.location.origin, '')}>{resetLink}</Link>
            </div>
          )}

          <button className="login-submit" onClick={handle} disabled={loading || !email}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <p className="login-foot">
            Remembered it? <Link to="/login" style={{ color:'#2b5aab', fontWeight:600, textDecoration:'none' }}>Log in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
