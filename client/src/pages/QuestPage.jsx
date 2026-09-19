import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import QuestScene from '../components/QuestScene'
import IslandMap from '../components/IslandMap'
import { Ico, Pill, XpBar } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { completedLessonIdsWithLocalFallback, isActivityUnlocked, getIslandStatuses } from '../utils/questProgress'

const EMPTY_MODULES = []

export default function QuestPage() {
  const { user } = useAuth()
  const { islandId } = useParams() // Capture URL params like /island/2
  const navigate = useNavigate()
  const location = useLocation()
  const initialIslandId = location.state?.islandId || Number(new URLSearchParams(location.search).get('island')) || Number(localStorage.getItem('activeIslandId')) || 1
  const [modules, setModules] = useState(EMPTY_MODULES)
  const [progress, setProgress] = useState([])
  const [selectedIslandId, setSelectedIslandId] = useState(initialIslandId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const userUnlocked = user?.unlocked_module || 1

  useEffect(() => {
    Promise.all([axios.get('/api/lessons/modules'), axios.get('/api/progress')])
      .then(([moduleResponse, progressResponse]) => {
        const fetchedModules = moduleResponse.data || []
        const fetchedProgress = progressResponse.data || []
        const completedIds = completedLessonIdsWithLocalFallback(fetchedProgress, user?.id)

        setModules(fetchedModules)
        setProgress(fetchedProgress)

        // 1. If URL specifies an islandId (e.g. /island/3), select it
        if (islandId) {
          setSelectedIslandId(Number(islandId))
          return
        }

        setSelectedIslandId(initialIslandId)
        if (location.state?.islandId || location.search) return

        // 2. Automatically find the highest unlocked island, walked in
        // syllabus order so every island in the chain gets the same check —
        // not just the first couple.
        const statuses = getIslandStatuses(fetchedModules, completedIds, userUnlocked, fetchedProgress)
        let activeModuleId = fetchedModules[0]?.id ?? 1
        for (const mod of fetchedModules) {
          if (!statuses.get(mod.id)?.unlocked) break
          activeModuleId = mod.id
        }

        setSelectedIslandId(activeModuleId)
      })
      .catch(() => setError('The quest map could not be loaded. Please make sure the database is connected.'))
      .finally(() => setLoading(false))
  }, [islandId, initialIslandId, location.search, location.state, user?.id, userUnlocked])

  const selectedModule = useMemo(
    () => modules.find(module => module.id === selectedIslandId) || modules[0],
    [modules, selectedIslandId]
  )

  const completedIds = useMemo(() => completedLessonIdsWithLocalFallback(progress, user?.id), [progress, user?.id])
  const clearedCount = completedIds.size
  const islandStatuses = useMemo(
    () => getIslandStatuses(modules, completedIds, userUnlocked, progress),
    [modules, completedIds, progress, userUnlocked]
  )

  const selectModule = module => {
    setSelectedIslandId(module.id)
    localStorage.setItem('activeIslandId', String(module.id))
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
            <XpBar
              xp={user?.xp || 0}
              level={user?.level || 1}
            />
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
            <IslandMap modules={modules} progress={progress} selectedId={selectedIslandId} onSelect={selectModule} unlockedOverride={userUnlocked} userId={user?.id} />
          )}
        </section>

        {!loading && !error && selectedModule && (
          <section className="landing-activity-panel quest-level-panel" style={{ '--module-color': selectedModule.color }}>
            <div className="landing-activity-panel__intro">
              <p className="landing-eyebrow">Selected island</p>
              <h2>{selectedModule.title}</h2>
              <p>{selectedModule.description || 'Complete the activities below to unlock the next island.'}</p>
            </div>
            <div className="landing-activity-list quest-level-grid">
              {selectedModule.activities.length === 0 ? (
                <div className="landing-quest__message">
                  This island is being prepared. Clear earlier islands to continue your quest.
                </div>
              ) : selectedModule.activities.map((activity, index) => {
                const completed = completedIds.has(Number(activity.id))

                // The island itself must be unlocked (previous island in the
                // syllabus order cleared, or a teacher override), and within
                // an unlocked island, activities unlock one at a time.
                const isIslandUnlocked = islandStatuses.get(selectedModule.id)?.unlocked ?? false
                const unlocked = isIslandUnlocked && isActivityUnlocked(index, selectedModule.activities, completedIds)
                const lessonRouteId = index + 1

                return (
                  <button
                    type="button"
                    key={activity.id}
                    className={`landing-activity-card quest-level-card ${completed ? 'quest-level-card--complete' : unlocked ? 'quest-level-card--ready' : 'quest-level-card--locked'}`}
                    disabled={!unlocked}
                    onClick={() => navigate(`/lesson/${lessonRouteId}?island=${selectedIslandId}`, { state: { islandId: selectedIslandId, relativeLevel: lessonRouteId } })}
                  >
                    <span className="landing-activity-card__number quest-level-card__number">
                      {completed ? <Ico n="check" s={17} c="#fff" /> : unlocked ? index + 1 : <span className="quest-level-card__lock"><Ico n="lock" s={15} c="#CBD5E1" /></span>}
                    </span>
                    <span className="landing-activity-card__copy">
                      <small>{activity.level_label || `Activity ${index + 1}`}</small>
                      <strong>{activity.title}</strong>
                      <em className={completed ? 'quest-level-status--cleared' : unlocked ? 'quest-level-status--ready' : 'quest-level-status--locked'}>{completed ? 'Cleared' : unlocked ? 'Ready to play' : 'Complete earlier activities first'}</em>
                    </span>
                    <span className="quest-level-xp">+{activity.xp_reward || 100} XP</span>
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