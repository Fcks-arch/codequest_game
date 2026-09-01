import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import IslandMap from '../components/IslandMap'
import { C, Ico, Pill, XpBar } from '../components/UI'
import { completedLessonIdsWithLocalFallback, isActivityUnlocked, getIslandStatuses } from '../utils/questProgress'

const EMPTY_MODULES = []

function javaLabel(value) {
  return String(value || '').replace(/JavaScript Foundations/g, 'JAVA FOUNDATIONS').replace(/JavaScript/g, 'Java')
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [modules, setModules] = useState(EMPTY_MODULES)
  const [progress, setProgress] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const userUnlocked = user?.unlocked_module || 1

  useEffect(() => {
    Promise.all([axios.get('/api/lessons/modules'), axios.get('/api/progress')])
      .then(([moduleResponse, progressResponse]) => {
        const fetchedModules = moduleResponse.data || []
        const completedIds = completedLessonIdsWithLocalFallback(progressResponse.data || [])
        setModules(fetchedModules)
        setProgress(progressResponse.data)

        // Land on the furthest island the player has actually unlocked,
        // walked in syllabus order across every island in the chain.
        const statuses = getIslandStatuses(fetchedModules, completedIds, userUnlocked)
        let activeModuleId = fetchedModules[0]?.id ?? null
        for (const mod of fetchedModules) {
          if (!statuses.get(mod.id)?.unlocked) break
          activeModuleId = mod.id
        }
        setSelectedId(activeModuleId)
      })
      .catch(() => setError('The quest map could not be loaded. Please make sure the updated database schema has been applied.'))
      .finally(() => setLoading(false))
  }, [userUnlocked])

  const selectedModule = useMemo(
    () => modules.find(module => Number(module.id) === Number(selectedId)) || modules[0],
    [modules, selectedId]
  )
  const completedIds = useMemo(
    () => completedLessonIdsWithLocalFallback(progress),
    [progress]
  )
  const clearedCount = completedIds.size
  const islandStatuses = useMemo(
    () => getIslandStatuses(modules, completedIds, userUnlocked),
    [modules, completedIds, userUnlocked]
  )

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
          {loading ? <div className="quest-loading">Loading your islands…</div> : error ? <div className="quest-error">{error}</div> : <IslandMap modules={modules} progress={progress} selectedId={selectedId} onSelect={selectModule} unlockedOverride={userUnlocked} />}
        </section>

        {!loading && !error && selectedModule && (
          <section id="activity-panel" className="activity-panel" style={{ '--module-color': selectedModule.color }}>
            <div className="activity-panel__intro">
              <p className="section-kicker">SELECTED ISLAND</p>
              <h2>{javaLabel(selectedModule.title)}</h2>
              <p>{javaLabel(selectedModule.description) || 'Complete the activities below to unlock the next island.'}</p>
            </div>
            <div className="activity-list">
              {selectedModule.activities.length === 0 ? (
                <div className="activity-empty">This island is being prepared. Clear the earlier islands to continue your quest.</div>
              ) : selectedModule.activities.map((activity, index) => {
                const completed = completedIds.has(Number(activity.id))
                const isIslandUnlocked = islandStatuses.get(selectedModule.id)?.unlocked ?? false
                const unlocked = isIslandUnlocked && isActivityUnlocked(index, selectedModule.activities, completedIds)
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