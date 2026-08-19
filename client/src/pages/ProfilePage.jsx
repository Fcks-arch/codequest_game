import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import QuestNav from '../components/QuestNav'
import { useAuth } from '../context/AuthContext'
import { Ico } from '../components/UI'

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=codequest'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    section: '',
    nametag: '',
    bio: '',
    avatar_url: DEFAULT_AVATAR
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      email: user.email || '',
      section: user.section || '',
      nametag: user.nametag || '',
      bio: user.bio || '',
      avatar_url: user.avatar_url || DEFAULT_AVATAR
    })
  }, [user])

  const initials = useMemo(() => {
    const source = form.name || user?.name || 'Student'
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || 'S'
  }, [form.name, user])

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleAvatarPick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async event => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : DEFAULT_AVATAR
      updateField('avatar_url', result)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const res = await axios.put('/api/auth/profile', {
        name: form.name,
        email: form.email,
        section: form.section,
        nametag: form.nametag,
        bio: form.bio,
        avatar_url: form.avatar_url
      })

      await refreshUser()
      setMessage(res.data.message || 'Profile updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while updating your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <main className="quest-panel-page">
        <QuestNav />
        <div className="landing-quest__message" style={{ marginTop: 24 }}>Loading your student profile…</div>
      </main>
    )
  }

  return (
    <main className="quest-panel-page profile-page">
      <QuestNav />

      <section className="profile-page__body">
        <div className="profile-page__sidebar">
          <p className="profile-page__eyebrow">Student profile</p>
          <button type="button" className="profile-back" onClick={() => navigate('/quest')}>
            <Ico n="arrowLeft" s={15} c="#2b1a0e" />
            Back to quest
          </button>
        </div>

        <section className="profile-shell">
          <div className="profile-card profile-card--summary">
            <div className="profile-avatar-wrap">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Profile avatar" className="profile-avatar" />
              ) : (
                <div className="profile-avatar profile-avatar--fallback">{initials}</div>
              )}
              <button type="button" className="profile-avatar-btn" onClick={handleAvatarPick}>
                <Ico n="camera" s={14} c="#fff" />
                Change photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} hidden />
            </div>

            <div className="profile-summary-meta">
              <p className="profile-tag">{form.nametag || 'Student Adventurer'}</p>
              <h2>{form.name || 'Learner'}</h2>
              <div className="profile-summary-grid">
                <span><strong>{user.level || 1}</strong> Level</span>
                <span><strong>{user.xp || 0}</strong> XP</span>
                <span><strong>{user.streak || 0}</strong> Streak</span>
              </div>
            </div>
          </div>

          <div className="profile-card profile-card--editor">
            <div className="profile-form-grid">
              <label>
                <span>Full name</span>
                <input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Carl" />
              </label>

              <label>
                <span>Email</span>
                <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="carliben@gmail.com" />
              </label>

              <label>
                <span>Section</span>
                <input value={form.section} onChange={e => updateField('section', e.target.value)} placeholder="BSIT 1A" />
              </label>

              <label>
                <span>Nametag</span>
                <input value={form.nametag} onChange={e => updateField('nametag', e.target.value)} maxLength={60} placeholder="Code Slayer" />
              </label>

              <label className="profile-field--full">
                <span>Bio</span>
                <textarea rows={4} value={form.bio} onChange={e => updateField('bio', e.target.value)} placeholder="Tell other students about your coding journey..." />
              </label>
            </div>

            <div className="profile-actions">
              <button type="button" className="profile-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save profile'}
              </button>
              <button type="button" className="profile-cancel" onClick={() => navigate('/quest')}>
                Cancel
              </button>
            </div>

            {message && <div className="profile-message profile-message--success">{message}</div>}
            {error && <div className="profile-message profile-message--error">{error}</div>}
          </div>
        </section>
      </section>
    </main>
  )
}
