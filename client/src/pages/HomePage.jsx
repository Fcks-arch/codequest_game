import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import QuestNav from '../components/QuestNav'
import { Ico } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { completedLessonIds, countTotalActivities, findNextActivity } from '../utils/questProgress'

const EMPTY_MODULES = []

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [modules, setModules] = useState(EMPTY_MODULES)
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(!!user)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([axios.get('/api/lessons/modules'), axios.get('/api/progress')])
      .then(([moduleResponse, progressResponse]) => {
        setModules(moduleResponse.data)
        setProgress(progressResponse.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const completedIds = useMemo(() => completedLessonIds(progress), [progress])
  const totalActivities = useMemo(() => countTotalActivities(modules), [modules])

  const beginQuest = useCallback(() => {
    navigate('/quest')
  }, [navigate])

  useEffect(() => {
    const start = event => {
      if (event.key !== 'Enter') return
      if (user) beginQuest()
      else navigate('/login')
    }
    window.addEventListener('keydown', start)
    return () => window.removeEventListener('keydown', start)
  }, [beginQuest, navigate, user])

  if (user) {
    return (
      <main className="landing-page">
        <div className="landing-scene" aria-hidden="true">
          <img className="landing-scene__bg" src="/assets/background.png" alt="" />
          <div className="landing-scene__veil" />
        </div>

        <QuestNav />

        <section className="landing-hero">
          <div className="landing-pip" role="img" aria-label="Pip the knight" />

          <p className="landing-eyebrow">Welcome back, {user.name?.split(' ')[0] || 'knight'}</p>
          <h1>Learn JavaScript.<br /><em>Conquer the Realm.</em></h1>
          <p className="landing-copy">
            {user.section || 'BSIT'} · Level {user.level || 1} · {completedIds.size} of {totalActivities || '—'} activities cleared.
            Pick up where you left off and guide Pip with real JavaScript.
          </p>
          <button type="button" className="landing-cta" onClick={beginQuest} disabled={loading}>
            <Ico n="play" s={18} c="#2b1a0e" />
            {loading ? 'Preparing your quest…' : 'Begin Your Quest'}
          </button>
          <p className="landing-hint">Press Enter to continue your quest</p>
        </section>

        <section className="landing-steps">
          <article className="landing-scroll">
            <b>I</b>
            <h2>Choose an island</h2>
            <p>Each island holds a lesson in your syllabus — chart your course across the map.</p>
          </article>
          <article className="landing-scroll">
            <b>II</b>
            <h2>Clear the trials</h2>
            <p>Every island holds playable coding activities and challenges to overcome.</p>
          </article>
          <article className="landing-scroll">
            <b>III</b>
            <h2>Earn your glory</h2>
            <p>Gain XP, unlock the next realm, and watch Pip reach the castle flag.</p>
          </article>
        </section>

        <footer className="landing-footer">
          <span>ISPSC Tagudin · BSIT</span>
        </footer>
      </main>
    )
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
        <Link to="/login" className="landing-login">Enter the Gate</Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-pip" role="img" aria-label="Pip the knight" />

        <p className="landing-eyebrow">A Knight&apos;s Quest in Code</p>
        <h1>Learn JavaScript.<br /><em>Conquer the Realm.</em></h1>
        <p className="landing-copy">
          CodeQuest turns programming lessons into a grand adventure — explore islands,
          clear coding challenges, and guide Pip the knight with real JavaScript.
        </p>
        <Link to="/login" className="landing-cta">
          <Ico n="play" s={18} c="#2b1a0e" />
          Begin Your Quest
        </Link>
        <p className="landing-hint">Press Enter to start</p>
      </section>

      <section className="landing-steps">
        <article className="landing-scroll">
          <b>I</b>
          <h2>Choose an island</h2>
          <p>Each island holds a lesson in your syllabus — chart your course across the map.</p>
        </article>
        <article className="landing-scroll">
          <b>II</b>
          <h2>Clear the trials</h2>
          <p>Every island holds playable coding activities and challenges to overcome.</p>
        </article>
        <article className="landing-scroll">
          <b>III</b>
          <h2>Earn your glory</h2>
          <p>Gain XP, unlock the next realm, and watch Pip reach the castle flag.</p>
        </article>
      </section>

      <footer className="landing-footer">
        <span>ISPSC Tagudin · BSIT</span>
      </footer>
    </main>
  )
}
