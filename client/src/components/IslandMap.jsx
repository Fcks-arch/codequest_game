import React from 'react'
import { Ico } from './UI'
import { isActivityUnlocked } from '../utils/questProgress'

function Island({ module, status, selected, onSelect }) {
  const isLocked = status === 'locked'
  const isComplete = status === 'completed'
  const activityCount = module.activities.length

  return (
    <button
      type="button"
      className={`island-card ${isLocked ? 'island-card--locked' : ''} ${status === 'current' ? 'island-card--current' : ''} ${selected ? 'island-card--selected' : ''}`}
      disabled={isLocked}
      onClick={() => onSelect(module)}
      aria-label={`${module.title}: ${isLocked ? 'locked' : 'open'}`}
    >
      <svg className="island-card__art" viewBox="0 0 160 112" role="img" aria-hidden="true">
        <ellipse cx="80" cy="98" rx="62" ry="9" fill="#020617" opacity=".34" />
        <path d="M32 68h96v12h-8v14H40V80h-8z" fill={isLocked ? '#475569' : '#79543B'} />
        <path d="M18 58h10V45h12V34h20V28h40v6h20v11h12v13h10v12H18z" fill={isLocked ? '#64748B' : module.color} />
        {!isLocked && <>
          <path d="M40 45h12v8H40zM86 34h10v8H86zM108 52h10v8h-10z" fill="#ffffff" opacity=".2" />
          <path d="M60 58h9v8h-9zM96 48h8v8h-8z" fill="#020617" opacity=".15" />
          <path d="M68 28v-12h9v12M90 28V8h9v20" stroke="#79543B" strokeWidth="5" />
          <path d="M56 22l8-12 8 12M82 14l12-13 12 13" fill="#F8FAFC" opacity=".88" />
        </>}
      </svg>
      <span className="island-card__badge" style={{ background: isLocked ? '#334155' : isComplete ? '#16A34A' : '#4F46E5' }}>
        <Ico n={isLocked ? 'lock' : isComplete ? 'check' : 'play'} s={16} c="#fff" />
      </span>
      <strong>{module.title}</strong>
      <span>{isLocked ? 'Locked' : activityCount ? `${isComplete ? 'Replay island' : 'Open island'} · ${activityCount} ${activityCount === 1 ? 'level' : 'levels'}` : 'Coming soon'}</span>
    </button>
  )
}

export default function IslandMap({ modules, progress, selectedId, onSelect }) {
  const completedIds = new Set(
    progress.filter(item => item.phase === 'completed').map(item => item.lesson_id)
  )
  let previousComplete = true

  return (
    <div className="quest-map">
      <div className="quest-map__stars" />
      <div className="quest-map__path" aria-hidden="true" />
      <div className="quest-map__islands">
        {modules.map(module => {
          const activityCount = module.activities.length
          const isComplete = activityCount > 0 && module.activities.every(activity => completedIds.has(activity.id))
          const unlocked = previousComplete && (activityCount > 0 || module.order_index === 1)
          const status = isComplete ? 'completed' : unlocked ? 'current' : 'locked'
          previousComplete = previousComplete && isComplete
          return (
            <Island
              key={module.id}
              module={module}
              status={status}
              selected={module.id === selectedId}
              onSelect={onSelect}
            />
          )
        })}
      </div>
    </div>
  )
}
