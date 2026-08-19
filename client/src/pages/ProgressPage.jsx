import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import QuestScene from '../components/QuestScene'
import { Ico, XpBar } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { completedLessonIds, countTotalActivities } from '../utils/questProgress'

export default function ProgressPage() {
  const { user } = useAuth()
  const [modules, setModules] = useState([])
  const [progress, setProgress] = useState([])
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      axios.get('/api/lessons/modules'),
      axios.get('/api/progress'),
      axios.get('/api/progress/badges'),
    ])
      .then(([moduleResponse, progressResponse, badgeResponse]) => {
        setModules(moduleResponse.data)
        setProgress(progressResponse.data)
        setBadges(badgeResponse.data)
      })
      .catch(() => setError('Your chronicle could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])

  const completedIds = useMemo(() => completedLessonIds(progress), [progress])
  const totalActivities = useMemo(() => countTotalActivities(modules), [modules])
  const recentClears = useMemo(
    () => progress
      .filter(item => item.phase === 'completed' && item.completed_at)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, 6),
    [progress]
  )

  const activityTitle = id => {
    for (const module of modules) {
      const activity = module.activities.find(item => item.id === id)
      if (activity) return activity.title
    }
    return `Activity #${id}`
  }

  return (
    <QuestScene>
      <div className="quest-panel-page">
        <header className="quest-panel-page__header">
          <div>
            <p className="landing-eyebrow">Your Chronicle</p>
            <h1>My Progress</h1>
            <p className="quest-panel-page__sub">Track your journey across islands, lessons, and badges.</p>
          </div>
          <Ico n="book" s={42} c="#7ec8ff" />
        </header>

        {loading ? (
          <div className="landing-quest__message">Opening your chronicle…</div>
        ) : error ? (
          <div className="landing-quest__message landing-quest__message--error">{error}</div>
        ) : (
          <>
            <section className="progress-summary">
              <article className="progress-summary__card">
                <Ico n="bolt" s={22} c="#86efac" />
                <b>{user?.xp || 0}</b>
                <span>Total XP</span>
              </article>
              <article className="progress-summary__card">
                <Ico n="star" s={22} c="#7ec8ff" />
                <b>{user?.level || 1}</b>
                <span>Level</span>
              </article>
              <article className="progress-summary__card">
                <Ico n="flame" s={22} c="#f5d547" />
                <b>{user?.streak || 0}</b>
                <span>Day streak</span>
              </article>
              <article className="progress-summary__card">
                <Ico n="check" s={22} c="#f5d547" />
                <b>{completedIds.size}/{totalActivities || '—'}</b>
                <span>Activities cleared</span>
              </article>
            </section>

            <section className="progress-xp-panel">
              <h2>Level progress</h2>
              <XpBar xp={user?.xp || 0} />
            </section>

            <section className="progress-islands">
              <h2>Island progress</h2>
              <div className="progress-islands__list">
                {modules.map(module => {
                  const total = module.activities.length
                  const done = module.activities.filter(activity => completedIds.has(activity.id)).length
                  const pct = total ? Math.round((done / total) * 100) : 0
                  return (
                    <article key={module.id} className="progress-island-row">
                      <div className="progress-island-row__head">
                        <strong>{module.title}</strong>
                        <span>{done}/{total || 0}</span>
                      </div>
                      <div className="progress-island-row__bar">
                        <div style={{ width: `${pct}%` }} />
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="progress-badges">
              <h2>Badges earned</h2>
              {badges.length === 0 ? (
                <p className="quest-panel-page__empty">No badges yet. Clear your first activity to earn glory.</p>
              ) : (
                <div className="progress-badges__grid">
                  {badges.map(badge => (
                    <article key={badge.badge_key} className="progress-badge-card">
                      <Ico n="medal" s={24} c="#f5d547" />
                      <strong>{badge.label}</strong>
                      <span>{badge.description}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="progress-recent">
              <h2>Recent clears</h2>
              {recentClears.length === 0 ? (
                <p className="quest-panel-page__empty">No activities cleared yet.</p>
              ) : (
                <ul className="progress-recent__list">
                  {recentClears.map(item => (
                    <li key={item.id}>
                      <Ico n="check" s={16} c="#86efac" />
                      <span>{activityTitle(item.lesson_id)}</span>
                      <em>{new Date(item.completed_at).toLocaleDateString()}</em>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </QuestScene>
  )
}
