import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, LogOut } from 'lucide-react'
import QuestNav from '../components/QuestNav'
import { useAuth } from '../context/AuthContext'

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=codequest'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser, logout } = useAuth()
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

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      await axios.put('/api/auth/profile', {
        name: form.name,
        email: form.email,
        section: form.section,
        nametag: form.nametag,
        bio: form.bio,
        avatar_url: form.avatar_url
      })
      if (refreshUser) await refreshUser()
      setMessage('Profile updated successfully!')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-page">
      <QuestNav />

      <main className="profile-page__body">
        <div className="profile-page__sidebar">
          <p className="profile-page__eyebrow">Student Profile</p>
          <div className="profile-page__account-actions">
            <button className="profile-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} aria-hidden="true" /> Back to Quest
            </button>
            <button type="button" className="profile-logout" onClick={logout}>
              <LogOut size={16} aria-hidden="true" /> Log out
            </button>
          </div>
        </div>

        <div className="profile-shell">
          {/* Summary Card */}
          <div className="profile-card profile-card--summary">
            <div className="profile-avatar-wrap">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="profile-avatar" />
              ) : (
                <div className="profile-avatar profile-avatar--fallback">{initials}</div>
              )}
              <button 
                type="button" 
                className="profile-avatar-btn" 
                onClick={handleAvatarPick}
                title="Change Avatar"
              >
                <Camera size={14} aria-hidden="true" /> Edit
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>

            <div className="profile-summary-meta">
              <p className="profile-tag">{form.nametag || 'Adventurer'}</p>
              <h2>{form.name || 'Student Name'}</h2>

              <div className="profile-summary-grid">
                <span>
                  <strong>{user?.xp || 0}</strong> XP
                </span>
                <span>
                  <strong>{user?.level || 1}</strong> Level
                </span>
                <span>
                  <strong>{user?.rank || '#--'}</strong> Rank
                </span>
              </div>
            </div>
          </div>

          {/* Form / Editor Card */}
          <div className="profile-card profile-card--editor">
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="profile-form-grid" style={{ flex: 1 }}>
                <label>
                  Full Name
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => updateField('name', e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </label>

                <label>
                  Email Address
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
                    placeholder="student@school.edu"
                    required
                  />
                </label>

                <label>
                  Section / Class
                  <input
                    type="text"
                    value={form.section}
                    onChange={e => updateField('section', e.target.value)}
                    placeholder="e.g. Section A"
                  />
                </label>

                <label>
                  Nametag / Title
                  <input
                    type="text"
                    value={form.nametag}
                    onChange={e => updateField('nametag', e.target.value)}
                    placeholder="e.g. Code Knight"
                  />
                </label>

                <label className="profile-field--full">
                  Bio / Guild Scroll
                  <textarea
                    rows={4}
                    value={form.bio}
                    onChange={e => updateField('bio', e.target.value)}
                    placeholder="Tell your realm about yourself..."
                  />
                </label>
              </div>

              {message && <div className="profile-message profile-message--success">{message}</div>}
              {error && <div className="profile-message profile-message--error">{error}</div>}

              <div className="profile-actions">
                <button type="submit" className="profile-save" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="profile-cancel"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}