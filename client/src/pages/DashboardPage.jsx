import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import IslandMap from '../components/IslandMap'
import { C, Ico, Pill, XpBar } from '../components/UI'

const EMPTY_MODULES = []

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [modules, setModules] = useState(EMPTY_MODULES)
  const [progress, setProgress] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([axios.get('/api/lessons/modules'), axios.get('/api/progress')])
      .then(([moduleResponse, progressResponse]) => {
        setModules(moduleResponse.data)
        setProgress(progressResponse.data)
        const firstPlayable = moduleResponse.data.find(module => module.activities.length > 0)
        setSelectedId(firstPlayable?.id || moduleResponse.data[0]?.id || null)
      })
      .catch(() => setError('The quest map could not be loaded. Please make sure the updated database schema has been applied.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedModule = useMemo(
    () => modules.find(module => module.id === selectedId) || modules[0],
    [modules, selectedId]
  )
  const completedIds = useMemo(
    () => new Set(progress.filter(item => item.phase === 'completed').map(item => item.lesson_id)),
    [progress]
  )
  const clearedCount = completedIds.size

  const selectModule = module => {
    setSelectedId(module.id)
    navigate(`/island/${module.id}`)
  }

  return (
    <div className="quest-dashboard">
      <header className="quest-header">
        <button type="button" className="brand brand--button" onClick={() => navigate('/')}><span>{'</>'}</span> CodeQuest</button>
        <div className="quest-header__stats">
          <Pill bg={C.amberLight} col={C.amberDark}><Ico n="flame" s={13} c={C.amberDark} /> {user?.streak || 0} day streak</Pill>
          <Pill bg={C.purpleLight} col={C.purpleDark}><Ico n="star" s={13} c={C.purpleDark} /> Level {user?.level || 1}</Pill>
          <Pill bg={C.emeraldLight} col={C.emeraldDark}><Ico n="bolt" s={13} c={C.emeraldDark} /> {user?.xp || 0} XP</Pill>
          <button type="button" className="logout-button" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="quest-dashboard__content">
        <section className="quest-welcome">
          <div>
            <p>Welcome back, explorer</p>
            <h1>{user?.name || 'Adventurer'}</h1>
            <span>{user?.section || 'BSIT'} · Pick an island, then clear its activities.</span>
          </div>
          <div className="quest-progress">
            <b>{clearedCount}</b><span>activities cleared</span>
            <XpBar xp={user?.xp || 0} />
          </div>
        </section>

        <section className="quest-section">
          <div className="quest-section__heading">
            <div><p className="section-kicker">YOUR SYLLABUS</p><h2>Quest map</h2></div>
            <span>Islands are lessons · activities are levels</span>
          </div>
          {loading ? <div className="quest-loading">Loading your islands…</div> : error ? <div className="quest-error">{error}</div> : <IslandMap modules={modules} progress={progress} selectedId={selectedId} onSelect={selectModule} />}
        </section>

        {!loading && !error && selectedModule && (
          <section id="activity-panel" className="activity-panel" style={{ '--module-color': selectedModule.color }}>
            <div className="activity-panel__intro">
              <p className="section-kicker">SELECTED ISLAND</p>
              <h2>{selectedModule.title}</h2>
              <p>{selectedModule.description || 'Complete the activities below to unlock the next island.'}</p>
            </div>
            <div className="activity-list">
              {selectedModule.activities.length === 0 ? (
                <div className="activity-empty">This island is being prepared. Clear the earlier islands to continue your quest.</div>
              ) : selectedModule.activities.map((activity, index) => {
                const completed = completedIds.has(activity.id)
                const previousActivity = selectedModule.activities[index - 1]
                const unlocked = index === 0 || completedIds.has(previousActivity.id)
                return (
                  <button
                    type="button"
                    key={activity.id}
                    className={`activity-card ${completed ? 'activity-card--complete' : ''}`}
                    disabled={!unlocked}
                    onClick={() => navigate(`/lesson/${activity.id}`)}
                  >
                    <span className="activity-card__number">{completed ? <Ico n="check" s={17} c="#fff" /> : unlocked ? index + 1 : <Ico n="lock" s={15} c="#64748B" />}</span>
                    <span className="activity-card__copy"><small>{activity.level_label || `Activity ${index + 1}`}</small><strong>{activity.title}</strong><em>{completed ? 'Cleared' : unlocked ? 'Ready to play' : 'Complete the previous activity first'}</em></span>
                    <Pill bg={C.amberLight} col={C.amberDark}>+{activity.xp_reward} XP</Pill>
                    <Ico n="chevRight" s={18} c={unlocked ? C.onyx400 : C.onyx100} />
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
