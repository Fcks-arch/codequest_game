import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import QuestScene from '../components/QuestScene'
import { Ico } from '../components/UI'
import { useAuth } from '../context/AuthContext'

const REFRESH_MS = 30000

function rankLabel(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return rank
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  const load = useCallback(() => {
    axios.get('/api/progress/leaderboard')
      .then(res => {
        setRows(res.data)
        setUpdatedAt(new Date())
        setError('')
      })
      .catch(() => setError('The hall of knights could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  return (
    <QuestScene>
      <div className="quest-panel-page">
        <header className="quest-panel-page__header">
          <div>
            <p className="landing-eyebrow">Hall of Knights</p>
            <h1>Leaderboard</h1>
            <p className="quest-panel-page__sub">
              Real-time rankings by XP · refreshes every 30 seconds
              {updatedAt && <> · Updated {updatedAt.toLocaleTimeString()}</>}
            </p>
          </div>
          <Ico n="trophy" s={42} c="#f5d547" />
        </header>

        {loading ? (
          <div className="landing-quest__message">Summoning the rankings…</div>
        ) : error ? (
          <div className="landing-quest__message landing-quest__message--error">{error}</div>
        ) : (
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Knight</th>
                  <th>Section</th>
                  <th>Level</th>
                  <th>XP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const rank = index + 1
                  const isYou = row.id === user?.id
                  return (
                    <tr key={row.id} className={isYou ? 'leaderboard-table__you' : ''}>
                      <td>{rankLabel(rank)}</td>
                      <td>
                        {row.name}
                        {isYou && <span className="leaderboard-table__badge">You</span>}
                      </td>
                      <td>{row.section || '—'}</td>
                      <td>{row.level}</td>
                      <td>{row.xp}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="quest-panel-page__empty">No knights on the board yet. Clear an activity to claim your spot.</p>
            )}
          </div>
        )}
      </div>
    </QuestScene>
  )
}
