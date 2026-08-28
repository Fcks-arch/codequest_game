
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import QuestScene from '../components/QuestScene'
import IslandMap from '../components/IslandMap'
import { Ico, Pill, XpBar } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { completedLessonIdsWithLocalFallback, isActivityUnlocked } from '../utils/questProgress'

const EMPTY_MODULES = []

export default function QuestPage() {
  const { user } = useAuth()
  const { islandId } = useParams() // Capture URL params like /island/2
  const navigate = useNavigate()
  const [modules, setModules] = useState(EMPTY_MODULES)
  const [progress, setProgress] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Helper to check if a module/island is completely cleared
  const isModuleCleared = (mod, completedIds) => {
    if (!mod || !mod.activities || mod.activities.length === 0) return false
    return mod.activities.every(act => completedIds.has(Number(act.id)))
  }

  useEffect(() => {
    Promise.all([axios.get('/api/lessons/modules'), axios.get('/api/progress')])
      .then(([moduleResponse, progressResponse]) => {
        const fetchedModules = moduleResponse.data || []
        const fetchedProgress = progressResponse.data || []
        const completedIds = completedLessonIdsWithLocalFallback(fetchedProgress)

        setModules(fetchedModules)
        setProgress(fetchedProgress)

        // 1. If URL specifies an islandId (e.g. /island/3), select it
        if (islandId) {
          setSelectedId(Number(islandId))
          return
        }

        // 2. Automatically find the highest unlocked or active island
        const userUnlocked = user?.unlocked_module || 1
        let activeModuleId = 1

        for (let i = 0; i < fetchedModules.length; i++) {
          const mod = fetchedModules[i]
          const prevMod = fetchedModules[i - 1]

          const prevCleared = !prevMod || isModuleCleared(prevMod, completedIds)
          const isUnlocked = mod.id === 1 || userUnlocked >= mod.id || prevCleared

          if (isUnlocked) {
            activeModuleId = mod.id
          } else {
            // Stop at the first locked module
            break
          }
        }

        setSelectedId(activeModuleId)
      })
      .catch(() => setError('The quest map could not be loaded. Please make sure the database is connected.'))
      .finally(() => setLoading(false))
  }, [islandId, user?.unlocked_module])

  const selectedModule = useMemo(
    () => modules.find(module => module.id === selectedId) || modules[0],
    [modules, selectedId]
  )

  const completedIds = useMemo(() => completedLessonIdsWithLocalFallback(progress), [progress])
  const clearedCount = completedIds.size

  const selectModule = module => {
    setSelectedId(module.id)
    navigate(`/island/${module.id}`)
  }

  return (
    <QuestScene>
      <div className="landing-quest">
        <section className="landing-quest__welcome">
          <div>
            <p className="landing-eyebrow">Welcome back, knight</p>
            <h1>{user?.name || 'Adventurer'}</h1>
            <span>{user?.section || 'BSIT'} · Pick an island, then clear its activities.</span>
          </div>
          <div className="landing-quest__progress">
            <b>{clearedCount}</b><span>activities cleared</span>
            <XpBar xp={user?.xp || 0} />
          </div>
        </section>

        <section className="landing-quest__section">
          <div className="landing-quest__heading">
            <div>
              <p className="landing-eyebrow">Your syllabus</p>
              <h2>Quest map</h2>
            </div>
            <span>Islands are lessons · activities are levels</span>
          </div>
          {loading ? (
            <div className="landing-quest__message">Loading your islands…</div>
          ) : error ? (
            <div className="landing-quest__message landing-quest__message--error">{error}</div>
          ) : (
            <IslandMap modules={modules} progress={progress} selectedId={selectedId} onSelect={selectModule} />
          )}
        </section>

        {!loading && !error && selectedModule && (
          <section className="landing-activity-panel" style={{ '--module-color': selectedModule.color }}>
            <div className="landing-activity-panel__intro">
              <p className="landing-eyebrow">Selected island</p>
              <h2>{selectedModule.title}</h2>
              <p>{selectedModule.description || 'Complete the activities below to unlock the next island.'}</p>
            </div>
            <div className="landing-activity-list">
              {selectedModule.activities.length === 0 ? (
                <div className="landing-quest__message">
                  This island is being prepared. Clear earlier islands to continue your quest.
                </div>
              ) : selectedModule.activities.map((activity, index) => {
                const completed = completedIds.has(Number(activity.id))
                
                // Allow activity to unlock if:
                // - Island 1 (mod.id === 1)
                // - User's DB unlocked_module allows it
                // - Previous island was fully cleared
                const previousModule = modules.find(m => m.id === selectedModule.id - 1)
                const isPrevModuleCleared = !previousModule || isModuleCleared(previousModule, completedIds)
                const isIslandUnlocked = selectedModule.id === 1 || (user?.unlocked_module >= selectedModule.id) || isPrevModuleCleared

                const unlocked = isIslandUnlocked && isActivityUnlocked(index, selectedModule.activities, completedIds)

                return (
                  <button
                    type="button"
                    key={activity.id}
                    className={`landing-activity-card ${completed ? 'landing-activity-card--complete' : ''}`}
                    disabled={!unlocked}
                    onClick={() => navigate(`/lesson/${activity.id}`)}
                  >
                    <span className="landing-activity-card__number">
                      {completed ? <Ico n="check" s={17} c="#fff" /> : unlocked ? index + 1 : <Ico n="lock" s={15} c="#5e3a24" />}
                    </span>
                    <span className="landing-activity-card__copy">
                      <small>{activity.level_label || `Activity ${index + 1}`}</small>
                      <strong>{activity.title}</strong>
                      <em>{completed ? 'Cleared' : unlocked ? 'Ready to play' : 'Complete earlier activities first'}</em>
                    </span>
                    <Pill bg="rgba(245,213,71,.2)" col="#c9a227">+{activity.xp_reward || 100} XP</Pill>
                    <Ico n="chevRight" s={18} c={unlocked ? '#5e3a24' : '#a88418'} />
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </QuestScene>
  )
}
